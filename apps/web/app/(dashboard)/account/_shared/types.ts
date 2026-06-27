// 兼容壳：account 域 VO 已迁至 modules/identity/account；此处 re-export 保持既有导入点不变
// （类型 re-export 零运行时成本）。待 account/_shared 全部消费者切到 account.public 后删除。
export type {
  AccountProfile,
  AccountSecurity,
  MfaStatus,
  AccountPartner,
  Country,
} from "@/modules/identity/account/server/account.public";
