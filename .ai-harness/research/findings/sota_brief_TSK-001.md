# Literature & SOTA Synthesis

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
