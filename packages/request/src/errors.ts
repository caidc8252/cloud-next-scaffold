// 可抛异常基类与子类。纯类、同构(server 业务代码 throw,api-kit mapper 用 instanceof 识别)。
// 文案不在异常里:展示文案一律由 code 经错误码注册表本地化得出,params 仅供 {name} 占位插值。

// 业务异常允许的 HTTP 状态:面向用户的 40x。401/403 一般交给 AuthzError,业务里少用。
export type BusinessStatus = 400 | 401 | 403 | 404 | 409 | 422;

// i18n 命名占位参数(只支持 {name} 替换,不支持 ICU 复数/选择)。
export type ErrorParams = Record<string, string | number>;

export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly status: number;
  abstract readonly params?: ErrorParams;
}

// ① 业务异常:由业务代码 throw,默认 40x。code 走 PMMNNN 数字码。
export class BusinessError extends AppError {
  constructor(
    readonly code: string,
    readonly status: BusinessStatus = 400,
    readonly params?: ErrorParams,
  ) {
    super(code);
    this.name = "BusinessError";
  }
}

// ③ 中间件异常:DB / Redis / 邮件等基础设施故障,统一 503 + 通用文案(对客户不透明)。
// code 走 ERR_MW_* (Module 90);开发凭 code + traceId 在日志里识别具体中间件。
export class MiddlewareError extends AppError {
  readonly status = 503;
  readonly params = undefined;

  constructor(readonly code: string) {
    super(code);
    this.name = "MiddlewareError";
  }
}
