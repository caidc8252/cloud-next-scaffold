# Builder dispatch — behavior port

Hand this to a builder subagent verbatim, with the bracketed slots filled. The
builder sees only this prompt — every rule it must obey is here.

## Task

Port the **custom** behavior of a foundation artifact into the scaffold TSX
component at `[path/to/Component.tsx]`. The deterministic transform already mapped
the primitive layer; you extend it. The artifact's script is at
`[artifact path, lines S–E]`; the behavior report (`.work/mock-app/behavior.json`) lists each
unit as `absorbed` or `custom`.

- **Drop every `absorbed` unit.** State-switching (active tab/step, modal
  open/closed) is owned by the stateful `@cloud/ui` component (`Tabs`, `Stepper`,
  `Modal`) — do NOT translate it. Adopt the component's state API instead.
- **Port every `custom` unit** to React state / client components: input
  validation, async/loading simulation, filterable lists, derived summaries.
  These are the real work — most of the script.

## Hard rules (your output is rejected if any is violated)

**Team rules — read them.** You don't get the coding-rules injection, so read
`.claude/context/injections/references/coding-rules.md` and follow the rules matching
this task: `ui-and-pages` (client interactivity ⇒ a leaf `'use client'` component,
not the whole route), `i18n` (no hardcoded copy — keys only, `[i18n usage]`),
`api-and-requests` (zod at the boundary), `naming-and-style` (all new TS). The
highlight it trips on most: **no `'use server'`**.

**Held here — not in the coding-rules index:**
- **Preserve `data-src={n}`** on every mapped node. The scripted gate matches
  source nodes to TSX instances by this attribute; dropping it fails the build.
- **Write only `[your dir]`.** A needed change to a shared contract is a STOP:
  surface it to the orchestrator; never widen the interface yourself.

## Done

Behavior parity: each ported interaction reproduces the artifact's behavior
(validation gates fire, step nav respects gating, simulated async resolves,
filter/summary recompute). Report what you changed and any STOP you hit. Your
"done" is not self-certified — the orchestrator runs the gate.
