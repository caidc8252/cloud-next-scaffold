# Notice (in-app)

In-app notices live in `apps/web/modules/system/notification/`. The read side (bell, list, detail, `GET /api/notifications`, `/unread-count`, `POST /read`, `NotificationsProvider`) is already built — to wire a new event you touch only the producer.

- **`createNotice` is the ONE producer.** To notify a user, call `createNotice` from `notification.service.ts` — any domain's server may call it (it writes the shared `sys_notice` table). MUST NOT `prisma.sysNotice.create` yourself, and MUST NOT add a create-notice API (that would let clients forge notices for others).
- **Input contract** (`createNoticeInputSchema`, single source of truth): `{ userId, belongToPartyId?, noticeType, title, payload }`. `belongToPartyId` omitted = global across the user's parties; the read scope is always `userId = session.userId AND (belongToPartyId = currentPartyId OR IS NULL)` — see [party-scoping](party-scoping.md). A notice is one immutable `SysNotice` row (`status=UNREAD`), only ever mark-read.
- **`payload` is exactly four fields**, no other shape: `summary` (required, plain text, one-line for bell/list) + `detail` (required, non-empty plain-text body — zod rejects empty `detail`) + `fields?[]` (`{key, value, mono?}`) + `links?[]` (`{label, type:'text'|'button', url}`).
- **`noticeType` MUST be `"<module>.<event>"`** (e.g. `ticket.assigned`, `account.passwordReset`). `module` is not stored — the client derives icon/color/chip from the prefix. A brand-new module needs one entry in `modules/system/notification/ui/notice-meta.ts` `MODULE_META`.
- **Producer renders content in the RECIPIENT's language, not the request's.** Read `sys_user.locale`, narrow with `isLocale()` (fall back `en`), build `getTranslations({ locale })` — MUST NOT use the cookie-based `getTranslations` (recipient ≠ current requester). All producer text (`title`/`summary`/`detail`/`fields[].value`/`links[].label`) is rendered here and displayed verbatim; only structural labels (`fields[].key` → `notifications.fields.<key>`, module chip) are translated at display time. Three-language `notifications.*` keys, `en` base, no hard-coded strings — see [i18n](i18n.md).
- **`links[].url` is pre-built by the producer:** relative path within this app (`/tickets/T-1`), absolute URL only cross-app.
- **Emission MUST be non-blocking:** call `createNotice` inside a `try/catch` at the business event point; on failure `log.warn` only (`@cloud/log`, `createLogger`) and do NOT affect the main flow's return or roll back — a notice is a side effect.
- Reference: `resetUserPassword` in `apps/web/modules/system/users/server/users.service.ts`. Out of scope this round: dismiss / delete / mark-unread / retention cleanup.

See also (deep spec): `.claude/docs/notice.md`.
