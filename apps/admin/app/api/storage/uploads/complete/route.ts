import { assertPermissions } from "@cloud/permissions/server";
import { badRequestResponse, successResponse } from "@cloud/request/server";
import { createS3StoredObjectReference, getS3ObjectMetadata } from "@cloud/storage/server";
import { s3ErrorResponse } from "@/lib/s3-error-response";
import { getS3UploadConfig } from "@/lib/s3-upload-config";
import { isContentHashInputPresent, normalizeContentHash } from "@/lib/storage-content-hash";
import { STORAGE_PERMISSIONS } from "@/lib/storage-permissions";
import {
  findDuplicateStorageObjectRecord,
  saveStorageObjectRecord,
} from "@/lib/storage-object-records";
import { validateStorageVisibilityInput } from "@/lib/storage-visibility";
import type { CompleteS3UploadRequest } from "@/storage/types";
import { withApiHandler } from "@/lib/api-handler";

const COMPLETE_UPLOAD_TIMEOUT_MS = 10_000;

type AwsLikeError = Error & {
  name?: string;
  Code?: string;
  code?: string;
  $metadata?: {
    httpStatusCode?: number;
  };
};

function getPositiveSize(value: number | undefined): number | null {
  if (!Number.isFinite(value) || value === undefined || value <= 0) return null;
  return Math.floor(value);
}

function isS3ReadForbidden(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const awsError = error as AwsLikeError;
  const code = awsError.name || awsError.Code || awsError.code;
  return code === "AccessDenied" || awsError.$metadata?.httpStatusCode === 403;
}

export const POST = withApiHandler(
  async (req: Request) => {
    const session = await assertPermissions({ all: [STORAGE_PERMISSIONS.UPLOAD] });

    let body: CompleteS3UploadRequest;
    try {
      body = (await req.json()) as CompleteS3UploadRequest;
    } catch {
      return badRequestResponse("storage.invalid_json", "Invalid JSON body.");
    }

    const objectKey = body.objectKey?.trim();
    const originalFilename = body.originalFilename?.trim();
    const contentType = body.contentType?.trim() || "application/octet-stream";
    const sizeBytes = getPositiveSize(body.sizeBytes);
    const contentHash = normalizeContentHash(body.contentHash);

    if (!objectKey) {
      return badRequestResponse("storage.object_key_required", "objectKey is required.");
    }
    if (!originalFilename) {
      return badRequestResponse("storage.filename_required", "originalFilename is required.");
    }
    if (!sizeBytes) {
      return badRequestResponse("storage.size_invalid", "sizeBytes must be a positive number.");
    }
    if (!contentHash && isContentHashInputPresent(body.contentHash)) {
      return badRequestResponse(
        "storage.content_hash_invalid",
        "contentHash must be a SHA-256 hex digest.",
      );
    }
    const visibility = validateStorageVisibilityInput({
      visibility: body.visibility,
      contentType,
      directory: objectKey.split("/").slice(0, -1).join("/"),
    });
    if (!visibility.ok) {
      return badRequestResponse(visibility.code, visibility.message);
    }

    const s3Config = getS3UploadConfig();
    let metadata = createS3StoredObjectReference(s3Config, {
      objectKey,
      contentType,
      sizeBytes,
      etag: body.etag,
    });

    try {
      metadata = await getS3ObjectMetadata(s3Config, {
        objectKey,
        abortSignal: AbortSignal.timeout(COMPLETE_UPLOAD_TIMEOUT_MS),
      });
    } catch (error) {
      if (!isS3ReadForbidden(error)) {
        throw error;
      }
    }

    if (metadata.sizeBytes !== undefined && metadata.sizeBytes !== sizeBytes) {
      return badRequestResponse(
        "storage.size_mismatch",
        "Uploaded object size does not match the completed upload request.",
      );
    }

    if (contentHash) {
      const duplicate = await findDuplicateStorageObjectRecord(session, {
        contentHash,
        sizeBytes,
        visibility: visibility.value.visibility,
      });
      if (duplicate && duplicate.objectKey !== objectKey) {
        return successResponse(duplicate);
      }
    }

    const record = await saveStorageObjectRecord(session, metadata, {
      originalFilename,
      contentType: metadata.contentType || contentType,
      sizeBytes,
      contentHash: contentHash ?? undefined,
      visibility: visibility.value.visibility,
      etag: body.etag || metadata.etag,
    });

    return successResponse(record);
  },
  { onError: s3ErrorResponse },
);
