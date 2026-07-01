#!/usr/bin/env node
// 飞书 MCP 配置体检：只判断两件事——
//   1) .mcp.json 是否存在
//   2) MCP_USER_TOKEN 是否已设置（非空、非占位符）
// 退出码：0 = 两项都就绪；1 = 有缺失。

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// 仓库根：从脚本位置上溯，找到含 .git 的目录
function repoRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, '.git'))) return dir;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return process.cwd();
}

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

const root = repoRoot();
const mcpPath = join(root, '.mcp.json');

// 1) 文件是否存在
const fileOk = existsSync(mcpPath);

// 2) token 是否已设置（${VAR} 形式则回退到环境变量 / settings(.local).json）
let tokenOk = false;
if (fileOk) {
  const raw = readJson(mcpPath)?.mcpServers?.FeishuProjectMcp?.env?.MCP_USER_TOKEN ?? '';
  let val = String(raw).trim();
  const ref = val.match(/^\$\{(.+)\}$/);
  if (ref) {
    const name = ref[1];
    val = (
      process.env[name] ||
      readJson(join(root, '.claude/settings.local.json'))?.env?.[name] ||
      readJson(join(root, '.claude/settings.json'))?.env?.[name] ||
      ''
    ).trim();
  }
  tokenOk = val !== '' && !/^\$\{|your|placeholder|here|example|xxx|占位|替换/i.test(val);
}

const mark = (b) => (b ? '[OK]' : '[X] ');
console.log('飞书 MCP 配置体检');
console.log(`${mark(fileOk)} .mcp.json        ${fileOk ? '已存在' : '不存在'}`);
console.log(
  `${mark(tokenOk)} MCP_USER_TOKEN   ${
    tokenOk ? '已设置' : fileOk ? '未设置 / 仍是占位符' : '— 先创建 .mcp.json'
  }`,
);

process.exit(fileOk && tokenOk ? 0 : 1);
