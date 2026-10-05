"""Local-first Checkpoint Manager.

Implements the 3-tier persistence architecture:
1. HOT STATE: .ai-harness/context/current.json & current.md (10-second atomic flush)
2. SESSION HISTORY: .ai-harness/context/history/ snapshots with retention pruning
3. PERMANENT KNOWLEDGE: tasks/, research/, failures/, session.json

Guarantees that the disk is the single source of truth and AI models/keys are disposable.
"""

from __future__ import annotations

import datetime
import json
import logging
import os
import threading
import time
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Union

from ai_harness.core.models import (
    FailureAttempt,
    KnownFailure,
    ResearchItem,
    SessionState,
    Task,
)
from ai_harness.storage.atomic import atomic_write, atomic_write_json, safe_read_json

logger = logging.getLogger("ai_harness.storage")


class CheckpointManager:
    """Manages the .ai-harness/ repository state, atomic writes, and background sync."""

    def __init__(self, project_dir: Union[Path, str]):
        self.project_dir = Path(project_dir).resolve()
        self.harness_dir = self.project_dir / ".ai-harness"

        # 3-tier directories
        self.context_dir = self.harness_dir / "context"
        self.agents_dir = self.context_dir / "agents"
        self.history_dir = self.context_dir / "history"

        self.tasks_dir = self.harness_dir / "tasks"
        self.research_dir = self.harness_dir / "research"
        self.findings_dir = self.research_dir / "findings"
        self.papers_dir = self.research_dir / "papers"

        self.failures_dir = self.harness_dir / "failures"
        self.checkpoints_dir = self.harness_dir / "checkpoints"

        # Key filepaths
        self.current_json = self.context_dir / "current.json"
        self.current_md = self.context_dir / "current.md"
        self.session_json = self.harness_dir / "session.json"
        self.latest_checkpoint = self.checkpoints_dir / "latest.json"
        self.backlog_file = self.tasks_dir / "backlog.json"
        self.active_file = self.tasks_dir / "active.json"
        self.completed_file = self.tasks_dir / "completed.json"
        self.known_errors_file = self.failures_dir / "known-errors.json"
        self.attempts_file = self.failures_dir / "attempts.jsonl"
        self.sources_file = self.research_dir / "sources.jsonl"

        # Background checkpointing
        self._bg_thread: Optional[threading.Thread] = None
        self._bg_stop_event = threading.Event()
        self._state_provider: Optional[Callable[[], SessionState]] = None
        self._last_snapshot_time = 0.0
        self._max_history_snapshots = 50

        # Initialize layout
        self.ensure_layout()

    def ensure_layout(self) -> None:
        """Create all required directories and default seed files if missing."""
        dirs = [
            self.context_dir,
            self.agents_dir,
            self.history_dir,
            self.tasks_dir,
            self.research_dir,
            self.findings_dir,
            self.papers_dir,
            self.failures_dir,
            self.checkpoints_dir,
        ]
        for d in dirs:
            d.mkdir(parents=True, exist_ok=True)

        # Seed defaults if not present
        if not self.backlog_file.exists():
            atomic_write_json(self.backlog_file, [])
        if not self.active_file.exists():
            atomic_write_json(self.active_file, [])
        if not self.completed_file.exists():
            atomic_write_json(self.completed_file, [])
        if not self.known_errors_file.exists():
            atomic_write_json(self.known_errors_file, [])
        if not self.attempts_file.exists():
            atomic_write(self.attempts_file, "")
        if not self.sources_file.exists():
            atomic_write(self.sources_file, "")

    # =========================================================================
    # 1. HOT STATE PERSISTENCE (Every 10 seconds)
    # =========================================================================

    def save_hot_checkpoint(self, state: SessionState) -> None:
        """Atomically saves the 10-second hot state to current.json, current.md,
        agents/<agent>.json, and checkpoints/latest.json.
        """
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        state.last_checkpoint = now_iso
        data = state.to_dict()

        # 1. Atomic write to current.json
        atomic_write_json(self.current_json, data)

        # 2. Write checkpoints/latest.json
        atomic_write_json(self.latest_checkpoint, data)

        # 3. Generate human-readable current.md
        md_content = self.render_executive_markdown(state)
        atomic_write(self.current_md, md_content)

        # 4. Save individual agent states to context/agents/<designation>.json
        for designation, a_state in state.agent_states.items():
            agent_file = self.agents_dir / f"{designation}.json"
            atomic_write_json(agent_file, a_state)

        # 5. Periodically record snapshots (history)
        self._record_history_snapshot_if_due(data)

    def _record_history_snapshot_if_due(self, data: Dict[str, Any], interval_seconds: float = 120.0) -> None:
        """Record periodic snapshot into context/history/ and prune oldest files."""
        now = time.time()
        if now - self._last_snapshot_time < interval_seconds:
            return

        self._last_snapshot_time = now
        timestamp_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S")
        snapshot_file = self.history_dir / f"{timestamp_str}.json"
        atomic_write_json(snapshot_file, data)

        # Prune old snapshots to prevent millions of files
        self._prune_history_snapshots()

    def _prune_history_snapshots(self) -> None:
        """Retain only the most recent snapshots."""
        try:
            snapshots = sorted(self.history_dir.glob("*.json"), key=lambda p: p.stat().st_mtime)
            if len(snapshots) > self._max_history_snapshots:
                to_delete = snapshots[: -self._max_history_snapshots]
                for p in to_delete:
                    try:
                        p.unlink()
                    except Exception:
                        pass
        except Exception as e:
            logger.warning(f"Error during history snapshot pruning: {e}")

    # =========================================================================
    # 2. BACKGROUND 10-SECOND CHECKPOINTER THREAD
    # =========================================================================

    def start_background_checkpointer(
        self,
        state_provider: Callable[[], SessionState],
        interval_seconds: float = 10.0,
    ) -> None:
        """Start a daemon thread that executes atomic checkpoints every 10 seconds."""
        self._state_provider = state_provider
        self._bg_stop_event.clear()

        def _loop():
            logger.info(f"Started 10-second atomic checkpoint daemon (interval={interval_seconds}s)")
            while not self._bg_stop_event.is_set():
                start_t = time.time()
                try:
                    if self._state_provider:
                        curr_state = self._state_provider()
                        self.save_hot_checkpoint(curr_state)
                except Exception as ex:
                    logger.error(f"Error in background checkpoint daemon: {ex}")

                # Sleep until next interval or stop event
                elapsed = time.time() - start_t
                sleep_time = max(0.1, interval_seconds - elapsed)
                self._bg_stop_event.wait(timeout=sleep_time)

        self._bg_thread = threading.Thread(target=_loop, name="HarnessCheckpointDaemon", daemon=True)
        self._bg_thread.start()

    def stop_background_checkpointer(self) -> None:
        """Signal background thread to stop and execute one final synchronous checkpoint."""
        if self._bg_thread and self._bg_thread.is_alive():
            self._bg_stop_event.set()
            self._bg_thread.join(timeout=3.0)

        # Perform final synchronous flush
        if self._state_provider:
            try:
                final_state = self._state_provider()
                self.save_hot_checkpoint(final_state)
                logger.info("Final synchronous checkpoint flushed successfully.")
            except Exception as e:
                logger.error(f"Failed to flush final checkpoint: {e}")

    # =========================================================================
    # 3. TASKS & QUEUE PERSISTENCE
    # =========================================================================

    def load_tasks(self) -> tuple[List[Task], List[Task], List[Task]]:
        """Load backlog, active, and completed task lists from disk."""
        backlog_raw = safe_read_json(self.backlog_file, [])
        active_raw = safe_read_json(self.active_file, [])
        completed_raw = safe_read_json(self.completed_file, [])

        backlog = [Task(**t) for t in backlog_raw]
        active = [Task(**t) for t in active_raw]
        completed = [Task(**t) for t in completed_raw]
        return backlog, active, completed

    def save_tasks(self, backlog: List[Task], active: List[Task], completed: List[Task]) -> None:
        """Save tasks atomically to disk."""
        atomic_write_json(self.backlog_file, [t.to_dict() for t in backlog])
        atomic_write_json(self.active_file, [t.to_dict() for t in active])
        atomic_write_json(self.completed_file, [t.to_dict() for t in completed])

    # =========================================================================
    # 4. FAILURES & ATTEMPTS PERSISTENCE
    # =========================================================================

    def record_failure_attempt(self, attempt: FailureAttempt) -> None:
        """Append failure attempt to attempts.jsonl and update known-errors.json."""
        line = json.dumps(attempt.to_dict(), default=str) + "\n"
        with open(self.attempts_file, "a", encoding="utf-8") as f:
            f.write(line)
            f.flush()

        # Update known errors catalog
        known = safe_read_json(self.known_errors_file, [])
        found = False
        for k in known:
            if k.get("phase") == attempt.phase and k.get("failed_strategy") == attempt.strategy_attempted:
                k["occurrences"] = k.get("occurrences", 1) + 1
                k["last_seen"] = attempt.timestamp
                found = True
                break

        if not found:
            new_failure = KnownFailure(
                id=f"ERR-{len(known)+1:03d}",
                phase=attempt.phase,
                error_signature=attempt.error_message[:120],
                root_cause=attempt.error_message,
                failed_strategy=attempt.strategy_attempted,
                suggested_fix=attempt.resolution or "Evaluate alternative algorithm or consult research papers",
                occurrences=1,
                first_seen=attempt.timestamp,
                last_seen=attempt.timestamp,
            )
            known.append(new_failure.to_dict())

        atomic_write_json(self.known_errors_file, known)

    def get_known_failures(self) -> List[Dict[str, Any]]:
        return safe_read_json(self.known_errors_file, [])

    # =========================================================================
    # 5. RESEARCH & PAPERS PERSISTENCE
    # =========================================================================

    def record_research_source(self, item: ResearchItem, raw_text: Optional[str] = None) -> None:
        """Store research metadata in sources.jsonl and full paper brief in papers/<id>.json."""
        # Append to sources.jsonl
        line = json.dumps(item.to_dict(), default=str) + "\n"
        with open(self.sources_file, "a", encoding="utf-8") as f:
            f.write(line)
            f.flush()

        # Save individual paper document
        paper_file = self.papers_dir / f"{item.id}.json"
        atomic_write_json(paper_file, item.to_dict())

        if raw_text:
            text_file = self.papers_dir / f"{item.id}.txt"
            atomic_write(text_file, raw_text)

    def save_research_finding(self, filename: str, content: str) -> Path:
        """Save synthesized finding or review document in research/findings/."""
        if not filename.endswith((".md", ".json", ".txt")):
            filename += ".md"
        target = self.findings_dir / filename
        return atomic_write(target, content)

    # =========================================================================
    # 6. SESSION RECOVERY & RESUME CONTEXT
    # =========================================================================

    def load_latest_state(self) -> Optional[SessionState]:
        """Load state from current.json with fallbacks to latest.json and history."""
        # 1. Try current.json
        raw = safe_read_json(self.current_json)
        if raw and isinstance(raw, dict) and "session_id" in raw:
            try:
                return SessionState(**raw)
            except Exception:
                pass

        # 2. Try latest_checkpoint
        raw = safe_read_json(self.latest_checkpoint)
        if raw and isinstance(raw, dict) and "session_id" in raw:
            try:
                return SessionState(**raw)
            except Exception:
                pass

        # 3. Try latest history file
        snapshots = sorted(self.history_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
        for s in snapshots:
            raw = safe_read_json(s)
            if raw and isinstance(raw, dict) and "session_id" in raw:
                try:
                    return SessionState(**raw)
                except Exception:
                    continue

        return None

    def export_resume_prompt(self, state: SessionState) -> str:
        """Format the exact checkpoint resumption prompt required when switching
        API keys, models, or restarting processes.
        """
        curr_task = state.current_task or {}
        task_id = curr_task.get("id", "UNASSIGNED")
        task_status = curr_task.get("status", "PENDING")
        task_obj = curr_task.get("objective", "None")

        completed_phases = [p.capitalize() for p, s in state.pipeline_state.items() if s == "complete"]
        running_phase = next((p.capitalize() for p, s in state.pipeline_state.items() if s in ("running", "active")), "None")

        known_errors_summary = "\n".join(
            [f"- [{f.get('phase', 'general')}] {f.get('failed_strategy', '')}: {f.get('error_signature', '')}" for f in state.known_failures[:5]]
        ) or "None recorded yet."

        failed_strategies_summary = "\n".join([f"- {s}" for s in state.failed_strategies[:5]]) or "None."

        return f"""RESUME FROM LOCAL CHECKPOINT

Session: {state.session_id}
Status: {state.status}
Time Remaining: {int(state.time_remaining_seconds // 3600)}h {int((state.time_remaining_seconds % 3600) // 60)}m

Current task: {task_id} ({task_status})
Objective: {task_obj}
Current phase: {running_phase}

Completed:
{chr(10).join([f"✓ {p}" for p in completed_phases]) if completed_phases else "None yet"}

Current in-flight:
→ {running_phase}

Known failures:
{known_errors_summary}

Failed strategies (DO NOT REPEAT):
{failed_strategies_summary}

Last git commit:
{state.git.get('commit', 'unknown')} (branch: {state.git.get('branch', 'main')}, dirty: {state.git.get('dirty', False)})

Next required action:
{state.next_action}

CRITICAL INSTRUCTIONS:
- Do NOT restart the task from the beginning.
- Do NOT repeat failed strategies listed above.
- Continue execution from this local checkpoint.
"""

    def render_executive_markdown(self, state: SessionState) -> str:
        """Generate human-readable current.md snapshot."""
        curr_task = state.current_task or {}
        time_rem_str = f"{int(state.time_remaining_seconds // 3600)}h {int((state.time_remaining_seconds % 3600) // 60)}m {int(state.time_remaining_seconds % 60)}s"

        pipeline_rows = "\n".join([f"| **{phase.capitalize()}** | `{status.upper()}` |" for phase, status in state.pipeline_state.items()])

        agent_rows = "\n".join(
            [
                f"| `{ag}` | **{data.get('title', ag)}** | `{data.get('status', 'idle')}` | {data.get('current_action', '')} |"
                for ag, data in state.agent_states.items()
            ]
        )

        return f"""# Autonomous SDLC / V-Model Harness — Live State Snapshot

> **Last Atomic Checkpoint:** `{state.last_checkpoint}`  
> **Session ID:** `{state.session_id}`  
> **Status:** `{state.status}` (Draining: `{state.is_draining}`)  
> **Time Remaining:** `{time_rem_str}`  

---

## 1. Active Task & SDLC Pipeline

**Current Task:** `{curr_task.get('id', 'N/A')}` — *{curr_task.get('title', 'Awaiting Task')}*  
**Objective:** {curr_task.get('objective', 'No objective defined')}  
**Next Required Action:** {state.next_action}  

### V-Model Stage Status
| Phase | Status |
| :--- | :--- |
{pipeline_rows}

---

## 2. Multi-Agent Team Status (6-9 Designations)

| Agent | Role Designation | Status | Current Action |
| :--- | :--- | :--- | :--- |
{agent_rows}

---

## 3. Resilience, Failures & Git

- **Active Provider Slot:** `{state.active_provider.get('provider', 'none')}` / `{state.active_provider.get('key_slot', 'none')}` (`{state.active_provider.get('status', 'none')}`)
- **Git State:** Branch `{state.git.get('branch', 'unknown')}` | Commit `{state.git.get('commit', 'unknown')}` | Dirty: `{state.git.get('dirty', False)}`
- **Known Failure Patterns:** {len(state.known_failures)} registered
- **Failed Strategies Cataloged:** {len(state.failed_strategies)} strategies blocked from repetition

---
*Generated automatically by AI Autonomous Harness 10-second atomic persistence engine.*
"""
