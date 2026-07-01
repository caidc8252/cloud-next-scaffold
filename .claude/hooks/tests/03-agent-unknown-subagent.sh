#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "agent-unknown-subagent"

INPUT='{"tool_input":{"subagent_type":"Explore","description":"Find files","prompt":"locate X"}}'
OUTPUT=$(printf '%s' "$INPUT" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-agent.sh"; echo "EXIT=$?")
EXIT_CODE=$(printf '%s' "$OUTPUT" | tail -1)
STDOUT=$(printf '%s' "$OUTPUT" | sed '$d')

assert_empty "$STDOUT" "unknown-agent stdout"
[ "$EXIT_CODE" = "EXIT=0" ] || fail "unknown-agent exit code: $EXIT_CODE"

pass "Agent hook is no-op for unknown subagent type"
