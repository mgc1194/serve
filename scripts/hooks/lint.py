#!/usr/bin/env python3
"""
scripts/hooks/lint.py — runs the appropriate linter for each staged file.

Only linters with matching staged files are executed.
Any linter failure blocks the commit.
"""

import subprocess
import sys
from pathlib import Path

REPO_DIR = Path(
    subprocess.check_output(['git', 'rev-parse', '--show-toplevel']).decode().strip()
)


# ── Staged files ──────────────────────────────────────────────────────────────

def get_staged_files() -> list[str]:
    result = subprocess.run(
        ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM'],
        capture_output=True,
        text=True,
    )
    return [f for f in result.stdout.splitlines() if f]


# ── Filters ───────────────────────────────────────────────────────────────────

def filter_frontend(files: list[str]) -> list[str]:
    return [
        f for f in files
        if f.startswith('frontend/src/') and f.endswith(('.ts', '.tsx'))
    ]


def filter_backend(files: list[str]) -> list[str]:
    return [
        f for f in files
        if f.startswith('backend/') and f.endswith(('.py', '.pyi'))
    ]


# ── Linters ───────────────────────────────────────────────────────────────────

def run(cmd: list[str], cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=cwd)


def lint_frontend(files: list[str]) -> subprocess.CompletedProcess:
    relative = [f.removeprefix('frontend/') for f in files]
    return run(['pnpm', 'eslint', '--max-warnings=0', *relative], cwd=REPO_DIR / 'frontend')


def lint_backend_format(files: list[str]) -> subprocess.CompletedProcess:
    relative = [f.removeprefix('backend/') for f in files]
    return run(['ruff', 'format', '--diff', *relative], cwd=REPO_DIR / 'backend')


def lint_backend_check(files: list[str]) -> subprocess.CompletedProcess:
    relative = [f.removeprefix('backend/') for f in files]
    return run(['ruff', 'check', *relative], cwd=REPO_DIR / 'backend')


# ── Dispatch ──────────────────────────────────────────────────────────────────

def do_linting() -> None:
    staged = get_staged_files()

    todo = {
        'eslint':       (lint_frontend,       filter_frontend(staged)),
        'ruff format':  (lint_backend_format,  filter_backend(staged)),
        'ruff check':   (lint_backend_check,   filter_backend(staged)),
    }

    for name, (linter, files) in todo.items():
        if not files:
            continue
        print(f'→ {name}')
        result = linter(files)
        if result.returncode != 0:
            print(f'✗ {name} failed.')
            sys.exit(1)

    print('✓ All checks passed.')


if __name__ == '__main__':
    do_linting()