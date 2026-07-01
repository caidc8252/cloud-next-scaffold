#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "skill-matching-review"

INPUT='{"tool_input":{"skill":"superpowers:requesting-code-review","args":""},"cwd":"."}'
OUTPUT=$(printf '%s' "$INPUT" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-skill.sh")

assert_valid_json "$OUTPUT" "skill hook output"
assert_contains "$OUTPUT" '"additionalContext"' "skill hook output"
assert_contains "$OUTPUT" '"hookEventName":"PreToolUse"' "skill hook output"
assert_contains "$OUTPUT" "[PROJECT-SPECIFIC ADDITIONS]" "skill hook output"
assert_contains "$OUTPUT" "scaffold:injection:code-review" "skill hook output"

pass "Skill hook emits additionalContext for requesting-code-review"
