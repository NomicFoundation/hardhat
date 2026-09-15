#!/usr/bin/env bash

# Symlink each .agents/skills/* into .claude/skills/ so Claude Code discovers it.
# Codex uses .agents/skills/ directly like other llms.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

mkdir -p .claude/skills

for dir in .agents/skills/*/; do
  [ -f "$dir/SKILL.md" ] || continue

  name="$(basename "$dir")"

  [ -e ".claude/skills/$name" ] && [ ! -L ".claude/skills/$name" ] && continue

  ln -sfn "../../.agents/skills/$name" ".claude/skills/$name"
done
