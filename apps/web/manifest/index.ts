import { createPlatformConfig } from "@cloud/platform-config";
import { MENUS, CONTRACT_KEYS } from "./_generated/apps";

// 当前平台绑定的契约（= 各 app 声明 contractKeys 的并集，也是构造校验允许集）。
// 侧边栏 / 登录快照 / 角色目录按「当前会话契约」调 getMenus(contracts) 取菜单。
export const PLATFORM_CONTRACTS = ['ADMIN'];

// 采集全部 app 菜单并拍平成一份全局池（_generated/apps.ts 由 gen:manifest 序列化写入，
// 自包含、无跨 app 源码导入）+ 聚合契约枚举，构造期一次性校验（非法拒启）。无运行时注册表。
const config = createPlatformConfig(MENUS, { contractTypes: CONTRACT_KEYS });

// 按契约过滤菜单：不传 → 全部；传单个契约或契约数组 → 命中的菜单。
export const getMenus = config.getMenus;
export const getContractKeys = config.getContractKeys;
