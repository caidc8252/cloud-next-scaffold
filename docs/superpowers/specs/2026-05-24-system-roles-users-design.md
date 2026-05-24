# System Roles & Users Module Design

**Goal:** Import the SYSTEM → Roles and SYSTEM → Users pages from the Carbon DEMO into the local monorepo as a reusable `packages/system` package, with mock data, local UI component mapping, and proper menu/permission seed integration.

**Source:** Carbon Admin Portal DEMO (`admin-roles.jsx`, `admin-users.jsx`, `settings.jsx`, `data.jsx`)

---

## 1. Package Structure

New package: `packages/system`

```
packages/system/
  src/
    roles/
      roles-page.tsx              # Main page component (banner + RolesPanel)
      roles-panel.tsx             # Left-right split: role list + role editor
      role-list-item.tsx          # Sidebar row
      role-editor.tsx             # Right pane (name, description, permissions, assigned users)
      permissions-card.tsx        # Permission groups with toggle switches, search, filter
      new-role-modal.tsx          # Create role modal (name, description, base role)
    users/
      users-page.tsx              # Main page component (left-right split)
      user-detail.tsx             # Right pane: info cards, password status, roles, history
      pending-invite-detail.tsx   # Detail card for PENDING invite users
      user-list-item.tsx          # Left sidebar row
      new-user-modal.tsx          # Create user modal (Direct tab default + Email Invite tab)
      edit-user-modal.tsx         # Edit user info modal
      reset-password-modal.tsx    # Reset password modal
      change-role-modal.tsx       # Change user role modal
    mock/
      seed-roles.ts              # 4 ADMIN-contract roles
      seed-users.ts              # 6 users (1 pending invite)
      password-policy.ts         # Password policy config
      menu-tree.ts               # ADMIN menus (System > Roles, System > Users)
      permission-catalog.ts      # 12 permission codes for these 2 menus
    index.ts                     # Exports: RolesPage, UsersPage
  package.json
  tsconfig.json
```

## 2. Component Mapping (DEMO → Local)

| DEMO Component | Local Equivalent (`@cloud/ui` or `lucide-react`) |
|---------------|--------------------------------------------------|
| `Btn` | `Button` from `@cloud/ui` |
| `Input` | `Input` from `@cloud/ui` |
| `Input` with prefix | `InputGroup` from `@cloud/ui` (wraps Input with icon prefix) |
| `Field` | `Field` from `@cloud/ui` |
| `Textarea` | `Textarea` from `@cloud/ui` |
| `Select` | `Select` from `@cloud/ui` |
| `Modal` | `Modal` from `@cloud/ui` |
| `Badge` | `Badge` from `@cloud/ui` |
| `Toggle` | `Switch` from `@cloud/ui` |
| `Icon` (inline SVG) | Named imports from `lucide-react` |
| Toast (`useToast`) | `toast` from `sonner` (already configured) |
| Left-right split layouts | CSS Modules per page (`roles-layout.module.css`, `users-layout.module.css`) |

## 3. Menu Structure (sys_menu seed)

| menu_id | parent_menu_id | menu_title | path | contract_define_code | sort | is_visible |
|---------|---------------|------------|------|---------------------|------|-----------|
| (auto) | null | System | null | ADMIN | 100 | true |
| (auto) | → System | Roles | /system/roles | ADMIN | 101 | true |
| (auto) | → System | Users | /system/users | ADMIN | 102 | true |

The existing "Workspace" menu (menu_id=1, sort=1) stays. The System group sorts after it.

## 4. Permission Design

Format: `{menu_key}.{ACTION_NAME}`

### Roles menu permissions

| permission_code | permission_menu | remark |
|----------------|-----------------|--------|
| `roles.VIEW` | Roles | View role list and details |
| `roles.ADD` | Roles | Create new role |
| `roles.UPD` | Roles | Edit role name, description, permissions |
| `roles.DELETE` | Roles | Delete non-builtin role |
| `roles.DUPLICATE` | Roles | Copy an existing role |

### Users menu permissions

| permission_code | permission_menu | remark |
|----------------|-----------------|--------|
| `users.VIEW` | Users | View user list and details |
| `users.ADD` | Users | Create user (direct mode) |
| `users.INVITE` | Users | Invite user (email mode, placeholder) |
| `users.UPD` | Users | Edit user display name, email, remark |
| `users.LOCK` | Users | Lock / unlock user account |
| `users.RESETPW` | Users | Force-reset user password |
| `users.CHANGE_ROLE` | Users | Change user's assigned role |

All 12 permissions are bound to the Administrator role in seed.

## 5. Mock Data (initial state)

### seed-roles.ts — 4 ADMIN-contract global roles

| id | name | builtin | permissions |
|----|------|---------|-------------|
| r-admin-platform | Platform Administrator | yes | all 12 |
| r-admin-ops | Operations Admin | no | users.*, roles.VIEW |
| r-admin-compliance | Compliance Officer | no | users.VIEW, roles.VIEW |
| r-admin-viewer | Platform Viewer | yes | users.VIEW, roles.VIEW |

### seed-users.ts — 6 users

| loginName | displayName | status | role |
|-----------|-------------|--------|------|
| admin | System Admin | ACTIVE | Platform Administrator |
| jordan.d | Jordan Diaz | ACTIVE | Operations Admin |
| priya.k | Priya Krishnan | ACTIVE | Compliance Officer |
| marcus.r | Marcus Reilly | LOCKED | Operations Admin |
| lena.h | Lena Hartmann | ACTIVE | Platform Viewer |
| (pending) | (pending) | PENDING | Operations Admin |

Each user includes: passwordErrorTimes, passwordChangedTimestamp, passwordHistory[], lastLoginAt, authorizingType, roleIds, remark, country.

### password-policy.ts

```typescript
{
  minLength: 12,
  requireUpper: true,
  requireLower: true,
  requireDigit: true,
  requireSymbol: true,
  maxErrorTimes: 5,
  lockDurationMinutes: 30,
  historySize: 5,
  expiryDays: 90,
}
```

### menu-tree.ts — ADMIN menus only

2 leaf menus: Platform Users, Platform Roles (matching the permission groups above).

### permission-catalog.ts — 12 entries

Scoped to the 2 ADMIN menus. Each entry: `{ code, menuId, label, desc }`.

## 6. Page Routes

```
apps/web/app/(portal)/system/
  roles/page.tsx    ← thin wrapper: import { RolesPage } from "@cloud/system"
  users/page.tsx    ← thin wrapper: import { UsersPage } from "@cloud/system"
```

Both pages are `"use client"` (state-heavy interactive UIs).

## 7. Roles Page — Feature Spec

### Layout
- Page header: title "Roles", subtitle describing scope
- Purple notice banner: "Internal scope — these roles are not visible to customer operators"
- Below: RolesPanel (left-right split)

### RolesPanel
- **Left sidebar** (280px):
  - Search input with icon prefix
  - "New role" primary button
  - Scrollable role list (RoleListItem)
- **Right pane**:
  - RoleEditor (selected role)
  - Or empty state "Select a role to edit"

### RoleListItem
- Shield icon + role name + optional SYSTEM badge
- Meta line: "{N} permissions"

### RoleEditor
- Editable title (inline input)
- Meta: operator count, last updated, updated by, SYSTEM tag
- Action buttons: Duplicate, Delete (disabled for builtin), Save (disabled when clean)
- Description card with textarea
- PermissionsCard
- Assigned Users card (list of users with this role)

### PermissionsCard
- Header: granted count / total in scope
- Toolbar: search input + filter segment (All / Granted / Available)
- Expand/Collapse all toggle
- Groups by menu, each with:
  - Collapsible header: menu name, granted/total bar, "Grant all" / "Revoke all"
  - Permission rows: Switch toggle + name + code badge + description

### NewRoleModal
- Fields: name (required), description, "Start from" select (copy perms from existing)
- Contract is fixed to ADMIN (hidden field)

## 8. Users Page — Feature Spec

### Layout
- Page header: title "Users", subtitle
- Below: left-right split

### Left Sidebar (320px)
- Search input
- Status filter buttons: All / Active / Locked (with counts)
- "New user" primary button
- Scrollable user list (UserListItem)

### UserListItem
- Avatar (initials, color-hashed)
- Name + login name
- Status badge (ACTIVE green, LOCKED red, PENDING amber)
- Last login relative time
- Selected state highlight

### UserDetail (right pane)
- **Header**: avatar, display name, login name, status badge, action buttons (Edit, Lock/Unlock)
- **Account info card**: email, country, remark, created at, authorizing type
- **Password & security card**:
  - Last changed date + expiry warning if > 90 days
  - Error attempts count (with warning if > 0)
  - Lock expiry timestamp (if locked)
  - "Reset password" button
- **Roles card**: current role badges, "Change role" button
- **Password history card**: table of past password changes

### PendingInviteDetail
- Shows: invited email, invited by, invite expires at, assigned role
- Action buttons: Resend invite, Revoke invite

### NewUserModal — Dual Entry
- **Tab bar**: "Direct" (default) | "Email Invite"
- **Direct tab**: username, display name, email, temporary password, role select, remark
- **Email Invite tab**: email, role select, remark → on submit shows toast "Email service not configured"

### EditUserModal
- Fields: display name, email, country, remark

### ResetPasswordModal
- Shows current password status
- New password input (with policy hint)
- Confirm button

### ChangeRoleModal
- Shows current role(s)
- Role select dropdown (from available ADMIN roles)
- Confirm button

## 9. Seed Update

The existing `packages/db/prisma/seed.ts` needs to be extended:

1. Create parent menu "System" (no path, contractDefineCode=ADMIN)
2. Create child menus "Roles" and "Users" under System
3. Create 12 permission records
4. Bind all 12 permissions to the Administrator role (roleId=1)
5. Update existing dashboard:view permission to keep working

## 10. Portal Shell Update

`apps/web/app/(portal)/_components/portal-shell.tsx` needs to:
1. Support tree menus (parent → children) — currently flat
2. Add icon mapping for new icons: `shield` → `Shield`, `users` → `Users`, `settings` → `Settings`

## 11. Data Flow (Current Phase)

All page components accept optional props for data injection:
```typescript
type RolesPageProps = {
  roles?: Role[];
  setRoles?: (roles: Role[]) => void;
  users?: User[];  // for "assigned users" display
};

type UsersPageProps = {
  users?: User[];
  setUsers?: (users: User[]) => void;
  roles?: Role[];  // for role assignment
};
```

When props are not provided, components fall back to internal `useState` initialized from mock data. This enables both standalone usage (current phase) and future API integration.
