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
} from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { TicketStatus } from "../../../enums/ticket.enum";
import { updateTicketValidation } from "./update-ticket.validation";

const router = express.Router();

// Fields the assignee can update
const ASSIGNEE_UPDATE_FIELDS = [
  "status",
  "due_date",
  "resolved_at",
  "attachment_ids",
  "close_at"
] as const;

// Fields the admin can update (assignee fields + extra admin-only fields)
const ADMIN_UPDATE_FIELDS = [
  ...ASSIGNEE_UPDATE_FIELDS,
  "assigned_to",
] as const;

// Statuses where reason is mandatory
const REASON_REQUIRED_STATUSES = [TicketStatus.REOPEN , TicketStatus.ON_HOLD];

const secondsBetween = (from: Date, to: Date) => Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));

router.put(
  "/v1/ticket/:id",
  responseHandler,
  isAuthenticated,
  updateTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params["id"] as string).trim();
      const currentUser = req.currentUser!;
      const isAdmin = currentUser.role === (UserRole.Admin as string);
      const isUser = currentUser.role === (UserRole.User as string);

      // Only admin or regular users can access this endpoint
      if (!isAdmin && !isUser) {
        throw new AuthorizationError("You are not authorized to update tickets.");
      }

      // Fetch ticket from cache or DB
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

      // Determine if current user is the assignee
      const assignedToValues = (Array.isArray(ticket.assigned_to) ? ticket.assigned_to : [ticket.assigned_to])
      .filter((value): value is string => typeof value === "string");

      const userEmail = currentUser.email.trim().toLowerCase();
      const matchedAssignee = assignedToValues.find(
        (value) => value === currentUser.id || value.trim().toLowerCase() === userEmail,
      );
      const isAssignee = Boolean(matchedAssignee);

      // Non-admin user must be the assignee
      if (isUser && !isAssignee) {
        throw new AuthorizationError("You can update only tickets assigned to you.");
      }

      const rawBody = req.body as Record<string, unknown>;

      // Determine allowed fields based on role
      const allowedFields = isAdmin? [...ADMIN_UPDATE_FIELDS]: [...ASSIGNEE_UPDATE_FIELDS];

      // Non-admin assignee cannot update closed_at
      if (isUser && "closed_at" in rawBody) {
        throw new AuthorizationError("You are not allowed to update the closed_at field.");
      }

      // Validate reason is provided for re_open and on_hold status changes
      const incomingStatus = rawBody["status"];
      if (typeof incomingStatus === "string" && REASON_REQUIRED_STATUSES.includes(incomingStatus as TicketStatus)) {
        const reason = rawBody["reason"];
        if (!reason || (typeof reason === "string" && reason.trim() === "")) {
          throw new BadRequestError(`A reason is required when changing ticket status to "${incomingStatus}".`,);
        }
      }

      // Build allowed update data
      const sanitizedBody = sanitizeObject(rawBody) as Record<string, unknown>;
      const allowedUpdatableColumns = new Set(Ticket.updatableColumns);
      const allowedBody: Record<string, unknown> = {};

      for (const field of allowedFields) {
        if (!allowedUpdatableColumns.has(field) || !(field in sanitizedBody)) continue;

        if (field === "email" && typeof sanitizedBody[field] === "string") {
          allowedBody[field] = (sanitizedBody[field] as string).trim().toLowerCase();
          continue;
        }

        allowedBody[field] = sanitizedBody[field];
      }

      if (Object.keys(allowedBody).length === 0) {
        throw new BadRequestError("Please provide at least one valid ticket field to update.");
      }

      // Append status history if status is being changed
      if (typeof allowedBody["status"] === "string" && allowedBody["status"] !== ticket.status) {
        const changedAt = new Date();
        const history = ticket.status_history ?? [];
        const lastEntry = history[history.length - 1];
        const lastChangedAt = lastEntry?.changed_at
          ? new Date(lastEntry.changed_at)
          : new Date(ticket.created_at);

        const reason =
          typeof rawBody["reason"] === "string" ? rawBody["reason"].trim() : null;

        allowedBody["status_history"] = [
          ...history,
          {
            from_status: ticket.status,
            to_status: allowedBody["status"],
            reason: reason ?? null,
            changed_by: currentUser.id,
            changed_by_name: currentUser.full_name,
            changed_at: changedAt.toISOString(),
            stayed_in_status_seconds: Number.isNaN(lastChangedAt.getTime())
              ? 0
              : secondsBetween(lastChangedAt, changedAt),
          },
        ];

        // Auto-set resolved_at when status changes to resolved
        if (
          allowedBody["status"] === TicketStatus.RESOLVED &&
          !allowedBody["resolved_at"]
        ) {
          allowedBody["resolved_at"] = changedAt.toISOString();
        }

        // Store the reason on the ticket row itself
        if (reason) {
          allowedBody["reason"] = reason;
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

      // Fetch fresh ticket for response
      const freshTicket = await Ticket.findOne<TicketRow>({
        where: { id },
        populate: Ticket.detailPopulateJoins,
      });

      if (!freshTicket) {
        throw new InternalServerError("Failed to fetch updated ticket.");
      }

      // Refresh cache
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
      next(error);
    }
  },
);

export { router as updateTicketV1Router };