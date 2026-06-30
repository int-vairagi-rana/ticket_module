import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AuthorizationError,
  isAuthenticated,
  logger,
  NotFoundError,
  responseHandler,
  UserRole,
  validateRequest,
  CacheManager,
  FindResult,
  isAuthorized,
} from "intellisolar-common";
import { Ticket,  Comment } from "../../../models";
import { getAllCommentsValidation } from "./get-all-comments.validation";
import { CommentsRow, TicketRow } from "../../../interface";

const router = express.Router();

router.get(
  "/v1/comments/:entityId",
  responseHandler,
  isAuthenticated,
  isAuthorized('get-all-comments'),
  getAllCommentsValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;
      const entityId = req.params["entityId"] as string;

      const ticket = await Ticket.findOne<TicketRow>({
        where: { id: entityId },
        select: ["id", "created_by", "assigned_to"],
      });

      if (!ticket) {
        throw new NotFoundError("Ticket not found.");
      }

      const { page = 1 , limit = 50 , search , sort_order , sort_by ,  created_by , updated_by , created_by_name , updated_by_name ,
        created_from , created_to , updated_from , updated_to } = req.query;

      const query:Record<string,any> = {
        page, 
        limit,
        search , 
        sort_order , 
        sort_by , 
        created_by , 
        updated_by , 
        created_by_name , 
        updated_by_name ,
        created_from , 
        created_to , 
        updated_from , 
        updated_to
      }

      const redisKey = CacheManager.buildRedisKey(query);

      const result = await CacheManager.getOrSet<FindResult<CommentsRow>>({
        key:`comments:list:${redisKey}`,
        fetcher: async () => await Comment.find({ query, populate: true }),
      });

      return res.sendResponse(
        {
            message: result.data.length === 0 ? "No comments found." : "Comments fetched successfully.",
            comments: result.data,
            pagination: {
              page: result.queryParams.page,
              limit: result.queryParams.limit,
              total_count: result.total,
              total_pages: Math.ceil(result.total / result.queryParams.limit),
            },
        },
        result.data.length === 0 ? 204 : 200,
        { 
          targetType: "Comments", 
          action: "get-all-comments" 
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknwon-error";
      logger.error(`Get all comments error: ${message}`);
      return next(error);
    }
  },
);

export { router as getAllCommentsV1Router };
