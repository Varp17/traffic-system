"""Agent 6: Application Security & Threat Auditor.
"""

from __future__ import annotations

import logging
from typing import Any, Dict
from ai_harness.agents.base_agent import BaseAgent
from ai_harness.core.models import Task
from ai_harness.providers.pool import ProviderPool
from ai_harness.storage.checkpoint_manager import CheckpointManager

logger = logging.getLogger("ai_harness.agents.security")


class SecurityAuditorAgent(BaseAgent):
    """Scans code for vulnerabilities, secret exposure, boundary validation, and OWASP compliance."""

    def __init__(self):
        super().__init__(
            designation="security",
            title="Application Security & Threat Auditor",
            system_prompt=(
                "You are the Application Security and Threat Auditor. You analyze implementations and "
                "configurations for security vulnerabilities: OWASP Top 10, CWE weaknesses, API key exposure, "
                "injection vectors, untrusted input boundaries, and race conditions. You enforce deny-by-default."
            ),
        )

    def run_phase(
        self,
        task: Task,
        context: Dict[str, Any],
        provider_pool: ProviderPool,
        checkpoint_mgr: CheckpointManager,
    ) -> Dict[str, Any]:
        self.set_action(f"Auditing security boundaries for task {task.id}")

        code_artifact = context.get("implementation", {}).get("code_artifact", "")

        prompt = f"""Task: {task.id} - {task.title}

Implementation to Audit:
{code_artifact[:1500]}

Conduct Comprehensive Security Audit:
1. Secret Leakage Check (API keys, credentials, hardcoded tokens in repo).
2. Input Validation & Boundary Defense (type validation, range limits, sanitization).
3. Concurrency & Replay Vulnerabilities (atomic guarantees, race prevention).
4. Compliance Determination: PASSED or VULNERABLE with remediation instructions.
"""
        response, slot = provider_pool.execute_with_failover(
            prompt,
            system_prompt=self.system_prompt,
        )

        is_pass = "vulnerable" not in response.lower() or "passed" in response.lower()

        self.set_idle()
        return {
            "status": "success" if is_pass else "failure",
            "phase": "security",
            "audit_report": response,
            "passed": is_pass,
            "provider_slot": slot.slot_id,
        }
