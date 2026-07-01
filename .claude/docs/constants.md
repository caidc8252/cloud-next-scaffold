# 常量规范（`packages/constants` / `apps/*/lib/constants`）

> 归属：**来源于代码、纯惰性**的固定值与业务字典。**新增枚举 / 字典 / 策略常量前必读。**

## 决策口诀（env / constants / app / 能力包）

> 来源是 **env** 吗？→ 是：`@cloud/config`（见 `.claude/docs/env-config.md`）。
> 否（来源在代码）→ 它带**校验 / 生成 / 按上下文现算**吗？→ 是：它是**能力**，给独立包（如 manifest = `@cloud/platform-config`）。
> 否（纯惰性值）→ **跨 app 共享**吗？→ 是：`packages/constants`（本文）；否：`apps/*/lib/constants`。

## 一、什么进 constants

- **只放惰性值**：import 即读、无行为。
- **带行为（校验 / 生成 / 按上下文现算）就不是 constant**——它是能力，给独立包。例：菜单 / 权限 / 角色不是常量，是 CoC 声明子系统（`@cloud/platform-config`，见 `.claude/docs/coc-declaration.md`），它有 codegen、生成期校验、运行时 resolver。
- **跨 app 共享 → `packages/constants`；只属单 app → `apps/*/lib/constants`**。

## 二、组织：按领域分文件，不按可调整性

按领域分文件（如 `country.ts` / `status.ts` / `device.ts`）。**别按「固定枚举 vs 可调整参数」分**——那个轴主观、不稳定，会让人每加一个值都纠结放哪。静态可调整的业务参数也是 const，改它 = 改代码重新部署，和枚举在机制上没区别。

## 三、命名

- 顶层导出常量：UPPER_SNAKE（`PASSWORD_POLICY`）。
- 对象字段：camelCase（`minLength`）。
- 布尔：`is/has/can/enable` 开头 + 正向措辞（`enableMfa`，别 `mfaDisabled`）。
- 跨 DB 边界的字符串枚举值：**对齐 DB 规范形**（如 ContractType「全大写 + 连字符」）。
- 金额：整数最小单位（分）+ 币种，禁 float。

## 四、对象 vs 扁平

整体被消费的领域概念**保持 typed 对象**。例 `PASSWORD_POLICY`：UI 整份渲染、可整体序列化下发给前端、带 `PasswordPolicy` 类型——扁平成九个散常量就丢了类型、也没法整体传递。要单值时在边缘 pluck：

```ts
export const PW_MIN = PASSWORD_POLICY.minLength;
```

不要把一个内聚概念拆成 N 个散常量；也不要为了「看起来分门别类」而过度拆分。

## 五、横切铁律（env 与 constants 共用）

1. **单一真源**：一个值只定义一次；**禁止把默认值跨层抄**。若一个值真源在 env，**不准**在 constants 里再声明一份；反之固定策略（如 `PASSWORD_POLICY`）只在 constants 定义，不在 env 留副本。
2. **下游禁魔法数 / 魔法串**：要 `60 * 60 * 1000` 就给它命名。
3. **有量纲必带单位**（时间 / 字节 / 金额 / 百分比），单位进名。
