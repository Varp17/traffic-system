import tempfile
import unittest
from pathlib import Path

from ai_harness.core.models import Task, TaskStatus
from ai_harness.core.timer import TimeBudgetManager
from ai_harness.pipeline.v_model import VModelEngine
from ai_harness.providers.base import BaseProvider
from ai_harness.providers.mock_provider import MockProvider
from ai_harness.providers.pool import KeySlot, ProviderPool
from ai_harness.storage.checkpoint_manager import CheckpointManager


class TestVModelPipeline(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.TemporaryDirectory()
        self.base_path = Path(self.test_dir.name)
        self.checkpoint_mgr = CheckpointManager(self.base_path)

        # Mock pool
        self.pool = ProviderPool()
        mock_slot = KeySlot(
            slot_id="TEST_MOCK_SLOT",
            provider_type="mock",
            model_name="mock-engine",
            status="available",
        )
        self.pool.slots = [mock_slot]
        self.pool._instances["TEST_MOCK_SLOT"] = MockProvider()

        self.timer = TimeBudgetManager(budget_seconds=100.0)
        self.engine = VModelEngine(
            checkpoint_mgr=self.checkpoint_mgr,
            provider_pool=self.pool,
            budget_manager=self.timer,
        )

    def tearDown(self):
        self.test_dir.cleanup()

    def test_run_v_model_task_cycle(self):
        task = Task(
            id="TSK-TEST-001",
            title="Webster ATSC Signal Timing Solver",
            objective="Develop mathematically sound delay-minimizing traffic controller",
            acceptance_criteria=["Cycle length formula valid", "Green split proportions match critical flow"],
        )

        success = self.engine.run_v_model_cycle(task)
        self.assertTrue(success)
        self.assertEqual(task.status, TaskStatus.COMPLETED.value)
        self.assertEqual(self.engine.state.pipeline_state["requirements"], "complete")
        self.assertEqual(self.engine.state.pipeline_state["research"], "complete")
        self.assertEqual(self.engine.state.pipeline_state["architecture"], "complete")
        self.assertEqual(self.engine.state.pipeline_state["implementation"], "complete")
        self.assertEqual(self.engine.state.pipeline_state["testing"], "complete")
        self.assertEqual(self.engine.state.pipeline_state["security"], "complete")
        self.assertEqual(self.engine.state.pipeline_state["ux"], "complete")
        self.assertEqual(self.engine.state.pipeline_state["release"], "complete")


if __name__ == "__main__":
    unittest.main()
