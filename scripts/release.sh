#!/usr/bin/env bash
# scripts/release.sh — opens (or reuses) a PR merging main into production and
# offers to merge it. Requires the `gh` CLI to be authenticated.
#
# Usage: scripts/release.sh

set -euo pipefail

BASE="production"
HEAD="main"

command -v gh >/dev/null || { echo "gh CLI is required: https://cli.github.com" >&2; exit 1; }

git fetch origin "$BASE" "$HEAD" --quiet

AHEAD=$(git rev-list --count "origin/$BASE..origin/$HEAD")
if [ "$AHEAD" -eq 0 ]; then
    echo "production is already up to date with main. Nothing to release."
    exit 0
fi

echo "Commits going out (origin/$BASE..origin/$HEAD):"
git log "origin/$BASE..origin/$HEAD" --oneline
echo

TITLE="Release: $(date -u +'%Y-%m-%d') ($HEAD -> $BASE)"

OWNER=$(gh repo view --json owner --jq '.owner.login')
PR_URL=$(gh pr list --base "$BASE" --head "$OWNER:$HEAD" --json url --jq '.[0].url')
if [ -n "$PR_URL" ]; then
    echo "Reusing existing PR: $PR_URL"
else
    PR_URL=$(gh pr create --base "$BASE" --head "$HEAD" --title "$TITLE" --body "Automated release PR: merges \`$HEAD\` into \`$BASE\`.")
    echo "Created PR: $PR_URL"
fi

echo
read -r -p "Merge this PR now? [y/N] " CONFIRM
if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    gh pr merge "$PR_URL" --merge
    echo "Merged. Release workflow will tag the new production commit."
else
    echo "Leaving PR open for review: $PR_URL"
fi
