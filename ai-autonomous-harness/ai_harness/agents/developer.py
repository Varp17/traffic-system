"""Agent 4: Senior Core Implementation Engineer.
"""

from __future__ import annotations

import logging
from typing import Any, Dict
from ai_harness.agents.base_agent import BaseAgent
from ai_harness.core.models import Task
from ai_harness.providers.pool import ProviderPool
from ai_harness.storage.checkpoint_manager import CheckpointManager

logger = logging.getLogger("ai_harness.agents.developer")


class DeveloperAgent(BaseAgent):
    """Implements production-grade modules, algorithms, and surgical defect repairs."""

    def __init__(self):
        super().__init__(
            designation="developer",
            title="Senior Core Implementation Engineer",
            system_prompt=(
                "You are the Senior Implementation Engineer. You write robust, modular, strictly typed code "
                "conforming to the architecture specification. You handle error states, edge cases, and "
                "performance requirements. When repairing defects, you inspect failure traces and explicitly "
                "avoid repeating previously failed approaches."
            ),
        )

    def run_phase(
        self,
        task: Task,
        context: Dict[str, Any],
        provider_pool: ProviderPool,
        checkpoint_mgr: CheckpointManager,
    ) -> Dict[str, Any]:
        self.set_action(f"Implementing code logic for task {task.id}")

        arch_spec = context.get("architecture", {}).get("architecture_spec", "Follow standard engineering patterns.")
        failure_context = context.get("failure_context")

        prompt = f"""Task: {task.id} - {task.title}
Objective: {task.objective}

Architecture & Contract Specification:
{arch_spec[:1500]}
"""
        if failure_context:
            prompt += f"""
PREVIOUS FAILURE DETECTED:
- Failed Strategy: {failure_context.get('strategy_attempted')}
- Error Trace: {failure_context.get('error_message')}
- Known Pitfall: Do NOT repeat this implementation strategy. Apply an alternative solution.
"""

        prompt += """
Provide the complete implementation:
1. Python/Code Implementation with comprehensive error handling.
2. Type annotations and docstrings.
3. Edge case guards (empty inputs, out-of-bound ranges, timeouts).
"""
        response, slot = provider_pool.execute_with_failover(
            prompt,
            system_prompt=self.system_prompt,
        )

        self.set_idle()
        return {
            "status": "success",
            "phase": "implementation",
            "code_artifact": response,
            "provider_slot": slot.slot_id,
        }
