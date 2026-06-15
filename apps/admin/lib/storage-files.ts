import "server-only";

import { BusinessError } from "@cloud/request";
import type { S3ObjectMetadata, S3StoredObject, S3UploadSession } from "@cloud/storage";
import {
  copyS3Object,
  createS3DownloadUrl,
  createS3UploadSession,
  deleteS3Object,
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
  filename?: string;
  expiresInSeconds?: number;
};

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

export async function createProfileUploadSession(
  input: CreateProfileUploadSessionInput,
): Promise<S3UploadSession> {
  const profile = resolveProfileOrThrow(input.uploadProfile);
  assertProfileVisibility(profile, input.contentType);

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
  const contentType = input.file.type || "application/octet-stream";
  assertProfileVisibility(profile, contentType);

  return uploadFileToS3FromServer(getS3UploadConfig(), {
    body: await input.file.arrayBuffer(),
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

export async function promoteTemporaryS3Object(
  input: PromoteTemporaryS3ObjectInput,
): Promise<S3StoredObject> {
  const profile = resolveProfileOrThrow(input.targetProfile);
  assertPromotableTargetProfile(profile);

  if (!isObjectKeyInUploadProfileDirectory(input.temporaryObject.objectKey, { directory: "tmp" })) {
    throw new BusinessError("storage.temporary_key_invalid", 400);
  }

  assertRequiredContentTypePrefix(
    input.temporaryObject.contentType,
    input.requireContentTypePrefix,
  );
  assertProfileVisibility(profile, input.temporaryObject.contentType);

  const filename =
    input.temporaryObject.objectKey.split("/").at(-1) ??
    input.temporaryObject.originalFilename ??
    "upload";
  const targetObjectKey = `${profile.directory}/${filename}`;
  const promotedObject = await copyS3Object(getS3UploadConfig(), {
    sourceObjectKey: input.temporaryObject.objectKey,
    targetObjectKey,
    contentType: input.temporaryObject.contentType,
    sizeBytes: input.temporaryObject.sizeBytes,
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
  await getS3ObjectMetadata(getS3UploadConfig(), { objectKey: input.objectKey });

  return createS3DownloadUrl(getS3UploadConfig(), {
    objectKey: input.objectKey,
    filename: input.filename,
    expiresInSeconds: input.expiresInSeconds,
  });
}
