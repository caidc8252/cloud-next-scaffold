import type { StorageVisibility } from "@/lib/storage-types";

export const S3_UPLOAD_PROFILES = {
  DEBUG_PRIVATE: "debug.private",
  TEMPORARY: "temporary",
  APPLICATION_ICON: "application.icon",
  APPLICATION_IMAGE: "application.image",
  APPLICATION_PACKAGE: "application.package",
} as const;

export type S3UploadProfile = (typeof S3_UPLOAD_PROFILES)[keyof typeof S3_UPLOAD_PROFILES];

export type S3UploadProfileConfig = {
  profile: S3UploadProfile;
  directory: string;
  visibility: StorageVisibility;
};

type S3UploadProfileValidationFailure = {
  ok: false;
  code: string;
  message: string;
};

export type S3UploadProfileValidationResult =
  | {
      ok: true;
      value: S3UploadProfileConfig;
    }
  | S3UploadProfileValidationFailure;

const PROFILE_CONFIGS = {
  [S3_UPLOAD_PROFILES.DEBUG_PRIVATE]: {
    profile: S3_UPLOAD_PROFILES.DEBUG_PRIVATE,
    directory: "debug",
    visibility: "PRIVATE",
  },
  [S3_UPLOAD_PROFILES.TEMPORARY]: {
    profile: S3_UPLOAD_PROFILES.TEMPORARY,
    directory: "tmp",
    visibility: "PRIVATE",
  },
  [S3_UPLOAD_PROFILES.APPLICATION_ICON]: {
    profile: S3_UPLOAD_PROFILES.APPLICATION_ICON,
    directory: "public/applications/icons",
    visibility: "PUBLIC",
  },
  [S3_UPLOAD_PROFILES.APPLICATION_IMAGE]: {
    profile: S3_UPLOAD_PROFILES.APPLICATION_IMAGE,
    directory: "public/applications/images",
    visibility: "PUBLIC",
  },
  [S3_UPLOAD_PROFILES.APPLICATION_PACKAGE]: {
    profile: S3_UPLOAD_PROFILES.APPLICATION_PACKAGE,
    directory: "applications/packages",
    visibility: "PRIVATE",
  },
} as const satisfies Record<S3UploadProfile, S3UploadProfileConfig>;

export const S3_UPLOAD_PROFILE_OPTIONS = Object.values(PROFILE_CONFIGS);

export function resolveS3UploadProfile(value: string | undefined): S3UploadProfileValidationResult {
  const profile = value?.trim() as S3UploadProfile | undefined;

  if (!profile || !(profile in PROFILE_CONFIGS)) {
    return {
      ok: false,
      code: "storage.upload_profile_invalid",
      message: "uploadProfile is required and must be a known upload profile.",
    };
  }

  return {
    ok: true,
    value: PROFILE_CONFIGS[profile],
  };
}

export function isObjectKeyInUploadProfileDirectory(
  objectKey: string,
  profile: Pick<S3UploadProfileConfig, "directory">,
): boolean {
  const cleanedKey = objectKey.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  const cleanedDirectory = profile.directory
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");

  return cleanedKey === cleanedDirectory || cleanedKey.startsWith(`${cleanedDirectory}/`);
}
