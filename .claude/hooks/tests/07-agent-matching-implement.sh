#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "agent-matching-implement"

# *implement* description → executing-plans → implementation.md
INPUT='{"tool_input":{"subagent_type":"general-purpose","description":"implement bundle B1","prompt":"please implement"}}'
OUTPUT=$(printf '%s' "$INPUT" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-agent.sh")

assert_valid_json "$OUTPUT" "implement output"
assert_contains "$OUTPUT" "scaffold:injection:implementation" "implement output"

# Variation: "Implement the new feature" (capitalized)
INPUT2='{"tool_input":{"subagent_type":"general-purpose","description":"Implement the new feature","prompt":"go"}}'
OUTPUT2=$(printf '%s' "$INPUT2" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-agent.sh")
assert_contains "$OUTPUT2" "scaffold:injection:implementation" "implement (capitalized) output"

pass "Agent hook routes *implement* descriptions to implementation.md"
