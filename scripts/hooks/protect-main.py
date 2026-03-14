#!/usr/bin/env python3
"""
scripts/hooks/protect_main.py — blocks direct commits to main.
"""

import subprocess
import sys


def main() -> None:
    branch = (
        subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"])
        .decode()
        .strip()
    )

    if branch == "main":
        print("✗ Direct commits to main are not allowed.")
        print("  Create a feature branch and open a pull request.")
        sys.exit(1)


if __name__ == "__main__":
    main()
