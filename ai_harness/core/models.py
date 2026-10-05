"""Core domain models for the AI Autonomous Harness.

These models define the single source of truth stored in .ai-harness/
"""

from __future__ import annotations

import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TaskStatus(str, Enum):
    BACKLOG = "BACKLOG"
    ACTIVE = "ACTIVE"
    BLOCKED = "BLOCKED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class VModelPhase(str, Enum):
    REQUIREMENTS = "requirements"
    RESEARCH = "research"
    ARCHITECTURE = "architecture"
    DETAILED_DESIGN = "detailed_design"
    IMPLEMENTATION = "implementation"
    TESTING = "testing"
    SECURITY = "security"
    UX = "ux"
    RELEASE = "release"


class PipelineState(BaseModel):
    requirements: str = "pending"
    research: str = "pending"
    architecture: str = "pending"
    implementation: str = "pending"
    testing: str = "pending"
    security: str = "pending"
    ux: str = "pending"
    release: str = "pending"

    def to_dict(self) -> Dict[str, str]:
        return self.model_dump()


class AgentDesignation(str, Enum):
    ORCHESTRATOR = "orchestrator"
    RESEARCHER = "researcher"
    ARCHITECT = "architect"
    DEVELOPER = "developer"
    QA = "qa"
    SECURITY = "security"
    UX = "ux"
    RELEASE = "release"


class AgentState(BaseModel):
    designation: str
    title: str
    status: str = "idle"  # "idle", "working", "blocked", "completed"
    last_activity: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    current_action: str = "Awaiting assignment"
    metrics: Dict[str, Any] = Field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()


class GitState(BaseModel):
    branch: str = "main"
    commit: str = "unknown"
    dirty: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()


class ProviderSlotState(BaseModel):
    provider: str
    key_slot: str
    status: str = "available"  # "available", "active", "exhausted", "rate_limited", "expired", "error"
    last_used: Optional[str] = None
    cooldown_until: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()


class KnownFailure(BaseModel):
    id: str
    phase: str
    error_signature: str
    root_cause: str
    failed_strategy: str
    suggested_fix: str
    occurrences: int = 1
    first_seen: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    last_seen: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()


class FailureAttempt(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    task_id: str
    phase: str
    agent: str
    strategy_attempted: str
    error_message: str
    resolution: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()


class ResearchItem(BaseModel):
    id: str
    title: str
    authors: List[str] = Field(default_factory=list)
    abstract: str
    source: str = "arXiv"  # arXiv, IEEE, CrossRef, SemanticScholar, etc.
    url: str
    doi: Optional[str] = None
    published_date: str = ""
    extracted_key_findings: List[str] = Field(default_factory=list)
    citations_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()


class Task(BaseModel):
    id: str
    title: str
    objective: str
    acceptance_criteria: List[str] = Field(default_factory=list)
    status: str = TaskStatus.BACKLOG.value
    current_phase: str = VModelPhase.REQUIREMENTS.value
    created_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    completed_at: Optional[str] = None
    retries: int = 0
    assigned_agent: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()


class SessionState(BaseModel):
    session_id: str
    started_at: str
    deadline: str
    time_remaining_seconds: float = 28800.0
    is_draining: bool = False
    status: str = "RUNNING"  # "RUNNING", "DRAINING", "STOPPED", "COMPLETED"

    current_task: Optional[Dict[str, Any]] = None
    pipeline_state: Dict[str, str] = Field(
        default_factory=lambda: {
            "requirements": "pending",
            "research": "pending",
            "architecture": "pending",
            "implementation": "pending",
            "testing": "pending",
            "security": "pending",
            "ux": "pending",
            "release": "pending",
        }
    )
    last_successful_step: str = "Session initialized"
    git: Dict[str, Any] = Field(default_factory=lambda: {"branch": "main", "commit": "none", "dirty": False})
    agent_states: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    active_provider: Dict[str, str] = Field(
        default_factory=lambda: {"provider": "gemini", "key_slot": "DEFAULT", "status": "active"}
    )
    research_findings: List[str] = Field(default_factory=list)
    known_failures: List[Dict[str, Any]] = Field(default_factory=list)
    failed_strategies: List[str] = Field(default_factory=list)
    decisions: List[str] = Field(default_factory=list)
    next_action: str = "Identify initial requirements and research scope"
    last_checkpoint: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()
