// 契约类型代码级枚举（平台常量，与 packages/db seed 的 sys_contract_define.code 对齐）。
// 其它 app 如需编译期契约类型约束可从此处 import；运行时合法性在采集时统一校验。
// 增删契约类型：先改这里，再同步 seed 的 contractCodes。
export const CONTRACT_TYPES = ["ADMIN", "ISV", "ISO", "MERCHANT"] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];
