"""AI Autonomous Harness: A resilient, local-first multi-agent SDLC & V-Model engine.
"""

from __future__ import annotations

import os
import sys

# Ensure UTF-8 output encoding on Windows consoles
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import certifi
    # Sanitize invalid CA bundle paths in environment that cause requests/urllib to fail
    for env_var in ("CURL_CA_BUNDLE", "REQUESTS_CA_BUNDLE", "SSL_CERT_FILE"):
        val = os.environ.get(env_var)
        if val and not os.path.exists(val):
            os.environ[env_var] = certifi.where()
except ImportError:
    pass

__version__ = "1.0.0"
__author__ = "Advanced Agentic Engineering Team"
