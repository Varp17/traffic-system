"""
backend/app.py — Application entrypoint alias pointing to backend.main_4way
==========================================================================
Unified server hosting the complete 4-Way Traffic AI Perception Suite,
Webster ATSC signal controller, and Real-Time Detection & Incident Scanner.
"""

from backend.main_4way import app, init_processor

__all__ = ["app", "init_processor"]
