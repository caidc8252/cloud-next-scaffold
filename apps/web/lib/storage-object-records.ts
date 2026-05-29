import "server-only";

import { prisma } from "@cloud/db";
import type { S3ObjectMetadata, S3StoredObject, S3UploadSession } from "@cloud/storage";
import type { AuthenticatedSession } from "@cloud/permissions/server";
import type { StorageObjectRecord, StorageVisibility } from "../storage/types";
import { STORAGE_VISIBILITY } from "./storage-visibility";

const ACTIVE_STATUS = "ACTIVE";
const PENDING_STATUS = "PENDING";

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
    username: string | null;
    displayName: string | null;
  };
};

type StorageObjectLike = S3StoredObject | S3ObjectMetadata | S3UploadSession;

function toNumberSize(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value;
}

function toUploaderName(row: StorageObjectRow): string {
  return row.uploader?.displayName || row.uploader?.username || "Unknown";
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

export async function listStorageObjectRecords(session: AuthenticatedSession) {
  const rows = await prisma.storageObject.findMany({
    where: {
      entityId: session.entity.entityId,
      status: ACTIVE_STATUS,
    },
    orderBy: { creTime: "desc" },
    take: 100,
    include: {
      uploader: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
  });

  return rows.map(toStorageObjectRecord);
}

async function upsertStorageObjectRecord(
  session: AuthenticatedSession,
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
      entityId: session.entity.entityId,
      bucket: storedObject.bucket,
      objectKey: storedObject.objectKey,
    },
  });

  const data = {
    uploaderUserId: session.id,
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
    updUserId: session.id,
    deletedAt: input.status === ACTIVE_STATUS ? null : existing?.deletedAt,
  };

  const row = existing
    ? await prisma.storageObject.update({
        where: { storageObjectId: existing.storageObjectId },
        data,
        include: {
          uploader: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      })
    : await prisma.storageObject.create({
        data: {
          ...data,
          entityId: session.entity.entityId,
          bucket: storedObject.bucket,
          objectKey: storedObject.objectKey,
          creUserId: session.id,
        },
        include: {
          uploader: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      });

  return toStorageObjectRecord(row);
}

export async function createPendingStorageObjectRecord(
  session: AuthenticatedSession,
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

export async function saveStorageObjectRecord(
  session: AuthenticatedSession,
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

export async function findStorageObjectForDownload(
  session: AuthenticatedSession,
  storageObjectId: string,
) {
  const row = await prisma.storageObject.findFirst({
    where: {
      storageObjectId,
      entityId: session.entity.entityId,
      status: ACTIVE_STATUS,
    },
  });

  return row;
}

export async function findDuplicateStorageObjectRecord(
  session: AuthenticatedSession,
  input: {
    contentHash: string;
    sizeBytes: number;
    visibility: StorageVisibility;
  },
) {
  const row = await prisma.storageObject.findFirst({
    where: {
      entityId: session.entity.entityId,
      contentHash: input.contentHash,
      sizeBytes: BigInt(input.sizeBytes),
      visibility: input.visibility,
      status: ACTIVE_STATUS,
    },
    orderBy: { creTime: "desc" },
    include: {
      uploader: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
  });

  return row ? toStorageObjectRecord(row) : null;
}
