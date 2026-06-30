import express, { type NextFunction, type Request, type Response } from "express";
import {
  isAuthenticated,
  responseHandler,
  validateRequest,
  logger,
  NotFoundError,
  AppError,
} from "intellisolar-common";
import { Document } from "../../../models";
import type { FileRow } from "../../../interface";
import { UploadStatus, ProcessingStatus } from "../../../enums";
import { s3Service } from "../../../utils/aws";
import { confirmCommentFileValidation } from "./confirm-comment-file.validation";

const router = express.Router();

router.post(
  "/v1/comment/attachments/confirm",
  responseHandler,
  isAuthenticated,
  confirmCommentFileValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.currentUser!;
      const { document_id } = req.body as { document_id: string };

      const doc = await Document.findOne<FileRow>({ where: { id: document_id } });
      if (!doc) throw new NotFoundError("Document not found.");

      if (doc.uploaded_by !== currentUser.id) {
        throw new AppError("You do not have access to this document.", 403);
      }

      if (doc.upload_status === UploadStatus.COMPLETED) {
        const responseData = await Document.toDocumentResponse(doc);
        return res.sendResponse(
          { message: "File already confirmed.", document: responseData },
          200,
          { targetType: "Document", targetId: document_id, action: "confirm-comment-attachment" },
        );
      }

      if (doc.upload_status === UploadStatus.FAILED) {
        throw new AppError("This upload has failed. Please start a new upload.", 400);
      }

      const exists = await s3Service.exists(doc.s3_key);
      if (!exists) {
        await Document.updateOne<FileRow>({
          where: { id: document_id },
          data: {
            upload_status: UploadStatus.FAILED,
            error_message: "File not found in S3 - the presigned URL may have expired.",
          },
        });
        throw new AppError("Upload confirmation failed - file not found in storage. Please try again.", 400);
      }

      const downloadUrl = await s3Service.generateDownloadUrl(doc.s3_key, doc.mime_type ?? undefined);

      const updatedDoc = await Document.updateOne<FileRow>({
        where: { id: document_id },
        data: {
          upload_status: UploadStatus.COMPLETED,
          processing_status: ProcessingStatus.PENDING,
          s3_url: downloadUrl,
          error_message: null,
        },
      });

      if (!updatedDoc) throw new AppError("Failed to update document status.", 500);

      const responseData = await Document.toDocumentResponse(updatedDoc);

      return res.sendResponse(
        {
          message: "File confirmed successfully. Use document_id in create comment payload as attachments_ids.",
          document: responseData,
        },
        200,
        {
          targetType: "Document",
          targetId: document_id,
          action: "confirm-comment-attachment",
          newData: { document_id },
        },
      );
    } catch (err: unknown) {
      logger.error(`Confirm comment attachment error: ${(err as Error).message}`);
      return next(err);
    }
  },
);

export { router as confirmCommentFileV1Router };
