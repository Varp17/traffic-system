"""OpenAI and OpenAI-compatible Provider Adapter (OpenAI, OpenRouter, Groq, DeepSeek).
"""

from __future__ import annotations

import json
import logging
from typing import Optional
import requests
from ai_harness.providers.base import BaseProvider

logger = logging.getLogger("ai_harness.providers.openai")


class OpenAIProvider(BaseProvider):
    """Integrates with OpenAI-compatible endpoints."""

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o",
        base_url: str = "https://api.openai.com/v1",
    ):
        super().__init__(api_key=api_key, model=model)
        self.base_url = base_url.rstrip("/")

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2,
        }

        try:
            resp = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60,
            )
            if resp.status_code == 429:
                raise RuntimeError(f"OpenAI 429 Rate Limited: {resp.text}")
            elif resp.status_code in (401, 403):
                raise RuntimeError(f"OpenAI {resp.status_code} Auth/Quota Exhausted: {resp.text}")
            elif resp.status_code != 200:
                raise RuntimeError(f"OpenAI HTTP {resp.status_code}: {resp.text}")

            data = resp.json()
            choices = data.get("choices", [])
            if not choices:
                return ""
            return choices[0].get("message", {}).get("content", "")
        except requests.RequestException as e:
            raise RuntimeError(f"OpenAI network error: {e}")
