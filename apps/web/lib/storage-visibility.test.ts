import { describe, expect, it } from "vitest";
import {
  STORAGE_VISIBILITY,
  normalizeStorageVisibility,
  validateStorageVisibilityInput,
} from "./storage-visibility";

describe("normalizeStorageVisibility", () => {
  it("defaults to private", () => {
    expect(normalizeStorageVisibility(undefined)).toBe(STORAGE_VISIBILITY.PRIVATE);
    expect(normalizeStorageVisibility("unknown")).toBe(STORAGE_VISIBILITY.PRIVATE);
  });

  it("normalizes public visibility", () => {
    expect(normalizeStorageVisibility(" public ")).toBe(STORAGE_VISIBILITY.PUBLIC);
  });
});

describe("validateStorageVisibilityInput", () => {
  it("allows private uploads in any directory", () => {
    expect(
      validateStorageVisibilityInput({
        visibility: "PRIVATE",
        contentType: "application/pdf",
        directory: "contracts",
      }),
    ).toEqual({
      ok: true,
      value: {
        visibility: "PRIVATE",
        directory: "contracts",
      },
    });
  });

  it("defaults public uploads to public images", () => {
    expect(
      validateStorageVisibilityInput({
        visibility: "PUBLIC",
        contentType: "image/png",
      }),
    ).toMatchObject({
      ok: true,
      value: {
        visibility: "PUBLIC",
        directory: "public/images",
      },
    });
  });

  it("rejects non-image public uploads", () => {
    expect(
      validateStorageVisibilityInput({
        visibility: "PUBLIC",
        contentType: "application/pdf",
        directory: "public/contracts",
      }),
    ).toMatchObject({
      ok: false,
      code: "storage.public_content_type_invalid",
    });
  });

  it("requires public uploads to use public directories", () => {
    expect(
      validateStorageVisibilityInput({
        visibility: "PUBLIC",
        contentType: "image/jpeg",
        directory: "avatars",
      }),
    ).toMatchObject({
      ok: false,
      code: "storage.public_directory_invalid",
    });
  });
});
