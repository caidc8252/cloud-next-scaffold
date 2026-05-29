import { AuthzError, assertPermissions } from "@cloud/permissions/server";
import {
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "@cloud/request/server";
import { STORAGE_PERMISSIONS } from "@/lib/storage-permissions";
import { listStorageObjectRecords } from "@/lib/storage-object-records";
import { s3ErrorResponse } from "@/lib/s3-error-response";

export async function GET() {
  try {
    const session = await assertPermissions({ all: [STORAGE_PERMISSIONS.VIEW] });
    const records = await listStorageObjectRecords(session);

    return successResponse(records);
  } catch (error) {
    if (error instanceof AuthzError) {
      return error.status === 401
        ? unauthorizedResponse(error.code, "Unauthorized.")
        : forbiddenResponse(error.code, "Forbidden.");
    }
    return s3ErrorResponse(error);
  }
}
