import { AuthzError, assertPermissions } from "@cloud/permissions/server";
import {
  badRequestResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "@cloud/request/server";
import { createS3UploadSession } from "@cloud/storage/server";
import { s3ErrorResponse } from "../../../../lib/s3-error-response";
import { getS3UploadConfig } from "../../../../lib/s3-upload-config";

type UploadSessionRequest = {
  filename?: string;
  contentType?: string;
  size?: number;
  directory?: string;
};

export async function POST(req: Request) {
  try {
    await assertPermissions({});

    let body: UploadSessionRequest;
    try {
      body = (await req.json()) as UploadSessionRequest;
    } catch {
      return badRequestResponse("storage.invalid_json", "Invalid JSON body.");
    }

    const filename = body.filename?.trim();
    const contentType = body.contentType?.trim() || "application/octet-stream";
    const size = body.size;

    if (!filename) {
      return badRequestResponse("storage.filename_required", "filename is required.");
    }
    if (!Number.isFinite(size) || !size || size <= 0) {
      return badRequestResponse("storage.size_invalid", "size must be a positive number.");
    }

    const session = await createS3UploadSession(getS3UploadConfig(), {
      filename,
      contentType,
      size,
      directory: body.directory,
    });

    return successResponse(session);
  } catch (error) {
    if (error instanceof AuthzError) {
      return error.status === 401
        ? unauthorizedResponse(error.code, "Unauthorized.")
        : forbiddenResponse(error.code, "Forbidden.");
    }
    return s3ErrorResponse(error);
  }
}
