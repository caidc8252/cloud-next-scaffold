// 通知域跨模块服务端入口：仅暴露被其他模块消费的能力。
// 当前消费者：users 模块（createNotice，业务事件埋点）。
export { createNotice } from "./notification.service";
