#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "agent-output-valid-json"

INPUT='{"tool_input":{"subagent_type":"general-purpose","description":"Review with \"quotes\" and\nnewlines","prompt":"line1\nline2 with \"quote\""}}'
OUTPUT=$(printf '%s' "$INPUT" | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-agent.sh")

assert_valid_json "$OUTPUT" "agent output with quotes/newlines"

pass "Agent hook output is valid JSON even with tricky input"
