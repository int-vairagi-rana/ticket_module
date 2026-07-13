import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  isAuthenticated,
  logger,
  NotFoundError,
  responseHandler,
  validateRequest,
  CacheManager,
  isAuthorized,
  AuthorizationError,
  UserRole,
} from "intellisolar-common";
import { Ticket, Comment } from "../../../models";
import { getAllCommentsValidation } from "./get-all-comments.validation";
import type { TicketRow } from "../../../interface";
import { getTicketStatusAt } from "../../ticket/update-ticket-status/update-ticket-status";

const router = express.Router();

router.get(
  "/v1/comments/:entityId",
  responseHandler,
  isAuthenticated,
  isAuthorized("get-all-comments"),
  getAllCommentsValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;
      const entityId = req.params["entityId"] as string;

      const ticket = await CacheManager.getOrSet<TicketRow>({
        key: `ticket:${entityId}`,
        fetcher: async () => {
          const ticket = await Ticket.findOne<TicketRow>({
            where: { id: entityId },
          });

          if (!ticket) {
            throw new NotFoundError("Ticket not found.");
          }
          return ticket;
        },
      });

      const isPrivileged = currentUser.role === UserRole.Admin || currentUser.role === UserRole.SuperAdmin;
      const canNotView =  !isPrivileged && (currentUser.id != ticket.created_by  ||  currentUser.tenant_id != ticket.tenant_id ) ;
      if (canNotView) {
        throw new AuthorizationError("You are not authorise to view comments for this ticket.");
      }

      const result = await Comment.find({
        query: { entity_id: ticket.id }
      });
    
      if (!result) {
        throw new NotFoundError("Comments not found");
      }

      const commentsWithStatus = result.data.map((c) => ({
        ...c,
        ticket_status: getTicketStatusAt(ticket, c.created_at),
      }));

      return res.sendResponse(
        {
          comments: { ...result, data: commentsWithStatus},
          pagination: {
            page: result.queryParams.page,
            limit: result.queryParams.limit,
            total_count: result.total,
            total_pages: Math.ceil(result.total / result.queryParams.limit),
          },
        },
        200,
        {
          targetType: "Comments",
          action: "get-all-comments",
        },
      );
    } catch (error: unknown) {
      logger.error(`Get all comments error: ${error instanceof Error ? error.message : String(error)}`);
      return next(error);
    }
  },
);

export { router as getAllCommentsV1Router };
