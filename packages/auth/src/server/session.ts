import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { getEnv } from "@cloud/config";

export const SESSION_COOKIE = "sid";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type SessionPayload = {
  userId: number;
  entityId: number | null;
  expiresAt: number;
};

export type SessionMenu = {
  menuId: number;
  menuTitle: string;
  path: string | null;
  icon: string | null;
  sort: number;
  parentMenuId: number | null;
};

export type SessionRole = {
  roleId: number;
  roleName: string;
  roleType: string;
};

export type PartialSession = {
  id: number;
  username: string;
  displayName: string | null;
};

export type AuthenticatedSession = {
  id: number;
  username: string;
  displayName: string | null;
  email: string | null;
  status: string;
  entity: {
    entityId: number;
    entityName: string;
    contractDefineCode: string;
  };
  roles: SessionRole[];
  permissions: string[];
  menus: SessionMenu[];
};

export type Session = AuthenticatedSession;

function sign(payload: string) {
  return createHmac("sha256", getEnv().AUTH_SESSION_SECRET)
    .update(payload)
    .digest("base64url");
}

export function encodeSession(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function decodeSession(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length) return null;
  if (!timingSafeEqual(actual, expected)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
