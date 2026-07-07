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
        source,
        assigned_to,
        assigned_by
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
        source,
        assigned_to,
        assigned_by
      };

      if (currentUser.role === UserRole.User) {
        query["created_by"] = currentUser.id;
      }

      if (currentUser.role === UserRole.Tenant) {
        query["tenant_id"] = currentUser.id;
      }

      const redisKey = CacheManager.buildRedisKey(query);

      const result = await CacheManager.getOrSet<FindResult<TicketRow>>({
        key: `tickets:list${redisKey}`,
        fetcher: async () => await Ticket.find({ query }),
      });


      return res.sendResponse(
        {
          tickets:result.data,
          pagination: {
            page: result.queryParams.page,
            limit: result.queryParams.limit,
            total_count: result.total,
            total_pages: Math.ceil(result.total / result.queryParams.limit),
          },
        },
        200, 
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
