"""
tests/test_live_pipeline.py — End-to-End Pipeline Verification
==============================================================
Validates that:
  1. VideoProcessor4Way successfully starts background worker threads
  2. Frame ingestion, composite generation, and YOLO inference run smoothly
  3. SignalOptimizer updates phases without exception
  4. Audio detector runs without blocking
  5. V2X SPaT/MAP serialization and JPEG encoding produce valid payloads
  6. VideoProcessor4Way cleanly terminates upon stop()
"""

import time
import unittest
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from backend.video_processor_4way import VideoProcessor4Way


class TestLivePipeline(unittest.TestCase):
    def test_pipeline_runtime(self):
        received_states = []

        def on_state(state):
            received_states.append(state)

        vp = VideoProcessor4Way("north.mp4", "south.mp4", "east.mp4", "west.mp4")
        vp.start(on_state=on_state)

        # Allow pipeline to run for 2.5 seconds
        time.sleep(2.5)
        vp.stop()

        self.assertGreater(len(received_states), 0, "Should have received at least one state update")
        
        state = vp.get_state()
        self.assertIn("metrics", state)
        self.assertIn("signals", state)
        self.assertIn("v2x_spat", state)
        self.assertIn("green_wave", state)
        self.assertIn("audio_siren", state)
        self.assertIn("active_targets", state)
        self.assertIsInstance(state["active_targets"], list)
        
        jpeg = vp.get_jpeg_frame()
        self.assertIsNotNone(jpeg)
        self.assertGreater(len(jpeg), 1000)

        # Verify SPaT structure
        spat = state["v2x_spat"]
        self.assertEqual(spat.get("messageId"), 19)
        self.assertEqual(len(spat.get("phases", [])), 4)

        # Verify Green Wave structure
        gw = state["green_wave"]
        self.assertEqual(gw.get("primaryIntersection"), "INT_DEV_001")
        self.assertIn("corridorNodes", gw)
        self.assertEqual(len(gw["corridorNodes"]), 4)
        self.assertEqual(gw["corridorNodes"]["North_Jct_2"]["coordinatedStatus"], "SYNCHRONIZED")


if __name__ == "__main__":
    unittest.main()
