#!/usr/bin/env bash
set -u

cat >/dev/null  # discard stdin; matcher already determined routing

SKILL_MATCHER="${1:-}"
INJECTIONS_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/context/injections"
AUDIT_LOG="${CLAUDE_PROJECT_DIR:-.}/.claude/.audit/skill-injections.log"

# shellcheck source=lib-routes.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib-routes.sh"

mkdir -p "$(dirname "$AUDIT_LOG")" 2>/dev/null || true

audit() {
  local outcome=$1
  {
    printf '%s skill=%s injected=%s path=user-typed\n' \
      "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$SKILL_MATCHER" "$outcome"
  } >> "$AUDIT_LOG" 2>/dev/null || true
}

[ -n "$SKILL_MATCHER" ] || { audit none; exit 0; }

files=$(route_skill_to_files "$SKILL_MATCHER")
[ -n "$files" ] || { audit none; exit 0; }

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

[ -n "$EXTRA" ] || { audit none; exit 0; }
audit "$files"

jq -nc --arg extra "$EXTRA" '
  {hookSpecificOutput: {
    hookEventName: "UserPromptExpansion",
    additionalContext: ("[PROJECT-SPECIFIC ADDITIONS]\n" + $extra)
  }}
'
