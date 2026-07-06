import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AppError,
  BadRequestError,
  CacheManager,
  InternalServerError,
  isAuthenticated,
  logger,
  NotFoundError,
  responseHandler,
  UserRole,
  validateRequest,
  isAuthorized,
} from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { TicketStatus } from "../../../enums/ticket.enum";
import { updateTicketStatusValidation } from "./update-ticket-status.validation";

const router = express.Router();

const REASON_REQUIRED_STATUSES = [TicketStatus.REOPEN, TicketStatus.ON_HOLD];

router.put(
  "/v1/ticket/:id",
  responseHandler,
  isAuthenticated,
  isAuthorized("update-ticket"),
  updateTicketStatusValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params["id"] as string;
      const currentUser = req.currentUser!;
      
      const isAdmin = currentUser.role === UserRole.Admin;
      const isSuperAdmin = currentUser.role === UserRole.SuperAdmin;

      if (!isAdmin && !isSuperAdmin) {
        throw new AppError("You are not authorized.", 403);
      }

      const ticket = await CacheManager.getOrSet<TicketRow>({
        key:`ticket:${id}`,
        fetcher:async()=>{
          const ticket = await Ticket.findOne<TicketRow>({
          where: { id },
          populate: Ticket.detailPopulateJoins,
        });

        if (!ticket) {
          throw new NotFoundError("Ticket not found.");
        }
        
        return ticket;

      }
      });
     
      if (isAdmin && ticket.assigned_to !== currentUser.id) {
        throw new AppError("You are only authorized to update tickets assigned to you.", 403);
      }

      const { status, reason } = req.body;


      if (status === ticket.status) {
        return res.sendResponse(
          {
            message: "Ticket status is already up to date.",
            ticket,
          },
          200
        );
      }

     
      if (ticket.status === TicketStatus.CLOSED && status !== TicketStatus.REOPEN) {
        throw new BadRequestError("Cannot update a closed ticket.");
      }

      if (ticket.status !== TicketStatus.OPEN && status === TicketStatus.OPEN  ) {
        throw new BadRequestError("Ticket status cannot be changed back to 'open'.");
      }

      if (REASON_REQUIRED_STATUSES.includes(status) && !reason.trim()) {
        throw new BadRequestError(`A reason is required when changing ticket status to ${status}.`);
      }

      
      const changedAt = new Date();
      const history = ticket.status_history ?? [];

      const updateData: Record<string, any> = {
        status,
        status_history: JSON.stringify([
          ...history,
          {
            from_status: ticket.status,
            to_status: status,
            reason: reason.trim(),
            changed_by: currentUser.id,
            changed_by_name: currentUser.full_name,
            changed_at: changedAt.toISOString(),
          },
        ])      
      };

      
      if (status === TicketStatus.RESOLVED) {
        updateData["resolved_at"] = changedAt.toISOString();
      } else if (status === TicketStatus.CLOSED) {
        updateData["closed_at"] = changedAt.toISOString();
      } else if (status === TicketStatus.REOPEN) {
        updateData["resolved_at"] = null;
        updateData["closed_at"] = null;
      }

    
      updateData["reason"] = REASON_REQUIRED_STATUSES.includes(status) ? reason.trim() : null;

      const updatedCount = await Ticket.updateOne<TicketRow>({
        where: { id },
        data: { ...updateData, updated_by: currentUser.id },
      });

      if (!updatedCount) {
        throw new InternalServerError("Failed to update ticket");
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
          message: "Ticket updated successfully.",
          ticket: freshTicket,
        },
        200,
        {
          targetType: "Ticket",
          targetId: id,
          action: "update-ticket",
          oldData: ticket,
          newData: freshTicket,
          modifiedProperties: {
            ...updateData,
            updated_by: freshTicket.updated_by,
            updated_at: freshTicket.updated_at,
          },
        }
      );
    } catch (error: unknown) {
      logger.error(`Update ticket error: ${error instanceof Error ? error.message : String(error)}`);
      return next(error);
    }
  }
);

export { router as updateTicketStatusV1Router };