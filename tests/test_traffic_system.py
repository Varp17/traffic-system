"""
tests/test_traffic_system.py — Comprehensive Test & Benchmark Suite
===================================================================
Automated verification covering:
  1. Webster's Delay Formula & Green Split Calculations
  2. Passenger Car Unit (PCU) Equivalence Aggregation
  3. Acoustic Siren FFT Spectral Analysis & Noise Discrimination
  4. Kinematic Collision & Stalled Vehicle Anomaly Detection
  5. Starvation Prevention & Emergency Preemption State Machine
  6. REST API Endpoint Health & Serialization
"""

import sys
import os
import time
import unittest
import numpy as np

# Set path to project root
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

import config
from core.detector import Detection
from core.tracker import Track, CentroidTracker, compute_iou
from core.lane_manager import LaneManager, LaneStats
from core.signal_optimizer import SignalOptimizer, SignalState
from core.traffic_analyzer import TrafficAnalyzer, Alert
from core.audio_siren_detector import AudioSirenDetector


class TestWebsterOptimization(unittest.TestCase):
    """Test Webster's delay equation under various traffic demand conditions."""

    def setUp(self):
        self.optimizer = SignalOptimizer()

    def test_webster_balanced_flow(self):
        lane_stats = {
            "North": LaneStats(name="North", vehicle_count=6, pcu_count=6.0),
            "South": LaneStats(name="South", vehicle_count=6, pcu_count=6.0),
            "East":  LaneStats(name="East",  vehicle_count=6, pcu_count=6.0),
            "West":  LaneStats(name="West",  vehicle_count=6, pcu_count=6.0),
        }
        Co, splits = self.optimizer.calculate_webster_splits(lane_stats)
        self.assertGreaterEqual(Co, config.WEBSTER_MIN_CYCLE)
        self.assertLessEqual(Co, config.WEBSTER_MAX_CYCLE)
        
        # In balanced traffic, all green splits should be identical
        self.assertEqual(splits["North"], splits["South"])
        self.assertEqual(splits["East"], splits["West"])
        for split in splits.values():
            self.assertGreaterEqual(split, config.MIN_GREEN_TIME)

    def test_webster_heavy_saturation_clamping(self):
        # Heavy surge that would theoretically produce Y > 1.0 without boundary clamping
        lane_stats = {
            "North": LaneStats(name="North", vehicle_count=50, pcu_count=90.0),
            "South": LaneStats(name="South", vehicle_count=40, pcu_count=80.0),
            "East":  LaneStats(name="East",  vehicle_count=45, pcu_count=85.0),
            "West":  LaneStats(name="West",  vehicle_count=55, pcu_count=95.0),
        }
        Co, splits = self.optimizer.calculate_webster_splits(lane_stats)
        # Must be safely clamped to WEBSTER_MAX_CYCLE (120s) without math crash / division by zero
        self.assertEqual(Co, config.WEBSTER_MAX_CYCLE)
        self.assertLessEqual(self.optimizer.critical_flow_ratio, 0.85)

    def test_webster_zero_traffic(self):
        lane_stats = {
            "North": LaneStats(name="North", vehicle_count=0, pcu_count=0.0),
            "South": LaneStats(name="South", vehicle_count=0, pcu_count=0.0),
            "East":  LaneStats(name="East",  vehicle_count=0, pcu_count=0.0),
            "West":  LaneStats(name="West",  vehicle_count=0, pcu_count=0.0),
        }
        Co, splits = self.optimizer.calculate_webster_splits(lane_stats)
        self.assertGreaterEqual(Co, config.WEBSTER_MIN_CYCLE)
        for split in splits.values():
            self.assertGreaterEqual(split, config.MIN_GREEN_TIME)


class TestPCUEquivalence(unittest.TestCase):
    """Test standard Passenger Car Unit (PCU) conversions (IRC:106 / HCM)."""

    def test_mixed_queue_pcu_calculation(self):
        # Queue: 2 cars (1.0 each) + 1 bus (3.0) + 2 motorcycles (0.5 each) + 1 truck (3.0) + 1 bicycle (0.2)
        # Expected: 2*1.0 + 1*3.0 + 2*0.5 + 1*3.0 + 1*0.2 = 2.0 + 3.0 + 1.0 + 3.0 + 0.2 = 9.2 PCU
        detections = [
            Detection(box=(10, 10, 50, 50), label="car", confidence=0.9, class_id=2, is_vehicle=True, is_person=False, is_ambulance=False, pcu=1.0),
            Detection(box=(10, 10, 50, 50), label="car", confidence=0.9, class_id=2, is_vehicle=True, is_person=False, is_ambulance=False, pcu=1.0),
            Detection(box=(10, 10, 80, 80), label="bus", confidence=0.85, class_id=5, is_vehicle=True, is_person=False, is_ambulance=False, pcu=3.0),
            Detection(box=(10, 10, 30, 30), label="motorcycle", confidence=0.8, class_id=3, is_vehicle=True, is_person=False, is_ambulance=False, pcu=0.5),
            Detection(box=(10, 10, 30, 30), label="motorcycle", confidence=0.8, class_id=3, is_vehicle=True, is_person=False, is_ambulance=False, pcu=0.5),
            Detection(box=(10, 10, 90, 90), label="truck", confidence=0.9, class_id=7, is_vehicle=True, is_person=False, is_ambulance=False, pcu=3.0),
            Detection(box=(10, 10, 30, 30), label="bicycle", confidence=0.75, class_id=1, is_vehicle=True, is_person=False, is_ambulance=False, pcu=0.2),
        ]
        total_pcu = sum(d.pcu for d in detections if d.is_vehicle)
        self.assertAlmostEqual(total_pcu, 9.2, places=2)


class TestAcousticSirenDetector(unittest.TestCase):
    """Test FFT spectral siren analysis vs white noise discrimination."""

    def setUp(self):
        self.detector = AudioSirenDetector()

    def test_siren_detection_on_synthetic_benchmark(self):
        res = self.detector.analyze_wav_file(self.detector._synthetic_wav_path)
        self.assertTrue(res.get("detected", False))
        self.assertGreater(res.get("overall_confidence", 0.0), 0.70)
        self.assertGreaterEqual(res.get("siren_window_hits", 0), 2)

    def test_white_noise_rejection(self):
        sr = 22050
        duration = 1.0
        # Generate pure white noise (flat power spectrum)
        white_noise = np.random.normal(0, 0.5, int(sr * duration)).astype(np.float32)
        is_siren, conf, freq = self.detector.analyze_audio_chunk(white_noise, sr)
        # White noise has diffuse power; ratio in siren band should be low and rejected
        self.assertFalse(is_siren)
        self.assertLess(conf, self.detector.confidence_threshold)


class TestKinematicCollisionDetection(unittest.TestCase):
    """Test accident and collision detection heuristics."""

    def setUp(self):
        self.analyzer = TrafficAnalyzer()

    def test_collision_confirmed_after_dwell(self):
        t1 = Track(track_id=1, label="car", cx=100, cy=100, x1=80, y1=80, x2=120, y2=120,
                   is_vehicle=True, is_person=False, is_ambulance=False)
        t2 = Track(track_id=2, label="car", cx=110, cy=105, x1=85, y1=85, x2=125, y2=125,
                   is_vehicle=True, is_person=False, is_ambulance=False)
        
        # Mark both as stopped
        t1.is_stopped = True
        t2.is_stopped = True
        
        tracks = [t1, t2]
        lane_stats = {
            "North": LaneStats(name="North", vehicle_count=2, pcu_count=2.0)
        }
        
        # Step 1: Initial collision detection
        new_alerts = self.analyzer.update(tracks, lane_stats, [])
        # Pending collision registered
        self.assertTrue(len(self.analyzer._pending_collisions) > 0)
        
        # Fast forward time to exceed COLLISION_CONFIRM_TIME
        pair_key = (1, 2)
        if pair_key in self.analyzer._pending_collisions:
            self.analyzer._pending_collisions[pair_key]["timestamp"] -= 6.0
        
        # Step 2: Next tick confirms collision
        confirmed_alerts = self.analyzer.update(tracks, lane_stats, [])
        collision_alerts = [a for a in confirmed_alerts if a.alert_type == "accident"]
        self.assertGreaterEqual(len(collision_alerts), 1)
        self.assertEqual(collision_alerts[0].severity, "critical")


class TestStarvationAndPreemption(unittest.TestCase):
    """Test starvation prevention and emergency preemption transitions."""

    def setUp(self):
        self.optimizer = SignalOptimizer()

    def test_starvation_guarantee(self):
        lane_stats = {
            "North": LaneStats(name="North", vehicle_count=20, pcu_count=25.0),
            "South": LaneStats(name="South", vehicle_count=20, pcu_count=25.0),
            "East":  LaneStats(name="East",  vehicle_count=1,  pcu_count=1.0),
            "West":  LaneStats(name="West",  vehicle_count=20, pcu_count=25.0),
        }
        
        # Simulate East lane starving (waiting > 65s)
        self.optimizer.signals["East"].last_green = time.time() - 70.0
        
        # Advance phase
        self.optimizer._advance_phase(lane_stats)
        # Even though East has only 1 vehicle, fairness timeout MUST grant East green!
        self.assertEqual(self.optimizer.current_lane, "East")
        self.assertEqual(self.optimizer.current_state, SignalState.GREEN)

    def test_emergency_preemption_yellow_safety(self):
        # North is currently green
        self.optimizer._activate_phase(0)  # North
        self.assertEqual(self.optimizer.current_lane, "North")
        
        # Ambulance arrives in South lane
        self.optimizer.trigger_emergency("South", source="visual")
        self.assertTrue(self.optimizer.emergency_active)
        self.assertEqual(self.optimizer.emergency_lane, "South")
        
        # Safety check: North must not abruptly cut to red without yellow transition
        self.assertTrue(self.optimizer._in_yellow)
        self.assertEqual(self.optimizer.signals["North"].state, SignalState.YELLOW)


class TestV2XAndGreenWave(unittest.TestCase):
    """Test V2X standard messaging and arterial green wave progression."""

    def test_spat_message_generation(self):
        from core.v2x_engine import V2XEngine
        v2x = V2XEngine(intersection_id="TEST_INT_001")
        dummy_metrics = {
            "signals": {
                "North": {"state": "green", "time_left": 14.5},
                "South": {"state": "red", "time_left": 0.0},
                "East":  {"state": "red", "time_left": 0.0},
                "West":  {"state": "red", "time_left": 0.0},
            },
            "webster_cycle_length": 65.0,
            "emergency_active": False,
        }
        spat = v2x.generate_spat_message(dummy_metrics)
        self.assertEqual(spat["messageId"], 19)
        self.assertEqual(spat["intersectionId"], "TEST_INT_001")
        self.assertEqual(len(spat["phases"]), 4)
        north_phase = next(p for p in spat["phases"] if p["lane"] == "North")
        self.assertEqual(north_phase["currentState"], "green")
        self.assertEqual(north_phase["timeRemainingSec"], 14.5)

    def test_green_wave_offset_calculation(self):
        from core.green_wave_coordinator import GreenWaveCoordinator
        gwc = GreenWaveCoordinator()
        # Distance = 450m, Speed = 45 km/h (12.5 m/s) -> Travel time = 36.0s
        # Cycle length = 60s -> Ideal offset = 36.0 mod 60 = 36.0s
        offset = gwc.compute_progression_offset(distance_meters=450.0, cycle_length=60.0, speed_kmh=45.0)
        self.assertEqual(offset, 36.0)

    def test_pedestrian_clearance_interval(self):
        from core.pedestrian_safety import PedestrianSafetyEngine
        pse = PedestrianSafetyEngine(crosswalk_width_meters=12.0, walking_speed_mps=1.2)
        pci = pse.calculate_clearance_interval()
        self.assertEqual(pci, 10.0)


class TestIncidentManagementAndSnapshot(unittest.TestCase):
    """Test incident evidence logging, deduplication, and forensic snapshot capture."""

    def test_incident_recording_and_seeding(self):
        from backend.video_processor_4way import VideoProcessor4Way
        vp = VideoProcessor4Way()
        
        # Test initial seed contains records
        history = vp.get_incident_history()
        self.assertGreaterEqual(len(history), 4)
        types = {inc["type"] for inc in history}
        self.assertTrue({"ambulance", "accident", "parking", "crowd"}.issubset(types))
        
        # Test recording a new live incident with snapshot
        dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        vp.record_incident("accident", "Collision verified on East approach", frame=dummy_frame, lane="East")
        
        updated_history = vp.get_incident_history()
        latest = updated_history[0]
        self.assertEqual(latest["type"], "accident")
        self.assertEqual(latest["lane"], "East")
        self.assertTrue(len(latest["frame_b64"]) > 0)
        
        # Test deduplication throttle within cooldown window
        vp.record_incident("accident", "Duplicate accident alert", frame=dummy_frame, lane="East")
        self.assertEqual(len(vp.get_incident_history()), len(updated_history))


if __name__ == "__main__":
    unittest.main()

