#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "skill-unknown"

INPUT='{"tool_input":{"skill":"someplugin:unrelated-skill","args":""},"cwd":"."}'
OUTPUT=$(printf '%s' "$INPUT" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-skill.sh"; echo "EXIT=$?")
EXIT_CODE=$(printf '%s' "$OUTPUT" | tail -1)
STDOUT=$(printf '%s' "$OUTPUT" | sed '$d')

assert_empty "$STDOUT" "unknown-skill stdout"
[ "$EXIT_CODE" = "EXIT=0" ] || fail "unknown-skill exit code: $EXIT_CODE"

pass "Skill hook is no-op for unknown skill identifier"
