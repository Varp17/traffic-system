"""Local Ollama Provider Adapter (offline, zero-cost execution).
"""

from __future__ import annotations

import logging
from typing import Optional
import requests
from ai_harness.providers.base import BaseProvider

logger = logging.getLogger("ai_harness.providers.ollama")


class OllamaProvider(BaseProvider):
    """Integrates with local Ollama server."""

    def __init__(self, host: str = "http://localhost:11434", model: str = "llama3.2"):
        super().__init__(api_key=None, model=model)
        self.host = host.rstrip("/")

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            resp = requests.post(f"{self.host}/api/generate", json=payload, timeout=120)
            if resp.status_code != 200:
                raise RuntimeError(f"Ollama HTTP {resp.status_code}: {resp.text}")

            return resp.json().get("response", "")
        except requests.RequestException as e:
            raise RuntimeError(f"Ollama local connection failed: {e}")
