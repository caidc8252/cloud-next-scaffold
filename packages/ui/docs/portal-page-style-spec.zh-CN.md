# Portal 页面样式规范 —— 列表 / 新增 / 详情

> 后台业务页面三种基本页型（列表 → 新增 → 详情）的统一样式规范，提炼自样板模块 `apps/web/app/(portal)/manage/customers`。开发任何模块的这三类页面前先读本文；与本文不一致的旧页面以本文为准逐步收敛。English version: [portal-page-style-spec.en.md](./portal-page-style-spec.en.md)。
>
> **可编译样板**（纯样式骨架，不进打包，可直接对照/拷贝）：[examples/list-page.tsx](./examples/list-page.tsx) · [examples/create-form.tsx](./examples/create-form.tsx) · [examples/create-wizard.tsx](./examples/create-wizard.tsx) · [examples/detail-page.tsx](./examples/detail-page.tsx)。
>
> 通用前提：只用 `@cloud/ui` 原语 + 语义 token（`surface/content/line/success/warning/error/info` + 类目色 `teal/violet`），不写十六进制、不写任意值字号；可点击元素必须 `cursor-pointer`。
>
> **吸附到刻度，不要照搬原始值。** 原型给你的是精确像素（`459px` 的弹窗、`13px` 的间距、不在色板里的灰）；那是*意图*，不是要逐字拷贝的字面量。当某个原型值落在两个法定 token 之间，**就近吸附**到最接近的那个——谁近选谁——并用原语的 prop / 刻度类，绝不手写任意值（`max-w-[459px]`、`gap-[13px]`、`bg-[#…]`）。例：459px 弹窗 → `<Modal size="md">`（480px，最近），**不是** `size="sm"`（360px），**更不要** `className="sm:max-w-[459px]"`。锁死刻度的意义是跨页面一致；一个"贴合稿子"的越界值，是拿一致性去换一个用户根本感知不到的差异。
>
> **优先继承，密度锁死。** 所有页面先继承下面的布局规则。**允许调整内容**——文案、字段、出现哪些卡片/列——但**不允许调整你自己手写的间距**：页边距、块/栏间距、搜索栏→列表卡片的 16px 收紧、卡头内边距（14·20）、区块卡片堆叠（`gap-5`）。卡片圆角 / 1px 边 / 阴影、页头条内边距、Tabs 条高度都由 `@cloud/ui` 原语内置（`Card elevation={1}`、`PageHeaderBand`、line `TabsList`）——直接继承，别重述或对抗。与本文不一致的旧页面以本文为准逐步收敛。

---

## 1. 页型骨架

Shell `Layout` 的滚动区**无内边距**，页面自己负责留白。三种页型的骨架：

### 1.1 列表页

```tsx
<>
  <PageHeader title description actions={<Button variant="primary" iconLeft={<Plus/>}>New …</Button>} />
  <div className="flex flex-col gap-6 px-6 pt-6 pb-8">
    {/* ① KPI 快捷筛选块 */}
    {/* ② 条件区：搜索栏 + 已应用筛选（一组，内部 gap-2.5；整组吸顶，见 §5） */}
    {/* ③ 列表卡片：计数带 + Table + 分页 */}
  </div>
</>
```

### 1.2 新增页

两种形态——普通「新增 / 编辑」页（占多数）用**单步表单**；只有当输入确实是分步顺序或有分支时，才用**多步向导**。

**单步表单（默认）**——Cancel 与 Submit **都放吸顶头部**；主体是单列居中的区块卡片。无底栏、无摘要 rail、无完成步。

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
  <div className="px-6 pt-6 pb-8">
    <div className="mx-auto flex max-w-3xl flex-col gap-6">{/* Card elevation={1} 区块卡片 */}</div>
  </div>
</>
```

**多步向导**——仅当输入是顺序 / 分支流程时使用。

```tsx
<>
  <PageHeader title description actions={<Button variant="ghost" iconLeft={<X/>}>Cancel</Button>} />
  <div className="flex flex-col gap-6 px-6 pt-6 pb-8">
    <StepIndicator className="rounded-xl border border-line-default bg-surface-2 px-5.5 py-4 shadow-1" … />
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">{/* 当前步骤卡片 + 错误条 + 底部导航 */}</div>
      {/* 摘要 rail（300px，需全宽的步骤不渲染即可，主列自动铺满） */}
    </div>
  </div>
</>
```

### 1.3 详情页

一个页面 + Tabs 切换，**不做子路由**。

```tsx
<Tabs value={tab} onValueChange={…} className="gap-0">
  <PageHeaderBand tabs={<TabsList className="shadow-none">…</TabsList>}>
    <DetailHeader … />
  </PageHeaderBand>
  <TabsContent value="…" className={TAB_BODY_CLASS}>…</TabsContent>  {/* TAB_BODY_CLASS = "px-6 pt-6 pb-8" */}
</Tabs>
```

服务端 `page.tsx` 保持薄入口：守卫（`requirePermissions`）→ 取数 → 渲染客户端视图，不放布局。

---

## 2. 页头

### 2.1 白色通栏 band（共用容器）

`PageHeaderBand`：`bg-surface-2` + `border-b border-line-subtle`，内层 `px-6 py-4`；紧贴 topbar，左右顶满。`tabs` 槽位渲染在 band 底边上（`flex px-6`），传 line 变体 `TabsList`（默认即 line）加 `shadow-none`，使 tab 下划线与 band 底边重合。line 条高约 **42px**（由 line 变体的 padding 撑出，不是固定 `h-*`）；若某页需要精确高度，在消费侧定高，不要改 band。

> **来源与选择规则。** `PageHeader`（list / create 页头，§2.2）和 `PageHeaderBand`（detail 页头，§2.3）都在 `@cloud/ui/components/layout`。后台管理页（list / create / detail）用这套全幅 band——贴 topbar、`text-2xl`。内容区普通标题页（如 dashboard、settings）改用同一包里的 `ContentHeader`——它是内容流内的 `text-3xl` 标题，不是 band。

### 2.2 列表 / 新增页头（`PageHeader`）

- 行容器：`flex flex-wrap items-end gap-x-4 gap-y-3`
- 标题：`h1` `text-2xl font-semibold tracking-tight text-content-primary`；行内状态 chip 与标题 `gap-2.5`
- 描述：`mt-1.5 max-w-3xl text-sm text-content-tertiary`
- 动作区：右侧 `flex shrink-0 items-center gap-2`，按页型：
  - **列表**——一个 `variant="primary"` 主操作（“新增…”）
  - **向导**——一个 `variant="ghost"` 逃逸操作（“Cancel”）
  - **单步表单**——`ghost` Cancel **与** `primary` Submit 并排，并把 band 设为 `sticky`，使 Submit 在表单滚动时始终可达（§7.1）

### 2.3 详情页头（band 内，无卡片）

`flex flex-wrap items-center gap-4`，从左到右：

**返回按钮是硬性要求**：详情页页头最左侧必须有返回入口，样式固定为：

```tsx
<Button
  variant="ghost"
  size="icon-sm"
  aria-label="Back to list"
  nativeButton={false}
  render={<Link href="/manage/<list>" />}
>
  <ChevronLeft className="size-4" />
</Button>
```

- ghost 幽灵图标按钮（`icon-sm`）+ `ChevronLeft size-4`，不带文字
- 用 `render={<Link/>}` 渲染成真实链接（可中键新开页、可悬停预览），**不要** `onClick + router.push`，也**不要** `router.back()` —— 从外部直链 / 新标签进入详情页时，`back()` 没有确定去处；`href` 固定指向本模块列表页
- `aria-label` 必填（图标按钮无可读文本）

| 元素 | 规范 |
|---|---|
| 返回 | 见上方硬性配方 |
| 主体标识 | Logo / 头像 / 首字母块 `lg` 尺寸（无标识则省略） |
| 标题行 | `h1 text-2xl font-semibold tracking-tight` + 状态 Badge，`gap-2.5` |
| 元信息行 | `mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-content-secondary`，条目内 icon `size-3.5` + `gap-1` |
| 动作 | `Button variant="secondary"` + `shrink-0`，单个按钮不包 div |

Tab 上的计数 chip：`ml-1 h-4 min-w-4 rounded-full bg-surface-3 px-1 text-xs font-medium text-content-tertiary`，计数为 0 时不渲染。

---

## 3. 页面主体与间距体系

**节奏对应的 Tailwind** —— 横向基准**处处 24px**：`px-6` 页边 + `gap-6` 栏间距。纵向节奏走 **24 → 16 → 20**：大区块 `gap-6`（24px）；搜索栏**贴**列表卡片，间距收到 **16px**（在卡片上加 `-mt-2` 把页面节奏拉近——§5 / §6）；卡片内部 **20px**（`p-5` 内边距、`gap-5` 堆叠）。这些密度是定值（见开头）——下面的阶梯就是全集；调内容，不调间距。

| 层级 | 值 | 说明 |
|---|---|---|
| 页面主体边距 | `px-6 pt-6 pb-8` | 原型 24px 边距；列表/向导的 body div 与详情每个 `TabsContent` 一致 |
| 页面级块间距 | `gap-6`（24px） | KPI 块 ↔ 搜索区；向导块之间；详情双栏之间 |
| 搜索栏 ↔ 列表卡片 | **16px**（卡片加 `-mt-2`） | 条件区贴表格——把页面 `gap-6` 拉近 8px；吸顶条自身的 `-my-3` 不变（§5、§6） |
| 同区域卡片堆叠 | `gap-5`（20px） | 详情页同一 tab 内并列的区块卡片 |
| 紧密关联卡片 | `gap-3.5`（14px） | 主卡 ↔ 其直接相关的子卡（如某列表 ↔ 其折叠历史卡） |
| 工具栏 ↔ 筛选反馈 | `gap-2.5`（10px） | 两者包成一组 `flex flex-col gap-2.5`，再以 gap-6 与相邻块分隔 |
| 卡片内 dense 横带 | `px-4 py-3` | 计数带、分页带、区块卡头带 |
| 卡片槽位 padding | Card `size` 决定（md = `p-5`） | 需要自定尺寸时用 `flush` + 自带 padding（如向导卡头 `px-5 py-3.5`——14·20），**不要**用 `p-0` 去覆盖 |

通用原则：**包装 div 必须有职责**（间距分组 / 滚动 / flex 宽度约束）。只有一个子元素且类可以并到子元素上的包装层一律去掉（Card / Button / Input 的根都接受 `className`；注意带 `prefix` 的 Input className 落在内层，需要外包一层做宽度）。

### 3.1 行对齐

**行头带名称/标题、行尾带操作的行，一律垂直居中对齐**（`items-center`）——行头标签与行尾操作落在同一条中线上，不用 `items-start`。这是通用规则，凡是这种形态都适用：区块卡片的行列表（§8.2）、带行尾按钮/开关的设置行/列表行、详情页头（§2.3）、带 `CardAction` 的卡内头带等。

唯一例外：行头是确实多行的块（标题 + 副行 + 元信息）、且操作要对齐到**第一行**时，才改用顶端对齐（`items-start`）——但默认是居中，只有多行行头确有需要时才用 `items-start`。

### 3.2 行内操作的 hover

当一行本身有 hover（`hover:bg-surface-hover`）**且**带行内操作图标时，每个图标的 hover 必须**与行的 hover 区分开**——默认 `ghost` 按钮的 hover 也是 `bg-surface-hover`，落在已 hover 的行上自己的 hover 就看不见了。surface token 是实色（非半透明），所以行内控件要**换 token**，不能指望叠加变深：

- **中性操作**（编辑、更多…）：`ghost` 提一档——`className="hover:bg-surface-active"`（比行深一级）。
- **危险操作**（删除）：`variant="ghost-danger"`——hover 是 `error-bg` 红色 tint，与中性行 hover 永不撞色，还顺带表达"危险"语义。
- 操作的 `onClick` 一律 `e.stopPropagation()`，避免触发行的 `onRowClick`；图标用 `flex items-center` 成簇（§3.1）。危险操作仍走确认 Modal（§8.3）。

参考：app-publish 列表表格(行尾的编辑 + 删除)。

### 3.3 图标按钮操作与危险语义

两条不变量，凡是出现操作的地方都适用——不只是滚动的列表行。它们约束的是**变体选择**，不是"能不能加这个操作"：

- **icon-only 的操作按钮只能是 `ghost`（中性）或 `ghost-danger`（危险）——绝不用 `secondary` / `primary` / 带边框。** 纯图标没有文字标签，强调只能靠 hover token，不能靠填充背景（§3.2）。这是对行内图标唯一的硬约束。它**不**禁止行里出现带文字的操作按钮：当某个操作确实够分量（Approve、Activate、行级主 CTA），就用带文字的 `secondary` / `primary` ——只要保持有文字、语义清楚，别把一个裸图标提成填充变体。
- **所有危险操作必须带 danger 变体，无一例外。** 删除 / 移除 / 撤销 / 终止 / 重置 / 断开：图标按钮形态用 `variant="ghost-danger"`，文字按钮或弹窗 footer 形态用 `variant="danger"`（§8.3）。**不要**靠给中性 `ghost` 染色来表达危险（比如在普通 `ghost` 里塞红色 `Trash2`，或加 `text-error` 类名）——变体本身已经承载了危险 hover token（§3.2）和语义，自定义图标颜色反而和它打架。`ghost-danger` 里的图标要去掉任何 `text-content-*` / `text-error` 覆盖，颜色交给变体。

### 3.4 可点击表面的状态（hover / 按下 / 选中）

任何可点击表面——列表行、快捷筛选 tile、整张单选卡——的可点击感都来自**背景**变化，不是只靠边框。边框 / ring 是*加强*，绝不能是唯一信号（1px 线作为唯一的命中提示太容易被忽略）。中性 surface 阶梯一次走一档实色：`surface-2`（静止）→ `surface-hover` → `surface-active`。按交互类型选状态：

- **导航型**（点击打开详情或触发 `onRowClick`、随后离开本页的行 / 卡）：静止 = 自身底色 → `hover:bg-surface-hover` → 按下一拍 `active:bg-surface-active`。不保留点亮态，因为点击就跳走了。对应 §6.2 的表格行（`onRowClick`）和 §8.2 的区块卡片行。
- **可选 / 切换型**（点击后保持点亮——KPI 快捷筛选、单选卡、多选行）：选中态是**主色 tint，且压过 hover**。把中性 hover 收在 `!selected` 之后（`!selected && "hover:bg-surface-hover"`），灰底色就永远不会盖住点亮的 tint。两种法定写法——别造第三种：
  - **`Table` 里的行**：传 `state.selected`，原语会施加 `aria-selected:bg-state-selected aria-selected:hover:bg-state-selected aria-selected:shadow-row-selected`（`state-selected` token + 内嵌主色竖条）。不要手搓。
  - **独立 tile / 卡片**：`border-primary-500 bg-primary-50`（tile 再加 `ring-2 ring-primary-500/10`）。快捷筛选交给 `KpiTile`（§4）——用原语；只有定制单选卡才手写这对类。
- 可 hover 行上的**行内操作**保持与行区分的 hover（§3.2）：中性操作 → `hover:bg-surface-active`（比行深一档），危险操作 → `ghost-danger`。

唯一硬规则：**选中 ≠ hover。** 点亮 / 选中的表面**不能**再带无条件的 `hover:bg-surface-hover`——指针移上去会闪回中性灰、被读成"已取消选中"。一律把 hover 收在 `!selected` 之后（`KpiTile` 和 `Table` 原语已经这么做；手搓可选列表时照做）。

---

## 4. KPI 快捷筛选块

单块一律用 `@cloud/ui` 的 `KpiTile`，它承载样式 + 无障碍（激活态压过 hover、`role="button"` 键盘支持、非原生 button 约束）。**不要手写 tile 的类，用原语。** **栅格、tile 数据、与 toolbar/筛选的联动都留在页面里：**

- **栅格**（页面自己写）：`grid grid-cols-3 gap-3`（四块用 `grid-cols-2 sm:grid-cols-4`）。
- **`activeKey`** 由「已应用筛选」**派生**，不单独存；点击 tile 改已应用筛选（点激活项则清除）。
- 传 `onClick` 即交互式快捷筛选；**不传则纯展示**（不渲染 cursor / role / 键盘）。
- 标准内容用 `label` / `value` / `sub`；需要自定义内部布局传 `children`。

```tsx
<div className="grid grid-cols-3 gap-3">
  {tiles.map((tile) => (
    <KpiTile
      key={tile.key}
      active={tile.key === activeKey}
      onClick={() => onSelect(tile.key)}   // 不传 = 纯展示
      label={tile.label}
      value={tile.value}
      sub={tile.sub}
    />
  ))}
</div>
```

激活样式强于 hover——组件已保证（激活态不带 hover 底色）。这是通用「可选表面」规则的独立 tile 形态（§3.4）。

---

## 5. 搜索栏与已应用筛选

**Apply 模型**：输入只改草稿，点 Search / 回车才提交；提交同时把页码归 1。

**吸顶**：条件区（搜索栏 + 筛选反馈，整组）在列表下滚时停靠在 app-header 正下方：

```
sticky top-0 z-10 -mx-6 -my-3 flex flex-col gap-2.5 bg-surface-1 px-6 py-3
```

- shell `Layout` 的 `<main>` 是滚动容器、app-header 在滚动区外，所以 `top-0` 即紧贴 header，无需偏移量
- `-mx-6` + `px-6` 全幅出血，配合画布底色 `bg-surface-1` 遮住从下方穿过的表格行（不出血会在左右 24px 槽里露馅）
- `py-3` 给停靠态上下 12px 呼吸；`-my-3` 把它抵消掉，静止时块间节奏仍是 gap-6
- `z-10` 足够压住表格内容；弹层（Select 下拉等）走 portal，不受影响
- 下方列表卡片用 `-mt-2` 上拉，使搜索栏 → 表格间距落到 **16px**（比 24px 页面节奏更紧）；本吸顶条的 `-my-3` 保持对称不变（§3、§6）

- 行容器：`flex flex-wrap items-center gap-2`；所有控件统一 `sm`（28px 高）
- 搜索输入：带 `prefix={<Search className="size-3.5"/>}`，外包 `max-w-64 flex-1`
- 下拉筛选：`SelectTrigger size="sm"` 定宽（150–200px）；`SelectValue` 用 render-prop 显示标签（base-ui 默认显示原始 value）
- 提交按钮：`variant="primary" size="sm"` + Search 图标

**筛选反馈行**（紧贴工具栏下方，`gap-2.5` 分组）：

- 无筛选：一句 `text-xs text-content-tertiary` 的操作提示
- 有筛选：`Active filters:` + 若干 FilterChip + `Clear all`（ghost xs）
- FilterChip：`rounded-full border border-primary-500/25 bg-primary-50 py-0.5 pr-1 pl-2.5 text-xs font-medium text-primary-700`，尾部 `Button size="icon-xs" variant="ghost"` 的 X 可单独移除

---

## 6. 列表卡片

结构：`Card elevation={1}` → 计数带 → `Table` → 分页带。三段自带边框分隔，卡片本身不加 padding。卡片带 `-mt-2`，使吸顶条件区 → 表格间距落到 **16px**——它贴着表格，比 24px 页面节奏更紧（§3、§5）。

### 6.1 计数带

`flex items-center justify-between gap-3 border-b border-line-subtle px-4 py-3`。左侧 `text-sm text-content-secondary`，数字 `font-mono font-semibold tabular-nums text-content-primary`，有筛选时追加 ` matching filters`（tertiary）。右侧动作槽（导出按钮 `secondary sm`）。

### 6.2 表格

优先用类型化 `Table<R>`（columns 配置），不手写 thead/tbody。

**文本列只有三种形态，禁止自创新的字号 / 颜色组合**（以 customers 表为准）：

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
| 标签集合列 | `flex flex-wrap gap-1`，空值 `—` |
| 行尾箭头列 | `width: 48, align: "right"`，被动 `ChevronRight size-3.5 text-content-tertiary`——**整行是点击目标**（`onRowClick`）。默认用这个；若该行确需行内操作（编辑/删除），去掉箭头、按 §3.2 处理其 hover + `stopPropagation` |

- 列标题以**大写文本**传入（原语不做 text-transform）
- 排序为三态循环：升 → 降 → 还原自然序；`onSortChange(null)` 必须处理（回种子顺序），不能忽略
- 空态：`py-12 text-center text-sm text-content-tertiary`，文案区分“无数据”与“筛选无结果”

### 6.3 分页带（RichPagination）

`flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-4 py-3`：

- 左：`Rows per page` + `Select sm`（72px）+ 摘要 `Showing X–Y of Z`（`text-xs`，数字 `tabular-nums`）
- 右：`Pagination` 页码（不做 Go-to 跳页输入）
- 切每页条数后页码归 1

---

## 7. 新增页

两种形态：**单步表单**（§7.1——普通「新增 / 编辑」页的默认形态）和**多步向导**（§7.2——仅当流程确实是顺序或分支时）。

### 7.1 单步表单

- **吸顶头部**：`<PageHeader sticky … />` 承载标题 + 描述 **以及两个操作**——`ghost` Cancel（`iconLeft={<X/>}`）+ `primary` Submit（`iconLeft` create 用 `Plus` / edit 用 `Check`，pending 时 `loading`）。band 吸顶，使 Submit 在表单滚动时始终可达；与列表条件区（§5——shell `<main>` 是滚动容器，故 `top-0` 即贴在 app-header 下）一样停靠，不透明的 `bg-surface-2` 遮住从下方穿过的内容。**没有底部操作栏**——头部是唯一的操作面。
- **主体**：单列居中——`px-6 pt-6 pb-8` 页边距内套 `<div className="mx-auto flex max-w-3xl flex-col gap-6">`——按职责分组的 `Card elevation={1}` 区块卡片（Identity / Visibility / …）。无 `StepIndicator`、无摘要 rail、无完成步。
- **提交**：在 handler 里拦住非法 / 进行中的提交，首次提交时再暴露字段错误；成功后直接 `router.push` 到新记录的详情页——不另做确认页。
- 参考实现：`apps/web/app/(portal)/app/app-publish/new/_components/app-form.tsx`——同一个组件用 `mode` 同时服务新增与编辑。

### 7.2 多步向导

仅当输入是顺序 / 分支流程时使用。

- **步骤指示**：`StepIndicator` 套卡片外观 `rounded-xl border border-line-default bg-surface-2 px-5.5 py-4 shadow-1`
- **双栏**：`flex flex-col gap-6 lg:flex-row lg:items-start`；主列 `min-w-0 flex-1`；摘要 rail 组件自带 `w-full lg:w-75 lg:shrink-0`（300px）+ `sticky top-5`，需要全宽的步骤直接不渲染 rail
- **步骤卡片头**：`CardHeader flush className="px-5 py-3.5"`（14·20）+ `CardTitle className="text-md"`（+ 可选 `CardDescription text-xs text-content-tertiary`）；内容区用默认槽位 padding
- **摘要 rail**：`p-4.5`，标题 `text-sm font-semibold mb-3`，`dl flex flex-col gap-2 text-xs`，`dt w-20 shrink-0 text-content-tertiary`，空值 `—`
- **错误条**：主列内 `mt-3 rounded-md border border-error/30 bg-error-bg px-3 py-2 text-sm text-error-strong` + `role="alert"`
- **底部导航**：`mt-6 flex items-center justify-between`；Back `ghost`（第一步禁用），Continue `primary` 带右箭头，最后一步换 Create `primary` 带 Check + `loading`
- **完成步**：居中卡片 `CardContent flex flex-col items-center px-8 py-10`；72px 成功圆标（`size-18 rounded-full border-success/25 bg-success-bg text-success-strong`）→ 状态 Badge → `text-2xl` 标题 → `max-w-md text-sm` 说明 → 主操作按钮

校验逻辑与字段组件**沉到 feature 级共享文件**（如 `_components/<entity>-fields.tsx` 导出的 `isFieldsetValid`），新增页（表单或向导）与详情编辑弹窗复用同一份，不写两遍。

---

## 8. 详情页

### 8.1 Overview 双栏

`flex flex-col gap-6 lg:flex-row lg:items-start`；主卡 `Card className="min-w-0 flex-1"`（宽度类直接放 Card，不另包 div）；右 rail `flex w-full flex-col gap-6 lg:w-80 lg:shrink-0`（320px）。

- **KV 栅格**：`dl grid-auto-fit-kv gap-x-8 gap-y-3.5 text-sm` —— 列数按**卡片自身宽度**自适应（窄 1 列，宽了 2–3 列），无需视口断点；行 `flex gap-5`，`dt w-40 shrink-0 font-medium text-content-tertiary`，`dd min-w-0 flex-1`；地址 / 备注这类长文本行加 `col-span-full`；空值统一 `Not provided`（tertiary）
  - 响应式自适应列一律走 `grid-auto-fit-*` 工具类（`@cloud/ui` styles），**不要手写** `grid-cols-[repeat(auto-fit,minmax(…))]`（任意值被 lint 禁，且容易漏掉防手机溢出的 `min(…,100%)`）。min 宽按内容原型命名（`-kv` = 标签+值）；需要 `-card` / `-compact` 时在 `packages/ui` 里定好 min 再加。
- **统计卡**：`Card className="gap-1 px-4 py-3.5"`；标签 `text-xs font-medium text-content-secondary`，数值 `text-2xl font-semibold leading-tight`，增量行 `mt-0.5 text-xs text-content-tertiary`
- **PII 掩码**：默认打码，逐字段 `Reveal`（`text-xs font-medium text-info-strong hover:underline`），揭示时 toast 提示已记审计

### 8.2 区块卡片（每个关联集合一张卡）

- 卡头：`CardHeader` + `CardTitle className="text-md"`（+ `CardDescription className="text-xs leading-relaxed text-content-tertiary"`）；头部按钮放 **`CardAction`** 槽位（与文字块垂直居中——团队规范），不手写 flex 容器
- 行列表内容：`CardContent flush`，行直接做子元素：`flex items-center gap-3~3.5 px-4~4.5 py-3~3.5 border-b border-line-subtle last:border-b-0`；行首 `size-10 rounded-lg` 类目图标块，标题 `text-sm font-semibold` + chips `gap-2`，副行 `text-xs`
- 可点击整行：`role="button"` + `cursor-pointer hover:bg-surface-hover`（+ 按下一拍 `active:bg-surface-active`——§3.4）；带持久*选中*态的行走主色 tint 并在选中时压掉 hover（§3.4）。行内独立按钮区 `stopPropagation`，且图标 hover 要与行区分开（§3.2）
- 区块内空态：`px-4~6 py-8~12 text-center text-sm text-content-tertiary`

### 8.3 弹窗

所有 mutation 走弹窗 + route handler。**宽度用 `Modal` 的 `size` prop——绝不手写 `className="sm:max-w-[…]"`。** 刻度由原语掌握：`sm` 360 / `md` 480（默认）/ `lg` 640 / `xl` 880。确认类 → `size="md"`（480），表单类 → `size="lg"`（640）；只有表单主体确有需要才上 `xl`。原型给的越界宽度**就近吸附到最接近的 token**（459px 稿 → `md`，620px → `lg`；谁近选谁——见 §1 的吸附规则），页面就永远不带任意值 `max-w-[…]`。footer 固定 `ghost` 取消 + 主操作（危险操作 `variant="danger"` + `loading`）。

---

## 9. 排版与数据展示细则

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

## 10. 速查表

```
页面边距          px-6 pt-6 pb-8        块间 gap-6（24）
搜索栏→卡片        -mt-2 → 16px 贴表格    卡片内部 p-5 / gap-5（20）
卡内横带          px-4 py-3             卡片堆叠 gap-5（紧密 3.5）
向导卡头          px-5 py-3.5（14·20）   tabs 条 ~42px（line 变体）
控件（条件区）    一律 size sm           搜索框 max-w-64 flex-1
条件区吸顶        sticky top-0 z-10 -mx-6 -my-3 bg-surface-1 px-6 py-3
单步表单          吸顶头部（cancel+submit）  主体 mx-auto max-w-3xl 单列，无底栏
向导 rail        w-75 sticky top-5      详情 rail w-80
弹窗 size prop    sm360 md480 lg640 xl880  确认 md / 表单 lg，就近吸附（§1、§8.3）
空态 py-12 居中 text-sm tertiary
可点击表面        hover:bg-surface-hover   按下 active:bg-surface-active（§3.4）
可选表面          选中=主色 tint，压过 hover → hover 收在 !selected
```
