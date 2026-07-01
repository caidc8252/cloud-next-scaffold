---
name: mock-app
description: Transform a foundation design artifact (an HTML prototype that inlines foundation tokens + primitive/composite classes) into a full Next feature with @cloud/ui. MUST use when the input is a foundation artifact.
disable-model-invocation: true
---

# /mock-app

Transform a **foundation artifact** — a self-contained HTML prototype that inlines
foundation's `tokens.inline.css` + `primitives.css` + `composites.css` and uses
foundation classes (`.btn`, `.field`, `.data-table`, `.tabs__trigger`, …) — into a
full Next (App Router) feature with **`@cloud/ui`**: UI + behavior + data + the
app-frame shell + team-rule layers. Mock-app-parity output, narrower path: the
primitive layer is a **machine-checkable lookup**, not a per-node guess.

**Scope guard:** this path is for *foundation artifacts only*. Confirm the
foundation banner + foundation classes first; if the input is an arbitrary
prototype on unknown primitives (no foundation banner), **stop and ask** — that
is outside this skill's deterministic-lookup premise.

## The contract — the lookup is authority, the gate fires

The deterministic core (`foundation-map`) owns the primitive layer. You never
re-derive a mapped primitive by eye; you fill only the irreducibly-custom work
(behavior, data, shell, team rules). Two facts hold throughout:

- **Version-match is a precondition, not a check you can wave through.** The
  transform refuses to run unless a checked-in table for the artifact's exact
  `<!-- foundation: <version> -->` banner exists. A version mismatch is the most
  likely way this path produces confident garbage (spec §6). If it refuses:
  **stop and ask** — never transform against "whatever the repo is."
- **The gate is a firing guard, not a self-grade.** `.claude/bin/foundation-map gate`
  parses source HTML + the final TSX and asserts coverage by `data-src`. A coverage
  gap is a wall, not a footnote. Builders MUST preserve `data-src` on mapped nodes.

## Plan mode — understand, then get approval

On `/mock-app`, enter native **plan mode**. Verify the stack (TS strict,
pnpm workspaces, `packages/*`); stop and ask if absent.

1. **Recognize & inventory.** Confirm it is a foundation artifact. Inventory four
   things, not one: **states** (tabs/modal/wizard are *distinct states*),
   on-contract nodes, off-contract residue, behavior + data. The artifact ships
   **no app shell** — you will *add* one (the inverse of mock-app stripping a fake
   shell).
2. **Run the deterministic transform.** `.claude/bin/foundation-map <artifact.html>` →
   `.work/mock-app/{table.json, <Name>.tsx (scaffold), residue.json, behavior.json}`. The
   scaffold TSX is the spine every builder extends; it carries `data-src` on every
   mapped node.
3. **Read the residue report — three buckets, never folded (spec §4e/§7):**
   - **layout-residue** → silent Tailwind (no human gate; still listed). The
     builder writes these as plain Tailwind layout.
   - **unimplemented** (contracted-but-`@cloud/ui`-lagging) → **human flag**. If
     this bucket is large, **surface sequencing**: this feature may need to wait
     on `@cloud/ui` shipping those exports rather than ship half-mapped. The
     user's call.
   - **offcontract-unknown** → **human flag**: a primitive-shaped node the table
     doesn't recognize. Surface it; never silently route it to Tailwind.
4. **Read the behavior report — behavior is the dominant cost, not a residual.**
   Only state-switching (active tab/step, open/closed) is absorbed by stateful
   `@cloud/ui` components and dropped. The rest (validation, async/loading sim,
   filterable lists, derived summaries) is irreducibly custom LLM work and is
   usually the *majority* of the script (spec §4d). Plan the custom-logic port as
   the main build stage.
5. **Route each layer to its team rule — don't re-derive it here.** The team-rule
   index (`.claude/context/injections/references/coding-rules.md`) is authority;
   read the rule whose *Applies when* matches. Rough routing for this transform:
   primitives/pages/client components → `ui-and-pages`; server split + handler
   order → `server-layering` + `api-and-requests`; data/mock seam →
   `module-layout` + `database` + `party-scoping`; guards → `auth-guards`; copy →
   `i18n`; all new TS/TSX → `naming-and-style` baseline.
6. **Bound the scope with the user** and present the plan — scope, state
   inventory, the residue buckets (with the unimplemented-sequencing call), the
   behavior port, mock-data shapes, the app-frame shell — and get approval
   **before writing code**.

## Build — orchestrate; subagents build

**Builder subagents don't get the coding-rules injection — so their dispatch prompt
must point them at it** (spec §9): each prompt tells the builder to read
`coding-rules.md` + the rules matching its layer, and restates only what the index
can't own — the `data-src`/gate invariant and each builder's own guardrails — plus
the one highlight this transform trips on most (**no `'use server'`**). Refer, don't
restate. The reusable builder prompts live in `references/behavior-port-prompt.md`
and `references/integration-prompt.md`.

- **Foundation first — one subagent, sequential.** Wrap the scaffold in the real
  **app-frame shell** (routing, the chrome the artifact omits), freeze the data
  seam (types, store, handlers), shared atoms, i18n manifest. Frozen ⇒ read-only;
  commit before fan-out.
- **Behavior + screens** — builders extend the scaffold, **preserve every
  `data-src` on mapped nodes**, port the custom script logic to React state /
  client components, and write only their own dir. A needed contract change is a
  STOP-and-surface, never a silent widen.
- **Residue** — layout-residue as silent Tailwind; unimplemented / unknown stay
  flagged until the user rules.

## Verify — the foundation gate is a script; conformance is the review

1. **Scripted coverage gate.** `.claude/bin/foundation-map gate <artifact.html>
   <final.tsx>` → coverage by `data-src` + the residue report. A non-zero exit is
   a **wall**: a mapped node lost its instance. Fix, never override.
2. **Build / typecheck / lint green** — the kit's own preset must pass on the
   generated output.
3. **Behavior parity** — the ported interactions reproduce (validation gates,
   step nav, simulated async, filterable picker, derived summary).
4. **Team-rule conformance review.** Lint green ≠ coding-rules conformance. On the
   behaviorally-complete diff, invoke `requesting-code-review` — a review-described
   reviewer *does* get the `code-review.md` + `coding-rules.md` gates the builders
   couldn't, so it audits conformance no script covers. Conformance findings are
   **bugs, not logic gaps**: fix in place and re-review until clean; do NOT route
   them through `/logic-groom` (that loop is for implementation logic the UI
   reveals). A finding unfixable without a contract change is a STOP-and-surface.
5. **Visual backstop is cheap, not the bar.** Components are contract-identical by
   construction — a human-readable diff, never pixelmatch/SSIM.

**Cardinal rule —** a feature whose gate did not fire green, whose conformance
review still has an open finding, or whose unimplemented bucket the user has not
ruled on, is **not done; it's blocked.** Stop and ask.

## Handoff — return to the `/coding` caller after the human checks the frontend

`mock-app` is always entered *from* a running `/coding` session — never cold. It
owns the prototype's UI + states + the parity-checked frame, **not** the
implementation logic the prototype can't show; that logic was already sedimented
into `logic.md` by the `/logic-analyze` pass that preceded `/coding`. So once the
gate is green and **the human has eyeballed the running frontend**, hand back:

> Frontend looks right? → back to `/coding` to wire the non-prototype logic.
> Logic the built UI newly reveals rides the findings → `/logic-groom` →
> `/logic-analyze` re-loop, not an inline re-analyze.

Surface this as a suggestion, not an auto-jump.
