import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { logger } from "intellisolar-common";

export const ALLOWED_MIME_TYPES = new Set<string>([
  //  ++++++++++++ DOCUMENT ++++++++++++++
  "application/pdf", // .pdf
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-powerpoint", // .ppt
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "text/plain", // .txt
  "text/csv", // .csv

  //  ++++++++++++ IMAGES ++++++++++++++
  "image/jpeg", // .jpg/.jpeg
  "image/png", // .png
  "image/gif", // .gif
  "image/webp", // .webp
  "image/svg+xml", // .svg

  //  ++++++++++++ ARCHIVES ++++++++++++++
  "application/zip", // .zip
  "application/x-rar-compressed", // .rar

  //  ++++++++++++ AUDIO ++++++++++++++
  "audio/mpeg", // .mp3
  "audio/mp4", // .m4a
  "audio/webm", // .webm audio
  "audio/ogg", // .ogg
  "audio/wav", // .wav
  "audio/aac", // .aac

  //  ++++++++++++ VIDEO ++++++++++++++
  "video/mp4", // .mp4
  "video/quicktime", // .mov
  "video/webm", // .webm video
  "video/x-msvideo", // .avi
]);

export const ALLOWED_IMAGE_MIME_TYPES = new Set<string>([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const PRESIGN_EXPIRY_SEC = 900; // 15 minutes — must match S3Service config

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface GenerateKeyOptions {
  module: string;
  entityId: string | number;
  fileName: string;
}

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
  eTag?: string;
}

export interface S3ServiceConfig {
  bucket: string;
  region: string;
  uploadUrlExpiry?: number;
  downloadUrlExpiry?: number;
  publicBaseUrl?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

// ─── Custom Errors ────────────────────────────────────────────────────────────

export class S3NotFoundError extends Error {
  constructor(key: string) {
    super(`S3 object not found: ${key}`);
    this.name = "S3NotFoundError";
  }
}

export class S3AccessDeniedError extends Error {
  constructor(key: string) {
    super(`S3 access denied for key: ${key}`);
    this.name = "S3AccessDeniedError";
  }
}

export class S3UploadError extends Error {
  constructor(key: string, cause?: unknown) {
    super(`S3 upload failed for key: ${key}`);
    this.name = "S3UploadError";
    this.cause = cause;
  }
}

export class S3ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "S3ConfigurationError";
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_UPLOAD_URL_EXPIRY = 900; // 15 minutes
const DEFAULT_DOWNLOAD_URL_EXPIRY = 900; // 15 minutes
const MAX_URL_EXPIRY = 604_800; // 7 days (AWS hard limit)
const LIST_PAGE_SIZE = 1_000; // AWS max per ListObjectsV2 page

// ─── Class ────────────────────────────────────────────────────────────────────

export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly uploadUrlExpiry: number;
  private readonly downloadUrlExpiry: number;
  private readonly publicBaseUrl?: string;

  constructor(config?: S3ServiceConfig) {
    const bucket = config?.bucket ?? process.env["AWS_S3_BUCKET"];
    const region = config?.region ?? process.env["AWS_REGION"];

    if (!bucket) throw new S3ConfigurationError("AWS_S3_BUCKET is missing");
    if (!region) throw new S3ConfigurationError("AWS_REGION is missing");

    this.bucket = bucket;
    this.region = region;

    this.uploadUrlExpiry = S3Service.clampExpiry(
      config?.uploadUrlExpiry ??
        Number(
          process.env["AWS_S3_UPLOAD_URL_EXPIRES"] ?? DEFAULT_UPLOAD_URL_EXPIRY,
        ),
    );

    this.downloadUrlExpiry = S3Service.clampExpiry(
      config?.downloadUrlExpiry ??
        Number(
          process.env["AWS_S3_DOWNLOAD_URL_EXPIRES"] ??
            DEFAULT_DOWNLOAD_URL_EXPIRY,
        ),
    );

    this.publicBaseUrl =
      config?.publicBaseUrl ?? process.env["AWS_S3_PUBLIC_BASE_URL"];

    const accessKeyId = config?.accessKeyId ?? process.env["AWS_ACCESS_KEY_ID"];
    const secretAccessKey =
      config?.secretAccessKey ?? process.env["AWS_SECRET_ACCESS_KEY"];

    this.client = new S3Client({
      region,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined, // Falls back to IAM role / instance profile
    });
  }

  // ─── Key Builder ────────────────────────────────────────────────────────────

  /**
   * Builds a unique, collision-safe S3 key.
   * Format: `{module}/{entityId}/{uuid}-{sanitized-filename}`
   * Example: `invoices/abc-123/f47ac10b-...-invoice-march.pdf`
   */
  buildKey({ module, entityId, fileName }: GenerateKeyOptions): string {
    const sanitized = fileName
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w.\-]/g, "")
      .toLowerCase();
    return `${module}/${entityId}/${randomUUID()}-${sanitized}`;
  }

  // ─── Upload ─────────────────────────────────────────────────────────────────

  /**
   * Generates a presigned PUT URL for client-side direct-to-S3 uploads.
   * The client PUTs the raw file bytes to this URL — your server is not
   * in the data path at all.
   */
  async generateUploadUrl(
    key: string,
    options?: UploadOptions,
  ): Promise<string> {
    try {
      return await getSignedUrl(
        this.client,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: options?.contentType,
          Metadata: options?.metadata,
        }),
        { expiresIn: this.uploadUrlExpiry },
      );
    } catch (err) {
      S3Service.rethrow(err, key);
    }
  }

  // ─── Download ───────────────────────────────────────────────────────────────

  /**
   * Generates a presigned GET URL for secure, time-limited file access.
   * Always generate a fresh one — never serve a stored URL directly.
   */
  async generateDownloadUrl(
    key: string,
    contentType?: string,
  ): Promise<string> {
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ...(contentType ? { ResponseContentType: contentType } : {}),
        }),
        { expiresIn: this.downloadUrlExpiry },
      );
    } catch (err) {
      S3Service.rethrow(err, key);
    }
  }

  /**
   * Streams an S3 object body server-side.
   * Use for virus scanning, image processing, parsing CSV etc.
   */
  async getObject(key: string): Promise<GetObjectCommandOutput> {
    try {
      return await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (err) {
      S3Service.rethrow(err, key);
    }
  }

  // ─── Existence & Metadata ───────────────────────────────────────────────────

  /**
   * Returns true if the object exists.
   * Returns false on 404. Rethrows on 403 or unexpected errors — never
   * silently swallows access denied.
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      return true;
    } catch (err: unknown) {
      const errorName = err instanceof Error ? err.name : undefined;
      const status =
        typeof err === "object" &&
        err !== null &&
        "$metadata" in err &&
        typeof (err as { $metadata?: { httpStatusCode?: unknown } }).$metadata
          ?.httpStatusCode === "number"
          ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata
              ?.httpStatusCode
          : undefined;

      if (status === 404 || errorName === "NotFound") {
        return false;
      }

      if (status === 403 || errorName === "Forbidden") {
        logger.warn(
          `S3 access denied bucket=${this.bucket} key=${key} status=${String(status ?? "unknown")}`,
        );

        throw new S3AccessDeniedError(key);
      }

      logger.error(
        `Unexpected S3 exists() error bucket=${this.bucket} key=${key} status=${String(status ?? "unknown")}`,
      );

      throw err;
    }
  }

  /**
   * Returns the user-defined metadata of an object without downloading its body.
   */
  async getMetadata(key: string): Promise<Record<string, string>> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return result.Metadata ?? {};
    } catch (err) {
      S3Service.rethrow(err, key);
    }
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  /**
   * Batch-deletes up to N objects efficiently.
   * Automatically chunks into 1,000-key pages (AWS limit per request).
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const CHUNK = 1_000;

    for (let i = 0; i < keys.length; i += CHUNK) {
      const chunk = keys.slice(i, i + CHUNK);
      const result = await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: chunk.map((Key) => ({ Key })),
            Quiet: false,
          },
        }),
      );

      if (result.Errors?.length) {
        const summary = result.Errors.map((e) => `${e.Key}: ${e.Message}`).join(
          ", ",
        );
        throw new Error(`S3 batch delete had partial failures: ${summary}`);
      }
    }
  }

  // ─── List ───────────────────────────────────────────────────────────────────

  /**
   * Lists ALL objects under a prefix, transparently handling AWS pagination.
   * Returns an empty array if no objects match.
   */
  async list(prefix: string): Promise<S3Object[]> {
    const results: S3Object[] = [];
    let token: string | undefined;

    try {
      do {
        const response = await this.client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: prefix,
            MaxKeys: LIST_PAGE_SIZE,
            ContinuationToken: token,
          }),
        );

        for (const item of response.Contents ?? []) {
          if (item.Key) {
            results.push({
              key: item.Key,
              size: item.Size ?? 0,
              lastModified: item.LastModified ?? new Date(),
              eTag: item.ETag,
            });
          }
        }

        token = response.IsTruncated
          ? response.NextContinuationToken
          : undefined;
      } while (token);
    } catch (err) {
      S3Service.rethrow(err, prefix);
    }

    return results;
  }

  // ─── Public URL ─────────────────────────────────────────────────────────────

  /**
   * Returns a public URL for publicly accessible objects.
   * Prefers AWS_S3_PUBLIC_BASE_URL (CDN / CloudFront) when set.
   */
  getPublicUrl(key: string): string {
    const trimmed = key.replace(/^\/+/, "");
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/+$/, "")}/${trimmed}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${trimmed}`;
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private static clampExpiry(seconds: number): number {
    if (!Number.isFinite(seconds) || seconds <= 0)
      return DEFAULT_UPLOAD_URL_EXPIRY;
    return Math.min(seconds, MAX_URL_EXPIRY);
  }

  /**
   * Translates raw AWS SDK errors into typed errors.
   * Return type is `never` — this always throws.
   */
  private static rethrow(err: unknown, key: string): never {
    const e =
      typeof err === "object" && err !== null
        ? (err as Record<string, unknown>)
        : undefined;
    const metadata =
      e?.["$metadata"] && typeof e["$metadata"] === "object"
        ? (e["$metadata"] as Record<string, unknown>)
        : undefined;
    const status =
      typeof metadata?.["httpStatusCode"] === "number"
        ? metadata["httpStatusCode"]
        : undefined;
    const name = typeof e?.["name"] === "string" ? e["name"] : "";

    if (status === 404 || name === "NotFound" || name === "NoSuchKey")
      throw new S3NotFoundError(key);
    if (status === 403 || name === "Forbidden" || name === "AccessDenied")
      throw new S3AccessDeniedError(key);

    throw err;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let _s3ServiceInstance: S3Service | null = null;

export const s3Service: S3Service = new Proxy({} as S3Service, {
  get(_target, prop) {
    if (!_s3ServiceInstance) {
      _s3ServiceInstance = new S3Service();
    }
    const value = (_s3ServiceInstance as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(_s3ServiceInstance) : value;
  },
});
