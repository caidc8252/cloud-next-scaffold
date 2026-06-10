import { assertPermissions } from "@cloud/permissions/server";
import { badRequestResponse, notFoundResponse, successResponse } from "@cloud/request/server";
import { bindStorageAttachment, listStorageAttachments } from "@/lib/storage-attachments";
import { normalizeStorageAttachmentInput } from "@/lib/storage-attachment-input";
import { s3ErrorResponse } from "@/lib/s3-error-response";
import { STORAGE_PERMISSIONS } from "@/lib/storage-permissions";
import type { BindStorageAttachmentRequest } from "@/storage/types";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(
  async (req: Request) => {
    const session = await assertPermissions({ all: [STORAGE_PERMISSIONS.VIEW] });
    const searchParams = new URL(req.url).searchParams;
    const subjectType = searchParams.get("subjectType") ?? undefined;
    const subjectId = searchParams.get("subjectId") ?? undefined;
    const purpose = searchParams.get("purpose") ?? undefined;

    if (!subjectType || !subjectId) {
      return badRequestResponse(
        "storage.attachment_subject_required",
        "subjectType and subjectId are required.",
      );
    }

    const records = await listStorageAttachments(session, {
      subjectType,
      subjectId,
      purpose,
    });

    return successResponse(records);
  },
  { onError: s3ErrorResponse },
);

export const POST = withApiHandler(
  async (req: Request) => {
    const session = await assertPermissions({ all: [STORAGE_PERMISSIONS.UPLOAD] });

    let body: BindStorageAttachmentRequest;
    try {
      body = (await req.json()) as BindStorageAttachmentRequest;
    } catch {
      return badRequestResponse("storage.invalid_json", "Invalid JSON body.");
    }

    const normalized = normalizeStorageAttachmentInput(body);
    if (!normalized.ok) {
      return badRequestResponse(normalized.code, normalized.message);
    }

    const result = await bindStorageAttachment(session, normalized.value);
    if (!result.ok) {
      return notFoundResponse(result.code, result.message);
    }

    return successResponse(result.value);
  },
  { onError: s3ErrorResponse },
);
