"""Error recovery, retry coordinator, and failure strategy manager.

Ensures the autonomous loop learns from failures and never repeats known bad strategies.
"""

from __future__ import annotations

import datetime
import logging
from typing import Any, Dict, List, Optional
from ai_harness.core.models import FailureAttempt, KnownFailure, Task
from ai_harness.storage.checkpoint_manager import CheckpointManager

logger = logging.getLogger("ai_harness.pipeline.recovery")


class ErrorRecoveryManager:
    """Tracks failed strategies, manages backoff, and routes errors back up the V-Model."""

    def __init__(self, checkpoint_mgr: CheckpointManager, max_phase_retries: int = 4):
        self.checkpoint_mgr = checkpoint_mgr
        self.max_phase_retries = max_phase_retries

    def handle_phase_failure(
        self,
        task: Task,
        phase: str,
        agent_designation: str,
        strategy_attempted: str,
        error_message: str,
        failed_strategies_list: List[str],
    ) -> Dict[str, Any]:
        """Record attempt, update catalog, increment retry counter, and determine recovery route."""
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        task.retries += 1

        # 1. Append to failed strategies if not already present
        clean_strategy = strategy_attempted.strip()
        if clean_strategy and clean_strategy not in failed_strategies_list:
            failed_strategies_list.append(clean_strategy)

        # 2. Record failure attempt in storage
        attempt = FailureAttempt(
            timestamp=now_iso,
            task_id=task.id,
            phase=phase,
            agent=agent_designation,
            strategy_attempted=clean_strategy or "Standard implementation pass",
            error_message=error_message,
            resolution=f"Route back to address {phase} defect (retry #{task.retries})",
        )
        self.checkpoint_mgr.record_failure_attempt(attempt)

        # 3. Determine routing destination in the V-Model
        # If tests failed -> route back to developer
        # If security failed -> route back to developer with AppSec remediation
        # If developer stuck -> route back to architect to refine spec
        # If architecture stuck -> route back to researcher for alternative algorithms
        if task.retries >= self.max_phase_retries:
            logger.warning(
                f"Task {task.id} exceeded max retries ({self.max_phase_retries}) in phase {phase}. Routing to Architect for redesign."
            )
            route_to_phase = "architecture"
            route_to_agent = "architect"
        elif phase in ("testing", "security", "ux"):
            route_to_phase = "implementation"
            route_to_agent = "developer"
        elif phase == "implementation":
            route_to_phase = "architecture"
            route_to_agent = "architect"
        else:
            route_to_phase = "research"
            route_to_agent = "researcher"

        return {
            "action": "RETRY",
            "retry_count": task.retries,
            "route_to_phase": route_to_phase,
            "route_to_agent": route_to_agent,
            "failure_attempt": attempt.to_dict(),
        }
