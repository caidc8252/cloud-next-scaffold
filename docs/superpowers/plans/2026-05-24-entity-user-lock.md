# Entity-User Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change user locking from user-level (`sys_user.status`) to entity-user-level (`sys_entity_user.status`), add Entity selection page and locked page.

**Architecture:** Session token gains optional `entityId`. Login creates partial session → routes to entity selection or directly in. `requireSession()` distinguishes failure reasons for proper redirects. Lock API targets `sys_entity_user` instead of `sys_user`.

**Tech Stack:** Next.js App Router, Prisma, Server Actions, React Server Components

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/web/lib/auth.ts` | Modify | Add `PartialSession` type, `getPartialSession()`, `upgradeSession()`, `downgradeSession()`. Change `SessionPayload.entityId` to optional. Rewrite `requireSession()` to distinguish failure reasons. |
| `apps/web/app/(public)/login/actions.ts` | Modify | After password success, query all entity-users to decide routing (single ACTIVE → direct, multiple → /select-entity, all locked → /locked). |
| `apps/web/app/(public)/select-entity/page.tsx` | Create | Entity selection page — list entities, allow selecting active ones. |
| `apps/web/app/(public)/select-entity/actions.ts` | Create | Server action for entity selection — validate + upgradeSession + redirect. |
| `apps/web/app/(public)/locked/page.tsx` | Create | Locked explanation page — show locked entities, logout button. |
| `apps/web/app/api/system/users/[userId]/lock/route.ts` | Modify | Toggle `sys_entity_user.status` instead of `sys_user.status`. |
| `apps/web/lib/user-mapper.ts` | Modify | Add `entityUserStatus` to `UserRow`, use it for `User.status` mapping. |
| `apps/web/app/(portal)/system/users/page.tsx` | Modify | Load INACTIVE entity-users too, pass entity-user status. |
| `packages/system/src/types.ts` | Modify | Change `User.status` from `"ACTIVE" | "LOCKED" | "PENDING"` to `"ACTIVE" | "INACTIVE" | "PENDING"`. |
| `packages/system/src/users/users-page.tsx` | Modify | Change filter tabs from LOCKED to INACTIVE, update stats/labels. |
| `packages/system/src/users/user-detail.tsx` | Modify | Update lock/unlock UI to disable/enable semantics, adjust banner. |
| `packages/system/src/users/user-list-item.tsx` | Modify | Replace LOCKED styling with INACTIVE. |

---

### Task 1: Extend Session — PartialSession & upgradeSession

**Files:**
- Modify: `apps/web/lib/auth.ts`

- [ ] **Step 1: Make `entityId` optional in `SessionPayload`**

In `apps/web/lib/auth.ts`, change the `SessionPayload` type:

```typescript
type SessionPayload = {
  userId: number;
  entityId: number | null;
  expiresAt: number;
};
```

- [ ] **Step 2: Add `PartialSession` type**

Add after the `AuthenticatedSession` type:

```typescript
export type PartialSession = {
  id: number;
  username: string;
  displayName: string | null;
};
```

- [ ] **Step 3: Update `createSession` to accept optional `entityId`**

```typescript
export async function createSession(userId: number, entityId: number | null) {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  cookieStore.set(SESSION_COOKIE, encodeSession({ userId, entityId, expiresAt }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}
```

- [ ] **Step 4: Update `getSession` to require `entityId`**

In the `getSession` function, after decoding the token payload, add an early return if `entityId` is null:

```typescript
// After: const payload = decodeSession(token); if (!payload) return null;
// Add:
if (payload.entityId === null) return null;
```

The rest of `getSession` continues unchanged — it already validates entity-user status, entity status, etc.

- [ ] **Step 5: Add `getPartialSession`**

```typescript
export const getPartialSession = cache(async (): Promise<PartialSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = decodeSession(token);
  if (!payload) return null;

  const prisma = await getPrismaClient();
  const user = await prisma.sysUser.findUnique({
    where: { userId: payload.userId },
  });
  if (!user || user.status !== "ACTIVE" || !user.username) return null;

  return {
    id: user.userId,
    username: user.username,
    displayName: user.displayName,
  };
});
```

- [ ] **Step 6: Add `upgradeSession` and `downgradeSession`**

```typescript
export async function upgradeSession(entityId: number) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const payload = decodeSession(token);
  if (!payload) return;

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  cookieStore.set(SESSION_COOKIE, encodeSession({ userId: payload.userId, entityId, expiresAt }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function downgradeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const payload = decodeSession(token);
  if (!payload) return;

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  cookieStore.set(SESSION_COOKIE, encodeSession({ userId: payload.userId, entityId: null, expiresAt }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}
```

- [ ] **Step 7: Rewrite `requireSession`**

```typescript
export async function requireSession() {
  const session = await getSession();
  if (session) return session;

  const partial = await getPartialSession();
  if (!partial) {
    redirect("/api/auth/logout");
  }

  // Token valid but full session failed — check why
  const prisma = await getPrismaClient();
  const entityUsers = await prisma.sysEntityUser.findMany({
    where: { userId: partial.id },
    select: { status: true },
  });

  const hasActive = entityUsers.some((eu) => eu.status === "ACTIVE");
  if (hasActive) {
    redirect("/select-entity");
  }

  await downgradeSession();
  redirect("/locked");
}
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit --project apps/web/tsconfig.json`
Expected: No errors (or only pre-existing ones)

- [ ] **Step 9: Commit**

```bash
git add apps/web/lib/auth.ts
git commit -m "feat(auth): add partial session, upgrade/downgrade session support"
```

---

### Task 2: Update Login Flow

**Files:**
- Modify: `apps/web/app/(public)/login/actions.ts`

- [ ] **Step 1: Rewrite post-password-success logic**

Replace the entity-user lookup and session creation section (lines 70-91) with:

```typescript
  // Login success: reset error count, update last login
  await prisma.sysUser.update({
    where: { userId: user.userId },
    data: {
      passwordErrorTimes: 0,
      passwordErrorLockExpiredTimestamp: null,
      lastLoginAt: new Date(),
    },
  });

  // Check all entity-user relationships
  const entityUsers = await prisma.sysEntityUser.findMany({
    where: { userId: user.userId },
    include: { entity: true },
  });

  const activeEntityUsers = entityUsers.filter(
    (eu) => eu.status === "ACTIVE" && eu.entity.status === "ACTIVE",
  );

  if (activeEntityUsers.length === 1) {
    // Single active entity — go straight in
    await createSession(user.userId, activeEntityUsers[0].entityId);
    redirect("/");
  }

  if (activeEntityUsers.length > 1) {
    // Multiple active entities — choose
    await createSession(user.userId, null);
    redirect("/select-entity");
  }

  // No active entities — locked
  await createSession(user.userId, null);
  redirect("/locked");
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit --project apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(public)/login/actions.ts
git commit -m "feat(login): route to entity selection or locked page after login"
```

---

### Task 3: Create Entity Selection Page

**Files:**
- Create: `apps/web/app/(public)/select-entity/actions.ts`
- Create: `apps/web/app/(public)/select-entity/page.tsx`

- [ ] **Step 1: Create the server action**

Create `apps/web/app/(public)/select-entity/actions.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";
import { getPartialSession, upgradeSession } from "../../../lib/auth";

export async function selectEntityAction(formData: FormData) {
  const partial = await getPartialSession();
  if (!partial) {
    redirect("/login");
  }

  const entityId = Number(formData.get("entityId"));
  if (!Number.isFinite(entityId)) {
    redirect("/select-entity");
  }

  const { prisma } = await import("@cloud/db");

  // Verify entity-user relationship is active
  const entityUser = await prisma.sysEntityUser.findUnique({
    where: { entityId_userId: { entityId, userId: partial.id } },
    include: { entity: true },
  });

  if (!entityUser || entityUser.status !== "ACTIVE" || entityUser.entity.status !== "ACTIVE") {
    redirect("/select-entity");
  }

  // Verify entity has an active contract
  const contract = await prisma.sysEntityContract.findFirst({
    where: { authorizedEntityId: entityId, status: "ACTIVE" },
  });

  if (!contract) {
    redirect("/select-entity");
  }

  await upgradeSession(entityId);
  redirect("/");
}
```

- [ ] **Step 2: Create the page component**

Create `apps/web/app/(public)/select-entity/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import { getPartialSession, getSession } from "../../../lib/auth";
import { selectEntityAction } from "./actions";

type EntityUserRow = {
  entityId: number;
  status: string;
  entity: { entityId: number; entityName: string; status: string };
};

export default async function SelectEntityPage() {
  // Already have a full session — go to portal
  const session = await getSession();
  if (session) redirect("/");

  const partial = await getPartialSession();
  if (!partial) redirect("/login");

  const { prisma } = await import("@cloud/db");
  const entityUsers: EntityUserRow[] = await prisma.sysEntityUser.findMany({
    where: { userId: partial.id },
    include: { entity: { select: { entityId: true, entityName: true, status: true } } },
  });

  const allInactive = entityUsers.every(
    (eu) => eu.status !== "ACTIVE" || eu.entity.status !== "ACTIVE",
  );
  if (allInactive) redirect("/locked");

  return (
    <main className="login-screen">
      <Card className="login-card" style={{ maxWidth: 480 }}>
        <CardHeader className="login-card__body">
          <div className="login-grid">
            <CardTitle>Select organization</CardTitle>
            <p className="login-note">
              Welcome, <strong>{partial.displayName ?? partial.username}</strong>. Choose an organization to continue.
            </p>
          </div>
        </CardHeader>
        <CardContent className="login-card__body">
          <div className="flex flex-col gap-2">
            {entityUsers.map((eu) => {
              const active = eu.status === "ACTIVE" && eu.entity.status === "ACTIVE";
              return (
                <form key={eu.entityId} action={selectEntityAction}>
                  <input type="hidden" name="entityId" value={eu.entityId} />
                  <button
                    type="submit"
                    disabled={!active}
                    className="w-full text-left px-4 py-3 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-hover border-line-default"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-content-primary">
                        {eu.entity.entityName}
                      </span>
                      <Badge variant={active ? "default" : "outline"}>
                        {active ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                  </button>
                </form>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit --project apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(public)/select-entity/
git commit -m "feat: add entity selection page for multi-entity users"
```

---

### Task 4: Create Locked Page

**Files:**
- Create: `apps/web/app/(public)/locked/page.tsx`

- [ ] **Step 1: Create the locked page**

Create `apps/web/app/(public)/locked/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";
import { getPartialSession, getSession } from "../../../lib/auth";

export default async function LockedPage() {
  // Already have a full session — go to portal
  const session = await getSession();
  if (session) redirect("/");

  const partial = await getPartialSession();
  if (!partial) redirect("/login");

  const { prisma } = await import("@cloud/db");
  const entityUsers = await prisma.sysEntityUser.findMany({
    where: { userId: partial.id },
    include: { entity: { select: { entityId: true, entityName: true, status: true } } },
  });

  // If any entity is actually available, redirect to selection
  const hasActive = entityUsers.some(
    (eu) => eu.status === "ACTIVE" && eu.entity.status === "ACTIVE",
  );
  if (hasActive) redirect("/select-entity");

  const lockedEntityNames = entityUsers.map((eu) => eu.entity.entityName);

  return (
    <main className="login-screen">
      <Card className="login-card" style={{ maxWidth: 480 }}>
        <CardHeader className="login-card__body">
          <div className="login-grid">
            <CardTitle>Access disabled</CardTitle>
            <p className="login-note">
              Hello, <strong>{partial.displayName ?? partial.username}</strong>.
              Your access to the following organizations has been disabled. Please contact your administrator.
            </p>
          </div>
        </CardHeader>
        <CardContent className="login-card__body">
          {lockedEntityNames.length > 0 && (
            <ul className="mb-4 pl-4 text-sm text-content-secondary list-disc space-y-1">
              {lockedEntityNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
          <form action="/api/auth/logout" method="GET">
            <Button type="submit" className="w-full">Sign out</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit --project apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(public)/locked/
git commit -m "feat: add locked page for disabled entity-user access"
```

---

### Task 5: Rewrite Lock API

**Files:**
- Modify: `apps/web/app/api/system/users/[userId]/lock/route.ts`

- [ ] **Step 1: Replace the entire route handler**

```typescript
import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NOT_FOUND } from "@cloud/request/error-codes";
import { getSession } from "../../../../../../lib/auth";
import { toClientUser, USER_INCLUDE } from "../../../../../../lib/user-mapper";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) return badRequestResponse(ERR_INVALID_ID, "Invalid user ID.");

    // Cannot lock yourself
    if (userId === session.id) {
      return badRequestResponse(ERR_INVALID_ID, "Cannot disable your own account.");
    }

    const entityId = session.entity.entityId;
    const link = await prisma.sysEntityUser.findUnique({
      where: { entityId_userId: { entityId, userId } },
    });
    if (!link) return notFoundResponse(ERR_USER_NOT_FOUND, "User not found in this entity.");

    // Toggle entity-user status
    const newStatus = link.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await prisma.sysEntityUser.update({
      where: { entityId_userId: { entityId, userId } },
      data: { status: newStatus, updUserId: session.id },
    });

    const updated = await prisma.sysUser.findUniqueOrThrow({
      where: { userId },
      include: {
        ...USER_INCLUDE,
        entityUsers: { where: { entityId }, select: { authorizingType: true, status: true } },
        userRoles: { where: { entityId }, select: { roleId: true } },
      },
    });

    const nameMap = new Map([[session.id, session.username]]);
    return successResponse(toClientUser(updated, nameMap, nameMap));
  } catch (error) {
    return internalErrorResponse(error);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit --project apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/system/users/[userId]/lock/route.ts
git commit -m "feat(api): lock API now toggles entity-user status instead of user status"
```

---

### Task 6: Update User Mapper

**Files:**
- Modify: `apps/web/lib/user-mapper.ts`

- [ ] **Step 1: Add `status` field to `entityUsers` in `UserRow` type**

Change the `entityUsers` field in `UserRow`:

```typescript
// old
entityUsers: { authorizingType: string }[];
// new
entityUsers: { authorizingType: string; status: string }[];
```

- [ ] **Step 2: Update `toClientUser` to derive status from entity-user**

In the `toClientUser` function, change how `status` is determined:

```typescript
// old
const isPending = row.status === "PENDING";
// ...
status: row.status as User["status"],

// new
const entityUserStatus = row.entityUsers[0]?.status ?? row.status;
const isPending = row.status === "PENDING";
const mappedStatus: User["status"] = isPending ? "PENDING" : (entityUserStatus === "ACTIVE" ? "ACTIVE" : "INACTIVE");
// ...
status: mappedStatus,
```

- [ ] **Step 3: Update `USER_INCLUDE` to include entity-user status**

```typescript
// old
entityUsers: { select: { authorizingType: true } },
// new
entityUsers: { select: { authorizingType: true, status: true } },
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit --project apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/user-mapper.ts
git commit -m "feat(mapper): derive user status from entity-user relationship"
```

---

### Task 7: Update Users Server Page

**Files:**
- Modify: `apps/web/app/(portal)/system/users/page.tsx`

- [ ] **Step 1: Load all entity-users, not just ACTIVE ones**

In the `loadUsers` function, remove the `status: "ACTIVE"` filter so INACTIVE users are also shown:

```typescript
// old
const entityUserLinks = await prisma.sysEntityUser.findMany({
  where: { entityId, status: "ACTIVE" },
  select: { userId: true },
});

// new
const entityUserLinks = await prisma.sysEntityUser.findMany({
  where: { entityId },
  select: { userId: true },
});
```

- [ ] **Step 2: Pass entity-user status in the include clause**

Update the `entityUsers` include to also fetch `status`:

```typescript
// old
entityUsers: { where: { entityId }, select: { authorizingType: true } },

// new
entityUsers: { where: { entityId }, select: { authorizingType: true, status: true } },
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit --project apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(portal)/system/users/page.tsx
git commit -m "feat(users-page): load all entity-users including inactive"
```

---

### Task 8: Update Types & User List UI

**Files:**
- Modify: `packages/system/src/types.ts`
- Modify: `packages/system/src/users/user-list-item.tsx`
- Modify: `packages/system/src/users/users-page.tsx`

- [ ] **Step 1: Update `User.status` type**

In `packages/system/src/types.ts`:

```typescript
// old
status: "ACTIVE" | "LOCKED" | "PENDING";
// new
status: "ACTIVE" | "INACTIVE" | "PENDING";
```

- [ ] **Step 2: Update `StatusFilter` and stats in `users-page.tsx`**

In `packages/system/src/users/users-page.tsx`:

```typescript
// old
type StatusFilter = "all" | "active" | "locked" | "pending";
// new
type StatusFilter = "all" | "active" | "inactive" | "pending";
```

Update the stats:

```typescript
// old
locked: users.filter((u) => u.status === "LOCKED").length,
// new
inactive: users.filter((u) => u.status === "INACTIVE").length,
```

Update the `statItems` array:

```typescript
// old
{ label: "Locked", value: stats.locked, color: stats.locked ? "var(--color-error-700)" : undefined, filterKey: "locked" },
// new
{ label: "Disabled", value: stats.inactive, color: stats.inactive ? "var(--color-error-700)" : undefined, filterKey: "inactive" },
```

Update the `toggleLock` toast message:

```typescript
// old
toast.success(user.status === "LOCKED" ? "User unlocked" : "User locked");
// new
toast.success(user.status === "INACTIVE" ? "User enabled" : "User disabled");
```

- [ ] **Step 3: Update `user-list-item.tsx`**

In `packages/system/src/users/user-list-item.tsx`, replace LOCKED references:

Change `STATUS_STYLE`:

```typescript
// old
LOCKED: { color: "var(--color-error-700)", background: "var(--color-error-50)", borderColor: "oklch(70% 0.16 25 / 0.25)" },
// new
INACTIVE: { color: "var(--color-error-700)", background: "var(--color-error-50)", borderColor: "oklch(70% 0.16 25 / 0.25)" },
```

Update `avatarGradient`:

```typescript
// old
if (status === "LOCKED") return "linear-gradient(135deg, oklch(70% 0.13 25), oklch(58% 0.16 25))";
// new
if (status === "INACTIVE") return "linear-gradient(135deg, oklch(70% 0.13 25), oklch(58% 0.16 25))";
```

Update the `locked` variable and shield icon:

```typescript
// old
const locked = user.status === "LOCKED";
// new
const disabled = user.status === "INACTIVE";
```

And the shield icon usage:

```typescript
// old
{locked && <Shield size={11} className="text-error shrink-0" />}
// new
{disabled && <Shield size={11} className="text-error shrink-0" />}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add packages/system/src/types.ts packages/system/src/users/user-list-item.tsx packages/system/src/users/users-page.tsx
git commit -m "feat(ui): update user status from LOCKED to INACTIVE semantics"
```

---

### Task 9: Update User Detail UI

**Files:**
- Modify: `packages/system/src/users/user-detail.tsx`

- [ ] **Step 1: Update locked references to disabled**

Replace all `locked` variable references:

```typescript
// old
const locked = user.status === "LOCKED";
// new
const disabled = user.status === "INACTIVE";
```

Update `avatarGradient` call:

```typescript
// old
style={{ width: 56, height: 56, borderRadius: 12, background: avatarGradient(locked), ...
// new
style={{ width: 56, height: 56, borderRadius: 12, background: avatarGradient(disabled), ...
```

Update status badge styling:

```typescript
// old
...(locked
  ? { color: "var(--color-error-700)", ...
  : { color: "var(--color-success-700)", ...
// new
...(disabled
  ? { color: "var(--color-error-700)", ...
  : { color: "var(--color-success-700)", ...
```

- [ ] **Step 2: Update button text and semantics**

```typescript
// old
<Button variant={locked ? "primary" : "ghost"} size="sm" iconLeft={<Shield size={14} />}
  onClick={() => setConfirmLock(true)}>{locked ? "Unlock" : "Lock"}</Button>
// new
<Button variant={disabled ? "primary" : "ghost"} size="sm" iconLeft={<Shield size={14} />}
  onClick={() => setConfirmLock(true)}>{disabled ? "Enable" : "Disable"}</Button>
```

- [ ] **Step 3: Update the locked banner**

Replace the locked banner (lines 100-111):

```tsx
{/* Disabled banner */}
{disabled && (
  <Alert variant="error">
    <AlertTriangle size={14} />
    <AlertDescription>
      <strong>Account disabled</strong> — this user&apos;s access to the current organization has been disabled by an administrator.
    </AlertDescription>
  </Alert>
)}
```

- [ ] **Step 4: Update confirm lock modal**

```tsx
// old
<ConfirmModal open={confirmLock} onClose={() => setConfirmLock(false)}
  title={locked ? "Unlock account?" : "Lock account?"}
  onConfirm={() => { setConfirmLock(false); onToggleLock(); }}
  confirmLabel={locked ? "Unlock" : "Lock account"}
  confirmVariant={locked ? "primary" : "destructive"}>
  <p className="text-sm text-content-secondary">
    {locked
      ? <>Unlock <strong>{user.displayName}</strong> — they will be able to log in immediately. Failed-attempt counter resets.</>
      : <>Locks <strong>{user.displayName}</strong> for {PASSWORD_POLICY.lockDurationMinutes} minutes. Active sessions are revoked.</>}
  </p>
</ConfirmModal>

// new
<ConfirmModal open={confirmLock} onClose={() => setConfirmLock(false)}
  title={disabled ? "Enable account?" : "Disable account?"}
  onConfirm={() => { setConfirmLock(false); onToggleLock(); }}
  confirmLabel={disabled ? "Enable" : "Disable account"}
  confirmVariant={disabled ? "primary" : "destructive"}>
  <p className="text-sm text-content-secondary">
    {disabled
      ? <>Enable <strong>{user.displayName}</strong> — they will be able to access this organization immediately.</>
      : <>Disable <strong>{user.displayName}</strong>&apos;s access to this organization. Their roles and permissions will not be loaded.</>}
  </p>
</ConfirmModal>
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `pnpm exec tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add packages/system/src/users/user-detail.tsx
git commit -m "feat(user-detail): update lock UI to disable/enable semantics"
```

---

### Task 10: Remove unused error code & final cleanup

**Files:**
- Modify: `packages/request/src/error-codes.ts` (remove `ERR_USER_LOCK_INVALID_STATUS` if no longer used)

- [ ] **Step 1: Check if `ERR_USER_LOCK_INVALID_STATUS` is still used anywhere**

Run: `grep -r "ERR_USER_LOCK_INVALID_STATUS" --include="*.ts" --include="*.tsx" -l`

If only used in the lock route (which we rewrote) and the error-codes definition, remove it from the error-codes file.

- [ ] **Step 2: Remove unused import from lock route if needed**

The rewritten lock route in Task 5 no longer imports `ERR_USER_LOCK_INVALID_STATUS`. Verify the import line was already cleaned up.

- [ ] **Step 3: Full verification**

Run the baseline verification commands:

```bash
pnpm db:generate
pnpm exec tsc --noEmit
pnpm lint
pnpm --filter web build
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove unused error code and final cleanup"
```
