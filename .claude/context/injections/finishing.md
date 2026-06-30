<!-- scaffold:injection:finishing -->
# Finishing — project specifics

A green claim you can't point at is not done — show the operator the actual output.

- Run the gate in order and show output; do not claim green without it:
  1. `pnpm gen:coc` — must exit clean (generates `manifest/_generated/*.generated.ts` + i18n; hand-editing generated files is a hard violation)
  2. `pnpm lint` — eslint across `apps/web` + `packages/*`
  3. `pnpm test` — vitest unit/component (`--passWithNoTests` is intentional; pre-hook already ran `gen:coc`)
- Review surfaced findings? **Tell the operator to run `/fix`** (user-triggered skill, not yours to invoke) — do not hand-patch findings ad hoc.
- Do NOT write back to FeiShu or open a PR here — that belongs to `/submit-work`.
