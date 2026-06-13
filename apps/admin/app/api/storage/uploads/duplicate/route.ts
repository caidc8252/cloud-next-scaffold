import { assertPermissions } from "@cloud/permissions/server";
import { badRequestResponse, successResponse } from "@cloud/request/server";
import { s3ErrorResponse } from "@/lib/s3-error-response";
import { resolveS3UploadProfile } from "@/lib/s3-upload-profiles";
import { getPositiveIntegerSize, normalizeContentHash } from "@/lib/storage-content-hash";
import { findDuplicateStorageObjectRecord } from "@/lib/storage-object-records";
import { STORAGE_PERMISSIONS } from "@/lib/storage-permissions";
import type { DuplicateStorageObjectResponse } from "@/storage/types";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(
  async (req: Request) => {
    const session = await assertPermissions({ all: [STORAGE_PERMISSIONS.UPLOAD] });
    const searchParams = new URL(req.url).searchParams;
    const contentHash = normalizeContentHash(searchParams.get("contentHash"));
    const sizeBytes = getPositiveIntegerSize(searchParams.get("sizeBytes"));
    const profile = resolveS3UploadProfile(searchParams.get("uploadProfile") ?? undefined);

    if (!contentHash) {
      return badRequestResponse(
        "storage.content_hash_invalid",
        "contentHash must be a SHA-256 hex digest.",
      );
    }
    if (!sizeBytes) {
      return badRequestResponse("storage.size_invalid", "sizeBytes must be a positive number.");
    }
    if (!profile.ok) {
      return badRequestResponse(profile.code, profile.message);
    }

    const record = await findDuplicateStorageObjectRecord(session, {
      contentHash,
      sizeBytes,
      visibility: profile.value.visibility,
    });

    return successResponse({
      record,
    } satisfies DuplicateStorageObjectResponse);
  },
  { onError: s3ErrorResponse },
);
