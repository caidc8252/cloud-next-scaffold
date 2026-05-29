import type { BindStorageAttachmentRequest } from "@/storage/types";

const SUBJECT_TOKEN_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,63}$/;

export type StorageAttachmentValidationFailure = {
  ok: false;
  code: string;
  message: string;
};

export type NormalizedStorageAttachmentInput = {
  storageObjectId: string;
  subjectType: string;
  subjectId: string;
  purpose: string;
  displayName: string | null;
  sortNo: number;
  isPrimary: boolean;
};

export type StorageAttachmentValidationResult =
  | {
      ok: true;
      value: NormalizedStorageAttachmentInput;
    }
  | StorageAttachmentValidationFailure;

function normalizeSubjectToken(value: string | undefined): string | null {
  const token = value?.trim().toUpperCase();
  if (!token || !SUBJECT_TOKEN_PATTERN.test(token)) return null;
  return token;
}

function normalizeSubjectId(value: string | undefined): string | null {
  const subjectId = value?.trim();
  if (!subjectId || subjectId.length > 128) return null;
  return subjectId;
}

function normalizeSortNo(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function normalizeStorageAttachmentInput(
  input: BindStorageAttachmentRequest,
): StorageAttachmentValidationResult {
  const storageObjectId = input.storageObjectId?.trim();
  if (!storageObjectId) {
    return {
      ok: false,
      code: "storage.storage_object_required",
      message: "storageObjectId is required.",
    };
  }

  const subjectType = normalizeSubjectToken(input.subjectType);
  if (!subjectType) {
    return {
      ok: false,
      code: "storage.subject_type_invalid",
      message: "subjectType must be 1-64 letters, numbers, dots, underscores or hyphens.",
    };
  }

  const subjectId = normalizeSubjectId(input.subjectId);
  if (!subjectId) {
    return {
      ok: false,
      code: "storage.subject_id_invalid",
      message: "subjectId must be 1-128 characters.",
    };
  }

  const purpose = normalizeSubjectToken(input.purpose);
  if (!purpose) {
    return {
      ok: false,
      code: "storage.purpose_invalid",
      message: "purpose must be 1-64 letters, numbers, dots, underscores or hyphens.",
    };
  }

  return {
    ok: true,
    value: {
      storageObjectId,
      subjectType,
      subjectId,
      purpose,
      displayName: input.displayName?.trim() || null,
      sortNo: normalizeSortNo(input.sortNo),
      isPrimary: input.isPrimary === true,
    },
  };
}
