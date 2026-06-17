import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AppError,
  AuthorizationError,
  CacheManager,
  isAuthenticated,
  logger,
  responseHandler,
  validateRequest,
} from "intellisolar-common";
import { Ticket } from "../../../models";
import { deleteMyOwnTicketValidation } from "./delete-my-own-ticket.validation";
import { TicketRow } from "../../../interface";

const router = express.Router();

router.delete(
  "/v1/tickets/:id",
  responseHandler,
  isAuthenticated,
  deleteMyOwnTicketValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;
      const id  = (req.params["id"] as string).trim();

      const ticket = await Ticket.findOne<TicketRow>({
        where: { id },
      });

      if (!ticket) {
        throw new AppError("Ticket not found.", 404);
      }

      if (ticket.created_by !== currentUser.id) {
        throw new AuthorizationError("You do not have permission to delete this ticket.");
      }

      // Guard against deleting tickets that are already closed/resolved 
      if (ticket.status === "closed" || ticket.status === "resolved" ) {
        throw new AppError("Closed or Resolved tickets cannot be deleted.", 400);
      }

      await Ticket.deleteOne({where : {id }});

      // Invalidate cached list
      await CacheManager.invalidateMany({
        ids: [id],
        baseKey: "ticket",
        listPattern: "tickets:list:*",
      });
      await CacheManager.delPattern("tickets:statistics:*");

      logger.info(`Ticket ${id} deleted by user ${currentUser.id}`);

      return res.sendResponse(
        { message: "Ticket deleted successfully." },
        200,
        { targetType: "Ticket", action: "delete-my-own-ticket" },
      );
    } catch (error: unknown) {
      logger.error(
        `Error while deleting ticket: ${error instanceof Error ? error.message : String(error)}`,
      );
      return next(error);
    }
  },
);

export { router as deleteMyOwnTicketV1Router };