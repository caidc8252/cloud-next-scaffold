# CoC declaration

A module's `manifest.ts` (`defineModule(...)`) is the single source of truth for its menu (`menuCode` + `entry.url`) and its `permissions[]`. Declare there and only there. `entry.url` is the module's landing route — AI picks the best entry from the prototype. Menu `title` (and permission `label`/`desc`) are **not** declared here — they are derived, see below.

Two module classes, no middle ground:

- **A-class** — has contract/permission-gated UI. Declare `menuCode` + `permissions[]`; each code is 4 segments `<cat>.<mod>.<fn>.<action>` with `belongToMenuCode == menuCode == code's first two segments`. The leaf projects into the left menu.
- **B-class** — login-and-see / pure logic, no gated UI. Declare no permissions; page guards on `requireSession()` only; its link is hardwired in the layout. Never enters `catalog`, never projects.

Menu projection: a leaf is visible by effective permission → its ancestor dirs are pulled in → empty dirs pruned. B-class links are hardwired, not projected.

Authoring a new A-class module (these die with the manifest if skipped):

- The manifest MUST be imported into the `modules` array in `manifest/collect.ts`, or codegen never sees it.
- `parentMenuCode` is the module's parent in the menu tree; when omitted it defaults to `platform` (the top-level parent). The resolved value MUST reference a node declared in `manifest/catalog/menu-tree.ts` (`defineMenuTree`), or `buildRegistry` raises `parent-missing`.
- `CONTRACT_MENUS` (`manifest/catalog/contract-types.ts`) has NO wildcard — every contract enumerates its unlocked menus explicitly.

`pnpm gen:coc` (wired as predev / prebuild / pretest) reads the manifests and regenerates `manifest/_generated/*.generated.ts` + `_generated/i18n/`; run it after any `manifest.ts` change.

### Menu / permission i18n keys are DERIVED, not authored

`gen:coc` derives the i18n keys and writes them into the generated registries (the field is named `title` / `label` / `desc` there): 

- menu `title`  = `"menu." + menuCode.replaceAll(".", "_")`      → e.g. `system.roles` ⇒ `menu.system_roles`
- perm `label` = `"permission." + code.replaceAll(".", "_") + "_label"` → e.g. `system.roles.role.view` ⇒ `permission.system_roles_role_view_label`
- perm `desc`  = `"permission." + code.replaceAll(".", "_") + "_desc"`

**Where the translations live (author these `.ts`, not the keys):**
- **Module** menu title + its permissions' label/desc → `apps/web/modules/<cat>/<mod>/i18n/{en,zh-CN,ja}.ts`, under the `menu` / `permission` namespaces, keyed by the flat derived name (e.g. `permission: { system_roles_role_view_label: "…", system_roles_role_view_desc: "…" }`).
- **Skeleton** (menu-tree) node titles → `apps/web/manifest/catalog/i18n/{en,zh-CN,ja}.ts`, under `menu` (e.g. `menu: { platform: "…", system: "…" }`).

**Collection guards (`gen:coc` fails on any):** `duplicate-menu-code`, `duplicate-code`, `code-underscore` (no `_` in a code — would break `.`→`_` injectivity), `menu-depth` (skeleton ≤ 2 levels), plus i18n **existence** (every derived key present in all 3 locales) and **cross-source duplicate** (a key set by 2+ i18n files).

MUST NOT hand-edit `manifest/_generated/*.generated.ts`, `_generated/i18n/`, or seed files (iron law #3). To change generated content, change the source `manifest.ts` (or catalog) and rerun `pnpm gen:coc`.

MUST NOT modify `manifest/catalog/roles.ts` (GLOBAL roles, `roleId ≤ PRESET_ROLE_ID_MAX`) or `manifest/catalog/contract-types.ts` (`CONTRACT_MENUS` contract gate) without explicit instruction — these are human-owned commercial strategy, not AI-maintained. When a new A-class module's `menuCode` needs a contract to unlock it, flag it for a human rather than editing the catalog silently.
