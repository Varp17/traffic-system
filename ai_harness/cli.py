"""Command Line Interface for AI Autonomous Harness.

Provides commands:
  - init: Attach .ai-harness to any project directory
  - attach: Attach harness and automatically analyze & interrogate any project
  - analyze: Run deep project introspection, research interrogation & stage-by-stage advisory
  - run: Start the 8-hour autonomous V-Model multi-agent loop
  - resume: Resume directly from the local checkpoint
  - status: View live state dashboard and agent diagnostics
  - research: Autonomous academic paper scraper & synthesizer
  - checkpoint: Force an immediate atomic checkpoint to disk
"""

from __future__ import annotations

import argparse
import shutil
import sys
import time
from pathlib import Path

from rich.panel import Panel
from rich.table import Table

from ai_harness.config import HarnessConfig
from ai_harness.core.timer import TimeBudgetManager, parse_duration_to_seconds
from ai_harness.intelligence.inspector import ProjectInspector
from ai_harness.intelligence.question_generator import InterrogationEngine
from ai_harness.intelligence.sota_advisor import StageByStageAdvisor
from ai_harness.pipeline.v_model import VModelEngine
from ai_harness.providers.pool import ProviderPool
from ai_harness.research.synthesizer import ResearchSynthesizer
from ai_harness.storage.checkpoint_manager import CheckpointManager
from ai_harness.ui.console import HarnessConsole


def cmd_init(args: argparse.Namespace) -> int:
    target_dir = Path(args.path).resolve()
    console = HarnessConsole()
    console.print_banner()

    console.print_info(f"Initializing AI Autonomous Harness in: {target_dir}")
    checkpoint_mgr = CheckpointManager(target_dir)
    checkpoint_mgr.ensure_layout()

    # Save default config
    cfg = HarnessConfig(project_dir=str(target_dir))
    cfg.save_to_dir(target_dir)

    console.print_success(f"Created harness directory: {checkpoint_mgr.harness_dir}")
    console.print_success("Created 3-tier persistence structure: context/, tasks/, research/, failures/, checkpoints/")
    console.print_info("To start the 8-hour autonomous loop, run:")
    console.console.print(f"  [bold green]ai-harness run --path \"{target_dir}\" --topic \"Your Project Topic\"[/bold green]")
    return 0


def cmd_analyze(args: argparse.Namespace) -> int:
    """Analyze any codebase, generate deep technical questions, and synthesize SOTA guidance."""
    target_dir = Path(args.path).resolve()
    console = HarnessConsole()
    console.print_banner()

    console.print_info(f"Introspecting project architecture: {target_dir}")
    inspector = ProjectInspector(target_dir)
    inspection = inspector.inspect()

    # Render inspection results
    summary_table = Table(title=f"Codebase Introspection: {inspection['project_name']}", expand=True)
    summary_table.add_column("Property", style="bold cyan", width=22)
    summary_table.add_column("Details", style="white")

    summary_table.add_row("Inferred Domain", f"[bold green]{inspection['inferred_domain']}[/bold green]")
    summary_table.add_row("Primary Languages", ", ".join(inspection["primary_languages"]) or "None detected")
    summary_table.add_row("Key Configs Found", ", ".join(inspection["key_files"][:8]) or "None")
    summary_table.add_row("Key Dependencies", ", ".join(inspection["dependencies"][:10]) or "None")

    console.console.print(summary_table)

    # Generate Deep Interrogation Questions
    console.print_info("Generating Deep Project Interrogation Matrix across 6 engineering dimensions...")
    interrogator = InterrogationEngine()
    questions = interrogator.generate_research_questions(inspection)

    q_table = Table(title="Project Interrogation & Deep Research Questions", expand=True)
    q_table.add_column("#", width=4, style="bold cyan")
    q_table.add_column("Dimension", style="bold yellow", width=32)
    q_table.add_column("Deep Research Question", style="italic white")

    for i, q in enumerate(questions, 1):
        q_table.add_row(str(i), q["category"], q["question"])

    console.console.print(q_table)

    # Scrape arXiv/IEEE literature & produce Stage-by-Stage Blueprint
    console.print_info("Scraping arXiv & IEEE/CrossRef literature to produce Stage-by-Stage V-Model Blueprint...")
    checkpoint_mgr = CheckpointManager(target_dir)
    advisor = StageByStageAdvisor(checkpoint_mgr)
    blueprint_path = advisor.produce_full_advisory_blueprint(inspection, questions)

    console.print_success(f"Stage-by-Stage SOTA Blueprint synthesized: {blueprint_path}")
    console.console.print(
        Panel(
            f"[bold green]Complete Engineering Blueprint ready in:[/bold green]\n"
            f"[cyan]{blueprint_path}[/cyan]\n\n"
            f"Review this document for exact requirements, math models, architectural invariants,\n"
            f"testing matrices, security defenses, and commercial applications.",
            title="[bold]Advisory Report Generated[/bold]",
            border_style="green",
        )
    )
    return 0


def cmd_attach(args: argparse.Namespace) -> int:
    """Attach the harness to any target directory and immediately run project analysis."""
    target_dir = Path(args.target).resolve()
    console = HarnessConsole()
    console.print_banner()

    console.print_info(f"Attaching AI Autonomous Harness to: {target_dir}")
    if not target_dir.exists():
        console.print_error(f"Target directory does not exist: {target_dir}")
        return 1

    # 1. Initialize .ai-harness
    checkpoint_mgr = CheckpointManager(target_dir)
    checkpoint_mgr.ensure_layout()
    cfg = HarnessConfig(project_dir=str(target_dir))
    cfg.save_to_dir(target_dir)

    # 2. Copy run_harness.py runner
    current_script = Path(__file__).resolve().parent.parent / "run_harness.py"
    if current_script.is_file():
        shutil.copy(current_script, target_dir / "run_harness.py")
        console.print_success(f"Copied run_harness.py to {target_dir}")

    console.print_success(f"Harness successfully attached to: {target_dir}")

    # 3. Automatically run analyze
    args.path = str(target_dir)
    return cmd_analyze(args)


def cmd_run(args: argparse.Namespace) -> int:
    target_dir = Path(args.path).resolve()
    console = HarnessConsole()
    console.print_banner()

    duration_seconds = parse_duration_to_seconds(args.duration)
    budget_mgr = TimeBudgetManager(budget_seconds=duration_seconds)

    checkpoint_mgr = CheckpointManager(target_dir)
    provider_pool = ProviderPool()

    console.print_info(f"Target Project: {target_dir}")
    console.print_info(f"Time Budget: {budget_mgr.formatted_remaining()} ({duration_seconds}s)")
    console.print_info(f"Autonomous Topic: {args.topic}")
    console.print_info(f"Active Provider Slots: {len(provider_pool.slots)}")

    def _on_step(state):
        console.render_state_dashboard(state)

    engine = VModelEngine(
        checkpoint_mgr=checkpoint_mgr,
        provider_pool=provider_pool,
        budget_manager=budget_mgr,
        on_step_callback=_on_step,
    )

    console.print_success("Starting 10-second atomic checkpoint daemon and 8-agent V-Model loop...")
    engine.run_autonomous_loop(initial_topic=args.topic, max_tasks=args.max_tasks)

    console.print_success("Autonomous session finished cleanly.")
    return 0


def cmd_resume(args: argparse.Namespace) -> int:
    target_dir = Path(args.path).resolve()
    console = HarnessConsole()
    console.print_banner()

    checkpoint_mgr = CheckpointManager(target_dir)
    latest_state = checkpoint_mgr.load_latest_state()

    if not latest_state:
        console.print_error("No existing checkpoint found to resume from.")
        return 1

    console.print_info(f"Resuming Session: {latest_state.session_id}")
    console.print_info(f"Last Known Step: {latest_state.last_successful_step}")

    resume_prompt = checkpoint_mgr.export_resume_prompt(latest_state)
    console.console.print(f"[dim]{resume_prompt}[/dim]")

    budget_mgr = TimeBudgetManager.resume_from_timestamps(
        latest_state.started_at, latest_state.deadline
    )
    provider_pool = ProviderPool()

    def _on_step(state):
        console.render_state_dashboard(state)

    engine = VModelEngine(
        checkpoint_mgr=checkpoint_mgr,
        provider_pool=provider_pool,
        budget_manager=budget_mgr,
        on_step_callback=_on_step,
    )

    engine.run_autonomous_loop(max_tasks=10)
    console.print_success("Resumed session finished cleanly.")
    return 0


def cmd_status(args: argparse.Namespace) -> int:
    target_dir = Path(args.path).resolve()
    console = HarnessConsole()
    console.print_banner()

    checkpoint_mgr = CheckpointManager(target_dir)
    latest_state = checkpoint_mgr.load_latest_state()

    if not latest_state:
        console.print_warning(f"No active or previous harness session found in {target_dir}")
        return 0

    console.render_state_dashboard(latest_state)
    return 0


def cmd_research(args: argparse.Namespace) -> int:
    target_dir = Path(args.path).resolve()
    console = HarnessConsole()
    console.print_banner()

    console.print_info(f"Conducting deep academic research on: '{args.query}'")
    checkpoint_mgr = CheckpointManager(target_dir)
    synthesizer = ResearchSynthesizer(checkpoint_mgr)

    papers = synthesizer.conduct_deep_research(args.query, max_results_per_source=args.limit)
    console.print_success(f"Retrieved and indexed {len(papers)} peer-reviewed papers (arXiv & CrossRef/IEEE)")

    for i, p in enumerate(papers, 1):
        console.console.print(f"[bold cyan]{i}. {p.title}[/bold cyan] ({p.source}, {p.published_date})")
        console.console.print(f"   [dim]{p.url}[/dim]")

    console.print_success(f"Synthesis artifact generated in: {checkpoint_mgr.findings_dir}")
    return 0


def cmd_checkpoint(args: argparse.Namespace) -> int:
    target_dir = Path(args.path).resolve()
    console = HarnessConsole()
    checkpoint_mgr = CheckpointManager(target_dir)
    state = checkpoint_mgr.load_latest_state()
    if not state:
        console.print_error("No state available to checkpoint.")
        return 1

    checkpoint_mgr.save_hot_checkpoint(state)
    console.print_success(f"Atomic checkpoint flushed to: {checkpoint_mgr.current_json}")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="ai-harness",
        description="Autonomous Multi-Agent SDLC/V-Model Execution Harness with 10s Atomic Persistence and 8h Time Budget.",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # init
    p_init = subparsers.add_parser("init", help="Initialize .ai-harness in a project directory")
    p_init.add_argument("--path", default=".", help="Target project directory path (default: current directory)")

    # attach
    p_attach = subparsers.add_parser("attach", help="Attach harness to ANY project and automatically analyze it")
    p_attach.add_argument("target", help="Target project directory to attach harness to")

    # analyze
    p_analyze = subparsers.add_parser("analyze", help="Inspect project, generate deep research questions & stage blueprint")
    p_analyze.add_argument("--path", default=".", help="Target project directory path (default: current directory)")

    # run
    p_run = subparsers.add_parser("run", help="Start the 8-hour autonomous SDLC/V-Model multi-agent loop")
    p_run.add_argument("--path", default=".", help="Target project directory path")
    p_run.add_argument("--duration", default="8h", help="Session budget (e.g. '8h', '480m', '30s', default: 8h)")
    p_run.add_argument("--topic", default="Autonomous Engineering System", help="Core project topic/objective")
    p_run.add_argument("--max-tasks", type=int, default=10, help="Maximum tasks to execute before stopping")

    # resume
    p_resume = subparsers.add_parser("resume", help="Resume from the latest local checkpoint")
    p_resume.add_argument("--path", default=".", help="Target project directory path")

    # status
    p_status = subparsers.add_parser("status", help="Inspect live session dashboard and diagnostics")
    p_status.add_argument("--path", default=".", help="Target project directory path")

    # research
    p_research = subparsers.add_parser("research", help="Scrape and synthesize academic research papers")
    p_research.add_argument("query", help="Academic search query / topic")
    p_research.add_argument("--path", default=".", help="Target project directory path")
    p_research.add_argument("--limit", type=int, default=5, help="Max results per academic engine")

    # checkpoint
    p_chk = subparsers.add_parser("checkpoint", help="Force an immediate atomic checkpoint flush")
    p_chk.add_argument("--path", default=".", help="Target project directory path")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    handlers = {
        "init": cmd_init,
        "attach": cmd_attach,
        "analyze": cmd_analyze,
        "run": cmd_run,
        "resume": cmd_resume,
        "status": cmd_status,
        "research": cmd_research,
        "checkpoint": cmd_checkpoint,
    }

    handler = handlers.get(args.command)
    if handler:
        sys.exit(handler(args))
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
