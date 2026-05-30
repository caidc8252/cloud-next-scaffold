import { assertPermissions } from "@cloud/permissions/server";
import { successResponse } from "@cloud/request/server";
import { STORAGE_PERMISSIONS } from "@/lib/storage-permissions";
import { listStorageObjectRecords } from "@/lib/storage-object-records";
import { s3ErrorResponse } from "@/lib/s3-error-response";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(
  async () => {
    const session = await assertPermissions({ all: [STORAGE_PERMISSIONS.VIEW] });
    const records = await listStorageObjectRecords(session);

    return successResponse(records);
  },
  { onError: s3ErrorResponse },
);
