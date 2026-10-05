# AI Autonomous Harness: 8-Agent V-Model / SDLC Execution Engine

A resilient, drop-in multi-agent autonomous engineering harness with **local persistence as the single source of truth**, **10-second atomic checkpointing**, **8-hour time budget management with graceful drain**, **live arXiv and IEEE/CrossRef academic paper scraping**, and **disposable-model multi-key failover**.

---

## 1. Executive Architectural Blueprint

In this architecture, **AI models and API keys are disposable; local persistence on disk is the source of truth**. If an API key expires, quota is exhausted, the model provider changes, or the process crashes, any agent can instantly resume from the last local checkpoint without losing state or restarting from scratch.

```
project/
└── .ai-harness/
    ├── context/
    │   ├── current.json         <-- Hot State: updated every 10 seconds atomically
    │   ├── current.md           <-- Human-readable live state markdown summary
    │   ├── agents/              <-- Individual states for all 8 agent designations
    │   │   ├── orchestrator.json
    │   │   ├── researcher.json
    │   │   ├── architect.json
    │   │   ├── developer.json
    │   │   ├── qa.json
    │   │   ├── security.json
    │   │   ├── ux.json
    │   │   └── release.json
    │   └── history/             <-- Snapshots every 2 minutes with rolling retention
    │       ├── 2026-09-27T021700.json
    │       └── ...
    │
    ├── tasks/
    │   ├── backlog.json         <-- Unclaimed pending tasks
    │   ├── active.json          <-- Currently executing tasks
    │   └── completed.json       <-- Verified completed tasks with completion timestamps
    │
    ├── research/
    │   ├── sources.jsonl        <-- Academic paper citation records (arXiv, CrossRef, IEEE)
    │   ├── findings/            <-- Synthesized literature reviews and mathematical specs
    │   └── papers/              <-- Full paper JSON briefs and abstracts
    │
    ├── failures/
    │   ├── known-errors.json    <-- Catalog of recurring error patterns and root causes
    │   └── attempts.jsonl       <-- Immutable ledger of failed execution strategies
    │
    ├── checkpoints/
    │   └── latest.json          <-- Atomic backup checkpoint
    │
    ├── config.json              <-- Harness configuration
    └── session.json             <-- Session lifecycle metadata
```

---

## 2. The 10-Second Atomic Checkpoint Protocol

To prevent process termination or power loss from corrupting the session state, writes never overwrite `current.json` directly. The engine implements the strict atomic write sequence:

```
Every 10 Seconds
       ↓
Collect Aggregate State
       ↓
Write to current.json.tmp.<pid>.<timestamp>
       ↓
flush() buffer
       ↓
os.fsync(fileno) to disk platter / SSD
       ↓
os.replace() / atomic rename
       ↓
current.json
```

### Three Storage Layers
1. **HOT STATE (`context/current.json` & `context/current.md`)**: Updated every 10 seconds by a background daemon thread.
2. **SESSION HISTORY (`context/history/`)**: Periodic snapshots taken every 1–2 minutes, automatically pruned to the newest 50 files to prevent unbounded disk growth.
3. **PERMANENT KNOWLEDGE (`research/`, `tasks/`, `failures/`)**: Appended and synced whenever information or tasks change.

---

## 3. The 8-Agent V-Model & SDLC Team

The harness instantiates 8 specialized agent roles representing the full V-Model lifecycle:

```
                   V-MODEL ARCHITECTURE
 
   [Left Wing: Specification]            [Right Wing: Verification]
 
 1. Orchestrator                           8. Release & Compliance
    (Requirements & Scope)                    (Acceptance Gate Signoff)
           \                                       /
      2. Researcher                             7. UX & Performance
         (arXiv / IEEE Mining)                     (Profiling & Latency)
              \                                 /
           3. Architect                      6. Security Auditor
              (Invariants & ADRs)               (OWASP & Secret Scan)
                   \                         /
                    \                       /
                     4. Senior Developer   5. Staff QA
                        (Coding)    <---->   (Unit & Integration)
```

| # | Agent Designation | Title | Primary Responsibility |
| :-: | :--- | :--- | :--- |
| **1** | `orchestrator` | **Lead Orchestrator & V-Model Conductor** | Task decomposition, phase gates, 8-hour countdown, graceful drain coordinator. |
| **2** | `researcher` | **Principal Research Scout & Literature Miner** | Scrapes arXiv, CrossRef, IEEE; extracts mathematical formulas and algorithmic benchmarks. |
| **3** | `architect` | **Chief System Architect & Invariants Designer** | Module boundaries, interface contracts, immutable invariants, and ADRs. |
| **4** | `developer` | **Senior Core Implementation Engineer** | Translates research algorithms into typed code; applies surgical fixes without repeating failed strategies. |
| **5** | `qa` | **Staff QA & Test Verification Engineer** | Unit test suites, integration tests, boundary testing, fuzzing, and regression defense. |
| **6** | `security` | **Application Security & Threat Auditor** | OWASP Top 10, secret leak inspection, input validation, and boundary sanitization. |
| **7** | `ux` | **Performance, Latency & UX Specialist** | Time/space complexity profiling, memory optimization, CLI ergonomics, and responsive feedback. |
| **8** | `release` | **Release, Compliance & Reliability Engineer** | Acceptance gate verification, packaging, semantic versioning, and changelogs. |

---

## 4. 8-Hour Time Budget & Graceful Drain Protocol

Execution duration is strictly governed by `TimeBudgetManager` (default: 8 hours = 28,800 seconds).

```
Session Start (T = 0)
       ↓
Autonomous SDLC Loop Executes Tasks
       ↓
T = 8 Hours (Budget Expired)
       ↓
Set Status to DRAINING
       ↓
Block New Backlog Tasks from Starting
       ↓
Allow In-Flight Task to Complete Final V-Model Verification
       ↓
Flush Final Atomic Checkpoint
       ↓
Clean Shutdown & Executive Summary Generated
```

---

## 5. Multi-Key & Provider Failover (Zero Secret Leakage)

API keys are managed strictly in memory via environment variables (`.env`, system secrets). **Raw API keys are NEVER written to disk in checkpoints.**

```
API Error (429 Rate Limit / Quota / 401)
                    ↓
   Save Atomic Checkpoint Immediately
                    ↓
   Mark Slot as "rate_limited" or "exhausted"
                    ↓
   Select Next Configured Slot / Provider
   (Gemini -> OpenAI -> Anthropic -> Ollama -> Mock)
                    ↓
   Inject RESUME CONTEXT Prompt
                    ↓
   Continue Task Seamlessly
```

The resumed agent receives the exact resume context:

```text
RESUME FROM LOCAL CHECKPOINT

Session: session-2026-09-27-001
Current task: CRM-241
Current phase: TESTING

Completed:
✓ Requirements
✓ Research
✓ Architecture
✓ Implementation

Current in-flight:
→ Integration tests

Known failures:
...

Failed strategies (DO NOT REPEAT):
...

Last git commit:
abc123

Next required action:
...

CRITICAL INSTRUCTIONS:
- Do NOT restart the task from the beginning.
- Do NOT repeat failed strategies.
- Continue execution from this local checkpoint.
```

---

## 6. Academic Research & Paper Mining Engine

The harness includes a built-in scientific scraper:
- **arXiv API Client**: Queries `http://export.arxiv.org/api/query`, parses Atom XML, extracts abstracts, authors, PDF links, and key takeaways.
- **CrossRef REST API**: Covers IEEE, ACM, Springer, Elsevier, Nature, and global conferences.
- **Research Synthesizer**: Clusters papers by topic, extracts algorithmic foundations and equations, and generates formal literature review artifacts in `.ai-harness/research/findings/`.

---

## 7. Installation & CLI Usage

### Installation
```bash
cd ai-autonomous-harness
pip install -e .
```

### Attaching to ANY Project
Navigate to any project directory where you want to attach the harness:
```bash
# 1. Initialize .ai-harness in target directory
ai-harness init --path "C:\path\to\your\project"

# 2. Start the 8-hour autonomous SDLC loop
ai-harness run --path "C:\path\to\your\project" --duration 8h --topic "Adaptive Traffic Optimization"

# 3. View live dashboard and agent diagnostics
ai-harness status --path "C:\path\to\your\project"

# 4. Resume from latest checkpoint after restart or key change
ai-harness resume --path "C:\path\to\your\project"

# 5. Conduct standalone academic literature search & synthesis
ai-harness research "Deep Reinforcement Learning Traffic Signals" --limit 5

# 6. Force an immediate atomic checkpoint
ai-harness checkpoint --path "C:\path\to\your\project"
```

---

## 8. Verification & Test Suite

All 15 automated unit and integration tests run cleanly:
```bash
python -m unittest discover tests
```

Tests verify:
1. `test_atomic_storage.py`: Atomic temp file creation, buffer flush, `os.fsync`, and atomic rename.
2. `test_checkpoint_10s.py`: 10-second daemon sync, hot file updates, and snapshot pruning.
3. `test_key_failover.py`: Secret hygiene, 429 quota failover, and resume prompt generation.
4. `test_research_scraper.py`: arXiv XML parsing, CrossRef item parsing, and markdown synthesis.
5. `test_timer_budget.py`: Duration string parsing (`8h`, `30m`), expiration detection, and graceful drain.
6. `test_v_model_pipeline.py`: Full 8-agent SDLC cycle, QA defect detection, and error recovery routing.
