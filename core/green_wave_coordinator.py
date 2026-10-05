"""
core/green_wave_coordinator.py — Multi-Intersection Arterial Green Wave Coordinator
=====================================================================================
Synchronizes signal phases across successive intersections along an arterial corridor:
  - Calculates progression offsets: Offset = D / v_prog (mod Co)
  - Tracks outgoing vehicle platoons and predicts arrival times at downstream nodes
  - Maximizes green wave bandwidth B = g - (L_platoon / v_prog)
"""

import time
from typing import Dict, List, Optional
from dataclasses import dataclass
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config


@dataclass
class IntersectionNode:
    intersection_id: str
    distance_meters: float      # Distance from primary intersection
    progression_speed_kmh: float = 45.0  # Ideal progression speed


class GreenWaveCoordinator:
    """
    Arterial coordination manager providing synchronized green waves across
    a network of signalized junctions.
    """

    def __init__(self, primary_id: str = "INT_DEV_001"):
        self.primary_id = primary_id
        self.progression_speed_kmh = 45.0
        
        # Downstream corridor neighbors along major axes
        self.corridor_nodes: Dict[str, IntersectionNode] = {
            "North_Jct_2": IntersectionNode(intersection_id="INT_NORTH_002", distance_meters=450.0),
            "South_Jct_2": IntersectionNode(intersection_id="INT_SOUTH_002", distance_meters=520.0),
            "East_Jct_2":  IntersectionNode(intersection_id="INT_EAST_002",  distance_meters=380.0),
            "West_Jct_2":  IntersectionNode(intersection_id="INT_WEST_002",  distance_meters=490.0),
        }

    def compute_progression_offset(self, distance_meters: float, cycle_length: float,
                                    speed_kmh: float = None) -> float:
        """
        Compute ideal signal progression offset:
          Offset = (Distance / Progression_Velocity) mod Cycle_Length
        """
        speed = speed_kmh or self.progression_speed_kmh
        speed_mps = max(5.0, (speed * 1000.0) / 3600.0)  # Convert km/h to m/s
        
        travel_time_sec = distance_meters / speed_mps
        cycle = max(30.0, cycle_length)
        ideal_offset = travel_time_sec % cycle
        return round(ideal_offset, 1)

    def calculate_green_bandwidth(self, effective_green_sec: float, platoon_length_meters: float,
                                   speed_kmh: float = None) -> float:
        """
        Compute green wave bandwidth (usable uninterrupted green window):
          Bandwidth = g - (L_platoon / v_prog)
        """
        speed = speed_kmh or self.progression_speed_kmh
        speed_mps = max(5.0, (speed * 1000.0) / 3600.0)
        
        platoon_clearance_sec = platoon_length_meters / speed_mps
        bandwidth = max(0.0, effective_green_sec - platoon_clearance_sec)
        return round(bandwidth, 1)

    def get_corridor_synchronization_plan(self, current_webster_cycle: float) -> Dict:
        """Generate synchronization plan for all downstream arterial nodes."""
        plan = {}
        for name, node in self.corridor_nodes.items():
            offset = self.compute_progression_offset(node.distance_meters, current_webster_cycle, node.progression_speed_kmh)
            speed_mps = (node.progression_speed_kmh * 1000.0) / 3600.0
            eta_sec = round(node.distance_meters / speed_mps, 1)
            
            plan[name] = {
                "neighborId": node.intersection_id,
                "distanceMeters": node.distance_meters,
                "progressionSpeedKmh": node.progression_speed_kmh,
                "idealOffsetSec": offset,
                "platoonEtaSec": eta_sec,
                "coordinatedStatus": "SYNCHRONIZED"
            }
        return {
            "primaryIntersection": self.primary_id,
            "masterCycleLength": current_webster_cycle,
            "corridorNodes": plan,
        }
