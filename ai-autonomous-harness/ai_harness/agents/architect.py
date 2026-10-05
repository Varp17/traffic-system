"""Agent 3: Chief System Architect & Invariants Designer.
"""

from __future__ import annotations

import logging
from typing import Any, Dict
from ai_harness.agents.base_agent import BaseAgent
from ai_harness.core.models import Task
from ai_harness.providers.pool import ProviderPool
from ai_harness.storage.checkpoint_manager import CheckpointManager

logger = logging.getLogger("ai_harness.agents.architect")


class ArchitectAgent(BaseAgent):
    """Designs module boundaries, API contracts, data models, state invariants, and ADRs."""

    def __init__(self):
        super().__init__(
            designation="architect",
            title="Chief System Architect & Invariants Designer",
            system_prompt=(
                "You are the Chief System Architect. You translate research findings and requirements into "
                "formal architectural specifications, clean component interfaces, immutable data invariants, "
                "and Architectural Decision Records (ADRs). You design for testability and zero data loss."
            ),
        )

    def run_phase(
        self,
        task: Task,
        context: Dict[str, Any],
        provider_pool: ProviderPool,
        checkpoint_mgr: CheckpointManager,
    ) -> Dict[str, Any]:
        self.set_action(f"Designing system architecture and contracts for '{task.title}'")

        research_summary = context.get("research", {}).get("synthesis", "Standard architectural patterns.")

        prompt = f"""Task: {task.id} - {task.title}
Objective: {task.objective}

Research Foundations:
{research_summary[:1200]}

Produce the formal Architectural Specification:
1. Component Boundaries & Responsibilities.
2. Data Flow & Interface Contracts (Types, Inputs, Outputs, Invariants).
3. Concurrency, Atomic State, and Fault Tolerance Rules.
4. Acceptance Criteria mapping for Agent 5 (QA) and Implementation Guide for Agent 4 (Developer).
"""
        response, slot = provider_pool.execute_with_failover(
            prompt,
            system_prompt=self.system_prompt,
        )

        self.set_idle()
        return {
            "status": "success",
            "phase": "architecture",
            "architecture_spec": response,
            "provider_slot": slot.slot_id,
        }
