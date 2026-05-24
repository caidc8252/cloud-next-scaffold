# System Roles & Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the SYSTEM → Roles and SYSTEM → Users pages from the Carbon DEMO into `packages/system`, with mock data, local UI mapping, and portal shell tree-menu support.

**Architecture:** New `packages/system` package contains all page components and mock data. Components use `@cloud/ui` primitives and `lucide-react` icons. Portal shell is updated to render tree menus (parent → children). Seed is extended with System menus, 12 permissions, and role bindings.

**Tech Stack:** React 19, TypeScript, `@cloud/ui`, `lucide-react`, Tailwind CSS (via design tokens), Vitest, Prisma seed

---

## File Structure

### New files (packages/system/)

| File | Responsibility |
|------|---------------|
| `packages/system/package.json` | Package manifest |
| `packages/system/src/index.ts` | Public exports: RolesPage, UsersPage |
| `packages/system/src/types.ts` | Shared types: Role, User, PermissionEntry, MenuNode, PasswordPolicy |
| `packages/system/src/mock/seed-roles.ts` | 4 ADMIN-contract roles |
| `packages/system/src/mock/seed-users.ts` | 6 users (1 pending) |
| `packages/system/src/mock/password-policy.ts` | Password policy config |
| `packages/system/src/mock/menu-tree.ts` | ADMIN menus (System > Roles, Users) |
| `packages/system/src/mock/permission-catalog.ts` | 12 permission entries |
| `packages/system/src/mock/index.ts` | Re-exports all mock data |
| `packages/system/src/helpers.ts` | Pure helpers: relTime, permissionGroupsForContract, hueFor |
| `packages/system/src/helpers.test.ts` | Tests for helpers |
| `packages/system/src/roles/roles-page.tsx` | Roles page wrapper (header + notice + RolesPanel) |
| `packages/system/src/roles/roles-panel.tsx` | Left-right split: role list + role editor |
| `packages/system/src/roles/role-list-item.tsx` | Sidebar row |
| `packages/system/src/roles/role-editor.tsx` | Right pane editor |
| `packages/system/src/roles/permissions-card.tsx` | Permission groups with toggles, search, filter |
| `packages/system/src/roles/new-role-modal.tsx` | Create role modal |
| `packages/system/src/users/users-page.tsx` | Users page (left-right split, search, filter) |
| `packages/system/src/users/user-list-item.tsx` | Left sidebar row |
| `packages/system/src/users/user-detail.tsx` | Right pane for ACTIVE/LOCKED users |
| `packages/system/src/users/pending-invite-detail.tsx` | Right pane for PENDING invite |
| `packages/system/src/users/new-user-modal.tsx` | Create user modal (Direct + Email Invite tabs) |
| `packages/system/src/users/edit-user-modal.tsx` | Edit user info modal |
| `packages/system/src/users/reset-password-modal.tsx` | Reset password modal |
| `packages/system/src/users/change-role-modal.tsx` | Change user role modal |

### New files (apps/web/)

| File | Responsibility |
|------|---------------|
| `apps/web/app/(portal)/system/roles/page.tsx` | Thin wrapper importing RolesPage |
| `apps/web/app/(portal)/system/users/page.tsx` | Thin wrapper importing UsersPage |

### Modified files

| File | Changes |
|------|---------|
| `pnpm-workspace.yaml` | Add `packages/system` |
| `tsconfig.json` | Add `@cloud/system` path + include glob |
| `packages/db/prisma/seed.ts` | Add System menus, 12 permissions, role bindings |
| `apps/web/package.json` | Add `@cloud/system` dependency |
| `apps/web/app/(portal)/_components/portal-shell.tsx` | Support tree menus (group by parentMenuId) |
| `apps/web/app/(portal)/layout.tsx` | Pass parentMenuId to portal shell |
| `apps/web/lib/auth.ts` | Also fetch parent menus for sidebar hierarchy |
| `package.json` (root) | Add `packages/system` to lint script |

---

### Task 1: Package Scaffold + Types

**Files:**
- Create: `packages/system/package.json`
- Create: `packages/system/src/types.ts`
- Create: `packages/system/src/index.ts`
- Modify: `pnpm-workspace.yaml`
- Modify: `tsconfig.json`

- [ ] **Step 1: Create package.json**

```bash
mkdir -p packages/system/src
```

Create `packages/system/package.json`:

```json
{
  "name": "@cloud/system",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "lucide-react": "catalog:"
  },
  "peerDependencies": {
    "react": "^19",
    "@cloud/ui": "workspace:*"
  }
}
```

- [ ] **Step 2: Create types.ts**

Create `packages/system/src/types.ts`:

```typescript
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

export type PermissionEntry = {
  code: string;
  menuId: string;
  label: string;
  desc: string;
};

export type MenuNode = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  contractDefineCode: string;
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
  status: "ACTIVE" | "LOCKED" | "PENDING";
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
  passwordResetRequests?: PasswordResetRequest[];
};
```

- [ ] **Step 3: Create placeholder index.ts**

Create `packages/system/src/index.ts`:

```typescript
export type { Role, User, PermissionEntry, MenuNode, PasswordPolicy } from "./types";
```

- [ ] **Step 4: Register package in workspace**

In `pnpm-workspace.yaml`, add `"packages/system"` to the packages list (after `packages/request`):

```yaml
packages:
  - "apps/web"
  - "packages/config"
  - "packages/db"
  - "packages/permissions"
  - "packages/request"
  - "packages/security"
  - "packages/system"
  - "packages/ui"
```

- [ ] **Step 5: Add tsconfig paths + includes**

In `tsconfig.json`, add to `compilerOptions.paths`:

```json
"@cloud/system": ["./packages/system/src/index.ts"]
```

Add to `include` array:

```json
"packages/system/src/**/*.ts",
"packages/system/src/**/*.tsx"
```

- [ ] **Step 6: Install and verify**

```bash
pnpm install && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/system/ pnpm-workspace.yaml tsconfig.json pnpm-lock.yaml
git commit -m "feat(system): scaffold package with types"
```

---

### Task 2: Mock Data

**Files:**
- Create: `packages/system/src/mock/password-policy.ts`
- Create: `packages/system/src/mock/menu-tree.ts`
- Create: `packages/system/src/mock/permission-catalog.ts`
- Create: `packages/system/src/mock/seed-roles.ts`
- Create: `packages/system/src/mock/seed-users.ts`
- Create: `packages/system/src/mock/index.ts`

- [ ] **Step 1: Create password-policy.ts**

Create `packages/system/src/mock/password-policy.ts`:

```typescript
import type { PasswordPolicy } from "../types";

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

- [ ] **Step 2: Create menu-tree.ts**

Create `packages/system/src/mock/menu-tree.ts`:

```typescript
import type { MenuNode } from "../types";

export const MENU_TREE: MenuNode[] = [
  {
    id: "m-admin-users",
    parentId: null,
    title: "Platform Users",
    icon: "users",
    contractDefineCode: "ADMIN",
  },
  {
    id: "m-admin-roles",
    parentId: null,
    title: "Platform Roles",
    icon: "shield",
    contractDefineCode: "ADMIN",
  },
];
```

- [ ] **Step 3: Create permission-catalog.ts**

Create `packages/system/src/mock/permission-catalog.ts`:

```typescript
import type { PermissionEntry } from "../types";

export const PERMISSION_CATALOG: PermissionEntry[] = [
  // Roles menu permissions
  { code: "roles.VIEW", menuId: "m-admin-roles", label: "View Roles", desc: "View role list and details" },
  { code: "roles.ADD", menuId: "m-admin-roles", label: "Create Role", desc: "Create new role" },
  { code: "roles.UPD", menuId: "m-admin-roles", label: "Edit Role", desc: "Edit role name, description, permissions" },
  { code: "roles.DELETE", menuId: "m-admin-roles", label: "Delete Role", desc: "Delete non-builtin role" },
  { code: "roles.DUPLICATE", menuId: "m-admin-roles", label: "Duplicate Role", desc: "Copy an existing role" },
  // Users menu permissions
  { code: "users.VIEW", menuId: "m-admin-users", label: "View Users", desc: "View user list and details" },
  { code: "users.ADD", menuId: "m-admin-users", label: "Create User", desc: "Create user (direct mode)" },
  { code: "users.INVITE", menuId: "m-admin-users", label: "Invite User", desc: "Invite user (email mode, placeholder)" },
  { code: "users.UPD", menuId: "m-admin-users", label: "Edit User", desc: "Edit user display name, email, remark" },
  { code: "users.LOCK", menuId: "m-admin-users", label: "Lock/Unlock User", desc: "Lock / unlock user account" },
  { code: "users.RESETPW", menuId: "m-admin-users", label: "Reset Password", desc: "Force-reset user password" },
  { code: "users.CHANGE_ROLE", menuId: "m-admin-users", label: "Change Role", desc: "Change user's assigned role" },
];

export const PERM_BY_CODE = Object.fromEntries(PERMISSION_CATALOG.map((p) => [p.code, p]));

export const ALL_PERMISSION_CODES = PERMISSION_CATALOG.map((p) => p.code);
```

- [ ] **Step 4: Create seed-roles.ts**

Create `packages/system/src/mock/seed-roles.ts`:

```typescript
import type { Role } from "../types";
import { ALL_PERMISSION_CODES } from "./permission-catalog";

export const SEED_ROLES: Role[] = [
  {
    id: "r-admin-platform",
    name: "Platform Administrator",
    description: "Full access to all platform administration features.",
    builtin: true,
    operatorCount: 2,
    roleType: "global",
    contractDefineCode: "ADMIN",
    permissions: [...ALL_PERMISSION_CODES],
    updatedAt: "2026-01-15T09:00:00Z",
    updatedBy: "system",
  },
  {
    id: "r-admin-ops",
    name: "Operations Admin",
    description: "Manages platform users and views roles. Cannot modify role definitions.",
    builtin: false,
    operatorCount: 4,
    roleType: "global",
    contractDefineCode: "ADMIN",
    permissions: [
      "users.VIEW", "users.ADD", "users.INVITE", "users.UPD",
      "users.LOCK", "users.RESETPW", "users.CHANGE_ROLE",
      "roles.VIEW",
    ],
    updatedAt: "2026-03-10T14:30:00Z",
    updatedBy: "admin@carbon",
  },
  {
    id: "r-admin-compliance",
    name: "Compliance Officer",
    description: "Read-only access to users and roles for audit purposes.",
    builtin: false,
    operatorCount: 2,
    roleType: "global",
    contractDefineCode: "ADMIN",
    permissions: ["users.VIEW", "roles.VIEW"],
    updatedAt: "2026-02-20T11:15:00Z",
    updatedBy: "admin@carbon",
  },
  {
    id: "r-admin-viewer",
    name: "Platform Viewer",
    description: "View-only access to the platform admin panel.",
    builtin: true,
    operatorCount: 1,
    roleType: "global",
    contractDefineCode: "ADMIN",
    permissions: ["users.VIEW", "roles.VIEW"],
    updatedAt: "2026-01-15T09:00:00Z",
    updatedBy: "system",
  },
];
```

- [ ] **Step 5: Create seed-users.ts**

Create `packages/system/src/mock/seed-users.ts`:

```typescript
import type { User } from "../types";

const now = Date.now();
const day = 86_400_000;

export const SEED_USERS: User[] = [
  {
    id: "u-admin",
    loginName: "admin",
    displayName: "System Admin",
    email: "admin@cloud.local",
    country: "CN",
    status: "ACTIVE",
    lastLoginAt: new Date(now - 2 * 3_600_000).toISOString(),
    passwordChangedTimestamp: now - 15 * day,
    passwordErrorTimes: 0,
    passwordChangeTimes: 3,
    passwordErrorLockExpiredTimestamp: null,
    passwordUpdatedAt: new Date(now - 15 * day).toISOString(),
    remark: "Primary platform administrator",
    createdAt: "2025-06-01T00:00:00Z",
    updatedAt: new Date(now - 2 * 3_600_000).toISOString(),
    authorizingType: "ADMIN",
    roleIds: ["r-admin-platform"],
    passwordHistory: [
      { hashId: "ph-001", changedAt: new Date(now - 15 * day).toISOString() },
      { hashId: "ph-002", changedAt: new Date(now - 105 * day).toISOString() },
      { hashId: "ph-003", changedAt: new Date(now - 195 * day).toISOString() },
    ],
  },
  {
    id: "u-jordan",
    loginName: "jordan.d",
    displayName: "Jordan Diaz",
    email: "jordan.diaz@company.com",
    country: "US",
    status: "ACTIVE",
    lastLoginAt: new Date(now - 4 * 3_600_000).toISOString(),
    passwordChangedTimestamp: now - 45 * day,
    passwordErrorTimes: 0,
    passwordChangeTimes: 2,
    passwordErrorLockExpiredTimestamp: null,
    passwordUpdatedAt: new Date(now - 45 * day).toISOString(),
    remark: "",
    createdAt: "2025-08-15T00:00:00Z",
    updatedAt: new Date(now - 4 * 3_600_000).toISOString(),
    authorizingType: "NORMAL",
    roleIds: ["r-admin-ops"],
    passwordHistory: [
      { hashId: "ph-010", changedAt: new Date(now - 45 * day).toISOString() },
      { hashId: "ph-011", changedAt: new Date(now - 135 * day).toISOString() },
    ],
  },
  {
    id: "u-priya",
    loginName: "priya.k",
    displayName: "Priya Krishnan",
    email: "priya.k@company.com",
    country: "IN",
    status: "ACTIVE",
    lastLoginAt: new Date(now - 1 * day).toISOString(),
    passwordChangedTimestamp: now - 80 * day,
    passwordErrorTimes: 2,
    passwordChangeTimes: 1,
    passwordErrorLockExpiredTimestamp: null,
    passwordUpdatedAt: new Date(now - 80 * day).toISOString(),
    remark: "Compliance team lead",
    createdAt: "2025-09-01T00:00:00Z",
    updatedAt: new Date(now - 1 * day).toISOString(),
    authorizingType: "NORMAL",
    roleIds: ["r-admin-compliance"],
    passwordHistory: [
      { hashId: "ph-020", changedAt: new Date(now - 80 * day).toISOString() },
    ],
  },
  {
    id: "u-marcus",
    loginName: "marcus.r",
    displayName: "Marcus Reilly",
    email: "marcus.r@company.com",
    country: "GB",
    status: "LOCKED",
    lastLoginAt: new Date(now - 3 * day).toISOString(),
    passwordChangedTimestamp: now - 60 * day,
    passwordErrorTimes: 5,
    passwordChangeTimes: 1,
    passwordErrorLockExpiredTimestamp: now + 15 * 60_000,
    passwordUpdatedAt: new Date(now - 60 * day).toISOString(),
    remark: "",
    createdAt: "2025-10-01T00:00:00Z",
    updatedAt: new Date(now - 10 * 60_000).toISOString(),
    authorizingType: "NORMAL",
    roleIds: ["r-admin-ops"],
    passwordHistory: [
      { hashId: "ph-030", changedAt: new Date(now - 60 * day).toISOString() },
    ],
  },
  {
    id: "u-lena",
    loginName: "lena.h",
    displayName: "Lena Hartmann",
    email: "lena.h@company.com",
    country: "DE",
    status: "ACTIVE",
    lastLoginAt: new Date(now - 6 * 3_600_000).toISOString(),
    passwordChangedTimestamp: now - 30 * day,
    passwordErrorTimes: 0,
    passwordChangeTimes: 1,
    passwordErrorLockExpiredTimestamp: null,
    passwordUpdatedAt: new Date(now - 30 * day).toISOString(),
    remark: "",
    createdAt: "2025-11-01T00:00:00Z",
    updatedAt: new Date(now - 6 * 3_600_000).toISOString(),
    authorizingType: "NORMAL",
    roleIds: ["r-admin-viewer"],
    passwordHistory: [
      { hashId: "ph-040", changedAt: new Date(now - 30 * day).toISOString() },
    ],
  },
  {
    id: "u-inv-kai",
    loginName: "",
    displayName: "",
    email: "",
    country: "",
    status: "PENDING",
    lastLoginAt: null,
    passwordChangedTimestamp: 0,
    passwordErrorTimes: 0,
    passwordChangeTimes: 0,
    passwordErrorLockExpiredTimestamp: null,
    passwordUpdatedAt: null,
    remark: "Invited to help with operations",
    createdAt: new Date(now - 2 * day).toISOString(),
    updatedAt: new Date(now - 2 * day).toISOString(),
    authorizingType: "NORMAL",
    roleIds: ["r-admin-ops"],
    passwordHistory: [],
    invitedAt: new Date(now - 2 * day).toISOString(),
    invitedBy: "admin",
    inviteExpiresAt: new Date(now + 5 * day).toISOString(),
    inviteToken: "inv-tok-abc123",
    inviteEmail: "kai.tanaka@company.com",
  },
];
```

- [ ] **Step 6: Create mock/index.ts**

Create `packages/system/src/mock/index.ts`:

```typescript
export { PASSWORD_POLICY } from "./password-policy";
export { MENU_TREE } from "./menu-tree";
export { PERMISSION_CATALOG, PERM_BY_CODE, ALL_PERMISSION_CODES } from "./permission-catalog";
export { SEED_ROLES } from "./seed-roles";
export { SEED_USERS } from "./seed-users";
```

- [ ] **Step 7: Verify types compile**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/system/src/mock/
git commit -m "feat(system): add mock data for roles, users, permissions"
```

---

### Task 3: Helper Functions + Tests

**Files:**
- Create: `packages/system/src/helpers.ts`
- Create: `packages/system/src/helpers.test.ts`

- [ ] **Step 1: Write tests**

Create `packages/system/src/helpers.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { relTime, hueFor, permissionGroupsForContract } from "./helpers";

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
    const result = relTime("2025-01-15T00:00:00Z");
    expect(result).toMatch(/Jan 15, 2025/);
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

describe("permissionGroupsForContract", () => {
  it("returns groups for ADMIN contract", () => {
    const groups = permissionGroupsForContract("ADMIN");
    expect(groups.length).toBeGreaterThan(0);
    expect(groups.every((g) => g.menuTitle.length > 0)).toBe(true);
  });

  it("each group has items with code and label", () => {
    const groups = permissionGroupsForContract("ADMIN");
    for (const g of groups) {
      expect(g.items.length).toBeGreaterThan(0);
      for (const item of g.items) {
        expect(item.code).toBeTruthy();
        expect(item.label).toBeTruthy();
      }
    }
  });

  it("returns empty array for unknown contract", () => {
    const groups = permissionGroupsForContract("UNKNOWN");
    expect(groups).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test -- packages/system/src/helpers.test.ts
```

Expected: FAIL — `helpers.ts` doesn't exist yet.

- [ ] **Step 3: Implement helpers**

Create `packages/system/src/helpers.ts`:

```typescript
import { PERMISSION_CATALOG, MENU_TREE } from "./mock";
import type { PermissionEntry } from "./types";

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

export function fmtDateTime(iso: string): string {
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

export type PermissionGroup = {
  menuId: string;
  menuTitle: string;
  items: PermissionEntry[];
};

export function permissionGroupsForContract(contractDefineCode: string): PermissionGroup[] {
  const menus = MENU_TREE.filter((m) => m.contractDefineCode === contractDefineCode);
  if (menus.length === 0) return [];

  const menuIds = new Set(menus.map((m) => m.id));
  const groups: PermissionGroup[] = [];

  for (const menu of menus) {
    const items = PERMISSION_CATALOG.filter((p) => p.menuId === menu.id);
    if (items.length > 0) {
      groups.push({ menuId: menu.id, menuTitle: menu.title, items });
    }
  }

  return groups;
}

export function permAppliesToContract(permCode: string, contractDefineCode: string): boolean {
  const perm = PERMISSION_CATALOG.find((p) => p.code === permCode);
  if (!perm) return false;
  const menu = MENU_TREE.find((m) => m.id === perm.menuId);
  return menu?.contractDefineCode === contractDefineCode;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- packages/system/src/helpers.test.ts
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/system/src/helpers.ts packages/system/src/helpers.test.ts
git commit -m "feat(system): add helper functions with tests"
```

---

### Task 4: Roles Page Layout (RolesPage + RolesPanel + RoleListItem)

**Files:**
- Create: `packages/system/src/roles/roles-page.tsx`
- Create: `packages/system/src/roles/roles-panel.tsx`
- Create: `packages/system/src/roles/role-list-item.tsx`

- [ ] **Step 1: Create role-list-item.tsx**

Create `packages/system/src/roles/role-list-item.tsx`:

```tsx
"use client";

import { Shield } from "lucide-react";
import { Badge } from "@cloud/ui";
import type { Role } from "../types";
import { cn } from "@cloud/ui";

type RoleListItemProps = {
  role: Role;
  active: boolean;
  onClick: () => void;
};

export function RoleListItem({ role, active, onClick }: RoleListItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-left transition-colors",
        active
          ? "bg-surface-2 shadow-1"
          : "hover:bg-surface-hover",
      )}
    >
      <Shield size={14} className="text-content-tertiary shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-content-primary truncate">
            {role.name}
          </span>
          {role.builtin && (
            <Badge variant="outline" className="shrink-0">SYSTEM</Badge>
          )}
        </div>
        <div className="text-xs text-content-tertiary mt-0.5">
          {role.permissions.length} permissions
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Create roles-panel.tsx**

Create `packages/system/src/roles/roles-panel.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { Button, Input } from "@cloud/ui";
import type { Role, User } from "../types";
import { SEED_ROLES } from "../mock";
import { RoleListItem } from "./role-list-item";
import { RoleEditor } from "./role-editor";
import { NewRoleModal } from "./new-role-modal";

type RolesPanelProps = {
  roles?: Role[];
  setRoles?: (roles: Role[]) => void;
  users?: User[];
};

export function RolesPanel({ roles: propRoles, setRoles: propSetRoles, users = [] }: RolesPanelProps) {
  const [localRoles, setLocalRoles] = useState(SEED_ROLES);
  const roles = propRoles ?? localRoles;
  const setRoles = propSetRoles ?? setLocalRoles;

  const [selectedId, setSelectedId] = useState<string | null>(roles[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return roles;
    const q = query.toLowerCase();
    return roles.filter((r) => r.name.toLowerCase().includes(q));
  }, [roles, query]);

  const selected = roles.find((r) => r.id === selectedId) ?? null;

  function update(next: Role) {
    setRoles(roles.map((r) => (r.id === next.id ? { ...next, updatedAt: new Date().toISOString(), updatedBy: "admin@carbon" } : r)));
  }

  function createRole(draft: { name: string; description: string; baseId: string | null }) {
    const base = draft.baseId ? roles.find((r) => r.id === draft.baseId) : null;
    const newRole: Role = {
      id: `r-${Math.random().toString(36).slice(2, 7)}`,
      name: draft.name,
      description: draft.description,
      builtin: false,
      operatorCount: 0,
      roleType: "global",
      contractDefineCode: "ADMIN",
      permissions: base ? [...base.permissions] : [],
      updatedAt: new Date().toISOString(),
      updatedBy: "admin@carbon",
    };
    setRoles([...roles, newRole]);
    setSelectedId(newRole.id);
    setShowNew(false);
  }

  function deleteRole(id: string) {
    const next = roles.filter((r) => r.id !== id);
    setRoles(next);
    setSelectedId(next[0]?.id ?? null);
  }

  function duplicate(r: Role) {
    const newRole: Role = {
      ...r,
      id: `r-${Math.random().toString(36).slice(2, 7)}`,
      name: `${r.name} (copy)`,
      builtin: false,
      operatorCount: 0,
      updatedAt: new Date().toISOString(),
      updatedBy: "admin@carbon",
    };
    setRoles([...roles, newRole]);
    setSelectedId(newRole.id);
  }

  return (
    <>
      <div className="flex gap-0 border border-line-default rounded-lg overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
        {/* Sidebar */}
        <div className="w-[280px] shrink-0 border-r border-line-default flex flex-col bg-surface-1">
          <div className="p-3 space-y-2 border-b border-line-subtle">
            <Input
              prefix={<Search size={14} />}
              placeholder="Search roles…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              inputSize="sm"
            />
            <Button variant="primary" size="sm" block onClick={() => setShowNew(true)} iconLeft={<Plus size={14} />}>
              New role
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {filtered.map((r) => (
              <RoleListItem
                key={r.id}
                role={r}
                active={r.id === selectedId}
                onClick={() => setSelectedId(r.id)}
              />
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-y-auto bg-surface-1">
          {selected ? (
            <RoleEditor
              role={selected}
              users={users}
              onSave={update}
              onDuplicate={() => duplicate(selected)}
              onDelete={() => deleteRole(selected.id)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-content-tertiary text-sm">
              Select a role to edit
            </div>
          )}
        </div>
      </div>

      <NewRoleModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={createRole}
        allRoles={roles}
      />
    </>
  );
}
```

- [ ] **Step 3: Create roles-page.tsx**

Create `packages/system/src/roles/roles-page.tsx`:

```tsx
"use client";

import { Shield } from "lucide-react";
import { Alert, AlertDescription } from "@cloud/ui";
import type { Role, User } from "../types";
import { RolesPanel } from "./roles-panel";

type RolesPageProps = {
  roles?: Role[];
  setRoles?: (roles: Role[]) => void;
  users?: User[];
};

export function RolesPage({ roles, setRoles, users }: RolesPageProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-content-primary">Roles</h1>
        <p className="text-sm text-content-secondary mt-1">
          Carbon platform roles — assignable only to Carbon staff (see <strong>System → Users</strong>).
          <span className="text-content-tertiary"> All roles here are bound to the <code className="font-mono text-xs">ADMIN</code> contract.</span>
        </p>
      </div>

      <Alert>
        <Shield size={14} />
        <AlertDescription>
          <strong>Internal scope.</strong> These roles are not visible to customer operators.
          They govern access to the Carbon admin platform itself — managing other staff users,
          platform-wide notifications, API keys, and global audit.
        </AlertDescription>
      </Alert>

      <RolesPanel roles={roles} setRoles={setRoles} users={users} />
    </div>
  );
}
```

- [ ] **Step 4: Verify compilation**

```bash
pnpm exec tsc --noEmit
```

Expected: errors about missing `RoleEditor` and `NewRoleModal` (will be created in next tasks). If there are other errors, fix them.

Note: Since `RoleEditor` and `NewRoleModal` don't exist yet, create temporary stubs to unblock compilation:

Create temporary `packages/system/src/roles/role-editor.tsx`:

```tsx
"use client";
import type { Role, User } from "../types";
type Props = { role: Role; users: User[]; onSave: (r: Role) => void; onDuplicate: () => void; onDelete: () => void };
export function RoleEditor({ role }: Props) {
  return <div className="p-6 text-sm text-content-secondary">Editing: {role.name}</div>;
}
```

Create temporary `packages/system/src/roles/new-role-modal.tsx`:

```tsx
"use client";
import type { Role } from "../types";
type Props = { open: boolean; onClose: () => void; onCreate: (draft: { name: string; description: string; baseId: string | null }) => void; allRoles: Role[] };
export function NewRoleModal({ open }: Props) {
  if (!open) return null;
  return <div />;
}
```

- [ ] **Step 5: Verify compilation again**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/system/src/roles/
git commit -m "feat(system): add roles page layout with panel and list item"
```

---

### Task 5: Role Editor + Permissions Card

**Files:**
- Replace: `packages/system/src/roles/role-editor.tsx` (overwrite stub)
- Create: `packages/system/src/roles/permissions-card.tsx`

- [ ] **Step 1: Create permissions-card.tsx**

Create `packages/system/src/roles/permissions-card.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { Badge, Button, Input, Switch } from "@cloud/ui";
import { permissionGroupsForContract } from "../helpers";

type PermissionsCardProps = {
  contractDefineCode: string;
  permissions: string[];
  onTogglePerm: (code: string) => void;
  onToggleGroup: (menuId: string, grant: boolean) => void;
  disabled?: boolean;
};

export function PermissionsCard({
  contractDefineCode,
  permissions,
  onTogglePerm,
  onToggleGroup,
  disabled,
}: PermissionsCardProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "granted" | "available">("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const grantedSet = useMemo(() => new Set(permissions), [permissions]);
  const groups = useMemo(() => permissionGroupsForContract(contractDefineCode), [contractDefineCode]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return groups
      .map((g) => {
        let items = g.items;
        if (q) {
          items = items.filter(
            (p) => p.label.toLowerCase().includes(q) || p.code.toLowerCase().includes(q),
          );
        }
        if (filter === "granted") items = items.filter((p) => grantedSet.has(p.code));
        if (filter === "available") items = items.filter((p) => !grantedSet.has(p.code));
        return { ...g, items };
      })
      .filter((g) => g.items.length > 0);
  }, [groups, query, filter, grantedSet]);

  const totalInScope = groups.reduce((n, g) => n + g.items.length, 0);
  const grantedCount = permissions.filter((p) =>
    groups.some((g) => g.items.some((i) => i.code === p)),
  ).length;

  const allExpanded = filtered.length > 0 && filtered.every((g) => expanded.has(g.menuId));

  function toggleExpandAll() {
    if (allExpanded) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(filtered.map((g) => g.menuId)));
    }
  }

  return (
    <div className="border border-line-default rounded-lg">
      <div className="px-4 py-3 border-b border-line-subtle flex items-center justify-between">
        <div className="text-sm font-medium text-content-primary">
          Permissions
          <span className="text-content-tertiary font-normal ml-1.5">
            {grantedCount} / {totalInScope}
          </span>
        </div>
        <Button variant="ghost" size="xs" onClick={toggleExpandAll}>
          {allExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </div>

      <div className="px-4 py-2 border-b border-line-subtle flex items-center gap-2">
        <Input
          prefix={<Search size={14} />}
          placeholder="Search permissions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          inputSize="sm"
          className="flex-1"
        />
        <div className="flex gap-1">
          {(["all", "granted", "available"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f === "granted" ? "Granted" : "Available"}
            </Button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-line-subtle">
        {filtered.map((group) => {
          const isOpen = expanded.has(group.menuId);
          const groupGranted = group.items.filter((p) => grantedSet.has(p.code)).length;
          const allGranted = groupGranted === group.items.length;

          return (
            <div key={group.menuId}>
              <button
                type="button"
                className="flex items-center w-full px-4 py-2.5 hover:bg-surface-hover text-left"
                onClick={() => {
                  const next = new Set(expanded);
                  isOpen ? next.delete(group.menuId) : next.add(group.menuId);
                  setExpanded(next);
                }}
              >
                {isOpen ? (
                  <ChevronDown size={14} className="text-content-tertiary mr-2 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-content-tertiary mr-2 shrink-0" />
                )}
                <span className="flex-1 text-sm font-medium text-content-primary">
                  {group.menuTitle}
                </span>
                <span className="text-xs text-content-tertiary mr-3">
                  {groupGranted}/{group.items.length}
                </span>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleGroup(group.menuId, !allGranted);
                    }}
                  >
                    {allGranted ? "Revoke all" : "Grant all"}
                  </Button>
                )}
              </button>

              {isOpen && (
                <div className="pb-1">
                  {group.items.map((perm) => (
                    <div
                      key={perm.code}
                      className="flex items-center gap-3 pl-10 pr-4 py-2 hover:bg-surface-hover"
                    >
                      <Switch
                        checked={grantedSet.has(perm.code)}
                        onCheckedChange={() => onTogglePerm(perm.code)}
                        disabled={disabled}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-content-primary">{perm.label}</div>
                        <div className="text-xs text-content-tertiary">{perm.desc}</div>
                      </div>
                      <Badge variant="outline" className="shrink-0 font-mono text-xs">
                        {perm.code}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-content-tertiary">
            No permissions match your filter.
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace role-editor.tsx**

Replace `packages/system/src/roles/role-editor.tsx` with full implementation:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Copy, Trash2 } from "lucide-react";
import { Badge, Button, Input, Textarea, Modal, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import type { Role, User } from "../types";
import { relTime } from "../helpers";
import { PERMISSION_CATALOG } from "../mock";
import { PermissionsCard } from "./permissions-card";

type RoleEditorProps = {
  role: Role;
  users: User[];
  onSave: (r: Role) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function RoleEditor({ role, users, onSave, onDuplicate, onDelete }: RoleEditorProps) {
  const [draft, setDraft] = useState(role);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset draft when selected role changes
  const roleKey = role.id;
  const [prevKey, setPrevKey] = useState(roleKey);
  if (roleKey !== prevKey) {
    setPrevKey(roleKey);
    setDraft(role);
  }

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(role), [draft, role]);
  const assignedUsers = users.filter((u) => u.roleIds.includes(role.id));

  function togglePerm(code: string) {
    const perms = draft.permissions.includes(code)
      ? draft.permissions.filter((p) => p !== code)
      : [...draft.permissions, code];
    setDraft({ ...draft, permissions: perms });
  }

  function toggleGroup(menuId: string, grant: boolean) {
    const groupCodes = PERMISSION_CATALOG.filter((p) => p.menuId === menuId).map((p) => p.code);
    let perms: string[];
    if (grant) {
      perms = [...new Set([...draft.permissions, ...groupCodes])];
    } else {
      const removeSet = new Set(groupCodes);
      perms = draft.permissions.filter((p) => !removeSet.has(p));
    }
    setDraft({ ...draft, permissions: perms });
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="text-lg font-semibold border-0 px-0 shadow-none focus-visible:ring-0"
          disabled={role.builtin}
        />
        <div className="flex items-center gap-3 mt-1 text-xs text-content-tertiary">
          <span>{role.operatorCount} operators</span>
          <span>Updated {relTime(role.updatedAt)}</span>
          <span>by {role.updatedBy}</span>
          {role.builtin && <Badge variant="outline">SYSTEM</Badge>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" iconLeft={<Copy size={14} />} onClick={onDuplicate}>
          Duplicate
        </Button>
        <Button
          variant="ghost-danger"
          size="sm"
          iconLeft={<Trash2 size={14} />}
          onClick={() => setConfirmDelete(true)}
          disabled={role.builtin}
        >
          Delete
        </Button>
        <div className="flex-1" />
        <Button variant="primary" size="sm" disabled={!dirty} onClick={() => onSave(draft)}>
          Save changes
        </Button>
      </div>

      {/* Description */}
      <Card>
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={3}
            disabled={role.builtin}
          />
        </CardContent>
      </Card>

      {/* Permissions */}
      <PermissionsCard
        contractDefineCode={draft.contractDefineCode}
        permissions={draft.permissions}
        onTogglePerm={togglePerm}
        onToggleGroup={toggleGroup}
        disabled={role.builtin}
      />

      {/* Assigned Users */}
      {assignedUsers.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Assigned Users ({assignedUsers.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assignedUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-sm">
                  <span className="text-content-primary font-medium">{u.displayName || u.loginName}</span>
                  <span className="text-content-tertiary">{u.email}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirm */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete role"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setConfirmDelete(false); onDelete(); }}>
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-content-secondary">
          Are you sure you want to delete <strong>{role.name}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Verify compilation**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/system/src/roles/role-editor.tsx packages/system/src/roles/permissions-card.tsx
git commit -m "feat(system): add role editor with permissions card"
```

---

### Task 6: New Role Modal

**Files:**
- Replace: `packages/system/src/roles/new-role-modal.tsx` (overwrite stub)

- [ ] **Step 1: Replace new-role-modal.tsx**

Replace `packages/system/src/roles/new-role-modal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button, Field, Input, Textarea, Modal, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@cloud/ui";
import type { Role } from "../types";

type NewRoleModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: { name: string; description: string; baseId: string | null }) => void;
  allRoles: Role[];
};

export function NewRoleModal({ open, onClose, onCreate, allRoles }: NewRoleModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseId, setBaseId] = useState<string>("none");

  const valid = name.trim().length > 1;

  function handleCreate() {
    onCreate({ name: name.trim(), description: description.trim(), baseId: baseId === "none" ? null : baseId });
    setName("");
    setDescription("");
    setBaseId("none");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New role"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid} onClick={handleCreate}>Create</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Role name" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Support Agent"
            autoFocus
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this role is for…"
            rows={3}
          />
        </Field>

        <Field label="Start from" hint="Copy permissions from an existing role">
          <Select value={baseId} onValueChange={setBaseId}>
            <SelectTrigger>
              <SelectValue placeholder="No base role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No base role</SelectItem>
              {allRoles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} ({r.permissions.length} perms)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Update index.ts exports**

Update `packages/system/src/index.ts`:

```typescript
export type { Role, User, PermissionEntry, MenuNode, PasswordPolicy } from "./types";
export { RolesPage } from "./roles/roles-page";
```

- [ ] **Step 3: Verify compilation**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/system/src/roles/new-role-modal.tsx packages/system/src/index.ts
git commit -m "feat(system): add new role modal and export RolesPage"
```

---

### Task 7: Users Page Layout (UsersPage + UserListItem)

**Files:**
- Create: `packages/system/src/users/users-page.tsx`
- Create: `packages/system/src/users/user-list-item.tsx`

- [ ] **Step 1: Create user-list-item.tsx**

Create `packages/system/src/users/user-list-item.tsx`:

```tsx
"use client";

import { Badge } from "@cloud/ui";
import type { User } from "../types";
import { cn } from "@cloud/ui";
import { relTime, hueFor, initials } from "../helpers";
import { Mail } from "lucide-react";

type UserListItemProps = {
  user: User;
  active: boolean;
  onClick: () => void;
};

const STATUS_TONE = {
  ACTIVE: "success",
  LOCKED: "error",
  PENDING: "warning",
} as const;

export function UserListItem({ user, active, onClick }: UserListItemProps) {
  const isPending = user.status === "PENDING";
  const displayName = isPending ? (user.inviteEmail ?? "Pending") : (user.displayName || user.loginName);
  const hue = hueFor(displayName);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-left transition-colors",
        active ? "bg-surface-2 shadow-1" : "hover:bg-surface-hover",
      )}
    >
      {/* Avatar */}
      <div
        className="size-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
        style={{
          background: `oklch(92% 0.03 ${hue})`,
          color: `oklch(40% 0.12 ${hue})`,
        }}
      >
        {isPending ? <Mail size={14} /> : initials(displayName)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-content-primary truncate">{displayName}</span>
          <Badge tone={STATUS_TONE[user.status]} className="shrink-0">
            {user.status}
          </Badge>
        </div>
        <div className="text-xs text-content-tertiary mt-0.5 truncate">
          {isPending ? `Invite expires ${relTime(user.inviteExpiresAt)}` : (user.lastLoginAt ? `Last login ${relTime(user.lastLoginAt)}` : "Never logged in")}
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Create users-page.tsx**

Create `packages/system/src/users/users-page.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { Button, Input } from "@cloud/ui";
import type { Role, User } from "../types";
import { SEED_USERS } from "../mock/seed-users";
import { SEED_ROLES } from "../mock/seed-roles";
import { UserListItem } from "./user-list-item";
import { UserDetail } from "./user-detail";
import { PendingInviteDetail } from "./pending-invite-detail";
import { NewUserModal } from "./new-user-modal";

type UsersPageProps = {
  users?: User[];
  setUsers?: (users: User[]) => void;
  roles?: Role[];
};

type StatusFilter = "all" | "active" | "locked" | "pending";

export function UsersPage({ users: propUsers, setUsers: propSetUsers, roles: propRoles }: UsersPageProps) {
  const [localUsers, setLocalUsers] = useState(SEED_USERS);
  const users = propUsers ?? localUsers;
  const setUsers = propSetUsers ?? setLocalUsers;
  const roles = propRoles ?? SEED_ROLES;

  const [selectedId, setSelectedId] = useState<string | null>(users[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showNew, setShowNew] = useState(false);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === "ACTIVE").length,
    locked: users.filter((u) => u.status === "LOCKED").length,
    pending: users.filter((u) => u.status === "PENDING").length,
  }), [users]);

  const filtered = useMemo(() => {
    let list = users;
    if (statusFilter !== "all") {
      list = list.filter((u) => u.status === statusFilter.toUpperCase());
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (u) =>
          u.loginName.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.inviteEmail ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [users, statusFilter, query]);

  const selected = users.find((u) => u.id === selectedId) ?? null;

  function update(next: User) {
    setUsers(users.map((u) => (u.id === next.id ? { ...next, updatedAt: new Date().toISOString() } : u)));
  }

  function createUser(draft: { email: string; roleIds: string[]; remark: string; mode: "direct" | "invite"; loginName?: string; displayName?: string; tempPassword?: string }) {
    if (draft.mode === "direct") {
      const newUser: User = {
        id: `u-${Math.random().toString(36).slice(2, 7)}`,
        loginName: draft.loginName ?? "",
        displayName: draft.displayName ?? "",
        email: draft.email,
        country: "",
        status: "ACTIVE",
        lastLoginAt: null,
        passwordChangedTimestamp: Date.now(),
        passwordErrorTimes: 0,
        passwordChangeTimes: 0,
        passwordErrorLockExpiredTimestamp: null,
        passwordUpdatedAt: new Date().toISOString(),
        remark: draft.remark,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorizingType: "NORMAL",
        roleIds: draft.roleIds,
        passwordHistory: [],
      };
      setUsers([...users, newUser]);
      setSelectedId(newUser.id);
    } else {
      const newUser: User = {
        id: `u-inv-${Math.random().toString(36).slice(2, 7)}`,
        loginName: "",
        displayName: "",
        email: "",
        country: "",
        status: "PENDING",
        lastLoginAt: null,
        passwordChangedTimestamp: 0,
        passwordErrorTimes: 0,
        passwordChangeTimes: 0,
        passwordErrorLockExpiredTimestamp: null,
        passwordUpdatedAt: null,
        remark: draft.remark,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorizingType: "NORMAL",
        roleIds: draft.roleIds,
        passwordHistory: [],
        invitedAt: new Date().toISOString(),
        invitedBy: "admin",
        inviteExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        inviteToken: `inv-${Math.random().toString(36).slice(2, 10)}`,
        inviteEmail: draft.email,
      };
      setUsers([...users, newUser]);
      setSelectedId(newUser.id);
    }
    setShowNew(false);
  }

  function toggleLock(user: User) {
    const next: User = user.status === "LOCKED"
      ? { ...user, status: "ACTIVE", passwordErrorTimes: 0, passwordErrorLockExpiredTimestamp: null }
      : { ...user, status: "LOCKED", passwordErrorLockExpiredTimestamp: Date.now() + 30 * 60_000 };
    update(next);
  }

  function resetPassword(user: User) {
    update({
      ...user,
      passwordChangedTimestamp: Date.now(),
      passwordChangeTimes: user.passwordChangeTimes + 1,
      passwordUpdatedAt: new Date().toISOString(),
      passwordErrorTimes: 0,
      passwordHistory: [
        { hashId: `ph-${Math.random().toString(36).slice(2, 6)}`, changedAt: new Date().toISOString() },
        ...user.passwordHistory,
      ],
    });
  }

  function cancelInvite(userId: string) {
    setUsers(users.filter((u) => u.id !== userId));
    if (selectedId === userId) setSelectedId(null);
  }

  function resendInvite(user: User) {
    update({
      ...user,
      invitedAt: new Date().toISOString(),
      inviteExpiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    });
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-content-primary">Users</h1>
          <p className="text-sm text-content-secondary mt-1">
            Manage platform staff accounts and their role assignments.
          </p>
        </div>

        <div className="flex gap-0 border border-line-default rounded-lg overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>
          {/* Sidebar */}
          <div className="w-[320px] shrink-0 border-r border-line-default flex flex-col bg-surface-1">
            <div className="p-3 space-y-2 border-b border-line-subtle">
              <Input
                prefix={<Search size={14} />}
                placeholder="Search users…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                inputSize="sm"
              />
              <div className="flex gap-1">
                {([
                  ["all", `All (${stats.total})`],
                  ["active", `Active (${stats.active})`],
                  ["locked", `Locked (${stats.locked})`],
                  ["pending", `Pending (${stats.pending})`],
                ] as const).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={statusFilter === key ? "secondary" : "ghost"}
                    size="xs"
                    onClick={() => setStatusFilter(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <Button variant="primary" size="sm" block onClick={() => setShowNew(true)} iconLeft={<Plus size={14} />}>
                New user
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {filtered.map((u) => (
                <UserListItem
                  key={u.id}
                  user={u}
                  active={u.id === selectedId}
                  onClick={() => setSelectedId(u.id)}
                />
              ))}
            </div>
          </div>

          {/* Detail */}
          <div className="flex-1 overflow-y-auto bg-surface-1">
            {selected ? (
              selected.status === "PENDING" ? (
                <PendingInviteDetail
                  user={selected}
                  roles={roles}
                  onResend={() => resendInvite(selected)}
                  onCancel={() => cancelInvite(selected.id)}
                />
              ) : (
                <UserDetail
                  user={selected}
                  allUsers={users}
                  roles={roles}
                  onSave={update}
                  onResetPassword={() => resetPassword(selected)}
                  onToggleLock={() => toggleLock(selected)}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full text-content-tertiary text-sm">
                Select a user to view details
              </div>
            )}
          </div>
        </div>
      </div>

      <NewUserModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={createUser}
        users={users}
        roles={roles}
      />
    </>
  );
}
```

- [ ] **Step 3: Create temporary stubs for missing components**

Create `packages/system/src/users/user-detail.tsx`:

```tsx
"use client";
import type { Role, User } from "../types";
type Props = { user: User; allUsers: User[]; roles: Role[]; onSave: (u: User) => void; onResetPassword: () => void; onToggleLock: () => void };
export function UserDetail({ user }: Props) {
  return <div className="p-6 text-sm text-content-secondary">User: {user.displayName || user.loginName}</div>;
}
```

Create `packages/system/src/users/pending-invite-detail.tsx`:

```tsx
"use client";
import type { Role, User } from "../types";
type Props = { user: User; roles: Role[]; onResend: () => void; onCancel: () => void };
export function PendingInviteDetail({ user }: Props) {
  return <div className="p-6 text-sm text-content-secondary">Pending invite: {user.inviteEmail}</div>;
}
```

Create `packages/system/src/users/new-user-modal.tsx`:

```tsx
"use client";
import type { Role, User } from "../types";
type Props = { open: boolean; onClose: () => void; onCreate: (draft: { email: string; roleIds: string[]; remark: string; mode: "direct" | "invite"; loginName?: string; displayName?: string; tempPassword?: string }) => void; users: User[]; roles: Role[] };
export function NewUserModal({ open }: Props) {
  if (!open) return null;
  return <div />;
}
```

- [ ] **Step 4: Verify compilation**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/system/src/users/
git commit -m "feat(system): add users page layout with list item"
```

---

### Task 8: User Detail

**Files:**
- Replace: `packages/system/src/users/user-detail.tsx` (overwrite stub)
- Create: `packages/system/src/users/edit-user-modal.tsx`
- Create: `packages/system/src/users/reset-password-modal.tsx`
- Create: `packages/system/src/users/change-role-modal.tsx`

- [ ] **Step 1: Create edit-user-modal.tsx**

Create `packages/system/src/users/edit-user-modal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button, Field, Input, Textarea, Modal } from "@cloud/ui";
import type { User } from "../types";

type EditUserModalProps = {
  open: boolean;
  onClose: () => void;
  user: User;
  onSave: (u: User) => void;
};

export function EditUserModal({ open, onClose, user, onSave }: EditUserModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [country, setCountry] = useState(user.country);
  const [remark, setRemark] = useState(user.remark);

  // Reset when user changes
  const [prevId, setPrevId] = useState(user.id);
  if (user.id !== prevId) {
    setPrevId(user.id);
    setDisplayName(user.displayName);
    setEmail(user.email);
    setCountry(user.country);
    setRemark(user.remark);
  }

  function handleSave() {
    onSave({ ...user, displayName, email, country, remark });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit user"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Display name">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Country">
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. US, CN, DE" />
        </Field>
        <Field label="Remark">
          <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} />
        </Field>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Create reset-password-modal.tsx**

Create `packages/system/src/users/reset-password-modal.tsx`:

```tsx
"use client";

import { Button, Modal } from "@cloud/ui";
import type { User } from "../types";
import { PASSWORD_POLICY } from "../mock/password-policy";
import { relTime } from "../helpers";

type ResetPasswordModalProps = {
  open: boolean;
  onClose: () => void;
  user: User;
  onConfirm: () => void;
};

export function ResetPasswordModal({ open, onClose, user, onConfirm }: ResetPasswordModalProps) {
  const pwAge = user.passwordChangedTimestamp
    ? Math.floor((Date.now() - user.passwordChangedTimestamp) / 86_400_000)
    : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reset password"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={() => { onConfirm(); onClose(); }}>
            Reset password
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-content-secondary">
        <p>
          Reset the password for <strong>{user.displayName || user.loginName}</strong>?
          This will generate a new temporary password the user must change on next login.
        </p>
        {pwAge !== null && (
          <p className="text-xs text-content-tertiary">
            Current password age: {pwAge} days (policy: {PASSWORD_POLICY.expiryDays} days max).
            Last changed: {user.passwordUpdatedAt ? relTime(user.passwordUpdatedAt) : "never"}.
          </p>
        )}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Create change-role-modal.tsx**

Create `packages/system/src/users/change-role-modal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button, Modal, Checkbox } from "@cloud/ui";
import type { Role, User } from "../types";

type ChangeRoleModalProps = {
  open: boolean;
  onClose: () => void;
  user: User;
  roles: Role[];
  onSave: (u: User) => void;
};

export function ChangeRoleModal({ open, onClose, user, roles, onSave }: ChangeRoleModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(user.roleIds));

  // Reset when user changes
  const [prevId, setPrevId] = useState(user.id);
  if (user.id !== prevId) {
    setPrevId(user.id);
    setSelected(new Set(user.roleIds));
  }

  function toggle(roleId: string) {
    const next = new Set(selected);
    next.has(roleId) ? next.delete(roleId) : next.add(roleId);
    setSelected(next);
  }

  function handleSave() {
    onSave({ ...user, roleIds: [...selected] });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change role"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={selected.size === 0} onClick={handleSave}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <p className="text-sm text-content-secondary mb-3">
          Select roles for <strong>{user.displayName || user.loginName}</strong>:
        </p>
        {roles.map((r) => (
          <label key={r.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-hover cursor-pointer">
            <Checkbox
              checked={selected.has(r.id)}
              onCheckedChange={() => toggle(r.id)}
            />
            <div>
              <div className="text-sm font-medium text-content-primary">{r.name}</div>
              <div className="text-xs text-content-tertiary">{r.permissions.length} permissions</div>
            </div>
          </label>
        ))}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Replace user-detail.tsx with full implementation**

Replace `packages/system/src/users/user-detail.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Pencil, Lock, Unlock, KeyRound, UserCog, AlertTriangle } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Collapsible, CollapsibleTrigger, CollapsibleContent } from "@cloud/ui";
import type { Role, User } from "../types";
import { relTime, fmtDate, fmtDateTime } from "../helpers";
import { PASSWORD_POLICY } from "../mock/password-policy";
import { EditUserModal } from "./edit-user-modal";
import { ResetPasswordModal } from "./reset-password-modal";
import { ChangeRoleModal } from "./change-role-modal";

type UserDetailProps = {
  user: User;
  allUsers: User[];
  roles: Role[];
  onSave: (u: User) => void;
  onResetPassword: () => void;
  onToggleLock: () => void;
};

const STATUS_TONE = { ACTIVE: "success", LOCKED: "error", PENDING: "warning" } as const;

export function UserDetail({ user, allUsers, roles, onSave, onResetPassword, onToggleLock }: UserDetailProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [showRole, setShowRole] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const pwAgeDays = user.passwordChangedTimestamp
    ? Math.floor((Date.now() - user.passwordChangedTimestamp) / 86_400_000)
    : null;
  const pwExpired = pwAgeDays !== null && pwAgeDays >= PASSWORD_POLICY.expiryDays;
  const userRoles = roles.filter((r) => user.roleIds.includes(r.id));
  const isLocked = user.status === "LOCKED";

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-content-primary">{user.displayName || user.loginName}</h2>
            <Badge tone={STATUS_TONE[user.status]}>{user.status}</Badge>
          </div>
          <div className="text-sm text-content-tertiary mt-0.5">@{user.loginName}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" iconLeft={<Pencil size={14} />} onClick={() => setShowEdit(true)}>
            Edit
          </Button>
          <Button
            variant={isLocked ? "ghost" : "ghost-danger"}
            size="sm"
            iconLeft={isLocked ? <Unlock size={14} /> : <Lock size={14} />}
            onClick={onToggleLock}
          >
            {isLocked ? "Unlock" : "Lock"}
          </Button>
        </div>
      </div>

      {/* Locked banner */}
      {isLocked && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-error-bg text-sm text-error">
          <AlertTriangle size={14} />
          <span>
            Account locked — {user.passwordErrorTimes}/{PASSWORD_POLICY.maxErrorTimes} failed attempts.
            {user.passwordErrorLockExpiredTimestamp && (
              <> Auto-unlock at {fmtDateTime(new Date(user.passwordErrorLockExpiredTimestamp).toISOString())}.</>
            )}
          </span>
        </div>
      )}

      {/* Account info */}
      <Card>
        <CardHeader><CardTitle>Account Information</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-content-tertiary">Login name</dt><dd className="text-content-primary font-medium">{user.loginName}</dd></div>
            <div><dt className="text-content-tertiary">Email</dt><dd className="text-content-primary">{user.email || "—"}</dd></div>
            <div><dt className="text-content-tertiary">Country</dt><dd className="text-content-primary">{user.country || "—"}</dd></div>
            <div><dt className="text-content-tertiary">Auth type</dt><dd className="text-content-primary">{user.authorizingType}</dd></div>
            <div><dt className="text-content-tertiary">Created</dt><dd className="text-content-primary">{fmtDate(user.createdAt)}</dd></div>
            <div><dt className="text-content-tertiary">Remark</dt><dd className="text-content-primary">{user.remark || "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {/* Password & security */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Password & Security</CardTitle>
            <Button variant="ghost" size="sm" iconLeft={<KeyRound size={14} />} onClick={() => setShowReset(true)}>
              Reset password
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-content-tertiary">Password age</dt>
              <dd className={pwExpired ? "text-error font-medium" : "text-content-primary"}>
                {pwAgeDays !== null ? `${pwAgeDays} days` : "—"}
                {pwExpired && " (EXPIRED)"}
              </dd>
            </div>
            <div>
              <dt className="text-content-tertiary">Last changed</dt>
              <dd className="text-content-primary">{user.passwordUpdatedAt ? relTime(user.passwordUpdatedAt) : "—"}</dd>
            </div>
            <div>
              <dt className="text-content-tertiary">Failed attempts</dt>
              <dd className={user.passwordErrorTimes > 0 ? "text-warning font-medium" : "text-content-primary"}>
                {user.passwordErrorTimes} / {PASSWORD_POLICY.maxErrorTimes}
              </dd>
            </div>
            <div>
              <dt className="text-content-tertiary">Password changes</dt>
              <dd className="text-content-primary">{user.passwordChangeTimes}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Roles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Roles</CardTitle>
            <Button variant="ghost" size="sm" iconLeft={<UserCog size={14} />} onClick={() => setShowRole(true)}>
              Change role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {userRoles.map((r) => (
              <Badge key={r.id} variant="secondary">{r.name}</Badge>
            ))}
            {userRoles.length === 0 && <span className="text-sm text-content-tertiary">No roles assigned</span>}
          </div>
        </CardContent>
      </Card>

      {/* Password history */}
      {user.passwordHistory.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger asChild>
                <button type="button" className="flex items-center justify-between w-full">
                  <CardTitle>Password History ({user.passwordHistory.length})</CardTitle>
                  <span className="text-xs text-content-tertiary">{historyOpen ? "Hide" : "Show"}</span>
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-1.5">
                  {user.passwordHistory.map((h) => (
                    <div key={h.hashId} className="flex items-center justify-between text-sm">
                      <code className="text-xs font-mono text-content-tertiary">{h.hashId}</code>
                      <span className="text-content-tertiary">{relTime(h.changedAt)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Modals */}
      <EditUserModal open={showEdit} onClose={() => setShowEdit(false)} user={user} onSave={onSave} />
      <ResetPasswordModal open={showReset} onClose={() => setShowReset(false)} user={user} onConfirm={onResetPassword} />
      <ChangeRoleModal open={showRole} onClose={() => setShowRole(false)} user={user} roles={roles} onSave={onSave} />
    </div>
  );
}
```

- [ ] **Step 5: Verify compilation**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/system/src/users/
git commit -m "feat(system): add user detail with edit, reset, change-role modals"
```

---

### Task 9: Pending Invite Detail + New User Modal

**Files:**
- Replace: `packages/system/src/users/pending-invite-detail.tsx` (overwrite stub)
- Replace: `packages/system/src/users/new-user-modal.tsx` (overwrite stub)

- [ ] **Step 1: Replace pending-invite-detail.tsx**

Replace `packages/system/src/users/pending-invite-detail.tsx`:

```tsx
"use client";

import { Mail, RefreshCw, X } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import type { Role, User } from "../types";
import { fmtDateTime, relTime } from "../helpers";

type PendingInviteDetailProps = {
  user: User;
  roles: Role[];
  onResend: () => void;
  onCancel: () => void;
};

export function PendingInviteDetail({ user, roles, onResend, onCancel }: PendingInviteDetailProps) {
  const userRoles = roles.filter((r) => user.roleIds.includes(r.id));
  const isExpired = user.inviteExpiresAt ? new Date(user.inviteExpiresAt).getTime() < Date.now() : false;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-warning-bg flex items-center justify-center">
            <Mail size={20} className="text-warning" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-content-primary">Pending Invitation</h2>
              <Badge tone={isExpired ? "error" : "warning"}>
                {isExpired ? "EXPIRED" : "PENDING"}
              </Badge>
            </div>
            <div className="text-sm text-content-tertiary mt-0.5">{user.inviteEmail}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" iconLeft={<RefreshCw size={14} />} onClick={onResend}>
            Resend
          </Button>
          <Button variant="ghost-danger" size="sm" iconLeft={<X size={14} />} onClick={onCancel}>
            Revoke
          </Button>
        </div>
      </div>

      {/* Invite details */}
      <Card>
        <CardHeader><CardTitle>Invitation Details</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div><dt className="text-content-tertiary">Email</dt><dd className="text-content-primary">{user.inviteEmail}</dd></div>
            <div><dt className="text-content-tertiary">Invited by</dt><dd className="text-content-primary">{user.invitedBy}</dd></div>
            <div><dt className="text-content-tertiary">Invited at</dt><dd className="text-content-primary">{user.invitedAt ? fmtDateTime(user.invitedAt) : "—"}</dd></div>
            <div>
              <dt className="text-content-tertiary">Expires</dt>
              <dd className={isExpired ? "text-error font-medium" : "text-content-primary"}>
                {user.inviteExpiresAt ? relTime(user.inviteExpiresAt) : "—"}
              </dd>
            </div>
            <div><dt className="text-content-tertiary">Remark</dt><dd className="text-content-primary">{user.remark || "—"}</dd></div>
          </dl>
        </CardContent>
      </Card>

      {/* Pre-assigned roles */}
      <Card>
        <CardHeader><CardTitle>Pre-assigned Roles</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {userRoles.map((r) => (
              <Badge key={r.id} variant="secondary">{r.name}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Replace new-user-modal.tsx with dual-tab implementation**

Replace `packages/system/src/users/new-user-modal.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Button, Field, Input, Textarea, Modal, Checkbox, Tabs, TabsList, TabsTrigger, TabsContent } from "@cloud/ui";
import { toast } from "sonner";
import type { Role, User } from "../types";

type CreateDraft = {
  email: string;
  roleIds: string[];
  remark: string;
  mode: "direct" | "invite";
  loginName?: string;
  displayName?: string;
  tempPassword?: string;
};

type NewUserModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: CreateDraft) => void;
  users: User[];
  roles: Role[];
};

export function NewUserModal({ open, onClose, onCreate, users, roles }: NewUserModalProps) {
  const [tab, setTab] = useState<"direct" | "invite">("direct");

  // Direct tab state
  const [loginName, setLoginName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [directEmail, setDirectEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [directRoleIds, setDirectRoleIds] = useState<Set<string>>(new Set());
  const [directRemark, setDirectRemark] = useState("");

  // Invite tab state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoleIds, setInviteRoleIds] = useState<Set<string>>(new Set());
  const [inviteRemark, setInviteRemark] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const directValid = loginName.trim().length >= 2 && tempPassword.length >= 8 && directRoleIds.size > 0;

  const inviteEmailOk = emailRegex.test(inviteEmail);
  const inviteEmailTaken = useMemo(
    () => users.some((u) => u.email.toLowerCase() === inviteEmail.toLowerCase() || (u.inviteEmail ?? "").toLowerCase() === inviteEmail.toLowerCase()),
    [users, inviteEmail],
  );
  const inviteValid = inviteEmailOk && !inviteEmailTaken && inviteRoleIds.size > 0;

  function reset() {
    setLoginName(""); setDisplayName(""); setDirectEmail(""); setTempPassword("");
    setDirectRoleIds(new Set()); setDirectRemark("");
    setInviteEmail(""); setInviteRoleIds(new Set()); setInviteRemark("");
  }

  function handleCreate() {
    if (tab === "direct") {
      onCreate({
        mode: "direct",
        loginName: loginName.trim(),
        displayName: displayName.trim(),
        email: directEmail.trim(),
        tempPassword,
        roleIds: [...directRoleIds],
        remark: directRemark.trim(),
      });
    } else {
      toast.info("Email service not configured — invitation created locally.");
      onCreate({
        mode: "invite",
        email: inviteEmail.trim(),
        roleIds: [...inviteRoleIds],
        remark: inviteRemark.trim(),
      });
    }
    reset();
  }

  function toggleRole(set: Set<string>, setFn: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setFn(next);
  }

  const isValid = tab === "direct" ? directValid : inviteValid;

  return (
    <Modal
      open={open}
      onClose={() => { onClose(); reset(); }}
      title="New user"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => { onClose(); reset(); }}>Cancel</Button>
          <Button variant="primary" disabled={!isValid} onClick={handleCreate}>
            {tab === "direct" ? "Create" : "Send Invite"}
          </Button>
        </div>
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as "direct" | "invite")}>
        <TabsList variant="line">
          <TabsTrigger value="direct">Direct</TabsTrigger>
          <TabsTrigger value="invite">Email Invite</TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="space-y-4 pt-4">
          <Field label="Username" required>
            <Input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="e.g. john.d" autoFocus />
          </Field>
          <Field label="Display name">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. John Doe" />
          </Field>
          <Field label="Email">
            <Input type="email" value={directEmail} onChange={(e) => setDirectEmail(e.target.value)} />
          </Field>
          <Field label="Temporary password" required hint="Min 8 characters. User must change on first login.">
            <Input type="password" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} />
          </Field>
          <Field label="Roles" required>
            <div className="space-y-1.5">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={directRoleIds.has(r.id)} onCheckedChange={() => toggleRole(directRoleIds, setDirectRoleIds, r.id)} />
                  <span className="text-sm">{r.name}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Remark">
            <Textarea value={directRemark} onChange={(e) => setDirectRemark(e.target.value)} rows={2} />
          </Field>
        </TabsContent>

        <TabsContent value="invite" className="space-y-4 pt-4">
          <Field
            label="Email"
            required
            error={inviteEmail && !inviteEmailOk ? "Invalid email format" : inviteEmailTaken ? "This email is already in use" : undefined}
          >
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@company.com"
              invalid={!!inviteEmail && (!inviteEmailOk || inviteEmailTaken)}
              autoFocus
            />
          </Field>
          <Field label="Roles" required>
            <div className="space-y-1.5">
              {roles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={inviteRoleIds.has(r.id)} onCheckedChange={() => toggleRole(inviteRoleIds, setInviteRoleIds, r.id)} />
                  <span className="text-sm">{r.name}</span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Remark">
            <Textarea value={inviteRemark} onChange={(e) => setInviteRemark(e.target.value)} rows={2} />
          </Field>
        </TabsContent>
      </Tabs>
    </Modal>
  );
}
```

- [ ] **Step 3: Update index.ts exports**

Update `packages/system/src/index.ts`:

```typescript
export type { Role, User, PermissionEntry, MenuNode, PasswordPolicy } from "./types";
export { RolesPage } from "./roles/roles-page";
export { UsersPage } from "./users/users-page";
```

- [ ] **Step 4: Verify compilation**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add packages/system/src/users/ packages/system/src/index.ts
git commit -m "feat(system): add pending invite detail and new user modal with dual tabs"
```

---

### Task 10: DB Seed Update (Menus + Permissions + Bindings)

**Files:**
- Modify: `packages/db/prisma/seed.ts`

- [ ] **Step 1: Add System menus and permissions to seed**

In `packages/db/prisma/seed.ts`, add the following after the existing dashboard permission (step 6, line ~96) and before the admin role creation (step 7, line ~98):

```typescript
  // 6b. System parent menu (no path, just a group header)
  const systemMenu = await prisma.sysMenu.upsert({
    where: { menuId: 2 },
    update: {
      menuTitle: "System",
      icon: "settings",
      sort: 100,
      contractDefineCode: "ADMIN",
    },
    create: {
      menuTitle: "System",
      path: null,
      icon: "settings",
      sort: 100,
      contractDefineCode: "ADMIN",
    },
  });

  // 6c. System → Roles menu
  const rolesMenu = await prisma.sysMenu.upsert({
    where: { menuId: 3 },
    update: {
      menuTitle: "Roles",
      path: "/system/roles",
      icon: "shield",
      sort: 101,
      parentMenuId: systemMenu.menuId,
      contractDefineCode: "ADMIN",
    },
    create: {
      menuTitle: "Roles",
      path: "/system/roles",
      icon: "shield",
      sort: 101,
      parentMenuId: systemMenu.menuId,
      contractDefineCode: "ADMIN",
    },
  });

  // 6d. System → Users menu
  const usersMenu = await prisma.sysMenu.upsert({
    where: { menuId: 4 },
    update: {
      menuTitle: "Users",
      path: "/system/users",
      icon: "users",
      sort: 102,
      parentMenuId: systemMenu.menuId,
      contractDefineCode: "ADMIN",
    },
    create: {
      menuTitle: "Users",
      path: "/system/users",
      icon: "users",
      sort: 102,
      parentMenuId: systemMenu.menuId,
      contractDefineCode: "ADMIN",
    },
  });

  // 6e. Permissions for Roles menu
  const rolesPermissions = [
    { permissionCode: "roles.VIEW", remark: "View role list and details" },
    { permissionCode: "roles.ADD", remark: "Create new role" },
    { permissionCode: "roles.UPD", remark: "Edit role name, description, permissions" },
    { permissionCode: "roles.DELETE", remark: "Delete non-builtin role" },
    { permissionCode: "roles.DUPLICATE", remark: "Copy an existing role" },
  ];
  for (const p of rolesPermissions) {
    await prisma.sysPermission.upsert({
      where: { permissionCode: p.permissionCode },
      update: { permissionMenuId: rolesMenu.menuId, remark: p.remark },
      create: { permissionCode: p.permissionCode, permissionMenuId: rolesMenu.menuId, remark: p.remark },
    });
  }

  // 6f. Permissions for Users menu
  const usersPermissions = [
    { permissionCode: "users.VIEW", remark: "View user list and details" },
    { permissionCode: "users.ADD", remark: "Create user (direct mode)" },
    { permissionCode: "users.INVITE", remark: "Invite user (email mode, placeholder)" },
    { permissionCode: "users.UPD", remark: "Edit user display name, email, remark" },
    { permissionCode: "users.LOCK", remark: "Lock / unlock user account" },
    { permissionCode: "users.RESETPW", remark: "Force-reset user password" },
    { permissionCode: "users.CHANGE_ROLE", remark: "Change user's assigned role" },
  ];
  for (const p of usersPermissions) {
    await prisma.sysPermission.upsert({
      where: { permissionCode: p.permissionCode },
      update: { permissionMenuId: usersMenu.menuId, remark: p.remark },
      create: { permissionCode: p.permissionCode, permissionMenuId: usersMenu.menuId, remark: p.remark },
    });
  }
```

Then, after the admin role is created (step 8), expand the permission binding to include all 12 new permissions. Replace the existing single binding block (lines 110–117) with:

```typescript
  // 8. Bind all permissions to admin role
  const allPermissionCodes = [
    "dashboard:view",
    "roles.VIEW", "roles.ADD", "roles.UPD", "roles.DELETE", "roles.DUPLICATE",
    "users.VIEW", "users.ADD", "users.INVITE", "users.UPD", "users.LOCK", "users.RESETPW", "users.CHANGE_ROLE",
  ];

  for (const code of allPermissionCodes) {
    const exists = await prisma.sysRolePermission.findFirst({
      where: { roleId: adminRole.roleId, permissionCode: code },
    });
    if (!exists) {
      await prisma.sysRolePermission.create({
        data: { roleId: adminRole.roleId, permissionCode: code },
      });
    }
  }
```

- [ ] **Step 2: Verify seed compiles**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/db/prisma/seed.ts
git commit -m "feat(db): add System menus, 12 permissions, and role bindings to seed"
```

---

### Task 11: Portal Shell Tree Menu Support

**Files:**
- Modify: `apps/web/lib/auth.ts`
- Modify: `apps/web/app/(portal)/layout.tsx`
- Modify: `apps/web/app/(portal)/_components/portal-shell.tsx`

- [ ] **Step 1: Update auth.ts to also fetch parent menus**

In `apps/web/lib/auth.ts`, the current menu query (around line 181–197) only fetches menus that have permissions pointing to them. Parent menus like "System" have no direct permission, so they won't appear. We need to also fetch parent menus of any visible leaf menu.

Replace the menu query section (lines 181–197) with:

```typescript
  // Fetch leaf menus (menus directly linked from permissions)
  const leafMenus: SessionMenu[] = menuIds.length > 0
    ? (await prisma.sysMenu.findMany({
        where: {
          menuId: { in: menuIds },
          contractDefineCode,
          isVisible: true,
        },
        orderBy: { sort: "asc" },
      })).map((m) => ({
        menuId: m.menuId,
        menuTitle: m.menuTitle,
        path: m.path,
        icon: m.icon,
        sort: m.sort,
        parentMenuId: m.parentMenuId,
      }))
    : [];

  // Fetch parent menus (for sidebar tree grouping)
  const parentIds = [...new Set(
    leafMenus
      .map((m) => m.parentMenuId)
      .filter((id): id is number => id !== null),
  )];

  const parentMenus: SessionMenu[] = parentIds.length > 0
    ? (await prisma.sysMenu.findMany({
        where: {
          menuId: { in: parentIds },
          isVisible: true,
        },
        orderBy: { sort: "asc" },
      })).map((m) => ({
        menuId: m.menuId,
        menuTitle: m.menuTitle,
        path: m.path,
        icon: m.icon,
        sort: m.sort,
        parentMenuId: m.parentMenuId,
      }))
    : [];

  // Merge: parents first (by sort), then leaves. Deduplicate by menuId.
  const menuMap = new Map<number, SessionMenu>();
  for (const m of [...parentMenus, ...leafMenus]) {
    if (!menuMap.has(m.menuId)) menuMap.set(m.menuId, m);
  }
  const menus = [...menuMap.values()].sort((a, b) => a.sort - b.sort);
```

- [ ] **Step 2: Update portal-shell.tsx for tree menus**

In `apps/web/app/(portal)/_components/portal-shell.tsx`:

First, update the `PortalShellProps` menus type to include `parentMenuId`:

```typescript
  menus: Array<{
    id: string;
    key: string;
    label: string;
    path: string | null;
    icon: string;
    parentMenuId: string | null;
  }>;
```

Add new icon imports to the existing imports:

```typescript
import { LayoutDashboard, Shield, Users, Settings } from "lucide-react";
```

Update `getMenuIcon` to handle new icons:

```typescript
function getMenuIcon(icon: string) {
  switch (icon) {
    case "shield":
      return <Shield size={14} />;
    case "users":
      return <Users size={14} />;
    case "settings":
      return <Settings size={14} />;
    case "layout-dashboard":
    default:
      return <LayoutDashboard size={14} />;
  }
}
```

Replace the `sections` building logic inside `PortalShell` to build a tree:

```typescript
  // Build sidebar sections from menu tree
  const topLevel = menus.filter((m) => !m.parentMenuId);
  const childrenOf = (parentId: string) => menus.filter((m) => m.parentMenuId === parentId);

  const sections: SidebarSection[] = [];

  // First section: top-level leaf menus (like Workspace)
  const topLeaves = topLevel.filter((m) => m.path && childrenOf(m.id).length === 0);
  if (topLeaves.length > 0) {
    sections.push({
      label: "Workspace",
      items: topLeaves.map((m) => ({
        href: m.path!,
        icon: getMenuIcon(m.icon),
        label: m.label,
      })),
    });
  }

  // Remaining sections: top-level group menus (parent menus with children)
  const topGroups = topLevel.filter((m) => !m.path || childrenOf(m.id).length > 0);
  for (const group of topGroups) {
    const children = childrenOf(group.id);
    if (children.length > 0) {
      sections.push({
        label: group.label,
        items: children.map((c) => ({
          href: c.path ?? "#",
          icon: getMenuIcon(c.icon),
          label: c.label,
        })),
      });
    }
  }
```

Also update `buildBreadcrumbs` to find the current menu label by pathname:

```typescript
function buildBreadcrumbs(pathname: string, menus: PortalShellProps["menus"]): BreadcrumbItemDef[] {
  const current = menus.find((m) => m.path === pathname);
  const label = current?.label ?? "Workspace";

  if (pathname === "/") {
    return [{ label }];
  }

  // Find parent if exists
  const parent = current?.parentMenuId
    ? menus.find((m) => m.id === current.parentMenuId)
    : null;

  if (parent) {
    return [
      { label: "Console", href: "/" },
      { label: parent.label },
      { label },
    ];
  }

  return [{ label: "Console", href: "/" }, { label }];
}
```

And update its usage in the JSX from:

```tsx
header={<AppHeader breadcrumbs={buildBreadcrumbs(pathname, primaryMenu?.label ?? "Workspace")} />}
```

to:

```tsx
header={<AppHeader breadcrumbs={buildBreadcrumbs(pathname, menus)} />}
```

- [ ] **Step 3: Update layout.tsx to pass parentMenuId**

In `apps/web/app/(portal)/layout.tsx`, update the menu mapping to include `parentMenuId`:

```typescript
      menus={session.menus.map((m) => ({
        id: String(m.menuId),
        key: String(m.menuId),
        label: m.menuTitle,
        path: m.path,
        icon: m.icon ?? "layout-dashboard",
        parentMenuId: m.parentMenuId ? String(m.parentMenuId) : null,
      }))}
```

Note: `path` is now `string | null` instead of `string` (parent menus have no path).

- [ ] **Step 4: Verify compilation**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/auth.ts apps/web/app/(portal)/_components/portal-shell.tsx apps/web/app/(portal)/layout.tsx
git commit -m "feat(portal): support tree menus in sidebar with parent-child grouping"
```

---

### Task 12: Page Routes + Integration

**Files:**
- Create: `apps/web/app/(portal)/system/roles/page.tsx`
- Create: `apps/web/app/(portal)/system/users/page.tsx`
- Modify: `apps/web/package.json`
- Modify: `package.json` (root, lint script)

- [ ] **Step 1: Add @cloud/system dependency**

In `apps/web/package.json`, add to `dependencies`:

```json
"@cloud/system": "workspace:*"
```

Run: `pnpm install`

- [ ] **Step 2: Create roles page route**

```bash
mkdir -p apps/web/app/\(portal\)/system/roles
```

Create `apps/web/app/(portal)/system/roles/page.tsx`:

```tsx
"use client";

import { RolesPage } from "@cloud/system";

export default function SystemRolesPage() {
  return <RolesPage />;
}
```

- [ ] **Step 3: Create users page route**

```bash
mkdir -p apps/web/app/\(portal\)/system/users
```

Create `apps/web/app/(portal)/system/users/page.tsx`:

```tsx
"use client";

import { UsersPage } from "@cloud/system";

export default function SystemUsersPage() {
  return <UsersPage />;
}
```

- [ ] **Step 4: Update root lint script**

In `package.json` (root), add `packages/system/src` to the lint script. Change:

```
"lint": "eslint apps/web packages/config/src packages/db packages/permissions packages/request/src packages/security packages/ui/src scripts/prisma.mjs eslint.config.mjs vitest.config.mts",
```

to:

```
"lint": "eslint apps/web packages/config/src packages/db packages/permissions packages/request/src packages/security packages/system/src packages/ui/src scripts/prisma.mjs eslint.config.mjs vitest.config.mts",
```

- [ ] **Step 5: Run all verifications**

```bash
pnpm install
pnpm exec tsc --noEmit
pnpm test
pnpm lint
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/\(portal\)/system/ apps/web/package.json package.json pnpm-lock.yaml
git commit -m "feat: add System Roles and Users page routes"
```

---

### Task 13: Final Verification + Cleanup

- [ ] **Step 1: Run full baseline verification**

```bash
pnpm db:generate
pnpm exec tsc --noEmit
pnpm test
pnpm lint
```

Expected: all pass.

- [ ] **Step 2: Build test (if DB is configured)**

```bash
pnpm --filter web build
```

Expected: build succeeds (or expected env var errors if `.env` not configured — that's acceptable).

- [ ] **Step 3: Review file sizes**

Verify no file exceeds the 400-line limit:

```bash
find packages/system/src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -20
```

If any file exceeds 400 lines, split it.

- [ ] **Step 4: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore: final cleanup for system roles/users module"
```
