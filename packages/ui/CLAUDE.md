# `@cloud/ui` — 组件库内部修改约束

本文件仅对**修改 `packages/ui/` 本身**的 AI 生效。消费方（apps/* 下使用组件库的代码）请参考 `.claude/skills/cloud-ui/SKILL.md`。

总原则：组件库是产品的样式与交互契约，任何扩张都要先证明无法靠现有能力满足。**默认拒绝扩张，能复用就复用，能调参就不加变体，能扩 variant 就不加组件，能扩组件就不加 token。**

---

## 一、Design token：默认禁止新增

`src/components/styles/index.css` 中的 `@theme { … }` 是设计 token 的唯一来源。它会同时生成 CSS 变量和 Tailwind 工具类。

**禁止行为**（除非用户当轮对话中明确点名要求）：

- 在 `@theme` 块中新增 `--color-*`、`--spacing-*`、`--radius-*`、`--font-size-*`、`--shadow-*`、`--z-*` 等任何变量。
- 修改现有 token 的取值（颜色、间距、字号等）。
- 在 dark mode 覆盖块中新增条目。
- 在 `theme.tsx` 中扩展主题切换接口。

**遇到"似乎缺一个 token"时怎么办**：
1. 先在已有 token 中找最接近的语义项（如要"次要文本"先看 `text-content-secondary`，不要新建 `text-content-muted`）。
2. 如果确实找不到，**停下来，不要动手**。用一两句话向用户说明：缺什么、建议加什么变量、加在哪一组下，等用户确认。
3. 用户确认后再修改，并同步更新 `.claude/skills/cloud-ui/SKILL.md` 的 token 表。

## 二、组件：默认禁止新增

`src/components/ui/` 下是基础组件，已经覆盖了 shadcn 体系的大部分常用件。

**新增一个组件文件之前，必须依次确认**：

1. 列出 `components/ui/` 中语义相近的组件（如要做 Drawer，先看 `modal.tsx`、`sheet.tsx`、`popover.tsx`）。
2. 能否通过给现有组件加 `variant` / `size` / prop 解决？能就改现有组件，不要新建。
3. 是否其实是业务组合？业务组合属于 `apps/*/components/`，不进 `@cloud/ui`。
4. 以上都不行，再考虑新建——并在动手前向用户简述："要新建 X 组件，因为 A/B/C 都不能覆盖"，等确认。

## 三、样式：只允许 token 类名

组件实现里：

- 颜色一律走 `bg-surface-*`、`text-content-*`、`border-line-*`、`bg-primary`、`text-error` 等语义 token 类名。
- 间距走 Tailwind 的 spacing scale（`p-2`、`gap-4`），不要 `p-[13px]`。
- 字号走 `text-sm`、`text-base` 等预设类，不要 `text-[15px]`。
- 圆角走 `rounded-md`、`rounded-lg`，不要 `rounded-[7px]`。
- 禁止 `style={{ color: '#...' }}`、`className="bg-[#xxx]"`、`text-[rgb(...)]` 等 arbitrary value 形式硬编码。
- 1px 边框（`border`）、`border-0`、`size-px` 等约定俗成的 utility 不在此限。

如果某处确实需要不在 token 体系内的数值，按"一、Design token"的流程处理。

## 四、其他

- 不要改 `index.ts` 的导出顺序仅为"整理"。新增导出按字母序追加。
- 修改组件时若改变了 prop 形状或默认样式，自检 `apps/*` 中是否有引用并提示用户可能的影响。
- 不要为了"以防万一"加入未使用的 prop、未消费的 variant 或 dead code（参考根 `AGENTS.md` 的"不要过度防御"）。
