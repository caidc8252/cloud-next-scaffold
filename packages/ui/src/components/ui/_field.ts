// Shared style helpers for text field controls (Input / Textarea).

// Chrome 给自动填充的 <input>/<textarea> 刷一层淡蓝底，覆盖掉我们的 surface 背景。不用 inset
// box-shadow 盖底（会和 rounded/边框错位）；改用把那次背景上色的 transition 拉到 9999s 让它永不
// 可见，控件保持原背景；再固定文字/光标色（dark 由 token 自适应）保证可读。
// 唯一真源：Input / Textarea 直接用；InputGroupInput/Textarea 包着它们，自动继承，无需各自再加。
export const autofillFix =
  "autofill:[transition:background-color_9999s] autofill:[-webkit-text-fill-color:var(--color-content-primary)] autofill:[caret-color:var(--color-content-primary)]"
