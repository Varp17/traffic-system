"""
run_detection.py — Launcher redirecting to the Unified 4-Way Traffic AI Platform
=================================================================================
The Detection & Incident Scanner is now fully integrated into the Web Dashboard.
Usage:
    python run_detection.py
or:
    python run_4way.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    from run_4way import main
    main()
