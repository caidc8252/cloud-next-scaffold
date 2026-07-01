# Builder dispatch — integration (app-frame shell + data seam)

Hand this to the **foundation** builder verbatim, slots filled. Runs first,
sequential; freezes the shared seam every screen consumes. The builder sees only
this prompt.

## Task

Wrap the scaffold component at `[path/to/Component.tsx]` in the real **app-frame
shell** and freeze the data seam. The artifact ships **no shell** — you ADD one
(routing, chrome, layout the prototype omits). This is the inverse of mock-app,
which strips a fake shell.

1. **App-frame shell** — mount the feature under the real Next App Router shell at
   `[route path]`: layout, nav placement, breadcrumb slots. Use the team layout
   primitives (`[e.g. Layout / AppFrame mapping from out/table.json]`).
2. **Data seam** — types, a store pinned to `globalThis`, and **route handlers**
   for every mutation. Client → `@cloud/request/client` → a thin route handler →
   data via the `@cloud/request/server` envelope. The mock→real swap must be a
   **handler-body change only**.
3. **Shared atoms + i18n manifest** — the chrome no leaf owns, the i18n keys every
   screen references.

## Hard rules — non-negotiable (output rejected if violated)

- **No hardcoded copy** — i18n keys only (`[i18n usage]`). Invoke `i18n`.
- **Thin handlers wrapped in `withApiHandler`**, zod-parsed input, service-path
  layering. Invoke `request` + `route-design`.
- **No `'use server'`** (team lint ban). Mutations are route handlers only.
- **Guarded routes** use the team permission wrapper. Invoke `permissions`.
- **`force-dynamic` / bundle-split store gotchas** — the `globalThis` store must
  survive route bundling; mark the route dynamic where required.
- **Preserve `data-src={n}`** on every mapped node carried from the scaffold.

## Done

The shell renders the scaffold under the real route; the data seam compiles and
the mock→real swap is isolated to handler bodies. Freeze: the orchestrator commits
before fan-out, after which this is read-only. Report the frozen interface (types,
store API, handler list) for the screen builders.
