// 用户域跨模块服务端入口：仅暴露被其他模块消费的类型。
// 当前消费者：roles 模块 UI（User 类型）。
export type { User } from "../schema/users.types";
