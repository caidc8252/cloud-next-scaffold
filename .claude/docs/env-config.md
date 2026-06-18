# env 配置规范（`@cloud/config`）

> 归属：所有**来源于环境变量**的配置，集中在 `@cloud/config`，**单入口 `getConfig()`** 访问。**新增 / 修改 env 配置、读运行期密钥前必读。**

## 决策口诀（env / constants / app / 能力包）

> 来源是 **env** 吗？→ 是：`@cloud/config`（本文）。
> 否（来源在代码）→ 带**校验 / 生成 / 按上下文现算**？→ 是：它是**能力**，独立包（如 manifest = `@cloud/platform-config`）。
> 否（纯惰性值）→ **跨 app 共享**？→ 是：`packages/constants`；否：`apps/*/lib/constants`。

constants 见 `.claude/docs/constants.md`；Redis key 见 `.claude/docs/redis-keys.md`。

## 一、单入口：`getConfig()`，按领域访问

**一条规则：所有服务端配置走 `getConfig().<ENV_VAR_NAME>`，没有第二个入口。** server-only。
**字段名一字不差对齐 env 变量名**——grep 一个 env 名即可定位 schema + 所有消费点。

```ts
getConfig().NEXT_AUTH_LOGIN_RSA_PRIVATE_KEY   // RSA 私钥（已解码成 DER 结构；键名对齐 env 源）
getConfig().NEXT_AUTH_AES_SECRET_KEY
getConfig().REDIS_URL
getConfig().NEXT_PUBLIC_APP_NAME
```

## 二、结构：扁平 env 名字段，内部按域惰性解析

```
packages/config/src/
  auth.ts    // authEnvSchema + parseAuthConfig（RSA 解码等整形；内部用）
  index.ts   // getConfig()：扁平 env 名字段 getter，内部按 auth / cache / app 分组惰性 parse
```

- **公开字段扁平、= env 变量名**；内部仍按域惰性 parse + 缓存：取 `REDIS_URL` 只校验 cache schema，不会因 `AUTH_` 密钥缺失而失败；每域首次访问 parse 一次（改 env 要重启）。
- **整形值**（如 RSA 私钥解码成 DER）在 `parseAuthConfig` 里做，键名仍对齐 env 源（`NEXT_AUTH_LOGIN_RSA_PRIVATE_KEY`）。
- **app 互链基址**（`NEXT_PORTAL_URL` / `NEXT_ADMIN_URL` / `NEXT_CUSTOMER_URL` / `NEXT_MERCHANT_URL`）走 `resolveAppUrl(envKey, devFallback?)`：显式 env 优先（校验 http/https）→ 生产缺值硬抛 → 本地 dev 缺值兜底 `http://127.0.0.1:<port>`（merchant 无兜底）；跨 app 路由路径常量在 `@cloud/constants`。
- **`db` 不在此**：`@cloud/db` 自己读 + 校验 `DATABASE_URL` / `PGBOUNCER_DATABASE_URL`。

## 三、新增一个 env 变量

1. 进对应域的 zod schema，带约束（`.min()`、`z.coerce.number().int().positive()`、`z.enum()`、`.default()` …）。
2. 在 `getConfig()` 的对应域里映射；需整形（解码 / 单位换算）就在那里做一次。

## 四、命名与单位

**key 前缀（运维规范）**——按「属不属于某第三方服务的域」划界：

- 第三方服务 / 基础设施（DB / Redis / S3 / AWS）→ **不加前缀**，用其标准名（`DATABASE_URL`、`REDIS_URL`、`AWS_S3_MAX_SIZE_BYTES`）。
- 应用自有参数（认证 / 会话 / 应用地址）→ 加 **`NEXT_`** 前缀（`NEXT_AUTH_AES_SECRET_KEY`、`NEXT_SESSION_COOKIE_DOMAIN`、`NEXT_PORTAL_URL`）。
- 公开且客户端要读 → `NEXT_PUBLIC_`（构建期内联语义，非「非敏感」；见 §五）。

**config 字段名 = env 变量名**（含 shaped 值——解码后的 RSA 键名仍是 `NEXT_AUTH_LOGIN_RSA_PRIVATE_KEY`），便于全局索引。**单位**：env 用友好单位（秒/分钟），整形时转内部基准（时间一律 ms），单位进 env key 名。

## 五、密钥与暴露面

- **密钥 / 私钥 / 连接串只进 env + server-only**；绝不进 `packages/constants` 或 app 配置。
- `NEXT_PUBLIC_*` = **构建期内联进 client bundle**（非「非敏感」）：仅客户端真要读、且能接受 build 时烤死的公开值。公网地址若只服务端用，保持普通 `NEXT_` 服务端变量。
- 非 `NEXT_PUBLIC_` 不准被 client import；`getConfig()` 是 server-only。
- **密钥护栏 test**：名字含 `PRIVATE_KEY` / `SECRET` / `_KEY` 的变量，绝不得以 `NEXT_PUBLIC_` 开头。

## 六、横切铁律（env 与 constants 共用）

1. **单一真源**：一个值只定义一次；禁止跨层抄默认值。真源在 env 的值不准在 constants 再声明。
2. **下游禁魔法数 / 魔法串**：要 `60 * 60 * 1000` 就命名。
3. **有量纲必带单位**（时间 / 字节 / 金额 / 百分比），单位进名。

## 待办

- env 变量 `NEXT_` 改名剩余项：`SESSION_COOKIE_DOMAIN`→`NEXT_SESSION_COOKIE_DOMAIN`（改部署变量名，协调部署后再做）；app URL 与 `NEXT_AUTH_*` 已改完。
- `SESSION_COOKIE_DOMAIN`（permissions）、email 的 `NEXT_PUBLIC_APP_NAME ?? "PEP"`：仍待并入 `getConfig()`。
- `@cloud/db` / `@cloud/log` 直接读 env：capability-ownership 待议。
