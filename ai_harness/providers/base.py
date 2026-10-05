"""Base provider interface for LLM backends.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional


class BaseProvider(ABC):
    """Abstract interface that all LLM provider adapters implement."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key
        self.model = model

    @abstractmethod
    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Execute inference request. Raises ProviderExhaustedError or RuntimeError on failure."""
        pass
