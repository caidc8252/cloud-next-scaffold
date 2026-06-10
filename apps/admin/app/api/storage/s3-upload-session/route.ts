import { assertPermissions } from "@cloud/permissions/server";
import { badRequestResponse, successResponse } from "@cloud/request/server";
import { createS3UploadSession } from "@cloud/storage/server";
import { s3ErrorResponse } from "@/lib/s3-error-response";
import { getS3UploadConfig } from "@/lib/s3-upload-config";
import { isContentHashInputPresent, normalizeContentHash } from "@/lib/storage-content-hash";
import { createPendingStorageObjectRecord } from "@/lib/storage-object-records";
import { validateStorageVisibilityInput } from "@/lib/storage-visibility";
import { STORAGE_PERMISSIONS } from "@/lib/storage-permissions";
import { withApiHandler } from "@/lib/api-handler";

type UploadSessionRequest = {
  filename?: string;
  contentType?: string;
  size?: number;
  directory?: string;
  contentHash?: string;
  visibility?: string;
};

export const POST = withApiHandler(
  async (req: Request) => {
    const authSession = await assertPermissions({ all: [STORAGE_PERMISSIONS.UPLOAD] });

    let body: UploadSessionRequest;
    try {
      body = (await req.json()) as UploadSessionRequest;
    } catch {
      return badRequestResponse("storage.invalid_json", "Invalid JSON body.");
    }

    const filename = body.filename?.trim();
    const contentType = body.contentType?.trim() || "application/octet-stream";
    const size = body.size;
    const contentHash = normalizeContentHash(body.contentHash);

    if (!filename) {
      return badRequestResponse("storage.filename_required", "filename is required.");
    }
    if (!Number.isFinite(size) || !size || size <= 0) {
      return badRequestResponse("storage.size_invalid", "size must be a positive number.");
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
      directory: body.directory,
    });
    if (!visibility.ok) {
      return badRequestResponse(visibility.code, visibility.message);
    }

    const session = await createS3UploadSession(getS3UploadConfig(), {
      filename,
      contentType,
      size,
      directory: visibility.value.directory,
    });
    await createPendingStorageObjectRecord(authSession, session, {
      originalFilename: filename,
      contentType,
      sizeBytes: size,
      contentHash: contentHash ?? undefined,
      visibility: visibility.value.visibility,
    });

    return successResponse(session);
  },
  { onError: s3ErrorResponse },
);
