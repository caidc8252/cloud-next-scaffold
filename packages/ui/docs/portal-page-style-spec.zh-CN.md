# Portal 页面样式规范 —— 列表 / 新增 / 详情

> 后台业务页面三种基本页型（列表 → 新增 → 详情）的**默认模式与设计约束**。本文不是像素级复刻清单：先判断页面任务，再选择合适模式；与本文底线约束冲突的旧页面逐步收敛。English version: [portal-page-style-spec.en.md](./portal-page-style-spec.en.md)。
>
> **可编译样板**（纯样式骨架，不进打包，可直接对照/拷贝）：[examples/list-page.tsx](./examples/list-page.tsx) · [examples/create-form.tsx](./examples/create-form.tsx) · [examples/create-wizard.tsx](./examples/create-wizard.tsx) · [examples/detail-page.tsx](./examples/detail-page.tsx)。
>
> 通用前提：只用 `@cloud/ui` 原语 + 语义 token（`surface/content/line/success/warning/error/info` + 类目色 `teal/violet`），不写十六进制、不写任意值字号 / 间距 / 宽高 / 圆角；可点击元素必须 `cursor-pointer`。
>
> **吸附到刻度，不要照搬原始值。** 原型给你的是精确像素（`459px` 的弹窗、`180px` 的下拉、`13px` 的间距、不在色板里的灰）；那是*意图*，不是要逐字拷贝的字面量。当某个原型值落在两个法定 token 之间，**就近吸附**到最接近的那个——谁近选谁——并用原语的 prop / 刻度类，绝不手写任意值（`max-w-[459px]`、`w-[180px]`、`gap-[13px]`、`bg-[#…]`）。例：459px 弹窗 → `<Modal size="md">`（480px，最近），**不是** `size="sm"`（360px），**更不要** `className="sm:max-w-[459px]"`。锁死刻度的意义是跨页面一致；一个"贴合稿子"的越界值，是拿一致性去换一个用户根本感知不到的差异。
>
> **优先继承，按任务适配。** 默认页面先继承下面的标准布局和密度；允许调整内容——文案、字段、出现哪些卡片/列，也允许在有明确任务差异时选择本文列出的其他模式。不要为了贴原型而手写任意间距或重写原语样式；需要偏离默认模式时，仍必须落在 `@cloud/ui` 原语、语义 token 和已定义密度/尺寸刻度内，并按 §0.3 记录理由。

---

## 0. 使用方式：约束、选型与偏离

本文把规则分成四级，避免把某个样板页的结构机械套到所有页面上：

| 等级 | 含义 | 示例 |
|---|---|---|
| **MUST** | 设计系统与可访问性底线，不能破 | 语义 token、`@cloud/ui` 原语、危险操作 danger variant、icon-only 按钮 `aria-label`、选中态压过 hover |
| **SHOULD** | 后台管理页默认做法，除非页面任务明显不适合 | 列表页用 `PageHeader` + 条件区 + `Table` 卡片；详情页优先 `PageHeaderBand`；新增/编辑优先单步表单 |
| **MAY** | 条件成立时使用的能力 | 详情 tabs、可选摘要栏、完成态 |
| **AVOID** | 通常不应使用；确需使用要先说明原因 | 任意值尺寸/颜色、复制原型 CSS、为了视觉相似而绕开原语 |

### 0.1 页面模式选择

先读原型表达的页面意图与交互语义，再套对应章节。实现时要保留原型的交互语义，而不是把视觉相似的块统一做成同一种行为。

1. **这是资源管理页吗？**
   - 是：优先使用 `PageHeader` / `PageHeaderBand` 家族。
   - 否：考虑 `ContentHeader` 或更贴近任务的工作台布局，不必强套 list / create / detail。
2. **这是集合页吗？**
   - 长管理列表通常需要让搜索 / 筛选条件区在滚动时仍可触达。优先使用 [examples/list-page.tsx](./examples/list-page.tsx) 的共享 recipe，或在 app 侧封装列表工具栏，不要每页各自计算 sticky 偏移。
   - 存在批量选择 / 批量操作：用 `Table` selected state + 批量操作区，不把批量动作塞进行尾。
3. **这是新增 / 编辑页吗？**
   - 字段彼此独立：单步表单。
   - 输入有先后依赖、分支、复核或外部处理：多步向导。
   - 很小的上下文修改：弹窗表单。
   - 批处理、外部处理、长耗时流程：独立流程页或向导，不用普通弹窗硬塞。
4. **这是单条记录详情页吗？**
   - 只有 1-2 个核心区块：概览页即可，不必上 tabs。
   - 多个同级区块需要切换：同页 tabs。
   - 某个区块很重、需要独立 URL / 权限 / 加载边界：可以用子路由，但要记录选择理由。

### 0.2 密度选择

默认使用本文的 **standard density**：页面主体走 `PageBody`，卡片内走 `p-5 / gap-5`。只有任务形态改变时才选择其他密度：

- **compact density**：高频操作表、日志、矩阵、密集配置项。只能使用既有 spacing token，不手写任意值。
- **focused density**：单任务表单、确认类页面等需要减少旁支干扰的页面。仍使用页面 padding / Card / Modal 的既有尺寸刻度。

没有明确任务理由时，回到 standard density。

### 0.3 偏离规则

页面可以偏离 `SHOULD` 级默认做法，但必须同时满足：

- 页面任务与普通 CRUD 的 list / create / detail 明显不同；
- 默认布局会降低扫描、录入或操作效率；
- 偏离后仍使用 `@cloud/ui` 原语、语义 token 和已定义尺寸/密度刻度；
- 影响后续页面复用的偏离，记录到组件附近注释或 `DEV_NOTE.md`，不要只留在临时讨论里。

---

## 1. 页型骨架

Shell `Layout` 的滚动区**无内边距**，页面自己负责留白。页面主体默认使用 `PageBody`（来自 `@cloud/ui/components/layout`）：它统一承载 Portal 管理页的 page-level padding 与 block gap，当前等价于 `flex flex-col gap-6 px-6 pt-6 pb-8`。需要把 padding 挂到其他原语上时，复用 `PAGE_BODY_PADDING_CLASS_NAME`。

下面是三种管理页的默认骨架，先按 §0 判断是否适用：

### 1.1 列表页

```tsx
<>
  <PageHeader title description actions={<Button variant="primary" iconLeft={<Plus/>}>New …</Button>} />
  <PageBody>
    {/* ① 条件区：搜索栏 + 已应用筛选；列表页默认整组吸顶，见 §4 */}
    {/* ② 列表卡片：计数带 + Table + 分页 */}
  </PageBody>
</>
```

### 1.2 新增页

两种主形态——普通「新增 / 编辑」页用**单步表单**；只有当任务确实适合分步骤推进时，才用**多步向导**。很小的上下文修改可以用弹窗表单；长耗时或多阶段流程使用独立流程页或向导。

**单步表单（默认）**——Cancel 与 Submit 放在头部；主体是单列居中的区块卡片。具体样式 recipe 见 [examples/create-form.tsx](./examples/create-form.tsx)。

```tsx
<>
  <PageHeader
    sticky
    title description
    actions={<>
      <Button variant="ghost" iconLeft={<X/>}>Cancel</Button>
      <Button variant="primary" iconLeft={<Plus/>} loading={pending}>Create …</Button>
    </>}
  />
  <PageBody>
    <div className="mx-auto flex max-w-3xl flex-col gap-6">{/* Card elevation={1} 区块卡片 */}</div>
  </PageBody>
</>
```

**多步向导**——当任务适合分步骤推进时使用。步骤、底部导航、摘要栏和完成态的具体样式 recipe 见 [examples/create-wizard.tsx](./examples/create-wizard.tsx)。

```tsx
<>
  <PageHeader title description actions={<Button variant="ghost" iconLeft={<X/>}>Cancel</Button>} />
  <PageBody>
    <StepIndicator className="rounded-xl border border-line-default bg-surface-2 px-5.5 py-4 shadow-1" … />
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">{/* 当前步骤组 + 底部导航 */}</div>
      {/* 可选摘要栏，仅在它确实帮助当前任务时出现 */}
    </div>
  </PageBody>
</>
```

### 1.3 详情页

详情页有多个同级区块时使用同页 tabs；只有 1-2 个核心区块时可直接铺开。若某个区块很重、需要独立 URL、权限边界或独立加载边界，可以改用子路由，并按 §0.3 记录理由。

```tsx
<Tabs value={tab} onValueChange={…} className="gap-0">
  <PageHeaderBand tabs={<TabsList className="shadow-none">…</TabsList>}>
    <DetailHeader … />
  </PageHeaderBand>
  <TabsContent value="…" className={PAGE_BODY_PADDING_CLASS_NAME}>…</TabsContent>
</Tabs>
```

---

## 2. 页头

### 2.1 白色通栏 band（共用容器）

`PageHeaderBand`：`bg-surface-2` + `border-b border-line-subtle`，内层 `px-6 py-4`；紧贴 topbar，左右顶满。`tabs` 槽位渲染在 band 底边上（`flex px-6`），传 line 变体 `TabsList`（默认即 line）加 `shadow-none`，使 tab 下划线与 band 底边重合。line 条高约 **42px**（由 line 变体的 padding 撑出，不是固定 `h-*`）；若某页需要精确高度，在消费侧定高，不要改 band。

> **来源与选择规则。** `PageHeader`（list / create 页头，§2.2）和 `PageHeaderBand`（detail 页头，§2.3）都在 `@cloud/ui/components/layout`。后台管理页（list / create / detail）默认用这套全幅 band——贴 topbar、`text-2xl`。内容区普通标题页（如 dashboard、settings）改用同一包里的 `ContentHeader`——它是内容流内的 `text-3xl` 标题，不是 band。

### 2.2 列表 / 新增页头（`PageHeader`）

- 行容器：`flex flex-wrap items-center gap-x-4 gap-y-3`；右侧 actions 与左侧标题 / 描述块垂直居中对齐
- 标题：`h1` `text-2xl font-semibold tracking-tight text-content-primary`；行内状态 chip 与标题 `gap-2.5`
- 描述：`mt-1.5 max-w-3xl text-sm text-content-tertiary`
- 动作区：右侧 `flex shrink-0 items-center gap-2`，按页型：
  - **列表**——默认一个 `variant="primary"` 主操作（“新增…”）；次要动作按优先级使用 `secondary` / `ghost` / overflow menu，不把所有动作都提成 primary
  - **向导**——一个 `variant="ghost"` 逃逸操作（“Cancel”）
  - **单步表单**——`ghost` Cancel **与** `primary` Submit 并排，并把 band 设为 `sticky`，使 Submit 在表单滚动时始终可达（§6.1）

### 2.3 详情页头（band 内，无卡片）

`flex flex-wrap items-center gap-4`，从左到右：

如果详情页头需要返回入口，把它放在最左侧，并保持视觉一致：

```tsx
<Button
  variant="ghost"
  size="icon-sm"
  aria-label="Back"
>
  <ChevronLeft className="size-4" />
</Button>
```

- ghost 幽灵图标按钮（`icon-sm`）+ `ChevronLeft size-4`，不带文字
- 导航目标和行为由产品导航层决定（面包屑、已知父级路由或显式 return target）。不要在本规范里硬编码模块列表 `href`
- `aria-label` 必填（图标按钮无可读文本）

| 元素 | 规范 |
|---|---|
| 返回 | 可选；出现时按上方配方 |
| 主体标识 | Logo / 头像 / 首字母块 `lg` 尺寸（无标识则省略） |
| 标题行 | `h1 text-2xl font-semibold tracking-tight` + 状态 Badge，`gap-2.5` |
| 元信息行 | `mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-content-secondary`，条目内 icon `size-3.5` + `gap-1` |
| 动作 | `Button variant="secondary"` + `shrink-0`，单个按钮不包 div |

Tab 上的计数 chip：`ml-1 h-4 min-w-4 rounded-full bg-surface-3 px-1 text-xs font-medium text-content-tertiary`，计数为 0 时不渲染。

---

## 3. 页面主体与间距体系

**standard density** —— 页面主体密度由 `PageBody` 集中维护。纵向节奏走 **24 → 16 → 20**：大区块 24px；标准 sticky-list recipe 会把条件区 → 列表卡片之间收到 **16px**；卡片内部 **20px**（`p-5` 内边距、`gap-5` 堆叠）。这是后台管理页默认密度；除 §0.2 的 compact / focused 场景外，调内容，不调间距。

| 层级 | 值 | 说明 |
|---|---|---|
| 页面主体 | `PageBody` / `PAGE_BODY_PADDING_CLASS_NAME` | 由组件集中维护 page-level padding / block gap；不要在页面里手写主体 padding / gap |
| 页面级块间距 | `PageBody` 内置 | 列表块之间；向导块之间；详情双栏之间 |
| 搜索栏 ↔ 列表卡片 | 使用标准 sticky-list recipe 时为 **16px** | 长列表保持条件区靠近结果；短列表或嵌入式列表可保持普通 `gap-6`（§4、§5） |
| 同区域卡片堆叠 | `gap-5`（20px） | 详情页同一 tab 内并列的区块卡片 |
| 紧密关联卡片 | `gap-3.5`（14px） | 主卡 ↔ 其直接相关的子卡（如某列表 ↔ 其折叠历史卡） |
| 工具栏 ↔ 筛选反馈 | `gap-2.5`（10px） | 两者包成一组 `flex flex-col gap-2.5`，再以 gap-6 与相邻块分隔 |
| 卡片内 dense 横带 | `px-4 py-3` | 计数带、分页带、区块卡头带 |
| 卡片槽位 padding | Card `size` 决定（md = `p-5`） | 需要自定尺寸时用 `flush` + 自带 padding（如向导卡头 `px-5 py-3.5`——14·20），**不要**用 `p-0` 去覆盖 |

通用原则：**包装 div 必须有职责**（间距分组 / 滚动 / flex 宽度约束）。只有一个子元素且类可以并到子元素上的包装层一律去掉（Card / Button / Input 的根都接受 `className`；注意带 `prefix` 的 Input className 落在内层，需要外包一层做宽度）。

### 3.1 行对齐

**行头带名称/标题、行尾带操作的行，一律垂直居中对齐**（`items-center`）——行头标签与行尾操作落在同一条中线上，不用 `items-start`。这是通用规则，凡是这种形态都适用：区块卡片的行列表（§7.2）、带行尾按钮/开关的设置行/列表行、详情页头（§2.3）、带 `CardAction` 的卡内头带等。

唯一例外：行头是确实多行的块（标题 + 副行 + 元信息）、且操作要对齐到**第一行**时，才改用顶端对齐（`items-start`）——但默认是居中，只有多行行头确有需要时才用 `items-start`。

### 3.2 行内操作的 hover

当一行本身有 hover（`hover:bg-surface-hover`）**且**带行内操作图标时，每个图标的 hover 必须**与行的 hover 区分开**——默认 `ghost` 按钮的 hover 也是 `bg-surface-hover`，落在已 hover 的行上自己的 hover 就看不见了。surface token 是实色（非半透明），所以行内控件要**换 token**，不能指望叠加变深：

- **中性操作**（编辑、更多…）：`ghost` 提一档——`className="hover:bg-surface-active"`（比行深一级）。
- **危险操作**（删除）：`variant="ghost-danger"`——hover 是 `error-bg` 红色 tint，与中性行 hover 永不撞色，还顺带表达"危险"语义。
- 操作的 `onClick` 一律 `e.stopPropagation()`，避免触发行的 `onRowClick`；图标用 `flex items-center` 成簇（§3.1）。危险操作仍走确认 Modal（§7.3）。

示例：带 hover 的行在行尾放编辑 / 删除操作。

### 3.3 图标按钮操作与危险语义

两条不变量，凡是出现操作的地方都适用——不只是滚动的列表行。它们约束的是**变体选择**，不是"能不能加这个操作"：

- **icon-only 的操作按钮只能是 `ghost`（中性）或 `ghost-danger`（危险）——绝不用 `secondary` / `primary` / 带边框。** 纯图标没有文字标签，强调只能靠 hover token，不能靠填充背景（§3.2）。这是对行内图标唯一的硬约束。它**不**禁止行里出现带文字的操作按钮：当某个操作确实够分量（Approve、Activate、行级主 CTA），就用带文字的 `secondary` / `primary` ——只要保持有文字、语义清楚，别把一个裸图标提成填充变体。
- **所有危险操作必须带 danger 变体，无一例外。** 删除 / 移除 / 撤销 / 终止 / 重置 / 断开：图标按钮形态用 `variant="ghost-danger"`，文字按钮或弹窗 footer 形态用 `variant="danger"`（§7.3）。**不要**靠给中性 `ghost` 染色来表达危险（比如在普通 `ghost` 里塞红色 `Trash2`，或加 `text-error` 类名）——变体本身已经承载了危险 hover token（§3.2）和语义，自定义图标颜色反而和它打架。`ghost-danger` 里的图标要去掉任何 `text-content-*` / `text-error` 覆盖，颜色交给变体。

### 3.4 可点击表面的状态（hover / 按下 / 选中）

任何可点击表面——列表行、快捷筛选 tile、整张单选卡——的可点击感都来自**背景**变化，不是只靠边框。边框 / ring 是*加强*，绝不能是唯一信号（1px 线作为唯一的命中提示太容易被忽略）。中性 surface 阶梯一次走一档实色：`surface-2`（静止）→ `surface-hover` → `surface-active`。按交互类型选状态：

- **导航型**（点击打开详情或触发 `onRowClick`、随后离开本页的行 / 卡）：静止 = 自身底色 → `hover:bg-surface-hover` → 按下一拍 `active:bg-surface-active`。不保留点亮态，因为点击就跳走了。对应 §5.2 的表格行（`onRowClick`）和 §7.2 的区块卡片行。
- **可选 / 切换型**（点击后保持点亮——单选卡、快捷筛选卡、多选行）：选中态是**主色 tint，且压过 hover**。把中性 hover 收在 `!selected` 之后（`!selected && "hover:bg-surface-hover"`），灰底色就永远不会盖住点亮的 tint。两种法定写法——别造第三种：
  - **`Table` 里的行**：传 `state.selected`，原语会施加 `aria-selected:bg-state-selected aria-selected:hover:bg-state-selected aria-selected:shadow-row-selected`（`state-selected` token + 内嵌主色竖条）。不要手搓。
  - **独立 tile / 卡片**：集合用 `ToggleGroup variant="plain"`，每个选项用 `Toggle size="auto"`。选中态写在 `data-pressed:*` 上：`data-pressed:border-primary-500 data-pressed:bg-primary-50 data-pressed:hover:bg-primary-50`；可选择的指标或筛选卡可再加 `data-pressed:ring-2 data-pressed:ring-primary-500/10`。除非这个表面是一次性动作、不是持久选择，否则不要再手写 `div role="button"` 来做卡片 / tile 选择器。
- 可 hover 行上的**行内操作**保持与行区分的 hover（§3.2）：中性操作 → `hover:bg-surface-active`（比行深一档），危险操作 → `ghost-danger`。

唯一硬规则：**选中 ≠ hover。** 点亮 / 选中的表面**不能**再带无条件的 `hover:bg-surface-hover`——指针移上去会闪回中性灰、被读成"已取消选中"。一律把 hover 收在 `!selected` 之后（`Table` 原语已经这么做；手搓可选列表时照做）。

---

## 4. 搜索栏与已应用筛选

列表使用显式 Search 按钮时，搜索输入框里的 Enter 必须触发同一个搜索动作。成本很低的本地筛选可以即时反馈；昂贵的远程查询不要每次输入都触发请求。

长管理列表应让条件区（工具栏 + 筛选反馈）在滚动时仍可触达。实现要集中：以 [examples/list-page.tsx](./examples/list-page.tsx) 为样式 recipe，或在 app 侧封装 list-toolbar 组件。不要每个页面各自调 sticky offset、负边距或 z-index。

短列表、嵌入式列表、或筛选只是辅助信息的页面，可以保持普通流式条件区。

- 行容器：`flex flex-wrap items-center gap-2`；所有控件统一 `md`（36px 高）
- 搜索输入：`inputSize="md"` + `prefix={<Search className="size-4"/>}`，外包 `max-w-64 flex-1`
- 下拉筛选：`SelectTrigger size="md"` 使用接近所需范围的刻度宽度（如 `w-40` / `w-44` / `w-48`，约 150–200px）；`SelectValue` 用 render-prop 显示标签（base-ui 默认显示原始 value）。不要为了复刻原型写 `w-[150px]`、`w-[180px]` 或其他页面局部任意宽度。
- 提交按钮：`variant="primary" size="md"` + Search 图标

**筛选反馈行**：

- 无筛选：一句 `text-xs text-content-tertiary` 的操作提示
- 有筛选：本地化的已应用筛选标签 + 若干 FilterChip + 清除全部动作（ghost xs）
- FilterChip：`rounded-full border border-primary-500/25 bg-primary-50 py-0.5 pr-1 pl-2.5 text-xs font-medium text-primary-700`，尾部 `Button size="icon-xs" variant="ghost"` 的 X 可单独移除

---

## 5. 列表卡片

结构：`Card elevation={1}` → 计数带 → `Table` → `RichPagination`。三段自带边框分隔，卡片本身不加 padding。与标准吸顶条件区配对时，按 [examples/list-page.tsx](./examples/list-page.tsx) 的 spacing recipe 处理；非吸顶列表保持普通页面 `gap-6`。

### 5.1 计数带

`flex items-center justify-between gap-3 border-b border-line-subtle px-4 py-3`。左侧 `text-sm text-content-secondary`，数字 `font-mono font-semibold tabular-nums text-content-primary`，有筛选时追加 ` matching filters`（tertiary）。右侧动作槽（导出按钮 `secondary sm`）。

### 5.2 表格

优先用类型化 `Table<R>`（columns 配置），不手写 thead/tbody。

**常见文本列先从这些基础列型中选择，不自创新的字号 / 颜色组合**。当业务需要新的稳定列型（如进度、风险等级、头像集合、指标对比），先判断是否应沉淀到 `@cloud/ui` 或本模块共享列组件，不在每个页面临时拼一套：

| 形态 | 配方 |
|---|---|
| 双行文本列（主行 + 副行，如 name） | 主行 `text-sm font-medium text-content-primary truncate` + 副行 `text-2xs text-content-tertiary truncate`，外层 `min-w-0`；带标识时前置 logo + `gap-3` |
| 单行数字 / 数据值列（日期、编号、金额，如 registeredAt） | `font-mono text-2xs tabular-nums text-content-secondary`——数字一律走 mono 数据读感 |
| 单行普通文字列 | 日常正文字体：跟随表格默认字号 + `text-content-secondary`，**不加 mono** |

所有文本列空值统一 `—`（`text-content-tertiary`）。

其余列约定：

| 列 | 样式 |
|---|---|
| 状态列 | Badge（tone + dot） |
| 标签集合 / 多 Badge 列 | 一律横向：`flex flex-wrap gap-1`，空值 `—`；同一表格单元格里的多个 Badge 不竖向堆叠 |
| 行尾箭头列 | `width: 48, align: "right"`，被动 `ChevronRight size-3.5 text-content-tertiary`——**整行是点击目标**（`onRowClick`）。默认用这个；若该行确需行内操作（编辑/删除），去掉箭头、按 §3.2 处理其 hover + `stopPropagation` |
| 操作列 | 图标按钮只用 `ghost` / `ghost-danger`；重要行级动作必须带文字，再使用 `secondary` / `primary` |

- 列标题以**大写文本**传入（原语不做 text-transform）
- 排序为三态循环：升 → 降 → 还原自然序；`onSortChange(null)` 必须处理（回种子顺序），不能忽略
- 空态：`py-12 text-center text-sm text-content-tertiary`，文案区分“无数据”与“筛选无结果”

### 5.3 分页带（RichPagination）

使用 `@cloud/ui` 的 `RichPagination`；页面代码不要再用 `Select` + `Pagination` 手搓 footer。组件自己承载分页带布局：

- 外壳：`flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-4 py-3`
- 左：本地化 rows-per-page 选择器（传了 `onPageSizeChange` 时显示）+ 本地化 `Showing X-Y of Z` 摘要（`text-xs`，数字 `tabular-nums`）
- 右：`Pagination` 页码（不做 Go-to 跳页输入）
- 每页条数选项默认 `[10, 25, 50, 100]`；只有列表确实需要其他选项时才传 `pageSizeOptions`
- 在 page-size-change handler 里把页码归 1
- 消费侧必须提供 `@cloud/ui` 读取的 `ui.pagination.*` i18n messages

---

## 6. 新增页

两种主形态：**单步表单**（§6.1——普通「新增 / 编辑」页的默认形态）和**多步向导**（§6.2——当任务适合分步骤推进时）。非常小的局部修改可用弹窗表单；多阶段或长耗时流程应使用独立流程页或向导。

### 6.1 单步表单

单步表单是字段彼此独立时的默认形态。用 `PageHeader` 承载标题与操作，再在 `PageBody` 内放一列居中的区块卡片。吸顶头部与卡片堆叠的具体样式 recipe 见 [examples/create-form.tsx](./examples/create-form.tsx)。

不要因为 example 里有底栏、侧栏或完成态，就自动给页面加这些东西。只有当前任务确实需要对应 affordance 时才添加。

### 6.2 多步向导

只有当用户确实需要经历有意义的阶段时才用向导：依赖、分支、复核、外部处理或跨步骤摘要。不要因为字段多就自动改成向导，字段多但彼此独立时仍优先分区卡片的单步表单。

步骤指示、底部导航、可选摘要栏、错误条和完成态的具体样式放在 [examples/create-wizard.tsx](./examples/create-wizard.tsx)。把它当成可复制样式骨架，不要当成产品需求。

---

## 7. 详情页

只读详情页默认使用 `PageHeaderBand` + 内容区。是否使用 tabs 按内容判断：1-2 个核心区块可以直接铺在概览页；多个同级区块才用 tabs；重型区块、独立权限或需要 deep link 的区块可以拆子路由，并记录偏离理由。如果产品明确把编辑页作为详情 surface，按任务选择新增 / 编辑表单模式即可，不要为了满足本节而强加 tabs 或只读详情头。

### 7.1 Overview 双栏

`flex flex-col gap-6 lg:flex-row lg:items-start`；主卡 `Card className="min-w-0 flex-1"`（宽度类直接放 Card，不另包 div）；右侧栏 `flex w-full flex-col gap-6 lg:w-80 lg:shrink-0`（320px）。

- **KV 栅格**：`dl grid-auto-fit-kv gap-x-8 gap-y-3.5 text-sm` —— 列数按**卡片自身宽度**自适应（窄 1 列，宽了 2–3 列），无需视口断点；行 `flex gap-5`，`dt w-40 shrink-0 font-medium text-content-tertiary`，`dd min-w-0 flex-1`；地址 / 备注这类长文本行加 `col-span-full`；空值统一 `Not provided`（tertiary）
  - 响应式自适应列一律走 `grid-auto-fit-*` 工具类（`@cloud/ui` styles），**不要手写** `grid-cols-[repeat(auto-fit,minmax(…))]`（任意值被 lint 禁，且容易漏掉防手机溢出的 `min(…,100%)`）。min 宽按内容原型命名（`-kv` = 标签+值）；需要 `-card` / `-compact` 时在 `packages/ui` 里定好 min 再加。
- **Reveal 控件**：如果产品流程已经要求字段打码，逐字段 Reveal 控件使用 `text-xs font-medium text-info-strong hover:underline`。打码与揭示策略属于业务 / 安全层，不属于本文样式规范。

### 7.2 区块卡片（每个关联集合一张卡）

- 卡头：`CardHeader` + `CardTitle className="text-md"`（+ `CardDescription className="text-xs leading-relaxed text-content-tertiary"`）；头部按钮放 **`CardAction`** 槽位（与文字块垂直居中——团队规范），不手写 flex 容器
- 行列表内容：`CardContent flush`，行直接做子元素：`flex items-center gap-3~3.5 px-4~4.5 py-3~3.5 border-b border-line-subtle last:border-b-0`；行首 `size-10 rounded-lg` 类目图标块，标题 `text-sm font-semibold` + chips `gap-2`，副行 `text-xs`
- 可点击整行：`role="button"` + `cursor-pointer hover:bg-surface-hover`（+ 按下一拍 `active:bg-surface-active`——§3.4）；带持久*选中*态的行走主色 tint 并在选中时压掉 hover（§3.4）。行内独立按钮区 `stopPropagation`，且图标 hover 要与行区分开（§3.2）
- 区块内空态：`px-4~6 py-8~12 text-center text-sm text-content-tertiary`

### 7.3 弹窗

小型上下文 mutation 默认用弹窗承载；长表单、批处理、外部处理任务或需要完整页面上下文的流程不要塞进弹窗。宽度一律用 `Modal` 的 `size` prop（`sm` / `md` / `lg` / `xl`），不要写页面局部 max-width 类。footer 固定 `ghost` 取消 + 主操作，危险操作用 `variant="danger"` + `loading`。

---

## 8. 排版与数据展示细则

Portal 排版遵循 `@cloud/ui` 类型刻度；标题 / 正文只用 Geist，数据读感文本用 Geist Mono，不在页面里引入局部字体。

| 用途 | 规范 |
|---|---|
| 页面标题 | `text-2xl font-semibold tracking-tight` |
| 区块卡标题 | `CardTitle className="text-md"`（14px） |
| 正文 / 行标题 | `text-sm`（13px） |
| 辅助说明 / 副行 | `text-xs`（12px） |
| overline / 数据副注 | `text-2xs`（11px），常配 `uppercase tracking-wider` |
| 计数、日期、金额 | `font-mono tabular-nums`（数据读感） |
| 状态 | `Badge tone=… dot`；终态（Terminated/Expired）可叠 `opacity-70~80` + `line-through` |
| 类目标签 | 类目色 token（teal / violet 等），不是语义色 |

---

## 9. 速查表

```
规则等级          MUST 底线 / SHOULD 默认 / MAY 条件能力 / AVOID 慎用
页面主体          PageBody               TabsContent 用 PAGE_BODY_PADDING_CLASS_NAME
吸顶搜索→卡片      使用 list-page recipe   少数非吸顶列表保持普通 gap-6
卡片内部          p-5 / gap-5（20）       卡片堆叠 gap-5（紧密 3.5）
卡内横带          px-4 py-3             向导卡头 px-5 py-3.5（14·20）
详情 tabs         多个同级区块时使用；重型区块可用子路由并记录理由
控件（条件区）    一律 size md           搜索框 max-w-64 flex-1
条件区吸顶        使用共享 recipe/example；不要每页调 offset
单步表单          头部操作 + 居中区块卡片列
向导              只用于有意义阶段；具体 chrome 放 example
弹窗 size prop    sm360 md480 lg640 xl880  小型 mutation 用 modal，复杂流程用页面/向导
空态 py-12 居中 text-sm tertiary
可点击表面        hover:bg-surface-hover   按下 active:bg-surface-active（§3.4）
可选表面          选中=主色 tint，压过 hover → hover 收在 !selected
```
