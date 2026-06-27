// account 域跨模块入口：暴露被其他模块/壳消费的展示 VO 类型。
// 消费者：mfa.service（MfaStatus）、account/_shared 兼容壳。
export type {
  AccountProfile,
  AccountSecurity,
  MfaStatus,
  AccountPartner,
  Country,
} from "../schema/account.types";
