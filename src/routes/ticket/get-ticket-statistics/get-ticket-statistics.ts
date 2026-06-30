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
import type { FindResult } from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { buildStatistics} from "./ticket.helper";
import { getTicketStatisticsValidation } from "./get-ticket-statistics.validation";

const router = express.Router();

router.get(
  "/v1/tickets/statistics",
  responseHandler,
  isAuthenticated,
  isAuthorized('get-all-tickets'),
  getTicketStatisticsValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;

      // ── Admin: tickets they personally assigned ─────
    if (currentUser.role === (UserRole.Admin as string)) {
      const statistics = await CacheManager.getOrSet({
        key: `tickets:statistics:admin:${currentUser.id}`,
        fetcher: async () => {
          const result = await Ticket.find({
            query: { assigned_by: currentUser.id || null , page: 1, limit: 100 },
            selectColumns: ["id","status","priority","created_at","resolved_at","feedback","status_history","assigned_by"],
            populate: false,
          }) as FindResult<TicketRow>;

          return buildStatistics(result.data, result.total);
        },
      });

      return res.sendResponse(
        { message: "Ticket statistics fetched successfully.", statistics },
        200,
        { targetType: "Ticket", action: "get-ticket-statistics" },
      );
    }
            

      // ── SuperAdmin: all tickets system-wide ───────
      if (currentUser.role === (UserRole.SuperAdmin as string)) {
        const cacheKey = `tickets:statistics:super-admin:global`;

        const statistics = await CacheManager.getOrSet({
          key: cacheKey,
          fetcher: async () => {
            const result = await Ticket.find({
              query: { page: 1, limit: 100 },
              selectColumns: ["id","status","priority","created_at","resolved_at","feedback","status_history","assigned_by"],
              populate: false,
            }) as FindResult<TicketRow>;

            return buildStatistics(result.data, result.total);
          },
        });

        return res.sendResponse(
          { message: "Ticket statistics fetched successfully.", statistics },
          200,
          { targetType: "Ticket", action: "get-ticket-statistics" },
        );
      }

      throw new AuthorizationError("You do not have permission to view ticket statistics.");
    } catch (error: unknown) {
      logger.error(
        `Get ticket statistics error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return next(error);
    }
  },
);

export { router as getTicketStatisticsV1Router };