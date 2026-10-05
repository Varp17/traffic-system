"""Anthropic Provider Adapter.
"""

from __future__ import annotations

import logging
from typing import Optional
import requests
from ai_harness.providers.base import BaseProvider

logger = logging.getLogger("ai_harness.providers.anthropic")


class AnthropicProvider(BaseProvider):
    """Integrates with Anthropic Claude API."""

    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        super().__init__(api_key=api_key, model=model)
        self.endpoint = "https://api.anthropic.com/v1/messages"

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        payload = {
            "model": self.model,
            "max_tokens": 8192,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            resp = requests.post(self.endpoint, headers=headers, json=payload, timeout=60)
            if resp.status_code == 429:
                raise RuntimeError(f"Anthropic 429 Rate Limited: {resp.text}")
            elif resp.status_code in (401, 403):
                raise RuntimeError(f"Anthropic {resp.status_code} Auth/Quota Exhausted: {resp.text}")
            elif resp.status_code != 200:
                raise RuntimeError(f"Anthropic HTTP {resp.status_code}: {resp.text}")

            data = resp.json()
            content = data.get("content", [])
            return "".join(c.get("text", "") for c in content if c.get("type") == "text")
        except requests.RequestException as e:
            raise RuntimeError(f"Anthropic network error: {e}")
