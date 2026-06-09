import "server-only";
import { cookies } from "next/headers";
import type { Account } from "./types";

// Mock session seam. A real build swaps this for @cloud/permissions/server's
// getSession/createSession (cache + DB backed); here the signed-in account is
// base64-JSON encoded in an httpOnly cookie so it survives navigation and
// server restarts without a DB. Same shape (`Account`) so the swap is local.

const SESSION_COOKIE = "pep_session";
const MAX_AGE = 60 * 60 * 8; // 8h

export async function setSession(account: Account): Promise<void> {
  const value = Buffer.from(JSON.stringify(account), "utf8").toString("base64url");
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<Account | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Account;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
