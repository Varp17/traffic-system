"""
core/v2x_engine.py — Connected Vehicle V2X & SAE J2735 Protocol Engine
======================================================================
Implements standard SAE J2735 V2X messaging:
  - SPaT (Signal Phase and Timing, DSRC/C-V2X ID 19)
  - MAP (Intersection Topology Geometry, ID 18)
  - SRM / SSM (Signal Request & Status for EVP / TSP priority)
Allows connected autonomous vehicles (CAVs) to receive real-time signal countdowns.
"""

import time
from typing import Dict, List, Optional
from dataclasses import dataclass, field
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config


@dataclass
class V2XPhaseState:
    phase_id: int
    lane: str
    state: str              # "green", "yellow", "red"
    time_remaining: float
    min_end_time: float
    max_end_time: float
    preemption_active: bool


class V2XEngine:
    """
    Broadcasts SAE J2735 compliant SPaT & MAP messages and evaluates
    Connected Vehicle priority requests (EVP for Ambulances, TSP for Transit Buses).
    """

    def __init__(self, intersection_id: str = "INT_DEV_001"):
        self.intersection_id = intersection_id
        self.message_revision = 1
        self.active_priority_requests: List[Dict] = []
        self._last_spat_time = 0.0

    def generate_spat_message(self, optimizer_metrics: Dict) -> Dict:
        """
        Generate SAE J2735 standard Signal Phase and Timing (SPaT) message.
        Broadcast to connected vehicles approaching the intersection.
        """
        now = time.time()
        signals = optimizer_metrics.get("signals", {})
        emergency_active = optimizer_metrics.get("emergency_active", False)
        emergency_lane = optimizer_metrics.get("emergency_lane")
        
        phase_map = {"North": 1, "South": 2, "East": 3, "West": 4}
        phases = []

        for lane_name, p_id in phase_map.items():
            sig = signals.get(lane_name, {"state": "red", "time_left": 0.0})
            state_val = sig.get("state", "red")
            time_left = float(sig.get("time_left", 0.0))
            is_preempt = emergency_active and (emergency_lane == lane_name)

            phases.append({
                "phaseId": p_id,
                "lane": lane_name,
                "currentState": state_val,
                "timeRemainingSec": round(time_left, 1),
                "minEndTime": round(now + time_left, 1),
                "maxEndTime": round(now + time_left + 15.0, 1),
                "preemptionActive": is_preempt,
            })

        self.message_revision += 1
        self._last_spat_time = now

        return {
            "messageId": 19,  # SAE J2735 SPaT standard identifier
            "intersectionId": self.intersection_id,
            "revision": self.message_revision,
            "status": "operational",
            "timestamp": now,
            "websterCycleLength": optimizer_metrics.get("webster_cycle_length", 60.0),
            "emergencyActive": emergency_active,
            "emergencyLane": emergency_lane,
            "phases": phases,
        }

    def generate_map_message(self) -> Dict:
        """Generate SAE J2735 standard MAP message describing intersection geometry."""
        return {
            "messageId": 18,  # SAE J2735 MAP standard identifier
            "intersectionId": self.intersection_id,
            "referencePoint": {"lat": 12.9716, "lon": 77.5946, "elevationM": 920.0},
            "approaches": [
                {"name": "North", "speedLimitKmh": 50, "lanes": [1, 2], "directionDeg": 180},
                {"name": "South", "speedLimitKmh": 50, "lanes": [1, 2], "directionDeg": 0},
                {"name": "East",  "speedLimitKmh": 50, "lanes": [1, 2], "directionDeg": 270},
                {"name": "West",  "speedLimitKmh": 50, "lanes": [1, 2], "directionDeg": 90},
            ]
        }

    def handle_signal_request(self, request: Dict) -> Dict:
        """
        Process an incoming V2X Signal Request Message (SRM):
          - Priority: "EVP" (Emergency Vehicle Preemption)
          - Priority: "TSP" (Transit Signal Priority)
        """
        req_id = request.get("requestId", str(time.time()))
        vehicle_type = request.get("type", "ambulance")
        approach = request.get("lane", "North")
        priority = request.get("priority", "EVP")  # "EVP" or "TSP"

        self.active_priority_requests.append({
            "requestId": req_id,
            "type": vehicle_type,
            "lane": approach,
            "priority": priority,
            "timestamp": time.time(),
        })

        return {
            "messageId": 20,  # SAE J2735 SSM (Signal Status Message)
            "requestId": req_id,
            "status": "GRANTED" if priority == "EVP" else "QUEUED",
            "lane": approach,
            "grantedAt": time.time(),
        }
