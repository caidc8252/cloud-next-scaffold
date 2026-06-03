import type { AppManifest } from "./types.ts";
import { validateAppManifest, type ValidateOptions } from "./validate.ts";

export type CreatePlatformConfigOptions = {
  /** 全局契约枚举（多 app 聚合并集）。用于校验每个菜单的 contractTypes，并由 getContractKeys 暴露。 */
  contractTypes: readonly string[];
  /** 图标名校验器，透传给 validateAppManifest。 */
  resolveIcon?: ValidateOptions["resolveIcon"];
};

export type PlatformConfig = {
  getPlatformManifest: {
    (): AppManifest[];
    (appId: string): AppManifest | null;
  };
  getAppIds: () => string[];
  getContractKeys: () => string[];
};

/**
 * 用采集到的 app manifests 构造平台配置。
 * 构造期一次性校验全部 manifest + 跨 app appId 唯一性，非法即抛（启动期阻断）。
 * 无运行时可变注册表、无导入副作用：每个模块实例从同一份静态数据各自构造不可变视图。
 */
export function createPlatformConfig(
  manifests: readonly AppManifest[],
  opts: CreatePlatformConfigOptions,
): PlatformConfig {
  const byAppId = new Map<string, AppManifest>();
  for (const manifest of manifests) {
    validateAppManifest(manifest, {
      contractTypes: opts.contractTypes,
      resolveIcon: opts.resolveIcon,
    });
    if (byAppId.has(manifest.appId)) {
      throw new Error(`[platform-config] duplicate appId "${manifest.appId}" across apps`);
    }
    byAppId.set(manifest.appId, manifest);
  }

  const all = [...manifests];
  const appIds = all.map((m) => m.appId);
  const contractKeys = [...opts.contractTypes];

  function getPlatformManifest(): AppManifest[];
  function getPlatformManifest(appId: string): AppManifest | null;
  function getPlatformManifest(appId?: string): AppManifest[] | AppManifest | null {
    if (appId === undefined) return [...all];
    return byAppId.get(appId) ?? null;
  }
  console.log('menu build wow')

  return {
    getPlatformManifest,
    getAppIds: () => [...appIds],
    getContractKeys: () => [...contractKeys],
  };
}
