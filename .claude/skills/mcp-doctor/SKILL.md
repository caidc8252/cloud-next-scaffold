---
name: mcp-doctor
description: 飞书 MCP 配置体检与修复 —— 当调用飞书 MCP 工具（mcp__FeishuProjectMcp__*）失败、报「未连接 / 未授权 / 401 / token 无效 / server 未就绪」，或 .mcp.json 缺失时使用。脚本检查 .mcp.json 是否存在与 MCP_USER_TOKEN 是否已设置，并指导用户从「飞书项目空间 → 左下角头像 → MCP 配置 → Stdio」复制配置完成设置。
---

# mcp-doctor — 飞书 MCP 配置体检

飞书 MCP 调用失败时使用：先体检，再按缺失项修复，不凭记忆乱改。

## 一、体检

```bash
node .claude/skills/mcp-doctor/scripts/check-mcp.mjs
```

输出两项检查（`[OK]` 通过 / `[X]` 缺失）：

```
[OK] .mcp.json        已存在
[X]  MCP_USER_TOKEN   未设置 / 仍是占位符
```

- 两项均 `[OK]`：配置无误，故障在会话未连接或网络，转「三」。
- 任一为 `[X]`：按「二」对应项修复。

## 二、修复

### .mcp.json 不存在

在**仓库根**创建 `.mcp.json`：

```json
{
  "mcpServers": {
    "FeishuProjectMcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@lark-project/mcp", "--domain", "https://project.feishu.cn"],
      "env": { "MCP_USER_TOKEN": "${MCP_USER_TOKEN}" }
    }
  }
}
```

### MCP_USER_TOKEN 未设置

token 须由用户从飞书获取，不可编造。**提醒用户：**

> 1. 打开**飞书项目空间**
> 2. 点击**左下角个人头像** → 进入 **MCP 配置**
> 3. 在 **Stdio** 一栏**复制配置**，其中 `MCP_USER_TOKEN`（形如 `m-xxxxxxxx-xxxx-…`）即你的 token
> 4. 替换.mcp.json中的配置

拿到后写入 `.claude/settings.local.json`（本地文件，不入库）：

```json
{ "env": { "MCP_USER_TOKEN": "粘贴飞书复制的真实 token" } }
```

或按飞书 Stdio 配置整段替换 `.mcp.json`；但该文件会入库，**明文 token 切勿提交**。

> 改完重跑「一」确认通过；MCP 配置变更需**重启会话 / 重连 MCP** 才生效。

## 三、两项均 OK 仍失败

- **配置刚改未重连** → 重启会话 / 重连 MCP。
- **server 未启用** → 确认 `.claude/settings.local.json` 的 `enabledMcpjsonServers` 含 `"FeishuProjectMcp"`。
- **token 过期/被回收** → 回「二」重新获取。
- **网络受限** → 首次需联网拉取 `@lark-project/mcp`，离线会启动失败。

## 约束

- token 私密：不打印完整值、不编造、不提交入库。
- 仅改 `.mcp.json` 与 `.claude/settings.local.json`，不顺带改业务代码。
