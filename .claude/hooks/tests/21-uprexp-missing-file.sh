#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "uprexp-unknown-skill"

OUTPUT=$(printf '' | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/userpromptexpansion-skill.sh" "no-such-skill"; echo "EXIT=$?")
EXIT_CODE=$(printf '%s' "$OUTPUT" | tail -1)
STDOUT=$(printf '%s' "$OUTPUT" | sed '$d')

assert_empty "$STDOUT" "uprexp unknown-skill stdout"
[ "$EXIT_CODE" = "EXIT=0" ] || fail "uprexp unknown-skill exit code: $EXIT_CODE"

pass "UserPromptExpansion hook is no-op for unknown skill"
