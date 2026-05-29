export const STORAGE_VISIBILITY = {
  PRIVATE: "PRIVATE",
  PUBLIC: "PUBLIC",
} as const;

export type StorageVisibility = (typeof STORAGE_VISIBILITY)[keyof typeof STORAGE_VISIBILITY];

type VisibilityValidationFailure = {
  ok: false;
  code: string;
  message: string;
};

type NormalizedStorageVisibilityInput = {
  visibility: StorageVisibility;
  directory?: string;
};

export type StorageVisibilityValidationResult =
  | {
      ok: true;
      value: NormalizedStorageVisibilityInput;
    }
  | VisibilityValidationFailure;

function normalizeDirectory(value: string | undefined): string | undefined {
  const cleaned = value
    ?.trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
  return cleaned || undefined;
}

export function normalizeStorageVisibility(value: string | undefined | null): StorageVisibility {
  return value?.trim().toUpperCase() === STORAGE_VISIBILITY.PUBLIC
    ? STORAGE_VISIBILITY.PUBLIC
    : STORAGE_VISIBILITY.PRIVATE;
}

export function validateStorageVisibilityInput(input: {
  visibility?: string;
  contentType: string;
  directory?: string;
}): StorageVisibilityValidationResult {
  const visibility = normalizeStorageVisibility(input.visibility);
  const directory = normalizeDirectory(input.directory);

  if (visibility === STORAGE_VISIBILITY.PRIVATE) {
    return {
      ok: true,
      value: {
        visibility,
        directory,
      },
    };
  }

  if (!input.contentType.toLowerCase().startsWith("image/")) {
    return {
      ok: false,
      code: "storage.public_content_type_invalid",
      message: "Public uploads must be images.",
    };
  }

  const publicDirectory = directory ?? "public/images";
  if (publicDirectory !== "public" && !publicDirectory.startsWith("public/")) {
    return {
      ok: false,
      code: "storage.public_directory_invalid",
      message: "Public uploads must use the public/ directory.",
    };
  }

  return {
    ok: true,
    value: {
      visibility,
      directory: publicDirectory,
    },
  };
}
