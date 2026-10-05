"""
tests/test_pipeline_smoke.py — Pipeline Smoke Test
===================================================
Instantiates VideoProcessor4Way, runs 30+ frames, asserts that:
  1. Capture, inference, and acoustic threads remain alive without dying.
  2. No uncaught AttributeError / NoneType exceptions occur.
  3. get_state() produces complete payloads with metrics, signals, and active_targets.
  4. VideoProcessor4Way cleanly terminates upon stop().
"""

import unittest
import time
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from backend.video_processor_4way import VideoProcessor4Way


class TestPipelineSmoke(unittest.TestCase):

    def test_pipeline_smoke_run(self):
        vp = VideoProcessor4Way(
            v_north="north.mp4",
            v_south="south.mp4",
            v_east="east.mp4",
            v_west="west1.mp4"
        )

        received_states = []
        def on_state(state):
            received_states.append(state)

        vp.start(on_state=on_state)

        # Allow pipeline to run for ~3.0s (30+ frames processed across threads)
        time.sleep(3.2)

        # Verify threads are active and healthy
        self.assertTrue(vp.is_running, "Processor should be in running state")
        if hasattr(vp, '_capture_t'):
            self.assertTrue(vp._capture_t.is_alive(), "Capture thread died unexpectedly")
        if hasattr(vp, '_inference_t'):
            self.assertTrue(vp._inference_t.is_alive(), "Inference thread died unexpectedly")
        if hasattr(vp, '_audio_t'):
            self.assertTrue(vp._audio_t.is_alive(), "Audio thread died unexpectedly")

        state = vp.get_state()
        self.assertIsNotNone(state, "get_state() returned None")
        self.assertIn("metrics", state)
        self.assertIn("signals", state)
        self.assertIn("active_targets", state)
        self.assertIn("audio_siren", state)

        # Audio siren property test (guarantees siren_detected does not throw AttributeError)
        self.assertIsInstance(vp.audio_detector.siren_detected, bool)

        vp.stop()
        time.sleep(0.5)
        self.assertFalse(vp.is_running, "Processor should stop cleanly")
        self.assertGreater(len(received_states), 0, "Pipeline should have dispatched state callbacks")


if __name__ == "__main__":
    unittest.main()
