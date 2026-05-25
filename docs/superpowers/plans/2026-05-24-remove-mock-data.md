# Remove Mock Data from packages/system Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded mock data in `packages/system/src/mock/` with database queries and config constants, then delete the mock directory.

**Architecture:** Server pages query `SysPermission` + `SysMenu` from DB and pass pre-built permission groups as props through the component tree. `PASSWORD_POLICY` moves to a shared (non-server-only) export in `@cloud/config`. Client components become pure — they receive all data via props.

**Tech Stack:** Prisma, Next.js App Router (server components → client components), TypeScript

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `packages/db/prisma/schema.prisma` | Add `label` field to `SysPermission` |
| Modify | `packages/db/prisma/seed.ts` | Add `label` values to permission seeds |
| Create | `packages/config/src/password-policy.ts` | Export `PASSWORD_POLICY` constant (no `server-only`) |
| Modify | `packages/config/package.json` | Add `./password-policy` export path |
| Modify | `packages/system/src/types.ts` | Remove `MenuNode`, update `PermissionEntry` → `PermissionItem`, remove `PasswordPolicy` |
| Modify | `packages/system/src/index.ts` | Update type exports |
| Modify | `packages/system/src/helpers.ts` | Parameterize `permissionGroupsForContract`, remove `permAppliesToContract` (unused), remove mock import |
| Modify | `packages/system/src/helpers.test.ts` | Update tests for new function signature |
| Modify | `packages/system/src/roles/permissions-card.tsx` | Accept `groups` prop instead of calling helper |
| Modify | `packages/system/src/roles/role-editor.tsx` | Accept `permissionGroups` prop, remove mock import |
| Modify | `packages/system/src/roles/roles-panel.tsx` | Thread `permissionGroups` prop |
| Modify | `packages/system/src/roles/roles-page.tsx` | Thread `permissionGroups` prop |
| Modify | `packages/system/src/users/user-detail.tsx` | Import from `@cloud/config/password-policy` |
| Modify | `apps/web/app/(portal)/system/roles/page.tsx` | Query permission groups from DB |
| Delete | `packages/system/src/mock/` | Entire directory |

---

### Task 1: Schema — add `label` to `SysPermission`

**Files:**
- Modify: `packages/db/prisma/schema.prisma:289-301`
- Modify: `packages/db/prisma/seed.ts`

- [ ] **Step 1: Add `label` field to schema**

In `packages/db/prisma/schema.prisma`, update the `SysPermission` model:

```prisma
model SysPermission {
  permissionCode   String   @id @map("permission_code") @db.VarChar(100)
  permissionMenuId Int?     @map("permission_menu_id")
  label            String?  @db.VarChar(100)
  remark           String?  @db.VarChar(500)
  creTime          DateTime @default(now()) @map("cre_time") @db.Timestamp(3)
  updTime          DateTime @default(now()) @updatedAt @map("upd_time") @db.Timestamp(3)

  menu            SysMenu?            @relation(fields: [permissionMenuId], references: [menuId])
  rolePermissions SysRolePermission[]
  userScopes      SysUserPermissionScope[]

  @@index([permissionMenuId])
  @@map("sys_permission")
}
```

- [ ] **Step 2: Update seed with `label` values**

In `packages/db/prisma/seed.ts`, update the roles permission array (around line 121):

```ts
const rolesPermissions = [
  { permissionCode: "roles.VIEW", label: "View Roles", remark: "View role list and details" },
  { permissionCode: "roles.ADD", label: "Create Role", remark: "Create new role" },
  { permissionCode: "roles.UPD", label: "Edit Role", remark: "Edit role name, description, permissions" },
  { permissionCode: "roles.DELETE", label: "Delete Role", remark: "Delete non-builtin role" },
  { permissionCode: "roles.DUPLICATE", label: "Duplicate Role", remark: "Copy an existing role" },
];
```

And the users permission array (around line 137):

```ts
const usersPermissions = [
  { permissionCode: "users.VIEW", label: "View Users", remark: "View user list and details" },
  { permissionCode: "users.ADD", label: "Create User", remark: "Create user (direct mode)" },
  { permissionCode: "users.INVITE", label: "Invite User", remark: "Invite user (email mode, placeholder)" },
  { permissionCode: "users.UPD", label: "Edit User", remark: "Edit user display name, email, remark" },
  { permissionCode: "users.LOCK", label: "Lock/Unlock User", remark: "Lock / unlock user account" },
  { permissionCode: "users.RESETPW", label: "Reset Password", remark: "Force-reset user password" },
  { permissionCode: "users.CHANGE_ROLE", label: "Change Role", remark: "Change user's assigned role" },
];
```

Update both upsert calls to include `label` in the `create` and `update` clauses:

```ts
for (const p of rolesPermissions) {
  await prisma.sysPermission.upsert({
    where: { permissionCode: p.permissionCode },
    update: { permissionMenuId: rolesMenu.menuId, label: p.label, remark: p.remark },
    create: { permissionCode: p.permissionCode, permissionMenuId: rolesMenu.menuId, label: p.label, remark: p.remark },
  });
}
```

Same pattern for `usersPermissions` with `usersMenu.menuId`.

- [ ] **Step 3: Generate migration**

Run: `pnpm db:generate`

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/seed.ts
git commit -m "feat(db): add label field to SysPermission and update seed"
```

---

### Task 2: `PASSWORD_POLICY` → `@cloud/config`

**Files:**
- Create: `packages/config/src/password-policy.ts`
- Modify: `packages/config/package.json`

`@cloud/config/src/index.ts` has `import "server-only"`, so client components can't import from it. Create a separate entry point.

- [ ] **Step 1: Create password-policy.ts**

Create `packages/config/src/password-policy.ts`:

```ts
export type PasswordPolicy = {
  minLength: number;
  requireUpper: boolean;
  requireLower: boolean;
  requireDigit: boolean;
  requireSymbol: boolean;
  maxErrorTimes: number;
  lockDurationMinutes: number;
  historySize: number;
  expiryDays: number;
};

export const PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSymbol: true,
  maxErrorTimes: 5,
  lockDurationMinutes: 30,
  historySize: 5,
  expiryDays: 90,
};
```

- [ ] **Step 2: Add export path to package.json**

In `packages/config/package.json`, add the new export:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./password-policy": "./src/password-policy.ts"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/config/src/password-policy.ts packages/config/package.json
git commit -m "feat(config): add PASSWORD_POLICY constant with shared export"
```

---

### Task 3: Update types and helpers

**Files:**
- Modify: `packages/system/src/types.ts`
- Modify: `packages/system/src/index.ts`
- Modify: `packages/system/src/helpers.ts`
- Modify: `packages/system/src/helpers.test.ts`

- [ ] **Step 1: Update types.ts**

Remove `PasswordPolicy`, `MenuNode`, and rename `PermissionEntry` to `PermissionItem` (dropping `menuId` since items will live inside groups):

```ts
export type PermissionItem = {
  code: string;
  label: string;
  desc: string;
};

export type PermissionGroup = {
  menuId: string;
  menuTitle: string;
  items: PermissionItem[];
};

export type Role = {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
  operatorCount: number;
  roleType: "global";
  contractDefineCode: string;
  permissions: string[];
  updatedAt: string;
  updatedBy: string;
};

export type PasswordResetRequest = {
  id: string;
  requestedBy: string;
  requestedAt: string;
  expiresAt: string;
  consumedAt: string | null;
  status: "pending" | "consumed" | "expired" | "superseded";
};

export type User = {
  id: string;
  loginName: string;
  displayName: string;
  email: string;
  country: string;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  lastLoginAt: string | null;
  passwordChangedTimestamp: number;
  passwordErrorTimes: number;
  passwordChangeTimes: number;
  passwordErrorLockExpiredTimestamp: number | null;
  passwordUpdatedAt: string | null;
  remark: string;
  createdAt: string;
  updatedAt: string;
  authorizingType: string;
  roleIds: string[];
  passwordHistory: Array<{ hashId: string; changedAt: string }>;
  // Pending invite fields
  invitedAt?: string;
  invitedBy?: string;
  inviteExpiresAt?: string;
  inviteToken?: string;
  inviteEmail?: string;
  resendCount?: number;
  passwordResetRequests?: PasswordResetRequest[];
};
```

- [ ] **Step 2: Update index.ts exports**

```ts
export type { Role, User, PermissionItem, PermissionGroup, PasswordResetRequest } from "./types";
export { RolesPage } from "./roles/roles-page";
export { UsersPage } from "./users/users-page";
```

- [ ] **Step 3: Rewrite helpers.ts**

Remove all mock imports. Remove `permAppliesToContract` (no consumers). Remove `PermissionGroup` type (now in types.ts). Keep utility functions unchanged:

```ts
export function relTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string | number): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const HUES = [210, 260, 330, 30, 150, 180];

export function hueFor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return HUES[Math.abs(hash) % HUES.length];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
```

Note: `permissionGroupsForContract` is removed entirely — the server page will build groups directly from DB query results. No helper needed.

- [ ] **Step 4: Update helpers.test.ts**

Remove the `permissionGroupsForContract` tests (function removed). Keep `relTime` and `hueFor` tests unchanged:

```ts
import { describe, expect, it } from "vitest";
import { relTime, hueFor } from "./helpers";

describe("relTime", () => {
  it("returns 'just now' for timestamps within 60s", () => {
    const now = new Date(Date.now() - 30_000).toISOString();
    expect(relTime(now)).toBe("just now");
  });

  it("returns 'Xm ago' for timestamps within 1h", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(relTime(fiveMinAgo)).toBe("5m ago");
  });

  it("returns 'Xh ago' for timestamps within 24h", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(relTime(threeHoursAgo)).toBe("3h ago");
  });

  it("returns 'Xd ago' for timestamps within 30d", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(relTime(twoDaysAgo)).toBe("2d ago");
  });

  it("returns formatted date for older timestamps", () => {
    const result = relTime("2025-01-15T12:00:00Z");
    expect(result).toMatch(/Jan\s+15,\s+2025/);
  });

  it("returns empty string for null", () => {
    expect(relTime(null)).toBe("");
  });
});

describe("hueFor", () => {
  it("returns consistent hue for the same name", () => {
    expect(hueFor("Alice")).toBe(hueFor("Alice"));
  });

  it("returns a number", () => {
    expect(typeof hueFor("Bob")).toBe("number");
  });
});
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @cloud/system test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/system/src/types.ts packages/system/src/index.ts packages/system/src/helpers.ts packages/system/src/helpers.test.ts
git commit -m "refactor(system): parameterize helpers, remove mock imports and unused types"
```

---

### Task 4: Refactor client components to accept permission groups as props

**Files:**
- Modify: `packages/system/src/roles/permissions-card.tsx`
- Modify: `packages/system/src/roles/role-editor.tsx`
- Modify: `packages/system/src/roles/roles-panel.tsx`
- Modify: `packages/system/src/roles/roles-page.tsx`
- Modify: `packages/system/src/users/user-detail.tsx`

- [ ] **Step 1: Update PermissionsCard — accept groups as prop**

Replace the import of `permissionGroupsForContract` and compute groups from prop instead:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { Badge, Button, Input, Switch } from "@cloud/ui";
import type { PermissionGroup } from "../types";

type PermissionsCardProps = {
  groups: PermissionGroup[];
  permissions: string[];
  onTogglePerm: (code: string) => void;
  onToggleGroup: (menuId: string, grant: boolean) => void;
  disabled?: boolean;
};

export function PermissionsCard({
  groups, permissions, onTogglePerm, onToggleGroup, disabled,
}: PermissionsCardProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "granted" | "available">("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const grantedSet = useMemo(() => new Set(permissions), [permissions]);

  // ... rest stays exactly the same, but remove the line:
  //   const groups = useMemo(() => permissionGroupsForContract(contractDefineCode), [contractDefineCode]);
  // The `groups` variable now comes from props.
  // All references to `groups` in the rest of the component remain unchanged.
```

Key change: remove `contractDefineCode` prop, add `groups` prop. The `filtered` useMemo and everything below remains identical — it already operates on `groups`.

- [ ] **Step 2: Update RoleEditor — accept permissionGroups, remove mock import**

Remove `import { PERMISSION_CATALOG } from "../mock"`. Add `permissionGroups` prop:

```tsx
import type { Role, User, PermissionGroup } from "../types";

type RoleEditorProps = {
  role: Role;
  users: User[];
  permissionGroups: PermissionGroup[];
  onSave: (r: Role) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function RoleEditor({ role, users, permissionGroups, onSave, onDuplicate, onDelete }: RoleEditorProps) {
  // ...

  function toggleGroup(menuId: string, grant: boolean) {
    const group = permissionGroups.find((g) => g.menuId === menuId);
    const groupCodes = group ? group.items.map((p) => p.code) : [];
    // rest unchanged
  }

  // In the JSX, update PermissionsCard:
  // <PermissionsCard groups={permissionGroups} permissions={draft.permissions}
  //   onTogglePerm={togglePerm} onToggleGroup={toggleGroup} disabled={role.builtin} />
```

- [ ] **Step 3: Update RolesPanel — thread permissionGroups**

Add `permissionGroups` to props and pass to `RoleEditor`:

```tsx
import type { Role, User, PermissionGroup } from "../types";

type RolesPanelProps = {
  initialRoles: Role[];
  users?: User[];
  permissionGroups: PermissionGroup[];
};

export function RolesPanel({ initialRoles, users = [], permissionGroups }: RolesPanelProps) {
  // ... in JSX:
  // <RoleEditor role={selected} users={users} permissionGroups={permissionGroups}
  //   onSave={update} onDuplicate={...} onDelete={...} />
```

- [ ] **Step 4: Update RolesPage — thread permissionGroups**

```tsx
import type { Role, User, PermissionGroup } from "../types";

type RolesPageProps = {
  initialRoles: Role[];
  users?: User[];
  permissionGroups: PermissionGroup[];
};

export function RolesPage({ initialRoles, users, permissionGroups }: RolesPageProps) {
  // ... in JSX:
  // <RolesPanel initialRoles={initialRoles} users={users} permissionGroups={permissionGroups} />
```

- [ ] **Step 5: Update user-detail.tsx — import PASSWORD_POLICY from @cloud/config**

Replace:
```ts
import { PASSWORD_POLICY } from "../mock/password-policy";
```
With:
```ts
import { PASSWORD_POLICY } from "@cloud/config/password-policy";
```

No other changes needed — the constant shape is identical.

- [ ] **Step 6: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: Errors in `apps/web/app/(portal)/system/roles/page.tsx` because `RolesPage` now requires `permissionGroups` prop. This is expected and will be fixed in Task 5.

- [ ] **Step 7: Commit**

```bash
git add packages/system/src/roles/ packages/system/src/users/user-detail.tsx
git commit -m "refactor(system): replace mock imports with props in client components"
```

---

### Task 5: Server page — load permission groups from DB

**Files:**
- Modify: `apps/web/app/(portal)/system/roles/page.tsx`

- [ ] **Step 1: Add permission group loader and pass to RolesPage**

```tsx
import { prisma } from "@cloud/db";
import { requireSession } from "../../../../lib/auth";
import { toClientRole } from "../../../../lib/role-mapper";
import { RolesPage } from "@cloud/system";
import type { PermissionGroup } from "@cloud/system";

async function loadRoles(entityId: number) {
  const roles = await prisma.sysRole.findMany({
    where: { OR: [{ entityId }, { entityId: null }] },
    include: {
      permissions: { select: { permissionCode: true } },
      _count: { select: { userRoles: true } },
    },
    orderBy: { creTime: "asc" },
  });

  const updaterIds = [...new Set(roles.map((r) => r.updUserId))];
  const updaters = updaterIds.length > 0
    ? await prisma.sysUser.findMany({
        where: { userId: { in: updaterIds } },
        select: { userId: true, username: true },
      })
    : [];
  const updaterMap = new Map(updaters.map((u) => [u.userId, u.username]));

  return roles.map((r) => toClientRole(r, updaterMap.get(r.updUserId) ?? "system"));
}

async function loadPermissionGroups(contractDefineCode: string): Promise<PermissionGroup[]> {
  const menus = await prisma.sysMenu.findMany({
    where: { contractDefineCode, isVisible: true },
    include: {
      permissions: {
        select: { permissionCode: true, label: true, remark: true },
      },
    },
    orderBy: { sort: "asc" },
  });

  return menus
    .filter((m) => m.permissions.length > 0)
    .map((m) => ({
      menuId: String(m.menuId),
      menuTitle: m.menuTitle,
      items: m.permissions.map((p) => ({
        code: p.permissionCode,
        label: p.label ?? p.permissionCode,
        desc: p.remark ?? "",
      })),
    }));
}

export default async function SystemRolesPage() {
  const session = await requireSession();
  const [initialRoles, permissionGroups] = await Promise.all([
    loadRoles(session.entity.entityId),
    loadPermissionGroups(session.entity.contractDefineCode),
  ]);
  return <RolesPage initialRoles={initialRoles} permissionGroups={permissionGroups} />;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(portal)/system/roles/page.tsx
git commit -m "feat(roles): load permission groups from database instead of mock"
```

---

### Task 6: Delete mock directory and clean up

**Files:**
- Delete: `packages/system/src/mock/` (entire directory)

- [ ] **Step 1: Delete the mock directory**

```bash
rm -rf packages/system/src/mock
```

- [ ] **Step 2: Run full verification**

```bash
pnpm db:generate
pnpm --filter @cloud/system test
pnpm exec tsc --noEmit
pnpm lint
```

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add -u packages/system/src/mock
git commit -m "chore: delete packages/system/src/mock directory"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run build**

```bash
pnpm --filter web build
```

Expected: Build succeeds.

- [ ] **Step 2: Manual smoke test**

Start dev server (`pnpm dev`), navigate to System → Roles. Verify:
- Permission groups appear correctly in role editor
- Toggle individual permissions and group toggle (Grant all / Revoke all) work
- Navigate to System → Users, verify password policy info displays correctly in user detail

- [ ] **Step 3: Run db:seed to verify seed changes**

If local DB is available:
```bash
pnpm db:push && pnpm db:seed
```

Verify `label` column is populated for all permissions.
