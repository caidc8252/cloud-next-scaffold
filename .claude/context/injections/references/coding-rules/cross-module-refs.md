# Cross-module references

Types and functions cross module boundaries **only** through the narrow public surfaces:

- server → server: `modules/<cat>/<mod>/server/<mod>.public.ts` (e.g. `roles.public.ts` re-exports `listAssignableRoles` + `type Role`, consumed by the users page `modules/system/users/ui/users-page.tsx`).
- client → client: `modules/<cat>/<mod>/client/<mod>.api.ts`.

MUST NOT deep-import another module's internals (`server/<mod>.service`, `*.repository`, `*.mapper`, `schema/*`, `ui/*`) — eslint `module-boundary/boundary` errors. If another module needs something, the owner exports it from its `.public` / `.api` file; consume that.

## Cross-module stubs (`*.stub.ts`)

A dependency another module hasn't built yet — a function/type from its `*.public`/`*.api`, or a permission code — is forward-declared with a colocated **importable** `modules/<cat>/<mod>/<name>.stub.ts` carrying a `@stub-owner` / `@stub-consumer` / `@stub-reason` header.

- **Import it** — that is the mechanism. `next-kit/stub-notice` surfaces every stub (warn), naming owner + consumer, and nags on an incomplete header. There is no import ban.
- **Delete it** once the owner ships: swap the import to the owner's real `*.public` / `*.api` (or real code) and remove the file. The one hard gate is `/submit-work` (`scripts/check-stubs.mjs`) — no `*.stub.*` reaches `develop`.
- A permission-code stub exports the code `as PermissionCode` (no manifest entry, no `gen:coc` involvement); it fails closed at runtime until the owner ships.
- Full convention, kinds, and template → `../cross-module-stub.md`.
