#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "uprexp-known-skill"

OUTPUT=$(printf '' | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/userpromptexpansion-skill.sh" "requesting-code-review")

assert_valid_json   "$OUTPUT" "uprexp output"
assert_contains     "$OUTPUT" '"hookEventName":"UserPromptExpansion"' "uprexp output"
assert_contains     "$OUTPUT" '"additionalContext"' "uprexp output"
assert_contains     "$OUTPUT" "scaffold:injection:code-review" "uprexp output"
assert_not_contains "$OUTPUT" '"updatedInput"' "uprexp output"

pass "UserPromptExpansion hook emits additionalContext for known skill"
