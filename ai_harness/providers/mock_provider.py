"""Mock LLM Provider for offline testing, verification, and deterministic simulation.
"""

from __future__ import annotations

import time
from typing import Optional
from ai_harness.providers.base import BaseProvider


class MockProvider(BaseProvider):
    """Deterministic provider that simulates intelligent agent responses across the V-model."""

    def __init__(self, api_key: Optional[str] = "mock-key", model: Optional[str] = "mock-engine-v1"):
        super().__init__(api_key=api_key, model=model)
        self.should_fail: bool = False
        self.failure_counter: int = 0
        self.max_failures_before_success: int = 0

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        # Simulate slight inference latency
        time.sleep(0.05)

        # Failure simulation for failover and retry testing
        if self.should_fail:
            if self.failure_counter < self.max_failures_before_success:
                self.failure_counter += 1
                raise RuntimeError("429 Too Many Requests: Rate limit exceeded or quota exhausted")

        p_lower = prompt.lower()
        s_lower = (system_prompt or "").lower()

        # Researcher simulation
        if "research" in s_lower or "literature" in p_lower:
            return """# Literature & SOTA Synthesis

## 1. Key Academic Papers
- **Paper 1:** "Real-Time Adaptive Traffic Signal Control using Deep Reinforcement Learning and Graph Attention Networks" (IEEE Transactions on ITS, 2024).
  - *Methodology:* Multi-agent GAT model for dynamic green phase optimization with sub-20ms inference latency.
- **Paper 2:** "Dual-Spectral Acoustic Siren Detection for Emergency Preemption" (arXiv:2401.08921).
  - *Methodology:* STFT harmonic peak tracking with 99.2% recall in high-noise urban corridors.

## 2. Mathematical Formalism
- Total Lost Time: L = n * l + R
- Webster's Optimal Cycle: C_0 = (1.5 * L + 5) / (1 - Y)
- Green Split: g_i = (y_i / Y) * (C_0 - L)

## 3. Recommended Architectural Baseline
Adopt modular decoupled micro-architecture with edge INT8 inference and failsafe state machines.
"""

        # Architect simulation
        elif "architect" in s_lower or "system design" in p_lower:
            return """# Architectural Decision Record (ADR-001)

## Title: Edge Microkernel with Asynchronous State Arbitration
- **Status:** APPROVED
- **Context:** Sub-15ms cycle requirement for 4-way intersection actuation.
- **Decision:** Use an asynchronous ring buffer with zero-copy shared memory between YOLOv8 perception and Webster ATSC solver.
- **Invariants:**
  1. Yellow clearance interval minimum is strictly 3.0s (NEMA TS2 compliance).
  2. Emergency siren preemption overrides all background cycles within 2.0s.
  3. Local state persistence checkpoints atomically every 10 seconds.
"""

        # Developer simulation
        elif "developer" in s_lower or "implementation" in p_lower:
            return """# Implementation Plan & Code Artifacts

```python
class WebsterATSCSolver:
    def __init__(self, lost_time_per_phase: float = 3.5, all_red: float = 4.0):
        self.lost_time = 4 * lost_time_per_phase + all_red  # 18.0s
        self.min_green = 10.0
        self.max_green = 60.0

    def compute_cycle(self, flow_ratios: dict[str, float]) -> dict[str, float]:
        Y = sum(flow_ratios.values())
        Y = max(0.10, min(0.85, Y))
        C_0 = (1.5 * self.lost_time + 5.0) / (1.0 - Y)
        effective_green = C_0 - self.lost_time
        splits = {lane: max(self.min_green, min(self.max_green, (y / Y) * effective_green))
                  for lane, y in flow_ratios.items()}
        return {"cycle_length": C_0, "splits": splits}
```
"""

        # QA simulation
        elif "qa" in s_lower or "test" in p_lower:
            return """# Verification & Test Execution Report

- **Test Suite:** 12 Unit Tests, 4 Integration Tests
- **Result:** 16 PASSED, 0 FAILED, 0 FLAKY
- **Coverage:** 94.2% statement coverage
- **Boundary Checks:**
  - Zero-flow edge case: Handled gracefully (falls back to min_green 10s).
  - Saturation overload (Y > 0.85): Clamped safely to 0.85.
  - Emergency vehicle preemption signal: Verified instantaneous transition.
"""

        # Security simulation
        elif "security" in s_lower:
            return """# Security & Threat Audit Report

- **Static Analysis:** Clean. No secret leaks, no hardcoded API keys detected.
- **Boundary Validation:** Input parameters sanitized. No eval/exec injection points.
- **OWASP Compliance:** PASSED. Least-privilege file permissions enforced.
"""

        # Default fallback
        return f"Autonomous agent response processed for prompt of length {len(prompt)}."
