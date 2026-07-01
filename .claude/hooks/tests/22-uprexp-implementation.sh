#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "uprexp-implementation"

# executing-plans and subagent-driven-development both route to implementation.md
for skill in executing-plans subagent-driven-development; do
  OUTPUT=$(printf '' | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/userpromptexpansion-skill.sh" "$skill")

  assert_valid_json   "$OUTPUT" "uprexp output ($skill)"
  assert_contains     "$OUTPUT" '"hookEventName":"UserPromptExpansion"' "uprexp output ($skill)"
  assert_contains     "$OUTPUT" '"additionalContext"'                   "uprexp output ($skill)"
  assert_contains     "$OUTPUT" "scaffold:injection:implementation"     "uprexp output ($skill)"
  assert_not_contains "$OUTPUT" '"updatedInput"'                        "uprexp output ($skill)"
done

# writing-plans injects planning.md; brainstorming injects planning.md + brainstorming.md
for skill in writing-plans brainstorming; do
  OUTPUT=$(printf '' | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/userpromptexpansion-skill.sh" "$skill")
  assert_contains     "$OUTPUT" "scaffold:injection:planning"       "uprexp output ($skill)"
  if [ "$skill" = "brainstorming" ]; then
    assert_contains "$OUTPUT" "scaffold:injection:brainstorming" "uprexp output ($skill)"
  else
    assert_not_contains "$OUTPUT" "scaffold:injection:brainstorming" "uprexp output ($skill)"
  fi
done

pass "UserPromptExpansion injects implementation (exec/impl) and planning (plan/brainstorm)"
