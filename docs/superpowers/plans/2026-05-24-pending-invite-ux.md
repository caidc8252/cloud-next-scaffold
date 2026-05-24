# Pending Invite UX Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the PENDING user experience with expired-state visuals, cancel confirmation, token masking, editable roles, and resend count.

**Architecture:** Five independent UI/data enhancements to the existing invite flow. One schema change (`resendCount` on `SysInvite`), one API update, and four frontend component modifications. No new components — all changes are in-place edits.

**Tech Stack:** Prisma, Next.js App Router, React, `@cloud/ui`, `@cloud/request`, Vitest

---

### Task 1: Add `resendCount` to schema, type, and mapper

**Files:**
- Modify: `packages/db/prisma/schema.prisma:353-369`
- Modify: `packages/system/src/types.ts:50-76`
- Modify: `apps/web/lib/user-mapper.ts:23-39,47-79,99-118`

- [ ] **Step 1: Add `resendCount` field to `SysInvite` model**

In `packages/db/prisma/schema.prisma`, add the field after `creUserId`:

```prisma
model SysInvite {
  inviteId    Int       @id @default(autoincrement()) @map("invite_id")
  userId      Int       @map("user_id")
  email       String    @db.VarChar(200)
  token       String    @unique @db.VarChar(100)
  expiresAt   DateTime  @map("expires_at") @db.Timestamp(3)
  consumedAt  DateTime? @map("consumed_at") @db.Timestamp(3)
  status      String    @default("PENDING") @db.VarChar(20)
  creTime     DateTime  @default(now()) @map("cre_time") @db.Timestamp(3)
  creUserId   Int       @default(0) @map("cre_user_id")
  resendCount Int       @default(0) @map("resend_count")
  updTime     DateTime  @default(now()) @updatedAt @map("upd_time") @db.Timestamp(3)

  user SysUser @relation(fields: [userId], references: [userId], onDelete: Cascade)

  @@index([userId])
  @@map("sys_invite")
}
```

- [ ] **Step 2: Add `resendCount` to the `User` type**

In `packages/system/src/types.ts`, add after `inviteEmail`:

```typescript
export type User = {
  // ... existing fields ...
  inviteEmail?: string;
  resendCount?: number;
  passwordResetRequests?: PasswordResetRequest[];
};
```

- [ ] **Step 3: Update `UserRow` type and mapper in `user-mapper.ts`**

In `apps/web/lib/user-mapper.ts`, add `resendCount` to the invite select in `UserRow`:

```typescript
type UserRow = {
  // ... existing fields ...
  invites: {
    email: string;
    token: string;
    expiresAt: Date;
    status: string;
    creTime: Date;
    creUserId: number;
    resendCount: number;
  }[];
  // ... rest ...
};
```

In the `toClientUser` function, add `resendCount` to the invite spread:

```typescript
    ...(latestInvite && isPending ? {
      invitedAt: latestInvite.creTime.toISOString(),
      invitedBy: inviterNameMap.get(latestInvite.creUserId) ?? "system",
      inviteExpiresAt: latestInvite.expiresAt.toISOString(),
      inviteToken: latestInvite.token,
      inviteEmail: latestInvite.email,
      resendCount: latestInvite.resendCount,
    } : {}),
```

In `USER_INCLUDE`, add `resendCount` to the invite select:

```typescript
  invites: {
    where: { status: "PENDING" },
    orderBy: { creTime: "desc" as const },
    take: 1,
    select: { email: true, token: true, expiresAt: true, status: true, creTime: true, creUserId: true, resendCount: true },
  },
```

- [ ] **Step 4: Generate Prisma client**

Run: `pnpm db:generate`
Expected: Clean generation with no errors.

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/system/src/types.ts apps/web/lib/user-mapper.ts
git commit -m "feat(invite): add resendCount to schema, type, and mapper"
```

---

### Task 2: Increment `resendCount` in resend-invite API

**Files:**
- Modify: `apps/web/app/api/system/users/[userId]/resend-invite/route.ts`

- [ ] **Step 1: Update the invite update call to increment `resendCount`**

In `apps/web/app/api/system/users/[userId]/resend-invite/route.ts`, change the `prisma.sysInvite.update` call:

```typescript
  // Extend expiry to 7 days from now and increment resend count
  await prisma.sysInvite.update({
    where: { inviteId: invite.inviteId },
    data: {
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
      creUserId: session.id,
      resendCount: { increment: 1 },
    },
  });
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/system/users/[userId]/resend-invite/route.ts
git commit -m "feat(invite): increment resendCount on resend"
```

---

### Task 3: Expired invite visual state in `UserListItem`

**Files:**
- Modify: `packages/system/src/users/user-list-item.tsx`

- [ ] **Step 1: Add expired detection and update visual rendering**

Replace the full content of `packages/system/src/users/user-list-item.tsx`:

```tsx
"use client";

import { Mail, Shield, RefreshCw, X } from "lucide-react";
import type { User } from "../types";
import { relTime, initials } from "../helpers";

type UserListItemProps = {
  user: User;
  active: boolean;
  onClick: () => void;
  onResend?: () => void;
  onCancel?: () => void;
};

const STATUS_STYLE = {
  ACTIVE: { color: "var(--color-success-700)", background: "var(--color-success-50)", borderColor: "oklch(58% 0.14 152 / 0.25)" },
  LOCKED: { color: "var(--color-error-700)", background: "var(--color-error-50)", borderColor: "oklch(70% 0.16 25 / 0.25)" },
  PENDING: { color: "var(--color-warning-700)", background: "var(--color-warning-50)", borderColor: "oklch(75% 0.13 80 / 0.3)" },
  EXPIRED: { color: "var(--color-error-700)", background: "var(--color-error-50)", borderColor: "oklch(70% 0.16 25 / 0.25)" },
} as const;

function avatarGradient(status: User["status"], expired: boolean): string {
  if (status === "LOCKED") return "linear-gradient(135deg, oklch(70% 0.13 25), oklch(58% 0.16 25))";
  if (status === "PENDING" && expired) return "linear-gradient(135deg, oklch(70% 0.13 25), oklch(58% 0.16 25))";
  if (status === "PENDING") return "linear-gradient(135deg, oklch(78% 0.1 80), oklch(64% 0.14 80))";
  return "linear-gradient(135deg, var(--color-primary-500), var(--color-accent-600))";
}

export function UserListItem({ user, active, onClick, onResend, onCancel }: UserListItemProps) {
  const isPending = user.status === "PENDING";
  const isExpired = isPending && !!user.inviteExpiresAt && new Date(user.inviteExpiresAt).getTime() < Date.now();
  const locked = user.status === "LOCKED";
  const displayName = user.displayName || user.loginName || "?";
  const badgeKey = isExpired ? "EXPIRED" : user.status;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      className="flex items-center gap-3 w-full px-3.5 py-3 text-left transition-colors border-b border-line-subtle last:border-b-0 hover:bg-surface-hover cursor-pointer"
      style={active ? { background: "var(--color-primary-50)" } : undefined}
    >
      <div
        className="shrink-0 grid place-items-center text-white font-semibold text-xs"
        style={{ width: 36, height: 36, borderRadius: 10, background: avatarGradient(user.status, isExpired), letterSpacing: "-0.01em" }}
      >
        {isPending ? <Mail size={14} /> : initials(displayName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-content-primary">
          {isPending
            ? <span className="text-content-tertiary italic font-medium">{isExpired ? "Invitation expired" : "Invitation sent"}</span>
            : <span className="truncate">{displayName}</span>}
          {locked && <Shield size={11} className="text-error shrink-0" />}
        </div>
        <div className="font-mono text-xs text-content-tertiary mt-0.5 truncate">
          {isPending ? user.inviteEmail ?? user.email : `@${user.loginName}`}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs">
          <span
            className="font-mono font-semibold uppercase"
            style={{ fontSize: 9.5, letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 3, border: "1px solid", ...STATUS_STYLE[badgeKey] }}
          >
            {badgeKey}
          </span>
          {!isPending && user.lastLoginAt && <span className="text-content-tertiary">· {relTime(user.lastLoginAt)}</span>}
          {isPending && user.inviteExpiresAt && (
            <span className="text-content-tertiary">
              · {isExpired ? "expired" : "expires"} {relTime(user.inviteExpiresAt)}
            </span>
          )}
        </div>
      </div>
      {isPending && (
        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onResend && (
            <button type="button" className="p-1.5 rounded-md hover:bg-surface-hover text-content-tertiary hover:text-content-primary transition-colors" title="Resend invitation" onClick={onResend}>
              <RefreshCw size={13} />
            </button>
          )}
          {onCancel && (
            <button type="button" className="p-1.5 rounded-md hover:bg-surface-hover text-content-tertiary hover:text-error transition-colors" title="Cancel invitation" onClick={onCancel}>
              <X size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add packages/system/src/users/user-list-item.tsx
git commit -m "feat(invite): show expired visual state in user list item"
```

---

### Task 4: Update `PendingInviteDetail` — expired state, token masking, resend count, role editing

**Files:**
- Modify: `packages/system/src/users/pending-invite-detail.tsx`

- [ ] **Step 1: Rewrite `PendingInviteDetail` with all four enhancements**

Replace the full content of `packages/system/src/users/pending-invite-detail.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Mail, User, Clock, Shield, Copy, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, Button, Card, CardContent, CardHeader, CardTitle, Checkbox } from "@cloud/ui";
import type { Role, User as UserType } from "../types";
import { fmtDateTime, relTime } from "../helpers";

type PendingInviteDetailProps = {
  user: UserType;
  roles: Role[];
  onResend: () => void;
  onCancel: () => void;
  onSave: (u: UserType) => void;
};

function maskToken(token: string): string {
  if (token.length <= 8) return "****";
  return `${token.slice(0, 4)}****${token.slice(-4)}`;
}

export function PendingInviteDetail({ user, roles, onResend, onCancel, onSave }: PendingInviteDetailProps) {
  const inviteToken = user.inviteToken ?? user.id;
  const isExpired = !!user.inviteExpiresAt && new Date(user.inviteExpiresAt).getTime() < Date.now();

  const adminRoles = roles.filter((r) => r.contractDefineCode === "ADMIN" && r.roleType === "global");
  const invitedRoles = (user.roleIds ?? []).map((id) => roles.find((r) => r.id === id)).filter(Boolean) as Role[];

  const [editingRoles, setEditingRoles] = useState(false);
  const [draftRoleIds, setDraftRoleIds] = useState<Set<string>>(new Set(user.roleIds));

  // Reset draft when user changes
  const [prevId, setPrevId] = useState(user.id);
  if (user.id !== prevId) {
    setPrevId(user.id);
    setEditingRoles(false);
    setDraftRoleIds(new Set(user.roleIds));
  }

  function toggleRole(id: string) {
    const next = new Set(draftRoleIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setDraftRoleIds(next);
  }

  function saveRoles() {
    onSave({ ...user, roleIds: [...draftRoleIds] });
    setEditingRoles(false);
  }

  function cancelEditRoles() {
    setDraftRoleIds(new Set(user.roleIds));
    setEditingRoles(false);
  }

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(inviteToken);
      toast.success("Token copied");
    } catch {
      toast.error("Failed to copy token");
    }
  }

  const headerGradient = isExpired
    ? "linear-gradient(135deg, oklch(70% 0.13 25), oklch(58% 0.16 25))"
    : "linear-gradient(135deg, oklch(78% 0.1 80), oklch(64% 0.14 80))";

  const badgeStyle = isExpired
    ? { color: "var(--color-error-700)", background: "var(--color-error-50)", borderColor: "oklch(70% 0.16 25 / 0.25)" }
    : { color: "var(--color-warning-700)", background: "var(--color-warning-50)", borderColor: "oklch(75% 0.13 80 / 0.3)" };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-line-subtle" style={{ padding: "18px 22px" }}>
        <div className="shrink-0 grid place-items-center text-white"
          style={{ width: 56, height: 56, borderRadius: 12, background: headerGradient }}>
          <Mail size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-semibold tracking-tight text-content-primary">
              {isExpired ? "Invitation expired" : "Invitation sent"}
            </span>
            <span className="font-mono font-semibold uppercase shrink-0"
              style={{ fontSize: 9.5, letterSpacing: "0.06em", padding: "1px 5px", borderRadius: 3, border: "1px solid", ...badgeStyle }}>
              {isExpired ? "EXPIRED" : "PENDING"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-content-tertiary mt-1.5">
            <span className="inline-flex items-center gap-1.5"><Mail size={12} /> {user.inviteEmail ?? user.email}</span>
            <span className="inline-flex items-center gap-1.5"><User size={12} /> Invited by {user.invitedBy}</span>
            {user.invitedAt && <span className="inline-flex items-center gap-1.5"><Clock size={12} /> Sent {relTime(user.invitedAt)}</span>}
            {user.inviteExpiresAt && (
              <span className="inline-flex items-center gap-1.5" style={{ color: isExpired ? "var(--color-error-700)" : "var(--color-warning-700)" }}>
                <Clock size={12} /> {isExpired ? "Expired" : "Expires"} {relTime(user.inviteExpiresAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" iconLeft={<Mail size={14} />} onClick={onResend}>Resend</Button>
          <Button variant="ghost-danger" size="sm" iconLeft={<Shield size={14} />} onClick={onCancel}>Cancel invite</Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-4" style={{ padding: "18px 22px 24px" }}>
        {isExpired ? (
          <Alert variant="error">
            <AlertTriangle size={14} />
            <AlertDescription>
              <strong>This invitation has expired.</strong> Resend to generate a new 7-day window, or cancel it.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="info">
            <Shield size={14} />
            <AlertDescription>
              <strong>Waiting on the invitee.</strong> Once they click the link in their email and complete
              onboarding, this row turns into a full user with login name, display name, and password set by them.
              Pre-assigned roles below take effect at that moment.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Invitation details</CardTitle>
              <p className="text-xs text-content-tertiary mt-0.5">These are the only fields the admin sets. Everything else is captured during onboarding.</p>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid text-sm" style={{ gridTemplateColumns: "160px 1fr", rowGap: 14, columnGap: 20 }}>
              <dt className="text-content-tertiary font-medium">Email</dt>
              <dd className="text-content-primary">{user.inviteEmail ?? user.email}</dd>
              <dt className="text-content-tertiary font-medium">Invite token</dt>
              <dd className="text-content-primary flex items-center gap-2">
                <code className="font-mono text-xs px-1.5 py-0.5 bg-surface-3 rounded border border-line-subtle">{maskToken(inviteToken)}</code>
                <button type="button" onClick={copyToken}
                  className="p-1 rounded hover:bg-surface-3 text-content-tertiary hover:text-content-primary transition-colors" title="Copy full token">
                  <Copy size={13} />
                </button>
              </dd>
              <dt className="text-content-tertiary font-medium">Invited by</dt>
              <dd className="text-content-primary">{user.invitedBy}</dd>
              <dt className="text-content-tertiary font-medium">Sent</dt>
              <dd className="text-content-primary">{user.invitedAt ? fmtDateTime(user.invitedAt) : "—"}</dd>
              <dt className="text-content-tertiary font-medium">Resent</dt>
              <dd className="text-content-primary">{user.resendCount ? `${user.resendCount} time${user.resendCount > 1 ? "s" : ""}` : "Never"}</dd>
              <dt className="text-content-tertiary font-medium">Expires</dt>
              <dd className="text-content-primary">{user.inviteExpiresAt ? fmtDateTime(user.inviteExpiresAt) : "—"}</dd>
              {user.remark && <>
                <dt className="text-content-tertiary font-medium">Remark</dt>
                <dd className="text-content-primary">{user.remark}</dd>
              </>}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div>
                <CardTitle>Pre-assigned roles ({editingRoles ? draftRoleIds.size : invitedRoles.length})</CardTitle>
                <p className="text-xs text-content-tertiary mt-0.5">The invitee will see these on the authorization step and gain them once they accept.</p>
              </div>
              {!editingRoles && (
                <Button variant="ghost" size="sm" iconLeft={<Pencil size={13} />}
                  onClick={() => { setDraftRoleIds(new Set(user.roleIds)); setEditingRoles(true); }}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <div>
            {editingRoles ? (
              <>
                <div className="flex flex-col gap-1.5 px-5 py-3">
                  {adminRoles.map((r) => {
                    const on = draftRoleIds.has(r.id);
                    return (
                      <label key={r.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors"
                        style={{
                          background: on ? "var(--color-primary-50)" : "var(--color-surface-3)",
                          borderColor: on ? "oklch(60% 0.14 262 / 0.3)" : "var(--color-line-subtle)",
                        }}>
                        <Checkbox checked={on} onCheckedChange={() => toggleRole(r.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold">{r.name}</div>
                          <div className="text-xs text-content-tertiary">{r.description} · {r.permissions.length} perms</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="flex gap-2 justify-end px-5 py-3 border-t border-line-subtle">
                  <Button variant="ghost" size="sm" onClick={cancelEditRoles}>Cancel</Button>
                  <Button variant="primary" size="sm" disabled={draftRoleIds.size === 0} onClick={saveRoles}>Save</Button>
                </div>
              </>
            ) : (
              <>
                {invitedRoles.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-content-tertiary">No roles pre-assigned.</div>
                )}
                {invitedRoles.map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5 px-5 py-3 border-b border-line-subtle last:border-b-0">
                    <div className="grid place-items-center shrink-0 bg-surface-3 text-content-secondary" style={{ width: 28, height: 28, borderRadius: 8 }}>
                      <Shield size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-content-primary">{r.name}</div>
                      <div className="text-xs text-content-tertiary mt-0.5">{r.description} · {r.permissions.length} perms</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors. Note: `onSave` is a new prop — Task 5 wires it up. If type-checking in isolation, expect an error at the call site in `users-page.tsx`. That's resolved in Task 5.

- [ ] **Step 3: Commit**

```bash
git add packages/system/src/users/pending-invite-detail.tsx
git commit -m "feat(invite): add expired state, token masking, resend count, role editing to detail panel"
```

---

### Task 5: Cancel confirmation modal and wire `onSave` in `UsersPage`

**Files:**
- Modify: `packages/system/src/users/users-page.tsx`

- [ ] **Step 1: Add cancel confirmation state and pass `onSave` to `PendingInviteDetail`**

Replace the full content of `packages/system/src/users/users-page.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Modal, SplitPanel, SplitPanelSidebar, SplitPanelContent } from "@cloud/ui";
import { request } from "@cloud/request/client";
import type { Role, User } from "../types";
import { UserListItem } from "./user-list-item";
import { UserDetail } from "./user-detail";
import { PendingInviteDetail } from "./pending-invite-detail";
import { NewUserModal } from "./new-user-modal";

const API = "/api/system/users";

type UsersPageProps = { initialUsers: User[]; initialRoles: Role[] };
type StatusFilter = "all" | "active" | "locked" | "pending";

export function UsersPage({ initialUsers, initialRoles }: UsersPageProps) {
  const [users, setUsers] = useState(initialUsers);
  const roles = initialRoles;

  const [selectedId, setSelectedId] = useState<string | null>(initialUsers[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showNew, setShowNew] = useState(false);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

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
      list = list.filter((u) =>
        u.loginName.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) || (u.inviteEmail ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [users, statusFilter, query]);

  const selected = users.find((u) => u.id === selectedId) ?? null;
  const cancelTarget = confirmCancelId ? users.find((u) => u.id === confirmCancelId) : null;

  async function update(next: User) {
    try {
      const res = await request.put<User>(`${API}/${next.id}`, {
        displayName: next.displayName,
        remark: next.remark,
        roleIds: next.roleIds,
      });
      setUsers((prev) => prev.map((u) => (u.id === next.id ? res.data : u)));
      toast.success("User saved");
    } catch {
      toast.error("Failed to save user");
    }
  }

  async function createUser(draft: { email: string; roleIds: string[]; remark: string }) {
    try {
      const res = await request.post<User>(API, draft);
      setUsers((prev) => [res.data, ...prev]);
      setSelectedId(res.data.id);
      setShowNew(false);
      toast.success("Invitation sent");
    } catch {
      toast.error("Failed to create invitation");
    }
  }

  async function toggleLock(user: User) {
    try {
      const res = await request.post<User>(`${API}/${user.id}/lock`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      toast.success(user.status === "LOCKED" ? "User unlocked" : "User locked");
    } catch {
      toast.error("Failed to toggle lock");
    }
  }

  async function resetPassword(user: User) {
    try {
      const res = await request.post<User>(`${API}/${user.id}/reset-password`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      toast.success("Password reset link sent");
    } catch {
      toast.error("Failed to reset password");
    }
  }

  async function cancelInvite(userId: string) {
    try {
      await request.post(`${API}/${userId}/cancel-invite`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      if (selectedId === userId) setSelectedId(null);
      toast.success("Invitation cancelled");
    } catch {
      toast.error("Failed to cancel invitation");
    }
  }

  async function resendInvite(user: User) {
    try {
      const res = await request.post<User>(`${API}/${user.id}/resend-invite`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      toast.success("Invitation resent");
    } catch {
      toast.error("Failed to resend invitation");
    }
  }

  function requestCancel(userId: string) {
    setConfirmCancelId(userId);
  }

  function confirmCancelInvite() {
    if (confirmCancelId) {
      cancelInvite(confirmCancelId);
      setConfirmCancelId(null);
    }
  }

  const statItems = [
    { label: "Total", value: stats.total, color: undefined },
    { label: "Active", value: stats.active, color: "var(--color-success-700)" },
    { label: "Pending", value: stats.pending, color: stats.pending ? "var(--color-warning-700)" : undefined },
    { label: "Locked", value: stats.locked, color: stats.locked ? "var(--color-error-700)" : undefined },
  ];

  return (
    <>
      <div>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-content-primary mb-1">Users</h1>
            <p className="text-sm text-content-secondary">
              Carbon platform staff accounts. Roles are picked from <strong>System → Roles</strong>.
            </p>
          </div>
          <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setShowNew(true)}>
            New user
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-3.5 mb-5">
          {statItems.map((s) => (
            <div key={s.label} className="bg-surface-2 border border-line-default rounded-xl shadow-sm px-4 py-4">
              <div className="text-xs text-content-tertiary">{s.label}</div>
              <div className="text-2xl font-semibold mt-1 tabular-nums" style={s.color ? { color: s.color } : undefined}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <SplitPanel sidebarWidth={360}>
          <SplitPanelSidebar header={
            <div className="flex flex-col gap-2 p-2.5">
              <Input prefix={<Search size={13} />} placeholder="Search by name, login or email…" value={query}
                onChange={(e) => setQuery(e.target.value)} inputSize="sm" />
              <div className="flex gap-1 flex-wrap">
                {([
                  { key: "all" as const, label: "All", count: stats.total },
                  { key: "active" as const, label: "Active", count: stats.active },
                  { key: "pending" as const, label: "Pending", count: stats.pending },
                  { key: "locked" as const, label: "Locked", count: stats.locked },
                ] as const).map((f) => (
                  <button key={f.key} type="button"
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${statusFilter === f.key ? "bg-surface-3 text-content-primary" : "text-content-tertiary hover:text-content-secondary"}`}
                    onClick={() => setStatusFilter(f.key)}>
                    {f.label}<span className="text-content-tertiary">{f.count}</span>
                  </button>
                ))}
              </div>
            </div>
          }>
            {filtered.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-content-tertiary">
                {query ? `No users match "${query}"` : "No users in this filter."}
              </div>
            )}
            {filtered.map((u) => (
              <UserListItem key={u.id} user={u} active={u.id === selectedId}
                onClick={() => setSelectedId(u.id)}
                onResend={() => resendInvite(u)}
                onCancel={() => requestCancel(u.id)} />
            ))}
          </SplitPanelSidebar>
          <SplitPanelContent empty="Select a user.">
            {selected ? (
              selected.status === "PENDING" ? (
                <PendingInviteDetail user={selected} roles={roles}
                  onResend={() => resendInvite(selected)} onCancel={() => requestCancel(selected.id)} onSave={update} />
              ) : (
                <UserDetail user={selected} users={users} roles={roles} onSave={update}
                  onResetPassword={() => resetPassword(selected)} onToggleLock={() => toggleLock(selected)} />
              )
            ) : null}
          </SplitPanelContent>
        </SplitPanel>
      </div>
      <NewUserModal open={showNew} onClose={() => setShowNew(false)} onCreate={createUser} users={users} roles={roles} />

      {/* Cancel invite confirmation */}
      <Modal open={!!confirmCancelId} onClose={() => setConfirmCancelId(null)} title="Cancel invitation?"
        footer={<div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setConfirmCancelId(null)}>Keep invitation</Button>
          <Button variant="destructive" onClick={confirmCancelInvite}>Cancel invitation</Button>
        </div>}>
        <p className="text-sm text-content-secondary">
          This will permanently remove the pending invitation for{" "}
          <strong>{cancelTarget?.inviteEmail ?? cancelTarget?.email}</strong>.
          Pre-assigned roles will be discarded.
        </p>
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: Type-check and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: No errors.

- [ ] **Step 3: Run existing tests**

Run: `pnpm test`
Expected: All tests pass (existing `helpers.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add packages/system/src/users/users-page.tsx
git commit -m "feat(invite): add cancel confirmation modal and wire onSave for pending invites"
```

---

### Task 6: Final verification

- [ ] **Step 1: Full type-check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: No errors.

- [ ] **Step 3: Tests**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 4: Build**

Run: `pnpm --filter web build`
Expected: Build succeeds.
