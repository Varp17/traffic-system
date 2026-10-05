"""Git repository status detector.

Inspects git branch, current commit hash, and dirty status without crashing if git is absent.
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Dict, Any


def get_git_status(repo_dir: Path | str) -> Dict[str, Any]:
    """Retrieve git branch, commit hash, and dirty status.
    Fails safely if directory is not a git repository.
    """
    path = Path(repo_dir)
    result = {
        "branch": "none",
        "commit": "unknown",
        "dirty": False,
        "is_repo": False,
    }

    try:
        # Check if inside git work tree
        is_git = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=path,
            capture_output=True,
            text=True,
            timeout=3,
        )
        if is_git.returncode != 0:
            return result

        result["is_repo"] = True

        # Get branch name
        branch_proc = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=path,
            capture_output=True,
            text=True,
            timeout=3,
        )
        if branch_proc.returncode == 0:
            result["branch"] = branch_proc.stdout.strip()

        # Get short commit hash
        commit_proc = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=path,
            capture_output=True,
            text=True,
            timeout=3,
        )
        if commit_proc.returncode == 0:
            result["commit"] = commit_proc.stdout.strip()

        # Check dirty
        status_proc = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=path,
            capture_output=True,
            text=True,
            timeout=3,
        )
        if status_proc.returncode == 0:
            result["dirty"] = len(status_proc.stdout.strip()) > 0

    except Exception:
        # Git not found, timeout, or permissions error
        pass

    return result
