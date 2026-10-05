"""Google Gemini Provider Adapter.
"""

from __future__ import annotations

import json
import logging
from typing import Optional
import requests
from ai_harness.providers.base import BaseProvider

logger = logging.getLogger("ai_harness.providers.gemini")


class GeminiProvider(BaseProvider):
    """Integrates with Google Gemini via REST API."""

    def __init__(self, api_key: str, model: str = "gemini-1.5-pro"):
        super().__init__(api_key=api_key, model=model)
        self.endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        headers = {"Content-Type": "application/json"}
        contents = []

        if system_prompt:
            contents.append({
                "role": "user",
                "parts": [{"text": f"System Context:\n{system_prompt}\n\nPlease proceed with the instruction below."}]
            })
            contents.append({
                "role": "model",
                "parts": [{"text": "Acknowledged. I will adhere strictly to system context and requirements."}]
            })

        contents.append({
            "role": "user",
            "parts": [{"text": prompt}]
        })

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.2,
                "topP": 0.95,
                "maxOutputTokens": 8192,
            }
        }

        try:
            resp = requests.post(self.endpoint, headers=headers, json=payload, timeout=60)
            if resp.status_code == 429:
                raise RuntimeError(f"Gemini 429 Rate Limited: {resp.text}")
            elif resp.status_code in (401, 403):
                raise RuntimeError(f"Gemini {resp.status_code} Auth/Quota Exhausted: {resp.text}")
            elif resp.status_code != 200:
                raise RuntimeError(f"Gemini HTTP {resp.status_code}: {resp.text}")

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return ""

            parts = candidates[0].get("content", {}).get("parts", [])
            return "".join(part.get("text", "") for part in parts)
        except requests.RequestException as e:
            raise RuntimeError(f"Gemini network error: {e}")
