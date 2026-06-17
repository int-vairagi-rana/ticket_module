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

const ALLOWED_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "resolved_at",
  "priority",
  "status",
  "title",
  "name",
  "email",
  "created_by",
  "updated_by",
  "assigned_to",
  "assined_by",
  "plant_id",
  "compoent_type_id",
  "component_id"
] as const;


const buildTicketQuery = (reqQuery: Request["query"], scopeOverrides: Record<string, unknown> = {}) => {
  const query: Record<string, unknown> = {
    page: reqQuery["page"] ? Number(reqQuery["page"]) : 1,
    limit: reqQuery["limit"] ? Number(reqQuery["limit"]) : 10,
  };

  // sorting
  if (reqQuery["sort_by"] && ALLOWED_SORT_FIELDS.includes(reqQuery["sort_by"] as typeof ALLOWED_SORT_FIELDS[number])) {
    query["sort_by"] = reqQuery["sort_by"];
  } else {
    query["sort_by"] = "created_at";
  }
  query["sort_order"] = reqQuery["sort_order"] === "asc" ? "asc" : "desc";

  // filters
  if (reqQuery["status"])          query["status"] = reqQuery["status"];
  if (reqQuery["priority"])        query["priority"] = reqQuery["priority"];
  if (reqQuery["plant_id"])        query["plant_id"] = reqQuery["plant_id"];
  if (reqQuery["component_id"])        query["component_id"] = reqQuery["compoent_id"];
  if (reqQuery["assigned_to"])     query["assigned_to"] = reqQuery["assigned_to"];
  if (reqQuery["assigned_by"])     query["assigned_by"] = reqQuery["assigned_by"];
  if (reqQuery["created_by"])      query["created_by"] = reqQuery["created_by"];
  if (reqQuery["updated_by"])      query["updated_by"] = reqQuery["updated_by"];
  if (reqQuery["feedback_rating"]) query["feedback_rating"] = Number(reqQuery["feedback_rating"]);

  // boolean filters
  if (reqQuery["unassigned"] === "true")    query["unassigned"] = true;
  if (reqQuery["has_feedback"] === "true")  query["has_feedback"] = true;
  if (reqQuery["has_feedback"] === "false") query["has_feedback"] = false;
  if (reqQuery["has_attachments"] === "true") query["has_attachements"] = true;
  if (reqQuery["has_attachments"] === "false") query["has_attachements"] = false;
  if (reqQuery["overdue"] === "true")       query["overdue"] = true;

  // date ranges
  if (reqQuery["created_from"]) query["created_from"] = new Date(reqQuery["created_from"] as string);
  if (reqQuery["created_to"])   query["created_to"] = new Date(reqQuery["created_to"] as string);
  if (reqQuery["updated_from"]) query["updated_from"] = new Date(reqQuery["updated_from"] as string);
  if (reqQuery["updated_to"])   query["updated_to"] = new Date(reqQuery["updated_to"] as string);
  if (reqQuery["start_date"])   query["start_date"] = new Date(reqQuery["start_date"] as string);
  if (reqQuery["end_date"])     query["end_date"] = new Date(reqQuery["end_date"] as string);
  if (reqQuery["resolve_at"])     query["resolve_at"] = new Date(reqQuery["resolve_at"] as string);


  // search
  if (reqQuery["search"] && typeof reqQuery["search"] === "string" && reqQuery["search"].trim()) {
    query["search"] = reqQuery["search"].trim();
  }

  // scope overrides — always last
  for (const [key, value] of Object.entries(scopeOverrides)) {
    query[key] = value;
  }

  return query;
};

const buildCacheKey = (role: string, userId: string, query: Record<string, unknown>) => {
  const sortedQuery = Object.keys(query)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = query[key];
      return acc;
    }, {});

  return `tickets:list:v2:${role}:${userId}:${JSON.stringify(sortedQuery)}`;
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

      // ── User: only their own created tickets ────────────────────────────────
      if (currentUser.role === (UserRole.User as string)) {
        // force created_by = userId — user cannot see other people's tickets
        const query = buildTicketQuery(req.query, { created_by: currentUser.id});

        const result = await CacheManager.getOrSet<FindResult<TicketRow>>({
          key: buildCacheKey(currentUser.role, currentUser.id, query),
          fetcher: async () => Ticket.find({ query, populate: true }),
        });

        return res.sendResponse(
          {
            message: result.data.length === 0
              ? "No tickets found."
              : "Tickets fetched successfully.",
            tickets: result.data,
            pagination: {
              page: result.queryParams.page,
              limit: result.queryParams.limit,
              total_count: result.total,
              total_pages: Math.ceil(result.total / result.queryParams.limit),
              has_next: result.queryParams.page < Math.ceil(result.total / result.queryParams.limit),
              has_prev: result.queryParams.page > 1,
            },
          },
          200,
          { targetType: "Ticket", action: "get-all-tickets" },
        );
      }

      // ── SuperAdmin & Admin: all tickets, no scope restriction 
      if (currentUser.role === (UserRole.SuperAdmin as string) || currentUser.role === (UserRole.Admin as string)) {
        const query = buildTicketQuery(req.query);

        const result = await CacheManager.getOrSet<FindResult<TicketRow>>({
          key: buildCacheKey(currentUser.role, currentUser.id, query),
          fetcher: async () => Ticket.find({ query, populate: true }),
        });

        return res.sendResponse(
          {
            message: result.data.length === 0
              ? "No tickets found."
              : "Tickets fetched successfully.",
            tickets: result.data,
            pagination: {
              page: result.queryParams.page,
              limit: result.queryParams.limit,
              total_count: result.total,
              total_pages: Math.ceil(result.total / result.queryParams.limit),
              has_next: result.queryParams.page < Math.ceil(result.total / result.queryParams.limit),
              has_prev: result.queryParams.page > 1,
            },
          },
          200,
          { targetType: "Ticket", action: "get-all-tickets" },
        );
      }

      throw new AuthorizationError("You do not have permission to view tickets.");
    } catch (error: unknown) {
      logger.error(
        `Get all tickets error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return next(error);
    }
  },
);

export { router as getAllTicketsV1Router };

