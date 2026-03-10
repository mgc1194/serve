#!/usr/bin/env sh
# scripts/install-hooks.sh — installs git hooks from scripts/hooks/.
# Run once after cloning: sh scripts/install-hooks.sh

set -e

HOOKS_DIR="$(git rev-parse --show-toplevel)/.git/hooks"
SCRIPTS_DIR="$(git rev-parse --show-toplevel)/scripts/hooks"

# Clear any hooksPath override (e.g. left over from husky) so git uses .git/hooks/
git config --unset core.hooksPath 2>/dev/null || true

for hook in "$SCRIPTS_DIR"/*; do
    name=$(basename "$hook")
    cp "$hook" "$HOOKS_DIR/$name"
    chmod +x "$HOOKS_DIR/$name"
    echo "Installed $name"
done

echo "All hooks installed."
