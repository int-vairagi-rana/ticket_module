import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  CacheManager,
  Database,
  InternalServerError,
  isAuthenticated,
  logger,
  NotFoundError,
  ConflictError,
  responseHandler,
  sendEmail,
  UserRole,
  validateRequest,
  isAuthorized,
  AppError
} from "intellisolar-common";
import type { UserRow } from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket, User } from "../../../models";
import { reAssignTicketValidation } from "./re-assign.ticket.validation";
import { getAssignmentEmail } from "../../../utils";

const router = express.Router();

const NON_ASSIGNABLE_STATUSES = ["closed", "resolved", "cancelled"];

router.put(
  "/v1/ticket/reassign/:id",
  responseHandler,
  isAuthenticated,
  isAuthorized("assign-ticket"),
  reAssignTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const transaction = await Database.beginTransaction();
    try {
      const currentUser = req.currentUser!;
      const id = req.params["id"] as string;
      const body = req.body as Record<string, unknown>;
      const userId = body["user_id"] as string;

      const ticket = await CacheManager.getOrSet<TicketRow>({
        key: `ticket:${id}`,
        fetcher: async () => {
          const ticket = await Ticket.findOne<TicketRow>({
            where: { id },
            populate: Ticket.detailPopulateJoins,
          });
          if (!ticket) throw new NotFoundError("Ticket not found.");
          return ticket;
        },
      });

      if (NON_ASSIGNABLE_STATUSES.includes(ticket.status)) {
        throw new AppError(`Cannot reassign a ticket with status "${ticket.status}". Only open or in-progress tickets can be reassigned.`, 403);
      }

      if (userId === ticket.assigned_to) {
        throw new ConflictError("Ticket is already assigned to this user.");
      }

      const assigneeUser = await CacheManager.getOrSet<UserRow>({
        key: `user:${userId}`,
        fetcher: async () => {
          const assigneeUser = await User.findOne<UserRow>({
            where: { id: userId, is_active: true },
            select: ["id", "name", "email", "role", "plant_ids"],
          });

          if (!assigneeUser) {
            throw new NotFoundError("User not found.");
          }
          return assigneeUser;
        },
      });

      if (assigneeUser.role !== (UserRole.Admin as string)) {
        throw new AppError("Tickets can only be assigned to users with the Admin role.", 403);
      }

      const previousAssigneeUser = await CacheManager.getOrSet<UserRow>({
        key: `user:${ticket.assigned_to}`,
        fetcher: async () => {
          const previousAssigneeUser = await User.findOne<UserRow>({
            where: { id: ticket.assigned_to as string },
            select: ["id", "name", "email"],
          });
          if (!previousAssigneeUser) {
            throw new NotFoundError("User not found.");
          }
          return previousAssigneeUser;
        },
      });

      const updatedTicket = await Ticket.updateOne<TicketRow>({
        where: { id },
        data: {
          assigned_to: assigneeUser.id,
          assigned_by: currentUser.id,
          updated_by: currentUser.id,
        },
      });

      if (!updatedTicket) {
        throw new InternalServerError("Failed to reassign ticket, please try again later.");
      }

      const freshTicket = await Ticket.findOne<TicketRow>({
        where: { id },
        populate: Ticket.detailPopulateJoins,
      });

      if (!freshTicket) {
        throw new InternalServerError("Failed to retrieve updated ticket details.");
      }

      await CacheManager.invalidateMany({
        ids: [id],
        baseKey: "ticket",
        listPattern: "tickets:list:*",
      });

      await CacheManager.set(`ticket:${id}`, freshTicket);
      await Database.commitTransaction(transaction);

      const componentDetails =
        freshTicket.component_name || freshTicket.component_type
          ? {
              component_name: freshTicket.component_name ?? "",
              component_type_name: freshTicket.component_type ?? "",
            }
          : null;

      try {
        await sendEmail({
          email: assigneeUser.email,
          subject: `Ticket assigned to you: ${freshTicket.ticket_number}`,
          message: getAssignmentEmail(
            freshTicket,
            { plant_name: freshTicket.plant_name ?? "" },
            componentDetails,
            assigneeUser.full_name,
          ),
        });
      } catch (emailError) {
        const emailMsg =
          emailError instanceof Error ? emailError.message : String(emailError);
        logger.error(`Reassignment email could not be delivered for ticket ${freshTicket.ticket_number} to new assignee ${assigneeUser.email}: ${emailMsg}`);
      }

      if (previousAssigneeUser) {
        try {
          await sendEmail({
            email: previousAssigneeUser.email,
            subject: `Ticket reassigned: ${freshTicket.ticket_number}`,
            message: `<p>Hello ${previousAssigneeUser.full_name},</p><p>Ticket ${freshTicket.ticket_number} has been reassigned to another team member and is no longer assigned to you.</p>`,
          });
        } catch (emailError) {
          const emailMsg =
            emailError instanceof Error
              ? emailError.message
              : String(emailError);
          logger.error(`Reassignment notice could not be delivered for ticket ${freshTicket.ticket_number} to previous assignee ${previousAssigneeUser.email}: ${emailMsg}`);
        }
      } else {
        logger.error(`Previous assignee (id: ${ticket.assigned_to}) for ticket ${freshTicket.ticket_number} could not be found — skipping reassignment notice.`);
      }

      res.sendResponse(
        {
          message: "Ticket reassigned successfully.",
          ticket: freshTicket,
        },
        200,
        {
          targetType: "Ticket",
          targetId: freshTicket.id,
          action: "reassign-ticket",
          oldData: ticket,
          newData: freshTicket,
          modifiedProperties: {
            assigned_to: freshTicket.assigned_to,
            updated_by: freshTicket.updated_by,
            updated_at: freshTicket.updated_at,
          },
        },
      );
    } catch (error: unknown) {
      if (transaction) {
        await Database.rollbackTransaction(transaction);
      }
      logger.error(`Reassign ticket error: ${error instanceof Error ? error.message : String(error)}`);
      return next(error);
    }
  },
);

export { router as reAssignTicketV1Router };