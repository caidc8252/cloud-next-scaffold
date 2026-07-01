// auth 域跨模块服务端入口。消费者:lib/session-snapshot(契约有效性 + 适用角色筛选)。
export * from "./contract-validity";
export { selectApplicableRoles } from "./role-selection";
