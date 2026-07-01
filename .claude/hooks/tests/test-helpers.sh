#!/usr/bin/env bash
# Shared helpers for all hook tests. Each test file sources this.
set -u

# CLAUDE_PROJECT_DIR is what the hooks read in production. Point it at the
# repo root so the hooks find .claude/context/injections/, etc.
# tests/ lives at .claude/hooks/tests/ → three levels up = repo root.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
export CLAUDE_PROJECT_DIR="$REPO_ROOT"

# Test name = first arg or the test file's basename.
TEST_NAME="${1:-$(basename "${BASH_SOURCE[1]:-unknown}" .sh)}"

fail() { echo "FAIL [$TEST_NAME]: $*" >&2; exit 1; }
pass() { echo "PASS [$TEST_NAME]: $*"; }

assert_empty() {
  local actual="$1"
  local name="${2:-output}"
  [ -z "$actual" ] || fail "$name is not empty: $actual"
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local name="${3:-output}"
  case "$haystack" in
    *"$needle"*) ;;
    *) fail "$name does not contain: $needle" ;;
  esac
}

assert_not_contains() {
  local haystack="$1"
  local needle="$2"
  local name="${3:-output}"
  case "$haystack" in
    *"$needle"*) fail "$name should not contain: $needle" ;;
  esac
}

assert_valid_json() {
  local input="$1"
  local name="${2:-output}"
  printf '%s' "$input" | jq -e . >/dev/null 2>&1 \
    || fail "$name is not valid JSON: $input"
}
