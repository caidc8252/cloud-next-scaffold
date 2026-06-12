// content 是极简 HTML 且外部平台原样发出，故模板在拼接 content 时必须对注入的变量
// 做 HTML 转义（用户可控的 displayName / party 名 / 邮箱可能含 < & 等）。title 是纯文本
// 主题，勿转义（否则 "Smith & Co" 会显示成 "Smith &amp; Co"）。

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);
}
