#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "skill-output-valid-json"

INPUT='{"tool_input":{"skill":"superpowers:requesting-code-review","args":""},"cwd":"."}'
OUTPUT=$(printf '%s' "$INPUT" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-skill.sh")

assert_valid_json "$OUTPUT" "skill hook output"

pass "Skill hook output is valid JSON"
