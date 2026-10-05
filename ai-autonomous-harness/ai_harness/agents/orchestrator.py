"""Agent 1: Lead Orchestrator & V-Model Conductor.
"""

from __future__ import annotations

import logging
from typing import Any, Dict
from ai_harness.agents.base_agent import BaseAgent
from ai_harness.core.models import Task
from ai_harness.providers.pool import ProviderPool
from ai_harness.storage.checkpoint_manager import CheckpointManager

logger = logging.getLogger("ai_harness.agents.orchestrator")


class OrchestratorAgent(BaseAgent):
    """Coordinates lifecycle, plans V-model stages, evaluates task health, and enforces gates."""

    def __init__(self):
        super().__init__(
            designation="orchestrator",
            title="Lead Orchestrator & V-Model Conductor",
            system_prompt=(
                "You are the Lead Orchestrator and V-Model Conductor for an autonomous engineering system. "
                "Your objective is to direct the SDLC cycle, break down complex tasks, verify that gates "
                "are met before transitioning phases, and coordinate seamless recovery when defects emerge."
            ),
        )

    def run_phase(
        self,
        task: Task,
        context: Dict[str, Any],
        provider_pool: ProviderPool,
        checkpoint_mgr: CheckpointManager,
    ) -> Dict[str, Any]:
        self.set_action(f"Planning V-Model lifecycle for task {task.id}: {task.title}")

        prompt = f"""Task: {task.id} - {task.title}
Objective: {task.objective}
Acceptance Criteria: {task.acceptance_criteria}

Analyze this task and output:
1. Scope decomposition across the V-Model.
2. Left-wing design requirements (Research & Architecture).
3. Right-wing verification checkpoints (Unit, Integration, Security).
4. Initial action item for Agent 2 (Research Scout).
"""
        response, slot = provider_pool.execute_with_failover(
            prompt,
            system_prompt=self.system_prompt,
        )

        self.set_idle()
        return {
            "status": "success",
            "phase": "orchestration",
            "plan": response,
            "provider_slot": slot.slot_id,
        }
