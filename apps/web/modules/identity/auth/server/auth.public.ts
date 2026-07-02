// auth 域跨模块服务端入口。消费者:lib/session-snapshot(契约有效性 + 适用角色筛选)。
export * from "./contract-validity";
export { buildDevAuthBypassSession, buildSessionAndRedirect } from "./auth.service";
export { selectApplicableRoles } from "./role-selection";
export { ERR_AUTH_ENCRYPTION_INVALID, ERR_AUTH_REQUEST_EXPIRED } from "../error/auth.error-codes";
