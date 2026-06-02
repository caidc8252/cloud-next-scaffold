// Next.js startup hook: collect every platform's manifest into platform-config
// and validate it. Any malformed manifest throws here, refusing to boot.
// See scripts/generate-manifest-registry.mjs for the aggregated barrel.
export async function register() {
  const { APP_MANIFESTS } = await import("@/manifest/_generated/apps");
  const { CONTRACT_TYPES } = await import("@/manifest");
  const { registerAppManifest, resetRegistry } = await import("@cloud/platform-config");

  resetRegistry();
  for (const manifest of APP_MANIFESTS) {
    registerAppManifest(manifest, { contractTypes: CONTRACT_TYPES });
  }
}
