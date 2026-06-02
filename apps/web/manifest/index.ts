import { getRegisteredPlatforms, registerAppManifest } from "@cloud/platform-config";
import { appManifest } from "./_menu.map";
import { CONTRACT_TYPES, type ContractType } from "./_contracts";

// 本平台 id（= appManifest.appId）。侧边栏 / 登录快照 / 角色目录查询都用它。
export const PLATFORM_ID = "web";

// 注册发生在「导入本模块」时（幂等）。
// 为什么不只靠 instrumentation：dev / Turbopack 下 instrumentation 与 route handler
// 可能拿到不同的 @cloud/platform-config 模块实例，instrumentation 注册的注册表对路由不可见。
// 消费方（登录快照、侧边栏、角色目录）都会 import @/manifest，因此在它们各自的实例里注册表必就绪。
if (!getRegisteredPlatforms().includes(appManifest.appId)) {
  registerAppManifest(appManifest, { contractTypes: CONTRACT_TYPES });
}

export { appManifest, CONTRACT_TYPES };
export type { ContractType };
