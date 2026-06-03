import { createPlatformConfig } from "@cloud/platform-config";
import { APP_MANIFESTS, CONTRACT_KEYS } from "./_generated/apps";

// 本平台 id（= 自身 appManifest.appId）。侧边栏 / 登录快照 / 角色目录查询都用它。
export const PLATFORM_ID = "web";

// 采集全部 app manifest（_generated/apps.ts 由 gen:manifest 序列化写入，自包含、无跨 app 源码导入）
// + 聚合契约枚举，构造期一次性校验（非法拒启）。无运行时注册表、无导入副作用。
const config = createPlatformConfig(APP_MANIFESTS, { contractTypes: CONTRACT_KEYS });

export const getPlatformManifest = config.getPlatformManifest;
export const getAppIds = config.getAppIds;
export const getContractKeys = config.getContractKeys;
