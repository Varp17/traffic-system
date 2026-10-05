"""Agent 2: Principal Research Scout & Literature Miner.
"""

from __future__ import annotations

import logging
from typing import Any, Dict
from ai_harness.agents.base_agent import BaseAgent
from ai_harness.core.models import Task
from ai_harness.providers.pool import ProviderPool
from ai_harness.research.synthesizer import ResearchSynthesizer
from ai_harness.storage.checkpoint_manager import CheckpointManager

logger = logging.getLogger("ai_harness.agents.researcher")


class ResearcherAgent(BaseAgent):
    """Mines academic papers (arXiv, IEEE, CrossRef), extracts mathematical baselines, and generates SOTA reviews."""

    def __init__(self):
        super().__init__(
            designation="researcher",
            title="Principal Research Scout & Literature Miner",
            system_prompt=(
                "You are the Principal Research Scout. You systematically survey state-of-the-art academic "
                "literature, extract mathematical formulations, algorithm pseudo-code, and empirical benchmarks, "
                "ensuring that the system architecture is grounded in verified scientific principles."
            ),
        )

    def run_phase(
        self,
        task: Task,
        context: Dict[str, Any],
        provider_pool: ProviderPool,
        checkpoint_mgr: CheckpointManager,
    ) -> Dict[str, Any]:
        self.set_action(f"Mining literature and academic papers for '{task.title}'")

        # 1. Scrape live academic papers using ResearchSynthesizer
        synthesizer = ResearchSynthesizer(checkpoint_mgr)
        query = task.metadata.get("research_query") or task.title
        papers = synthesizer.conduct_deep_research(query, max_results_per_source=4)

        paper_summaries = "\n".join([f"- [{p.source}] {p.title} ({p.published_date}): {p.abstract[:200]}" for p in papers[:5]])

        # 2. Synthesize using LLM
        prompt = f"""Task: {task.id} - {task.title}
Objective: {task.objective}

Academic Papers Retrieved:
{paper_summaries or 'Standard domain literature available in knowledge base.'}

Synthesize these findings into an actionable technical brief for Agent 3 (System Architect):
1. Key algorithmic foundations and mathematical equations.
2. SOTA benchmark targets and performance baselines.
3. High-risk pitfalls or anti-patterns identified in literature.
"""
        response, slot = provider_pool.execute_with_failover(
            prompt,
            system_prompt=self.system_prompt,
        )

        # Save to research findings
        finding_file = checkpoint_mgr.save_research_finding(f"sota_brief_{task.id}.md", response)

        self.set_idle()
        return {
            "status": "success",
            "phase": "research",
            "papers_count": len(papers),
            "findings_path": str(finding_file),
            "synthesis": response,
            "provider_slot": slot.slot_id,
        }
