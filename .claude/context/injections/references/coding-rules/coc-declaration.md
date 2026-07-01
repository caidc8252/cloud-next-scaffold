# CoC declaration

A module's `manifest.ts` (`defineModule(...)`) is the single source of truth for its menu (`menuCode` + `entry.url`) and its `permissions[]`. Declare there and only there; never restate a menu or code anywhere else.

Two module classes, no middle ground:

- **A-class** — has contract/permission-gated UI. Declare `menuCode` + `permissions[]`; each code is 4 segments `<cat>.<mod>.<fn>.<action>` with `belongToMenuCode == menuCode == code's first two segments`. The leaf projects into the left menu.
- **B-class** — login-and-see / pure logic, no gated UI. Declare no permissions; page guards on `requireSession()` only; its link is hardwired in the layout. Never enters `catalog`, never projects.

Menu projection: a leaf is visible by effective permission → its ancestor dirs are pulled in → empty dirs pruned. B-class links are hardwired, not projected.

Authoring a new A-class module (these die with the manifest if skipped):

- The manifest MUST be imported into the `modules` array in `manifest/collect.ts`, or codegen never sees it.
- `parentMenuCode` MUST resolve to a node declared in `manifest/menu-tree.ts` (`defineMenuTree`), or `buildRegistry` raises `parent-missing`.
- `label` / `desc` (and menu `title`) are i18n keys — each needs per-module `i18n/{en,zh-CN,ja}.ts` three-language backing.
- `CONTRACT_MENUS` (`manifest/catalog/contract-types.ts`) has NO wildcard — every contract enumerates its unlocked menus explicitly.

`pnpm gen:coc` (wired as predev / prebuild / pretest) reads the manifests and regenerates `manifest/_generated/*.generated.ts` + `_generated/i18n/`; run it after any `manifest.ts` change.

MUST NOT hand-edit `manifest/_generated/*.generated.ts`, `_generated/i18n/`, or seed files (iron law #3). To change generated content, change the source `manifest.ts` (or catalog) and rerun `pnpm gen:coc`.

MUST NOT modify `manifest/catalog/roles.ts` (GLOBAL roles, `roleId ≤ PRESET_ROLE_ID_MAX`) or `manifest/catalog/contract-types.ts` (`CONTRACT_MENUS` contract gate) without explicit instruction — these are human-owned commercial strategy, not AI-maintained. When a new A-class module's `menuCode` needs a contract to unlock it, flag it for a human rather than editing the catalog silently.
