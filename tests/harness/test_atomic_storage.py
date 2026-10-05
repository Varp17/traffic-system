import json
import os
import tempfile
import unittest
from pathlib import Path

from ai_harness.storage.atomic import atomic_write, atomic_write_json, safe_read_json


class TestAtomicStorage(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.TemporaryDirectory()
        self.base_path = Path(self.test_dir.name)

    def tearDown(self):
        self.test_dir.cleanup()

    def test_atomic_write_creates_file_safely(self):
        target = self.base_path / "test.txt"
        atomic_write(target, "Hello World from Atomic Writer")

        self.assertTrue(target.is_file())
        with open(target, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertEqual(content, "Hello World from Atomic Writer")

    def test_atomic_write_json_roundtrip(self):
        target = self.base_path / "data.json"
        data = {
            "session_id": "session-test-001",
            "pipeline_state": {"requirements": "complete", "testing": "running"},
            "count": 42,
        }
        atomic_write_json(target, data)

        loaded = safe_read_json(target)
        self.assertEqual(loaded["session_id"], "session-test-001")
        self.assertEqual(loaded["pipeline_state"]["requirements"], "complete")
        self.assertEqual(loaded["count"], 42)

    def test_safe_read_json_handles_missing_and_corrupt(self):
        missing = self.base_path / "non_existent.json"
        self.assertIsNone(safe_read_json(missing))
        self.assertEqual(safe_read_json(missing, default={}), {})

        # Corrupt file
        corrupt = self.base_path / "corrupt.json"
        with open(corrupt, "w", encoding="utf-8") as f:
            f.write("{ invalid json [[]")
        self.assertEqual(safe_read_json(corrupt, default="fallback"), "fallback")


if __name__ == "__main__":
    unittest.main()
