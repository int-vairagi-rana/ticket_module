import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  CacheManager,
  isAuthenticated,
  isAuthorized,
  logger,
  responseHandler,
  validateRequest,
} from "intellisolar-common";
import { Ticket } from "../../../models";
import { deleteMyOwnTicketValidation } from "./delete-ticket.validation";
import type { TicketRow } from "../../../interface";
import { TicketStatus } from "../../../enums";

const router = express.Router();

router.delete(
  "/v1/delete/ticket",
  responseHandler,
  isAuthenticated,
  isAuthorized("delete-ticket"),
  deleteMyOwnTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;

      const rawIds = (req.body as { ids: string[] }).ids;
      const uniqueIds = Array.from(new Set(rawIds));

      const tickets = await Ticket.findByIds<TicketRow>({
        where: { id: uniqueIds },
        select :["id"]

      });

      const skipped: { id: string; reason: string }[] = [];
      const eligibleIds: string[] = [];

      for (const id of uniqueIds) {
        const ticket = tickets.find((t) => t.id === id);

        if (!ticket) {
          skipped.push({ id, reason: "Ticket not found." });
          continue;
        }

        if (ticket.status === TicketStatus.OPEN) {
          skipped.push({ id, reason: "Open tickets cannot be deleted." });
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
      }

      logger.info(
        `Ticket delete by user ${currentUser.id}: deleted=${deleted.length}, skipped=${skipped.length}`,
      );

      return res.sendResponse(
        { 
          message: "Ticket deletion completed.",    
        },
        200,
        { 
          targetType: "Ticket", 
          action: "delete-ticket",
        },
      );
    } catch (error: unknown) {
      logger.error(`Error while deleting ticket: ${error instanceof Error ? error.message : String(error)}`);
      return next(error);
    }
  },
);

export { router as deleteTicketsV1Router };
