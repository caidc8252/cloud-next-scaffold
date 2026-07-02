# Design: `logic-converge` — replace `logic-analyze`

- **Date:** 2026-07-02
- **Status:** Approved (design), pending implementation plan
- **Author:** operator + Claude
- **Scope:** full sweep — new skill + retool the pipeline + retire the old skill/ledger

---

## 1. Problem — the `logic.md` model was wrong

Today's `logic-analyze` treats `logic.md` as the **sole handoff** to `/coding`: a
*distillation that replaces the raw inputs*. The rendered header literally says
"本文件是 /logic-analyze → /coding 的唯一交接物", and `/coding` is told **not** to
re-read the specs/prototype except via anchors. `logic.md` deliberately does not
restate business, and it is a status-tracked **work-queue** of `L-n` items drained
by coding, defended by a `ledger.mjs` + `logic.items.json` machine.

Two things are wrong with that:

1. **`logic.md` should be a supplement, not a substitute.** Coding needs the raw
   inputs *and* a reconciliation layer on top — not a lossy distillation standing
   in for them.
2. **Analyze is really convergence, not gap-distillation.** The valuable work is
   reconciling where the multiple sources of truth **diverge**, capturing the
   human's decision, and leaving the raw inputs in play.

Because `logic.md` was the *only* source, the ledger had to guarantee unconsumed
items were never clobbered — hence all the `L-n`/status/never-delete machinery.
Once `logic.md` becomes a supplement (raw inputs still read by coding), that whole
guarantee is unnecessary.

## 2. Goals / non-goals

**Goals**
- Replace `logic-analyze` with `logic-converge`.
- `logic.md` becomes a **living supplement** of converged decisions on top of the
  raw inputs — never a task list.
- Drop the ledger entirely (`ledger.mjs`, `logic.items.json`, `L-n` statuses,
  coding status-flips, item-based finalize gate).
- `/coding` consumes **all inputs + `logic.md`** together.
- Keep the pipeline coherent end-to-end (full sweep).

**Non-goals**
- Not redesigning `/sync`, `/start-work`, or the FeiShu integration.
- Not building the commons-overview maintenance skill (still "建设中").
- Not touching the docs-side pipeline inside `pep-webapp-docs`/`pep-data-model-docs`
  (those repos have their own agents/commands).
- This whole convergence approach is transitional ("discarded later") — favour the
  leanest thing that works; do not re-grow ledger-like machinery.

## 3. The loop

The pipeline is a loop, and the design is built for it:

```
/logic-converge → /coding → /logic-groom → /logic-converge → … → /submit-work
```

- **converge** reconciles the sources → writes/updates `logic.md`.
- **coding** consumes *all inputs + logic.md* → implements → its pipeline review
  surfaces findings.
- **groom** captures those findings (and new operator thoughts) as `待处理`
  fragments.
- back to **converge**, which folds new fragments + new doc commits in.
- exit when a converge pass finds nothing new *and* coding runs clean →
  **submit-work**.

This is why `logic.md` must be **cumulative-but-living + incremental**: the loop
revisits it many times, so it must remember settled decisions (never re-ask) yet
stay revisable (supersede when a later pass changes things).

## 4. `logic.md` — shape, lifecycle, writer

### Shape (sections)
- `## 0 Provenance` — the source commit each input was converged at
  (specs / prototype / data-model), groom reference, `code_exists`, analysis mode.
- `## 1 Converged` — the decided reconciliations.
- `## 2 Open` — conflicts surfaced but not yet decided (need offline info).

### Converged entry format
Each entry carries:
- a **light stable handle** `C-n` — a *reference* only, **not** a status and **not**
  a queue position (so a later pass can say "supersede C-3");
- the **sources that diverged** + an **anchor back to each** (e.g.
  `specs: APPS/PUBLISH/rules/#R-2 @<commit>`, `prototype: handoffs/design/... @<commit>`);
- the **decision**;
- the **rationale**.

No status field. No per-item lifecycle.

### Lifecycle
- **Module-level, cumulative-but-living.** Persists across runs and tasks (like
  today's `logic.md`; not cleared by `/submit-work`).
- **Superseding, not append-only.** When a new commit obsoletes a decision, the
  skill **revises/removes** it in place rather than stacking a new one.
- **Pruning is safe** precisely because coding also reads the raw inputs —
  `logic.md` is a supplement, so removing a stale note never loses ground truth.
  This is the property the old model lacked (which forced the never-delete ledger).
- **Bounded by the divergence surface, not by run count** — it holds only genuine
  cross-source disagreements, not business restatement (that's specs) and not a
  work-queue (dropped). Audit trail = git history of `logic.md`.

### Single writer
Only `/logic-converge` authors `logic.md`. `/coding` and `/logic-groom` never write
it. This convention replaces the ledger's physical anti-clobber guarantee —
acceptable now that `logic.md` is not a status-tracked work-queue.

## 5. The convergence lens — one category: "conflict"

The skill applies a **single lens** to every source pairing: *do these agree on one
implementable truth?* Every place they don't is a **conflict** and gets surfaced to
the operator for a decision. **Never guess.**

"conflict" is defined broadly and deliberately subsumes the finer distinctions:
- **hard contradiction** — A says X, B says not-X;
- **soft diff / ambiguity** — same thing described differently or at different
  granularity (a "diff" is just a milder conflict);
- **silence that blocks coding** — one source specifies something and another is
  silent where implementation needs it (the "loss"/gap), *only* when that silence
  actually blocks coding.

Open-ended "nobody mentioned this nice-to-have" gap-hunting is **out of scope** —
that was the old logic-analyze's job. Converge reconciles what the sources *do* say.

Resolved → `## 1 Converged`. Not resolvable this pass → `## 2 Open`.

## 6. Input navigation — README/rule-driven, never a hardcoded path table

The doc repos are self-describing and evolving; hardcoded path tables go stale
(the old skill's specs layout and prototype path were both partially wrong). The
skill resolves artifacts by reading each repo's own entry docs:

- **specs (`pep-webapp-docs`, `../pep-webapp-docs`):** read `specs/README.md` (sole
  self-describing entry) → resolve the authoritative `<CATEGORY>/<MODULE>` path via
  `specs/00-module-registry.md` (mirrors 飞书「所属模块」; **unregistered /
  format-mismatch → stop and ask, never invent**) → read the module's
  `{rules,processes,states}/` **plus the two shared layers it inherits**: global
  `specs/_common/` and category `<CATEGORY>/_common/` → consult `specs/glossary.md`
  for terms.
- **prototype (`pep-webapp-docs`):** land zone `handoffs/design/`, exact path per
  the repo's `.claude/rules/prototype-loop.md` — consult it rather than assuming
  `<cat>/<name>.html`. Absent (foundation off / not yet projected) → treat as
  "no prototype", don't fabricate.
- **data-model (`pep-data-model-docs`, `../pep-data-model-docs`):** auto-clone if
  missing (currently not cloned), then navigate via *its* README the same way.
- **existing code / `overview.md` / groom fragments:** unchanged from today.

**Baked-in rule:** *doc repos are self-describing; read their READMEs/rules to
locate artifacts; treat any hardcoded path as a fallback hint, not truth; an
unresolvable or unregistered module halts with a question rather than a guess.*

Repos absent locally → auto `git clone` (URLs as today); clone/pull failure →
block and tell the operator, never silently skip.

## 7. `logic-converge` — behavior (steps)

Preconditions (unchanged): read `.work/workbench.json`; `current_task` empty →
error out (no active task, run `/start-work`). Derive `cat / name / task_id`;
`dir = .work/logics/<cat>/<name>`; output `<dir>/logic.md`.

1. **Pull docs + grab baselines.** For each repo: checkout `develop`, `git pull`;
   record this pass's HEAD per repo as the baseline (reuse workbench
   `*_docs.last_commit_id`). Don't re-read HEAD at the end (remote may have moved).
2. **Read all inputs** per §6: specs (+ `_common` + registry + glossary),
   prototype, data-model, existing module code, `overview.md`s (read-only global
   awareness), groom `待处理` fragments.
3. **Incremental diff.** For each input, `git diff <baseline>..<head>` over the
   resolved paths; first run (no baseline) = full read.
4. **Converge** (§5). For every conflict (from cross-source divergence, from
   diffs, or from groom fragments), surface it and get the operator's decision;
   never guess. Before converging an area, read existing `## Converged` / `## Open`
   entries touching it (avoid re-asking; supersede when superseded).
5. **Write/update `logic.md`** (§4): resolved → `## 1 Converged` (revise/supersede
   in place as needed); unresolved → `## 2 Open`; refresh `## 0 Provenance`.
   Mark consumed groom fragments `已整理` (edit the groom markdown; groom's
   `# 原始碎片` table is the truth).
6. **Advance workbench baseline — only on clean pass completion.** Parked `## Open`
   items are fine (they persist as content); abort/error → do **not** advance
   (next pass re-diffs the range). Write `docs_flash_time` + the three `*_docs`
   from the commit captured in step 1. Never touch `current_task` / `start_time`.
7. **Handoff.** `logic.md` ready → tell operator to run `/coding`.

Notes:
- **No groom creation.** `/logic-converge` does not create the groom file (that's
  `/logic-groom`); if absent, there are simply no fragments. The old
  `# 问题账` skeleton is retired — Open items live in `logic.md` `## 2 Open`.
- **Cross-module dependency handling is coding's job, not converge's.** Under the
  single-conflict lens a missing cross-module contract is a *build-time dependency
  gap*, not a source divergence. `/coding` already owns the stub-vs-block decision
  (AGENTS.md 铁律 8 + the `*.stub.ts` workflow), so converge runs **no** separate
  cross-module predecheck. If a genuine *conflict between sources* happens to
  involve another module, it's converged like any other conflict.

## 8. Gates

- **coding freshness gate** — refuse and tell the operator to run
  `/logic-converge` if any of: `logic.md` missing · groom has `待处理` fragments ·
  `logic.md ## 2 Open` non-empty. Otherwise plan from **all inputs + logic.md**;
  plan tasks reference converged decisions (no `L-n` tags, no status-flips, no
  ledger). Keep the `overview.md` create/update deliverable.
- **submit-work gate** — groom `# 原始碎片` has no `待处理` · `logic.md ## 2 Open`
  empty · stub gate unchanged (`scripts/check-stubs.mjs`). Drop the `# 问题账` gate.

## 9. Full-sweep file changes

**Language policy:** the **new `logic-converge` SKILL and this spec are English**;
existing skills stay Chinese — edits to them are made in Chinese (rename references
+ semantic touch-ups).

**Create (English)**
- `.claude/skills/logic-converge/SKILL.md`

**Retain — operator decision, not deleted** (supersedes the earlier "delete now")
- `.claude/skills/logic-analyze/SKILL.md` — left on disk as a transitional, unwired reference.
- `.claude/skills/logic-analyze/ledger.mjs` — left with its SKILL; nothing outside this dir references it. Deletion deferred to a later cleanup.

**Rewrite (Chinese)**
- `.claude/skills/coding/SKILL.md` — drop all ledger / `L-n` / `logic.items.json`;
  consume **all inputs + logic.md**; new freshness gate (§8); plan tasks reference
  converged decisions (no `L-n` tags, no status-flips); keep the `overview.md`
  deliverable; findings → `/logic-groom` → `/logic-converge` loop.
- `.claude/skills/logic-groom/SKILL.md` — pure fragment capture; **retire
  `# 问题账`** (skeleton = `# 原始碎片` only); Open convergences now live in
  `logic.md`; rename `logic-analyze` → `logic-converge`.
- `.claude/skills/submit-work/SKILL.md` — groom gate = `# 原始碎片` no `待处理`;
  **drop `# 问题账` gate**; **add** `logic.md ## 2 Open` empty gate; remove
  ledger / `logic.items.json` references; keep stub gate; fix the "模块级累积" note
  (logic.md + groom, no logic.items.json).

**Update references (Chinese, rename + small touch-ups)**
- `AGENTS.md` — workflow §4 (logic-analyze → logic-converge, converge semantics,
  drop "唯一交接物"/ledger), §5 (coding: all inputs + logic.md, no ledger), line 14
  (skill name), line 76 note (remove `logic.items.json` + "台账只经 ledger.mjs 改";
  state logic.md is a supplement, module-level, single-writer = logic-converge).
- `.work/workbench.schema.json` — descriptions only (lines 5, 58, 66):
  logic-analyze → logic-converge. **Field structure unchanged.**
- `.claude/context/injections/finishing.md` — groom→logic-analyze→coding loop →
  groom→logic-converge→coding.
- `.claude/context/injections/references/coding-rules/commons.md` — rename.
- `.claude/context/injections/references/coding-rules/module-layout.md` — rename
  (overview.md consumer).
- `.claude/docs/module-overview.md` — rename references; drop the "非 `L-n` 台账项"
  aside (no ledger).
- `apps/web/commons/README.md` — rename.
- `.claude/skills/start-work/SKILL.md` — rename references; the
  `docs_flash_time` / `*_docs` fields note "那是 /logic-converge 的字段".
- `.claude/skills/mock-app/SKILL.md` — rename references (the `logic.md` produced
  by the pass before coding; the re-loop note).

**Excluded**
- `.claude/skills/sync-db-model/SKILL.md` — its "台账" is unrelated (it explicitly
  keeps **no** ledger file). No change.

## 10. Decisions locked (from brainstorming)

| # | Decision |
|---|---|
| Name | `logic-converge` |
| Ledger | **Dropped entirely** — logic.md is a supplement doc, never a task list |
| Scope | **Full sweep** — new skill + coding + submit-work + groom + docs; retire logic-analyze + ledger.mjs |
| Lifecycle | **Cumulative-but-living**, module-level, superseding; sized to divergence surface |
| Incremental | **Keep commit-baseline incremental** (reuse workbench cursors; advance on clean completion only) |
| Taxonomy | **Single "conflict"** lens (subsumes diff; includes blocking silence; drops standalone gap-hunting) |
| `# 问题账` | **Retired** — Open convergences live in `logic.md ## 2 Open` |
| Language | Only new skill + this spec in English; existing skills stay Chinese |
| Delete timing | **Retain** `logic-analyze` + `ledger.mjs` on disk (transitional, unwired); deletion deferred (operator decision, superseding the earlier "delete now") |

## 11. Risks / watch-items

- **Single-writer convention (not enforced).** Nothing physically stops coding/groom
  from editing `logic.md`. Mitigation: state it explicitly in all three skills;
  acceptable because logic.md is no longer a status-tracked queue and git history
  is the backstop.
- **Prototype path is rule-governed and may be empty.** The skill must degrade
  gracefully ("no prototype") when foundation is off / not projected, and must not
  fabricate a path.
- **Baseline vs Open decoupling.** Advancing the baseline while `## Open` items
  remain is intentional (they persist as content). The skill must, when re-diffing
  an area, reconcile against existing Open/Converged entries so nothing is lost.
- **`docs/` is gitignored but force-tracked** in this repo — commit design docs
  with `git add -f`; never `rm -rf` a `docs/` subdir.

## 12. Post-review amendments (adversarial review, 2026-07-02)

Four adversarial subagents reviewed the implemented sweep (terseness, pipeline
correctness, reference integrity, spec fidelity). Fidelity: 12/12 locked decisions
honored. Outcomes:

**Accepted risk (no change, operator decision):**
- **Retained `logic-analyze` is a live, invocable command.** A `SKILL.md` is
  dispatched by its frontmatter, not by who references it — so the earlier
  "unwired" framing was wrong. It writes the same `logic.md` path in ledger format:
  running it clobbers the supplement, and because the hard gates string-match
  `## 2 Open` (absent from ledger files) it **silently passes both the coding and
  submit gates**. Operator elected to **leave it as-is**. Recorded as an accepted
  risk. If revisited: rename its `SKILL.md` (dir stops being a discoverable skill),
  tombstone, or delete.

**Applied fixes:**
- **Cross-module predecheck contradiction** — `.claude/docs/module-overview.md`
  still had `/logic-converge` judge "referenced modules' contract completeness"
  (the retired predecheck). Reworded: converge uses overviews for awareness only;
  contract completeness / stub-vs-block is `/coding`'s (铁律 8).
- **Prune can lose a live decision** — prune a `## 1 Converged` entry only when its
  conflict is gone from the inputs; a decision still bridging a live disagreement is
  kept or superseded, never dropped.
- **Supersede-after-implement** — added a `⟲ re-check impl` tag on revised
  decisions; `/coding` re-verifies shipped code against tagged entries on re-run
  (replaces the old ledger's `需返工` signal).
- **Undecidable Open wedged both gates** — added a non-blocking `## 3 Deferred`
  section (dispositions: 转出 TASK-x / out-of-scope / coding-fallback) so a
  genuinely-deferrable conflict can close the task; gates still block only on
  `## 2 Open`.
- **Zero-conflict deadlock** — converge now always emits `logic.md` (≥ `## 0
  Provenance`) so coding's gate passes on trivial modules.
- **GAP-1** — `AGENTS.md` §6 submit summary now mentions the `## 2 Open` gate.
- **Workflow note** — run `/sync-db-model` before `/logic-converge` when the task
  changes the data model (grounds the data-model input; `mock-app` stays inside
  `/coding`, unchanged).
- **Terseness** — cut recap across the skills (removed the `## I/O contract` block,
  deduped "Never guess" and the supplement framing, dropped rationale/meta tails).

**Confirmed clean by review:** cross-skill section names match exactly; single-writer
stated everywhere; doc-repo path claims verified against the real `pep-webapp-docs`;
no dangling references introduced by the sweep.
