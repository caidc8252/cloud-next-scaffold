#!/usr/bin/env bash
# Run all hook tests under .claude/hooks/tests/[0-9]*.sh.
# Prints a PASS/FAIL summary and exits non-zero on any failure.
set -u
TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

FAILED=0
PASSED=0

shopt -s nullglob
for test_file in "$TESTS_DIR"/[0-9]*.sh; do
  out=$(bash "$test_file" 2>&1)
  status=$?
  echo "$out"
  if [ $status -eq 0 ]; then
    PASSED=$((PASSED + 1))
  else
    echo "FAILED: $test_file"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Hook tests: $PASSED passed, $FAILED failed"
[ "$FAILED" -eq 0 ]
