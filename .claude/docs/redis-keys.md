# Redis Key 规范（namespace + TTL）

> 归属：Redis key 的**命名空间分配**与 **TTL 常量**集中在 `@cloud/cache` 的 `redis-core/`；**key builder 贴着调用方**。**新增任何 Redis key 前必读**（哪怕只是一行 `kv.set("...")`）。

## 〇、现状与目标

`redis-core/` 为**待建**模块；现有 key builder 散落在 `packages/permissions`、`apps/*/lib`，前缀大小写不一、`pwreset:` / `auth:login-mfa:` 在 admin 与 portal 各定义一遍。本文是**目标约定**，新代码按此写，旧代码逐步迁。

## 一、为什么集中

admin / portal 共用一个 Redis（同 `REDIS_URL`），撞名风险真实存在。集中两样东西即可根治：**命名空间分配**（防撞）+ **TTL 常量**（统一维护、可审计）。**只集中这两样**，builder 仍贴调用方——不引入 factory，不加 env 段（环境隔离靠各环境独立 Redis 实例）。

## 二、结构（`packages/cache/src/redis-core/`）

```
namespace.ts   // REDIS_NS：按业务域分组的命名空间唯一清单（防撞 + 容量审计）
ttl.ts         // TTL 常量（秒，单位进名）
keys.ts        // 仅放「共享但无公共包归属」的 builder（兜底，可空）
index.ts
```

## 三、namespace.ts：按业务域分组

每个值 = `<业务域>:<名>`，**第一段恒为业务域** → 跨域天然不撞；`REDIS_NS` 按域嵌套镜像这个结构。登录 / 权限 / 会话统一挂 `auth:`，免得业务范围分不清。

```ts
// Redis 命名空间唯一分配表，按业务域分组。
// 规则：每个值 = "<域>:<名>"，第一段恒为业务域 → 跨域天然不撞；
// 新增 key 进对应域子对象即可，同域内撞名当场可见。
export const REDIS_NS = {
  auth: {
    session:        "auth:session",
    sessionHandoff: "auth:session-handoff",
    loginMfa:       "auth:login-mfa",
    loginNonce:     "auth:login-nonce",
    // ≈ 72h 内未消费的重置请求数 ← 唯一会累积的大容量 key，容量评估只盯它
    pwReset:        "auth:pwreset",
    verify:         "auth:verify",
  },
  // device:   { ... },
  // customer: { ... },
} as const;
```

- **命名**：全小写、`:` 分隔、`<域>:<名>`。
- **容量注释**：只有**会累积的大容量 key** 才注，且写**量级公式**（`n × m`），不写会过期的精确值；短 TTL 自然过期的 key 不注。

## 四、ttl.ts：TTL 常量

```ts
export const TTL = {
  AUTH_SESSION_SECONDS:         1800,        // 30m
  AUTH_SESSION_HANDOFF_SECONDS:   60,
  AUTH_LOGIN_MFA_SECONDS:        300,        // 5m
  AUTH_LOGIN_NONCE_SECONDS:      130,
  AUTH_PW_RESET_SELF_SECONDS:  60 * 60,      // 自助 1h
  AUTH_PW_RESET_ADMIN_SECONDS: 72 * 60 * 60, // 管理员代发 72h（业务要求）
  AUTH_VERIFY_CODE_SECONDS:      600,        // 10m
} as const;
```

- **扁平、变量名带业务域前缀**（`AUTH_…`，与 `REDIS_NS` 同源对照：`REDIS_NS.auth.session` ↔ `TTL.AUTH_SESSION_SECONDS`）+ **单位进名**（`_SECONDS`）。
- **同一个 key 可有多个 TTL**：TTL 是**写入时**的属性，不焊死在 key 上。如 `auth:pwreset` 同一 keyspace、同一消费者，按写入方 `source` 选不同 TTL。

## 五、builder 放哪（贴调用方）

1. 消费者在**公共包** → builder 进那个公共包。`session / handoff / mfa / nonce / pwreset` 被 auth 流程消费 → `@cloud/permissions`。
2. 消费者只在**单个 app** → builder 留该 app（`apps/*/lib`）。
3. 跨 app 共享但**无公共包归属** → 放 `redis-core/keys.ts` 兜底。

builder 是普通函数，引用 `REDIS_NS` + `TTL`：

```ts
import { REDIS_NS, TTL } from "@cloud/cache/redis-core";
const sessionKey = (sid: string) => `${REDIS_NS.auth.session}:${sid}`;
await kv.set(sessionKey(sid), data, TTL.AUTH_SESSION_SECONDS);
```

## 六、共享 key：收口到一个属主

跨 app 共享的 key，**builder + value 契约**都定义一次、放共享属主（如 `@cloud/permissions`），各生产 / 消费方 import 同一份，避免「两边各抄一份、形状或 TTL 偷偷分叉」。

`auth:pwreset` 拓扑（已确认）：admin 生产（`source:"admin"`，72h）、portal 生产（`source:"self-service"`，1h）、**portal 唯一消费**（凭 token 一次读）。所以 namespace **不能按用途拆**——消费者手里只有 token、不知 source，拆了就得多读：

```ts
// @cloud/permissions —— key builder + value 契约 一处定义
export type ResetTokenSource = "self-service" | "admin";
export type ResetTokenEntry = { userId: number; source: ResetTokenSource };
export const passwordResetKey = (token: string) => `${REDIS_NS.auth.pwReset}:${token}`;
// 生产按 source 选 TTL（TTL.PW_RESET_ADMIN_SECONDS / TTL.PW_RESET_SELF_SECONDS）
// 消费：kv.get<ResetTokenEntry>(passwordResetKey(token))
```

## 七、防撞纪律（命门）

命名空间清单只有在**人人都 import `REDIS_NS`、绝不硬编码前缀**时才防得住撞。配一条极简 test 兜底：

```ts
// ① 所有 namespace 值全局唯一；
// ② 每个值以其所属域 key 开头（REDIS_NS.auth.* 必须以 "auth:" 开头）。
// 新增 key 写错域 / 撞名，跑 test 立刻红。
```
