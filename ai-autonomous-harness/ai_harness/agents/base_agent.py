"""Base Agent interface and execution harness.
"""

from __future__ import annotations

import datetime
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from ai_harness.core.models import AgentState, Task
from ai_harness.providers.pool import ProviderPool
from ai_harness.storage.checkpoint_manager import CheckpointManager

logger = logging.getLogger("ai_harness.agents")


class BaseAgent(ABC):
    """Abstract base agent for SDLC & V-Model phases."""

    def __init__(self, designation: str, title: str, system_prompt: str):
        self.designation = designation
        self.title = title
        self.system_prompt = system_prompt
        self.state = AgentState(
            designation=self.designation,
            title=self.title,
            status="idle",
            current_action="Initialized and ready.",
        )

    def set_action(self, action: str, status: str = "working") -> None:
        self.state.current_action = action
        self.state.status = status
        self.state.last_activity = datetime.datetime.now(datetime.timezone.utc).isoformat()

    def set_idle(self) -> None:
        self.state.current_action = "Standby / Idle"
        self.state.status = "idle"
        self.state.last_activity = datetime.datetime.now(datetime.timezone.utc).isoformat()

    @abstractmethod
    def run_phase(
        self,
        task: Task,
        context: Dict[str, Any],
        provider_pool: ProviderPool,
        checkpoint_mgr: CheckpointManager,
    ) -> Dict[str, Any]:
        """Execute the agent's phase within the V-model. Returns output data and status."""
        pass
