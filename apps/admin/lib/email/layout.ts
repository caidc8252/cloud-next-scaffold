import "server-only";

import { escapeHtml } from "@cloud/mail";

// 极简 email-safe HTML 外壳：品牌头 + 正文 + 可选按钮 + 灰色页脚。仅内联样式，
// 无 table / 媒体查询 / 图片，绕开邮件客户端兼容性坑。每个 app 一份（平台独立）。
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "PEP";

type EmailButton = { label: string; url: string };

export function renderEmail(opts: { bodyHtml: string; button?: EmailButton; footer: string }): string {
  const button = opts.button
    ? `<p style="margin:24px 0"><a href="${opts.button.url}" style="display:inline-block;padding:10px 20px;background:#0b5cff;color:#ffffff;border-radius:6px;text-decoration:none;font-weight:600">${escapeHtml(opts.button.label)}</a></p>`
    : "";
  return [
    `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;color:#1f2328;line-height:1.5">`,
    `<p style="font-size:16px;font-weight:700;margin:0 0 16px">${escapeHtml(APP_NAME)}</p>`,
    opts.bodyHtml,
    button,
    `<p style="color:#8a8f98;font-size:12px;margin-top:24px">${escapeHtml(opts.footer)}</p>`,
    `</div>`,
  ].join("");
}
