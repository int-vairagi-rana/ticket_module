import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  InternalServerError,
  isAuthenticated,
  isAuthorized,
  logger,
  NotFoundError,
  responseHandler,
  sanitizeObject,
  sendEmail,
  
  UserRow,
  validateRequest,
} from "intellisolar-common";
import type { CommentsRow } from "../../../interface";
import { Ticket, User, Comment } from "../../../models";
import { createCommentValidation } from "./create-comments.validation";
import { truncate } from "fs";

const router = express.Router();

router.post(
  "/v1/comment/:id",
  responseHandler,
  isAuthenticated,
  //isAuthorized("create-comment"),
  createCommentValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;

      const user = await User.findOne<UserRow>({
        where: { id: currentUser.id, is_active: true },
      });

      if (!user) {
        throw new NotFoundError("User not found.");
      }

      const { entity_name, entity_id, comments, audio, fiels } = sanitizeObject(req.body as Record<string, unknown>,);

      const ticket = await Ticket.findOne<{id: string}>({
        where: { id: entity_id  , created_by : currentUser.id  },
        select: ["*"],
      });

      if (!ticket) {
        throw new NotFoundError("Ticket not found.");
      }

      const canComment = ticket.created_by === currentUser.id ||ticket.assigned_to === currentUser.id;

        if (!canComment) {
        throw new InternalServerError(
            "You are not authorized to add comments to this ticket."
        );
    }


      const data = {
        entity_name,
        entity_id,
        audio,
        comments,
        fiels,
        created_by: currentUser.id,
      };

      const comment = await Comment.create<CommentsRow>({ data });
      if (!comment) {
        throw new InternalServerError("Failed to create comment, please try again later.");
      }
      

      // TODO: confirm sendEmail signature
      // await sendEmail({
      //   to: ticket.contact_person_email,
      //   subject: "New comment added to your ticket",
      //   body: `${ticket.contact_person_name}, a new comment was added: ${comments}`,
      // });

      return res.sendResponse(
        {
          message: "Comment created successfully.",
          comment,
        },
        201,
        {
          targetType: "Comment",
          targetId: comment.id,
          action: "create-comment",
          newData: comment,
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Create comment error: ${message}`);
      return next(error);
    }
  },
);

export { router as createCommentV1Router };