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

export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.ON_HOLD, TicketStatus.RESOLVED, TicketStatus.CANCELED],
  [TicketStatus.ON_HOLD]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CANCELED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.REOPEN, TicketStatus.CANCELED],
  [TicketStatus.CLOSED]: [TicketStatus.REOPEN],
  [TicketStatus.REOPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELED],
  [TicketStatus.CANCELED]: [],
};

export function calculateStatusCounts(statusHistory: unknown, currentStatus: string): Record<string, number> {
  const counts: Record<string, number> = {
    open: 0,
    in_progress: 0,
    on_hold: 0,
    resolved: 0,
    closed: 0,
    re_open: 0,
    cancelled: 0,
  };

  const history = Array.isArray(statusHistory) ? statusHistory : [];

  let initialStatus = currentStatus;
  if (history.length > 0 && history[0] && typeof history[0] === "object" && "from_status" in history[0]) {
    initialStatus = String(history[0].from_status);
  }

  if (counts.hasOwnProperty(initialStatus)) {
    counts[initialStatus] = 1;
  }

  for (const entry of history) {
    if (entry && typeof entry === "object" && "to_status" in entry) {
      const toStatus = String(entry.to_status);
      if (counts.hasOwnProperty(toStatus)) {
        counts[toStatus] = (counts[toStatus] ?? 0) + 1;
      }
    }
  }

  return counts;
}

export function getTicketStatusAt(ticket: any, time: Date | string): string {
  const commentTime = new Date(time).getTime();

  const history = Array.isArray(ticket.status_history) ? ticket.status_history : [];

  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  );

  if (sortedHistory.length === 0) {
    return ticket.status;
  }

  const initialStatus = sortedHistory[0].from_status || "open";

  const firstChangeTime = new Date(sortedHistory[0].changed_at).getTime();
  if (commentTime < firstChangeTime) {
    return initialStatus;
  }

  let currentStatusAtTime = initialStatus;
  for (const transition of sortedHistory) {
    const transitionTime = new Date(transition.changed_at).getTime();
    if (transitionTime <= commentTime) {
      currentStatusAtTime = transition.to_status;
    } else {
      break;
    }
  }

  return currentStatusAtTime;
}

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
      

      if (currentUser.role != UserRole.Admin && currentUser.role != UserRole.SuperAdmin) {
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
     
      if (currentUser.role != UserRole.Admin && ticket.assigned_to !== currentUser.id) {
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

     
      const allowedNext = ALLOWED_TRANSITIONS[ticket.status as TicketStatus];
      if (!allowedNext || !allowedNext.includes(status as TicketStatus)) {
        throw new BadRequestError(`Cannot change ticket status from '${ticket.status}' to '${status}'.`);
      }

      if (REASON_REQUIRED_STATUSES.includes(status) && !reason) {
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
            reason: reason,
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
          message: "Ticket updated successfully."
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