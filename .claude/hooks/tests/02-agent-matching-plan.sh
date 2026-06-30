#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "agent-matching-plan"

# Plan agent type → writing-plans → planning.md
INPUT='{"tool_input":{"subagent_type":"Plan","description":"Plan the feature","prompt":"please plan"}}'
OUTPUT=$(printf '%s' "$INPUT" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-agent.sh")
assert_valid_json "$OUTPUT" "Plan output"
assert_contains "$OUTPUT" "scaffold:injection:planning" "Plan output"

# general-purpose with planning description → writing-plans
INPUT2='{"tool_input":{"subagent_type":"general-purpose","description":"Planning rollout","prompt":"plan it"}}'
OUTPUT2=$(printf '%s' "$INPUT2" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-agent.sh")
assert_contains "$OUTPUT2" "scaffold:injection:planning" "general-purpose plan output"

# Debug description → systematic-debugging → debugging.md
INPUT3='{"tool_input":{"subagent_type":"general-purpose","description":"Debug the failing test","prompt":"help debug"}}'
OUTPUT3=$(printf '%s' "$INPUT3" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-agent.sh")
assert_contains "$OUTPUT3" "scaffold:injection:debugging" "debug output"

# Verify description → verification-before-completion → verification.md
INPUT4='{"tool_input":{"subagent_type":"general-purpose","description":"Verify completion","prompt":"verify"}}'
OUTPUT4=$(printf '%s' "$INPUT4" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-agent.sh")
assert_contains "$OUTPUT4" "scaffold:injection:verification" "verify output"

pass "Agent hook routes plan/debug/verify descriptions to correct files"
