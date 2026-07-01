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
} from "intellisolar-common";
import { Ticket, Comment } from "../../../models";
import { getAllCommentsValidation } from "./get-all-comments.validation";
import type { TicketRow } from "../../../interface";

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
      
      const canView = ticket.created_by === currentUser.id || ticket.tenant_id === currentUser.id  ;
     
      if (!canView){
        throw new AuthorizationError("You are not authorise to view comments for this ticket.");

      }

      const result = await Comment.find({
        query: { entity_id: entityId },
        selectColumns: ["comment"],
        populate: true,
      });

      if(!result){
        throw new NotFoundError("Comments not found");
      }

      return res.sendResponse(
        {
          message: "Comments fetched successfully.",
          comments: result,
        },
        200,
        {
          targetType: "Comments",
          action: "get-all-comments",
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
