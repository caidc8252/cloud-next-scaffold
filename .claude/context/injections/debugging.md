<!-- scaffold:injection:debugging -->
# Debugging a module — stay in your lane

- Fix only author-owned files of the module under test: `modules/<cat>/<mod>/{manifest.ts,server/**,schema/**,client/**,i18n/**,ui/**}`. Never edit `apps/web/manifest/_generated/*.generated.ts` (those are codegen output — rerun `pnpm gen:coc`) or another module's files.
- A fix that requires touching another module's files or the generated registry is a **finding to surface**, not something to do unilaterally.
- After any `manifest.ts` edit, rerun `pnpm gen:coc` — the generated types must be current before running lint or tests.
- A debugging fix is a code change: when it touches a route/service/UI, invoke `requesting-code-review` before declaring "done" — a green `pnpm test` does not confirm conformance to the iron laws.
