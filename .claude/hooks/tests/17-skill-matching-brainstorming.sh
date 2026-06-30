#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "skill-matching-brainstorming"

# brainstorming → brainstorming.md + planning.md
OUT=$(printf '%s' '{"tool_input":{"skill":"superpowers:brainstorming","args":""},"cwd":"."}' \
  | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-skill.sh")

assert_valid_json "$OUT" "brainstorming output"
assert_contains "$OUT" "scaffold:injection:brainstorming" "brainstorming output"
assert_contains "$OUT" "scaffold:injection:planning" "brainstorming output"

# writing-plans should NOT inject brainstorming.md
OUT_PLAN=$(printf '%s' '{"tool_input":{"skill":"superpowers:writing-plans","args":""},"cwd":"."}' \
  | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-skill.sh")
assert_not_contains "$OUT_PLAN" "scaffold:injection:brainstorming" "writing-plans output"

pass "brainstorming routes to brainstorming + planning; writing-plans stays decoupled"
