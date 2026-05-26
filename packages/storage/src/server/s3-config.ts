import type { S3ConfigSummary, S3SessionMode } from "../index.ts";

const DEFAULT_DIRECTORY = "debug/";
const DEFAULT_MAX_SIZE_BYTES = 1024 * 1024 * 1024;
const DEFAULT_MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024;
const DEFAULT_MULTIPART_PART_SIZE_BYTES = 16 * 1024 * 1024;
const DEFAULT_STS_DURATION_SECONDS = 3600;
const DEFAULT_STS_SESSION_NAME = "cloud-s3-upload";

export type S3UploadConfig = {
  bucket: string;
  regionId: string;
  uploadUrl?: string;
  directoryPrefix?: string;
  maxSizeBytes?: number;
  multipartThresholdBytes?: number;
  multipartPartSizeBytes?: number;
  stsDurationSeconds?: number;
  stsExternalId?: string;
  stsRoleArn?: string;
  stsSessionName?: string;
};

export type NormalizedS3UploadConfig = S3ConfigSummary & {
  stsDurationSeconds: number;
  stsExternalId?: string;
  stsRoleArn?: string;
  stsSessionName: string;
};

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const candidate = value ?? fallback;

  if (!Number.isFinite(candidate) || candidate <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }

  return Math.floor(candidate);
}

function normalizeMultipartPartSize(value: number | undefined): number {
  const candidate = normalizePositiveInteger(
    value,
    DEFAULT_MULTIPART_PART_SIZE_BYTES,
    "multipartPartSizeBytes",
  );

  if (candidate < 5 * 1024 * 1024) {
    throw new Error("multipartPartSizeBytes must be at least 5242880 (5 MB).");
  }

  return candidate;
}

function normalizeDurationSeconds(value: number | undefined): number {
  const candidate = normalizePositiveInteger(
    value,
    DEFAULT_STS_DURATION_SECONDS,
    "stsDurationSeconds",
  );

  if (candidate < 900) {
    throw new Error("stsDurationSeconds must be greater than or equal to 900.");
  }

  return candidate;
}

export function normalizeS3Directory(directory: string | undefined, fallback: string): string {
  const source = directory?.trim() || fallback;
  const cleaned = source
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim().replace(/[^a-zA-Z0-9._-]/g, "-"))
    .filter(Boolean)
    .join("/");

  return cleaned ? `${cleaned}/` : "";
}

function normalizeUploadUrl(raw: string): string {
  const trimmed = raw.trim();
  const withProtocol =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("uploadUrl must be a valid URL or host.");
  }

  return parsed.toString().replace(/\/+$/, "");
}

function buildUploadUrl(config: Pick<S3UploadConfig, "bucket" | "regionId" | "uploadUrl">): string {
  const explicitUploadUrl = config.uploadUrl?.trim();
  return normalizeUploadUrl(
    explicitUploadUrl || `${config.bucket}.s3.${config.regionId}.amazonaws.com`,
  );
}

function isCustomUploadHost(uploadUrl: string, bucket: string, regionId: string): boolean {
  const host = new URL(uploadUrl).host;
  return host !== `${bucket}.s3.${regionId}.amazonaws.com`;
}

function normalizeSessionName(value: string | undefined): string {
  const cleaned = (value ?? DEFAULT_STS_SESSION_NAME)
    .trim()
    .replace(/[^a-zA-Z0-9+=,.@_-]/g, "-")
    .replace(/^-+|-+$/g, "");
  const candidate = cleaned || DEFAULT_STS_SESSION_NAME;
  return candidate.slice(0, 64);
}

function toSessionMode(stsRoleArn: string | undefined): S3SessionMode {
  return stsRoleArn ? "assume-role" : "get-federation-token";
}

export function normalizeS3UploadConfig(config: S3UploadConfig): NormalizedS3UploadConfig {
  const bucket = config.bucket.trim();
  const regionId = config.regionId.trim();

  if (!bucket) {
    throw new Error("bucket is required.");
  }
  if (!regionId) {
    throw new Error("regionId is required.");
  }

  const uploadUrl = buildUploadUrl({ ...config, bucket, regionId });
  const stsExternalId = config.stsExternalId?.trim() || undefined;
  const stsRoleArn = config.stsRoleArn?.trim() || undefined;
  const maxSizeBytes = normalizePositiveInteger(
    config.maxSizeBytes,
    DEFAULT_MAX_SIZE_BYTES,
    "maxSizeBytes",
  );
  const multipartThresholdBytes = normalizePositiveInteger(
    config.multipartThresholdBytes,
    DEFAULT_MULTIPART_THRESHOLD_BYTES,
    "multipartThresholdBytes",
  );

  return {
    bucket,
    regionId,
    uploadUrl,
    usesCustomUploadHost: isCustomUploadHost(uploadUrl, bucket, regionId),
    directoryPrefix: normalizeS3Directory(config.directoryPrefix, DEFAULT_DIRECTORY),
    maxSizeBytes,
    multipartThresholdBytes,
    multipartPartSizeBytes: normalizeMultipartPartSize(config.multipartPartSizeBytes),
    sessionMode: toSessionMode(stsRoleArn),
    stsDurationSeconds: normalizeDurationSeconds(config.stsDurationSeconds),
    stsExternalId,
    stsRoleArn,
    stsSessionName: normalizeSessionName(config.stsSessionName),
  };
}
