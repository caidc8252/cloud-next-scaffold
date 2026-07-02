import "server-only";

import type { Locale } from "@cloud/i18n";
import { registerErrorMessages } from "@cloud/request/server";
import {
  ERR_ACCOUNT_NICKNAME_REQUIRED,
  ERR_ACCOUNT_COUNTRY_INVALID,
  ERR_ACCOUNT_EMAIL_INVALID,
  ERR_ACCOUNT_EMAIL_TAKEN,
  ERR_ACCOUNT_EMAIL_SAME,
  ERR_ACCOUNT_USERNAME_INVALID,
  ERR_ACCOUNT_USERNAME_TAKEN,
  ERR_ACCOUNT_USERNAME_SAME,
  ERR_ACCOUNT_VERIFY_CODE_INVALID,
  ERR_ACCOUNT_PASSWORD_CURRENT_WRONG,
  ERR_ACCOUNT_PASSWORD_POLICY,
  ERR_ACCOUNT_PASSWORD_REUSED,
  ERR_ACCOUNT_MFA_STEPUP_REQUIRED,
  ERR_ACCOUNT_MFA_STEPUP_INVALID,
  ERR_ACCOUNT_MFA_NOT_ENABLED,
  ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID,
  ERR_ACCOUNT_MFA_PENDING_MISSING,
} from "./account.error-codes.ts";

type AccountErrorCode =
  | typeof ERR_ACCOUNT_NICKNAME_REQUIRED
  | typeof ERR_ACCOUNT_COUNTRY_INVALID
  | typeof ERR_ACCOUNT_EMAIL_INVALID
  | typeof ERR_ACCOUNT_EMAIL_TAKEN
  | typeof ERR_ACCOUNT_EMAIL_SAME
  | typeof ERR_ACCOUNT_USERNAME_INVALID
  | typeof ERR_ACCOUNT_USERNAME_TAKEN
  | typeof ERR_ACCOUNT_USERNAME_SAME
  | typeof ERR_ACCOUNT_VERIFY_CODE_INVALID
  | typeof ERR_ACCOUNT_PASSWORD_CURRENT_WRONG
  | typeof ERR_ACCOUNT_PASSWORD_POLICY
  | typeof ERR_ACCOUNT_PASSWORD_REUSED
  | typeof ERR_ACCOUNT_MFA_STEPUP_REQUIRED
  | typeof ERR_ACCOUNT_MFA_STEPUP_INVALID
  | typeof ERR_ACCOUNT_MFA_NOT_ENABLED
  | typeof ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID
  | typeof ERR_ACCOUNT_MFA_PENDING_MISSING;

// Account 域是 identity/account 模块级错误码，三语文案随模块放置并注册到 @cloud/request。
const accountErrorMessages = {
  en: {
    [ERR_ACCOUNT_NICKNAME_REQUIRED]: "Display name is required.",
    [ERR_ACCOUNT_COUNTRY_INVALID]: "Please select a valid country.",
    [ERR_ACCOUNT_EMAIL_INVALID]: "Enter a valid email address.",
    [ERR_ACCOUNT_EMAIL_TAKEN]: "That email is already in use.",
    [ERR_ACCOUNT_EMAIL_SAME]: "That is already your email.",
    [ERR_ACCOUNT_USERNAME_INVALID]: "3–32 chars: letters, numbers, dot, dash, underscore.",
    [ERR_ACCOUNT_USERNAME_TAKEN]: "That username is already taken.",
    [ERR_ACCOUNT_USERNAME_SAME]: "That is already your username.",
    [ERR_ACCOUNT_VERIFY_CODE_INVALID]: "Incorrect or expired verification code.",
    [ERR_ACCOUNT_PASSWORD_CURRENT_WRONG]: "Current password is incorrect.",
    [ERR_ACCOUNT_PASSWORD_POLICY]: "New password does not meet the requirements.",
    [ERR_ACCOUNT_PASSWORD_REUSED]: "Choose a password you haven't used recently.",
    [ERR_ACCOUNT_MFA_STEPUP_REQUIRED]: "Enter your authenticator code to continue.",
    [ERR_ACCOUNT_MFA_STEPUP_INVALID]: "Incorrect authenticator code.",
    [ERR_ACCOUNT_MFA_NOT_ENABLED]: "Two-factor authentication is not enabled.",
    [ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID]: "That code doesn't match. Scan the key and try again.",
    [ERR_ACCOUNT_MFA_PENDING_MISSING]: "No pending setup found. Start again.",
  },
  "zh-CN": {
    [ERR_ACCOUNT_NICKNAME_REQUIRED]: "请填写显示名称。",
    [ERR_ACCOUNT_COUNTRY_INVALID]: "请选择有效的国家/地区。",
    [ERR_ACCOUNT_EMAIL_INVALID]: "请输入有效的邮箱地址。",
    [ERR_ACCOUNT_EMAIL_TAKEN]: "该邮箱已被使用。",
    [ERR_ACCOUNT_EMAIL_SAME]: "这已经是你的邮箱。",
    [ERR_ACCOUNT_USERNAME_INVALID]: "3–32 位：字母、数字、点、短横、下划线。",
    [ERR_ACCOUNT_USERNAME_TAKEN]: "该用户名已被占用。",
    [ERR_ACCOUNT_USERNAME_SAME]: "这已经是你的用户名。",
    [ERR_ACCOUNT_VERIFY_CODE_INVALID]: "验证码错误或已过期。",
    [ERR_ACCOUNT_PASSWORD_CURRENT_WRONG]: "当前密码不正确。",
    [ERR_ACCOUNT_PASSWORD_POLICY]: "新密码不符合要求。",
    [ERR_ACCOUNT_PASSWORD_REUSED]: "请勿使用近期用过的密码。",
    [ERR_ACCOUNT_MFA_STEPUP_REQUIRED]: "请输入认证器验证码以继续。",
    [ERR_ACCOUNT_MFA_STEPUP_INVALID]: "认证器验证码不正确。",
    [ERR_ACCOUNT_MFA_NOT_ENABLED]: "尚未启用双重验证。",
    [ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID]: "验证码不匹配，请重新扫码后再试。",
    [ERR_ACCOUNT_MFA_PENDING_MISSING]: "未找到待激活的配置，请重新开始。",
  },
  ja: {
    [ERR_ACCOUNT_NICKNAME_REQUIRED]: "表示名を入力してください。",
    [ERR_ACCOUNT_COUNTRY_INVALID]: "有効な国を選択してください。",
    [ERR_ACCOUNT_EMAIL_INVALID]: "有効なメールアドレスを入力してください。",
    [ERR_ACCOUNT_EMAIL_TAKEN]: "そのメールアドレスは既に使用されています。",
    [ERR_ACCOUNT_EMAIL_SAME]: "それは既に現在のメールアドレスです。",
    [ERR_ACCOUNT_USERNAME_INVALID]: "3〜32文字：英数字・ドット・ハイフン・アンダースコア。",
    [ERR_ACCOUNT_USERNAME_TAKEN]: "そのユーザー名は既に使われています。",
    [ERR_ACCOUNT_USERNAME_SAME]: "それは既に現在のユーザー名です。",
    [ERR_ACCOUNT_VERIFY_CODE_INVALID]: "確認コードが正しくないか、有効期限が切れています。",
    [ERR_ACCOUNT_PASSWORD_CURRENT_WRONG]: "現在のパスワードが正しくありません。",
    [ERR_ACCOUNT_PASSWORD_POLICY]: "新しいパスワードが要件を満たしていません。",
    [ERR_ACCOUNT_PASSWORD_REUSED]: "最近使用したパスワードは使用できません。",
    [ERR_ACCOUNT_MFA_STEPUP_REQUIRED]: "続行するには認証アプリのコードを入力してください。",
    [ERR_ACCOUNT_MFA_STEPUP_INVALID]: "認証コードが正しくありません。",
    [ERR_ACCOUNT_MFA_NOT_ENABLED]: "二要素認証が有効になっていません。",
    [ERR_ACCOUNT_MFA_ENROLL_CODE_INVALID]:
      "コードが一致しません。キーを再スキャンしてお試しください。",
    [ERR_ACCOUNT_MFA_PENDING_MISSING]:
      "保留中のセットアップが見つかりません。最初からやり直してください。",
  },
} satisfies Record<Locale, Record<AccountErrorCode, string>>;

registerErrorMessages(accountErrorMessages);
