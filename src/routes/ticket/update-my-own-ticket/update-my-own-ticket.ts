import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  CacheManager,
  InternalServerError,
  intersectTwoObjects,
  isAuthenticated,
  logger,
  NotFoundError,
  pickFromObject,
  responseHandler,
  sanitizeObject,
  UserRole,
  validateRequest,
  AppError,
  isAuthorized,
} from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { updateMyOwnTicketValidation } from "./update-my-own-ticket.validation";

const router = express.Router();

router.put(
  "/v1/ticket/my/:id",
  responseHandler,
  isAuthenticated,
  isAuthorized("update-my-own-ticket"),
  updateMyOwnTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params["id"] as string).trim();
      const currentUser = req.currentUser!;
      const ALLOWED_UPDATE_FIELDS =  [ "name", "email", "phone_number",  "priority", "title", "description", "attachment_ids", "feedback"  ] as const;

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

      if (currentUser.role === UserRole.User && currentUser.id !==  ticket.created_by ) {
        throw new AppError("You are not authorized.", 403);
      }

      if (currentUser.role === UserRole.Tenant && currentUser.id != ticket.created_by ) {
        if (ticket.tenant_id !== currentUser.tenant_id) {
         throw new AppError("You are not authorized.", 403);
        }
      }

      const allowedBody = pickFromObject(sanitizeObject(req.body), [...ALLOWED_UPDATE_FIELDS]);

      const updatedData = intersectTwoObjects(ticket, allowedBody) as Partial<TicketRow>

      if (Object.keys(updatedData).length === 0) {
        return res.sendResponse(
          { message: "Your ticket updated successfully." },
          200,
          {
            targetType: "Ticket",
            targetId: id,
            action: "update-my-own-ticket",
          },
        );
      }

      const updatedTicket = await Ticket.updateOne<TicketRow>({
        where: {
          id
        },
        data: { ...updatedData, updated_by: currentUser.id },
      });

      if (!updatedTicket) {
        throw new InternalServerError(
          "Failed to update ticket, please try again later.",
        );
      }

      const freshTicket = await Ticket.findOne<TicketRow>({
        where: { id },
        populate: Ticket.detailPopulateJoins,
      });

      if (!freshTicket) {
        throw new InternalServerError("Failed to fetch updated ticket.");
      }

      await CacheManager.invalidateMany({
        ids: [id],
        baseKey: "ticket",
        listPattern: "tickets:list:*",
      });
      await CacheManager.set(`ticket:${id}`, freshTicket);

      return res.sendResponse(
        {
          message: "Your ticket updated successfully.",
        },
        200,
        {
          targetType: "Ticket",
          targetId: id,
          action: "update-my-own-ticket",
          oldData: ticket,
          newData: freshTicket,
          modifiedProperties: {
            ...updatedData,
            updated_by: freshTicket.updated_by,
            updated_at: freshTicket.updated_at,
          },
        },
      );
    } catch (error: unknown) {
      logger.error(
        `Update my own ticket error: ${error instanceof Error ? error.message : String(error)}`,
      );
      next(error);
    }
  },
);

export { router as updateMyOwnTicketV1Router };
