import { AuthzError, assertPermissions } from "@cloud/permissions/server";
import {
  badRequestResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "@cloud/request/server";
import { s3ErrorResponse } from "@/lib/s3-error-response";
import {
  getPositiveIntegerSize,
  normalizeContentHash,
} from "@/lib/storage-content-hash";
import { findDuplicateStorageObjectRecord } from "@/lib/storage-object-records";
import { normalizeStorageVisibility } from "@/lib/storage-visibility";
import { STORAGE_PERMISSIONS } from "@/lib/storage-permissions";
import type { DuplicateStorageObjectResponse } from "@/storage/types";

export async function GET(req: Request) {
  try {
    const session = await assertPermissions({ all: [STORAGE_PERMISSIONS.UPLOAD] });
    const searchParams = new URL(req.url).searchParams;
    const contentHash = normalizeContentHash(searchParams.get("contentHash"));
    const sizeBytes = getPositiveIntegerSize(searchParams.get("sizeBytes"));
    const visibility = normalizeStorageVisibility(searchParams.get("visibility"));

    if (!contentHash) {
      return badRequestResponse(
        "storage.content_hash_invalid",
        "contentHash must be a SHA-256 hex digest.",
      );
    }
    if (!sizeBytes) {
      return badRequestResponse("storage.size_invalid", "sizeBytes must be a positive number.");
    }

    const record = await findDuplicateStorageObjectRecord(session, {
      contentHash,
      sizeBytes,
      visibility,
    });

    return successResponse({
      record,
    } satisfies DuplicateStorageObjectResponse);
  } catch (error) {
    if (error instanceof AuthzError) {
      return error.status === 401
        ? unauthorizedResponse(error.code, "Unauthorized.")
        : forbiddenResponse(error.code, "Forbidden.");
    }
    return s3ErrorResponse(error);
  }
}
