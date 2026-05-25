import "server-only";

import { cookies } from "next/headers";
import {
  decodeSession,
  encodeSession,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  type SessionPayload,
} from "./session.ts";

function getCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  };
}

async function writeSessionCookie(payload: SessionPayload) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(payload), getCookieOptions());
}

export async function createSession(userId: number, entityId: number | null) {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  await writeSessionCookie({ userId, entityId, expiresAt });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function upgradeSession(entityId: number) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const payload = decodeSession(token);
  if (!payload) return;

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  await writeSessionCookie({ userId: payload.userId, entityId, expiresAt });
}

export async function downgradeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  const payload = decodeSession(token);
  if (!payload) return;

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  await writeSessionCookie({ userId: payload.userId, entityId: null, expiresAt });
}
