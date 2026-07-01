// 角色域跨模块服务端入口：仅暴露被其他模块消费的能力与类型。
// 当前消费者：users 模块（listAssignableRoles 用于"可分配角色"）。
export { listAssignableRoles } from "./roles.service";
export type { Role } from "../schema/roles.types";
