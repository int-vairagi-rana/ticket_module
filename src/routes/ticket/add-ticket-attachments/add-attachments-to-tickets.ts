import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import {
  isAuthenticated,
  responseHandler,
  validateRequest,
  logger,
} from "intellisolar-common";
import { Document } from "../../../models";
import type { FileRow } from "../../../interface";
import { UploadStatus, ProcessingStatus } from "../../../enums";
import { s3Service, PRESIGN_EXPIRY_SEC } from "../../../utils/aws";
import { presignTicketFileValidation } from "./add-attachments-to-tickets.validation";
import path from "path";

const router = express.Router();

router.post(
  "/v1/ticket/attachments/presign",
  responseHandler,
  isAuthenticated,
  presignTicketFileValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;
      const tenantId = currentUser.tenant_id ?? null;
      const uploadedBy = currentUser.id;

      const { original_file_name, mime_type, file_size } = req.body;

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
          ? `ticket-attachments/${tenantId}`
          : "ticket-attachments",
        entityId: uploadedBy,
        fileName: sanitized,
      });

      const bucket = process.env["AWS_S3_BUCKET"]!;

      const result = await Document.create<FileRow>({
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
        uploaded_by: uploadedBy,
      });

      const uploadUrl = await s3Service.generateUploadUrl(s3Key, {
        contentType: mime_type,
        metadata: {
          document_id: result.id,
          uploaded_by: uploadedBy,
          ...(tenantId ? { tenant_id: tenantId } : {}),
        },
      });

      return res.sendResponse(
        {
          document_id: result.id,
          upload_url: uploadUrl,
          s3_key: s3Key,
          expires_in: PRESIGN_EXPIRY_SEC,
        },
        201,
        {
          targetType: "Document",
          targetId: result.id,
          action: "presign-ticket-attachment",
          newData: result,
        },
      );
    } catch (error: unknown) {
      logger.error(
        `Presign ticket attachment error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return next(error);
    }
  },
);

export { router as addAttachmentsToTicketFileV1Router };
