"""Agent 7: Performance, Latency & UX Specialist.
"""

from __future__ import annotations

import logging
from typing import Any, Dict
from ai_harness.agents.base_agent import BaseAgent
from ai_harness.core.models import Task
from ai_harness.providers.pool import ProviderPool
from ai_harness.storage.checkpoint_manager import CheckpointManager

logger = logging.getLogger("ai_harness.agents.ux")


class UXPerfEngineerAgent(BaseAgent):
    """Profiles latency budgets, resource saturation, CLI ergonomics, and user experience."""

    def __init__(self):
        super().__init__(
            designation="ux",
            title="Performance, Latency & UX Specialist",
            system_prompt=(
                "You are the Performance and UX Specialist. You analyze system latency, memory efficiency, "
                "algorithmic complexity, command line and dashboard ergonomics, and feedback responsiveness. "
                "You ensure that solutions are lightning-fast and deliver an exceptional developer/user experience."
            ),
        )

    def run_phase(
        self,
        task: Task,
        context: Dict[str, Any],
        provider_pool: ProviderPool,
        checkpoint_mgr: CheckpointManager,
    ) -> Dict[str, Any]:
        self.set_action(f"Evaluating performance metrics and UX for task {task.id}")

        code_artifact = context.get("implementation", {}).get("code_artifact", "")

        prompt = f"""Task: {task.id} - {task.title}

Implementation:
{code_artifact[:1500]}

Evaluate Performance & UX:
1. Computational Complexity (Time & Space asymptotic analysis).
2. Latency Bottlenecks & IO Optimization (memory caching, batching, zero-copy).
3. User & Operator Feedback (progress indicators, clear error diagnostic readability).
4. Concrete performance tuning recommendations.
"""
        response, slot = provider_pool.execute_with_failover(
            prompt,
            system_prompt=self.system_prompt,
        )

        self.set_idle()
        return {
            "status": "success",
            "phase": "ux",
            "perf_report": response,
            "provider_slot": slot.slot_id,
        }
