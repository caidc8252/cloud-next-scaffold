import "server-only";

export {
  consumeSessionHandoffToken,
  createSession,
  createSessionHandoffToken,
  destroySession,
  updateSession,
} from "./actions.ts";
export { getPartialSession, getSession, requireSession, type PartialSession } from "./dal.ts";
export { AuthzError } from "./errors.ts";
export { assertPermissions, hasPermissions, requirePermissions } from "./permissions.ts";
export {
  registerSessionFallbackProvider,
  type SessionFallbackProvider,
} from "./session-fallback.ts";
export {
  SID_COOKIE,
  SESSION_TTL_SECONDS,
  SID_COOKIE_MAX_AGE_SECONDS,
  sessionStore,
  type Session,
  type ActiveSession,
  type SessionRole,
  type SessionPartyRef,
} from "./session-store.ts";
