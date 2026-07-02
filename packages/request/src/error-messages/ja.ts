import type { ErrorMessages } from "./index.ts";
import {
  ERR_BAD_REQUEST,
  ERR_UNAUTHORIZED,
  ERR_FORBIDDEN,
  ERR_NOT_FOUND,
  ERR_INTERNAL,
  ERR_INVALID_JSON,
  ERR_INVALID_ID,
  ERR_TOO_MANY_REQUESTS,
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
  [ERR_TOO_MANY_REQUESTS]: "リクエストが多すぎます。しばらくしてから再試行してください。",
  // ミドルウェア / インフラ（顧客向けは統一文言、開発は code で区別）
  [ERR_MW_DB]: MW_UNAVAILABLE,
  [ERR_MW_CACHE]: MW_UNAVAILABLE,
  [ERR_MW_MAIL]: MW_UNAVAILABLE,
  [ERR_MW_UNKNOWN]: MW_UNAVAILABLE,
};
