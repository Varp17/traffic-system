"""Rich Terminal UI & Status Dashboard for AI Autonomous Harness.
"""

from __future__ import annotations

import os
import sys
from typing import Optional
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from ai_harness.core.models import SessionState


class HarnessConsole:
    """Renders formatted tables, status banners, and live progress dashboards."""

    def __init__(self):
        # Configure console with fallback safety for Windows
        self.console = Console(safe_box=True)

    def print_banner(self) -> None:
        title = Text("=== AI AUTONOMOUS HARNESS: V-MODEL / SDLC MULTI-AGENT ENGINE ===", style="bold cyan")
        subtitle = Text("Local-First Persistence | 10-Second Atomic Checkpoint | 8-Hour Budget | arXiv/IEEE Mining", style="dim")
        panel = Panel(
            Text.assemble(title, "\n", subtitle),
            border_style="cyan",
            expand=False,
        )
        self.console.print(panel)

    def render_state_dashboard(self, state: SessionState) -> None:
        """Render a formatted dashboard summarizing the active session state."""
        self.console.print()

        # 1. Header Information
        curr_task = state.current_task or {}
        time_rem = state.time_remaining_seconds
        hours = int(time_rem // 3600)
        mins = int((time_rem % 3600) // 60)
        secs = int(time_rem % 60)
        time_str = f"{hours:02d}h {mins:02d}m {secs:02d}s"

        status_style = "bold green" if state.status == "RUNNING" else ("bold yellow" if state.status == "DRAINING" else "bold blue")

        header_table = Table.grid(padding=(0, 2))
        header_table.add_column(style="bold white")
        header_table.add_column(style="cyan")
        header_table.add_column(style="bold white")
        header_table.add_column(style="magenta")

        header_table.add_row("Session ID:", state.session_id, "Status:", Text(state.status, style=status_style))
        header_table.add_row("Time Remaining:", f"{time_str} (Budget 8h)", "Active Task:", curr_task.get("id", "None"))
        header_table.add_row("Git Commit:", f"{state.git.get('commit', 'none')} ({state.git.get('branch', 'main')})", "Checkpointed:", state.last_checkpoint[-12:])

        self.console.print(Panel(header_table, title="[bold]Session Diagnostics[/bold]", border_style="blue"))

        # 2. V-Model Pipeline Progress
        pipeline_table = Table(title="V-Model / SDLC Phase Status", expand=True, border_style="dim")
        for phase in state.pipeline_state.keys():
            pipeline_table.add_column(phase.capitalize(), justify="center")

        status_cells = []
        for phase, st in state.pipeline_state.items():
            if st == "complete":
                status_cells.append(Text("[COMPLETE]", style="bold green"))
            elif st in ("running", "active"):
                status_cells.append(Text("[RUNNING]", style="bold yellow"))
            elif st == "failed":
                status_cells.append(Text("[FAILED]", style="bold red"))
            else:
                status_cells.append(Text("[PENDING]", style="dim"))

        pipeline_table.add_row(*status_cells)
        self.console.print(pipeline_table)

        # 3. Agents Table
        agent_table = Table(title="Autonomous 8-Agent Team (Active Designations)", expand=True, border_style="dim")
        agent_table.add_column("Agent", style="bold cyan", width=12)
        agent_table.add_column("Designation / Title", style="bold white", width=36)
        agent_table.add_column("Status", width=12)
        agent_table.add_column("Current Action", style="italic")

        for ag_name, ag_data in state.agent_states.items():
            ag_status = ag_data.get("status", "idle")
            st_text = Text(ag_status.upper(), style="green" if ag_status == "working" else "dim")
            agent_table.add_row(
                ag_name,
                ag_data.get("title", ag_name),
                st_text,
                ag_data.get("current_action", "Standby"),
            )

        self.console.print(agent_table)

        # 4. Resilience & Memory Info
        resilience_info = (
            f"Active Key Slot: [bold green]{state.active_provider.get('key_slot')}[/bold green] "
            f"({state.active_provider.get('provider')}) | "
            f"Known Errors Cataloged: [bold yellow]{len(state.known_failures)}[/bold yellow] | "
            f"Blocked Strategies: [bold red]{len(state.failed_strategies)}[/bold red]"
        )
        self.console.print(Panel(resilience_info, title="[bold]Resilience & Failover Status[/bold]", border_style="green"))
        self.console.print()

    def print_success(self, message: str) -> None:
        self.console.print(f"[bold green][OK][/bold green] {message}")

    def print_warning(self, message: str) -> None:
        self.console.print(f"[bold yellow][WARN][/bold yellow] {message}")

    def print_error(self, message: str) -> None:
        self.console.print(f"[bold red][ERR][/bold red] {message}")

    def print_info(self, message: str) -> None:
        self.console.print(f"[bold cyan][INFO][/bold cyan] {message}")
