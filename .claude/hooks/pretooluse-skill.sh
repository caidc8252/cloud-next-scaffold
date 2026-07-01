#!/usr/bin/env bash
set -u

INPUT=$(cat)
INJECTIONS_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/context/injections"
AUDIT_LOG="${CLAUDE_PROJECT_DIR:-.}/.claude/.audit/skill-injections.log"

# shellcheck source=lib-routes.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib-routes.sh"

skill=$(printf '%s' "$INPUT" | jq -r '.tool_input.skill // ""' 2>/dev/null)

files=$(route_skill_to_files "$skill")

mkdir -p "$(dirname "$AUDIT_LOG")" 2>/dev/null || true
{
  printf '%s skill=%s injected=%s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$skill" "${files:-none}"
} >> "$AUDIT_LOG" 2>/dev/null || true

[ -n "$files" ] || exit 0

EXTRA=""
for f in $files; do
  INJECTION_FILE="$INJECTIONS_DIR/$f"
  [ -r "$INJECTION_FILE" ] || continue
  if [ -n "$EXTRA" ]; then
    EXTRA="$EXTRA"$'\n\n'"$(cat "$INJECTION_FILE")"
  else
    EXTRA="$(cat "$INJECTION_FILE")"
  fi
done

[ -n "$EXTRA" ] || exit 0

jq -nc --arg extra "$EXTRA" '
  {hookSpecificOutput: {
    hookEventName: "PreToolUse",
    additionalContext: ("[PROJECT-SPECIFIC ADDITIONS]\n" + $extra)
  }}
'
