#!/usr/bin/env bash
set -u
INPUT=$(cat)
INJECTIONS_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/context/injections"
AUDIT_LOG="${CLAUDE_PROJECT_DIR:-.}/.claude/.audit/agent-injections.log"

# shellcheck source=lib-routes.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib-routes.sh"

subagent_type=$(printf '%s' "$INPUT" | jq -r '.tool_input.subagent_type // ""' 2>/dev/null)
description=$(printf '%s' "$INPUT" | jq -r '.tool_input.description // ""' 2>/dev/null)
desc_lower=$(printf '%s' "$description" | tr '[:upper:]' '[:lower:]')

# Map the subagent to a canonical skill name, then reuse the Skill-hook routing.
skill=""
case "$subagent_type" in
  Plan) skill="writing-plans" ;;
  *)
    case "$desc_lower" in
      *review*)                        skill="requesting-code-review" ;;
      *plan*)                          skill="writing-plans" ;;
      *debug*|*"investigate failure"*) skill="systematic-debugging" ;;
      *verif*)                         skill="verification-before-completion" ;;
      *implement*)                     skill="executing-plans" ;;
    esac
    ;;
esac

files=""
[ -n "$skill" ] && files=$(route_skill_to_files "$skill")

mkdir -p "$(dirname "$AUDIT_LOG")" 2>/dev/null || true
{ printf '%s subagent=%s desc=%q skill=%s injected=%s\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$subagent_type" "$description" "${skill:-none}" "${files:-none}"; } \
  >> "$AUDIT_LOG" 2>/dev/null || true

[ -n "$files" ] || exit 0

EXTRA=""
for f in $files; do
  INJECTION_FILE="$INJECTIONS_DIR/$f"
  [ -r "$INJECTION_FILE" ] || continue
  if [ -n "$EXTRA" ]; then EXTRA="$EXTRA"$'\n\n'"$(cat "$INJECTION_FILE")"; else EXTRA="$(cat "$INJECTION_FILE")"; fi
done
[ -n "$EXTRA" ] || exit 0

printf '%s' "$INPUT" | jq -c --arg extra "$EXTRA" '
  {hookSpecificOutput: {
    hookEventName: "PreToolUse",
    updatedInput: (.tool_input | .prompt = (.prompt + "\n\n---\n[PROJECT-SPECIFIC ADDITIONS]\n" + $extra + "\n---"))
  }}
'
