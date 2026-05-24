# Error Code System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every API error carries a 6-digit error code + per-request trace ID, logged server-side and displayed in frontend toasts with a copy button.

**Architecture:** Extend `@cloud/request` shared types and server/client helpers. Server generates traceId + logs on every error response. Client `toastError()` replaces all manual `toast.error()` calls. Error codes are centralized constants.

**Tech Stack:** `@cloud/request`, sonner, Next.js route handlers

---

### Task 1: Extend `ErrorBody` type

**Files:**
- Modify: `packages/request/src/index.ts`

- [ ] **Step 1: Update the `ErrorBody` type**

Replace the full content of `packages/request/src/index.ts`:

```typescript
export type Pager = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SuccessBody<T> = {
  data: T;
  pager?: Pager;
};

export type ErrorBody = {
  message: string;
  code: string;
  traceId: string;
};
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: Errors in `server.ts` because `errorResponse` no longer satisfies `ErrorBody` — this is expected and fixed in Task 2.

- [ ] **Step 3: Commit**

```bash
git add packages/request/src/index.ts
git commit -m "feat(request): extend ErrorBody with code and traceId fields"
```

---

### Task 2: Create error code constants

**Files:**
- Create: `packages/request/src/error-codes.ts`

- [ ] **Step 1: Create the error codes file**

Create `packages/request/src/error-codes.ts`:

```typescript
// Platform 1, Module 00 = Common
export const ERR_BAD_REQUEST = "100001";
export const ERR_UNAUTHORIZED = "100002";
export const ERR_FORBIDDEN = "100003";
export const ERR_NOT_FOUND = "100004";
export const ERR_INTERNAL = "100005";
export const ERR_INVALID_JSON = "100006";
export const ERR_INVALID_ID = "100007";

// Platform 1, Module 01 = Users
export const ERR_USER_EMAIL_INVALID = "101001";
export const ERR_USER_EMAIL_TAKEN = "101002";
export const ERR_USER_NOT_FOUND = "101003";
export const ERR_USER_LOCK_INVALID_STATUS = "101004";
export const ERR_USER_RESET_PW_PENDING = "101005";
export const ERR_USER_NO_PENDING_INVITE = "101006";
export const ERR_USER_CANCEL_NOT_PENDING = "101007";
export const ERR_USER_ROLE_NAME_SHORT = "101008";

// Platform 1, Module 02 = Roles
export const ERR_ROLE_NOT_FOUND = "102001";
export const ERR_ROLE_NAME_SHORT = "102002";
export const ERR_ROLE_DELETE_BUILTIN = "102003";
export const ERR_ROLE_DELETE_ASSIGNED = "102004";
```

- [ ] **Step 2: Export from package**

Add the export to `packages/request/package.json` exports field:

The file currently has exports for `.`, `./server`, `./client`. Add `./error-codes`:

```json
{
  "name": "@cloud/request",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./client": "./src/client.ts",
    "./error-codes": "./src/error-codes.ts"
  },
  "dependencies": {
    "client-only": "^0.0.1",
    "server-only": "^0.0.1"
  },
  "peerDependencies": {
    "next": "^16.0.0"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/request/src/error-codes.ts packages/request/package.json
git commit -m "feat(request): add centralized error code constants"
```

---

### Task 3: Rewrite server error response helpers

**Files:**
- Modify: `packages/request/src/server.ts`

- [ ] **Step 1: Rewrite `server.ts` with traceId generation and logging**

Replace the full content of `packages/request/src/server.ts`:

```typescript
import "server-only";

import { randomBytes } from "node:crypto";
import type { ErrorBody, Pager, SuccessBody } from "./index.ts";
import {
  ERR_BAD_REQUEST,
  ERR_UNAUTHORIZED,
  ERR_FORBIDDEN,
  ERR_NOT_FOUND,
  ERR_INTERNAL,
} from "./error-codes.ts";

export type { ErrorBody, Pager, SuccessBody } from "./index.ts";
export {
  ERR_BAD_REQUEST,
  ERR_UNAUTHORIZED,
  ERR_FORBIDDEN,
  ERR_NOT_FOUND,
  ERR_INTERNAL,
} from "./error-codes.ts";

function generateTraceId(status: number): string {
  const prefix = status >= 500 ? "SYS" : "BIZ";
  const hex = randomBytes(3).toString("hex");
  return `${prefix}-${hex}`;
}

export function successResponse<T>(data: T, pager?: Pager): Response {
  const body: SuccessBody<T> = pager ? { data, pager } : { data };
  return Response.json(body);
}

export function createdResponse<T>(data: T): Response {
  return Response.json({ data } satisfies SuccessBody<T>, { status: 201 });
}

export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

export function errorResponse(code: string, message: string, status = 400): Response {
  const traceId = generateTraceId(status);
  console.error(`[${traceId}] [${code}] ${message}`);
  return Response.json({ message, code, traceId } satisfies ErrorBody, { status });
}

export function badRequestResponse(code = ERR_BAD_REQUEST, message = "Bad request."): Response {
  return errorResponse(code, message, 400);
}

export function unauthorizedResponse(code = ERR_UNAUTHORIZED, message = "Unauthorized."): Response {
  return errorResponse(code, message, 401);
}

export function forbiddenResponse(code = ERR_FORBIDDEN, message = "Forbidden."): Response {
  return errorResponse(code, message, 403);
}

export function notFoundResponse(code = ERR_NOT_FOUND, message = "Not found."): Response {
  return errorResponse(code, message, 404);
}

export function internalErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Internal server error.";
  const traceId = generateTraceId(500);
  console.error(`[${traceId}] [${ERR_INTERNAL}]`, error);
  return Response.json(
    { message: "Internal server error.", code: ERR_INTERNAL, traceId } satisfies ErrorBody,
    { status: 500 },
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: Errors in API routes because call sites still use old signatures — fixed in Tasks 5-6.

- [ ] **Step 3: Commit**

```bash
git add packages/request/src/server.ts
git commit -m "feat(request): server error helpers with code, traceId, and logging"
```

---

### Task 4: Create client-side `toastError` helper

**Files:**
- Create: `packages/request/src/error-toast.ts`

- [ ] **Step 1: Create the error toast helper**

Create `packages/request/src/error-toast.ts`:

```typescript
"use client";
import "client-only";

import { toast } from "sonner";
import { RequestError } from "./client.ts";

function copyErrorInfo(info: { message: string; code: string; traceId: string }) {
  navigator.clipboard.writeText(JSON.stringify(info, null, 2));
}

export function toastError(err: unknown, fallbackMessage = "An unexpected error occurred.") {
  if (err instanceof RequestError && err.body?.code) {
    const { message, code, traceId } = err.body;
    toast.error(message, {
      description: `[${code}] ${traceId}`,
      duration: 10_000,
      action: {
        label: "Copy",
        onClick: () => copyErrorInfo({ message, code, traceId }),
      },
    });
  } else {
    toast.error(fallbackMessage, { duration: 5_000 });
  }
}
```

- [ ] **Step 2: Add export to `package.json`**

In `packages/request/package.json`, add the `./error-toast` export:

```json
{
  "name": "@cloud/request",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./server": "./src/server.ts",
    "./client": "./src/client.ts",
    "./error-codes": "./src/error-codes.ts",
    "./error-toast": "./src/error-toast.ts"
  },
  "dependencies": {
    "client-only": "^0.0.1",
    "server-only": "^0.0.1"
  },
  "peerDependencies": {
    "next": "^16.0.0"
  }
}
```

- [ ] **Step 3: Add `sonner` as peer dependency**

`sonner` is already installed in the workspace (used by `@cloud/ui`). Add it as a peer dependency of `@cloud/request` so the import resolves:

In `packages/request/package.json`, update `peerDependencies`:

```json
  "peerDependencies": {
    "next": "^16.0.0",
    "sonner": "^2.0.0"
  }
```

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: May have errors in API routes (old signatures) — those are fixed next.

- [ ] **Step 5: Commit**

```bash
git add packages/request/src/error-toast.ts packages/request/package.json
git commit -m "feat(request): add toastError client helper with copy button"
```

---

### Task 5: Migrate roles API routes to error codes

**Files:**
- Modify: `apps/web/app/api/system/roles/route.ts`
- Modify: `apps/web/app/api/system/roles/[roleId]/route.ts`

- [ ] **Step 1: Update `roles/route.ts`**

Replace the full content of `apps/web/app/api/system/roles/route.ts`:

```typescript
import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  createdResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_JSON, ERR_ROLE_NAME_SHORT } from "@cloud/request/error-codes";
import { getSession } from "../../../../lib/auth";
import { toClientRole } from "../../../../lib/role-mapper";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
    const roles = await prisma.sysRole.findMany({
      where: { OR: [{ entityId: session.entity.entityId }, { entityId: null }] },
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

    const data = roles.map((r) =>
      toClientRole(r, updaterMap.get(r.updUserId) ?? "system"),
    );

    return successResponse(data);
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
    let body: { name?: string; description?: string; permissions?: string[] };
    try {
      body = await req.json();
    } catch {
      return badRequestResponse(ERR_INVALID_JSON, "Invalid JSON body.");
    }

    const name = body.name?.trim();
    if (!name || name.length < 2) {
      return badRequestResponse(ERR_ROLE_NAME_SHORT, "Role name must be at least 2 characters.");
    }

    const role = await prisma.sysRole.create({
      data: {
        roleName: name,
        roleType: "GLOBAL",
        contractDefineCode: "ADMIN",
        entityId: session.entity.entityId,
        remark: body.description?.trim() || null,
        creUserId: session.id,
        updUserId: session.id,
        permissions: body.permissions?.length
          ? {
              createMany: {
                data: body.permissions.map((code) => ({
                  permissionCode: code,
                  creUserId: session.id,
                })),
              },
            }
          : undefined,
      },
      include: {
        permissions: { select: { permissionCode: true } },
        _count: { select: { userRoles: true } },
      },
    });

    return createdResponse(toClientRole(role, session.username));
  } catch (error) {
    return internalErrorResponse(error);
  }
}
```

- [ ] **Step 2: Update `roles/[roleId]/route.ts`**

Replace the full content of `apps/web/app/api/system/roles/[roleId]/route.ts`:

```typescript
import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  noContentResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import {
  ERR_INVALID_ID,
  ERR_INVALID_JSON,
  ERR_ROLE_NOT_FOUND,
  ERR_ROLE_DELETE_BUILTIN,
  ERR_ROLE_DELETE_ASSIGNED,
} from "@cloud/request/error-codes";
import { getSession } from "../../../../../lib/auth";
import { toClientRole } from "../../../../../lib/role-mapper";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ roleId: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
    const { roleId: rawId } = await params;
    const roleId = Number(rawId);
    if (!Number.isFinite(roleId)) return badRequestResponse(ERR_INVALID_ID, "Invalid role ID.");

    const existing = await prisma.sysRole.findUnique({ where: { roleId } });
    if (!existing || (existing.entityId !== null && existing.entityId !== session.entity.entityId)) {
      return notFoundResponse(ERR_ROLE_NOT_FOUND, "Role not found.");
    }

    let body: { name?: string; description?: string; permissions?: string[] };
    try {
      body = await req.json();
    } catch {
      return badRequestResponse(ERR_INVALID_JSON, "Invalid JSON body.");
    }

    const isBuiltin = existing.roleType === "BUILTIN";

    const dataUpdate: Record<string, unknown> = { updUserId: session.id };
    if (!isBuiltin) {
      if (body.name !== undefined) dataUpdate.roleName = body.name.trim();
      if (body.description !== undefined) dataUpdate.remark = body.description.trim() || null;
    }

    await prisma.$transaction(async (tx) => {
      await tx.sysRole.update({ where: { roleId }, data: dataUpdate });

      if (body.permissions !== undefined) {
        await tx.sysRolePermission.deleteMany({ where: { roleId } });
        if (body.permissions.length > 0) {
          await tx.sysRolePermission.createMany({
            data: body.permissions.map((code) => ({
              roleId,
              permissionCode: code,
              creUserId: session.id,
            })),
          });
        }
      }
    });

    const updated = await prisma.sysRole.findUniqueOrThrow({
      where: { roleId },
      include: {
        permissions: { select: { permissionCode: true } },
        _count: { select: { userRoles: true } },
      },
    });

    return successResponse(toClientRole(updated, session.username));
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ roleId: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
    const { roleId: rawId } = await params;
    const roleId = Number(rawId);
    if (!Number.isFinite(roleId)) return badRequestResponse(ERR_INVALID_ID, "Invalid role ID.");

    const existing = await prisma.sysRole.findUnique({ where: { roleId } });
    if (!existing || (existing.entityId !== null && existing.entityId !== session.entity.entityId)) {
      return notFoundResponse(ERR_ROLE_NOT_FOUND, "Role not found.");
    }

    if (existing.roleType === "BUILTIN") {
      return badRequestResponse(ERR_ROLE_DELETE_BUILTIN, "Cannot delete a builtin role.");
    }

    const assignedCount = await prisma.sysUserRole.count({ where: { roleId } });
    if (assignedCount > 0) {
      return badRequestResponse(ERR_ROLE_DELETE_ASSIGNED, `Cannot delete role with ${assignedCount} assigned user(s). Reassign them first.`);
    }

    await prisma.sysRole.delete({ where: { roleId } });

    return noContentResponse();
  } catch (error) {
    return internalErrorResponse(error);
  }
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: Errors only in user API routes (fixed in Task 6).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/system/roles/route.ts apps/web/app/api/system/roles/\[roleId\]/route.ts
git commit -m "feat(roles): add error codes and try/catch to roles API routes"
```

---

### Task 6: Migrate users API routes to error codes

**Files:**
- Modify: `apps/web/app/api/system/users/route.ts`
- Modify: `apps/web/app/api/system/users/[userId]/route.ts`
- Modify: `apps/web/app/api/system/users/[userId]/lock/route.ts`
- Modify: `apps/web/app/api/system/users/[userId]/reset-password/route.ts`
- Modify: `apps/web/app/api/system/users/[userId]/resend-invite/route.ts`
- Modify: `apps/web/app/api/system/users/[userId]/cancel-invite/route.ts`

- [ ] **Step 1: Update `users/route.ts`**

Replace the full content of `apps/web/app/api/system/users/route.ts`:

```typescript
import { randomBytes } from "node:crypto";
import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  createdResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import {
  ERR_INVALID_JSON,
  ERR_USER_EMAIL_INVALID,
  ERR_USER_EMAIL_TAKEN,
} from "@cloud/request/error-codes";
import { getSession } from "../../../../lib/auth";
import { toClientUser, USER_INCLUDE, collectAuxUserIds } from "../../../../lib/user-mapper";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
    const entityId = session.entity.entityId;

    const entityUserLinks = await prisma.sysEntityUser.findMany({
      where: { entityId, status: "ACTIVE" },
      select: { userId: true },
    });
    const userIds = entityUserLinks.map((eu) => eu.userId);
    if (userIds.length === 0) return successResponse([]);

    const rows = await prisma.sysUser.findMany({
      where: { userId: { in: userIds } },
      include: {
        ...USER_INCLUDE,
        entityUsers: { where: { entityId }, select: { authorizingType: true } },
        userRoles: { where: { entityId }, select: { roleId: true } },
      },
      orderBy: { creTime: "asc" },
    });

    const auxIds = collectAuxUserIds(rows);
    const auxUsers = auxIds.length > 0
      ? await prisma.sysUser.findMany({ where: { userId: { in: auxIds } }, select: { userId: true, username: true } })
      : [];
    const nameMap = new Map(auxUsers.map((u) => [u.userId, u.username ?? "system"]));

    return successResponse(rows.map((r) => toClientUser(r, nameMap, nameMap)));
  } catch (error) {
    return internalErrorResponse(error);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
    let body: { email?: string; roleIds?: string[]; remark?: string };
    try {
      body = await req.json();
    } catch {
      return badRequestResponse(ERR_INVALID_JSON, "Invalid JSON body.");
    }

    const email = body.email?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return badRequestResponse(ERR_USER_EMAIL_INVALID, "A valid email is required.");
    }

    const existing = await prisma.sysInvite.findFirst({
      where: { email, status: "PENDING" },
    });
    if (existing) return badRequestResponse(ERR_USER_EMAIL_TAKEN, "An active invitation already exists for this email.");

    const entityId = session.entity.entityId;
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 86_400_000);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.sysUser.create({
        data: {
          username: null,
          passwordHash: "",
          status: "PENDING",
          remark: body.remark?.trim() || null,
          creUserId: session.id,
          updUserId: session.id,
        },
      });

      await tx.sysEntityUser.create({
        data: {
          entityId,
          userId: newUser.userId,
          authorizingType: "NORMAL",
          status: "ACTIVE",
          authorizingTimestamp: new Date(),
          authorizingUserId: session.id,
          creUserId: session.id,
        },
      });

      await tx.sysInvite.create({
        data: {
          userId: newUser.userId,
          email,
          token,
          expiresAt,
          creUserId: session.id,
        },
      });

      const roleIds = (body.roleIds ?? []).map(Number).filter(Number.isFinite);
      if (roleIds.length > 0) {
        await tx.sysUserRole.createMany({
          data: roleIds.map((roleId) => ({
            entityId,
            userId: newUser.userId,
            roleId,
            creUserId: session.id,
          })),
        });
      }

      return newUser;
    });

    const full = await prisma.sysUser.findUniqueOrThrow({
      where: { userId: user.userId },
      include: {
        ...USER_INCLUDE,
        entityUsers: { where: { entityId }, select: { authorizingType: true } },
        userRoles: { where: { entityId }, select: { roleId: true } },
      },
    });

    const nameMap = new Map([[session.id, session.username]]);
    return createdResponse(toClientUser(full, nameMap, nameMap));
  } catch (error) {
    return internalErrorResponse(error);
  }
}
```

- [ ] **Step 2: Update `users/[userId]/route.ts`**

Replace the full content of `apps/web/app/api/system/users/[userId]/route.ts`:

```typescript
import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_INVALID_JSON, ERR_USER_NOT_FOUND } from "@cloud/request/error-codes";
import { getSession } from "../../../../../lib/auth";
import { toClientUser, USER_INCLUDE } from "../../../../../lib/user-mapper";

async function findUserInEntity(userId: number, entityId: number) {
  const link = await prisma.sysEntityUser.findUnique({
    where: { entityId_userId: { entityId, userId } },
  });
  return link?.status === "ACTIVE" ? link : null;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getSession();
  if (!session) return unauthorizedResponse();

  try {
    const { userId: rawId } = await params;
    const userId = Number(rawId);
    if (!Number.isFinite(userId)) return badRequestResponse(ERR_INVALID_ID, "Invalid user ID.");

    const entityId = session.entity.entityId;
    if (!await findUserInEntity(userId, entityId)) return notFoundResponse(ERR_USER_NOT_FOUND, "User not found.");

    let body: { displayName?: string; remark?: string; roleIds?: string[] };
    try {
      body = await req.json();
    } catch {
      return badRequestResponse(ERR_INVALID_JSON, "Invalid JSON body.");
    }

    await prisma.$transaction(async (tx) => {
      const data: Record<string, unknown> = { updUserId: session.id };
      if (body.displayName !== undefined) data.displayName = body.displayName.trim() || null;
      if (body.remark !== undefined) data.remark = body.remark.trim() || null;
      await tx.sysUser.update({ where: { userId }, data });

      if (body.roleIds !== undefined) {
        await tx.sysUserRole.deleteMany({ where: { userId, entityId } });
        const roleIds = body.roleIds.map(Number).filter(Number.isFinite);
        if (roleIds.length > 0) {
          await tx.sysUserRole.createMany({
            data: roleIds.map((roleId) => ({
              entityId,
              userId,
              roleId,
              creUserId: session.id,
            })),
          });
        }
      }
    });

    const updated = await prisma.sysUser.findUniqueOrThrow({
      where: { userId },
      include: {
        ...USER_INCLUDE,
        entityUsers: { where: { entityId }, select: { authorizingType: true } },
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

- [ ] **Step 3: Update `users/[userId]/lock/route.ts`**

Replace the full content of `apps/web/app/api/system/users/[userId]/lock/route.ts`:

```typescript
import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NOT_FOUND, ERR_USER_LOCK_INVALID_STATUS } from "@cloud/request/error-codes";
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

    const entityId = session.entity.entityId;
    const link = await prisma.sysEntityUser.findUnique({
      where: { entityId_userId: { entityId, userId } },
    });
    if (!link || link.status !== "ACTIVE") return notFoundResponse(ERR_USER_NOT_FOUND, "User not found.");

    const user = await prisma.sysUser.findUniqueOrThrow({ where: { userId } });

    if (user.status === "LOCKED") {
      await prisma.sysUser.update({
        where: { userId },
        data: {
          status: "ACTIVE",
          passwordErrorTimes: 0,
          passwordErrorLockExpiredTimestamp: null,
          updUserId: session.id,
        },
      });
    } else if (user.status === "ACTIVE") {
      await prisma.sysUser.update({
        where: { userId },
        data: {
          status: "LOCKED",
          passwordErrorLockExpiredTimestamp: new Date(Date.now() + 30 * 60_000),
          updUserId: session.id,
        },
      });
    } else {
      return badRequestResponse(ERR_USER_LOCK_INVALID_STATUS, "Cannot lock/unlock a user with status " + user.status);
    }

    const updated = await prisma.sysUser.findUniqueOrThrow({
      where: { userId },
      include: {
        ...USER_INCLUDE,
        entityUsers: { where: { entityId }, select: { authorizingType: true } },
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

- [ ] **Step 4: Update `users/[userId]/reset-password/route.ts`**

Replace the full content of `apps/web/app/api/system/users/[userId]/reset-password/route.ts`:

```typescript
import { randomBytes } from "node:crypto";
import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NOT_FOUND, ERR_USER_RESET_PW_PENDING } from "@cloud/request/error-codes";
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

    const entityId = session.entity.entityId;
    const link = await prisma.sysEntityUser.findUnique({
      where: { entityId_userId: { entityId, userId } },
    });
    if (!link || link.status !== "ACTIVE") return notFoundResponse(ERR_USER_NOT_FOUND, "User not found.");

    const user = await prisma.sysUser.findUniqueOrThrow({ where: { userId } });
    if (user.status === "PENDING") {
      return badRequestResponse(ERR_USER_RESET_PW_PENDING, "Cannot reset password for a pending user.");
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 72 * 3_600_000);

    await prisma.$transaction(async (tx) => {
      await tx.sysPasswordResetRequest.updateMany({
        where: { userId, status: "PENDING" },
        data: { status: "SUPERSEDED" },
      });

      await tx.sysPasswordResetRequest.create({
        data: {
          userId,
          token,
          expiresAt,
          creUserId: session.id,
        },
      });
    });

    const updated = await prisma.sysUser.findUniqueOrThrow({
      where: { userId },
      include: {
        ...USER_INCLUDE,
        entityUsers: { where: { entityId }, select: { authorizingType: true } },
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

- [ ] **Step 5: Update `users/[userId]/resend-invite/route.ts`**

Replace the full content of `apps/web/app/api/system/users/[userId]/resend-invite/route.ts`:

```typescript
import { prisma } from "@cloud/db";
import {
  successResponse,
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NO_PENDING_INVITE } from "@cloud/request/error-codes";
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

    const entityId = session.entity.entityId;

    const invite = await prisma.sysInvite.findFirst({
      where: { userId, status: "PENDING" },
      orderBy: { creTime: "desc" },
    });
    if (!invite) return notFoundResponse(ERR_USER_NO_PENDING_INVITE, "No pending invite found for this user.");

    await prisma.sysInvite.update({
      where: { inviteId: invite.inviteId },
      data: {
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
        creUserId: session.id,
        resendCount: { increment: 1 },
      },
    });

    const updated = await prisma.sysUser.findUniqueOrThrow({
      where: { userId },
      include: {
        ...USER_INCLUDE,
        entityUsers: { where: { entityId }, select: { authorizingType: true } },
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

- [ ] **Step 6: Update `users/[userId]/cancel-invite/route.ts`**

Replace the full content of `apps/web/app/api/system/users/[userId]/cancel-invite/route.ts`:

```typescript
import { prisma } from "@cloud/db";
import {
  badRequestResponse,
  unauthorizedResponse,
  notFoundResponse,
  noContentResponse,
  internalErrorResponse,
} from "@cloud/request/server";
import { ERR_INVALID_ID, ERR_USER_NOT_FOUND, ERR_USER_CANCEL_NOT_PENDING } from "@cloud/request/error-codes";
import { getSession } from "../../../../../../lib/auth";

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

    const user = await prisma.sysUser.findUnique({ where: { userId } });
    if (!user) return notFoundResponse(ERR_USER_NOT_FOUND, "User not found.");
    if (user.status !== "PENDING") {
      return badRequestResponse(ERR_USER_CANCEL_NOT_PENDING, "Can only cancel invites for pending users.");
    }

    await prisma.sysUser.delete({ where: { userId } });

    return noContentResponse();
  } catch (error) {
    return internalErrorResponse(error);
  }
}
```

- [ ] **Step 7: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/api/system/users/
git commit -m "feat(users): add error codes and try/catch to users API routes"
```

---

### Task 7: Migrate frontend callers to `toastError`

**Files:**
- Modify: `packages/system/src/roles/roles-panel.tsx`
- Modify: `packages/system/src/users/users-page.tsx`
- Modify: `packages/system/src/users/pending-invite-detail.tsx`

- [ ] **Step 1: Update `roles-panel.tsx`**

Replace `import { toast } from "sonner";` with:

```typescript
import { toastError } from "@cloud/request/error-toast";
```

Also keep `import { toast } from "sonner";` because `toast.success()` calls remain.

Change all 4 catch blocks:

```typescript
// Line ~43: update catch
  } catch (err) { toastError(err); }

// Line ~60: createRole catch
  } catch (err) { toastError(err); }

// Line ~75: deleteRole catch
  } catch (err) { toastError(err); }

// Line ~90: duplicate catch
  } catch (err) { toastError(err); }
```

The full import section becomes:

```typescript
import { toast } from "sonner";
import { toastError } from "@cloud/request/error-toast";
```

- [ ] **Step 2: Update `users-page.tsx`**

Add the import:

```typescript
import { toastError } from "@cloud/request/error-toast";
```

Change all 6 catch blocks from `catch { toast.error("..."); }` to `catch (err) { toastError(err); }`:

- `update` function
- `createUser` function
- `toggleLock` function
- `resetPassword` function
- `cancelInvite` function
- `resendInvite` function

- [ ] **Step 3: Update `pending-invite-detail.tsx`**

The `copyToken` function's catch is not an API error — it's a clipboard error. Keep it as-is (`toast.error("Failed to copy token")`). No changes needed to this file.

- [ ] **Step 4: Type-check and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: No errors.

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/system/src/roles/roles-panel.tsx packages/system/src/users/users-page.tsx
git commit -m "feat(system): replace toast.error with toastError for structured error display"
```

---

### Task 8: Final verification

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
