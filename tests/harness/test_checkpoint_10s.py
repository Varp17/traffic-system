import tempfile
import time
import unittest
from pathlib import Path

from ai_harness.core.models import SessionState
from ai_harness.storage.checkpoint_manager import CheckpointManager


class TestCheckpointManager(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.TemporaryDirectory()
        self.base_path = Path(self.test_dir.name)
        self.mgr = CheckpointManager(self.base_path)

    def tearDown(self):
        self.mgr.stop_background_checkpointer()
        self.test_dir.cleanup()

    def test_layout_creation(self):
        self.assertTrue(self.mgr.context_dir.is_dir())
        self.assertTrue(self.mgr.tasks_dir.is_dir())
        self.assertTrue(self.mgr.research_dir.is_dir())
        self.assertTrue(self.mgr.failures_dir.is_dir())
        self.assertTrue(self.mgr.checkpoints_dir.is_dir())

    def test_hot_checkpoint_saves_all_targets(self):
        state = SessionState(
            session_id="test-session-001",
            started_at="2026-09-27T02:00:00Z",
            deadline="2026-09-27T10:00:00Z",
            agent_states={
                "orchestrator": {"designation": "orchestrator", "status": "working", "current_action": "Planning"},
                "developer": {"designation": "developer", "status": "idle", "current_action": "Standby"},
            },
        )
        self.mgr.save_hot_checkpoint(state)

        # Check hot files
        self.assertTrue(self.mgr.current_json.is_file())
        self.assertTrue(self.mgr.current_md.is_file())
        self.assertTrue(self.mgr.latest_checkpoint.is_file())

        # Check individual agent file
        orch_file = self.mgr.agents_dir / "orchestrator.json"
        self.assertTrue(orch_file.is_file())

        # Load back
        loaded = self.mgr.load_latest_state()
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded.session_id, "test-session-001")

    def test_background_checkpointer_runs_and_flushes(self):
        counter = {"ticks": 0}

        def _state_provider():
            counter["ticks"] += 1
            return SessionState(
                session_id=f"tick-{counter['ticks']}",
                started_at="2026-09-27T02:00:00Z",
                deadline="2026-09-27T10:00:00Z",
            )

        # Start with fast 0.2s interval for test
        self.mgr.start_background_checkpointer(state_provider=_state_provider, interval_seconds=0.2)
        time.sleep(0.5)
        self.mgr.stop_background_checkpointer()

        self.assertGreater(counter["ticks"], 0)
        self.assertTrue(self.mgr.current_json.is_file())


if __name__ == "__main__":
    unittest.main()
