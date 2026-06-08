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
import { TicketPriority, TicketStatus } from "../../../enums/ticket.enum";
import { summarizeTicketStatusHistory, summarizeTicketStatusMetrics } from "../../../utils/ticket-status-metrics";
import { getTicketListCacheKey, getTicketQuery, type TicketQuery } from "../get-all-tickets/get-all-tickets";
import { getTicketStatisticsValidation } from "./get-ticket-statistics.validation";

const router = express.Router();

type TicketStatistics = {
  total: number;
  generated: number;
  resolved: number;
  overdue: number;
  feedback: {
    submitted: number;
    pending: number;
    averageRating: number | null;
  };
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  status_history: ReturnType<typeof summarizeTicketStatusHistory>;
  status_metrics: ReturnType<typeof summarizeTicketStatusMetrics>;
};

const emptyCounts = (values: string[]) => values.reduce<Record<string, number>>((acc, value) => {
  acc[value] = 0;
  return acc;
}, {});

const hasFeedback = (ticket: TicketRow) => Boolean(ticket.feedback);

const getFeedbackRating = (ticket: TicketRow) => {
  const rating = ticket.feedback?.rating;
  return typeof rating === "number" && Number.isFinite(rating) ? rating : null;
};

const isOverdue = (ticket: TicketRow) => {
  if (!ticket.due_date) return false;
  if ([TicketStatus.RESOLVED, TicketStatus.CLOSED, TicketStatus.CANCELED].includes(ticket.status as TicketStatus)) return false;

  return new Date(ticket.due_date).getTime() < Date.now();
};

const getTicketStatistics = async (query: TicketQuery): Promise<TicketStatistics> => {
  const result = await Ticket.find({
    query: {
      ...query,
      page: 1,
      limit: 100000,
      sort_by: "created_at",
      sort_order: "DESC",
    },
    selectColumns: [
      "id",
      "status",
      "priority",
      "due_date",
      "created_at",
      "resolved_at",
      "feedback",
      "status_history",
    ],
    populate: false,
  }) as FindResult<TicketRow>;

  const tickets = result.data;
  const byStatus = emptyCounts(Object.values(TicketStatus));
  const byPriority = emptyCounts(Object.values(TicketPriority));

  for (const ticket of tickets) {
    byStatus[ticket.status] = (byStatus[ticket.status] ?? 0) + 1;
    byPriority[ticket.priority] = (byPriority[ticket.priority] ?? 0) + 1;
  }

  const feedbackRatings = tickets
    .map(getFeedbackRating)
    .filter((rating): rating is number => rating !== null);
  const feedbackSubmitted = tickets.filter(hasFeedback).length;
  const averageRating = feedbackRatings.length
    ? Number((feedbackRatings.reduce((sum, rating) => sum + rating, 0) / feedbackRatings.length).toFixed(2))
    : null;

  return {
    total: result.total,
    generated: result.total,
    resolved: byStatus[TicketStatus.RESOLVED] ?? 0,
    overdue: tickets.filter(isOverdue).length,
    feedback: {
      submitted: feedbackSubmitted,
      pending: result.total - feedbackSubmitted,
      averageRating,
    },
    byStatus,
    byPriority,
    status_history: summarizeTicketStatusHistory(tickets),
    status_metrics: summarizeTicketStatusMetrics(tickets),
  };
};

router.get(
  "/v1/tickets/statistics",
  responseHandler,
  isAuthenticated,
  getTicketStatisticsValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;

      if (currentUser.role !== (UserRole.Admin as string) && currentUser.role !== (UserRole.SuperAdmin as string)) {
        throw new AuthorizationError("Only admin and super admin users can view ticket statistics.");
      }

      const query = getTicketQuery(req);
      const statistics = await CacheManager.getOrSet<TicketStatistics>({
        key: getTicketListCacheKey("tickets:statistics", currentUser.role, currentUser.id, query),
        fetcher: async () => getTicketStatistics(query),
      });

      res.sendResponse(
        {
          message: "Ticket statistics fetched successfully.",
          statistics,
        },
        200,
        {
          targetType: "Ticket",
          action: "get-ticket-statistics",
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Get ticket statistics error: ${message}`);
      next(error);
    }
  },
);

export { router as getTicketStatisticsV1Router };
