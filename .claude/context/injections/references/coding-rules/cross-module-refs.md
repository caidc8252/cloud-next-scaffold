# Cross-module references

Types and functions cross module boundaries **only** through the narrow public surfaces:

- server → server: `modules/<cat>/<mod>/server/<mod>.public.ts` (e.g. `roles.public.ts` re-exports `listAssignableRoles` + `type Role` for the users module).
- client → client: `modules/<cat>/<mod>/client/<mod>.api.ts`.

MUST NOT deep-import another module's internals (`server/<mod>.service`, `*.repository`, `*.mapper`, `schema/*`, `ui/*`). If another module needs something, the owner exports it from its `.public` / `.api` file; consume that. This is the whole cross-module import contract — no other path.

A permission code the owning module has **not declared yet** is forward-declared with a colocated `modules/<cat>/<mod>.stub.ts` (iron law #8) so the consumer type-checks against the `PermissionCode` union before the owner ships. A stub is a codegen artifact, not an import target:

- MUST NOT `import` a `*.stub` — it is never imported; the link is the generated union (eslint `no-stub-import`). Business code that imports a stub fails lint.
- Remove the stub once the owner declares the code for real — a leftover stub then collides and fails the coc `duplicate-code` gate.

For full stub mechanics — the `@stub-*` header, the two-way owner/consumer notice, and removal responsibility — see [cross-module-stub](../cross-module-stub.md). Related: [permission-codes](permission-codes.md).

See also: [cross-module-stub](../cross-module-stub.md) (scaffold machinery), `.claude/docs/server-layering.md` (deep spec).
