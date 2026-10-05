"""Agent 5: Staff QA & Test Verification Engineer.
"""

from __future__ import annotations

import logging
from typing import Any, Dict
from ai_harness.agents.base_agent import BaseAgent
from ai_harness.core.models import Task
from ai_harness.providers.pool import ProviderPool
from ai_harness.storage.checkpoint_manager import CheckpointManager

logger = logging.getLogger("ai_harness.agents.qa")


class QAAgent(BaseAgent):
    """Executes V-Model right-wing verification: unit tests, fuzzing, property tests, boundary checks."""

    def __init__(self):
        super().__init__(
            designation="qa",
            title="Staff QA & Test Verification Engineer",
            system_prompt=(
                "You are the Staff QA and Test Verification Engineer. You rigorously test implementations "
                "against acceptance criteria and architectural contracts. You generate unit tests, integration "
                "scenarios, boundary tests, and fuzz inputs to verify that the implementation does not regress."
            ),
        )

    def run_phase(
        self,
        task: Task,
        context: Dict[str, Any],
        provider_pool: ProviderPool,
        checkpoint_mgr: CheckpointManager,
    ) -> Dict[str, Any]:
        self.set_action(f"Verifying implementation and running tests for task {task.id}")

        code_artifact = context.get("implementation", {}).get("code_artifact", "")
        criteria = "\n".join([f"- {c}" for c in task.acceptance_criteria])

        prompt = f"""Task: {task.id} - {task.title}
Acceptance Criteria:
{criteria}

Implementation Under Test:
{code_artifact[:1500]}

Execute Verification:
1. Automated Test Cases (pytest / unittest style).
2. Boundary & Stress Tests (zero values, negative numbers, extreme load).
3. Test Results Evaluation: (Pass/Fail matrix with coverage assessment).
4. Defect Report (if any bugs or unhandled edge cases are found).
"""
        response, slot = provider_pool.execute_with_failover(
            prompt,
            system_prompt=self.system_prompt,
        )

        # Check if test passed
        is_pass = "failed" not in response.lower() or "0 failed" in response.lower()

        self.set_idle()
        return {
            "status": "success" if is_pass else "failure",
            "phase": "testing",
            "test_report": response,
            "passed": is_pass,
            "provider_slot": slot.slot_id,
        }
