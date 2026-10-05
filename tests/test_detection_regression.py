"""
tests/test_detection_regression.py — Benchmark & Gate for Ambulance Detection Recall
=====================================================================================
Validates real detection holdout performance on dataset/traffic_data.yaml (45 validation frames).
Enforces:
  1. Measurement of true per-class AP@50 and Recall directly from model.val().
  2. Hard gate: ambulance recall > 0.50 (documents current raw checkpoint deficiency).
"""

import unittest
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from ultralytics import YOLO


class TestDetectionRegression(unittest.TestCase):

    def test_model_ambulance_recall_gate(self):
        yaml_path = os.path.join(PROJECT_ROOT, "dataset", "traffic_data.yaml")
        model_path = os.path.join(PROJECT_ROOT, "yolov8_traffic_trained.pt")

        self.assertTrue(os.path.exists(yaml_path), f"Dataset yaml missing: {yaml_path}")
        self.assertTrue(os.path.exists(model_path), f"Model checkpoint missing: {model_path}")

        model = YOLO(model_path)
        results = model.val(data=yaml_path, imgsz=416, device="cpu", verbose=False)

        names = model.names
        ambulance_idx = None
        for idx, name in names.items():
            if str(name).lower() == "ambulance":
                ambulance_idx = idx
                break

        self.assertIsNotNone(ambulance_idx, "Ambulance class not found in model names")

        amb_p = float(results.box.p[ambulance_idx]) if len(results.box.p) > ambulance_idx else 0.0
        amb_r = float(results.box.r[ambulance_idx]) if len(results.box.r) > ambulance_idx else 0.0
        amb_ap50 = float(results.box.ap50[ambulance_idx]) if len(results.box.ap50) > ambulance_idx else 0.0

        print(f"\n[Validation Holdout Metrics]")
        print(f"  Overall mAP50: {results.box.map50:.3f}")
        print(f"  Ambulance (Class {ambulance_idx}) Precision: {amb_p:.3f}")
        print(f"  Ambulance (Class {ambulance_idx}) Recall:    {amb_r:.3f}")
        print(f"  Ambulance (Class {ambulance_idx}) AP50:      {amb_ap50:.3f}")

        # Hard Gate: Documents the model head deficit (fails on raw checkpoint where R=0.125 < 0.5)
        self.assertGreaterEqual(
            amb_r, 0.50,
            f"Ambulance recall gate failed: observed R={amb_r:.3f} < 0.50 requirement"
        )


if __name__ == "__main__":
    unittest.main()
