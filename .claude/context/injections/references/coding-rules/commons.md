# Commons (leaf layer)

`apps/web/commons/<mod>/` sits **sibling to** `apps/web/modules/`, holding reusable units promoted up from business modules. It is a **leaf layer**: pure-tech only.

- **No own menu**: a commons unit's `manifest.ts` declares no menu — `menuCode` / `parentMenuCode` are absent, and it carries no permission codes.
- **Not contract-gated**: no `require` / `contractTypes`; it stays outside the role×contract permission projection.
- **MUST NOT call back into business modules** (iron law #5): dependency is one-way — a `modules/` unit may depend on `commons/`, never the reverse.

Promotion (modules → commons) happens when a capability is reused by **multiple** business modules or is a droppable pure-tech concern. It is a structural move: it needs operator authorization, and `/logic-analyze` only flags a "上提候选" — it does not move code on its own.

Distinct from `packages/*` (cross-app infrastructure): commons is `apps/web`-internal, business-derived. When adding shared capability, decide the layer first.

Each `commons/<mod>/` keeps one `overview.md` for `/logic-analyze` global awareness — read-only there, written by a dedicated maintenance skill.

## `overview.md` template (commons variant)

Differs from the module template: commons is a leaf-layer generic unit, so there is **no permission-code or menu section**. Sections:
- **Promotion source** — which `modules/<cat>/<mod>` it was promoted from, and why (reused in many places / pure-tech pushdown).
- **Outward API** — exported names and their use.
- **Reused by** — which `modules/<cat>/<mod>` consume it.
- **Leaf-layer self-check** — no own menu ✓ | not contract-gated ✓ | no callback into business modules ✓.
- **Invariants** — constraints callers must know when reusing.
