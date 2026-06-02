import type { AppManifest } from "./types.ts";
import { validateAppManifest, type ValidateOptions } from "./validate.ts";

// 按平台（appId）分桶的注册表。不合并成一棵全局树：每个平台独立。
const registry = new Map<string, AppManifest>();

/**
 * 采集一个平台的 manifest。注册前做平台内完整性校验，非法即抛错（启动期阻断）。
 * 重复注册同一 appId 视为错误。
 */
export function registerAppManifest(manifest: AppManifest, opts: ValidateOptions = {}): void {
  if (registry.has(manifest.appId)) {
    throw new Error(`[platform-config] platform "${manifest.appId}" already registered`);
  }
  validateAppManifest(manifest, opts);
  registry.set(manifest.appId, manifest);
}

/** 清空注册表（测试 / 热更新重新采集用）。 */
export function resetRegistry(): void {
  registry.clear();
}

/** 已注册的平台 id 列表。 */
export function getRegisteredPlatforms(): string[] {
  return [...registry.keys()];
}

/** 取某平台 manifest；未注册则抛明确错误。查询 API 内部使用。 */
export function getPlatformManifest(platform: string): AppManifest {
  const manifest = registry.get(platform);
  if (!manifest) {
    throw new Error(`[platform-config] platform "${platform}" is not registered`);
  }
  return manifest;
}
