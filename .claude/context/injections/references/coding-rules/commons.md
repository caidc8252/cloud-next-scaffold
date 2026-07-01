# Commons (leaf layer)

`apps/web/commons/<mod>/` sits **sibling to** `apps/web/modules/`, holding reusable units promoted up from business modules. It is a **leaf layer**: pure-tech only.

- **No own menu**: a commons unit's `manifest.ts` (if any) declares no menu — `menuCode` / `parentMenuCode` are absent, and it carries no permission codes.
- **Not contract-gated**: no `require` / `contractTypes`; it stays outside the role×contract permission projection.
- **MUST NOT call back into business modules** (iron law #5): dependency is one-way — a `modules/` unit may depend on `commons/`, never the reverse. A commons unit that reaches into a business module is disqualified from being commons.

Promotion (modules → commons) happens when a capability is reused by **multiple** business modules or is a droppable pure-tech concern. It is a structural move: it needs operator authorization, and `/logic-analyze` only flags a "上提候选" — it does not move code on its own.

Each `commons/<mod>/` keeps one `overview.md` (commons template in `.claude/docs/module-overview.md`) for `/logic-analyze` global awareness — read-only there, written by a dedicated maintenance skill.

Distinct from `packages/*` (cross-app infrastructure): commons is `apps/web`-internal, business-derived. When adding shared capability, decide the layer first — see [package boundaries](package-boundaries.md) and `.claude/docs/capability-ownership.md`.

See also: `apps/web/commons/README.md`, `.claude/docs/capability-ownership.md` (deep spec).
