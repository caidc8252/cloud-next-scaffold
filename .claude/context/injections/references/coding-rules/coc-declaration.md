# CoC declaration

A module's `manifest.ts` (`defineModule(...)`) is the single source of truth for its menu (`menuCode` + `entry.url`) and its `permissions[]`. There is no `sys_menu` / `sys_permission` table — the left menu is not stored, it is projected at runtime from each session's effective permissions (party contract scope ∩ role codes). Declare there and only there; never restate a menu or code anywhere else.

Two module classes, no middle ground:

- **A-class** — has contract/permission-gated UI. Declare `menuCode` + `permissions[]` (each with `belongToMenuCode == menuCode == code's first two segments`); the leaf projects into the left menu. See [permission-codes](permission-codes.md) for code shape.
- **B-class** — login-and-see / pure logic, no gated UI. Declare no permissions; page guards on `requireSession()` only (see [auth-guards](auth-guards.md)); its link is hardwired in the layout. Never enters `catalog`, never projects.

`pnpm gen:coc` (wired as predev / prebuild / pretest) reads the manifests and regenerates `manifest/_generated/*.generated.ts` + `_generated/i18n/`; run it after any `manifest.ts` change. A diagnostic error refuses to write and exits 1.

MUST NOT hand-edit `manifest/_generated/*.generated.ts`, `_generated/i18n/`, or seed files (iron law #3) — they are gitignored, deterministic codegen output; edits are overwritten and fail CI. To change generated content, change the source `manifest.ts` (or catalog) and rerun `pnpm gen:coc`.

MUST NOT modify `manifest/catalog/roles.ts` (GLOBAL roles, `roleId ≤ PRESET_ROLE_ID_MAX`) or `manifest/catalog/contract-types.ts` (`CONTRACT_MENUS` contract gate) without explicit instruction — these are human-owned commercial strategy, not AI-maintained. When a new A-class module's `menuCode` needs a contract to unlock it, flag it for a human rather than editing the catalog silently.

See also (deep spec): `.claude/docs/coc-declaration.md`.
