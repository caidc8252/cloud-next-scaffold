#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "skill-matching-plan"

# writing-plans → planning.md
OUT_PLAN=$(printf '%s' '{"tool_input":{"skill":"superpowers:writing-plans","args":""},"cwd":"."}' \
  | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-skill.sh")
assert_contains "$OUT_PLAN" "scaffold:injection:planning" "writing-plans output"

# systematic-debugging → debugging.md
OUT_DEBUG=$(printf '%s' '{"tool_input":{"skill":"superpowers:systematic-debugging","args":""},"cwd":"."}' \
  | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-skill.sh")
assert_contains "$OUT_DEBUG" "scaffold:injection:debugging" "debugging output"

# verification-before-completion → verification.md
OUT_VERIFY=$(printf '%s' '{"tool_input":{"skill":"superpowers:verification-before-completion","args":""},"cwd":"."}' \
  | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-skill.sh")
assert_contains "$OUT_VERIFY" "scaffold:injection:verification" "verification output"

# test-driven-development → no injection (not in routing table)
OUT_TDD=$(printf '%s' '{"tool_input":{"skill":"superpowers:test-driven-development","args":""},"cwd":"."}' \
  | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-skill.sh")
assert_empty "$OUT_TDD" "tdd output"

pass "Skill hook routes plan/debug/verify skills; tdd injects nothing"
