#!/usr/bin/env bash
source "$(dirname "$0")/test-helpers.sh" "agent-malformed-input"

# Capture stdout, stderr, and exit code separately.
STDERR_FILE=$(mktemp)
trap 'rm -f "$STDERR_FILE"' EXIT
OUTPUT=$(printf 'this is not json' | bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/pretooluse-agent.sh" 2>"$STDERR_FILE"; echo "EXIT=$?")
EXIT_CODE=$(printf '%s' "$OUTPUT" | tail -1)
STDOUT=$(printf '%s' "$OUTPUT" | sed '$d')
STDERR=$(cat "$STDERR_FILE")

assert_empty "$STDOUT" "malformed-input stdout"
assert_empty "$STDERR" "malformed-input stderr (jq errors must be silenced)"
[ "$EXIT_CODE" = "EXIT=0" ] || fail "malformed-input exit code: $EXIT_CODE"

pass "Agent hook is no-op on malformed input (no stderr leakage)"
