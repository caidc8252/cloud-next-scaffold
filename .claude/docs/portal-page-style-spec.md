# Portal 页面样式规范 —— 列表 / 新增 / 详情

> 归属：`@cloud/ui` 消费侧 portal 业务页（列表 / 新增 / 详情）的默认模式与设计约束。本文给约束与选型，不是像素级复刻清单——先判断页面任务，再选模式；旧页面逐步向底线收敛。**写 portal 页面前必读。**
>
> 三种页型有可编译样板（纯样式骨架、不进打包，可直接对照 / 拷贝）：[list-page](../../packages/ui/docs/examples/pattern/list-page.tsx) · [list-page-advanced-filter](../../packages/ui/docs/examples/pattern/list-page-advanced-filter.tsx) · [create-form](../../packages/ui/docs/examples/pattern/create-form.tsx) · [create-wizard](../../packages/ui/docs/examples/pattern/create-wizard.tsx) · [detail-page](../../packages/ui/docs/examples/pattern/detail-page.tsx)。
---

## 0. 约束、选型与偏离

规则分四级：**MUST** 底线（设计系统 / 可访问性，不能破）· **SHOULD** 后台页默认（任务明显不适合才偏离）· **MAY** 条件能力 · **AVOID** 慎用（确需用先说明）。

通用前提（MUST）：

- 只用 `@cloud/ui` 原语 + 语义 token（`surface/content/line/success/warning/error/info`）；不写 hex / OKLCH、不写任意值字号 / 间距 / 宽高 / 圆角（这些由原语自带，自定义只用 `rounded-*` / `--space-*` 等刻度类）；可点击元素必须 `cursor-pointer`。
- **吸附到刻度，不照搬原型像素。** 原型给的精确像素是*意图*，不是字面量；落在两个法定 token 之间就**就近吸附**，用原语 prop / 刻度类，绝不手写任意值（`max-w-[459px]`、`bg-[#…]`）。例：459px 弹窗 → `Modal size="md"`（480px 最近）。
- **优先继承，按任务适配。** 默认先继承标准布局 / 密度；可调内容（文案、字段、出现哪些卡片 / 列），也可在任务明显不同时选本文其它模式；偏离仍须落在原语 + 语义 token + 既有刻度内，并按 §0.3 记录。

### 0.1 页面模式选择

先读原型的页面意图与交互语义，再套对应章节；保留交互语义，别把视觉相似的块统一成同一行为。

- **资源管理页？** 是 → `PageHeader` / `PageHeaderBand` 家族；否 → `ContentHeader` 或贴任务的工作台布局，不强套 list / create / detail。
- **集合页？** 长列表让条件区滚动时仍可触达（用 list-page recipe，§4）；有批量选择 → `Table` selected + 批量操作区，别把批量动作塞行尾。
- **新增 / 编辑页？** 字段独立 → 单步表单；有先后依赖 / 分支 / 复核 / 外部处理 → 多步向导；很小的上下文改 → 弹窗表单。
- **单条详情页？** 1-2 个核心区块 → 概览直接铺开；多个同级区块 → 同页 tabs；重型区块需独立 URL / 权限 / 加载边界 → 子路由并记录理由。

### 0.2 密度选择

默认 **standard density**（主体走 `PageBody`，卡内由 `Card` 自带）。只有任务形态变了才换，且只用既有 spacing token：**compact**（高频操作表、日志、矩阵、密集配置）、**focused**（单任务表单、确认类页面）。没有明确任务理由就回 standard。

### 0.3 偏离规则

偏离 SHOULD 默认须**同时**满足：① 任务与普通 CRUD 明显不同；② 默认布局会降低扫描 / 录入 / 操作效率；③ 偏离后仍用原语 + 语义 token + 既有尺寸 / 密度刻度；④ 影响后续复用的偏离记到组件附近注释，不要只留在临时讨论里。

### 0.4 颜色 token

颜色一律走语义工具类（`bg-surface-*` / `text-content-*` / `border-line-*` / `*-bg` / `*-strong` 等），禁裸 hex、裸 OKLCH、页面局部颜色变量，不自造灰。判断性约束：

- 一屏只有一个 `variant="primary"` 主 CTA，次要动作不抢 primary。
- `accent-*` 仅图表与 AI 强调，不做按钮 / 普通状态；`success/warning/error/info-*` 仅 Badge / 内联提示，不做装饰性页面底色；Badge 语义 `tone` 只编码状态 / 严重度，信息 / 类目字段用 `neutral`（详见 §8）。
- focus 由原语 / `shadow-focus` 提供，不可去掉。
- portal 管理页不用渐变 / 装饰背景图；暗色由 `.dark` / `[data-theme="dark"]` 同名变量供给，不硬编码。

---

## 1. 页型骨架

本节只锁两条 shell 不变量：① Shell `Layout` 滚动区**无内边距**，页面自己留白；② 页面主体默认走 `PageBody`（集中承载 page-level padding + block gap；padding 要挂别处时复用 `PAGE_BODY_PADDING_CLASS_NAME`），不手写页面级 padding。

每种页型的外壳形状（list / detail / form / wizard 各自的 slot 组成与可编译骨架）以 `registry/blueprints.ts` 的 page blueprint + 其 `skeletonPath` 指向的可编译骨架为准——先按 §0 判断该用哪种、是否适用，再照骨架填槽，不在本文重列。

---

## 2. 页头

### 2.1 白色通栏 band（共用容器）

`PageHeaderBand` 自带全幅白底 + 底边分隔，紧贴 topbar、左右顶满。`tabs` 槽渲染在 band 底边，传 line 变体 `TabsList`（默认即 line）+ `shadow-none`，使下划线与底边重合；line 条高由 padding 撑出（非固定 `h-*`），需精确高度在消费侧定，不改 band。

> **选择规则。** 后台 list / create / detail 默认用全幅 band（贴 topbar）：list / create 用 `PageHeader`（§2.2）、detail 用 `PageHeaderBand`（§2.3）；内容区普通标题页（dashboard / settings）改用 `ContentHeader`（内容流内，非 band）。

### 2.2 列表 / 新增页头（`PageHeader`）

`PageHeader` 自带标题 / 描述 / actions 的布局与排版（传 `title` / `description` / `actions` props，不手写其内部类）。actions 按页型：**列表**默认一个 `primary` 主操作（次要动作按优先级用 secondary / ghost / overflow，别都提 primary）；**向导**一个 `ghost` Cancel；**单步表单** `ghost` Cancel + `primary` Submit 并排，band 设 `sticky` 让 Submit 滚动时可达（§6.1）。

### 2.3 详情页头（band 内，无卡片）

详情页头是各页在 `PageHeaderBand` 里自行编排的内容（标识 / 标题 / 状态 / 元信息按需放），本文不规定它包含什么，只锁两点：

- **返回按钮**（如需）：放最左，`Button variant="ghost" size="icon-sm"` + `ChevronLeft`、无文字、`aria-label` 必填；导航目标由产品导航层决定（面包屑 / 已知父级 / 显式 return target），不在本文硬编码 `href`。
- **同一水平线**：返回按钮与右侧可能出现的操作按钮落在同一水平基线（见 §3.1）。

---

## 3. 页面主体与间距体系

间距只用 `--space-*` 刻度类（4 的倍数），不写任意值、用类名不标 px。页面级块间距、卡内 padding 由 `PageBody` / `Card` 自带，**不手写**；要自己写的是**组件 / 卡片之间**的间距，按层级就近取类：

- 并列区块卡片堆叠 `gap-5`
- 紧密关联的主卡 ↔ 子卡 `gap-3.5`
- 条件区 ↔ 列表卡片：吸顶 recipe `gap-4`，短 / 嵌入列表 `gap-6`
- stat 卡栅格 `gap-3`

除 §0.2 的 compact / focused 外，调内容不调间距；内容太多就拆区块 / tabs / 分页 / 独立流程，别破刻度。自定义卡片 padding 用 `flush` + 自带 padding，别用 `p-0` 覆盖。

**包装 div 必须有职责**（间距分组 / 滚动 / flex 宽度约束）；只有单子元素且类可并到子元素的包装层去掉（Card / Button / Input 根都接受 `className`；带 `suffix prefix` 的 Input className 落内层，需外包一层做宽度）。

### 3.1 行对齐

行头的标签 / 标题与行尾的操作落在同一条水平中线上对齐。例外：行头确实多行（标题 + 副行 + 元信息）时，操作改为对齐第一行。

### 3.2 可点击表面与行内操作的状态

可点击的反馈来自**背景**变化，不靠单一边框 / ring（细线作唯一命中提示太弱）；状态按"静止 → 悬停 → 按下"递进。

- **导航型**（点击即离开本页的行 / 卡）：有悬停与按下反馈，不保留点亮态。
- **可选 / 切换型**（点击后保持点亮）：用 `Toggle`（带选中态）或 `Button` 组件承载，不手搓"可点击 div"；选中态用主色调、且**压过悬停**——指针移上去不能闪回中性、被误读成取消选中（**硬规则：选中 ≠ hover**）。
- **行内操作的悬停要与整行的悬停区分得开**，不能被行的悬停吞掉；操作点击不触发整行的跳转；危险操作仍走确认弹窗。
- **图标操作只有中性与危险两类**，不做填充 / 描边强调；够分量的操作带文字。**危险操作（删除 / 移除 / 撤销等）必须带 danger 语义**，靠变体本身表达，不手动染色。

---

## 4. 搜索栏与已应用筛选

> **首选共享组件家族（红线）。** 列表条件区用 `ListConditionBand` + `SearchInput` + `AppliedFilters` + `FilterChip` 配 `useListFilters`（draft / applied 状态机），分页配 `RichPagination`（偏移）或 `useCursorPagination`（游标），页面只提供字段、不手搓条件区。

样式与消费侧取舍（是否吸顶 `sticky` / 工具栏 `Select` 刻度宽 / 显式 Search 按钮 / 工具栏单行左对齐流）由 `registry` 的 `list-condition-block` rules + list-page 骨架收口，不在本文重列。

### 4.1 Advanced Filter Sheet（高级筛选抽屉）

工具栏旁有 **Advanced** 入口时，用 `AdvancedFilterButton` + `AdvancedFilterSheet`（配 `AdvancedFilterGroup` / `AdvancedFilterField`）+ `useListFilters`：样式与 draft / applied 行为都由组件自带，页面只提供字段。*是否*要高级筛选、放*哪些*字段由产品决定。配方见 list-page-advanced-filter.tsx。

---

## 5. 列表卡片

`Card elevation={1}` 包裹「计数带 → `Table` → `RichPagination`」三段（自带边框分隔，卡片不加 padding）。三段的填槽结构以 `registry` 的 `list-results-card-block` + list-page 骨架为准，卡片间距见 §3；下面只补 registry 未展开的列样式与红线。

### 5.1 计数带

用 `ListSummaryBar`（`total` 计数 + `label` 文案 + 右侧 `actions` 槽，样式自带），别手写这条 bar。计数走 mono，`label` 有筛选时追加 ` matching filters`，动作槽放导出（`secondary sm`）等。sticky 列表把 `Table` 的 `stickyHeaderTop` 设为 `LIST_SUMMARY_BAR_HEIGHT`，列头才会紧贴 bar 底边吸顶。

### 5.2 表格

优先类型化 `Table<R>`（columns 配置），不手写 thead / tbody。常见文本列先从基础列型选，不自创字号 / 颜色组合；业务要稳定新列型（如进度、风险等级）先判断是否沉淀到 `@cloud/ui` 或模块共享列组件。

| 形态 | 配方 |
|---|---|
| 双行文本列（主行 + 副行，如 name） | 主 `text-sm font-medium text-content-primary truncate` + 副 `text-2xs text-content-tertiary truncate`，外层 `min-w-0`；带标识前置 logo + `gap-3` |
| 单行数字 / 数据值列（日期 / 编号 / 金额） | `font-mono text-2xs tabular-nums text-content-secondary`——数字走 mono |
| 单行普通文字列 | 表格默认字号 + `text-content-secondary` |

空值统一 `—`（`text-content-tertiary`）。其余列：

| 列 | 样式 |
|---|---|
| 标签集合 / 多 Badge | 一律横向 `flex flex-wrap gap-1` |
| 行尾箭头列 | `align: "right"`，被动 `ChevronRight size-3.5 text-content-tertiary`，**整行是点击目标**（`onRowClick`）；需行内操作则去箭头、按 §3.2 处理 |
| 操作列 | 图标按钮只 `ghost` / `ghost-danger`；重要行级动作带文字再用 `secondary`  |

空态用 `Empty` 组件（传给 `Table` 的 `empty` prop，`title` 区分"无数据"与"筛选无结果"）。

### 5.3 分页带（`RichPagination`）

列表底部分页一律用 `RichPagination`（列表 footer 的唯一标准件，内部 page / size / range 自带），**别手搓** page / size / range footer。

---

## 6. 新增页

两形态：**单步表单**（§6.1，普通新增 / 编辑默认）与**多步向导**（§6.2，任务适合分步时）。很小的局部改用弹窗表单。

### 6.1 单步表单

字段独立时的默认。`PageHeader` 承载标题与操作，`PageBody` 内一列居中区块卡片；吸顶头 + 卡片堆叠配方见 create-form.tsx。别因 example 里有底栏 / 侧栏 / 完成态就自动加，只在任务确需时加。

### 6.2 多步向导

只在用户须经历有意义阶段（依赖 / 分支 / 复核 / 外部处理 / 跨步摘要）时用；别因字段多就改向导，字段多但独立仍用分区卡片的单步表单。步骤指示、底部导航、可选摘要栏、错误条、完成态配方见 create-wizard.tsx——当可复制样式骨架，不当产品需求。

---

## 7. 详情页

只读详情默认 `PageHeaderBand` + 内容区。是否用 tabs 看内容：1-2 个核心区块直接铺概览；多个同级区块用 tabs；重型 / 独立权限 / 需 deep link 的区块可拆子路由并记理由。产品若明确把编辑页作为详情 surface，按任务选新增 / 编辑表单，别为满足本节强加 tabs 或只读详情头。

### 7.1 Overview 双栏

概览是主卡 + 右栏的双栏布局，具体分栏与字段由原型决定。要体现的是 **KV 栅格的自适应**：列数随**卡片自身宽度**自适应（窄 1 列、宽了 2–3 列），用 `grid-auto-fit-*` 工具类承载——不按视口断点、不手写 `grid-cols-[repeat(auto-fit,minmax(…))]`（任意值 lint 禁、且易漏防溢出）。

---

## 8. 排版与数据展示

遵循类型刻度；标题 / 正文只用 Geist，数据读感文本用 Geist Mono，不引入局部字体。常用字重 `400 / 500 / 600`，`700` 仅罕见强调，避免 `300 / 800 / 900`。数据读感文本（编号 / 时间戳 / 金额 / 版本等）用 `font-mono tabular-nums`。

| 用途 | 规范 |
|---|---|
| 页面 / 详情标题 | `text-2xl font-semibold tracking-tight` |
| 区块卡标题 | `text-md`（`CardTitle` 默认） |
| 正文 / 行标题 | `text-sm` |
| 辅助说明 / 副行 | `text-xs` |
| overline / 数据副注 | `text-2xs`，常配 `uppercase tracking-wider` |
| 计数 / 日期 / 金额 | `font-mono tabular-nums` |
| 状态 / 严重度 | `Badge` 语义 `tone`（`success` / `warning` / `error` / `info`）+ `dot`，按状态值映射 |
| 信息 / 类目 / 普通字段（非状态：计划档位 / 类型 / 类目 / 纯展示值等） | `Badge tone="neutral"`（默认）——**不得**借语义 tone 或类目色调色 / 区分，语义 tone 只留给状态 / 严重度 |
| 标签 | `Badge shape="tag"`（mono，默认 `neutral`） |

---

## 9. 侧边栏菜单 icon

侧边栏三级模型（见 `app/(dashboard)/layout.tsx`）：L1 是分组标题（无 icon）、L2 是渲染为 sidebar item 的菜单项（**带 icon**）、L3 是 L2 下的嵌套子项（无 icon）。

- **L2 必须有对应 icon（MUST）**：每个 L2 菜单在模块 `manifest.ts`（目录节点在 `manifest/menu-tree.ts`）声明的 `icon` 名，都必须在 `apps/web/app/(dashboard)/_components/menu-icon.tsx` 的 `getMenuIcon` 里有匹配 case，**不能落到 `LayoutDashboard` 兜底**（兜底只是防御网，不是合法终态）。新增 / 调整 L2 时：先在 `manifest.ts` 定 `icon` 名，再在 `menu-icon.tsx` 补上对应 case（icon 取自 `lucide-react`），icon 语义应能区分、不与同级混淆。
