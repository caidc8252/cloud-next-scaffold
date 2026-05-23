import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEnv } from "@cloud/config";

const SESSION_COOKIE = "sid";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  userId: string;
  expiresAt: number;
};

export type AuthenticatedSession = {
  id: string;
  account: string;
  name: string;
  email: string;
  role: {
    id: string;
    key: string;
    name: string;
    menus: Array<{
      id: string;
      key: string;
      label: string;
      path: string;
      icon: string;
      sortOrder: number;
    }>;
  };
};

async function getPrismaClient() {
  const { prisma } = await import("@cloud/db");
  return prisma;
}

function sign(payload: string) {
  return createHmac("sha256", getEnv().AUTH_SESSION_SECRET).update(payload).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const actual = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length) return null;
  if (!timingSafeEqual(actual, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  cookieStore.set(SESSION_COOKIE, encodeSession({ userId, expiresAt }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const getSession = cache(async (): Promise<AuthenticatedSession | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = decodeSession(token);
  if (!payload) return null;

  const prisma = await getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      role: {
        include: {
          menus: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    account: user.account,
    name: user.name,
    email: user.email,
    role: {
      id: user.role.id,
      key: user.role.key,
      name: user.role.name,
      menus: user.role.menus,
    },
  };
});

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/api/auth/logout");
  }
  return session;
}
