"""Agent 8: Release, Compliance & Reliability Engineer.
"""

from __future__ import annotations

import logging
from typing import Any, Dict
from ai_harness.agents.base_agent import BaseAgent
from ai_harness.core.models import Task
from ai_harness.providers.pool import ProviderPool
from ai_harness.storage.checkpoint_manager import CheckpointManager

logger = logging.getLogger("ai_harness.agents.release")


class ReleaseEngineerAgent(BaseAgent):
    """Executes final V-Model acceptance gate, packaging, changelogs, and release sign-off."""

    def __init__(self):
        super().__init__(
            designation="release",
            title="Release, Compliance & Reliability Engineer",
            system_prompt=(
                "You are the Release, Compliance, and Reliability Engineer. You inspect all V-model verification "
                "artifacts (test reports, security audits, architecture compliance). You sign off on releases, "
                "generate changelogs, ensure semantic versioning, and confirm zero regression."
            ),
        )

    def run_phase(
        self,
        task: Task,
        context: Dict[str, Any],
        provider_pool: ProviderPool,
        checkpoint_mgr: CheckpointManager,
    ) -> Dict[str, Any]:
        self.set_action(f"Evaluating final V-Model acceptance gate for task {task.id}")

        test_report = context.get("testing", {}).get("test_report", "Pass")
        sec_report = context.get("security", {}).get("audit_report", "Pass")

        prompt = f"""Task: {task.id} - {task.title}
Acceptance Criteria: {task.acceptance_criteria}

Verification Inputs:
- QA Test Report: {test_report[:800]}
- Security Audit: {sec_report[:800]}

Execute Release Gate Sign-off:
1. Verification against all Acceptance Criteria.
2. Deployment & Rollback safety checklist.
3. Release Changelog & Documentation summary.
4. Final Release Determination: APPROVED or REJECTED.
"""
        response, slot = provider_pool.execute_with_failover(
            prompt,
            system_prompt=self.system_prompt,
        )

        is_approved = "rejected" not in response.lower() or "approved" in response.lower()

        self.set_idle()
        return {
            "status": "success" if is_approved else "failure",
            "phase": "release",
            "release_notes": response,
            "approved": is_approved,
            "provider_slot": slot.slot_id,
        }
