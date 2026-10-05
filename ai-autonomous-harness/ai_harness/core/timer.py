"""Time-budget manager for 8-hour autonomous execution cycles.

Ensures execution honors the time budget and manages the graceful drain protocol:
when the 8 hours expire, the harness finishes the in-flight task cleanly,
persists all state, and shuts down without leaving corrupt/partial data.
"""

from __future__ import annotations

import datetime
import re
import time
from typing import Optional


def parse_duration_to_seconds(duration_str: str) -> float:
    """Parse duration string like '8h', '480m', '30s', '1.5h' into seconds.
    If already a numeric string, returns float.
    """
    if isinstance(duration_str, (int, float)):
        return float(duration_str)

    duration_str = str(duration_str).strip().lower()
    if not duration_str:
        return 28800.0  # Default 8 hours

    # Pure number check
    try:
        return float(duration_str)
    except ValueError:
        pass

    match = re.match(r"^([\d.]+)\s*([a-z]+)$", duration_str)
    if not match:
        raise ValueError(f"Invalid duration format: '{duration_str}'. Use e.g. '8h', '30m', '3600s'.")

    val, unit = match.groups()
    amount = float(val)

    if unit in ("h", "hr", "hrs", "hour", "hours"):
        return amount * 3600.0
    elif unit in ("m", "min", "mins", "minute", "minutes"):
        return amount * 60.0
    elif unit in ("s", "sec", "secs", "second", "seconds"):
        return amount
    elif unit in ("d", "day", "days"):
        return amount * 86400.0
    else:
        raise ValueError(f"Unknown time unit '{unit}'. Use 'h', 'm', or 's'.")


class TimeBudgetManager:
    """Manages an execution time budget (e.g. 8 hours) with graceful draining."""

    def __init__(self, budget_seconds: float = 28800.0, started_at: Optional[datetime.datetime] = None):
        self.budget_seconds = budget_seconds
        self.started_at = started_at or datetime.datetime.now(datetime.timezone.utc)
        self.deadline = self.started_at + datetime.timedelta(seconds=self.budget_seconds)
        self._start_monotonic = time.monotonic()
        self._drain_requested = False

    @classmethod
    def from_duration(cls, duration_str: str) -> TimeBudgetManager:
        seconds = parse_duration_to_seconds(duration_str)
        return cls(budget_seconds=seconds)

    @classmethod
    def resume_from_timestamps(cls, started_at_iso: str, deadline_iso: str) -> TimeBudgetManager:
        """Reconstruct budget manager from a checkpoint."""
        try:
            started_at = datetime.datetime.fromisoformat(started_at_iso)
            deadline = datetime.datetime.fromisoformat(deadline_iso)
            now = datetime.datetime.now(datetime.timezone.utc)
            total_budget = (deadline - started_at).total_seconds()
            
            mgr = cls(budget_seconds=max(0.0, total_budget), started_at=started_at)
            mgr.deadline = deadline
            # If deadline is already past, mark draining immediately
            if now >= deadline:
                mgr._drain_requested = True
            return mgr
        except Exception:
            # Fallback to default
            return cls(budget_seconds=28800.0)

    @property
    def elapsed_seconds(self) -> float:
        now = datetime.datetime.now(datetime.timezone.utc)
        return max(0.0, (now - self.started_at).total_seconds())

    @property
    def remaining_seconds(self) -> float:
        now = datetime.datetime.now(datetime.timezone.utc)
        remaining = (self.deadline - now).total_seconds()
        return max(0.0, remaining)

    def is_expired(self) -> bool:
        return self.remaining_seconds <= 0.0

    def is_draining(self) -> bool:
        return self._drain_requested or self.is_expired()

    def request_drain(self) -> None:
        """Mark session for graceful shutdown after current task finishes."""
        self._drain_requested = True

    def formatted_remaining(self) -> str:
        rem = int(self.remaining_seconds)
        hours = rem // 3600
        minutes = (rem % 3600) // 60
        seconds = rem % 60
        return f"{hours:02d}h {minutes:02d}m {seconds:02d}s"

    def formatted_elapsed(self) -> str:
        el = int(self.elapsed_seconds)
        hours = el // 3600
        minutes = (el % 3600) // 60
        seconds = el % 60
        return f"{hours:02d}h {minutes:02d}m {seconds:02d}s"

    def summary(self) -> dict:
        return {
            "started_at": self.started_at.isoformat(),
            "deadline": self.deadline.isoformat(),
            "budget_seconds": self.budget_seconds,
            "elapsed_seconds": round(self.elapsed_seconds, 2),
            "remaining_seconds": round(self.remaining_seconds, 2),
            "formatted_remaining": self.formatted_remaining(),
            "formatted_elapsed": self.formatted_elapsed(),
            "is_draining": self.is_draining(),
            "is_expired": self.is_expired(),
        }
