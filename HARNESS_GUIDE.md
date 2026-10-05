# DEVDOMINATORS: AI Autonomous Multi-Agent Harness Guide

This repository is now equipped with the **AI Autonomous Multi-Agent SDLC & V-Model Harness**. The harness runs continuous autonomous engineering loops, treating AI models and API keys as disposable, while maintaining **local disk persistence as the single source of truth**.

---

## 1. Quick Start Commands

Run all commands directly from this project root:

```bash
# 1. Start the 8-Hour Autonomous V-Model Loop across all 8 agents
python run_harness.py run --duration 8h --topic "Edge AI Adaptive Traffic Signal Control"

# 2. View Live Diagnostics, Active Tasks, Time Remaining, and Agent States
python run_harness.py status

# 3. Resume from Last Checkpoint (after restarts, API key rotations, or quota exhaustion)
python run_harness.py resume

# 4. Scrape & Synthesize Academic Research Papers (arXiv, IEEE, CrossRef, SAE)
python run_harness.py research "Dual-spectral acoustic siren STFT emergency preemption" --limit 5

# 5. Force an Immediate Atomic Checkpoint
python run_harness.py checkpoint
```

---

## 2. Directory Layout & Persistence Architecture

The harness manages all state locally inside `.ai-harness/`:

```
devdominators/
├── run_harness.py               <-- Top-level harness runner script
├── ai_harness/                  <-- Core multi-agent harness package
│   ├── core/                    <-- Models, timer budget (8h), git detection
│   ├── storage/                 <-- 10-second atomic checkpoint engine (flush/fsync)
│   ├── providers/               <-- Multi-key failover pool (Gemini, OpenAI, Claude, Ollama, Mock)
│   ├── research/                <-- arXiv & CrossRef/IEEE paper scrapers
│   ├── agents/                  <-- 8 Specialized Agent Designations
│   ├── pipeline/                <-- V-Model engine & error retry recovery
│   └── ui/                      <-- Rich terminal dashboard
│
└── .ai-harness/
    ├── context/
    │   ├── current.json         <-- Hot State: updated every 10 seconds atomically
    │   ├── current.md           <-- Live human-readable executive status markdown
    │   ├── agents/              <-- Individual state per agent designation
    │   │   ├── orchestrator.json
    │   │   ├── researcher.json
    │   │   ├── architect.json
    │   │   ├── developer.json
    │   │   ├── qa.json
    │   │   ├── security.json
    │   │   ├── ux.json
    │   │   └── release.json
    │   └── history/             <-- Rolling snapshots with automated pruning
    │
    ├── tasks/
    │   ├── backlog.json         <-- Seeded with DEVDOMINATORS engineering tasks
    │   ├── active.json          <-- In-flight tasks
    │   └── completed.json       <-- Completed and verified tasks
    │
    ├── research/
    │   ├── sources.jsonl        <-- Live academic paper records
    │   ├── findings/            <-- Synthesized literature reviews
    │   └── papers/              <-- Abstract and paper metadata briefs
    │
    ├── failures/
    │   ├── known-errors.json    <-- Catalog of recurring error patterns
    │   └── attempts.jsonl       <-- Blocked failed strategies
    │
    ├── checkpoints/
    │   └── latest.json          <-- Atomic backup checkpoint
    │
    └── config.json              <-- Harness configuration
```

---

## 3. The 10-Second Atomic Checkpoint Protocol

To prevent corrupted files during crashes or interruptions, writes never overwrite `current.json` directly. The engine implements:

```
Every 10 Seconds
       ↓
Collect Aggregate State
       ↓
Write to current.json.tmp.<pid>.<timestamp>
       ↓
flush() buffer
       ↓
os.fsync(fileno) to disk
       ↓
os.replace() / atomic rename
       ↓
current.json
```

---

## 4. The 8 Autonomous Agent Designations

```
                     V-MODEL ARCHITECTURE
 
   [Left Wing: Specification]              [Right Wing: Verification]
 
 1. Orchestrator                             8. Release & Compliance
    (Requirements & Scope)                      (Acceptance Gate Signoff)
           \                                         /
      2. Researcher                               7. UX & Performance
         (arXiv / IEEE Mining)                       (Profiling & Latency)
              \                                   /
           3. Architect                        6. Security Auditor
              (Invariants & ADRs)                 (OWASP & Secret Scan)
                   \                           /
                    \                         /
                     4. Senior Developer     5. Staff QA
                        (Coding)      <---->   (Unit & Integration)
```

1. **`orchestrator` (Lead Orchestrator & V-Model Conductor):** Directs the cycle, breaks down backlog tasks, and manages the 8-hour countdown.
2. **`researcher` (Principal Research Scout):** Mined IEEE, SAE, and arXiv papers for acoustic siren FFT frequencies, Webster delay formulations, and YOLO INT8 inference.
3. **`architect` (Chief System Architect):** Defines interface contracts, 3.0s yellow clearance safety constraints, and ADRs.
4. **`developer` (Senior Core Implementation Engineer):** Writes clean, typed code implementing mathematical models.
5. **`qa` (Staff QA & Verification Engineer):** Executes unit and boundary test suites; routes defect reports back to the developer.
6. **`security` (Application Security Auditor):** Audits code boundaries, OWASP Top 10, and ensures zero hardcoded API secrets.
7. **`ux` (Performance & UX Specialist):** Profiles edge latency, sub-15ms inference budgets, and CLI ergonomics.
8. **`release` (Release & Reliability Engineer):** Validates acceptance criteria and generates release changelogs.

---

## 5. 8-Hour Time Budget & Graceful Drain

- Governed by `TimeBudgetManager` (default: 8 hours = 28,800 seconds).
- When the 8-hour limit is reached, status switches to `DRAINING`.
- The harness **blocks new backlog tasks from starting** and **allows the current active task to finish cleanly** through its remaining V-Model phases before shutting down.

---

## 6. Multi-Key Failover & Secret Hygiene

- Supports **Gemini, OpenAI, Claude, Groq, local Ollama (offline), and Mock** providers.
- **Zero Secret Exposure**: Raw API keys live strictly in RAM / `.env` and are **never written to checkpoint files**.
- If an API returns `429 Rate Limit` or quota exhausted, the harness immediately flushes a checkpoint, fails over to the next configured slot, injects the `RESUME FROM LOCAL CHECKPOINT` prompt, and continues seamlessly.
