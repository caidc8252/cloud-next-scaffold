import "server-only";

import {
  badRequestResponse,
  errorResponse,
  forbiddenResponse,
  internalErrorResponse,
  unauthorizedResponse,
} from "@cloud/request/server";

type AwsLikeError = Error & {
  name?: string;
  Code?: string;
  code?: string;
  $metadata?: {
    httpStatusCode?: number;
    requestId?: string;
  };
};

function toAwsLikeError(error: unknown): AwsLikeError | null {
  if (!(error instanceof Error)) return null;
  return error as AwsLikeError;
}

function getAwsErrorCode(error: AwsLikeError): string {
  return error.name || error.Code || error.code || "UnknownAwsError";
}

export function s3ErrorResponse(error: unknown): Response {
  const awsError = toAwsLikeError(error);
  const message = awsError?.message ?? "";
  const code = awsError ? getAwsErrorCode(awsError) : "";

  if (message.startsWith("Missing required S3 environment variable:")) {
    return badRequestResponse("storage.s3_env_missing", message);
  }
  if (message.endsWith("must be a positive number.")) {
    return badRequestResponse("storage.s3_env_invalid", message);
  }

  if (
    code === "TimeoutError" ||
    code === "AbortError" ||
    message.includes("abort") ||
    message.includes("timed out") ||
    message.includes("timeout")
  ) {
    return errorResponse(
      "storage.s3_upload_timeout",
      "S3 upload timed out. Check the configured bucket region, endpoint, and network access.",
      504,
    );
  }

  if (
    code === "CredentialsProviderError" ||
    code === "InvalidAccessKeyId" ||
    code === "SignatureDoesNotMatch" ||
    code === "ExpiredToken" ||
    message.includes("Could not load credentials") ||
    message.includes("Resolved credential object is not valid")
  ) {
    return unauthorizedResponse(
      "storage.aws_credentials_invalid",
      "AWS credentials are missing, expired, or invalid.",
    );
  }

  if (code === "AccessDenied" || awsError?.$metadata?.httpStatusCode === 403) {
    return forbiddenResponse(
      "storage.s3_access_denied",
      "AWS credentials do not have permission to access the configured S3 object.",
    );
  }

  if (
    code === "NoSuchBucket" ||
    code === "PermanentRedirect" ||
    code === "IllegalLocationConstraintException"
  ) {
    return badRequestResponse(
      "storage.s3_bucket_invalid",
      "The configured S3 bucket or region is invalid.",
    );
  }

  if (
    code === "EndpointError" ||
    message.includes("getaddrinfo") ||
    message.includes("ENOTFOUND") ||
    message.includes("ETIMEDOUT") ||
    message.includes("ECONNRESET")
  ) {
    return errorResponse(
      "storage.s3_endpoint_unreachable",
      "The configured S3 endpoint is unreachable.",
      502,
    );
  }

  return internalErrorResponse(error);
}
