import "server-only";

import { getConfig } from "@cloud/config";
import { registerSessionFallbackProvider, type Session } from "@cloud/permissions/server";
import { headers } from "next/headers";
import { buildDevAuthBypassSession } from "@/modules/identity/auth/server/auth.public";

const DEFAULT_DEV_AUTH_BYPASS_EMAIL = "admin@newlandnpt.com";

export function registerDevAuthBypassSessionProvider(): void {
  const config = getConfig();
  if (!isDevAuthBypassEnabled(config)) return;

  registerSessionFallbackProvider(createDevAuthBypassSession);
}

export async function createDevAuthBypassSession(): Promise<Session | null> {
  const config = getConfig();
  if (!isDevAuthBypassEnabled(config)) return null;
  if (!(await isLocalRequest())) return null;

  try {
    return await buildDevAuthBypassSession(
      config.DEV_AUTH_BYPASS_EMAIL ?? DEFAULT_DEV_AUTH_BYPASS_EMAIL,
    );
  } catch (error) {
    console.warn("[dev-auth-bypass] failed to build local session", error);
    return null;
  }
}

function isDevAuthBypassEnabled(config: ReturnType<typeof getConfig>): boolean {
  return config.DEV_AUTH_BYPASS && config.NODE_ENV !== "production" && !config.CI;
}

async function isLocalRequest(): Promise<boolean> {
  try {
    const headerStore = await headers();
    const forwardedHost = headerStore.get("x-forwarded-host");
    const host = forwardedHost ?? headerStore.get("host");
    return host !== null && isLocalHost(host);
  } catch {
    return false;
  }
}

function isLocalHost(host: string): boolean {
  if (host.includes(",")) return false;

  let hostname: string;
  try {
    hostname = new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    return false;
  }

  const normalized = hostname.replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}
