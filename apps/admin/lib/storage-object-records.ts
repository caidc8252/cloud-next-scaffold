import "server-only";

import { prisma } from "@cloud/db";
import { BusinessError } from "@cloud/request";
import type { S3ObjectMetadata, S3StoredObject, S3UploadSession } from "@cloud/storage";
import { copyS3Object, deleteS3Object, uploadFileToS3FromServer } from "@cloud/storage/server";
import type { ActiveSession } from "@cloud/permissions/server";
import type { StorageObjectRecord, StorageVisibility } from "./storage-types";
import { getS3UploadConfig } from "./s3-upload-config";
import {
  S3_UPLOAD_PROFILES,
  type S3UploadProfile,
  type S3UploadProfileConfig,
  isObjectKeyInUploadProfileDirectory,
  resolveS3UploadProfile,
} from "./s3-upload-profiles";
import { STORAGE_VISIBILITY } from "./storage-visibility";

const ACTIVE_STATUS = "ACTIVE";
const PENDING_STATUS = "PENDING";
const TEMPORARY_STATUS = "TEMPORARY";

type StorageObjectRow = {
  storageObjectId: string;
  bucket: string;
  regionId: string;
  objectKey: string;
  objectUrl: string;
  visibility: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: bigint | number;
  contentHash: string | null;
  etag: string | null;
  status: string;
  creTime: Date;
  uploader?: {
    nickName: string | null;
  };
};

type StorageObjectLike = S3StoredObject | S3ObjectMetadata | S3UploadSession;

export type UploadTemporaryStorageObjectInput = {
  file: File;
  contentHash?: string;
};

export type PromoteTemporaryStorageObjectInput = {
  storageObjectId: string;
  targetProfile: S3UploadProfile;
  requireContentTypePrefix?: string;
};

function toNumberSize(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value;
}

function toUploaderName(row: StorageObjectRow): string {
  return row.uploader?.nickName || "Unknown";
}

export function toStorageObjectRecord(row: StorageObjectRow): StorageObjectRecord {
  return {
    id: row.storageObjectId,
    bucket: row.bucket,
    regionId: row.regionId,
    objectKey: row.objectKey,
    objectUrl: row.objectUrl,
    accessUrl: row.visibility === STORAGE_VISIBILITY.PUBLIC ? row.objectUrl : null,
    originalFilename: row.originalFilename,
    contentType: row.contentType,
    sizeBytes: toNumberSize(row.sizeBytes),
    contentHash: row.contentHash,
    visibility:
      row.visibility === STORAGE_VISIBILITY.PUBLIC
        ? STORAGE_VISIBILITY.PUBLIC
        : STORAGE_VISIBILITY.PRIVATE,
    etag: row.etag,
    status: row.status,
    uploadedAt: row.creTime.toISOString(),
    uploadedBy: toUploaderName(row),
  };
}

export async function listStorageObjectRecords(session: ActiveSession) {
  const rows = await prisma.storageObject.findMany({
    where: {
      partyId: session.currentPartyId,
      status: ACTIVE_STATUS,
    },
    orderBy: { creTime: "desc" },
    take: 100,
    include: {
      uploader: {
        select: {
          nickName: true,
        },
      },
    },
  });

  return rows.map(toStorageObjectRecord);
}

async function upsertStorageObjectRecord(
  session: ActiveSession,
  storedObject: StorageObjectLike,
  input: {
    originalFilename: string;
    sizeBytes: number;
    contentType?: string;
    contentHash?: string;
    visibility: StorageVisibility;
    etag?: string;
    status: string;
  },
) {
  const existing = await prisma.storageObject.findFirst({
    where: {
      partyId: session.currentPartyId,
      bucket: storedObject.bucket,
      objectKey: storedObject.objectKey,
    },
  });

  const data = {
    uploaderUserId: session.userId,
    regionId: storedObject.regionId,
    objectUrl: storedObject.objectUrl,
    originalFilename: input.originalFilename,
    contentType:
      input.contentType ??
      ("contentType" in storedObject ? storedObject.contentType : "application/octet-stream"),
    sizeBytes: BigInt(input.sizeBytes),
    contentHash: input.contentHash ?? existing?.contentHash ?? null,
    visibility: input.visibility,
    etag: input.etag ?? ("etag" in storedObject ? storedObject.etag : null) ?? null,
    status: input.status,
    updUserId: session.userId,
    deletedAt: input.status === ACTIVE_STATUS ? null : existing?.deletedAt,
  };

  const row = existing
    ? await prisma.storageObject.update({
        where: { storageObjectId: existing.storageObjectId },
        data,
        include: {
          uploader: {
            select: {
              nickName: true,
            },
          },
        },
      })
    : await prisma.storageObject.create({
        data: {
          ...data,
          partyId: session.currentPartyId,
          bucket: storedObject.bucket,
          objectKey: storedObject.objectKey,
          creUserId: session.userId,
        },
        include: {
          uploader: {
            select: {
              nickName: true,
            },
          },
        },
      });

  return toStorageObjectRecord(row);
}

export async function createPendingStorageObjectRecord(
  session: ActiveSession,
  storedObject: StorageObjectLike,
  input: {
    originalFilename: string;
    sizeBytes: number;
    contentType?: string;
    contentHash?: string;
    visibility: StorageVisibility;
  },
) {
  return upsertStorageObjectRecord(session, storedObject, {
    ...input,
    status: PENDING_STATUS,
  });
}

export async function uploadTemporaryStorageObject(
  session: ActiveSession,
  input: UploadTemporaryStorageObjectInput,
) {
  const profile = resolveS3UploadProfile(S3_UPLOAD_PROFILES.TEMPORARY);
  if (!profile.ok) {
    throw new BusinessError(profile.code, 400);
  }

  const storedObject = await uploadFileToS3FromServer(getS3UploadConfig(), {
    body: await input.file.arrayBuffer(),
    filename: input.file.name,
    contentType: input.file.type,
    directory: profile.value.directory,
  });

  return upsertStorageObjectRecord(session, storedObject, {
    originalFilename: input.file.name,
    sizeBytes: storedObject.sizeBytes ?? input.file.size,
    contentType: storedObject.contentType,
    contentHash: input.contentHash,
    visibility: STORAGE_VISIBILITY.PRIVATE,
    etag: storedObject.etag,
    status: TEMPORARY_STATUS,
  });
}

export async function saveStorageObjectRecord(
  session: ActiveSession,
  storedObject: S3StoredObject | S3ObjectMetadata,
  input: {
    originalFilename: string;
    sizeBytes: number;
    contentType?: string;
    contentHash?: string;
    visibility: StorageVisibility;
    etag?: string;
  },
) {
  return upsertStorageObjectRecord(session, storedObject, {
    ...input,
    status: ACTIVE_STATUS,
  });
}

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

export async function promoteTemporaryStorageObject(
  session: ActiveSession,
  input: PromoteTemporaryStorageObjectInput,
) {
  const profile = resolveS3UploadProfile(input.targetProfile);
  if (!profile.ok) {
    throw new BusinessError(profile.code, 400);
  }

  assertPromotableTargetProfile(profile.value);

  const temp = await prisma.storageObject.findFirst({
    where: {
      storageObjectId: input.storageObjectId,
      partyId: session.currentPartyId,
      status: TEMPORARY_STATUS,
    },
    include: {
      uploader: {
        select: {
          nickName: true,
        },
      },
    },
  });

  if (!temp) {
    throw new BusinessError("storage.temporary_not_found", 404);
  }

  if (!isObjectKeyInUploadProfileDirectory(temp.objectKey, { directory: "tmp" })) {
    throw new BusinessError("storage.temporary_key_invalid", 400);
  }

  assertRequiredContentTypePrefix(temp.contentType, input.requireContentTypePrefix);

  const filename = temp.objectKey.split("/").at(-1) ?? temp.originalFilename;
  const targetObjectKey = `${profile.value.directory}/${filename}`;
  const promotedObject = await copyS3Object(getS3UploadConfig(), {
    sourceObjectKey: temp.objectKey,
    targetObjectKey,
    contentType: temp.contentType,
    sizeBytes: toNumberSize(temp.sizeBytes),
  });

  const row = await prisma.storageObject.update({
    where: { storageObjectId: temp.storageObjectId },
    data: {
      regionId: promotedObject.regionId,
      objectKey: promotedObject.objectKey,
      objectUrl: promotedObject.objectUrl,
      visibility: profile.value.visibility,
      etag: promotedObject.etag ?? temp.etag,
      status: ACTIVE_STATUS,
      deletedAt: null,
      updUserId: session.userId,
    },
    include: {
      uploader: {
        select: {
          nickName: true,
        },
      },
    },
  });

  await deleteS3Object(getS3UploadConfig(), {
    objectKey: temp.objectKey,
  });

  return toStorageObjectRecord(row);
}

export async function findStorageObjectForDownload(
  session: ActiveSession,
  storageObjectId: string,
) {
  const row = await prisma.storageObject.findFirst({
    where: {
      storageObjectId,
      partyId: session.currentPartyId,
      status: ACTIVE_STATUS,
    },
  });

  return row;
}

export async function findDuplicateStorageObjectRecord(
  session: ActiveSession,
  input: {
    contentHash: string;
    sizeBytes: number;
    visibility: StorageVisibility;
  },
) {
  const row = await prisma.storageObject.findFirst({
    where: {
      partyId: session.currentPartyId,
      contentHash: input.contentHash,
      sizeBytes: BigInt(input.sizeBytes),
      visibility: input.visibility,
      status: ACTIVE_STATUS,
    },
    orderBy: { creTime: "desc" },
    include: {
      uploader: {
        select: {
          nickName: true,
        },
      },
    },
  });

  return row ? toStorageObjectRecord(row) : null;
}
