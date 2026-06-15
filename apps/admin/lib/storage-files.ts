import "server-only";

import { randomUUID } from "node:crypto";
import { BusinessError } from "@cloud/request";
import type { S3ObjectMetadata, S3StoredObject, S3UploadSession } from "@cloud/storage";
import {
  copyS3Object,
  createS3DownloadUrl,
  createS3UploadSession,
  deleteS3Object,
  getS3ObjectBytes,
  getS3ObjectMetadata,
  uploadFileToS3FromServer,
} from "@cloud/storage/server";
import { getS3UploadConfig } from "./s3-upload-config";
import {
  S3_UPLOAD_PROFILES,
  type S3UploadProfile,
  type S3UploadProfileConfig,
  isObjectKeyInUploadProfileDirectory,
  resolveS3UploadProfile,
} from "./s3-upload-profiles";
import { validateStorageVisibilityInput } from "./storage-visibility";

export type CreateProfileUploadSessionInput = {
  filename: string;
  contentType: string;
  size: number;
  uploadProfile: S3UploadProfile;
  existingObjectKey?: string;
};

export type UploadFileToS3ProfileInput = {
  file: File;
  uploadProfile: S3UploadProfile;
  existingObjectKey?: string;
  abortSignal?: AbortSignal;
};

export type PromoteTemporaryS3ObjectInput = {
  temporaryObject: Pick<S3StoredObject, "objectKey" | "contentType" | "sizeBytes"> & {
    originalFilename?: string;
  };
  targetProfile: S3UploadProfile;
  requireContentTypePrefix?: string;
  abortSignal?: AbortSignal;
};

export type CreatePrivateS3DownloadUrlInput = {
  objectKey: string;
  uploadProfile: S3UploadProfile;
  filename?: string;
  expiresInSeconds?: number;
};

export type GetVerifiedS3FileMetadataInput = {
  objectKey: string;
  uploadProfile: S3UploadProfile;
  abortSignal?: AbortSignal;
};

const PUBLIC_IMAGE_SIGNATURE_RANGE = "bytes=0-31";

function assertPromotableTargetProfile(profile: S3UploadProfileConfig): void {
  if (profile.profile === S3_UPLOAD_PROFILES.TEMPORARY) {
    throw new BusinessError("storage.temporary_target_invalid", 400);
  }
}

function assertRequiredContentTypePrefix(
  contentType: string,
  requiredPrefix: string | undefined,
): void {
  if (!requiredPrefix) return;

  if (!contentType.toLowerCase().startsWith(requiredPrefix.toLowerCase())) {
    throw new BusinessError("storage.content_type_invalid", 400);
  }
}

function resolveProfileOrThrow(uploadProfile: S3UploadProfile): S3UploadProfileConfig {
  const profile = resolveS3UploadProfile(uploadProfile);
  if (!profile.ok) {
    throw new BusinessError(profile.code, 400);
  }

  return profile.value;
}

function assertProfileVisibility(profile: S3UploadProfileConfig, contentType: string): void {
  const visibility = validateStorageVisibilityInput({
    visibility: profile.visibility,
    contentType,
    directory: profile.directory,
  });

  if (!visibility.ok) {
    throw new BusinessError(visibility.code, 400);
  }
}

function assertExistingObjectKeyInProfile(
  existingObjectKey: string | undefined,
  profile: S3UploadProfileConfig,
): void {
  if (!existingObjectKey) return;

  if (!isObjectKeyInUploadProfileDirectory(existingObjectKey, profile)) {
    throw new BusinessError("storage.object_key_profile_mismatch", 400);
  }
}

function assertPrivateDownloadProfile(profile: S3UploadProfileConfig): void {
  if (profile.profile === S3_UPLOAD_PROFILES.TEMPORARY || profile.visibility !== "PRIVATE") {
    throw new BusinessError("storage.private_download_profile_invalid", 400);
  }
}

function sanitizeObjectKeySegment(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\x00-\x7F]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "upload"
  );
}

function createPromotedObjectKey(
  profile: S3UploadProfileConfig,
  temporaryObject: PromoteTemporaryS3ObjectInput["temporaryObject"],
): string {
  const fallbackName = temporaryObject.objectKey.split("/").at(-1) ?? "upload";
  const originalName = temporaryObject.originalFilename?.trim() || fallbackName;
  const lastDot = originalName.lastIndexOf(".");
  const hasExtension = lastDot > 0 && lastDot < originalName.length - 1;
  const stem = sanitizeObjectKeySegment(
    hasExtension ? originalName.slice(0, lastDot) : originalName,
  );
  const extension = hasExtension
    ? `.${originalName
        .slice(lastDot + 1)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 16)}`
    : "";
  const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  return `${profile.directory}/${dateStamp}-${randomUUID()}-${stem}${extension}`;
}

function bytesStartWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function bytesEqualAscii(bytes: Uint8Array, offset: number, value: string): boolean {
  return [...value].every((char, index) => bytes[offset + index] === char.charCodeAt(0));
}

function detectImageContentType(bytes: Uint8Array): string | undefined {
  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  if (bytesEqualAscii(bytes, 0, "GIF87a") || bytesEqualAscii(bytes, 0, "GIF89a")) {
    return "image/gif";
  }
  if (bytesEqualAscii(bytes, 0, "RIFF") && bytesEqualAscii(bytes, 8, "WEBP")) {
    return "image/webp";
  }
  if (
    bytesEqualAscii(bytes, 4, "ftyp") &&
    (bytesEqualAscii(bytes, 8, "avif") || bytesEqualAscii(bytes, 8, "avis"))
  ) {
    return "image/avif";
  }

  return undefined;
}

function resolveUploadContentType(
  profile: S3UploadProfileConfig,
  declaredContentType: string,
  bytes: Uint8Array,
): string {
  if (profile.visibility !== "PUBLIC") {
    assertProfileVisibility(profile, declaredContentType);
    return declaredContentType;
  }

  const detectedContentType = detectImageContentType(bytes);
  if (!detectedContentType) {
    throw new BusinessError("storage.public_image_signature_invalid", 400);
  }
  assertProfileVisibility(profile, detectedContentType);
  return detectedContentType;
}

async function resolveStoredObjectContentType(
  profile: S3UploadProfileConfig,
  objectKey: string,
  declaredContentType: string,
  abortSignal?: AbortSignal,
): Promise<string> {
  if (profile.visibility !== "PUBLIC") {
    assertProfileVisibility(profile, declaredContentType);
    return declaredContentType;
  }

  const bytes = await getS3ObjectBytes(getS3UploadConfig(), {
    objectKey,
    range: PUBLIC_IMAGE_SIGNATURE_RANGE,
    abortSignal,
  });
  const detectedContentType = detectImageContentType(bytes);
  if (!detectedContentType) {
    throw new BusinessError("storage.public_image_signature_invalid", 400);
  }
  assertProfileVisibility(profile, detectedContentType);
  return detectedContentType;
}

export async function createProfileUploadSession(
  input: CreateProfileUploadSessionInput,
): Promise<S3UploadSession> {
  const profile = resolveProfileOrThrow(input.uploadProfile);
  assertProfileVisibility(profile, input.contentType);
  assertExistingObjectKeyInProfile(input.existingObjectKey, profile);

  return createS3UploadSession(getS3UploadConfig(), {
    filename: input.filename,
    contentType: input.contentType,
    size: input.size,
    directory: profile.directory,
    existingObjectKey: input.existingObjectKey,
  });
}

export async function uploadFileToS3Profile(
  input: UploadFileToS3ProfileInput,
): Promise<S3StoredObject> {
  const profile = resolveProfileOrThrow(input.uploadProfile);
  const body = new Uint8Array(await input.file.arrayBuffer());
  const contentType = resolveUploadContentType(
    profile,
    input.file.type || "application/octet-stream",
    body,
  );
  assertExistingObjectKeyInProfile(input.existingObjectKey, profile);

  return uploadFileToS3FromServer(getS3UploadConfig(), {
    body,
    filename: input.file.name,
    contentType,
    directory: profile.directory,
    existingObjectKey: input.existingObjectKey,
    abortSignal: input.abortSignal,
  });
}

export async function getS3FileMetadata(objectKey: string): Promise<S3ObjectMetadata> {
  return getS3ObjectMetadata(getS3UploadConfig(), { objectKey });
}

export async function getVerifiedS3FileMetadata(
  input: GetVerifiedS3FileMetadataInput,
): Promise<S3ObjectMetadata> {
  const profile = resolveProfileOrThrow(input.uploadProfile);
  if (!isObjectKeyInUploadProfileDirectory(input.objectKey, profile)) {
    throw new BusinessError("storage.object_key_profile_mismatch", 400);
  }

  const metadata = await getS3ObjectMetadata(getS3UploadConfig(), {
    objectKey: input.objectKey,
    abortSignal: input.abortSignal,
  });
  const contentType = await resolveStoredObjectContentType(
    profile,
    input.objectKey,
    metadata.contentType,
    input.abortSignal,
  );

  return {
    ...metadata,
    contentType,
  };
}

export async function promoteTemporaryS3Object(
  input: PromoteTemporaryS3ObjectInput,
): Promise<S3StoredObject> {
  const profile = resolveProfileOrThrow(input.targetProfile);
  assertPromotableTargetProfile(profile);

  if (!isObjectKeyInUploadProfileDirectory(input.temporaryObject.objectKey, { directory: "tmp" })) {
    throw new BusinessError("storage.temporary_key_invalid", 400);
  }

  const contentType = await resolveStoredObjectContentType(
    profile,
    input.temporaryObject.objectKey,
    input.temporaryObject.contentType,
    input.abortSignal,
  );
  assertRequiredContentTypePrefix(contentType, input.requireContentTypePrefix);

  const targetObjectKey = createPromotedObjectKey(profile, input.temporaryObject);
  await copyS3Object(getS3UploadConfig(), {
    sourceObjectKey: input.temporaryObject.objectKey,
    targetObjectKey,
    contentType,
    sizeBytes: input.temporaryObject.sizeBytes,
    abortSignal: input.abortSignal,
  });
  const promotedObject = await getS3ObjectMetadata(getS3UploadConfig(), {
    objectKey: targetObjectKey,
    abortSignal: input.abortSignal,
  });

  await deleteS3Object(getS3UploadConfig(), {
    objectKey: input.temporaryObject.objectKey,
    abortSignal: input.abortSignal,
  });

  return promotedObject;
}

export async function createPrivateS3DownloadUrl(
  input: CreatePrivateS3DownloadUrlInput,
): Promise<string> {
  const profile = resolveProfileOrThrow(input.uploadProfile);
  assertPrivateDownloadProfile(profile);
  if (!isObjectKeyInUploadProfileDirectory(input.objectKey, profile)) {
    throw new BusinessError("storage.object_key_profile_mismatch", 400);
  }

  await getS3ObjectMetadata(getS3UploadConfig(), { objectKey: input.objectKey });

  return createS3DownloadUrl(getS3UploadConfig(), {
    objectKey: input.objectKey,
    filename: input.filename,
    expiresInSeconds: input.expiresInSeconds,
  });
}
