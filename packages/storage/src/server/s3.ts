import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  AssumeRoleCommand,
  GetFederationTokenCommand,
  STSClient,
  type AssumeRoleCommandInput,
  type GetFederationTokenCommandInput,
} from "@aws-sdk/client-sts";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { HttpsProxyAgent } from "https-proxy-agent";
import type {
  S3ConfigSummary,
  S3StoredObject,
  S3StsCredentials,
  S3UploadSession,
} from "../index.ts";
import {
  normalizeS3Directory,
  normalizeS3UploadConfig,
  type NormalizedS3UploadConfig,
  type S3UploadConfig,
} from "./s3-config.ts";

export type { S3UploadConfig } from "./s3-config.ts";

export type CreateS3UploadSessionInput = {
  filename: string;
  contentType: string;
  size: number;
  directory?: string;
  existingObjectKey?: string;
};

export type UploadFileToS3FromServerInput = {
  body: ArrayBuffer | Uint8Array;
  filename: string;
  contentType?: string;
  directory?: string;
  existingObjectKey?: string;
  abortSignal?: AbortSignal;
};

const stsClientsByRegion = new Map<string, STSClient>();
const s3ClientsByRegion = new Map<string, S3Client>();
const requestHandlersByProxyUrl = new Map<string, NodeHttpHandler>();

function getServerProxyUrl(): string | undefined {
  return (
    process.env.AWS_SDK_PROXY_URL?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.https_proxy?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    process.env.http_proxy?.trim() ||
    undefined
  );
}

function createNodeRequestHandler(): NodeHttpHandler | undefined {
  const proxyUrl = getServerProxyUrl();
  if (!proxyUrl) return undefined;

  const cached = requestHandlersByProxyUrl.get(proxyUrl);
  if (cached) return cached;

  const handler = new NodeHttpHandler({
    httpsAgent: new HttpsProxyAgent(proxyUrl),
    connectionTimeout: 10_000,
    requestTimeout: 30_000,
  });
  requestHandlersByProxyUrl.set(proxyUrl, handler);
  return handler;
}

function withNodeRequestHandler() {
  const requestHandler = createNodeRequestHandler();
  return requestHandler ? { requestHandler } : {};
}

function sanitizeBaseName(name: string): string {
  const normalized = name
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "upload";
}

function sanitizeFilename(filename: string): { stem: string; extension: string } {
  const trimmed = filename.trim() || "upload.bin";
  const lastDot = trimmed.lastIndexOf(".");

  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return { stem: sanitizeBaseName(trimmed), extension: "" };
  }

  const stem = sanitizeBaseName(trimmed.slice(0, lastDot));
  const extension = trimmed
    .slice(lastDot + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);

  return {
    stem,
    extension: extension ? `.${extension}` : "",
  };
}

function normalizeExistingObjectKey(objectKey: string): string {
  const cleaned = objectKey
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");

  if (!cleaned) {
    throw new Error("existingObjectKey must be a non-empty string when provided.");
  }

  if (cleaned.split("/").some((segment) => segment === "." || segment === "..")) {
    throw new Error("existingObjectKey contains an invalid path segment.");
  }

  return cleaned;
}

function createObjectUrl(uploadUrl: string, objectKey: string): string {
  const url = new URL(uploadUrl);
  const encodedKey = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  url.pathname = `/${encodedKey}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function resolveObjectKey(
  directoryPrefix: string,
  input: Pick<CreateS3UploadSessionInput, "filename" | "existingObjectKey"> & {
    directory?: string;
  },
): string {
  const normalizedDirectory = normalizeS3Directory(input.directory, directoryPrefix);

  if (input.existingObjectKey) {
    return normalizeExistingObjectKey(input.existingObjectKey);
  }

  const { stem, extension } = sanitizeFilename(input.filename);
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${normalizedDirectory}${dateStamp}-${randomUUID()}-${stem}${extension}`;
}

function createScopedSessionName(prefix: string): string {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 12);
  const maxPrefixLength = Math.max(2, 64 - suffix.length - 1);
  const trimmedPrefix = prefix.slice(0, maxPrefixLength);

  return `${trimmedPrefix}-${suffix}`;
}

function createScopedPolicy(bucket: string, objectKey: string): string {
  return JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "s3:PutObject",
          "s3:AbortMultipartUpload",
          "s3:CreateMultipartUpload",
          "s3:UploadPart",
          "s3:CompleteMultipartUpload",
          "s3:ListMultipartUploadParts",
        ],
        Resource: [`arn:aws:s3:::${bucket}/${objectKey}`],
      },
    ],
  });
}

function createStsClient(regionId: string): STSClient {
  const cached = stsClientsByRegion.get(regionId);
  if (cached) return cached;

  const client = new STSClient({ region: regionId, ...withNodeRequestHandler() });
  stsClientsByRegion.set(regionId, client);
  return client;
}

function createScopedS3Client(
  config: NormalizedS3UploadConfig,
  credentials: S3StsCredentials,
): S3Client {
  return new S3Client({
    region: config.regionId,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
      expiration: new Date(credentials.expiration),
    },
    ...(config.usesCustomUploadHost
      ? {
          endpoint: config.uploadUrl,
          bucketEndpoint: true,
        }
      : {}),
    ...withNodeRequestHandler(),
  });
}

function createS3Client(config: NormalizedS3UploadConfig): S3Client {
  const cacheKey = `${config.regionId}:${config.uploadUrl}:${config.usesCustomUploadHost ? "custom" : "default"}`;
  const cached = s3ClientsByRegion.get(cacheKey);
  if (cached) return cached;

  const client = new S3Client({
    region: config.regionId,
    ...(config.usesCustomUploadHost
      ? {
          endpoint: config.uploadUrl,
          bucketEndpoint: true,
        }
      : {}),
    ...withNodeRequestHandler(),
  });
  s3ClientsByRegion.set(cacheKey, client);
  return client;
}

function normalizeExpiration(value: Date | string | undefined): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  throw new Error("STS returned an incomplete credential payload.");
}

async function mintTemporaryCredentials(
  config: NormalizedS3UploadConfig,
  objectKey: string,
): Promise<S3StsCredentials> {
  const client = createStsClient(config.regionId);
  const policy = createScopedPolicy(config.bucket, objectKey);
  const sessionName = createScopedSessionName(config.stsSessionName);

  if (config.stsRoleArn) {
    const input: AssumeRoleCommandInput = {
      RoleArn: config.stsRoleArn,
      RoleSessionName: sessionName,
      DurationSeconds: config.stsDurationSeconds,
      Policy: policy,
    };

    if (config.stsExternalId) {
      input.ExternalId = config.stsExternalId;
    }

    const response = await client.send(new AssumeRoleCommand(input));
    const credentials = response.Credentials;

    if (
      !credentials?.AccessKeyId ||
      !credentials.SecretAccessKey ||
      !credentials.SessionToken ||
      !credentials.Expiration
    ) {
      throw new Error("STS returned an incomplete credential payload.");
    }

    return {
      accessKeyId: credentials.AccessKeyId,
      secretAccessKey: credentials.SecretAccessKey,
      sessionToken: credentials.SessionToken,
      expiration: normalizeExpiration(credentials.Expiration),
    };
  }

  const input: GetFederationTokenCommandInput = {
    Name: sessionName,
    DurationSeconds: config.stsDurationSeconds,
    Policy: policy,
  };
  const response = await client.send(new GetFederationTokenCommand(input));
  const credentials = response.Credentials;

  if (
    !credentials?.AccessKeyId ||
    !credentials.SecretAccessKey ||
    !credentials.SessionToken ||
    !credentials.Expiration
  ) {
    throw new Error("STS returned an incomplete credential payload.");
  }

  return {
    accessKeyId: credentials.AccessKeyId,
    secretAccessKey: credentials.SecretAccessKey,
    sessionToken: credentials.SessionToken,
    expiration: normalizeExpiration(credentials.Expiration),
  };
}

export function getS3ConfigSummary(config: S3UploadConfig): S3ConfigSummary {
  const normalized = normalizeS3UploadConfig(config);

  return {
    bucket: normalized.bucket,
    regionId: normalized.regionId,
    uploadUrl: normalized.uploadUrl,
    usesCustomUploadHost: normalized.usesCustomUploadHost,
    directoryPrefix: normalized.directoryPrefix,
    maxSizeBytes: normalized.maxSizeBytes,
    multipartThresholdBytes: normalized.multipartThresholdBytes,
    multipartPartSizeBytes: normalized.multipartPartSizeBytes,
    sessionMode: normalized.sessionMode,
  };
}

export async function createS3UploadSession(
  config: S3UploadConfig,
  input: CreateS3UploadSessionInput,
): Promise<S3UploadSession> {
  const normalized = normalizeS3UploadConfig(config);

  if (!input.filename.trim()) {
    throw new Error("filename is required.");
  }
  if (!Number.isFinite(input.size) || input.size <= 0) {
    throw new Error("size must be a positive number.");
  }
  if (input.size > normalized.maxSizeBytes) {
    throw new Error(
      `File is too large for the current guardrail (${input.size} > ${normalized.maxSizeBytes}).`,
    );
  }
  if (normalized.multipartThresholdBytes > normalized.maxSizeBytes) {
    throw new Error("multipartThresholdBytes cannot be greater than maxSizeBytes.");
  }

  const objectKey = resolveObjectKey(normalized.directoryPrefix, input);
  const credentials = await mintTemporaryCredentials(normalized, objectKey);

  return {
    ...getS3ConfigSummary(normalized),
    objectKey,
    objectUrl: createObjectUrl(normalized.uploadUrl, objectKey),
    credentials,
  };
}

export async function uploadFileToS3FromServer(
  config: S3UploadConfig,
  input: UploadFileToS3FromServerInput,
): Promise<S3StoredObject> {
  const normalized = normalizeS3UploadConfig(config);
  const contentType = input.contentType?.trim() || "application/octet-stream";
  const byteLength =
    input.body instanceof Uint8Array ? input.body.byteLength : input.body.byteLength;

  if (!input.filename.trim()) {
    throw new Error("filename is required.");
  }
  if (byteLength <= 0) {
    throw new Error("body must not be empty.");
  }
  if (byteLength > normalized.maxSizeBytes) {
    throw new Error(
      `File is too large for the current guardrail (${byteLength} > ${normalized.maxSizeBytes}).`,
    );
  }

  const objectKey = resolveObjectKey(normalized.directoryPrefix, input);
  const scopedCredentials = normalized.stsRoleArn
    ? await mintTemporaryCredentials(normalized, objectKey)
    : undefined;
  const client = scopedCredentials
    ? createScopedS3Client(normalized, scopedCredentials)
    : createS3Client(normalized);
  const body = input.body instanceof Uint8Array ? input.body : new Uint8Array(input.body);
  const response = await client.send(
    new PutObjectCommand({
      Bucket: normalized.bucket,
      Key: objectKey,
      Body: body,
      ContentType: contentType,
    }),
    { abortSignal: input.abortSignal },
  );

  return {
    bucket: normalized.bucket,
    regionId: normalized.regionId,
    uploadUrl: normalized.uploadUrl,
    objectKey,
    objectUrl: createObjectUrl(normalized.uploadUrl, objectKey),
    contentType,
    etag: response.ETag,
  };
}
