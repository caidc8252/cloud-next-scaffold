#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "agent-missing-injection"

# Temporarily hide the files by pointing CLAUDE_PROJECT_DIR at a clean dir.
TMP=$(mktemp -d)
mkdir -p "$TMP/.claude/context/injections"   # dir exists but files do not
trap 'rm -rf "$TMP"' EXIT

INPUT='{"tool_input":{"subagent_type":"general-purpose","description":"Review code","prompt":"p"}}'
HOOK="${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-agent.sh"
OUTPUT=$(printf '%s' "$INPUT" | CLAUDE_PROJECT_DIR="$TMP" bash "$HOOK"; echo "EXIT=$?")
EXIT_CODE=$(printf '%s' "$OUTPUT" | tail -1)
STDOUT=$(printf '%s' "$OUTPUT" | sed '$d')

assert_empty "$STDOUT" "missing-file stdout"
[ "$EXIT_CODE" = "EXIT=0" ] || fail "missing-file exit code: $EXIT_CODE"

pass "Agent hook is no-op when injection file is missing"
