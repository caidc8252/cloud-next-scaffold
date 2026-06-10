const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

export function normalizeContentHash(value: string | undefined | null): string | null {
  const contentHash = value?.trim().toLowerCase();
  if (!contentHash || !SHA256_HEX_PATTERN.test(contentHash)) return null;
  return contentHash;
}

export function isContentHashInputPresent(value: string | undefined | null): boolean {
  return Boolean(value?.trim());
}

export function getPositiveIntegerSize(value: number | string | undefined | null): number | null {
  const size = Number(value);
  if (!Number.isFinite(size) || size <= 0) return null;
  return Math.floor(size);
}
