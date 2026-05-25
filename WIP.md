# WIP

## 当前任务

把 `tmp/packages/ui` 中相对当前 `packages/ui` 的新增/改动移植过来。完整差异梳理见对话上下文，需要逐项决策后再合并。

## 决策点（逐项确认后再改）

- [x] **1. 新增组件移植**：`date-picker` / `date-range-picker` / `date-time-picker` / `_date-shared` / `stepper` / `toggle` / `toggle-group`，含 `test/` 下 6 个 Vitest 用例 + `messages/{en,zh-CN,ja}.json` 的 `datePicker` i18n 节 + `ui/index.ts` 对应导出。**附带完成**：新建 `packages/i18n` 包（i18n 是新组件硬依赖，tmp 内已有完整源码）、`pnpm-workspace.yaml` 加 `packages/i18n` 和 `next-intl: ^4.4.0` catalog、根 `tsconfig.json` 加 i18n paths/include、根 lint 脚本加 `packages/i18n/src`、`vitest.config.mts` 排除 `tmp/`、根 devDeps 加 `@testing-library/react`、`packages/ui/package.json` 加 `@cloud/i18n` 和 `next-intl`。
  - **小偏差**：
    - 6 个 UI 测试顶端加 `// @vitest-environment jsdom`（按 next-kit:unit-test 规范，组件测试必须显式声明 jsdom env）
    - 2 个 date 组件把 `useEffect(setState)` 改成 React 19 推荐的「render 期同步派生 state」写法（旧写法被 `react-hooks/set-state-in-effect` 报错；语义等价）
    - 7 个新文件里的 `@/...` 别名改为相对路径（apps/web 的 `@/*` 指向自身，构建会断；与 ui 现状一致，决策 8 决定后可再统一改回）
- [x] **2. 配套依赖/配置 + ui 自包含化**：
  - `packages/ui/tsconfig.json` 加 `allowImportingTsExtensions`（i18n 的 `.ts` 后缀 import 在 ui 局部 typecheck 时需要）
  - `packages/ui/package.json` 移除 `tailwindcss` 直依赖（构建期工具，不是运行时依赖；根 devDeps 已有）
  - `packages/ui/src/components/styles/index.css` 顶部加 `@import "tailwindcss" / "tw-animate-css" / "@fontsource-variable/geist"` + **`@source "../.."`**（tmp 漏了 @source；这条让 Tailwind 自动扫 packages/ui/src，消费方不再需要写）
  - `apps/web/app/globals.css` 精简：删除 `@import "tailwindcss"`、`@import "@fontsource-variable/geist"`、`@source "../../../packages/ui/src"`，现在只剩 `@import "@cloud/ui/component-defaults.css"` + `@import "@cloud/ui/globals.css"` + `@source "../system"`
  - `apps/web/package.json` 顺手清理 `@fontsource-variable/geist` 和 `tw-animate-css` 直依赖（已无直接 import；通过 ui 间接拉入）。保留 `sonner` 直依赖（apps/web 仍有 3 处 `import { toast } from "sonner"`，等决策 6 sonner 重新导出后再清）
  - `apps/web/next.config.ts` 的 `transpilePackages` 和 `optimizePackageImports` 都加上 `@cloud/i18n`
- [x] **3. `layout/list-item.tsx` 和 `split-panel.tsx`**：**保留**。`apps/web/system/roles/role-list-item.tsx` 在用 `ListItem`；`users-page.tsx` 和 `roles-panel.tsx` 都在用 `SplitPanel` / `SplitPanelSidebar` / `SplitPanelContent`。tmp 那边删除应该是对应业务页面被重构走了，本仓库 base scaffold 还需要。无代码改动。
- [x] **4. `layout/app-header.tsx` breadcrumbs API 破坏性变更**：**接受**。理由：未来详情页 `/customers/:id` 这种场景需要按段把 id 翻译成实体名，array 的扁平 schema 撑不住，slot 是对的。
  - `packages/ui/src/components/layout/app-header.tsx`：`breadcrumbs?: BreadcrumbItemDef[]` → `breadcrumbs?: React.ReactNode`，内部只保留 `<Breadcrumb><BreadcrumbList>{breadcrumbs}</BreadcrumbList></Breadcrumb>` 外壳；删除 `BreadcrumbItemDef` 导出
  - `apps/web/app/(portal)/_components/portal-shell.tsx`：`buildBreadcrumbs` 返回类型改为 `React.ReactNode`，函数体内做"数据 → JSX"映射（保留中间数组便于未来按段异步取实体名）；从 `@cloud/ui` 引入 `BreadcrumbItem` / `BreadcrumbLink` / `BreadcrumbPage` / `BreadcrumbSeparator`
- [x] **5. `layout/sidebar.tsx` 根路径匹配简化**：**拒绝 tmp 的"简化"**（它会让 root 菜单恒亮，是 regression）。顺手把现状里两套不一致的匹配逻辑合并到一个 `matches(href)` helper：`pathname === href || pathname.startsWith(href + '/')`——既保留了 `/` 根路径的正确行为（`'/' + '/' = '//'` 不会匹配任何 Next pathname），又修了潜在的前缀边界 bug（`/users` 不会被 `/users-archive` 误激活）。只动 sidebar.tsx 内部，调用方零改动。
- [x] **6. `ui/sonner.tsx` + `component-defaults.css`**：拆 3 个子决策——
  - **6a 倒计时进度条**：**保留**（无改动）。`@cloud/request/toastError` 仍依赖 `--toast-duration` CSS var 和 `cn-toast-countdown` 类。
  - **6b 错误 toast Copy 按钮**：**保留 + 样式 token 化**。`component-defaults.css` 里 `.cn-error-toast-copy` 块全部用 `@apply` 改写，硬编码的 `10px / 11px / 3px / 6px / 2px` 全部映射到 Tailwind utility（`right-2.5 / text-xs / py-0.5 / rounded-md / z-10`），数值未来跟着 `--spacing`、`--radius-md`、`--text-xs`、`--color-*` 自动调整。不动 `@cloud/request/error-toast.ts` 的 JSX（避免 request 包反向依赖 ui 的 Tailwind 扫描范围）。
  - **6c sonner `export { toast }`**：**接受**。`packages/ui/src/components/ui/sonner.tsx` 末尾加 `export { toast } from "sonner"`；`components/ui/index.ts` 改成 `export { Toaster, toast } from './sonner'`；apps/web 的 3 处文件（`users-page.tsx` / `pending-invite-detail.tsx` / `roles-panel.tsx`）改成 `import { ..., toast } from "@cloud/ui"`；`apps/web/package.json` 移除 `"sonner": "^1.7.4"` 直依赖。`packages/request/src/error-toast.ts` 保持 `from "sonner"`（request 包不应反向依赖 ui）。
- [x] **7. Progress 加 `tone` prop + 类型导出**：tmp 实际不只是加 type export，是给 Progress 加了一个 `tone?: "success" | "warning" | "error" | "info"` prop，indicator 颜色映射到 `bg-success / bg-warning / bg-error / bg-info`（token 已全部存在）。apps/web 当前没用 Progress，零回归。`progress.tsx` 新增 `ProgressTone` / `ProgressProps` / `toneIndicatorMap`；`components/ui/index.ts` 多导出 `type ProgressProps, type ProgressTone`。
- [x] **8. 机械 import 路径改写**：**拒绝**。零代码改动。
  - **现状实测**：apps/web 0 处用 `@/`、36 处相对路径；packages/ui 0 处用 `@/`、一堆相对路径。两边对称一致，`@/*` 别名在两边 tsconfig 里都只是 Next 模板死代码声明。
  - **接 tmp 反而制造不对称**：ui 切 `@/` 而 apps/web 还是相对路径，跨包编译时 apps/web 的 `@/*` → `./*` 会把 ui 文件里的 `@/lib/utils` 解析成 `apps/web/lib/utils` 而炸。这正是 item 1 我们把 7 个 tmp 新文件 `@/` 回切相对路径的原因。
  - **结构性卡点**：TS / Turbopack 的 paths 是 project 级别的，apps/web 编译 ui 源码时用 apps/web 的 tsconfig，没办法让 ui 的 `@/` 在跨包消费时仍指向 ui 自己。要让两边都用 `@/` 同时不冲突，要么换独占前缀（如 `~ui/*`），要么 apps/web 让出 `@/`——都违背 Next 标准约定，代价远超收益。
  - **结论**：现状（两边都用相对路径）是"既对称又能编译"的唯一可持续状态，保持。

## 验证

- [x] `pnpm db:generate`
- [x] `pnpm exec tsc --noEmit`
- [x] `pnpm lint`
- [x] `pnpm exec vitest run packages/i18n packages/ui`（10 文件 / 53 用例全过）
- [ ] `pnpm test`（**pre-existing**：`packages/permissions/test/session.test.ts` 等 3 文件 11 测试在 main 上同样失败，根因是 `DATABASE_URL` / `AUTH_SESSION_SECRET` 等 env 缺失，与 item 1 无关）
- [ ] `pnpm --filter web build`（**pre-existing**：编译期 ✓，collect page data 阶段 `DATABASE_URL is required` —— 同 env 问题）
