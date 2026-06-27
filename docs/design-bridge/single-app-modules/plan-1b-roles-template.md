# Step 1b — 建 modules & 迁移 web 自有域(样板:system/roles)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:executing-plans 逐任务执行。步骤用 `- [ ]` 复选框跟踪。

**Goal:** 立起 `web/modules/<cat>/<mod>` 结构,把后台路由组 `(portal)` 纠正为 `(dashboard)`,并把 `roles` 域作为**第一个样板模块**完整迁入 `modules/system/roles`(server/schema/client/controller/ui/public 全套 + 薄壳),跑通验收。其余 5 个域(users/notification/account/auth/mfa)在样板验证后按同一套路复制(本计划末尾列出,另行执行)。

**Architecture:** 纯结构搬运 + 兼容壳,**零行为变更**:URL、API 路径、菜单、权限码、`_shared` 全部保持(`_shared` 降为临时壳)。`git mv` 保留 history。验收 = `tsc --noEmit`(web)+ 既有单测全绿(既有用例是安全网)。

**Tech Stack:** Next 16、TypeScript、Vitest。`@/` 是 web 内相对别名。

## Global Constraints

- 每个任务结束:web `tsc --noEmit` 干净、`pnpm test` 全绿(638 基线)。
- **不修改 `packages/*`**;**不改** manifest(`_menu.map.ts`)、菜单、权限码、URL、API 路径。
- 文件/目录 kebab-case;分层服务点段命名(`roles.service.ts`…)。
- `git mv` 搬文件保历史。
- lint 既有 db-read 债(`findMany` 等)与本步无关,不在验收门内(已知红,另开任务)。
- 跨模块服务端调用走 `server/<mod>.public.ts`;**本步暂不加边界 eslint 规则**(待 web 域全迁完、`_shared` 解散后统一加,避免误伤未迁代码)。
- 运行 `tsc`/`test` 前若报缺 `generated/prisma` 或 `manifest/_generated`,先 `pnpm db:generate && pnpm gen:manifest`(环境常规初始化)。

## File Structure(本步触碰)

- 重命名目录:`apps/web/app/(portal)/` → `apps/web/app/(dashboard)/`
- 新建:`apps/web/modules/system/roles/{server,schema,client,ui,ui/components}/*`
- 迁移:`apps/web/service/roles/**` → `modules/system/roles/**`;`app/(dashboard)/system/roles/_components/**` → `modules/system/roles/ui/**`
- 改薄壳:`app/(dashboard)/system/roles/page.tsx`、`app/api/system/roles/route.ts`、`app/api/system/roles/[roleId]/route.ts`
- 改壳:`app/(dashboard)/system/_shared/types.ts`(Role re-export 改指 roles 模块)
- 改引用:`app/(dashboard)/system/users/page.tsx`(listAssignableRoles 改走 roles.public)

---

### Task 1: 路由组 (portal) → (dashboard)

把后台路由组纠正命名,释放 `(portal)` 名字给 1c 的前台。route group 不影响 URL,纯目录+import 改名。

**Files:**
- Rename: `apps/web/app/(portal)/` → `apps/web/app/(dashboard)/`
- Modify: 所有 import 了 `@/app/(portal)/...` 的文件(import 字符串 `(portal)` → `(dashboard)`)

**Interfaces:**
- Consumes: 1a 完成后的 `apps/web`。
- Produces: 后台页面树位于 `app/(dashboard)/`;全仓 `@/app/(portal)/` 引用更新为 `@/app/(dashboard)/`。

- [ ] **Step 1: git mv 路由组目录**

```bash
cd /workspaces/cloud-next-scaffold/apps/web
git mv "app/(portal)" "app/(dashboard)"
```

- [ ] **Step 2: 找出所有引用 (portal) 的 import**

```bash
grep -rln "app/(portal)/" --include="*.ts" --include="*.tsx" .
```
记下命中文件清单(应含 service/* 与 app/(dashboard)/* 下多处对 `_shared`、`_components` 的 `@/app/(portal)/...` 引用)。

- [ ] **Step 3: 批量改写 import 路径 (portal)→(dashboard)**

对 Step 2 清单中每个文件,把 import 字符串里的 `app/(portal)/` 替换为 `app/(dashboard)/`:
```bash
grep -rl "app/(portal)/" --include="*.ts" --include="*.tsx" . \
  | xargs sed -i 's#app/(portal)/#app/(dashboard)/#g'
```

- [ ] **Step 4: 确认无残留**

```bash
grep -rn "app/(portal)/" --include="*.ts" --include="*.tsx" . ; echo "exit=$?"
```
Expected:无输出(grep exit=1 表示无命中)。

- [ ] **Step 5: 生成产物 + 验收**

```bash
cd /workspaces/cloud-next-scaffold
pnpm db:generate >/dev/null 2>&1; pnpm gen:manifest >/dev/null 2>&1
pnpm --filter web exec tsc --noEmit -p tsconfig.json; echo "tsc=$?"
pnpm test 2>&1 | tail -4
```
Expected:`tsc=0`;`Tests 638 passed`。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "refactor(web): rename backend route group (portal) to (dashboard)

Corrects the misleading name (admin's (portal) group was the backend
dashboard). Route groups don't affect URLs; pure dir + import rename. Frees
the (portal) name for the front-of-house surface in a later sub-phase.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: 迁移 roles 域 → modules/system/roles(样板)

把 `roles` 完整迁入模块新形状:server 分层、schema、client、controller、ui(RSC + components)、server.public。薄壳回填到原 URL 路径。`_shared` 保持为壳,只改其 `Role` re-export 源。

**Files:**
- Create dir tree: `apps/web/modules/system/roles/{server,schema,client,ui,ui/components}`
- Move: `service/roles/server/{roles.service,roles.repository,roles.mapper,roles.policy}.ts` (+ `.test.ts`) → `modules/system/roles/server/`
- Move: `service/roles/schemas/roles.schema.ts` → `modules/system/roles/schema/roles.schema.ts`
- Move: `service/roles/types.ts` → `modules/system/roles/schema/roles.types.ts`
- Move: `service/roles/api.ts` → `modules/system/roles/client/roles.api.ts`
- Move: `app/(dashboard)/system/roles/_components/*` → `modules/system/roles/ui/components/*`(client 视图 `roles-page.tsx` 重命名为 `roles-board.tsx`)
- Create: `modules/system/roles/server/roles.controller.ts`
- Create: `modules/system/roles/server/roles.public.ts`
- Create: `modules/system/roles/ui/roles-page.tsx`(RSC)
- Modify(薄壳): `app/(dashboard)/system/roles/page.tsx`、`app/api/system/roles/route.ts`、`app/api/system/roles/[roleId]/route.ts`
- Modify(壳/引用): `app/(dashboard)/system/_shared/types.ts`、`app/(dashboard)/system/users/page.tsx`

**Interfaces:**
- Consumes: Task 1 后的 `(dashboard)` 树。
- Produces:
  - `@/modules/system/roles/server/roles.public` 导出 `listAssignableRoles(partyId: number, contractTypes: string[]): Promise<Role[]>` 与 `type Role`。
  - `@/modules/system/roles/server/roles.controller` 导出 `GET, POST, PUT, DELETE`(Route Handler)。
  - `@/modules/system/roles/ui/roles-page` 导出 `RolesPage`(async RSC,无 props)。
  - `@/modules/system/roles/client/roles.api` 导出 `createRole, updateRole, deleteRole`(路径仍 `/api/system/roles`)。

- [ ] **Step 1: 建模块目录并 git mv server 分层**

```bash
cd /workspaces/cloud-next-scaffold/apps/web
mkdir -p modules/system/roles/{server,schema,client,ui/components}
git mv service/roles/server/roles.service.ts        modules/system/roles/server/roles.service.ts
git mv service/roles/server/roles.service.test.ts   modules/system/roles/server/roles.service.test.ts
git mv service/roles/server/roles.repository.ts      modules/system/roles/server/roles.repository.ts
git mv service/roles/server/roles.mapper.ts          modules/system/roles/server/roles.mapper.ts
git mv service/roles/server/roles.mapper.test.ts     modules/system/roles/server/roles.mapper.test.ts
git mv service/roles/server/roles.policy.ts          modules/system/roles/server/roles.policy.ts
git mv service/roles/server/roles.policy.test.ts     modules/system/roles/server/roles.policy.test.ts
git mv service/roles/schemas/roles.schema.ts         modules/system/roles/schema/roles.schema.ts
git mv service/roles/types.ts                        modules/system/roles/schema/roles.types.ts
git mv service/roles/api.ts                          modules/system/roles/client/roles.api.ts
```

- [ ] **Step 2: 迁移 ui 组件,client 视图改名 roles-board**

```bash
cd /workspaces/cloud-next-scaffold/apps/web
git mv "app/(dashboard)/system/roles/_components/role-list-item.tsx"     modules/system/roles/ui/components/role-list-item.tsx
git mv "app/(dashboard)/system/roles/_components/role-editor.tsx"        modules/system/roles/ui/components/role-editor.tsx
git mv "app/(dashboard)/system/roles/_components/new-role-modal.tsx"     modules/system/roles/ui/components/new-role-modal.tsx
git mv "app/(dashboard)/system/roles/_components/duplicate-role-modal.tsx" modules/system/roles/ui/components/duplicate-role-modal.tsx
git mv "app/(dashboard)/system/roles/_components/permissions-card.tsx"   modules/system/roles/ui/components/permissions-card.tsx
git mv "app/(dashboard)/system/roles/_components/require-chain.ts"       modules/system/roles/ui/components/require-chain.ts
git mv "app/(dashboard)/system/roles/_components/require-chain.test.ts"  modules/system/roles/ui/components/require-chain.test.ts
git mv "app/(dashboard)/system/roles/_components/roles-page.tsx"         modules/system/roles/ui/components/roles-board.tsx
```

- [ ] **Step 3: 重写 client 视图 roles-board.tsx 的符号名与 api import**

`modules/system/roles/ui/components/roles-board.tsx`:把组件函数 `RolesPage` 重命名为 `RolesBoard`(`export function RolesPage` → `export function RolesBoard`;若文件内有自引用同步改)。
并把 api import 改指模块 client:
```ts
import { createRole as createRoleApi, deleteRole as deleteRoleApi, updateRole } from "@/service/roles/api";
```
改为:
```ts
import { createRole as createRoleApi, deleteRole as deleteRoleApi, updateRole } from "@/modules/system/roles/client/roles.api";
```
(该文件对 `@/app/(dashboard)/system/_shared/types` 的 `Role, User, PermissionGroup` 类型 import **保持不变**——`_shared` 仍是壳。)

- [ ] **Step 4: 修正 server/schema 内部 import(指向模块内相对路径 + 自有 Role)**

`modules/system/roles/server/roles.service.ts`:
```ts
import type { Role } from "@/app/(dashboard)/system/_shared/types";
import type { CreateRoleInput, UpdateRoleInput } from "@/service/roles/schemas/roles.schema";
```
改为:
```ts
import type { Role } from "../schema/roles.types";
import type { CreateRoleInput, UpdateRoleInput } from "../schema/roles.schema";
```
(其余 import 不动:`@/manifest`、`@/service/_shared/role-codes`、`@cloud/*`。)

`modules/system/roles/server/roles.mapper.ts`:
```ts
import type { Role } from "@/app/(dashboard)/system/_shared/types";
```
改为:
```ts
import type { Role } from "../schema/roles.types";
```

`modules/system/roles/client/roles.api.ts`:把
```ts
import type { Role } from "./types";
import type { CreateRoleInput, UpdateRoleInput } from "./schemas/roles.schema";
```
改为:
```ts
import type { Role } from "../schema/roles.types";
import type { CreateRoleInput, UpdateRoleInput } from "../schema/roles.schema";
```

(若 `roles.service.test.ts` / `roles.mapper.test.ts` 内有 `@/service/roles/...` 或 `_shared/types` 的 `Role` import,一并改为 `../schema/...`;`vi.mock("@/manifest", …)` 保持不动。)

- [ ] **Step 5: 建 server/roles.public.ts(跨模块边界)**

`modules/system/roles/server/roles.public.ts`:
```ts
// 角色域跨模块服务端入口：仅暴露被其他模块消费的能力与类型。
// 当前消费者：users 模块（listAssignableRoles 用于"可分配角色"）。
export { listAssignableRoles } from "./roles.service";
export type { Role } from "../schema/roles.types";
```

- [ ] **Step 6: 建 server/roles.controller.ts(合并两个 route 的 handler)**

`modules/system/roles/server/roles.controller.ts`:
```ts
import { BusinessError } from "@cloud/request";
import { successResponse, createdResponse, noContentResponse } from "@cloud/request/server";
import {
  ERR_INVALID_JSON,
  ERR_ROLE_NAME_SHORT,
  ERR_BAD_REQUEST,
  ERR_INVALID_ID,
} from "@cloud/request/error-codes";
import { assertPermissions } from "@cloud/permissions/server";
import { createRoleSchema, updateRoleSchema } from "../schema/roles.schema";
import { listRoles, createRole, updateRole, deleteRole } from "./roles.service";
import { withApiHandler } from "@/lib/api-handler";

/** 当前 partner 可见的角色列表(自有 + 全局,含绑定用户数)。需要 roles.view。 */
export const GET = withApiHandler(async () => {
  const session = await assertPermissions({ all: ["roles.view"] });
  return successResponse(await listRoles(session.currentPartyId, session.contractTypes));
});

/** 新建角色。需要 roles.add。 */
export const POST = withApiHandler(async (req: Request) => {
  const session = await assertPermissions({ all: ["roles.add"] });
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BusinessError(ERR_INVALID_JSON);
  }
  const parsed = createRoleSchema.safeParse(raw);
  if (!parsed.success) throw new BusinessError(ERR_ROLE_NAME_SHORT);
  return createdResponse(await createRole(session, parsed.data));
});

/** 更新角色(名称/描述/权限)。需要 roles.update。 */
export const PUT = withApiHandler(
  async (req: Request, { params }: { params: Promise<{ roleId: string }> }) => {
    const session = await assertPermissions({ all: ["roles.update"] });
    const { roleId: rawId } = await params;
    const roleId = Number(rawId);
    if (!Number.isFinite(roleId)) throw new BusinessError(ERR_INVALID_ID);
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      throw new BusinessError(ERR_INVALID_JSON);
    }
    const parsed = updateRoleSchema.safeParse(raw);
    if (!parsed.success) throw new BusinessError(ERR_BAD_REQUEST);
    return successResponse(await updateRole(session, roleId, parsed.data));
  },
);

/** 删除角色。需要 roles.delete;内置不可删,仍被绑定不可删(409)。 */
export const DELETE = withApiHandler(
  async (_request: Request, { params }: { params: Promise<{ roleId: string }> }) => {
    const session = await assertPermissions({ all: ["roles.delete"] });
    const { roleId: rawId } = await params;
    const roleId = Number(rawId);
    if (!Number.isFinite(roleId)) throw new BusinessError(ERR_INVALID_ID);
    await deleteRole(session, roleId);
    return noContentResponse();
  },
);
```

- [ ] **Step 7: 建 ui/roles-page.tsx(RSC,由原 page.tsx 下沉)**

`modules/system/roles/ui/roles-page.tsx`:
```ts
import { requirePermissions } from "@cloud/permissions/server";
import { getTranslations } from "@cloud/i18n/server";
import { getMenus } from "@/manifest";
import { selectPermissionGroups } from "@/manifest/select";
import { listRoles } from "../server/roles.service";
import { translateRoleLabels } from "@/app/(dashboard)/system/_shared/role-labels";
import type { PermissionGroup } from "@/app/(dashboard)/system/_shared/types";
import { RolesBoard } from "./components/roles-board";

// 权限目录来自本平台 manifest（按当前公司持有的契约过滤）。
function loadPermissionGroups(contractTypes: string[]): PermissionGroup[] {
  const menus = getMenus(contractTypes);
  return selectPermissionGroups(menus).map((group) => ({
    menuId: group.menuCode,
    menuTitle: group.menuTitle,
    items: group.items,
  }));
}

export async function RolesPage() {
  const session = await requirePermissions({ all: ["roles.view"] });
  const tc = await getTranslations("coc");
  const initialRoles = translateRoleLabels(
    await listRoles(session.currentPartyId, session.contractTypes),
    tc,
  );
  const permissionGroups = loadPermissionGroups(session.contractTypes);
  return <RolesBoard initialRoles={initialRoles} permissionGroups={permissionGroups} />;
}
```

- [ ] **Step 8: 回填三个薄壳到原路径**

`app/(dashboard)/system/roles/page.tsx`(整文件替换为):
```ts
export { RolesPage as default } from "@/modules/system/roles/ui/roles-page";
```

`app/api/system/roles/route.ts`(整文件替换为):
```ts
export { GET, POST } from "@/modules/system/roles/server/roles.controller";
```

`app/api/system/roles/[roleId]/route.ts`(整文件替换为):
```ts
export { PUT, DELETE } from "@/modules/system/roles/server/roles.controller";
```

- [ ] **Step 9: 更新 _shared 壳的 Role re-export 源**

`app/(dashboard)/system/_shared/types.ts`:
```ts
export type { Role } from "@/service/roles/types";
```
改为:
```ts
export type { Role } from "@/modules/system/roles/server/roles.public";
```
(`User` re-export 暂不动,待 users 迁移;`PermissionItem`/`PermissionGroup` 定义保留。)

- [ ] **Step 10: 更新 users 页面的跨模块 roles 引用走 public**

`app/(dashboard)/system/users/page.tsx`:
```ts
import { listAssignableRoles } from "@/service/roles/server/roles.service";
```
改为:
```ts
import { listAssignableRoles } from "@/modules/system/roles/server/roles.public";
```

- [ ] **Step 11: 清理空目录 + 确认无残留旧引用**

```bash
cd /workspaces/cloud-next-scaffold/apps/web
rmdir service/roles/server service/roles/schemas service/roles 2>/dev/null
rmdir "app/(dashboard)/system/roles/_components" 2>/dev/null
echo "=== 残留 @/service/roles 引用(应为空) ==="
grep -rn "@/service/roles" --include="*.ts" --include="*.tsx" . ; echo "exit=$?"
```
Expected:无 `@/service/roles` 命中(exit=1)。若有,定位并按 Step 4/10 同法改指模块。

- [ ] **Step 12: 生成产物 + 验收**

```bash
cd /workspaces/cloud-next-scaffold
pnpm gen:manifest >/dev/null 2>&1
pnpm --filter web exec tsc --noEmit -p tsconfig.json; echo "tsc=$?"
pnpm test 2>&1 | tail -4
```
Expected:`tsc=0`;`Tests 638 passed`(roles 的 service/mapper/policy/require-chain 测试随文件迁移仍跑、仍过)。

- [ ] **Step 13: 提交**

```bash
git add -A
git commit -m "refactor(web): migrate roles domain to modules/system/roles

First template module. Relocates roles service layer, schema, client api,
controller and UI into modules/system/roles with the new shape; backfills
thin shells at the original URLs/API paths (no behavior change). Adds
server/roles.public.ts as the cross-module boundary; users now consumes
listAssignableRoles through it. system/_shared stays as a compat shim with
its Role re-export repointed at the module.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 样板验证后:其余 web 域(本计划不展开,验证后另行规划/执行)

按 Task 2 完全相同的套路复制(每个域一个 commit,迁完即验收):
- `system/users`(注意:users 迁完后,`_shared/types` 的 `User` re-export 改指 users.public)
- `system/notification`(页面 `/notifications`;含 `_lib/notice-meta`、`_server/loader`)
- `identity/account`(处理 `account/_shared`,同 `system/_shared` 套路)
- `identity/auth`(后台 logout/select-partner/session-handoff/server-time)
- `identity/mfa`

**收尾(全部 web 域迁完后):**
- 解散 `system/_shared` 与 `account/_shared`:孤儿共享(`PermissionGroup`/`PermissionItem`/`Country`/`AccountPartner`、`relTime`、`ConfirmModal`、`role-codes`)迁入 `web/lib`,删除壳。
- 加跨模块边界 eslint 规则(限定 `modules/**`,强制深 import 走 `*.public.ts`)。
- 删除空的 `service/` 根。

---

## Self-Review

**Spec coverage(对照 design.md Step 1 表"1b"):**
- 建 `web/modules` ✓ Task 2
- web 自有域按新形状迁入(抽 controller、沉页面、立薄壳)✓ Task 2 Step 6-8
- `(portal)`→`(dashboard)` ✓ Task 1
- 逐模块、每迁一块验一块 ✓ 每 Task 末 tsc+test
- server.public 边界 ✓ Task 2 Step 5
- i18n/manifest 保持 app 级 ✓ 全程未碰

**Placeholder 扫描:** 无 TODO/占位;新文件给全代码,组件搬运给精确 import 改写(old→new),薄壳给整文件内容。

**类型/命名一致性:** RSC `RolesPage`(ui/roles-page.tsx,无 props)与客户端 `RolesBoard`(ui/components/roles-board.tsx,收 initialRoles+permissionGroups)区分清晰、无重名;`roles.public` 导出的 `listAssignableRoles`/`Role` 与 users 消费签名一致;controller 导出 `GET/POST/PUT/DELETE` 与三个薄壳 re-export 对应。

**留意:** Task 2 后 `roles` 的页面/接口 URL 与权限码均不变(`/system/roles`、`roles.view` 等),CoC/URL 扁平化留 Step 2。`User` 类型在 roles 组件中仍经 `_shared` 壳获取,待 users 迁移后改走 users.public。
