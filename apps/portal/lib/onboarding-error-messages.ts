import "server-only";

import { registerErrorMessages } from "@cloud/request/server";
import {
  ERR_OB_INVITE_NOT_FOUND,
  ERR_OB_INVITE_EXPIRED,
  ERR_OB_INVITE_CONSUMED,
  ERR_OB_EMAIL_TAKEN,
  ERR_OB_PASSWORD_WEAK,
  ERR_OB_NOT_AUTHENTICATED,
  ERR_OB_ALREADY_MEMBER,
} from "./onboarding-error-codes.ts";

const onboardingErrorMessages: Record<string, Record<string, string>> = {
  en: {
    [ERR_OB_INVITE_NOT_FOUND]: "Invitation not found.",
    [ERR_OB_INVITE_EXPIRED]: "This invitation has expired.",
    [ERR_OB_INVITE_CONSUMED]: "This invitation has already been used.",
    [ERR_OB_EMAIL_TAKEN]: "This email already has an account. Sign in to join.",
    [ERR_OB_PASSWORD_WEAK]: "Password does not meet the requirements.",
    [ERR_OB_NOT_AUTHENTICATED]: "Your session has expired. Please sign in again.",
    [ERR_OB_ALREADY_MEMBER]: "You're already a member of this organization.",
  },
  "zh-CN": {
    [ERR_OB_INVITE_NOT_FOUND]: "邀请不存在。",
    [ERR_OB_INVITE_EXPIRED]: "该邀请已过期。",
    [ERR_OB_INVITE_CONSUMED]: "该邀请已被使用。",
    [ERR_OB_EMAIL_TAKEN]: "该邮箱已注册，请登录后加入。",
    [ERR_OB_PASSWORD_WEAK]: "密码不满足要求。",
    [ERR_OB_NOT_AUTHENTICATED]: "登录已失效，请重新登录。",
    [ERR_OB_ALREADY_MEMBER]: "你已经是该组织的成员。",
  },
  ja: {
    [ERR_OB_INVITE_NOT_FOUND]: "招待が見つかりません。",
    [ERR_OB_INVITE_EXPIRED]: "この招待は有効期限が切れています。",
    [ERR_OB_INVITE_CONSUMED]: "この招待は既に使用されています。",
    [ERR_OB_EMAIL_TAKEN]: "このメールアドレスは既に登録されています。サインインして参加してください。",
    [ERR_OB_PASSWORD_WEAK]: "パスワードが要件を満たしていません。",
    [ERR_OB_NOT_AUTHENTICATED]: "セッションの有効期限が切れました。もう一度サインインしてください。",
    [ERR_OB_ALREADY_MEMBER]: "すでにこの組織のメンバーです。",
  },
};

registerErrorMessages(onboardingErrorMessages);
