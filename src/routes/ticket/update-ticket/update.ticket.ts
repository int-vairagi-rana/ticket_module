import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AuthorizationError,
  BadRequestError,
  CacheManager,
  InternalServerError,
  isAuthenticated,
  logger,
  NotFoundError,
  responseHandler,
  sanitizeObject,
  UserRole,
  validateRequest,
  pickFromObject,
  isAuthorized,
} from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { TicketStatus } from "../../../enums/ticket.enum";
import { updateTicketValidation } from "./update-ticket.validation";

const router = express.Router();

const ASSIGNEE_UPDATE_FIELDS = ["status","attachment_ids","closed_at"] as const;

const ADMIN_UPDATE_FIELDS = [...ASSIGNEE_UPDATE_FIELDS] as const;

const REASON_REQUIRED_STATUSES = [TicketStatus.REOPEN , TicketStatus.ON_HOLD];

const secondsBetween = (from: Date, to: Date) => Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));

router.put(
  "/v1/ticket/:id",
  responseHandler,
  isAuthenticated,
  isAuthorized('update-ticket'),
  updateTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params["id"] as string).trim();
      const currentUser = req.currentUser!;
      const isAdmin = currentUser.role === (UserRole.Admin as string);
      const isUser = currentUser.role === (UserRole.User as string);
     
      const isSuperAdmin = currentUser.role === (UserRole.SuperAdmin as string);
      if (!isAdmin && !isUser && !isSuperAdmin) {
        throw new AuthorizationError("You are not authorized to update tickets.");
      }

      
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


       if ([TicketStatus.CLOSED].includes(ticket.status as TicketStatus)) {
      const incomingStatus = (req.body as Record<string, unknown>)["status"];

      
      if (incomingStatus !== TicketStatus.REOPEN) {
        throw new BadRequestError("Cannot update a closed ticket.");
      }
    }

      
      const assignedToValues = (Array.isArray(ticket.assigned_to) ? ticket.assigned_to : [ticket.assigned_to])
      .filter((value): value is string => typeof value === "string");

      const userEmail = currentUser.email.trim().toLowerCase();
      const matchedAssignee = assignedToValues.find(
        (value) => value === currentUser.id || value.trim().toLowerCase() === userEmail,
      );
      const isAssignee = Boolean(matchedAssignee);

     
     
      if (isUser && !isAssignee) {
        throw new AuthorizationError("You can update only tickets assigned to you.");
      }

      const rawBody = req.body as Record<string, unknown>;
     

     
      const allowedFields = (isAdmin || isSuperAdmin)? [...ADMIN_UPDATE_FIELDS]: [...ASSIGNEE_UPDATE_FIELDS];
     

      // //  assignee cannot update closed_at
      // if (isUser && "closed_at" in rawBody) {
      //   throw new AuthorizationError("You are not allowed to update the closed_at field.");
      // }

      
      const incomingStatus = rawBody["status"];

      if (incomingStatus === TicketStatus.OPEN && ticket.status !== TicketStatus.OPEN) {
        throw new BadRequestError("Ticket status cannot be changed back to 'open'.");
      }

      if (typeof incomingStatus === "string" && REASON_REQUIRED_STATUSES.includes(incomingStatus as TicketStatus)) {
        const reason = rawBody["reason"];
        if (!reason || (typeof reason === "string" && reason.trim() === "")) {
          throw new BadRequestError(`A reason is required when changing ticket status to "${incomingStatus}".`,);
        }
      }

      
      const sanitizedBody = sanitizeObject(rawBody) as Record<string, unknown>;
      

      const allowedBody :Record<string,unknown>= {...pickFromObject(sanitizedBody, [...allowedFields])};
      
      if (Object.keys(allowedBody).length === 0) {
        throw new BadRequestError("Ticket Update successfully.");
      }

      
      if ("assigned_to" in allowedBody && allowedBody["assigned_to"] !== ticket.assigned_to) {
        allowedBody["assigned_by"] = currentUser.id;
      }

      
      if (typeof allowedBody["status"] === "string" && allowedBody["status"] !== ticket.status) {
        const changedAt = new Date();
        const history = ticket.status_history ?? [];
        const lastEntry = history[history.length - 1];
        const lastChangedAt = lastEntry ?.changed_at? new Date(lastEntry.changed_at) : new Date(ticket.created_at);

        const reason = typeof sanitizedBody["reason"] === "string" ? sanitizedBody["reason"].trim() : null;

        allowedBody["status_history"] = JSON.stringify([
          ...history,
          {
            from_status: ticket.status,
            to_status: allowedBody["status"],
            reason: reason ?? null,
            changed_by: currentUser.id,
            changed_by_name: currentUser.full_name,
            changed_at: changedAt.toISOString(),
            stayed_in_status_seconds: Number.isNaN(lastChangedAt.getTime()) ? 0  : secondsBetween(lastChangedAt, changedAt),
          },
        ]);

        
        if (allowedBody["status"] === TicketStatus.RESOLVED &&!allowedBody["resolved_at"]) {
          allowedBody["resolved_at"] = changedAt.toISOString();
        }

        if (allowedBody["status"] === TicketStatus.CLOSED && !allowedBody["closed_at"]) {
          allowedBody["closed_at"] = changedAt.toISOString();
        }


        if(allowedBody["status"] === TicketStatus.REOPEN) {
          allowedBody["resolved_at"] = null;
          allowedBody["closed_at"] = null;
        }


    
      if (reason && REASON_REQUIRED_STATUSES.includes(allowedBody["status"] as TicketStatus)) {
        allowedBody["reason"] = reason;
      } else {
        
        allowedBody["reason"] = null;
      }
      }

     
      const updatedTicket = await Ticket.updateOne<TicketRow>({
        where: {
          id,
          ...(isUser && { assigned_to: matchedAssignee }),
        },
        data: { ...allowedBody, updated_by: currentUser.id },
      });

      if (!updatedTicket) {
        throw new InternalServerError("Failed to update ticket, please try again later.");
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
      await CacheManager.delPattern("tickets:statistics:*");
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
            ...allowedBody,
            updated_by: freshTicket.updated_by,
            updated_at: freshTicket.updated_at,
          },
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Update ticket error: ${message}`);
      return next(error);
    }
  },
);

export { router as updateTicketV1Router };