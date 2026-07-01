import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AuthorizationError,
  BadRequestError,
  CacheManager,
  InternalServerError,
  isAuthenticated,
  isAuthorized,
  logger,
  NotFoundError,
  responseHandler,
  sanitizeObject,
  validateRequest,
} from "intellisolar-common";
import type { CommentsRow, TicketRow, UpdateCommentBody } from "../../../interface";
import { Ticket, Comment } from "../../../models";
import { updateCommentValidation } from "./update-comment.validation";

const router = express.Router();

const EDIT_WINDOW_MS = 5 * 60 * 1000;

router.patch(
  "/v1/comment/:entity_id/:id",
  responseHandler,
  isAuthenticated,
  isAuthorized('update-comment'),
  updateCommentValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;
      const commentId = req.params["id"] as string;
      const entityId = req.params["entity_id"] as string;

    
      const existingComment = await Comment.findOne<CommentsRow>({
        where: { id: commentId },
        populate: Comment.detailPopulateJoins,
      });

      if (!existingComment) {
        throw new NotFoundError("Comment not found.");
      }
    
      if (existingComment.entity_id !== entityId) {
        throw new BadRequestError("This comment does not belong to the specified entity.");
      };

      const ticket = await CacheManager.getOrSet<TicketRow>({
        key:`ticket:${entityId}`,
        fetcher: async()=> {
          const ticket = await Ticket.findOne<TicketRow>({
            where: { id: entityId },
            populate: Ticket.detailPopulateJoins,
          });

          if (!ticket) {
            throw new NotFoundError("Ticket not found.");
          }
          return ticket;
        }
      });
      
      const isAdminSuperAdmin = currentUser.role === "admin" || currentUser.role === "super_admin";

      const canEdit =
        isAdminSuperAdmin ||
        existingComment.created_by === currentUser.id ||
        ticket.created_by === currentUser.id ||
        ticket.tenant_id === currentUser.id ||
        ticket.assigned_to === currentUser.id;


      if (!canEdit) {
        throw new AuthorizationError("You are not authorized to edit this comment.");
      }

      if (!isAdminSuperAdmin) {
        const commentDurationMs = Date.now() - new Date(existingComment.created_at).getTime();
        if (commentDurationMs > EDIT_WINDOW_MS) {
          throw new BadRequestError("This comment can no longer be edited.");
        }
      }

      const { comment } = sanitizeObject(req.body as Record<string, unknown>) as UpdateCommentBody;

      const updatedData = { comment };

      const updatedComment = await Comment.updateOne<CommentsRow>({
        where: { id: commentId },
        data: { ...updatedData, updated_by: currentUser.id },
      });

      if (!updatedComment) {
        throw new InternalServerError("Failed to update comment, please try again later.");
      }

      const freshComment = await Comment.findOne<CommentsRow>({
        where: { id: commentId },
        populate: Comment.detailPopulateJoins,
      });

      if (!freshComment) {
        throw new InternalServerError("Failed to fetch updated comment.");
      }

      return res.sendResponse(
        {
          message: "Comment updated successfully.",
          comment: freshComment,
        },
        200,
        {
          targetType: "Comment",
          targetId: commentId,
          action: "update-comment",
          oldData: comment,
          newData: freshComment,
          modifiedProperties: {
            ...updatedData,
            updated_by: freshComment.updated_by,
            updated_at: freshComment.updated_at,
          },
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknown-error";
      logger.error(`Update comment error: ${message}`);
      return next(error);
    }
  },
);

export { router as updateCommentV1Router };