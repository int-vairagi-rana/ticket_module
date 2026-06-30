import { type UploadStatus, type ProcessingStatus } from "../enums";

export interface FileRow {
  id: string;
  tenant_id: string | null;
  tenant_name?: string | null;
  file_name: string;
  original_file_name: string;
  file_type: string;
  file_size: number;
  s3_bucket: string;
  s3_key: string;
  s3_url: string | null;
  mime_type: string | null;
  upload_status: UploadStatus;
  processing_status: ProcessingStatus;
  error_message: string | null;
  uploaded_by: string | null;
  uploaded_by_name?: string | null;
  created_at: Date;
  updated_at?: Date | null;
}

export interface PresignUploadRequest {
  original_file_name: string;
  mime_type: string;
  file_size: number;
}

export interface DocumentResponse {
  id: string;
  tenant_id: string | null;
  tenant_name?: string | null;
  original_file_name: string;
  file_name: string;
  file_type: string;
  file_size: number;
  mime_type: string | null;
  upload_status: UploadStatus;
  processing_status: ProcessingStatus;
  error_message: string | null;
  uploaded_by: string | null;
  uploaded_by_name?: string | null;
  download_url: string;
  created_at: Date;
  updated_at: Date | null;
}