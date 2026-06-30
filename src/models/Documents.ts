import { type FileRow, type DocumentResponse } from "../interface";
import {
  BaseModel,
  type FindResult,
  type PopulateOption,
} from "intellisolar-common";
import { documentFieldConfigs } from "../valid-fields";
import { s3Service } from "../utils/aws";
import { UploadStatus } from "../enums";

export class Document extends BaseModel {
  protected static override tableName = "files";

  static override fieldConfigs = documentFieldConfigs;

  static override allowedPopulate = {
    users: ["id", "full_name"],
    tenants: ["id", "name"],
  };

  static readonly detailPopulateJoins: PopulateOption[] = [
    {
      table: "users",
      localKey: "uploaded_by",
      foreignKey: "id",
      select: ["full_name as uploaded_by_name"],
    },
    {
      table: "tenants",
      localKey: "tenant_id",
      foreignKey: "id",
      select: ["name as tenant_name"],
    },
  ];

  static override async find({
    query,
    tenantScoped = false,
    tenantId,
    selectColumns,
    notSelectedColumns,
    populate = true,
  }: {
    query: Record<string, unknown>;
    tenantScoped?: boolean;
    tenantId?: string;
    selectColumns?: string[];
    notSelectedColumns?: string[];
    populate?: boolean;
  }): Promise<FindResult<FileRow>> {
    return (await super.find({
      query,
      tenantScoped,
      tenantId,
      selectColumns,
      notSelectedColumns,
      forcedFilters: tenantScoped && tenantId ? { tenant_id: tenantId } : {},
      populate: populate ? this.detailPopulateJoins : [],
    })) as FindResult<FileRow>;
  }

  static async toDocumentResponse(record: FileRow): Promise<DocumentResponse> {
    let downloadUrl = "";

    if (record.upload_status === UploadStatus.COMPLETED) {
      try {
        if (record.s3_key.startsWith("avatars/")) {
          downloadUrl = s3Service.getPublicUrl(record.s3_key);
        } else {
          downloadUrl = await s3Service.generateDownloadUrl(
            record.s3_key,
            record.mime_type ?? undefined,
          );
        }
      } catch {
        downloadUrl = "";
      }
    }

    return {
      id: record.id,
      tenant_id: record.tenant_id,
      tenant_name: record.tenant_name ?? null,
      original_file_name: record.original_file_name,
      file_name: record.file_name,
      file_type: record.file_type,
      file_size: record.file_size,
      mime_type: record.mime_type,
      upload_status: record.upload_status,
      processing_status: record.processing_status,
      error_message: record.error_message,
      uploaded_by: record.uploaded_by,
      uploaded_by_name: record.uploaded_by_name ?? null,
      download_url: downloadUrl,
      created_at: record.created_at,
      updated_at: record.updated_at ?? null,
    };
  }
}
