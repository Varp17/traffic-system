"""V-Model & SDLC Autonomous Pipeline Engine.

Executes continuous task progression across the 8 agents:
Left-wing (Design) -> Implementation -> Right-wing (Verification).
Honors the 8-hour time budget with graceful draining, 10-second atomic checkpointing,
and failure-loop recovery.
"""

from __future__ import annotations

import datetime
import logging
import time
from typing import Any, Callable, Dict, List, Optional

from ai_harness.agents.architect import ArchitectAgent
from ai_harness.agents.developer import DeveloperAgent
from ai_harness.agents.orchestrator import OrchestratorAgent
from ai_harness.agents.qa_engineer import QAAgent
from ai_harness.agents.release_engineer import ReleaseEngineerAgent
from ai_harness.agents.researcher import ResearcherAgent
from ai_harness.agents.security_auditor import SecurityAuditorAgent
from ai_harness.agents.ux_perf_engineer import UXPerfEngineerAgent
from ai_harness.core.git_info import get_git_status
from ai_harness.core.models import (
    SessionState,
    Task,
    TaskStatus,
    VModelPhase,
)
from ai_harness.core.timer import TimeBudgetManager
from ai_harness.pipeline.error_recovery import ErrorRecoveryManager
from ai_harness.providers.pool import ProviderPool
from ai_harness.storage.checkpoint_manager import CheckpointManager

logger = logging.getLogger("ai_harness.pipeline.v_model")


class VModelEngine:
    """Master engine orchestrating the 8-agent SDLC / V-Model loop."""

    def __init__(
        self,
        checkpoint_mgr: CheckpointManager,
        provider_pool: ProviderPool,
        budget_manager: Optional[TimeBudgetManager] = None,
        on_step_callback: Optional[Callable[[SessionState], None]] = None,
    ):
        self.checkpoint_mgr = checkpoint_mgr
        self.provider_pool = provider_pool
        self.timer = budget_manager or TimeBudgetManager(budget_seconds=28800.0)
        self.recovery_mgr = ErrorRecoveryManager(checkpoint_mgr=self.checkpoint_mgr)
        self.on_step_callback = on_step_callback

        # Initialize the 8 specialized agents
        self.agents = {
            "orchestrator": OrchestratorAgent(),
            "researcher": ResearcherAgent(),
            "architect": ArchitectAgent(),
            "developer": DeveloperAgent(),
            "qa": QAAgent(),
            "security": SecurityAuditorAgent(),
            "ux": UXPerfEngineerAgent(),
            "release": ReleaseEngineerAgent(),
        }

        # Initialize or restore session state
        existing_state = self.checkpoint_mgr.load_latest_state()
        if existing_state and existing_state.status != "COMPLETED":
            self.state = existing_state
            # Re-align timer to existing deadline
            self.timer = TimeBudgetManager.resume_from_timestamps(
                self.state.started_at, self.state.deadline
            )
            logger.info(f"Resumed existing session: {self.state.session_id}")
        else:
            self.state = self._init_new_session_state()

        self._update_git_status()

    def _init_new_session_state(self) -> SessionState:
        now_dt = datetime.datetime.now(datetime.timezone.utc)
        now_iso = now_dt.isoformat()
        session_id = f"session-{now_dt.strftime('%Y-%m-%d-%H%M%S')}"

        agent_states = {name: agent.state.to_dict() for name, agent in self.agents.items()}

        active_slot = self.provider_pool.get_active_slot()

        return SessionState(
            session_id=session_id,
            started_at=now_iso,
            deadline=self.timer.deadline.isoformat(),
            time_remaining_seconds=self.timer.remaining_seconds,
            is_draining=False,
            status="RUNNING",
            current_task=None,
            last_successful_step="Harness session initialized",
            agent_states=agent_states,
            active_provider=active_slot.to_sanitized_dict(),
            next_action="Decompose backlog into initial V-Model cycle",
        )

    def _update_git_status(self) -> None:
        git_info = get_git_status(self.checkpoint_mgr.project_dir)
        self.state.git = git_info

    def get_current_session_state(self) -> SessionState:
        """Called by the 10-second background checkpointer."""
        self.state.time_remaining_seconds = round(self.timer.remaining_seconds, 1)
        self.state.is_draining = self.timer.is_draining()
        if self.state.is_draining and self.state.status == "RUNNING":
            self.state.status = "DRAINING"

        # Sync latest agent states
        self.state.agent_states = {name: agent.state.to_dict() for name, agent in self.agents.items()}

        # Sync active provider slot (sanitized)
        try:
            active_slot = self.provider_pool.get_active_slot()
            self.state.active_provider = active_slot.to_sanitized_dict()
        except Exception:
            pass

        return self.state

    def run_v_model_cycle(self, task: Task) -> bool:
        """Execute a complete V-Model cycle for a single task."""
        self.state.current_task = task.to_dict()
        task.status = TaskStatus.ACTIVE.value
        context: Dict[str, Any] = {}

        # Reset pipeline stage indicators
        for phase_key in self.state.pipeline_state:
            self.state.pipeline_state[phase_key] = "pending"

        self._notify_step("Task commenced")

        # -------------------------------------------------------------
        # V-MODEL LEFT WING: Design & Specification
        # -------------------------------------------------------------

        # Stage 1: Requirements & Orchestration (Agent 1: Orchestrator)
        self.state.pipeline_state["requirements"] = "running"
        self.state.next_action = f"Orchestrator decomposing requirements for {task.id}"
        orch_res = self.agents["orchestrator"].run_phase(task, context, self.provider_pool, self.checkpoint_mgr)
        context["orchestration"] = orch_res
        self.state.pipeline_state["requirements"] = "complete"
        self._notify_step("Requirements and scope decomposed")

        # Check time budget
        if self.timer.is_expired():
            self.timer.request_drain()

        # Stage 2: Literature Research & Math Extraction (Agent 2: Researcher)
        self.state.pipeline_state["research"] = "running"
        self.state.next_action = f"Research Scout surveying papers for {task.title}"
        research_res = self.agents["researcher"].run_phase(task, context, self.provider_pool, self.checkpoint_mgr)
        context["research"] = research_res
        self.state.pipeline_state["research"] = "complete"
        self.state.research_findings.append(f"Analyzed {research_res.get('papers_count', 0)} papers on {task.title}")
        self._notify_step("Literature and algorithm baselines surveyed")

        # Stage 3: Architecture & Invariants (Agent 3: Architect)
        self.state.pipeline_state["architecture"] = "running"
        self.state.next_action = f"Architect drafting component contracts and ADR for {task.id}"
        arch_res = self.agents["architect"].run_phase(task, context, self.provider_pool, self.checkpoint_mgr)
        context["architecture"] = arch_res
        self.state.pipeline_state["architecture"] = "complete"
        self.state.decisions.append(f"ADR approved for {task.id} with strict boundary contracts")
        self._notify_step("Architecture and contracts established")

        # -------------------------------------------------------------
        # V-MODEL CENTER & RIGHT WING: Implementation, Verification & Retries
        # -------------------------------------------------------------

        max_recovery_loops = 5
        loop_count = 0
        cycle_successful = False

        while loop_count < max_recovery_loops and not cycle_successful:
            loop_count += 1

            # Stage 4: Implementation (Agent 4: Developer)
            self.state.pipeline_state["implementation"] = "running"
            self.state.next_action = f"Developer implementing module logic (pass {loop_count})"
            dev_res = self.agents["developer"].run_phase(task, context, self.provider_pool, self.checkpoint_mgr)
            context["implementation"] = dev_res
            self.state.pipeline_state["implementation"] = "complete"
            self._notify_step(f"Implementation pass {loop_count} complete")

            # Stage 5: Verification & QA Testing (Agent 5: QA)
            self.state.pipeline_state["testing"] = "running"
            self.state.next_action = f"QA running verification suite for {task.id}"
            qa_res = self.agents["qa"].run_phase(task, context, self.provider_pool, self.checkpoint_mgr)
            context["testing"] = qa_res

            if not qa_res.get("passed", False):
                self.state.pipeline_state["testing"] = "failed"
                logger.warning(f"QA verification failed on pass {loop_count} for task {task.id}")
                recovery = self.recovery_mgr.handle_phase_failure(
                    task=task,
                    phase="testing",
                    agent_designation="qa",
                    strategy_attempted=f"Implementation attempt {loop_count}",
                    error_message=qa_res.get("test_report", "Unit/Integration assertions failed")[:300],
                    failed_strategies_list=self.state.failed_strategies,
                )
                context["failure_context"] = recovery["failure_attempt"]
                self.state.known_failures = self.checkpoint_mgr.get_known_failures()
                self._notify_step(f"QA detected defect — initiating recovery loop {loop_count+1}")
                continue  # Retry with failure context injected

            self.state.pipeline_state["testing"] = "complete"
            self._notify_step("QA verification passed")

            # Stage 6: Security & Boundary Audit (Agent 6: Security Auditor)
            self.state.pipeline_state["security"] = "running"
            self.state.next_action = f"Security Auditor scanning code boundaries for {task.id}"
            sec_res = self.agents["security"].run_phase(task, context, self.provider_pool, self.checkpoint_mgr)
            context["security"] = sec_res

            if not sec_res.get("passed", False):
                self.state.pipeline_state["security"] = "failed"
                logger.warning(f"Security audit flagged vulnerability on pass {loop_count}")
                recovery = self.recovery_mgr.handle_phase_failure(
                    task=task,
                    phase="security",
                    agent_designation="security",
                    strategy_attempted=f"Security scan attempt {loop_count}",
                    error_message=sec_res.get("audit_report", "Boundary validation or secret risk")[:300],
                    failed_strategies_list=self.state.failed_strategies,
                )
                context["failure_context"] = recovery["failure_attempt"]
                self.state.known_failures = self.checkpoint_mgr.get_known_failures()
                self._notify_step("Security flag raised — routing to Developer for remediation")
                continue

            self.state.pipeline_state["security"] = "complete"
            self._notify_step("Security audit cleared")

            # Stage 7: Performance & UX Ergonomics (Agent 7: UX/Perf Engineer)
            self.state.pipeline_state["ux"] = "running"
            self.state.next_action = f"UX/Performance specialist profiling task {task.id}"
            ux_res = self.agents["ux"].run_phase(task, context, self.provider_pool, self.checkpoint_mgr)
            context["ux"] = ux_res
            self.state.pipeline_state["ux"] = "complete"
            self._notify_step("Performance profiling complete")

            # Stage 8: Acceptance & Release (Agent 8: Release Engineer)
            self.state.pipeline_state["release"] = "running"
            self.state.next_action = f"Release engineer conducting acceptance gate sign-off for {task.id}"
            rel_res = self.agents["release"].run_phase(task, context, self.provider_pool, self.checkpoint_mgr)
            context["release"] = rel_res

            if not rel_res.get("approved", True):
                self.state.pipeline_state["release"] = "failed"
                logger.warning("Release gate sign-off rejected.")
                continue

            self.state.pipeline_state["release"] = "complete"
            cycle_successful = True
            self._notify_step("Task approved and released through V-Model")

        # Mark task status
        if cycle_successful:
            task.status = TaskStatus.COMPLETED.value
            task.completed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()
            self.state.last_successful_step = f"Completed task {task.id} through full V-Model"
        else:
            task.status = TaskStatus.FAILED.value
            self.state.last_successful_step = f"Task {task.id} halted after max recovery retries"

        return cycle_successful

    def run_autonomous_loop(self, initial_topic: str = "System Engineering", max_tasks: int = 10) -> None:
        """Main autonomous execution loop running up to the 8-hour budget."""
        # 1. Start 10-second atomic checkpoint daemon
        self.checkpoint_mgr.start_background_checkpointer(
            state_provider=self.get_current_session_state,
            interval_seconds=10.0,
        )

        try:
            backlog, active, completed = self.checkpoint_mgr.load_tasks()

            # Seed initial task if backlog is empty
            if not backlog and not active:
                initial_task = Task(
                    id="TSK-001",
                    title=initial_topic,
                    objective=f"Deep research, architectural design, implementation, and verification for {initial_topic}",
                    acceptance_criteria=[
                        "Rigorous literature grounding from arXiv and IEEE/peer-reviewed sources.",
                        "Architectural contract with strict invariants and error recovery.",
                        "Unit and integration test suites passing with zero regressions.",
                        "OWASP-compliant boundary and security audit sign-off.",
                        "10-second atomic state persistence validation.",
                    ],
                    metadata={"research_query": initial_topic},
                )
                backlog.append(initial_task)
                self.checkpoint_mgr.save_tasks(backlog, active, completed)

            # Process active tasks or pick from backlog
            while True:
                # 1. Check time budget status
                if self.timer.is_draining():
                    logger.info("8-Hour Time Budget expired or drain requested.")
                    self.state.status = "DRAINING"
                    self.state.is_draining = True

                # If draining and no active task is running, gracefully exit
                if self.timer.is_draining() and not active:
                    logger.info("Time budget reached and no active task remains. Gracefully completing session.")
                    break

                # 2. Pick next task
                task_to_run: Optional[Task] = None
                if active:
                    task_to_run = active[0]
                elif backlog and not self.timer.is_draining():
                    task_to_run = backlog.pop(0)
                    active.append(task_to_run)
                    self.checkpoint_mgr.save_tasks(backlog, active, completed)
                else:
                    # No active task and no more backlog (or draining)
                    break

                logger.info(f"Commencing V-Model cycle for task: {task_to_run.id}")
                success = self.run_v_model_cycle(task_to_run)

                # Move from active to completed
                active = [t for t in active if t.id != task_to_run.id]
                completed.append(task_to_run)
                self.checkpoint_mgr.save_tasks(backlog, active, completed)

                # If draining, stop after current task completes!
                if self.timer.is_draining():
                    logger.info("Completed current in-flight task after time budget. Stopping loop.")
                    break

                if len(completed) >= max_tasks:
                    logger.info(f"Target completed task count ({max_tasks}) achieved.")
                    break

            # Mark session complete
            self.state.status = "COMPLETED"
            self.state.next_action = "All scheduled tasks and research completed."

        finally:
            # Cleanly stop background checkpointer with a final flush
            self.checkpoint_mgr.stop_background_checkpointer()
            self._notify_step("Session shutdown complete.")

    def _notify_step(self, message: str) -> None:
        self.state.last_successful_step = message
        if self.on_step_callback:
            try:
                self.on_step_callback(self.state)
            except Exception:
                pass
