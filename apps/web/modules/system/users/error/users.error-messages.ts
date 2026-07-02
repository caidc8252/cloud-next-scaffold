import "server-only";

import type { Locale } from "@cloud/i18n";
import { registerErrorMessages } from "@cloud/request/server";
import {
  ERR_USER_CANCEL_NOT_PENDING,
  ERR_USER_CANNOT_DISABLE_SELF,
  ERR_USER_EMAIL_INVALID,
  ERR_USER_EMAIL_TAKEN,
  ERR_USER_NO_PENDING_INVITE,
  ERR_USER_NOT_FOUND,
  ERR_USER_PROTECTED,
  ERR_USER_RESET_PW_PENDING,
} from "./users.error-codes.ts";

type UsersErrorCode =
  | typeof ERR_USER_EMAIL_INVALID
  | typeof ERR_USER_EMAIL_TAKEN
  | typeof ERR_USER_NOT_FOUND
  | typeof ERR_USER_RESET_PW_PENDING
  | typeof ERR_USER_NO_PENDING_INVITE
  | typeof ERR_USER_CANCEL_NOT_PENDING
  | typeof ERR_USER_PROTECTED
  | typeof ERR_USER_CANNOT_DISABLE_SELF;

const usersErrorMessages = {
  en: {
    [ERR_USER_EMAIL_INVALID]: "A valid email address is required.",
    [ERR_USER_EMAIL_TAKEN]: "This email address is already in use.",
    [ERR_USER_NOT_FOUND]: "User not found.",
    [ERR_USER_RESET_PW_PENDING]: "A password reset is already pending for this user.",
    [ERR_USER_NO_PENDING_INVITE]: "This user has no pending invitation.",
    [ERR_USER_CANCEL_NOT_PENDING]: "Only pending invitations can be cancelled.",
    [ERR_USER_PROTECTED]: "This user is protected and cannot be modified.",
    [ERR_USER_CANNOT_DISABLE_SELF]: "You cannot disable your own account.",
  },
  "zh-CN": {
    [ERR_USER_EMAIL_INVALID]: "请输入有效的邮箱地址。",
    [ERR_USER_EMAIL_TAKEN]: "该邮箱地址已被使用。",
    [ERR_USER_NOT_FOUND]: "用户不存在。",
    [ERR_USER_RESET_PW_PENDING]: "该用户已有待处理的密码重置请求。",
    [ERR_USER_NO_PENDING_INVITE]: "该用户没有待处理的邀请。",
    [ERR_USER_CANCEL_NOT_PENDING]: "只能取消待处理的邀请。",
    [ERR_USER_PROTECTED]: "该用户受保护，无法修改。",
    [ERR_USER_CANNOT_DISABLE_SELF]: "不能停用你自己的账号。",
  },
  ja: {
    [ERR_USER_EMAIL_INVALID]: "有効なメールアドレスを入力してください。",
    [ERR_USER_EMAIL_TAKEN]: "このメールアドレスは既に使用されています。",
    [ERR_USER_NOT_FOUND]: "ユーザーが見つかりません。",
    [ERR_USER_RESET_PW_PENDING]: "このユーザーには保留中のパスワードリセットがあります。",
    [ERR_USER_NO_PENDING_INVITE]: "このユーザーに保留中の招待はありません。",
    [ERR_USER_CANCEL_NOT_PENDING]: "保留中の招待のみキャンセルできます。",
    [ERR_USER_PROTECTED]: "このユーザーは保護されているため変更できません。",
    [ERR_USER_CANNOT_DISABLE_SELF]: "自分のアカウントは無効化できません。",
  },
} satisfies Record<Locale, Record<UsersErrorCode, string>>;

registerErrorMessages(usersErrorMessages);
