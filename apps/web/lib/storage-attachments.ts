import "server-only";

import { prisma } from "@cloud/db";
import type { AuthenticatedSession } from "@cloud/permissions/server";
import type {
  NormalizedStorageAttachmentInput,
  StorageAttachmentValidationFailure,
} from "@/lib/storage-attachment-input";
import { toStorageObjectRecord } from "@/lib/storage-object-records";
import type { StorageAttachmentRecord } from "@/storage/types";

const ACTIVE_STATUS = "ACTIVE";

type StorageAttachmentRow = {
  storageAttachmentId: string;
  storageObjectId: string;
  subjectType: string;
  subjectId: string;
  purpose: string;
  displayName: string | null;
  sortNo: number;
  isPrimary: boolean;
  status: string;
  creTime: Date;
  storageObject: Parameters<typeof toStorageObjectRecord>[0];
};

export type ListStorageAttachmentsInput = {
  subjectType?: string;
  subjectId?: string;
  purpose?: string;
};

function normalizeSubjectTokenForQuery(value: string | undefined): string | null {
  const token = value?.trim().toUpperCase();
  if (!token || token.length > 64) return null;
  return token;
}

function normalizeSubjectIdForQuery(value: string | undefined): string | null {
  const subjectId = value?.trim();
  if (!subjectId || subjectId.length > 128) return null;
  return subjectId;
}

export function toStorageAttachmentRecord(
  row: StorageAttachmentRow,
): StorageAttachmentRecord {
  return {
    id: row.storageAttachmentId,
    storageObjectId: row.storageObjectId,
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    purpose: row.purpose,
    displayName: row.displayName,
    sortNo: row.sortNo,
    isPrimary: row.isPrimary,
    status: row.status,
    attachedAt: row.creTime.toISOString(),
    storageObject: toStorageObjectRecord(row.storageObject),
  };
}

export async function listStorageAttachments(
  session: AuthenticatedSession,
  input: ListStorageAttachmentsInput,
) {
  const subjectType = normalizeSubjectTokenForQuery(input.subjectType);
  const subjectId = normalizeSubjectIdForQuery(input.subjectId);
  const purpose = input.purpose ? normalizeSubjectTokenForQuery(input.purpose) : undefined;

  if (!subjectType || !subjectId) return [];

  const rows = await prisma.storageAttachment.findMany({
    where: {
      entityId: session.entity.entityId,
      subjectType,
      subjectId,
      purpose: purpose ?? undefined,
      status: ACTIVE_STATUS,
      storageObject: {
        status: ACTIVE_STATUS,
      },
    },
    include: {
      storageObject: {
        include: {
          uploader: {
            select: {
              username: true,
              displayName: true,
            },
          },
        },
      },
    },
    orderBy: [{ sortNo: "asc" }, { creTime: "desc" }],
  });

  return rows.map(toStorageAttachmentRecord);
}

export async function bindStorageAttachment(
  session: AuthenticatedSession,
  input: NormalizedStorageAttachmentInput,
) {
  const storageObject = await prisma.storageObject.findFirst({
    where: {
      storageObjectId: input.storageObjectId,
      entityId: session.entity.entityId,
      status: ACTIVE_STATUS,
    },
    select: {
      storageObjectId: true,
    },
  });

  if (!storageObject) {
    return {
      ok: false,
      code: "storage.object_not_found",
      message: "Uploaded object not found.",
    } satisfies StorageAttachmentValidationFailure;
  }

  const row = await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.storageAttachment.updateMany({
        where: {
          entityId: session.entity.entityId,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          purpose: input.purpose,
          status: ACTIVE_STATUS,
          NOT: {
            storageObjectId: input.storageObjectId,
          },
        },
        data: {
          isPrimary: false,
          updUserId: session.id,
        },
      });
    }

    return tx.storageAttachment.upsert({
      where: {
        entityId_storageObjectId_subjectType_subjectId_purpose: {
          entityId: session.entity.entityId,
          storageObjectId: input.storageObjectId,
          subjectType: input.subjectType,
          subjectId: input.subjectId,
          purpose: input.purpose,
        },
      },
      create: {
        entityId: session.entity.entityId,
        storageObjectId: input.storageObjectId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        purpose: input.purpose,
        displayName: input.displayName,
        sortNo: input.sortNo,
        isPrimary: input.isPrimary,
        status: ACTIVE_STATUS,
        creUserId: session.id,
        updUserId: session.id,
      },
      update: {
        displayName: input.displayName,
        sortNo: input.sortNo,
        isPrimary: input.isPrimary,
        status: ACTIVE_STATUS,
        deletedAt: null,
        updUserId: session.id,
      },
      include: {
        storageObject: {
          include: {
            uploader: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    });
  });

  return {
    ok: true,
    value: toStorageAttachmentRecord(row),
  };
}
