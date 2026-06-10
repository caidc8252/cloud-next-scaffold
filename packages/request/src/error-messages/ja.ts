import type { ErrorMessages } from "./index.ts";
import {
  ERR_BAD_REQUEST,
  ERR_UNAUTHORIZED,
  ERR_FORBIDDEN,
  ERR_NOT_FOUND,
  ERR_INTERNAL,
  ERR_INVALID_JSON,
  ERR_INVALID_ID,
  ERR_USER_EMAIL_INVALID,
  ERR_USER_EMAIL_TAKEN,
  ERR_USER_NOT_FOUND,
  ERR_USER_RESET_PW_PENDING,
  ERR_USER_NO_PENDING_INVITE,
  ERR_USER_CANCEL_NOT_PENDING,
  ERR_USER_PROTECTED,
  ERR_USER_CANNOT_DISABLE_SELF,
  ERR_ROLE_NOT_FOUND,
  ERR_ROLE_NAME_SHORT,
  ERR_ROLE_DELETE_BUILTIN,
  ERR_ROLE_DELETE_ASSIGNED,
  ERR_MW_DB,
  ERR_MW_CACHE,
  ERR_MW_MAIL,
  ERR_MW_UNKNOWN,
} from "../error-codes.ts";

// 中间件类四码共用同一句通用文案:差异只在 code(给开发/日志),不在文案(给客户)。
const MW_UNAVAILABLE = "サービスを一時的にご利用いただけません。後ほどお試しください。";

export const ja: ErrorMessages = {
  // 共通
  [ERR_BAD_REQUEST]: "リクエストが不正です。",
  [ERR_UNAUTHORIZED]: "認証が必要、またはセッションの有効期限が切れています。",
  [ERR_FORBIDDEN]: "この操作を行う権限がありません。",
  [ERR_NOT_FOUND]: "リソースが見つかりません。",
  [ERR_INTERNAL]: "サーバー内部エラーが発生しました。",
  [ERR_INVALID_JSON]: "リクエスト本文が正しい JSON ではありません。",
  [ERR_INVALID_ID]: "指定された ID が無効です。",
  // ユーザー
  [ERR_USER_EMAIL_INVALID]: "有効なメールアドレスを入力してください。",
  [ERR_USER_EMAIL_TAKEN]: "このメールアドレスは既に使用されています。",
  [ERR_USER_NOT_FOUND]: "ユーザーが見つかりません。",
  [ERR_USER_RESET_PW_PENDING]: "このユーザーには保留中のパスワードリセットがあります。",
  [ERR_USER_NO_PENDING_INVITE]: "このユーザーに保留中の招待はありません。",
  [ERR_USER_CANCEL_NOT_PENDING]: "保留中の招待のみキャンセルできます。",
  [ERR_USER_PROTECTED]: "このユーザーは保護されているため変更できません。",
  [ERR_USER_CANNOT_DISABLE_SELF]: "自分のアカウントは無効化できません。",
  // ロール
  [ERR_ROLE_NOT_FOUND]: "ロールが見つかりません。",
  [ERR_ROLE_NAME_SHORT]: "ロール名が短すぎます。",
  [ERR_ROLE_DELETE_BUILTIN]: "組み込みロールは削除できません。",
  [ERR_ROLE_DELETE_ASSIGNED]: "ユーザーが割り当てられているロールは削除できません。",
  // ミドルウェア / インフラ（顧客向けは統一文言、開発は code で区別）
  [ERR_MW_DB]: MW_UNAVAILABLE,
  [ERR_MW_CACHE]: MW_UNAVAILABLE,
  [ERR_MW_MAIL]: MW_UNAVAILABLE,
  [ERR_MW_UNKNOWN]: MW_UNAVAILABLE,
};
