import "server-only";

import { redirect } from "next/navigation";
import type { PermissionCheck } from "../index.ts";
import { getSession } from "./dal.ts";
import { AuthzError } from "./errors.ts";
import type { Session } from "./session.ts";

function hasAllPermissions(
  permissions: readonly string[],
  required: readonly string[],
) {
  return required.every((permission) => permissions.includes(permission));
}

function hasAnyPermission(
  permissions: readonly string[],
  required: readonly string[],
) {
  return required.length === 0 || required.some((permission) => permissions.includes(permission));
}

function collectMissingPermissions(
  permissions: readonly string[],
  check: PermissionCheck,
) {
  const missingAll = (check.all ?? []).filter((permission) => !permissions.includes(permission));
  const any = check.any ?? [];
  const missingAny = any.length > 0 && !hasAnyPermission(permissions, any) ? any : [];

  return [...new Set([...missingAll, ...missingAny])];
}

export function hasPermissions(
  permissions: readonly string[],
  check: PermissionCheck,
) {
  const all = check.all ?? [];
  const any = check.any ?? [];

  return hasAllPermissions(permissions, all) && hasAnyPermission(permissions, any);
}

export async function assertPermissions(check: PermissionCheck): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new AuthzError(401, "unauthenticated");
  }

  if (!hasPermissions(session.permissions, check)) {
    throw new AuthzError(
      403,
      "forbidden",
      collectMissingPermissions(session.permissions, check),
    );
  }

  return session;
}

export async function requirePermissions(check: PermissionCheck): Promise<Session> {
  try {
    return await assertPermissions(check);
  } catch (error) {
    if (error instanceof AuthzError) {
      if (error.status === 401) {
        redirect("/api/auth/logout");
      }

      if (error.status === 403) {
        redirect("/403");
      }
    }

    throw error;
  }
}
