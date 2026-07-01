#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "skill-multi-injection"

# brainstorming → brainstorming.md + planning.md (two files, both injected)
INPUT='{"tool_input":{"skill":"superpowers:brainstorming","args":""},"cwd":"."}'
OUTPUT=$(printf '%s' "$INPUT" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-skill.sh")
assert_valid_json   "$OUTPUT" "brainstorming output"
assert_contains     "$OUTPUT" "scaffold:injection:brainstorming" "brainstorming output"
assert_contains     "$OUTPUT" "scaffold:injection:planning"      "brainstorming output"

pass "Skill hook concatenates multiple injection files for brainstorming (brainstorming.md + planning.md)"
