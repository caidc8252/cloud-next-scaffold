# Portal 页面样式规范 —— 列表 / 新增 / 详情

> 后台业务页面三种基本页型（列表 → 新增 → 详情）的统一样式规范，提炼自样板模块 `apps/web/app/(portal)/manage/customers`。开发任何模块的这三类页面前先读本文；与本文不一致的旧页面以本文为准逐步收敛。English version: [portal-page-style-spec.en.md](./portal-page-style-spec.en.md)。
>
> **可编译样板**（纯样式骨架，不进打包，可直接对照/拷贝）：[examples/list-page.tsx](./examples/list-page.tsx) · [examples/create-wizard.tsx](./examples/create-wizard.tsx) · [examples/detail-page.tsx](./examples/detail-page.tsx)。
>
> 通用前提：只用 `@cloud/ui` 原语 + 语义 token（`surface/content/line/success/warning/error/info` + 类目色 `teal/violet`），不写十六进制、不写任意值字号；可点击元素必须 `cursor-pointer`。

---

## 1. 页型骨架

Shell `Layout` 的滚动区**无内边距**，页面自己负责留白。三种页型的骨架：

### 1.1 列表页

```tsx
<>
  <ManagePageHeader title description actions={<Button variant="primary" iconLeft={<Plus/>}>New …</Button>} />
  <div className="flex flex-col gap-6 px-6 pt-6 pb-8">
    {/* ① KPI 快捷筛选块 */}
    {/* ② 条件区：搜索栏 + 已应用筛选（一组，内部 gap-2.5；整组吸顶，见 §5） */}
    {/* ③ 列表卡片：计数带 + Table + 分页 */}
  </div>
</>
```

### 1.2 新增页（向导）

```tsx
<>
  <ManagePageHeader title description actions={<Button variant="ghost" iconLeft={<X/>}>Cancel</Button>} />
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

`PageHeaderBand`：`bg-surface-2` + `border-b border-line-subtle`，内层 `px-6 py-4`；紧贴 topbar，左右顶满。`tabs` 槽位渲染在 band 底边上（`flex px-6`），传 line 变体 `TabsList`（默认即 line）加 `shadow-none`，使 tab 下划线与 band 底边重合。

### 2.2 列表 / 向导页头（`ManagePageHeader`）

- 行容器：`flex flex-wrap items-end gap-x-4 gap-y-3`
- 标题：`h1` `text-2xl font-semibold tracking-tight text-content-primary`；行内状态 chip 与标题 `gap-2.5`
- 描述：`mt-1.5 max-w-3xl text-sm text-content-tertiary`
- 动作区：右侧 `flex shrink-0 items-center gap-2`；主操作 `variant="primary"`（列表页“新增”），逃逸操作 `variant="ghost"`（向导“Cancel”）

### 2.3 详情页头（band 内，无卡片）

`flex flex-wrap items-center gap-4`，从左到右：

**返回按钮是硬性要求**：详情页页头最左侧必须有返回入口，样式固定为：

```tsx
<Button
  variant="ghost"
  size="icon-sm"
  aria-label="Back to customers"
  nativeButton={false}
  render={<Link href="/manage/customers" />}
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
| 主体标识 | Logo / 头像 `lg` 尺寸 |
| 标题行 | `h1 text-2xl font-semibold tracking-tight` + 状态 Badge，`gap-2.5` |
| 元信息行 | `mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-content-secondary`，条目内 icon `size-3.5` + `gap-1` |
| 动作 | `Button variant="secondary"` + `shrink-0`，单个按钮不包 div |

Tab 上的计数 chip：`ml-1 h-4 min-w-4 rounded-full bg-surface-3 px-1 text-xs font-medium text-content-tertiary`，计数为 0 时不渲染。

---

## 3. 页面主体与间距体系

| 层级 | 值 | 说明 |
|---|---|---|
| 页面主体边距 | `px-6 pt-6 pb-8` | 原型 24px 边距；列表/向导的 body div 与详情每个 `TabsContent` 一致 |
| 页面级块间距 | `gap-6`（24px） | KPI 块 ↔ 搜索区 ↔ 列表卡片；向导块之间；详情双栏之间 |
| 同区域卡片堆叠 | `gap-5`（20px） | 如详情页 Operators 卡 ↔ Roles 卡 |
| 紧密关联卡片 | `gap-3.5`（14px） | 如合同主卡 ↔ 历史折叠卡 |
| 工具栏 ↔ 筛选反馈 | `gap-2.5`（10px） | 两者包成一组 `flex flex-col gap-2.5`，再以 gap-6 与相邻块分隔 |
| 卡片内 dense 横带 | `px-4 py-3` | 计数带、分页带、区块卡头带 |
| 卡片槽位 padding | Card `size` 决定（md = `p-5`） | 需要自定尺寸时用 `flush` + 自带 padding（如向导卡头 `px-5 py-4`），**不要**用 `p-0` 去覆盖 |

通用原则：**包装 div 必须有职责**（间距分组 / 滚动 / flex 宽度约束）。只有一个子元素且类可以并到子元素上的包装层一律去掉（Card / Button / Input 的根都接受 `className`；注意带 `prefix` 的 Input className 落在内层，需要外包一层做宽度）。

---

## 4. KPI 快捷筛选块

三块定宽栅格，块本身是**可点击的状态筛选器**（点击切换，再点取消）：

```
grid grid-cols-3 gap-3
块:    button · rounded-lg border px-4 py-3 text-left transition-colors cursor-pointer
静止:  border-line-subtle bg-surface-2 shadow-1 hover:bg-surface-hover
激活:  border-primary-500 bg-primary-50 ring-2 ring-primary-500/10（标签与数字同步转 primary-700）
标签:  text-2xs font-medium tracking-wider uppercase text-content-tertiary
数值行: mt-1 flex items-baseline gap-1.5
数值:  font-mono text-2xl tracking-tight tabular-nums
副文:  text-2xs text-content-tertiary
```

激活样式必须强于 hover（激活态不再带 hover 底色）。

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

结构：`Card elevation={1}` → 计数带 → `Table` → 分页带。三段自带边框分隔，卡片本身不加 padding。

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
| 行尾箭头列 | `width: 48, align: "right"`，被动 `ChevronRight size-3.5 text-content-tertiary`——**整行是点击目标**（`onRowClick`），不放行内按钮 |

- 列标题以**大写文本**传入（原语不做 text-transform）
- 排序为三态循环：升 → 降 → 还原自然序；`onSortChange(null)` 必须处理（回种子顺序），不能忽略
- 空态：`py-12 text-center text-sm text-content-tertiary`，文案区分“无数据”与“筛选无结果”

### 6.3 分页带（RichPagination）

`flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle px-4 py-3`：

- 左：`Rows per page` + `Select sm`（72px）+ 摘要 `Showing X–Y of Z`（`text-xs`，数字 `tabular-nums`）
- 右：`Pagination` 页码（不做 Go-to 跳页输入）
- 切每页条数后页码归 1

---

## 7. 新增向导

- **步骤指示**：`StepIndicator` 套卡片外观 `rounded-xl border border-line-default bg-surface-2 px-5.5 py-4 shadow-1`
- **双栏**：`flex flex-col gap-6 lg:flex-row lg:items-start`；主列 `min-w-0 flex-1`；摘要 rail 组件自带 `w-full lg:w-75 lg:shrink-0`（300px）+ `sticky top-5`，需要全宽的步骤直接不渲染 rail
- **步骤卡片头**：`CardHeader flush className="px-5 py-4"` + `CardTitle className="text-md"`（+ 可选 `CardDescription text-xs text-content-tertiary`）；内容区用默认槽位 padding
- **摘要 rail**：`p-4.5`，标题 `text-sm font-semibold mb-3`，`dl flex flex-col gap-2 text-xs`，`dt w-20 shrink-0 text-content-tertiary`，空值 `—`
- **错误条**：主列内 `mt-3 rounded-md border border-error/30 bg-error-bg px-3 py-2 text-sm text-error-strong` + `role="alert"`
- **底部导航**：`mt-6 flex items-center justify-between`；Back `ghost`（第一步禁用），Continue `primary` 带右箭头，最后一步换 Create `primary` 带 Check + `loading`
- **完成步**：居中卡片 `CardContent flex flex-col items-center px-8 py-10`；72px 成功圆标（`size-18 rounded-full border-success/25 bg-success-bg text-success-strong`）→ 状态 Badge → `text-2xl` 标题 → `max-w-md text-sm` 说明 → 主操作按钮

校验逻辑与字段组件**沉到 feature 级共享文件**（如 `_components/company-fields.tsx` 的 `isCompanyDataValid`），向导与详情编辑弹窗复用同一份，不写两遍。

---

## 8. 详情页

### 8.1 Overview 双栏

`flex flex-col gap-6 lg:flex-row lg:items-start`；主卡 `Card className="min-w-0 flex-1"`（宽度类直接放 Card，不另包 div）；右 rail `flex w-full flex-col gap-6 lg:w-80 lg:shrink-0`（320px）。

- **KV 栅格**：`dl flex flex-col gap-3.5 text-sm`；行 `flex gap-5`，`dt w-40 shrink-0 font-medium text-content-tertiary`，`dd min-w-0 flex-1`；空值统一 `Not provided`（tertiary）
- **统计卡**：`Card className="gap-1 px-4 py-3.5"`；标签 `text-xs font-medium text-content-secondary`，数值 `text-2xl font-semibold leading-tight`，增量行 `mt-0.5 text-xs text-content-tertiary`
- **PII 掩码**：默认打码，逐字段 `Reveal`（`text-xs font-medium text-info-strong hover:underline`），揭示时 toast 提示已记审计

### 8.2 区块卡片（合同 / 操作员 / 角色）

- 卡头：`CardHeader` + `CardTitle className="text-md"`（+ `CardDescription className="text-xs leading-relaxed text-content-tertiary"`）；头部按钮放 **`CardAction`** 槽位（与文字块垂直居中——团队规范），不手写 flex 容器
- 行列表内容：`CardContent flush`，行直接做子元素：`flex items-center gap-3~3.5 px-4~4.5 py-3~3.5 border-b border-line-subtle last:border-b-0`；行首 `size-10 rounded-lg` 类目图标块，标题 `text-sm font-semibold` + chips `gap-2`，副行 `text-xs`
- 可点击整行：`role="button"` + `cursor-pointer hover:bg-surface-hover`，行内独立按钮区 `stopPropagation`
- 区块内空态：`px-4~6 py-8~12 text-center text-sm text-content-tertiary`

### 8.3 弹窗

所有 mutation 走弹窗 + route handler。宽度：确认类 `sm:max-w-[440px]`，表单类 `sm:max-w-[620px]`。footer 固定 `ghost` 取消 + 主操作（危险操作 `variant="danger"` + `loading`）。

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
页面边距          px-6 pt-6 pb-8        块间 gap-6
卡内横带          px-4 py-3             卡片堆叠 gap-5（紧密 3.5）
控件（条件区）    一律 size sm           搜索框 max-w-64 flex-1
条件区吸顶        sticky top-0 z-10 -mx-6 -my-3 bg-surface-1 px-6 py-3
向导 rail        w-75 sticky top-5      详情 rail w-80
确认弹窗 440px    表单弹窗 620px         空态 py-12 居中 text-sm tertiary
```
