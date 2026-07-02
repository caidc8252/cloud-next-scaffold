import "server-only";

import type { Session } from "./session-store.ts";

export type SessionFallbackProvider = () => Promise<Session | null>;

let sessionFallbackProvider: SessionFallbackProvider | null = null;

export function registerSessionFallbackProvider(provider: SessionFallbackProvider | null): void {
  sessionFallbackProvider = provider;
}

export async function readSessionFallback(): Promise<Session | null> {
  return sessionFallbackProvider ? sessionFallbackProvider() : null;
}
