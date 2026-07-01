# Package boundaries (`packages/*`)

`packages/*` are the `@cloud/*` workspace packages (`@cloud/db`, `@cloud/permissions`, `@cloud/request`, `@cloud/storage`, `@cloud/ui`, `@cloud/config`, `@cloud/api-kit`, `@cloud/i18n`, `@cloud/platform-config`, `@cloud/security`, `@cloud/log`, `@cloud/mail`, `@cloud/cache`, `@cloud/constants`).

- **`packages/*` MUST NOT import from `apps/`.** Dependency flows one way (`apps/web` → `@cloud/*`, never back). It's structural, not a lint rule: no package declares `apps/web` as a dependency, and the `@/*` path alias resolves to `apps/web/*` only — inside a package there is no way to reach app code.
- **`@cloud/*` holds only project-level shared infrastructure** — capabilities reused across apps. App-private or single-page logic stays in `apps/web` (`modules/`, [commons](commons.md), or `apps/web/lib/`); don't pull a business concern into a shared package. What earns promotion into a package: cross-app reuse with a clean responsibility boundary. A two-ended capability (client + server) is promoted **whole**, with `./client` / `./server` dual entries (`client-only` / `server-only` guards) — never split one end into `apps/*`.
- **Import a package's public entry, not deep internal paths.** Consume the `exports` map (`@cloud/permissions`, `@cloud/permissions/client`, `@cloud/permissions/server`), never `packages/<pkg>/src/...`. Model/enum types come from `@cloud/db`, not `@prisma/client` (Prisma 7 generates to `packages/db/generated/prisma`).
- **Packages take config as parameters, never read `.env` themselves** — keys, buckets, connection strings, PEMs are injected by the caller (`fn(input, config)`); deployment constants stay in `apps/*`.

Per-package **usage** rules live in the concern files (auth-guards, api-and-requests, party-scoping, storage, …), not here; this file is the boundary only.
