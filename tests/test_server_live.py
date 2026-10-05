"""
tests/test_server_live.py — Verify FastAPI Server & Static Asset Serving
========================================================================
Starts FastAPI server on localhost:8000, validates:
  1. GET / serves React index.html with correct title and assets
  2. GET /api/metrics returns live telemetry
  3. GET /api/v2x/spat returns SAE J2735 message
  4. Clean termination
"""

import subprocess
import time
import urllib.request
import json
import unittest
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class TestServerLive(unittest.TestCase):
    def test_server_routes(self):
        proc = subprocess.Popen(
            [sys.executable, "run_4way.py", "--no-browser"],
            cwd=PROJECT_ROOT
        )
        try:
            # Wait 4.5 seconds for FastAPI + YOLOv8 + Video capture to boot
            time.sleep(4.5)

            # Test Root Index
            with urllib.request.urlopen("http://localhost:8000/") as resp:
                self.assertEqual(resp.status, 200)
                html = resp.read().decode("utf-8")
                self.assertIn("DevDominators", html)

            # Test REST Metrics Endpoint
            with urllib.request.urlopen("http://localhost:8000/api/metrics") as resp:
                self.assertEqual(resp.status, 200)
                data = json.loads(resp.read().decode("utf-8"))
                self.assertIn("metrics", data)
                self.assertIn("signals", data)

            # Test V2X SPaT Endpoint
            with urllib.request.urlopen("http://localhost:8000/api/v2x/spat") as resp:
                self.assertEqual(resp.status, 200)
                spat = json.loads(resp.read().decode("utf-8"))
                self.assertEqual(spat.get("messageId"), 19)

        finally:
            proc.terminate()
            proc.wait(timeout=5)


if __name__ == "__main__":
    unittest.main()
