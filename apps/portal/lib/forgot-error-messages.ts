import "server-only";

import { registerErrorMessages } from "@cloud/request/server";
import {
  ERR_FP_CODE_INVALID,
  ERR_FP_PASSWORD_WEAK,
  ERR_FP_PASSWORD_REUSED,
} from "./forgot-error-codes.ts";

const forgotErrorMessages: Record<string, Record<string, string>> = {
  en: {
    [ERR_FP_CODE_INVALID]: "The verification code is invalid or has expired.",
    [ERR_FP_PASSWORD_WEAK]: "Password does not meet the requirements.",
    [ERR_FP_PASSWORD_REUSED]: "Please choose a password you haven't used recently.",
  },
  "zh-CN": {
    [ERR_FP_CODE_INVALID]: "验证码无效或已过期。",
    [ERR_FP_PASSWORD_WEAK]: "密码不满足要求。",
    [ERR_FP_PASSWORD_REUSED]: "请勿使用近期用过的密码。",
  },
  ja: {
    [ERR_FP_CODE_INVALID]: "確認コードが無効か、有効期限が切れています。",
    [ERR_FP_PASSWORD_WEAK]: "パスワードが要件を満たしていません。",
    [ERR_FP_PASSWORD_REUSED]: "最近使用したパスワードは使用できません。",
  },
};

registerErrorMessages(forgotErrorMessages);
