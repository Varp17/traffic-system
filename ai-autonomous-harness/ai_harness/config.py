"""Configuration manager for the AI Autonomous Harness.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HarnessConfig(BaseModel):
    project_dir: str = "."
    budget_hours: float = 8.0
    checkpoint_interval_seconds: float = 10.0
    snapshot_interval_seconds: float = 120.0
    max_history_snapshots: int = 50
    max_retries_per_phase: int = 4
    research_sources: List[str] = Field(default_factory=lambda: ["arxiv", "crossref"])
    default_provider: str = "gemini"

    @classmethod
    def load_from_dir(cls, project_dir: Path | str) -> HarnessConfig:
        proj = Path(project_dir).resolve()
        cfg_file = proj / ".ai-harness" / "config.json"
        if cfg_file.is_file():
            try:
                with open(cfg_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return cls(**data)
            except Exception:
                pass
        return cls(project_dir=str(proj))

    def save_to_dir(self, project_dir: Path | str) -> Path:
        proj = Path(project_dir).resolve()
        cfg_file = proj / ".ai-harness" / "config.json"
        cfg_file.parent.mkdir(parents=True, exist_ok=True)
        with open(cfg_file, "w", encoding="utf-8") as f:
            f.write(self.model_dump_json(indent=2))
        return cfg_file
