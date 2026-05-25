import "server-only";

export class AuthzError extends Error {
  readonly status: 401 | 403;
  readonly code: "unauthenticated" | "forbidden";
  readonly missing?: string[];

  constructor(
    status: 401 | 403,
    code: "unauthenticated" | "forbidden",
    missing?: string[],
  ) {
    super(code);
    this.name = "AuthzError";
    this.status = status;
    this.code = code;
    this.missing = missing;
  }
}
