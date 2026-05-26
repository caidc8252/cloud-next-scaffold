import "server-only";

import type { S3UploadConfig } from "@cloud/storage/server";

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required S3 environment variable: ${name}.`);
  }
  return value;
}

function readOptionalEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function readOptionalIntegerEnv(name: string): number | undefined {
  const value = readOptionalEnv(name);
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return Math.floor(parsed);
}

export function getS3UploadConfig(): S3UploadConfig {
  return {
    bucket: readRequiredEnv("AWS_S3_BUCKET"),
    regionId: readRequiredEnv("AWS_REGION"),
    directoryPrefix: readRequiredEnv("AWS_S3_UPLOAD_DIRECTORY_PREFIX"),
    uploadUrl: readOptionalEnv("AWS_S3_UPLOAD_URL"),
    maxSizeBytes: readOptionalIntegerEnv("AWS_S3_MAX_SIZE_BYTES"),
    multipartThresholdBytes: readOptionalIntegerEnv("AWS_S3_MULTIPART_THRESHOLD_BYTES"),
    multipartPartSizeBytes: readOptionalIntegerEnv("AWS_S3_MULTIPART_PART_SIZE_BYTES"),
    stsDurationSeconds: readOptionalIntegerEnv("AWS_S3_STS_DURATION_SECONDS"),
    stsExternalId: readOptionalEnv("AWS_S3_UPLOAD_EXTERNAL_ID"),
    stsRoleArn: readOptionalEnv("AWS_S3_UPLOAD_ROLE_ARN"),
    stsSessionName: readOptionalEnv("AWS_S3_STS_SESSION_NAME"),
  };
}
