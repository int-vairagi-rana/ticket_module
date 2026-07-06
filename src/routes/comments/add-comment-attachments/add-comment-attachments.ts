import express, { type NextFunction, type Request, type Response } from "express";
import {
  isAuthenticated,
  responseHandler,
  validateRequest,
  logger,
  UserRole,
  CacheManager,
  NotFoundError,
  AuthorizationError,
} from "intellisolar-common";
import { Document, Ticket } from "../../../models";
import type { FileRow, TicketRow } from "../../../interface";
import type { PresignUploadRequest } from "../../../interface/comments";
import { UploadStatus, ProcessingStatus } from "../../../enums";
import { s3Service, PRESIGN_EXPIRY_SEC } from "../../../utils/aws";
import { presignCommentFileValidation } from "./add-comment-attachments.validation";
import path from "path";

const router = express.Router();

router.post(
  "/v1/comment/attachments/presign",
  responseHandler,
  isAuthenticated,
  presignCommentFileValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;
      const tenantId = currentUser.tenant_id ?? null;

      const { original_file_name, mime_type, file_size  , entity_id } = req.body as PresignUploadRequest;

      const ticket = await CacheManager.getOrSet<TicketRow>({
        key: `ticket:${entity_id}`,
        fetcher: async () => {
          const ticket = await Ticket.findOne<TicketRow>({
            where: { id: entity_id },
            populate: Ticket.detailPopulateJoins,
          });
          if (!ticket) {
            throw new NotFoundError("Ticket not found.");
          }
          return ticket;
        },
      });

      if (currentUser.role === UserRole.User || currentUser.role === UserRole.Tenant) {
        const canComment = ticket.created_by === currentUser.id || ticket.tenant_id === currentUser.tenant_id;
        if (!canComment) {
          throw new AuthorizationError("You are not authorized to add comments to this ticket.");
        }
      }

      const sanitized = path
        .basename(original_file_name)
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w.\-]/g, "")
        .toLowerCase();

      const fileExt = path
        .extname(original_file_name)
        .toLowerCase()
        .replace(".", "");

      const s3Key = s3Service.buildKey({
        module: tenantId
          ? `comment-attachments/${tenantId}/${entity_id}`
          : `comment-attachments/${entity_id}`,
        entityId: currentUser.id,
        fileName: sanitized,
      });

      const bucket = process.env["AWS_S3_BUCKET"]!;

      const document = await Document.create<FileRow>({
        tenant_id: tenantId,
        file_name: sanitized,
        original_file_name,
        file_type: fileExt,
        file_size,
        s3_bucket: bucket,
        s3_key: s3Key,
        mime_type,
        upload_status: UploadStatus.PENDING,
        processing_status: ProcessingStatus.PENDING,
        uploaded_by: currentUser.id,
      });

      const uploadUrl = await s3Service.generateUploadUrl(s3Key, {
        contentType: mime_type,
        metadata: {
          document_id: document.id,
          uploaded_by: currentUser.id,
          ...(tenantId ? { tenant_id: tenantId } : {}),
        },
      });

      return res.sendResponse(
        {
          document_id: document.id,
          upload_url: uploadUrl,
          s3_key: s3Key,
          expires_in: PRESIGN_EXPIRY_SEC,
        },
        201,
        {
          targetType: "Document",
          targetId: document.id,
          action: "presign-comment-attachment",
          newData: { document_id: document.id },
        },
      );
    } catch (error: unknown) {
      logger.error(`Presign comment attachment error: ${error instanceof Error ? error.message : String(error)}`);
      return next(error);
    }
  },
);

export { router as presignCommentFileV1Router };
