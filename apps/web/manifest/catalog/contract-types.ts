// 单一权威合同闸门:每个合同解锁哪些叶子菜单(menuCode)。元素类型 = 生成的 MenuCode
// → 写错/删过的菜单码在此即编译错误。MenuCode 为可擦除类型导入(bootstrap,见设计 §5):
// codegen 运行时按数据读 CONTRACT_MENUS(类型被擦除),生成文件就位后 tsc 收紧校验。
import type { MenuCode } from "../_generated/registry-types.generated.ts";

export const CONTRACT_TYPES = ["ADMIN", "US-ISO", "US-ISV", "MERCHANT"] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_LABELS: Record<ContractType, string> = {
  ADMIN: "contract.admin",
  "US-ISO": "contract.usIso",
  "US-ISV": "contract.usIsv",
  MERCHANT: "contract.merchant",
};

// 旧 _menu.map:roles=ADMIN、users=通配([])。通配删除 → users 在此显式枚举到全部合同。
export const CONTRACT_MENUS: Record<ContractType, MenuCode[]> = {
  ADMIN: ["system.roles", "system.users"],
  "US-ISO": ["system.users"],
  "US-ISV": ["system.users"],
  MERCHANT: ["system.users"],
};
