#!/usr/bin/env bash
# Skill-name → injection-file routing (local mirror of next-kit's lib-routes.sh).
route_skill_to_files() {
  local skill=${1#superpowers:}
  skill=${skill#scaffold:}
  case "$skill" in
    writing-plans)                       echo "planning.md" ;;
    executing-plans|subagent-driven-development) echo "implementation.md" ;;
    brainstorming)                       echo "brainstorming.md planning.md" ;;
    systematic-debugging)                echo "debugging.md" ;;
    verification-before-completion)      echo "verification.md" ;;
    finishing-a-development-branch)      echo "finishing.md" ;;
    requesting-code-review|receiving-code-review) echo "code-review.md" ;;
  esac
}
