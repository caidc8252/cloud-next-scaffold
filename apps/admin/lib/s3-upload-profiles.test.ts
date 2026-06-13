import { describe, expect, it } from "vitest";
import {
  S3_UPLOAD_PROFILES,
  isObjectKeyInUploadProfileDirectory,
  resolveS3UploadProfile,
} from "./s3-upload-profiles";

describe("resolveS3UploadProfile", () => {
  it("resolves business-owned upload directories", () => {
    expect(resolveS3UploadProfile(S3_UPLOAD_PROFILES.APPLICATION_ICON)).toEqual({
      ok: true,
      value: {
        profile: S3_UPLOAD_PROFILES.APPLICATION_ICON,
        directory: "public/applications/icons",
        visibility: "PUBLIC",
      },
    });
  });

  it("resolves the temporary upload directory", () => {
    expect(resolveS3UploadProfile(S3_UPLOAD_PROFILES.TEMPORARY)).toEqual({
      ok: true,
      value: {
        profile: S3_UPLOAD_PROFILES.TEMPORARY,
        directory: "tmp",
        visibility: "PRIVATE",
      },
    });
  });

  it("rejects unknown profiles", () => {
    expect(resolveS3UploadProfile("public/images")).toMatchObject({
      ok: false,
      code: "storage.upload_profile_invalid",
    });
  });
});

describe("isObjectKeyInUploadProfileDirectory", () => {
  it("accepts keys under the configured profile directory", () => {
    expect(
      isObjectKeyInUploadProfileDirectory("public/applications/icons/20260613-icon.png", {
        directory: "public/applications/icons",
      }),
    ).toBe(true);
  });

  it("rejects keys outside the configured profile directory", () => {
    expect(
      isObjectKeyInUploadProfileDirectory("public/applications/images/20260613-image.png", {
        directory: "public/applications/icons",
      }),
    ).toBe(false);
  });
});
