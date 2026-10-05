"""Provider Pool with multi-key failover and secret sanitization.

Guarantees:
1. Secret hygiene: API keys exist strictly in memory / env vars. Never written to disk.
2. Immediate checkpointing on failure: On 429/quota/error, flushes state before switching.
3. Resume injection: The new slot receives the RESUME CONTEXT prompt.
"""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Tuple

from dotenv import load_dotenv

from ai_harness.core.exceptions import ProviderExhaustedError
from ai_harness.providers.anthropic_provider import AnthropicProvider
from ai_harness.providers.base import BaseProvider
from ai_harness.providers.gemini_provider import GeminiProvider
from ai_harness.providers.mock_provider import MockProvider
from ai_harness.providers.ollama_provider import OllamaProvider
from ai_harness.providers.openai_provider import OpenAIProvider

logger = logging.getLogger("ai_harness.providers.pool")


@dataclass
class KeySlot:
    slot_id: str
    provider_type: str
    model_name: str
    secret_key: Optional[str] = None  # Held in RAM only. NEVER serialized to JSON.
    endpoint_or_host: Optional[str] = None
    status: str = "available"  # available, active, exhausted, rate_limited, error
    cooldown_until: float = 0.0
    failure_count: int = 0
    last_error: Optional[str] = None

    def is_usable(self) -> bool:
        now = time.time()
        if self.status in ("exhausted", "expired"):
            return False
        if self.status == "rate_limited" and now < self.cooldown_until:
            return False
        return True

    def mark_rate_limited(self, cooldown_seconds: float = 60.0, error: str = "") -> None:
        self.status = "rate_limited"
        self.cooldown_until = time.time() + cooldown_seconds
        self.failure_count += 1
        self.last_error = error

    def mark_exhausted(self, error: str = "") -> None:
        self.status = "exhausted"
        self.failure_count += 1
        self.last_error = error

    def to_sanitized_dict(self) -> Dict[str, str]:
        """Returns slot descriptor safe for disk persistence (NO secrets)."""
        return {
            "key_slot": self.slot_id,
            "provider": self.provider_type,
            "status": self.status,
            "last_error": self.last_error or "",
        }


class ProviderPool:
    """Manages an ordered pool of LLM provider key slots with automatic failover."""

    def __init__(self, env_path: Optional[str] = None):
        if env_path and os.path.exists(env_path):
            load_dotenv(env_path)
        else:
            load_dotenv()

        self.slots: List[KeySlot] = []
        self._instances: Dict[str, BaseProvider] = {}
        self._current_slot_idx: int = 0
        self._discover_slots()

    def _discover_slots(self) -> None:
        """Discover configured API keys from environment variables and register slots."""
        # 1. Gemini keys
        for key_var, slot_id in [
            ("GEMINI_API_KEY", "GEMINI_PRIMARY"),
            ("GEMINI_KEY_1", "GEMINI_SLOT_01"),
            ("GEMINI_KEY_2", "GEMINI_SLOT_02"),
            ("GOOGLE_API_KEY", "GEMINI_BACKUP"),
        ]:
            val = os.getenv(key_var)
            if val:
                self.slots.append(
                    KeySlot(slot_id=slot_id, provider_type="gemini", model_name="gemini-1.5-pro", secret_key=val)
                )

        # 2. OpenAI / Compatible keys
        for key_var, slot_id in [
            ("OPENAI_API_KEY", "OPENAI_PRIMARY"),
            ("OPENAI_KEY_1", "OPENAI_SLOT_01"),
            ("OPENAI_KEY_2", "OPENAI_SLOT_02"),
            ("OPENROUTER_API_KEY", "OPENROUTER_SLOT_01"),
        ]:
            val = os.getenv(key_var)
            if val:
                base_url = "https://openrouter.ai/api/v1" if "OPENROUTER" in key_var else "https://api.openai.com/v1"
                self.slots.append(
                    KeySlot(
                        slot_id=slot_id,
                        provider_type="openai",
                        model_name="gpt-4o",
                        secret_key=val,
                        endpoint_or_host=base_url,
                    )
                )

        # 3. Anthropic keys
        for key_var, slot_id in [
            ("ANTHROPIC_API_KEY", "ANTHROPIC_PRIMARY"),
            ("ANTHROPIC_KEY_1", "ANTHROPIC_SLOT_01"),
        ]:
            val = os.getenv(key_var)
            if val:
                self.slots.append(
                    KeySlot(
                        slot_id=slot_id,
                        provider_type="anthropic",
                        model_name="claude-3-5-sonnet-20241022",
                        secret_key=val,
                    )
                )

        # 4. Ollama (offline local)
        ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.slots.append(
            KeySlot(
                slot_id="OLLAMA_LOCAL",
                provider_type="ollama",
                model_name="llama3.2",
                endpoint_or_host=ollama_host,
                status="available",
            )
        )

        # 5. Always include Mock provider for guaranteed deterministic execution & offline testing
        self.slots.append(
            KeySlot(
                slot_id="MOCK_HARNESS_FALLBACK",
                provider_type="mock",
                model_name="mock-engine-v1",
                secret_key="mock",
                status="available",
            )
        )

    def _get_or_create_provider(self, slot: KeySlot) -> BaseProvider:
        if slot.slot_id in self._instances:
            return self._instances[slot.slot_id]

        if slot.provider_type == "gemini":
            inst = GeminiProvider(api_key=slot.secret_key or "", model=slot.model_name)
        elif slot.provider_type == "openai":
            inst = OpenAIProvider(
                api_key=slot.secret_key or "",
                model=slot.model_name,
                base_url=slot.endpoint_or_host or "https://api.openai.com/v1",
            )
        elif slot.provider_type == "anthropic":
            inst = AnthropicProvider(api_key=slot.secret_key or "", model=slot.model_name)
        elif slot.provider_type == "ollama":
            inst = OllamaProvider(host=slot.endpoint_or_host or "http://localhost:11434", model=slot.model_name)
        else:
            inst = MockProvider(model=slot.model_name)

        self._instances[slot.slot_id] = inst
        return inst

    def get_active_slot(self) -> KeySlot:
        """Find the current usable key slot."""
        for _ in range(len(self.slots)):
            slot = self.slots[self._current_slot_idx]
            if slot.is_usable():
                slot.status = "active"
                return slot
            self._current_slot_idx = (self._current_slot_idx + 1) % len(self.slots)

        # If none usable, reset rate-limited cooldowns or use mock fallback
        mock_slot = next((s for s in self.slots if s.provider_type == "mock"), None)
        if mock_slot:
            mock_slot.status = "active"
            return mock_slot

        raise ProviderExhaustedError("all", "none", "All configured provider slots are exhausted.")

    def execute_with_failover(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        on_failure_checkpoint: Optional[Callable[[], None]] = None,
        resume_context_generator: Optional[Callable[[], str]] = None,
    ) -> Tuple[str, KeySlot]:
        """Execute inference with automatic key failover and checkpointing."""
        attempts = 0
        max_attempts = len(self.slots) * 2

        active_slot = self.get_active_slot()
        current_prompt = prompt

        while attempts < max_attempts:
            attempts += 1
            provider = self._get_or_create_provider(active_slot)

            try:
                response = provider.generate(current_prompt, system_prompt=system_prompt)
                return response, active_slot
            except Exception as e:
                err_str = str(e)
                logger.warning(
                    f"Provider slot {active_slot.slot_id} ({active_slot.provider_type}) failed: {err_str}"
                )

                # 1. Save checkpoint immediately on failure
                if on_failure_checkpoint:
                    try:
                        on_failure_checkpoint()
                    except Exception as chk_err:
                        logger.error(f"Failed to save emergency checkpoint: {chk_err}")

                # 2. Mark slot state
                if "429" in err_str or "rate limit" in err_str.lower():
                    active_slot.mark_rate_limited(cooldown_seconds=60.0, error=err_str)
                else:
                    active_slot.mark_exhausted(error=err_str)

                # 3. Select next healthy slot
                self._current_slot_idx = (self._current_slot_idx + 1) % len(self.slots)
                active_slot = self.get_active_slot()
                logger.info(f"Failing over to slot: {active_slot.slot_id} ({active_slot.provider_type})")

                # 4. Inject resume context prompt so new model starts right at checkpoint
                if resume_context_generator:
                    resume_banner = resume_context_generator()
                    current_prompt = f"{resume_banner}\n\n[TASK INSTRUCTION]\n{prompt}"

        raise ProviderExhaustedError("all", "none", "Exhausted all available providers in the failover pool.")

    def get_sanitized_status(self) -> List[Dict[str, str]]:
        """Return slot descriptors without secrets for checkpoint saving."""
        return [slot.to_sanitized_dict() for slot in self.slots]
