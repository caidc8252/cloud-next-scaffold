import { AuthzError, assertPermissions } from "@cloud/permissions/server";
import {
  forbiddenResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
} from "@cloud/request/server";
import { createS3DownloadUrl, getS3ObjectMetadata } from "@cloud/storage/server";
import { s3ErrorResponse } from "@/lib/s3-error-response";
import { getS3UploadConfig } from "@/lib/s3-upload-config";
import { STORAGE_PERMISSIONS } from "@/lib/storage-permissions";
import { findStorageObjectForDownload } from "@/lib/storage-object-records";
import type { S3DownloadUrlResponse } from "@/storage/types";

const DOWNLOAD_URL_EXPIRES_IN_SECONDS = 300;
const DOWNLOAD_PERMISSION_CHECK_TIMEOUT_MS = 10_000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ storageObjectId: string }> },
) {
  try {
    const session = await assertPermissions({ all: [STORAGE_PERMISSIONS.DOWNLOAD] });
    const { storageObjectId } = await params;
    const record = await findStorageObjectForDownload(session, storageObjectId);

    if (!record) {
      return notFoundResponse("storage.object_not_found", "Uploaded object not found.");
    }

    const s3Config = getS3UploadConfig();
    await getS3ObjectMetadata(s3Config, {
      objectKey: record.objectKey,
      abortSignal: AbortSignal.timeout(DOWNLOAD_PERMISSION_CHECK_TIMEOUT_MS),
    });

    const url = await createS3DownloadUrl(s3Config, {
      objectKey: record.objectKey,
      filename: record.originalFilename,
      expiresInSeconds: DOWNLOAD_URL_EXPIRES_IN_SECONDS,
    });

    return successResponse({
      url,
      expiresInSeconds: DOWNLOAD_URL_EXPIRES_IN_SECONDS,
    } satisfies S3DownloadUrlResponse);
  } catch (error) {
    if (error instanceof AuthzError) {
      return error.status === 401
        ? unauthorizedResponse(error.code, "Unauthorized.")
        : forbiddenResponse(error.code, "Forbidden.");
    }
    return s3ErrorResponse(error);
  }
}
