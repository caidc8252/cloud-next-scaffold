# env 配置规范（`@cloud/config`）

> 归属：所有**来源于环境变量**的配置，集中在 `@cloud/config`，**单入口 `getConfig()`** 按领域访问。**新增 / 修改 env 配置、读运行期密钥或阈值前必读。** 判断一个值该不该进 env，先走下面的决策口诀。

## 〇、现状与目标

当前代码仍是 `getEnv()`（少数变量）+ `getAuthConfig()`（仅 RSA/AES 密钥）**双入口**——存在「有的值在 `getEnv`、有的在 `getAuthConfig`」的发现成本。**目标：合并为单入口 `getConfig()`，按领域访问**（本文 §一~§四）。该收口仍 deferred；固定认证策略已收口到 `@cloud/constants`（单一真源）。

## 决策口诀（env / constants / app / 能力包）

> 来源是 **env** 吗？→ 是：`@cloud/config`（本文）。
> 否（来源在代码）→ 它带**校验 / 生成 / 按上下文现算**吗？→ 是：它是**能力**，给独立包（如 manifest = `@cloud/platform-config`）。
> 否（纯惰性值）→ **跨 app 共享**吗？→ 是：`packages/constants`；否：`apps/*/lib/constants`。

constants 侧规范见 `.claude/docs/constants.md`；Redis key 见 `.claude/docs/redis-keys.md`。

## 一、单入口：`getConfig()`，按领域访问

**一条规则讲完：所有服务端配置走 `getConfig()`，按领域点进去——`getConfig().<域>.<字段>`。没有第二个入口。**

```ts
getConfig().auth.aesSecretKey       // 整形过的领域配置
getConfig().auth.timestampWindowMs
getConfig().db.url
getConfig().cache.redisUrl
getConfig().app.name
```

`getConfig()` 返回一个 typed 对象 `Config`，autocomplete 直接展开所有域和字段——AI 只需学一个类型，人只需记一个动词。读 env 的模块**顶部 `import "server-only"`**；`getConfig()` 读一次缓存到底，改 env 要**重启进程**才生效。

## 二、结构：领域自带子 schema，合并全量；文件按需生长

```
packages/config/src/
  domains/
    auth.ts    // 唯一够格独立：authEnvSchema + toAuthConfig + AuthConfig 类型
  schema.ts    // auth 子 schema 合并其余零散变量 → 完整 envSchema（不会再"漏变量"）
  index.ts     // getConfig() 单入口
```

```ts
// schema.ts —— 每个 env 变量必属于某域子 schema 或在此登记，合起来 = 全量
export const envSchema = authEnvSchema.merge(
  z.object({
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    NEXT_PUBLIC_APP_NAME: z.string().min(1),
  }),
);

// index.ts —— auth 走整形函数，其余直通值直接分组映射
import "server-only";
let cached: Config | null = null;
export function getConfig(): Config {
  if (!cached) {
    const env = envSchema.parse(process.env);   // 全量一次性校验，坏配置启动期炸
    cached = {
      auth:  toAuthConfig(env),                 // toAuthConfig 接收"已校验的 env"，做 RSA 解码 / 秒→ms
      db:    { url: env.DATABASE_URL },
      cache: { redisUrl: env.REDIS_URL },
      app:   { name: env.NEXT_PUBLIC_APP_NAME },
    };
  }
  return cached;
}
```

- **升格规则**：一个域升格成 `domains/<域>.ts` 的门槛是 **≥2 个变量** 或 **需要整形逻辑**。`auth` 够格（多字段 + RSA 解码 + 秒→ms）；`db`/`cache`/`app` 现在各一个直通值、零整形 → 不开文件，schema 行与映射直接写在 `schema.ts`/`index.ts`。某域长到第 2 个变量或开始要整形，**那时**才抽文件，不预先抽。
- **返回分组保留**（哪怕单值）：整个方案的卖点就是 `getConfig().<域>.<字段>` **一种**形状；若 auth 是 `.auth.x` 而 db 拍平成 `.databaseUrl`，又把「这值是哪种形式」的疑惑请回来了。分组成本只在 index.ts 多一层 key（近乎零），而 db/cache 注定会长字段（`directUrl`、连接池、默认 TTL…），现在分组将来加字段不动调用点。

## 三、新增一个 env 变量（两步，规约化）

1. 在对应 `domains/<域>.ts` 的子 schema 加一行（带 zod 约束）；该域还没文件、是直通值，就加到 `schema.ts` 的零散块。
2. 在 `getConfig()` 的返回结构里映射到对应域；需整形就在 `toXxxConfig` 里转（单位进名）。

没有「该加到 `getEnv` 还是 `getAuthConfig`」的抉择——**按域，只有一个地方。**

## 四、校验：带约束，启动期炸

zod 不只校验类型，要带约束：`.coerce`、`.int().positive()`、`.min() / .max()`、`z.enum()`、`.default()`。**坏配置在启动期就 fail。**

> Trade-off：合并 schema = 任何进程启动都要求**全量 env 齐备**（某 worker 不用 RSA 也得设 `AUTH_*`）。默认推荐合并 + 启动期全量（fail-fast、最简）。若确有 app 合法用不到某域，再降级为**按域懒校验**（`getConfig().auth` 首次访问才 parse `authEnvSchema`），代价是失去「启动期一次炸全部」。

## 五、命名与单位

### key 前缀（运维规范：标识使用范围）

key 一律 UPPER_SNAKE；前缀按「这个值属不属于某个第三方服务的域」划界：

- **第三方服务 / 基础设施**（DB / Redis / S3 / AWS … 的连接串**或**其配置）→ **不加前缀**，用该服务标准名：`DATABASE_URL`、`REDIS_URL`、`AWS_S3_MAX_SIZE_BYTES`。我们不拥有这些命名空间，且工具按名读（Prisma 认 `DATABASE_URL`）。
- **应用自己的参数**（认证 / 会话 / 应用地址 … 任何不属于某外部服务域的值）→ 加 **`NEXT_`** 前缀，后接领域段：`NEXT_AUTH_AES_SECRET_KEY`、`NEXT_SESSION_COOKIE_DOMAIN`、`NEXT_PORTAL_URL`。
- **公开且客户端要读**的值 → `NEXT_PUBLIC_`（见 §六，注意是「构建期内联」语义，**不是**「非敏感」）。
- **判据一句话**：属于某第三方服务的域吗？是 → 不加前缀；否 → `NEXT_`（公开且客户端读再升 `NEXT_PUBLIC_`）。

### shaped 字段 + 单位

- **shaped 字段**：camelCase（`aesSecretKey`、`timestampWindowMs`）。
- **有量纲必带单位**：env 用人类友好单位、内部统一基准单位，**转换只在整形函数里做一次**：

```ts
// env: NEXT_FOO_WINDOW_SECONDS（秒，友好） → 整形函数转成内部基准
fooWindowMs: env.NEXT_FOO_WINDOW_SECONDS * 1000,  // 时间一律收敛到 ms
```

  单位进 env key 名，也进 shaped 字段名。

## 六、密钥与暴露面

- **密钥 / 私钥 / 连接串只进 env + server-only**；绝不进 `packages/constants` 或 app 配置。
- `NEXT_PUBLIC_*` 的语义是**「构建期内联进客户端 bundle」**，不是「非敏感」：只给**客户端组件真要读、且能接受 build 时烤死**（改值需重新 build，不是改 env 重启）的公开值。公网地址若只服务端用，保持 `NEXT_` 前缀的普通服务端变量，别升 `NEXT_PUBLIC_`。
- 非 `NEXT_PUBLIC_` 变量**不准被 client 组件 import**；client 侧只用 `process.env.NEXT_PUBLIC_*`，`getConfig()` 是 server-only。
- **密钥护栏**：应用密钥带 `NEXT_` 前缀（如 `NEXT_AUTH_LOGIN_RSA_PRIVATE_KEY`），离 `NEXT_PUBLIC_` 只差一个词。配一条 test 强制兜底——**名字含 `PRIVATE_KEY` / `SECRET` / `_KEY` 的变量，绝不得以 `NEXT_PUBLIC_` 开头**，防手滑把密钥发进 bundle。

## 七、横切铁律（env 与 constants 共用）

1. **单一真源**：一个值只定义一次；**禁止把默认值跨层抄**（env 一份、const 再抄一份）。真源在 env 的值，不准在 constants 里再声明。
2. **下游禁魔法数 / 魔法串**：要 `60 * 60 * 1000` 就给它命名。
3. **有量纲必带单位**（时间 / 字节 / 金额 / 百分比），单位进名。

## 八、迁移

调用点机械替换：`getEnv().X` → `getConfig().<域>.X`；`getAuthConfig()` → `getConfig().auth`。按「不留 back-compat 转换层」的偏好，迁完直接删旧的两个 getter（迁移期可临时留 `export const getAuthConfig = () => getConfig().auth` 一行壳，迁完即删）。

## 一个已收口的反例（保留作示范）

密码策略阈值曾同时存在于 env(`AUTH_PASSWORD_*`) 和 `PASSWORD_POLICY` 常量两处、且已分裂（执行端锁 30 分钟、UI 却显示 60）。现已收口到 `@cloud/constants` 单一真源（`PASSWORD_POLICY` + `LOGIN_TIMESTAMP_WINDOW_MS`）——这正是「单一真源、固定策略不进 env」的范例。
