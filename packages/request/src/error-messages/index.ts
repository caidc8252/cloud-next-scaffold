import * as codes from "../error-codes.ts";
import { en } from "./en.ts";
import { zhCN } from "./zh-CN.ts";
import { ja } from "./ja.ts";

// 所有错误码取值的联合类型，从 error-codes 的导出直接推导，新增 code 自动纳入，
// 各 locale 文件缺翻译会编译报错。错误码是接口协议，这里只负责展示文案。
export type ErrorCode = (typeof codes)[keyof typeof codes];

export type ErrorMessages = Record<ErrorCode, string>;

// locale -> (错误码 -> 文案)。locale 清单与 @cloud/i18n 保持一致（en / zh-CN / ja）；
// 增删语言时同步增删此处的 locale 文件，避免和 i18n 包漂移。
export const errorMessages = {
  en,
  "zh-CN": zhCN,
  ja,
} satisfies Record<string, ErrorMessages>;

// 取指定 locale 的错误文案；未知 locale 回退英文，与 i18n 的英文基底策略一致。
export function getErrorMessages(locale: string): ErrorMessages {
  return (errorMessages as Record<string, ErrorMessages>)[locale] ?? errorMessages.en;
}
