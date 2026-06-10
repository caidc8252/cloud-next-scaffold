import { describe, expect, it } from "vitest";
import { normalizeStorageAttachmentInput } from "./storage-attachment-input";

describe("normalizeStorageAttachmentInput", () => {
  it("normalizes business binding tokens", () => {
    const result = normalizeStorageAttachmentInput({
      storageObjectId: " object-1 ",
      subjectType: " app ",
      subjectId: " app-001 ",
      purpose: " package ",
      displayName: " release.apk ",
      sortNo: 2.8,
      isPrimary: true,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        storageObjectId: "object-1",
        subjectType: "APP",
        subjectId: "app-001",
        purpose: "PACKAGE",
        displayName: "release.apk",
        sortNo: 2,
        isPrimary: true,
      },
    });
  });

  it("rejects missing storage object ids", () => {
    const result = normalizeStorageAttachmentInput({
      subjectType: "APP",
      subjectId: "app-001",
      purpose: "PACKAGE",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "storage.storage_object_required",
    });
  });

  it("rejects invalid subject tokens", () => {
    const result = normalizeStorageAttachmentInput({
      storageObjectId: "object-1",
      subjectType: "app package",
      subjectId: "app-001",
      purpose: "PACKAGE",
    });

    expect(result).toMatchObject({
      ok: false,
      code: "storage.subject_type_invalid",
    });
  });

  it("defaults optional presentation fields", () => {
    const result = normalizeStorageAttachmentInput({
      storageObjectId: "object-1",
      subjectType: "SYS_USER",
      subjectId: "1001",
      purpose: "AVATAR",
      sortNo: -8,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        displayName: null,
        sortNo: 0,
        isPrimary: false,
      },
    });
  });
});
