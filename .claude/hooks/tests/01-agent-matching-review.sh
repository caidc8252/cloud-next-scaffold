#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "agent-matching-review"

INPUT='{"tool_input":{"subagent_type":"general-purpose","description":"Review code changes","prompt":"original prompt"}}'

OUTPUT=$(printf '%s' "$INPUT" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-agent.sh")

assert_valid_json "$OUTPUT" "hook output"
assert_contains "$OUTPUT" '"updatedInput"' "hook output"
assert_contains "$OUTPUT" "[PROJECT-SPECIFIC ADDITIONS]" "hook output"
assert_contains "$OUTPUT" "scaffold:injection:code-review" "hook output"
assert_contains "$OUTPUT" "original prompt" "hook output"

pass "Agent hook injects code-review.md for review subagent"
