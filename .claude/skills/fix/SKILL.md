---
name: fix
description: Use when a review pass surfaces findings on a green module.
disable-model-invocation: true
---

# /fix

Human findings only — the pipeline already left the branch green; don't re-run or chase lint/test failures.

- **Record, don't fix.** Append each finding to `.work/{id}/findings.md` (`status: open`); accumulate across review passes. Recording never starts a fix.
- **Start the batch only when** the operator says to, OR open findings exceed 10 (then ask the operator first).
- Batch: debug each open finding via `superpowers:systematic-debugging` — sequential; parallel subagents only for findings touching disjoint files.
- Each finding ends `fixed` or `cannot-resolve` (surface it — never drop).
- Don't write back to FeiShu or open a PR — that's `/submit-work`.
