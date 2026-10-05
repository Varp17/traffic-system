"""Atomic file system operations with fsync guarantee.

Prevents corrupted partial files during power loss, unexpected termination, or crashes.
Follows the pattern:
    target.tmp -> flush() -> os.fsync(fd) -> close() -> os.replace(target.tmp, target)
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any, Union


def atomic_write(
    target_path: Union[Path, str],
    content: str,
    encoding: str = "utf-8",
    max_retries: int = 5,
    retry_delay: float = 0.05,
) -> Path:
    """Atomically writes string content to target_path using a temporary file,
    buffer flush, OS fsync, and atomic rename.
    """
    target = Path(target_path).resolve()
    target.parent.mkdir(parents=True, exist_ok=True)

    # Use a unique PID-thread-timestamp tmp filename in the SAME directory
    # (crucial: must be same filesystem volume for atomic rename)
    tmp_path = target.with_name(f"{target.name}.tmp.{os.getpid()}.{int(time.time() * 1000)}")

    try:
        with open(tmp_path, "w", encoding=encoding, newline="\n") as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())

        # Atomic replacement with retries (for Windows file lock transients)
        for attempt in range(max_retries):
            try:
                os.replace(tmp_path, target)
                break
            except (PermissionError, OSError) as e:
                if attempt == max_retries - 1:
                    raise e
                time.sleep(retry_delay * (2 ** attempt))

        return target
    finally:
        # Cleanup orphan tmp file if it still exists
        if tmp_path.exists():
            try:
                tmp_path.unlink()
            except Exception:
                pass


def atomic_write_json(
    target_path: Union[Path, str],
    data: Any,
    indent: int = 2,
    ensure_ascii: bool = False,
) -> Path:
    """Serialize data to JSON and atomically write to target_path."""
    serialized = json.dumps(data, indent=indent, ensure_ascii=ensure_ascii, default=str)
    return atomic_write(target_path, serialized)


def safe_read_json(target_path: Union[Path, str], default: Any = None) -> Any:
    """Safely reads JSON from target_path. Returns default if file does not exist
    or contains malformed JSON.
    """
    path = Path(target_path)
    if not path.is_file():
        return default

    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default
