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
  FindResult,
} from "intellisolar-common";
import type { TicketRow } from "../../../interface";
import { Ticket } from "../../../models";
import { getAllTicketsValidation } from "./get-all-tickets.validation";
import {
  buildTicketStatusMetrics,
  summarizeTicketStatusHistory,
  summarizeTicketStatusMetrics,
} from "../../ticket/ticket.helper";

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
        name,
        email,
        phone_number,
        title,
        status,
        priority,
        plant_id,
        component_id,
        compoent_type_id,
        created_by,
        updated_by,
        created_from,
        updated_from,
        created_by_name,
        updated_by_name,
        resolved_from,
        resolved_to,
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
        name,
        email,
        phone_number,
        title,
        status,
        priority,
        plant_id,
        component_id,
        compoent_type_id,
        created_by,
        updated_by,
        created_from,
        updated_from,
        created_by_name,
        updated_by_name,
        resolved_from,
        resolved_to,
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

      const tickets = result.data.map((ticket) => ({
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        name: ticket.name,
        email: ticket.email,
        phone_number: ticket.phone_number,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        plant_id: ticket.plant_id,
        component_id: ticket.component_id,
        component_type_id: ticket.component_type_id,
        plant_name: ticket.plant_name,
        component_name: ticket.component_name,
        component_type: ticket.component_type,
        status_history: ticket.status_history,
        feedback: ticket.feedback,
        attachments_ids: ticket.attachments_ids,
        assigned_to_Id: ticket.assigned_to,
        assigned_to_name: ticket.assignee_name,
        assigned_by: ticket.assigned_by,
        assigned_by_name: ticket.assigned_by_name,
        closed_at: ticket.closed_at,
        resolved_at: ticket.resolved_at,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        created_by: ticket.created_by,
        updated_by: ticket.updated_by,
        created_by_name: ticket.created_by_name,
        updated_by_name: ticket.updated_by_name,
        status_metrics: buildTicketStatusMetrics(ticket),
        statusHistorySummary: summarizeTicketStatusHistory(result.data),
        resolutionSummary: summarizeTicketStatusMetrics(result.data),
      }));

      return res.sendResponse(
        {
          message:
            result.data.length === 0
              ? "No tickets found."
              : "Tickets fetched successfully.",
          tickets,
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
      logger.error(
        `Get all tickets error: ${error instanceof Error ? error.message : "unknown-error"}`,
      );
      return next(error);
    }
  },
);

export { router as getAllTicketsV1Router };
