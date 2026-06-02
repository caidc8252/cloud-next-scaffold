import "server-only";

import { registerErrorMessages } from "@cloud/request/server";
import {
  ERR_AUTH_MISSING_FIELDS,
  ERR_AUTH_INVALID_CREDENTIALS,
  ERR_AUTH_ACCOUNT_LOCKED,
  ERR_AUTH_NO_ACTIVE_PARTNER,
  ERR_AUTH_NOT_AUTHENTICATED,
  ERR_AUTH_INVALID_PARTNER,
  ERR_AUTH_CREDENTIALS_REQUIRED,
  ERR_AUTH_PARTNER_REQUIRED,
} from "./auth-error-codes.ts";

// Auth 域是 app 级的（不属于 @cloud/request 通用包），所以它的错误码三语文案放在这里，
// 通过 registerErrorMessages 注册进 @cloud/request 的 server 端本地化解析。
// 导入本模块即完成注册（auth 路由顶部 side-effect import 触发）。
const authErrorMessages: Record<string, Record<string, string>> = {
  en: {
    [ERR_AUTH_MISSING_FIELDS]: "Please complete the required fields.",
    [ERR_AUTH_INVALID_CREDENTIALS]: "Incorrect account or password.",
    [ERR_AUTH_ACCOUNT_LOCKED]: "Account is locked. Please try again later.",
    [ERR_AUTH_NO_ACTIVE_PARTNER]: "No active organization is available for this account.",
    [ERR_AUTH_NOT_AUTHENTICATED]: "You are not signed in.",
    [ERR_AUTH_INVALID_PARTNER]: "This organization is not available.",
    [ERR_AUTH_CREDENTIALS_REQUIRED]: "Enter both account and password.",
    [ERR_AUTH_PARTNER_REQUIRED]: "Select an organization.",
  },
  "zh-CN": {
    [ERR_AUTH_MISSING_FIELDS]: "请填写必填项。",
    [ERR_AUTH_INVALID_CREDENTIALS]: "账号或密码错误。",
    [ERR_AUTH_ACCOUNT_LOCKED]: "账号已锁定，请稍后再试。",
    [ERR_AUTH_NO_ACTIVE_PARTNER]: "该账号没有可用的组织。",
    [ERR_AUTH_NOT_AUTHENTICATED]: "尚未登录。",
    [ERR_AUTH_INVALID_PARTNER]: "该组织不可用。",
    [ERR_AUTH_CREDENTIALS_REQUIRED]: "请输入账号和密码。",
    [ERR_AUTH_PARTNER_REQUIRED]: "请选择一个组织。",
  },
  ja: {
    [ERR_AUTH_MISSING_FIELDS]: "必須項目を入力してください。",
    [ERR_AUTH_INVALID_CREDENTIALS]: "アカウントまたはパスワードが正しくありません。",
    [ERR_AUTH_ACCOUNT_LOCKED]: "アカウントがロックされています。しばらくしてからもう一度お試しください。",
    [ERR_AUTH_NO_ACTIVE_PARTNER]: "このアカウントで利用可能な組織がありません。",
    [ERR_AUTH_NOT_AUTHENTICATED]: "ログインしていません。",
    [ERR_AUTH_INVALID_PARTNER]: "この組織は利用できません。",
    [ERR_AUTH_CREDENTIALS_REQUIRED]: "アカウントとパスワードを入力してください。",
    [ERR_AUTH_PARTNER_REQUIRED]: "組織を選択してください。",
  },
};

registerErrorMessages(authErrorMessages);
