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
  sanitizeObject,
  UserRole,
  validateRequest,
  isAuthorized,
} from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { TicketStatus } from "../../../enums/ticket.enum";
import { updateTicketValidation } from "./update-ticket.validation";

const router = express.Router();

const REASON_REQUIRED_STATUSES = [TicketStatus.REOPEN , TicketStatus.ON_HOLD];

const secondsBetween = (from: Date, to: Date) => Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));

router.put(
  "/v1/ticket/:id",
  responseHandler,
  isAuthenticated,
  isAuthorized("update-ticket"),
  updateTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = (req.params["id"] as string);
      const currentUser = req.currentUser!;
      const isAdmin = currentUser.role === (UserRole.Admin as string);
      const isTenant = currentUser.role === (UserRole.Tenant as string);
      const isSuperAdmin = currentUser.role === (UserRole.SuperAdmin as string);

      if (!isAdmin && !isTenant && !isSuperAdmin) {
        throw new AppError("You are not authorized.", 403);
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

      if ([TicketStatus.CLOSED].includes(ticket.status)) {
        const incomingStatus = (req.body as Record<string, unknown>)["status"];

        if (incomingStatus !== TicketStatus.REOPEN) {
          throw new BadRequestError("Cannot update a closed ticket.");
        }
      }

      if (isTenant) {
        if (ticket.created_by !== currentUser.id) {
          if (ticket.tenant_id !== currentUser.id) {
            throw new AppError("You are not authorized.", 403);
          }
        }
      }

      const rawBody = req.body as Record<string, unknown>;
      const sanitizedBody = sanitizeObject(rawBody) as Record<string, unknown>;
      const allowedBody: Record<string, unknown> = { ...sanitizedBody };

      const incomingStatus = allowedBody["status"];

      if (
        incomingStatus === TicketStatus.OPEN &&
        ticket.status !== TicketStatus.OPEN
      ) {
        throw new BadRequestError("Ticket status cannot be changed back to 'open'.");
      }

      if (
        typeof incomingStatus === "string" &&
        REASON_REQUIRED_STATUSES.includes(incomingStatus as TicketStatus)
      ) {
        const reason = allowedBody["reason"];
        if (!reason || (typeof reason === "string" && reason.trim() === "")) {
          throw new BadRequestError(`A reason is required when changing ticket status to ${incomingStatus}.`);
        }
      }

      if (Object.keys(allowedBody).length === 0) {
        throw new BadRequestError("Ticket Update successfully.");
      }

      if (allowedBody["status"] !== ticket.status) {
        const changedAt = new Date();
        const history = ticket.status_history ?? [];
        const lastEntry = history[history.length - 1];
        const lastChangedAt = lastEntry?.changed_at
          ? new Date(lastEntry.changed_at)
          : new Date(ticket.created_at);

        const reason =
          typeof sanitizedBody["reason"] === "string"
            ? sanitizedBody["reason"].trim()
            : null;

        allowedBody["status_history"] = JSON.stringify([
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
        ]);

        if (
          allowedBody["status"] === TicketStatus.RESOLVED &&
          !allowedBody["resolved_at"]
        ) {
          allowedBody["resolved_at"] = changedAt.toISOString();
        }

        if (
          allowedBody["status"] === TicketStatus.CLOSED &&
          !allowedBody["closed_at"]
        ) {
          allowedBody["closed_at"] = changedAt.toISOString();
        }

        if (allowedBody["status"] === TicketStatus.REOPEN) {
          allowedBody["resolved_at"] = null;
          allowedBody["closed_at"] = null;
        }

        if (
          reason &&
          REASON_REQUIRED_STATUSES.includes(
            allowedBody["status"] as TicketStatus,
          )
        ) {
          allowedBody["reason"] = reason;
        } else {
          allowedBody["reason"] = null;
        }
      }

      const updatedTicket = await Ticket.updateOne<TicketRow>({
        where: { id },
        data: { ...allowedBody, updated_by: currentUser.id },
      });

      if (!updatedTicket) {
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
            ...allowedBody,
            updated_by: freshTicket.updated_by,
            updated_at: freshTicket.updated_at,
          },
        },
      );
    } catch (error: unknown) {
      logger.error(`Update ticket error: ${error instanceof Error ? error.message : String(error)}`);
      return next(error);
    }
  },
);

export { router as updateTicketV1Router };
