import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AuthorizationError,
  CacheManager,
  isAuthenticated,
  isAuthorized,
  logger,
  responseHandler,
  UserRole,
  validateRequest,
} from "intellisolar-common";
import { Ticket } from "../../../models";
import { bulkDeleteMyOwnTicketValidation } from "./bulk-delete-validation";
import { TicketRow } from "../../../interface";

const router = express.Router();

router.delete(
  "/v1/ticket/bulk-delete",
  responseHandler,
  isAuthenticated,
  isAuthorized("delete-ticket"),
  bulkDeleteMyOwnTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;

      const rawIds = req.body["ids"] as string[];
      const uniqueIds = Array.from(new Set(rawIds.map((id) => id.trim())));
    
      const tickets = await Ticket.findByIds<TicketRow>({where:{id:uniqueIds}});

      const skipped: { id: string; reason: string }[] = [];
      const eligibleIds: string[] = [];

      for (const id of uniqueIds) {
        const ticket = tickets.find((t) => t.id === id);

        if (!ticket) {
          skipped.push({ id, reason: "Ticket not found." });
          continue;
        }

        if (ticket.status === "closed" || ticket.status === "resolved") {
          skipped.push({ id, reason: "Closed or Resolved tickets cannot be deleted." });
          continue;
        }

        eligibleIds.push(id);
      }

      let deleted: string[] = [];

      if (eligibleIds.length > 0) {
        const deletedRows = await Ticket.deleteMany<TicketRow>({
          where: { id: eligibleIds },
        });
        deleted = deletedRows.map((row) => row.id);

        await CacheManager.invalidateMany({
          ids: deleted,
          baseKey: "ticket",
          listPattern: "tickets:list:*",
        });
        await CacheManager.delPattern("tickets:statistics:*");
      }

      logger.info(
        `Bulk ticket delete by user ${currentUser.id}: deleted=${deleted.length}, skipped=${skipped.length}`,
      );

      return res.sendResponse(
        { message: "Bulk ticket deletion completed.", deleted, skipped },
        200,
        { targetType: "Ticket", action: "bulk-delete-ticket" },
      );
    } catch (error: unknown) {
      logger.error(
        `Error while deleting ticket: ${error instanceof Error ? error.message : String(error)}`,
      );
      return next(error);
    }
  },
);

export { router as bulkDeleteTicketsV1Router };