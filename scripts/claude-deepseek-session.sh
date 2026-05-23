#!/usr/bin/env bash

# Source this file to route Claude Code through DeepSeek only in the current shell.
# It intentionally avoids writing ~/.claude/settings.json or any OAuth files.

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  cat <<'USAGE'
This script must be sourced so it can update only the current terminal session:

  source scripts/claude-deepseek-session.sh

Then run:

  claude

Restore the previous Claude Pro/API environment in this terminal with:

  claude-restore-pro
USAGE
  exit 2
fi

claude_deepseek_save_var() {
  local name="$1"
  local was_set_name="__CLAUDE_DEEPSEEK_WAS_SET_${name}"
  local value_name="__CLAUDE_DEEPSEEK_VALUE_${name}"

  if [[ -v "$name" ]]; then
    printf -v "$was_set_name" '%s' "1"
    printf -v "$value_name" '%s' "${!name}"
  else
    printf -v "$was_set_name" '%s' "0"
    printf -v "$value_name" '%s' ""
  fi
}

claude_deepseek_restore_var() {
  local name="$1"
  local was_set_name="__CLAUDE_DEEPSEEK_WAS_SET_${name}"
  local value_name="__CLAUDE_DEEPSEEK_VALUE_${name}"

  if [[ "${!was_set_name:-0}" == "1" ]]; then
    export "${name}=${!value_name}"
  else
    unset "$name"
  fi

  unset "$was_set_name" "$value_name"
}

claude-restore-pro() {
  local name

  if [[ "${__CLAUDE_DEEPSEEK_SAVED:-0}" != "1" ]]; then
    echo "No Claude Code environment snapshot found in this shell."
    return 0
  fi

  for name in \
    ANTHROPIC_API_KEY \
    ANTHROPIC_AUTH_TOKEN \
    ANTHROPIC_BASE_URL \
    ANTHROPIC_MODEL \
    ANTHROPIC_DEFAULT_OPUS_MODEL \
    ANTHROPIC_DEFAULT_SONNET_MODEL \
    ANTHROPIC_DEFAULT_HAIKU_MODEL \
    ANTHROPIC_SMALL_FAST_MODEL \
    CLAUDE_CODE_SUBAGENT_MODEL \
    CLAUDE_CODE_EFFORT_LEVEL; do
    claude_deepseek_restore_var "$name"
  done

  unset __CLAUDE_DEEPSEEK_SAVED
  unset -f claude_deepseek_save_var claude_deepseek_restore_var
  echo "Claude Code environment restored for this shell."
}

if [[ "${__CLAUDE_DEEPSEEK_SAVED:-0}" != "1" ]]; then
  for name in \
    ANTHROPIC_API_KEY \
    ANTHROPIC_AUTH_TOKEN \
    ANTHROPIC_BASE_URL \
    ANTHROPIC_MODEL \
    ANTHROPIC_DEFAULT_OPUS_MODEL \
    ANTHROPIC_DEFAULT_SONNET_MODEL \
    ANTHROPIC_DEFAULT_HAIKU_MODEL \
    ANTHROPIC_SMALL_FAST_MODEL \
    CLAUDE_CODE_SUBAGENT_MODEL \
    CLAUDE_CODE_EFFORT_LEVEL; do
    claude_deepseek_save_var "$name"
  done

  __CLAUDE_DEEPSEEK_SAVED=1
fi

if [[ -z "${DEEPSEEK_API_KEY:-}" ]]; then
  read -r -s -p "DeepSeek API key: " DEEPSEEK_API_KEY
  echo
fi

if [[ -z "${DEEPSEEK_API_KEY:-}" ]]; then
  echo "DeepSeek API key is required. Nothing changed."
  claude-restore-pro
  return 1
fi

export ANTHROPIC_BASE_URL="${DEEPSEEK_ANTHROPIC_BASE_URL:-https://api.deepseek.com/anthropic}"
export ANTHROPIC_AUTH_TOKEN="$DEEPSEEK_API_KEY"
export ANTHROPIC_MODEL="${DEEPSEEK_CLAUDE_MODEL:-deepseek-v4-pro[1m]}"
export ANTHROPIC_DEFAULT_OPUS_MODEL="${DEEPSEEK_CLAUDE_OPUS_MODEL:-deepseek-v4-pro[1m]}"
export ANTHROPIC_DEFAULT_SONNET_MODEL="${DEEPSEEK_CLAUDE_SONNET_MODEL:-deepseek-v4-pro[1m]}"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="${DEEPSEEK_CLAUDE_HAIKU_MODEL:-deepseek-v4-flash}"
export ANTHROPIC_SMALL_FAST_MODEL="${DEEPSEEK_CLAUDE_HAIKU_MODEL:-deepseek-v4-flash}"
export CLAUDE_CODE_SUBAGENT_MODEL="${DEEPSEEK_CLAUDE_SUBAGENT_MODEL:-deepseek-v4-flash}"
export CLAUDE_CODE_EFFORT_LEVEL="${DEEPSEEK_CLAUDE_EFFORT_LEVEL:-max}"

# Claude Code uses ANTHROPIC_API_KEY as an Anthropic x-api-key override.
# DeepSeek's Anthropic-compatible endpoint expects the bearer token instead.
unset ANTHROPIC_API_KEY

echo "Claude Code now uses DeepSeek in this shell."
echo "Run 'claude-restore-pro' or close this terminal to return to the previous Claude environment."
