#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "finishing-routes-gate"

# finishing-a-development-branch routes to the thin finishing.md gate,
# NOT the full verification.md.

# PreToolUse Skill path
INPUT='{"tool_input":{"skill":"superpowers:finishing-a-development-branch","args":""},"cwd":"."}'
OUTPUT=$(printf '%s' "$INPUT" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-skill.sh")
assert_valid_json   "$OUTPUT" "skill hook output"
assert_contains     "$OUTPUT" '"hookEventName":"PreToolUse"'     "skill hook output"
assert_contains     "$OUTPUT" "scaffold:injection:finishing"     "skill hook output"
assert_not_contains "$OUTPUT" "scaffold:injection:verification"  "skill hook output"

# UserPromptExpansion path
OUTPUT2=$(printf '' | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/userpromptexpansion-skill.sh" finishing-a-development-branch)
assert_valid_json   "$OUTPUT2" "uprexp output"
assert_contains     "$OUTPUT2" '"hookEventName":"UserPromptExpansion"' "uprexp output"
assert_contains     "$OUTPUT2" "scaffold:injection:finishing"          "uprexp output"
assert_not_contains "$OUTPUT2" "scaffold:injection:verification"       "uprexp output"

# Regression: verification-before-completion STILL routes to verification.md
OUTPUT3=$(printf '' | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/userpromptexpansion-skill.sh" verification-before-completion)
assert_contains "$OUTPUT3" "scaffold:injection:verification" "verification-before-completion output"

pass "finishing-a-development-branch routes to finishing.md; verification-before-completion unchanged"
