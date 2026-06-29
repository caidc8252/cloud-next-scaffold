# 单 app + modules 迁移 / CoC / 编排 —— 总体设计

> 状态:Step 0 契约已定稿;**Step 1 已完成**;Step 2/3 留骨架占位。当前分支:`feat/new-arch`。
> 原则:**一步一步走,每步结束仓库都可编译、可启动、可跑测试。**

## 目标与哲学

把仓库从 `admin / portal / customer` 三个 Next app 收口成**唯一一个 Next app `web`**:

- 不再用"应用"区分 admin / merchant / customer 平台,**功能只由权限契约控制**。
- `admin` 改名 `web`;`portal` **解散**(页面与接口按功能并入);`customer` **删除**(代码不要)。
- `app/` 只剩**路由薄壳**(route group + layout + 一行 `export`);**所有业务**下沉 `web/modules/<cat>/<mod>`——它就是原来的 `service`,只是把**页面**和 **API controller** 也搬了进来。

最终分三段达成:**结构迁移 → CoC 声明系统 → 项目编排系统**。本设计先把第一段(结构)钉死,后两段留接口。

## 四步骤骨架

| 步骤 | 内容 | 产出 / 验收 |
|---|---|---|
| **Step 0** 锁定契约 | 定死目录形状、路由薄壳写法、portal/dashboard 映射、命名与边界规则 | 本文档 +(可选)1 个样例模块。**不碰存量,仓库照常可跑(仍 3 app)** |
| **Step 1** 结构迁移 ✅ | admin→web、portal 解散并入、删 customer、lib 去重、存量按契约塞进 modules | **`web` 单 app 能 `next dev`、行为不变、typecheck/lint/单测/e2e 冒烟全绿** |
| **Step 2** CoC 声明系统 | 重设计 per-module manifest 采集/校验/codegen;文案下沉进模块 | 菜单/权限/角色由 manifest 投影;过程保持可跑 |
| **Step 3** 项目编排系统 | 由 manifest 生成 app 薄壳与路径等 | AI 只写 manifest,路径由 codegen 生成 |

---

## Step 0 契约(定稿)

### 1. 顶层布局
```txt
web/
  app/        # 只有薄壳:route group + layout + 一行 export
  modules/    # 全部业务(= 原 service + 页面 + controller)
  lib/        # 单 app 共享(admin/lib 与 portal/lib 去重后落这)
  manifest/   # 现有 app 级 manifest 暂原样迁入,Step 2 重做
  i18n/       # app 级 locale 装配,Step 2 接收模块下沉的文案
```

### 2. 路由分组(surface 只活在这里)

| route group | 来源 | 内容 |
|---|---|---|
| `(portal)` 前台 | 原 `apps/portal` 全部 + 原 `apps/admin/app/(public)` | login、forgot-password、reset-password、onboarding、select-partner、marketing、403、locked |
| `(dashboard)` 后台 | 原 `apps/admin/app/(portal)` **改名** | dashboard、account、notifications、users、roles… |

- `(public)` 不再单独存在,并入 `(portal)`。
- 旧 admin 误导性命名 `(portal)`(其实是后台)纠正为 `(dashboard)`。
- **页面出现在哪个外壳,只由薄壳文件物理放在 `(portal)/` 还是 `(dashboard)/` 决定**;modules 不知道外壳存在。

### 3. 路径规则(无例外,为 AI 稳定性服务)

| 产物 | 规则 |
|---|---|
| 目录 | `modules/<cat>/<mod>`(category 做组织/分组,**进目录、进权限码、进菜单分组,但不进 URL**) |
| 页面 URL | `(portal)/<mod>` 或 `(dashboard)/<mod>` |
| API route | `api/<mod>`(**无 `system`、无 category 段**) |
| 权限码 | `<cat>.<mod>.<fn>.<action>`(Step 2 定形) |
| menuCode | `<cat>.<mod>`(Step 2 定形) |
| module 名 | **全局唯一**(CoC 唯一性校验保证;故 URL/import 用 `<mod>` 不歧义) |

理由:AI 出错根源是"隐式查表"。URL 永不含 category → 写任何路径都不需要记"这个模块属于哪个 cat",零查表。category 只活在三个不进 URL 的地方:目录(物理自证)、权限码、manifest 菜单分组(声明一次,是数据不是推导)。

### 4. API 路径按功能、不带 surface 前缀

`api/auth/* · api/account/* · api/users · api/roles …`。原因:`logout`、`select-partner` 等是**两个外壳共用**的,按 surface 切会割裂归属。**页面分前后台,接口不分。**

### 5. 模块内部形状(能力可选)
```txt
modules/<cat>/<mod>/
  manifest.ts                 # Step 1 仅身份桩(空),真字段留 Step 2
  ui/
    <mod>-page.tsx            # 页面文件直接在 ui 根;RSC 做 requirePermissions + 取数 + 渲染
    components/<mod>-table.tsx # 组件归 components/
  client/<mod>.api.ts         # 客户端调用出口(具名函数);无 public.ts
  server/
    <mod>.controller.ts       # HTTP handlers(GET/POST…),route.ts 再导出它
    <mod>.service.ts          # 业务逻辑
    <mod>.repository.ts        # @cloud/db 访问
    <mod>.mapper.ts           # row ↔ VO
    <mod>.policy.ts           # service 内范围/授权校验
    <mod>.public.ts           # 跨模块服务端唯一入口(纯再导出)
  schema/<mod>.schema.ts      # zod 请求
  schema/<mod>.types.ts       # 响应 VO 类型
  i18n/{en,zh-CN,ja}.ts       # en 基底(Step 1 留空,Step 2 才下沉)
  *.test.ts                   # 就近
```
- 纯服务模块只留 `server/ + schema/`(+按需 i18n)。
- 全仓 **kebab-case** 文件名;分层服务用点段命名(`<mod>.service.ts` 等)。
- 文件直接在 `ui/` 根放页面(不用 `ui/page/` 子目录);组件归 `ui/components/`。

#### 例外：`(portal)` 前台页面不进 modules/ui

`(portal)` 下的模块(auth、forgot-password、onboarding)是**认证 / 注册流程**,改动极低频且高度耦合 UI 状态机。这类模块的 UI 组件**保留在 `app/(portal)/<mod>/_components/` 内**,不迁进 `modules/ui/`。`page.tsx` 可含少量路由级逻辑(如 `getPartialSession()` redirect 检查)。

跨 `(portal)` 页面共用的组件(如 `card-bits`、`password-checklist`)放 `app/(portal)/_components/`,不放 `@cloud/ui`(仅限 portal 上下文使用)。

此规则不适用于 `(dashboard)` 后台模块——后台页面业务逻辑复杂、迭代频繁,**必须**走 `modules/<cat>/<mod>/ui/` + 薄壳。

### 6. 薄壳写法

**`(dashboard)` 后台**——严格薄壳,零逻辑:
```txt
app/(dashboard)/users/page.tsx  → export { UsersPage as default } from "@/modules/identity/users/ui/users-page"
app/api/users/route.ts          → export { GET, POST } from "@/modules/identity/users/server/users.controller"
```
`requirePermissions`/取数在模块的 page RSC 里;HTTP 适配在 controller 里。

**`(portal)` 前台**——允许路由级判断,UI 组件就近放 `_components/`:
```txt
app/(portal)/login/page.tsx     → RSC,做 getPartialSession() 检查后渲染 <LoginScreen />
app/(portal)/login/_components/ → LoginScreen 及子组件(就近,不进 modules)
app/api/auth/password/route.ts  → export { POST } from "@/modules/identity/auth/server/auth.controller"
```
controller 仍在模块里;只有 UI 层留在 route group 内。

### 7. 模块边界纪律

- **server 侧**:别的模块只能 import 你的 `server/<mod>.public.ts`;深 import 内部由 **lint 守门**报错。模块自己的 controller/page 直接 import 自己内部文件,不受限。
- **client 侧**:暂不引入 public.ts;跨模块客户端调用直接走对方的 `client/<mod>.api.ts`(它本就是"调用出口")。
- **UI 组件**默认模块私有;跨模块共享 UI 走 `@cloud/ui`,不在模块间互 import 组件。

### 8. 命名 / 词汇
- 业务目录叫 **`modules`**(不用 `features`),与权限契约词汇(module、`<mod>`、`noticeType=<module>.<event>`)统一。
- manifest 文件名 **`manifest.ts`**(沿用仓库先例)。

---

## Step 1:结构迁移(方向已定,执行时逐模块细化)

### 合并准则
- **lib 冲突 → 以 admin 为主**(真正等价的重复才适用)。
- **identity 服务 → 逐函数对齐**,不无脑 admin 为主:
  - diff 实测:`contract-validity / partner-choices / role-selection / partner-choice` 两边**一字不差**→ 去重成一份。
  - `auth.service.ts` 已分叉,**portal 反而更全**(login-challenge / oidc / sso / idp)→ 登录面以 portal 为准。
  - `mfa.service.ts` admin 更全(完整管理)、portal 只是登录期 verify 子集 → 后台面以 admin 为基,portal verify 作为其一个功能。

### portal 解散落点(identity 域) — Step 1 实际结果

```txt
modules/identity/
  auth              # 登录/会话核心(已完成)
  mfa               # MFA 管理 + 登录期 verify(已完成)
  forgot-password   # 密码找回 + 重置(已完成;原设计名 account-recovery,实际更名)
  onboarding        # 邀请接受/注册(已完成)
  account           # 账户设置(已完成)
  users             # 用户管理(已完成)
  roles             # 角色管理(已完成)
modules/system/
  notification      # 站内通知(已完成)
```

> `forgot-password` 取代原设计中的 `account-recovery`——因 onboarding 已独立成模块,剩余职责仅限密码找回,直接按功能命名更精确。

### 为"可运行"而做的分阶澄清(关键)
文案采集器是 Step 2 才建。若 Step 1 就把文案塞进模块、采集器还不存在,消息加载会断。故:
- **Step 1 保持 app 级 i18n 与 app 级 manifest 原样**(仅搬进 `web/i18n`、`web/manifest`);模块内 `i18n/`、`manifest.ts` **留空占位**。
- **Step 2** 才把文案下沉进模块并建采集 codegen,过程中始终可跑。

### 验收线(硬性)
Step 1 完成 = `web` 单 app `next dev` 起得来、**所有页面与接口行为不变**、`customer` 已删、`portal` 已解散、typecheck + lint + 单测 + `e2e/` 冒烟**全绿**。逐模块搬,搬一块验一块。登录链路是重点验收项。

---

## Step 2:CoC 声明系统(占位)

- per-module `manifest.ts` 真实字段:`menuCode`、`entry.url`、`permissions[]`、菜单分组 `group`、i18n 归属等。
- 采集 / 校验 / codegen:唯一性校验、UI 模块必须有 menuCode、菜单由权限反推、角色绑权限、合同绑菜单。
- 字段(menu / permission / role / user)语义基本不变,**关联与过滤方式重做**(具体方案 Step 2 设计时定,不照搬现仓实现)。
- 文案下沉进模块 `i18n/` + 生成 locale bundle。
- 生成物提交进仓库、永不手改。

## Step 3:项目编排系统(占位)

- 由 manifest 确定性生成 `app/` 薄壳与路径,AI 只写 manifest 一处。

---

## 推迟清单(明确不在 Step 0 解决)
- manifest 真字段 / 菜单 / 权限采集 / codegen → Step 2。
- 模块编排、薄壳生成 → Step 3。
- lib 去重清单、modules 完整 cat/mod 划分 → Step 1 执行时逐个定。
