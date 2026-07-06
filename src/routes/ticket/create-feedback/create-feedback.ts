import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AppError,
  CacheManager,
  ConflictError,
  InternalServerError,
  isAuthenticated,
  logger,
  NotFoundError,
  responseHandler,
  validateRequest,
  isAuthorized,
  UserRole
} from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { TicketStatus } from "../../../enums/ticket.enum";
import { createFeedbackValidation } from "./create-feedback.validation";
import { notifyUsers } from "../../../utils/notify-users";

const router = express.Router();

const trimString = (value: unknown) => (typeof value === "string" ? value.trim() : value);
const normalizeUserIds = (value: string | string[] | null | undefined) =>
  (Array.isArray(value) ? value : [value]).filter((userId): userId is string => typeof userId === "string" && userId.trim() !== "");

router.post(
  "/v1/ticket/:id/feedback",
  responseHandler,
  isAuthenticated,
  isAuthorized("create-feedback"),
  createFeedbackValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params["id"] as string;
      const currentUser = req.currentUser!;

      if(currentUser.role != UserRole.User && currentUser.role != UserRole.Tenant){
        throw new AppError("You are not authorized", 403);
      }

      const ticket = await CacheManager.getOrSet<TicketRow>({
        key: `ticket:${id}`,
        fetcher: async () => {
          const ticket = await Ticket.findOne<TicketRow>({
            where: { id },
            populate: Ticket.detailPopulateJoins,
          });

          if (!ticket) {
            throw new NotFoundError("Ticket not found.");
          }
          return ticket;
        },
      });

      if (currentUser.id !==  ticket.created_by ) {
        throw new AppError("You are not authorized", 403);
      }

      if (ticket.status !== TicketStatus.RESOLVED) {
        throw new ConflictError(
          "Feedback can be given only after the ticket is resolved successfully.",
        );
      }

      if (ticket.feedback) {
        throw new ConflictError(
          "Feedback has already been submitted for this ticket.",
        );
      }

      const body = req.body as Record<string, unknown>;
      const description = trimString(body["description"]);
      const feedback = {
        rating: Number(body["rating"]),
        description: typeof description === "string" ? description : null,
        created_by: currentUser.id,
        created_at: new Date().toISOString(),
      };

      const updatedTicket = await Ticket.updateOne<TicketRow>({
        where: {
          id,
          created_by: currentUser.id,
          status: TicketStatus.RESOLVED,
        },
        data: {
          feedback,
          updated_by: currentUser.id,
        },
      });

      if (!updatedTicket) {
        throw new InternalServerError("Failed to give feedback.");
      }

      const freshTicket = await Ticket.findOne<TicketRow>({
        where: { id },
        populate: Ticket.detailPopulateJoins,
      });

      if (!freshTicket) {
        throw new InternalServerError(
          "Failed to retrieve updated ticket details.",
        );
      }

      await CacheManager.invalidateMany({
        ids: [id],
        baseKey: "ticket",
        listPattern: "tickets:list:*",
      });

      await CacheManager.set(`ticket:${id}`, freshTicket);

      const recipientIds = new Set<string>([
        ...normalizeUserIds(ticket.assigned_to),
        ...(ticket.assigned_by ? [ticket.assigned_by] : []),
      ]);
      recipientIds.delete(currentUser.id);

      if (recipientIds.size > 0) {
        try {
          await notifyUsers({
            userIds: Array.from(recipientIds),
            title: `Feedback received for Ticket #${freshTicket.ticket_number}`,
            body: feedback.description
              ? feedback.description.slice(0, 120)
              : `Rating: ${feedback.rating}/5`,
            data: {
              ticketId: id,
              ticketNumber: freshTicket.ticket_number,
              type: "TICKET_FEEDBACK",
              priority: freshTicket.priority,
            },
          });
        } catch (notifyError) {
          const notifyMsg =
            notifyError instanceof Error
              ? notifyError.message
              : String(notifyError);
          logger.error(`Feedback notification could not be enqueued for ticket #${freshTicket.ticket_number}: ${notifyMsg}`);
        }
      }

      res.sendResponse(
        {
          message: "Feedback submitted successfully.",
          ticket: freshTicket,
        },
        201,
        {
          targetType: "Ticket",
          targetId: id,
          action: "create-ticket-feedback",
          oldData: ticket,
          newData: freshTicket,
          modifiedProperties: {
            feedback: freshTicket.feedback,
            updated_by: freshTicket.updated_by,
            updated_at: freshTicket.updated_at,
          },
        },
      );
    } catch (error: unknown) {
      logger.error(`Create ticket feedback error: ${error instanceof Error ? error.message : String(error)}`);
      return next(error);
    }
  },
);

export { router as createFeedbackV1Router };