import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
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
import { getAllTicketsValidation } from "./get-all-tickets.validation";
const router = express.Router();

router.get(
  "/v1/tickets",
  responseHandler,
  isAuthenticated,
  isAuthorized("get-all-tickets"),
  getAllTicketsValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;

      const {
        page = 1,
        limit = 50,
        search,
        sort_by,
        sort_order,
        status,
        priority,
        plant_id,
        component_id,
        created_by,
        updated_by,
        created_at_start,
        created_at_end,
        updated_at_start,
        updated_at_end,
        resolved_at_start,
        resolved_at_end,
        has_attachements,
        has_feedback,
        overdue,
        unassigned,
        source,
        assigned_to,
        assigned_by,
        feedback_rating,
      } = req.query;

      const query: Record<string, unknown> = {
        page,
        limit,
        search,
        sort_by,
        sort_order,
        status,
        priority,
        plant_id,
        component_id,
        created_by,
        updated_by,
        created_at_start,
        created_at_end,
        updated_at_start,
        updated_at_end,
        resolved_at_start,
        resolved_at_end,
        has_attachements,
        has_feedback,
        overdue,
        unassigned,
        source,
        assigned_to,
        assigned_by,
        feedback_rating,
      };

      if (currentUser.role === (UserRole.User as string)) {
        query["created_by"] = currentUser.id;
      }

      if (currentUser.role === (UserRole.Tenant as string)) {
        query["tenant_id"] = currentUser.id;
      }
      const redisKey = CacheManager.buildRedisKey(query);

      const result = await CacheManager.getOrSet<FindResult<TicketRow>>({
        key: `tickets:lists${redisKey}`,
        fetcher: async () => await Ticket.find({ query, populate: true }),
      });

      return res.sendResponse(
        {
          message:
            result.data.length === 0
              ? "No tickets found."
              : "Tickets fetched successfully.",
          data: result,
          pagination: {
            page: result.queryParams.page,
            limit: result.queryParams.limit,
            total_count: result.total,
            total_pages: Math.ceil(result.total / result.queryParams.limit),
          },
        },
        result.data.length === 0 ? 204 : 200,
        {
          targetType: "Ticket",
          action: "get-all-tickets",
        },
      );
    } catch (error: unknown) {
      logger.error(`Get all tickets error: ${error instanceof Error ? error.message : "unknown-error"}`);
      return next(error);
    }
  },
);

export { router as getAllTicketsV1Router };
