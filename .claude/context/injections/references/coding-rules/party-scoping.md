# Party scoping (tenancy)

There is **no RLS**. `@cloud/db` exports only `prisma` — no `tenantCtx`, no `withTenantTx`, no `systemDb`. Nothing scopes tenancy for you; every query and every mutation does it by hand.

- **Every read AND every write MUST scope on the session's `currentPartyId` (`Int`).** Put it in the `where` of every `find*`/`count`/`updateMany`/`deleteMany`, and in the `data` of every `create`/INSERT.
- **`currentPartyId` comes from the session, taken by the controller, and passed explicitly** down into service → repository. Repositories MUST NOT reach for the session themselves — they receive the party as an argument. See `notification.controller.ts` → `notification.service.ts` (`scopeOf(session) = { userId, partyId: session.currentPartyId }`) → `notification.repository.ts`, where every `prisma.sysNotice.*` call spreads a `scopeWhere(s)` that pins `partyId`.
- **Build the scope predicate once, reuse it everywhere.** Factor a pure `where`-builder (e.g. `notification.scope.ts`'s `scopeWhere`/`unreadWhere`) so list, count, and mutate share one party clause and can be unit-tested off-DB.
- **RSC / pages / loaders MUST NOT call `prisma` directly.** They fetch through the module service or the module's `server/<mod>.public` narrow face (which internally scopes).
- **Deliberate cross-party reads MUST be explicit and narrowed another way.** A query that intentionally spans parties (e.g. `unreadCountByParty`, scoped by `userId` and grouped by party) MUST say so in a comment and stay off the shared `scopeWhere`; never silently drop the party clause.
