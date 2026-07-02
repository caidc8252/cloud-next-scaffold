import "server-only";

// 饿汉注册所有 app 业务域错误文案。
// 业务域 code（auth 等）的三语文案不在 @cloud/request 通用包内，靠 registerErrorMessages
// 注入。若只在对应 route 顶部 side-effect import，纯页面请求（不经过该 route）时
// next-intl 的 errors 命名空间与服务端响应辅助都拿不到这些文案。这里集中 import 一次，
// 由 i18n/request.ts（每个请求都跑）在顶部引入，保证读取前一定已注册。
// 新增业务域文案模块时，往这里加一行 import 即可。
import "@/modules/identity/auth/error/auth.error-messages.ts";
import "@/modules/identity/account/error/account.error-messages.ts";
import "@/modules/identity/onboarding/error/onboarding.error-messages.ts";
import "@/modules/identity/forgot-password/error/forgot.error-messages.ts";
import "@/modules/system/users/error/users.error-messages.ts";
import "@/modules/system/roles/error/roles.error-messages.ts";
