import express from "express";
import type { NextFunction, Request, Response } from "express";
import {
  AuthorizationError,
  InternalServerError,
  isAuthenticated,
  isAuthorized,
  logger,
  NotFoundError,
  responseHandler,
  validateRequest,
  CacheManager
} from "intellisolar-common";
import type { CommentsRow, TicketRow } from "../../../interface";
import { Ticket, Comment } from "../../../models";
import { createCommentValidation } from "./create-comments.validation";
import { notifyUsers } from "../../../utils/notify-users";

const router = express.Router();

const normalizeUserIds = (value: string | string[] | null | undefined) =>
  (Array.isArray(value) ? value : [value]).filter((id): id is string => typeof id === "string" && id.trim() !== "");

router.post(
  "/v1/comment/ticket/:entity_id",
  responseHandler,
  isAuthenticated,
  isAuthorized("create-comment"),
  createCommentValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;
      const entityId = req.params["entity_id"] as string;

      const {
        comment,
        audio,
        attachments_ids,
      } = req.body ;


       const ticket = await CacheManager.getOrSet<TicketRow>({
          key: `ticket:${entityId}`,
          fetcher: async () => {
            const ticket = await Ticket.findOne<TicketRow>({
              where: { id:entityId },
              populate: Ticket.detailPopulateJoins
            });
            if (!ticket) {
              throw new NotFoundError("Ticket not found.");
            }
            return ticket;
          }
        });

     const assigneeIds = normalizeUserIds(ticket.assigned_to);

     const canNotComment =  currentUser.id != ticket.created_by ||  currentUser.tenant_id != ticket.tenant_id ;
      
      if (!canNotComment) {
        throw new AuthorizationError("You are not authorized to add comments to this ticket.");
      }

      const data = {
        entity_name:"ticket",
        entity_id:entityId,
        comment,
        audio,
        attachments_ids: attachments_ids ?? null,
        created_by: currentUser.id,
      };

      const Createdcomment = await Comment.create<CommentsRow>(data);
      if (!Createdcomment) {
        throw new InternalServerError("Failed to create comment, please try again later.");
      }

      const recipientIds = new Set<string>([
        ...(ticket.created_by ? [ticket.created_by] : []),
        ...assigneeIds,
        ...(ticket.assigned_by ? [ticket.assigned_by] : []),
      ]);
      recipientIds.delete(currentUser.id); 

      if (recipientIds.size > 0) {
        try {
          await notifyUsers({
            userIds: Array.from(recipientIds),
            title: `New comment on Ticket #${ticket.ticket_number}`,
            body: typeof comment === "string" ? comment.slice(0, 120) : "A new comment was added.",
            data: {
              ticketId: ticket.id,
              ticketNumber:ticket.ticket_number,
              commentId: Createdcomment.id,
              type: "NEW_COMMENT",
              priority: ticket.priority,
            },
          });
        } catch (notifyError) {
          const notifyMsg = notifyError instanceof Error ? notifyError.message : "unknown-error";
          logger.warn(`Comment notification could not be enqueued for ticket #${ticket.ticket_number}: ${notifyMsg}`);
        }
      }


      return res.sendResponse(
        {
          message: "Comment created successfully.",
        },
        201,
        {
          targetType: "Comment",
          targetId: Createdcomment.id,
          action: "create-comment",
          newData: Createdcomment,
        },
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknown-error";
      logger.error(`Create comment error: ${message}`);
      return next(error);
    }
  },
);

export { router as createCommentV1Router };
