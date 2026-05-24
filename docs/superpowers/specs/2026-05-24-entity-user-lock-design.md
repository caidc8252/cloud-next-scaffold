# Entity-User 锁定机制设计

> 将"锁定用户"从用户级别改为 Entity-User 关系级别。

## 核心概念

系统中存在两种独立的锁定：

1. **密码错误锁定（用户级）** — 连续密码错误达上限后自动锁定 `sys_user.status = LOCKED`，到期自动解锁。这是安全机制，不变。
2. **管理员锁定（Entity-User 级）** — 管理员在用户管理页操作，切换 `sys_entity_user.status` ACTIVE/INACTIVE。表示该用户在当前组织中的访问权限被停用。

两种锁定互不影响，优先级上密码错误锁定在登录页拦截，Entity 锁定在登录后处理。

## §1 Session 扩展

### Token 结构

当前 payload: `{ userId, entityId }`
改为: `{ userId, entityId? }` — entityId 变为可选。

### Session 类型分层

```typescript
// 部分 session — 仅密码验证通过，未选择 Entity
interface PartialSession {
  id: number
  username: string
  displayName: string | null
}

// 完整 session — 已选择 Entity（现有 AuthenticatedSession）
interface AuthenticatedSession extends PartialSession {
  entity: { entityId: number; entityName: string; contractDefineCode: string }
  roles: SessionRole[]
  permissions: string[]
  menus: SessionMenu[]
}
```

### 新增函数

- `getPartialSession()` — 只要 token 有效且 user ACTIVE 就返回 `PartialSession`。Entity 选择页和锁定页使用。
- `upgradeSession(entityId)` — 验证 entity-user 关系有效后，将 entityId 写入 token cookie（重新签发）。

### getSession() 不变

仍返回 `AuthenticatedSession | null`，要求完整 session（有 entityId 且 entity-user ACTIVE）。

## §2 登录流程改造

文件: `apps/web/app/(public)/login/actions.ts`

### 密码验证后的路由决策

```
密码正确
  -> 查询该用户所有 entity-user 记录
  -> 仅一个且 ACTIVE -> createSession(userId, entityId) -> 跳转 /
  -> 仅一个且 INACTIVE -> createSession(userId, null) -> 跳转 /locked
  -> 多个，至少一个 ACTIVE -> createSession(userId, null) -> 跳转 /select-entity
  -> 多个，全部 INACTIVE -> createSession(userId, null) -> 跳转 /locked
  -> 零个 -> createSession(userId, null) -> 跳转 /locked
```

### 不变的部分

- 用户不存在 -> 错误提示
- `sys_user.status = LOCKED` 且未过期 -> 错误提示"账户已锁定"
- `sys_user.status = LOCKED` 且已过期 -> 自动解锁，继续
- 密码错误 -> 累计错误次数，可能触发用户级锁定

## §3 Entity 选择页

路由: `app/(public)/select-entity/page.tsx`

放在 `(public)` 分组 — 此时用户只有部分 session，不应进入 portal 布局。

### 页面逻辑

```
getPartialSession() -> 无效 -> 跳转 /login
  -> 有效 -> 查询该用户所有 entity-user 记录（含 entity 信息）
    -> 全部 INACTIVE -> 跳转 /locked
    -> 有可用的 -> 渲染列表
```

### 页面内容

- 列出所有 Entity，每个显示：Entity 名称、状态（可用 / 已停用）
- ACTIVE 的可点击选择，INACTIVE 的置灰不可点击
- 选择后调用 `upgradeSession(entityId)` -> 跳转 `/`

### 技术实现

服务端组件渲染列表，选择动作用 Server Action 处理（验证 entity-user 状态 + upgradeSession + redirect）。

## §4 锁定说明页

路由: `app/(public)/locked/page.tsx`

### 页面逻辑

```
getPartialSession() -> 无效 -> 跳转 /login
  -> 有效 -> 查询该用户所有 entity-user 记录
    -> 有可用的 -> 跳转 /select-entity（防止误入）
    -> 全部 INACTIVE -> 渲染锁定说明
```

### 页面内容

- 显示用户名
- 列出被锁定的 Entity 名称
- 说明文案："您在以下组织的访问权限已被停用，请联系管理员"
- 唯一操作：退出登录按钮（清除 session -> 跳转 /login）

没有轮询或自动刷新。

## §5 Session 校验 & requireSession 改造

`requireSession()` 需要区分失败场景来决定跳转目标：

```typescript
async function requireSession(): Promise<AuthenticatedSession> {
  const session = await getSession()
  if (session) return session

  const partial = await getPartialSession()
  if (!partial) redirect('/login')  // token 完全无效

  // token 有效但完整 session 失败 — 判断原因
  const entityUsers = await getEntityUsers(partial.id)
  const hasActive = entityUsers.some(eu => eu.status === 'ACTIVE')

  if (hasActive) redirect('/select-entity')
  else redirect('/locked')
}
```

`getSession()` 接口不变，路由判断逻辑封装在 `requireSession()` 内部。

### 在 Portal 中被锁定时的 Session 处理

当用户已在 portal 中使用系统，管理员锁定了其 entity-user 关系后，下一次 `requireSession()` 会检测到 entity-user 非 ACTIVE。此时在跳转 `/locked` 之前，需要将 session 降级为部分 session（移除 entityId，重新签发 token），确保 `/locked` 页面的 `getPartialSession()` 能正常工作。

## §6 Lock API 改造

端点: `POST /api/system/users/[userId]/lock`

### 行为变化

当前: 切换 `sys_user.status` ACTIVE<->LOCKED
改为: 切换 `sys_entity_user.status` ACTIVE<->INACTIVE

```
请求进入
  -> requireSession() 获取当前 entityId
  -> 查找 sys_entity_user(entityId, targetUserId)
  -> 不存在 -> 404
  -> 切换 status: ACTIVE -> INACTIVE / INACTIVE -> ACTIVE
  -> 返回更新后的用户信息
```

### 不再操作的字段

- `sys_user.status` — 不再由此端点修改
- `passwordErrorLockExpiredTimestamp` — 密码错误锁定专用
- `passwordErrorTimes` — 与 entity 锁定无关

管理员不能锁定自己（保留现有校验）。

## §7 用户管理页调整

### 数据层

`User.status` 数据来源从 `sys_user.status` 改为 `sys_entity_user.status`。

类型调整:
```typescript
// User.status 从 "ACTIVE" | "LOCKED" | "PENDING"
// 改为 "ACTIVE" | "INACTIVE" | "PENDING"
```

PENDING 状态不变 — 邀请中的用户仍为 PENDING。

### User Mapper

`user-mapper.ts` 中 status 取自 entity-user 记录而非 user 表。

### 用户列表页

- 筛选 tab: ACTIVE / INACTIVE / PENDING
- 统计卡片: 对应调整标签和计数
- 锁定按钮文案: 从"锁定/解锁"改为"停用/启用"

### 用户详情页

- 状态 badge 显示 entity-user 状态
- 停用/启用按钮操作 entity-user 关系
- 密码状态卡片中的"失败次数"仍来自 `sys_user.passwordErrorTimes`（用户级安全信息，保留展示）

## 不变的部分

- Prisma schema 枚举 — `UserStatus` 保留 LOCKED，`EntityUserStatus` 已有 ACTIVE/INACTIVE，无需改
- 密码错误自动锁定逻辑 — 不变，仍操作 `sys_user`
- `PermissionChecker` — 不变，基于 session 中的 permissions 数组
- 菜单加载逻辑 — 不变，基于角色->权限->菜单聚合
- 角色管理页 — 不变
- 权限管理页 — 不变

## 改动清单

| # | 改动项 | 文件 | 类型 |
|---|--------|------|------|
| 1 | 新增 `getPartialSession()`、`upgradeSession()` | `apps/web/lib/auth.ts` | 修改 |
| 2 | `requireSession()` 区分失败原因跳转 | `apps/web/lib/auth.ts` | 修改 |
| 3 | 登录后路由决策 | `apps/web/app/(public)/login/actions.ts` | 修改 |
| 4 | Entity 选择页 | `apps/web/app/(public)/select-entity/page.tsx` | 新增 |
| 5 | 锁定说明页 | `apps/web/app/(public)/locked/page.tsx` | 新增 |
| 6 | Lock API 改为操作 entity-user | `apps/web/app/api/system/users/[userId]/lock/route.ts` | 修改 |
| 7 | status 取自 entity-user | `apps/web/lib/user-mapper.ts` | 修改 |
| 8 | User.status 枚举值调整 | `packages/system/src/users/types.ts` | 修改 |
| 9 | 筛选 tab、统计、按钮文案 | `packages/system/src/users/users-page.tsx` | 修改 |
| 10 | 状态 badge、停用按钮语义 | `packages/system/src/users/user-detail.tsx` | 修改 |
