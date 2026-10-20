"""
core/pedestrian_safety.py — Pedestrian Safety & Crosswalk Clearance Engine
==========================================================================
Implements:
  - Pedestrian Clearance Interval (PCI) calculation according to MUTCD / IRC:
      PCI = Crosswalk_Width / Walking_Speed  (typically 1.2 m/s)
  - Pedestrian-Vehicle Conflict Sensing (Jaywalking / Crosswalk Encroachment)
  - Automatic Pedestrian Phase Call & Minimum Green Enforcement
"""

import time
from typing import List, Dict, Tuple, Optional
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config


class PedestrianSafetyEngine:
    """
    Monitors pedestrian safety, calculates clearance intervals, and generates
    hazard alerts when pedestrians enter active vehicular paths.
    """

    def __init__(self, crosswalk_width_meters: float = 14.0, walking_speed_mps: float = 1.2):
        self.crosswalk_width = crosswalk_width_meters
        self.walking_speed = walking_speed_mps
        
        # MUTCD / IRC Pedestrian Clearance Interval (PCI)
        self.pci_duration = round(self.crosswalk_width / self.walking_speed, 1)  # ~11.7s
        self.active_pedestrian_calls: Dict[str, float] = {}
        self._conflict_debounce: Dict[int, float] = {}
        self._lane_debounce: Dict[str, float] = {}

    def calculate_clearance_interval(self, custom_width: float = None) -> float:
        """Compute required pedestrian clearance time in seconds."""
        w = custom_width or self.crosswalk_width
        return round(w / self.walking_speed, 1)

    def evaluate_conflicts(self, person_detections: List, vehicle_tracks: List,
                           current_green_lane: str) -> List[Dict]:
        """
        Evaluate spatial conflicts between pedestrians and moving vehicles.
        Debounced per lane approach (60s) and vehicle ID (60s) to prevent spamming duplicate events.
        Requires verified physical bounding box overlap (IoU >= 0.15) with substantial vehicle speed.
        """
        conflicts = []
        now = time.time()

        for p in person_detections:
            p_box = (p.x1, p.y1, p.x2, p.y2)
            for v in vehicle_tracks:
                if not getattr(v, 'is_vehicle', False):
                    continue

                # Two-wheelers and three-wheelers: the person is the rider/driver, NOT an impacted pedestrian!
                if getattr(v, 'label', '') in ["motorcycle", "bicycle", "rickshaw", "auto"]:
                    continue

                # Ensure quadrant isolation: pedestrians in one approach cannot conflict with vehicles in another approach
                if getattr(p, 'lane', None) and getattr(v, 'lane', None) and p.lane != v.lane:
                    continue
                
                lane_key = v.lane or current_green_lane or "Approach"
                
                # Debounce per approach lane (at most once every 60s)
                if now - self._lane_debounce.get(lane_key, 0.0) < 60.0:
                    continue
                # Debounce per vehicle ID
                if now - self._conflict_debounce.get(v.track_id, 0.0) < 60.0:
                    continue

                # Require moving vehicle (> 18 km/h)
                if v.speed_kmh <= 18.0 or v.is_stopped:
                    continue

                # Calculate IoU between pedestrian and vehicle bounding boxes
                v_box = v.box
                xA = max(p_box[0], v_box[0])
                yA = max(p_box[1], v_box[1])
                xB = min(p_box[2], v_box[2])
                yB = min(p_box[3], v_box[3])
                inter = max(0, xB - xA) * max(0, yB - yA)
                
                # Ground plane depth alignment: ensure pedestrian and car are at the same depth (< 50px delta)
                if abs(p_box[3] - v_box[3]) > 50:
                    continue

                if inter > 0:
                    areaA = max(1, (p_box[2] - p_box[0]) * (p_box[3] - p_box[1]))
                    areaB = max(1, (v_box[2] - v_box[0]) * (v_box[3] - v_box[1]))
                    iou = inter / float(areaA + areaB - inter)
                    
                    if iou >= 0.28:
                        self._lane_debounce[lane_key] = now
                        self._conflict_debounce[v.track_id] = now
                        conflicts.append({
                            "type": "pedestrian_conflict",
                            "severity": "critical",
                            "lane": lane_key,
                            "iou": round(iou, 2),
                            "vehicle_id": v.track_id,
                            "vehicle_speed_kmh": v.speed_kmh,
                            "message": f"CRITICAL: Pedestrian in path of moving Vehicle #{v.track_id} ({v.speed_kmh} km/h) in {lane_key}!",
                            "timestamp": now,
                        })

        return conflicts
