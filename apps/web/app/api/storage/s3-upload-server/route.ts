import { createHash } from "node:crypto";
import { AuthzError, assertPermissions } from "@cloud/permissions/server";
import {
  badRequestResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "@cloud/request/server";
import { uploadFileToS3FromServer } from "@cloud/storage/server";
import { s3ErrorResponse } from "@/lib/s3-error-response";
import { getS3UploadConfig } from "@/lib/s3-upload-config";
import {
  findDuplicateStorageObjectRecord,
  saveStorageObjectRecord,
} from "@/lib/storage-object-records";
import { validateStorageVisibilityInput } from "@/lib/storage-visibility";
import { STORAGE_PERMISSIONS } from "@/lib/storage-permissions";
import { SERVER_S3_UPLOAD_THRESHOLD_BYTES } from "@/lib/s3-upload-policy";

const SERVER_S3_UPLOAD_TIMEOUT_MS = 20_000;

function createSha256Hex(value: ArrayBuffer): string {
  return createHash("sha256").update(Buffer.from(value)).digest("hex");
}

function getStringFormValue(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

export async function POST(req: Request) {
  try {
    const session = await assertPermissions({ all: [STORAGE_PERMISSIONS.UPLOAD] });

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return badRequestResponse("storage.invalid_form_data", "Invalid form data.");
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return badRequestResponse("storage.file_required", "file is required.");
    }
    if (file.size <= 0) {
      return badRequestResponse("storage.file_empty", "file must not be empty.");
    }
    if (file.size > SERVER_S3_UPLOAD_THRESHOLD_BYTES) {
      return badRequestResponse(
        "storage.file_too_large_for_server_upload",
        "Files larger than 5 MB must use direct S3 upload.",
      );
    }

    const contentType = file.type || "application/octet-stream";
    const visibility = validateStorageVisibilityInput({
      visibility: getStringFormValue(formData, "visibility"),
      contentType,
      directory: getStringFormValue(formData, "directory"),
    });
    if (!visibility.ok) {
      return badRequestResponse(visibility.code, visibility.message);
    }

    const body = await file.arrayBuffer();
    const contentHash = createSha256Hex(body);
    const duplicate = await findDuplicateStorageObjectRecord(session, {
      contentHash,
      sizeBytes: file.size,
      visibility: visibility.value.visibility,
    });
    if (duplicate) {
      return successResponse(duplicate);
    }

    const storedObject = await uploadFileToS3FromServer(getS3UploadConfig(), {
      body,
      filename: file.name,
      contentType,
      directory: visibility.value.directory,
      abortSignal: AbortSignal.timeout(SERVER_S3_UPLOAD_TIMEOUT_MS),
    });
    const record = await saveStorageObjectRecord(session, storedObject, {
      originalFilename: file.name,
      contentType: storedObject.contentType,
      sizeBytes: file.size,
      contentHash,
      visibility: visibility.value.visibility,
      etag: storedObject.etag,
    });

    return successResponse(record);
  } catch (error) {
    if (error instanceof AuthzError) {
      return error.status === 401
        ? unauthorizedResponse(error.code, "Unauthorized.")
        : forbiddenResponse(error.code, "Forbidden.");
    }
    return s3ErrorResponse(error);
  }
}
