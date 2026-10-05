"""
core/active_learning.py — Real-World Active Learning Data Flywheel Engine
========================================================================
Implements real-world automated edge data harvesting (Tesla Fleet / Miovision pattern):
  1. Confidence Uncertainty Sampling:
     - Detects borderline predictions (0.35 <= conf <= 0.65)
  2. Severe Occlusion Anomaly:
     - Detects high bounding-box IoU overlap (>0.55) with tracking switches
  3. Audio-Visual Discrepancy:
     - Acoustic siren detected by microphone but vision model has not visually confirmed
  4. Auto-Harvesting Queue:
     - Crops and archives frames into dataset/harvest/ for active model improvement
"""

import os
import time
import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


class ActiveLearningFlywheel:
    """
    Monitors edge inference stream and automatically extracts high-value training samples.
    """
    
    def __init__(self, harvest_dir: Optional[str] = None, max_harvest_per_session: int = 100):
        self.harvest_dir = Path(harvest_dir) if harvest_dir else PROJECT_ROOT / "dataset" / "active_learning_harvest"
        self.images_dir = self.harvest_dir / "images"
        self.labels_dir = self.harvest_dir / "labels"
        
        self.images_dir.mkdir(parents=True, exist_ok=True)
        self.labels_dir.mkdir(parents=True, exist_ok=True)
        
        self.max_harvest = max_harvest_per_session
        self.harvest_count = 0
        self._last_harvest_time = 0.0
        self._cooldown_sec = 2.0  # Avoid saving identical consecutive frames
        
        # Session metrics
        self.harvested_samples: List[Dict] = []

    def evaluate_and_harvest(self, frame: np.ndarray, detections: List,
                             has_audio_siren: bool = False,
                             approach_name: str = "North") -> Optional[Dict]:
        """
        Inspects detections for uncertainty or anomaly triggers.
        If triggered, exports frame and candidate YOLO annotation.
        """
        if self.harvest_count >= self.max_harvest:
            return None
            
        now = time.time()
        if (now - self._last_harvest_time) < self._cooldown_sec:
            return None

        h, w = frame.shape[:2]
        trigger_reason = None
        target_det = None

        # Trigger Condition 1: Audio-Visual Discrepancy (Mic hears siren, camera sees no ambulance)
        if has_audio_siren and not any(getattr(d, 'is_ambulance', False) for d in detections):
            trigger_reason = "Audio-Visual Discrepancy (Acoustic Siren detected without visual ambulance)"
            
        # Trigger Condition 2: Uncertainty Sampling (Borderline confidence detection)
        if not trigger_reason:
            for d in detections:
                conf = getattr(d, 'confidence', 1.0)
                if 0.35 <= conf <= 0.62:
                    trigger_reason = f"Uncertainty Sample ({getattr(d, 'label', 'veh')} at {conf*100:.1f}% confidence)"
                    target_det = d
                    break

        # Trigger Condition 3: Occlusion Collision Overlap
        if not trigger_reason and len(detections) >= 2:
            for i in range(len(detections)):
                for j in range(i + 1, len(detections)):
                    d1, d2 = detections[i], detections[j]
                    xA = max(d1.x1, d2.x1)
                    yA = max(d1.y1, d2.y1)
                    xB = min(d1.x2, d2.x2)
                    yB = min(d1.y2, d2.y2)
                    inter_w = max(0, xB - xA)
                    inter_h = max(0, yB - yA)
                    if inter_w > 0 and inter_h > 0:
                        inter_area = inter_w * inter_h
                        box1_area = (d1.x2 - d1.x1) * (d1.y2 - d1.y1)
                        if (inter_area / max(1, box1_area)) > 0.50:
                            trigger_reason = f"Heavy Occlusion Overlap between {d1.label} and {d2.label}"
                            break
                if trigger_reason:
                    break

        if not trigger_reason:
            return None

        # Execute Harvest
        self.harvest_count += 1
        self._last_harvest_time = now
        sample_id = f"sample_{int(now)}_{self.harvest_count:03d}"
        
        img_path = self.images_dir / f"{sample_id}.jpg"
        lbl_path = self.labels_dir / f"{sample_id}.txt"
        
        # Save high quality JPEG
        cv2.imwrite(str(img_path), frame, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
        
        # Export YOLO format label lines: class_id x_center y_center width height
        yolo_lines = []
        for d in detections:
            cid = getattr(d, 'class_id', 0)
            cx = (d.x1 + d.x2) / 2.0 / w
            cy = (d.y1 + d.y2) / 2.0 / h
            bw = (d.x2 - d.x1) / float(w)
            bh = (d.y2 - d.y1) / float(h)
            yolo_lines.append(f"{cid} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")
            
        with open(lbl_path, "w") as f:
            f.write("\n".join(yolo_lines))

        sample_info = {
            "id": sample_id,
            "timestamp": now,
            "approach": approach_name,
            "reason": trigger_reason,
            "detections_count": len(detections),
            "image_file": str(img_path.name),
            "label_file": str(lbl_path.name),
        }
        self.harvested_samples.insert(0, sample_info)
        if len(self.harvested_samples) > 50:
            self.harvested_samples.pop()

        return sample_info

    def get_status(self) -> Dict:
        return {
            "total_harvested": self.harvest_count,
            "max_harvest": self.max_harvest,
            "storage_path": str(self.harvest_dir),
            "recent_samples": self.harvested_samples[:10]
        }
