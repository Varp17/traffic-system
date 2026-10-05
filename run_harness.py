#!/usr/bin/env python
"""Runner script for AI Autonomous Multi-Agent SDLC / V-Model Harness in DEVDOMINATORS.

Usage:
  python run_harness.py run --duration 8h --topic "Edge AI Adaptive Traffic Signal Control"
  python run_harness.py status
  python run_harness.py resume
  python run_harness.py research "Dual-spectral Acoustic Siren FFT Detection" --limit 5
  python run_harness.py checkpoint
"""

import sys
from pathlib import Path

# Ensure root directory is on Python path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ai_harness.cli import main

if __name__ == "__main__":
    main()
