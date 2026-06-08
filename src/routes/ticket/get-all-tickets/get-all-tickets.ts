import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AuthorizationError,
  CacheManager,
  isAuthenticated,
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

export type TicketQuery = Record<string, unknown>;

const cleanQuery = (query: Request["query"]) => {
  const cleaned: TicketQuery = {};

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    cleaned[key] = value;
  }

  return cleaned;
};

export const getTicketQuery = (req: Request): TicketQuery => cleanQuery(req.query);

export const getTicketListCacheKey = (
  baseKey: string,
  role: string,
  userId: string,
  query: TicketQuery,
) => {
  const sortedQuery = Object.keys(query)
    .sort()
    .reduce<TicketQuery>((acc, key) => {
      acc[key] = query[key];
      return acc;
    }, {});

  return `${baseKey}:${role}:${userId}:${JSON.stringify(sortedQuery)}`;
};

router.get(
  "/v1/tickets",
  responseHandler,
  isAuthenticated,
  getAllTicketsValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;

      if (currentUser.role !== (UserRole.Admin as string) && currentUser.role !== (UserRole.SuperAdmin as string)) {
        throw new AuthorizationError("Only admin and super admin users can view all tickets.");
      }

      const query = getTicketQuery(req);
      const result = await CacheManager.getOrSet<FindResult<TicketRow>>({
        key: getTicketListCacheKey("tickets:list:all", currentUser.role, currentUser.id, query),
        fetcher: async () => Ticket.find({ query, populate: true }),
      });

      res.sendResponse(
        {
          message: result.data.length === 0
            ? "No tickets matched your request."
            : "Tickets fetched successfully.",
          tickets: result.data,
          pagination: {
            page: result.queryParams.page,
            limit: result.queryParams.limit,
            totalCount: result.total,
            totalPages: Math.ceil(result.total / result.queryParams.limit),
          },
        },
        200,
        {
          targetType: "Ticket",
          action: "get-all-tickets",
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Get all tickets error: ${message}`);
      next(error);
    }
  },
);

export { router as getAllTicketsV1Router };
