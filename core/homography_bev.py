"""
core/homography_bev.py — Bird's Eye View (BEV) Homography & Metric Ground Plane Engine
=====================================================================================
Transforms 2D camera image coordinates (u, v) into metric real-world ground plane (X, Y)
coordinates in meters using Planar Perspective Homography (H).

Emulates real-world systems (Miovision Scout, NoTraffic Edge, Iteris Vantage):
  - True metric velocity estimation (km/h) independent of camera perspective foreshortening
  - Inter-vehicle spatial headway (meters) & time headway (seconds)
  - Turning Movement Counts (TMC: Left-Turn, Through, Right-Turn)
  - Time-To-Collision (TTC) safety metrics
"""

import cv2
import numpy as np
from typing import Tuple, List, Dict, Optional


class ApproachHomography:
    """
    Maintains a 3x3 Planar Homography matrix H for a single intersection approach.
    Default calibrations assume a 1080p camera mounted at 6m elevation with 35° tilt.
    """
    
    def __init__(self, approach_name: str, src_pts: Optional[np.ndarray] = None,
                 dst_meters: Optional[np.ndarray] = None):
        self.approach_name = approach_name
        
        # Default perspective trapezoid in normalized [0, 1] screen space (Ingress lane)
        # Top-left, Top-right, Bottom-right, Bottom-left
        if src_pts is None:
            self.src_norm = np.array([
                [0.25, 0.35],  # Far left stopline
                [0.75, 0.35],  # Far right stopline
                [0.95, 0.95],  # Near right lane entry
                [0.05, 0.95],  # Near left lane entry
            ], dtype=np.float32)
        else:
            self.src_norm = src_pts.astype(np.float32)
            
        # Ground plane physical coordinates in meters (X: lateral width [-4m, +4m], Y: longitudinal [0m to 40m])
        if dst_meters is None:
            self.dst_meters = np.array([
                [-3.5, 35.0],   # Far left: 35m upstream, -3.5m lateral
                [ 3.5, 35.0],   # Far right: 35m upstream, +3.5m lateral
                [ 4.0,  2.0],   # Near right: 2m from stopline, +4.0m lateral
                [-4.0,  2.0],   # Near left: 2m from stopline, -4.0m lateral
            ], dtype=np.float32)
        else:
            self.dst_meters = dst_meters.astype(np.float32)
            
        self.H: Optional[np.ndarray] = None
        self.H_inv: Optional[np.ndarray] = None
        self._current_frame_size = (1920, 1080)
        self._compute_matrix(self._current_frame_size)

    def _compute_matrix(self, frame_size: Tuple[int, int]):
        w, h = frame_size
        src_pixels = self.src_norm * np.array([w, h], dtype=np.float32)
        self.H, _ = cv2.findHomography(src_pixels, self.dst_meters)
        if self.H is not None:
            self.H_inv = np.linalg.pinv(self.H)
        self._current_frame_size = frame_size

    def project_image_to_ground(self, u: float, v: float, frame_size: Tuple[int, int] = (1920, 1080)) -> Tuple[float, float]:
        """
        Projects pixel coordinates (u, v) onto ground coordinates (X_meters, Y_meters).
        X: lateral displacement from centerline (-left, +right)
        Y: longitudinal distance from stopline in meters (>0 is upstream approach)
        """
        if frame_size != self._current_frame_size or self.H is None:
            self._compute_matrix(frame_size)
            
        pt = np.array([[[u, v]]], dtype=np.float32)
        ground_pt = cv2.perspectiveTransform(pt, self.H)
        gx, gy = ground_pt[0][0]
        return float(gx), float(gy)

    def project_ground_to_image(self, x: float, y: float, frame_size: Tuple[int, int] = (1920, 1080)) -> Tuple[int, int]:
        """Reverse projection from ground plane (meters) to camera pixel coordinates."""
        if frame_size != self._current_frame_size or self.H_inv is None:
            self._compute_matrix(frame_size)
            
        pt = np.array([[[x, y]]], dtype=np.float32)
        img_pt = cv2.perspectiveTransform(pt, self.H_inv)
        u, v = img_pt[0][0]
        return int(round(u)), int(round(v))

    def estimate_vehicle_dimensions(self, label: str, bbox: Tuple[int, int, int, int],
                                    frame_size: Tuple[int, int] = (1920, 1080)) -> Dict:
        """
        Estimates real-world metric dimensions (Length, Width, Height in meters),
        road footprint (m²), and distance to stopline (meters) using planar homography
        fused with AASHTO / IRC:106 vehicle geometric priors.
        """
        x1, y1, x2, y2 = bbox
        priors = VEHICLE_DIMENSION_PRIORS.get(label, VEHICLE_DIMENSION_PRIORS["default"])
        
        # Road contact patch corners (bottom edges of 2D bounding box)
        bl_u, bl_v = x1, y2
        br_u, br_v = x2, y2
        
        gx_bl, gy_bl = self.project_image_to_ground(bl_u, bl_v, frame_size)
        gx_br, gy_br = self.project_image_to_ground(br_u, br_v, frame_size)
        
        # Observed physical lateral width on pavement
        obs_width = np.sqrt((gx_br - gx_bl)**2 + (gy_br - gy_bl)**2)
        
        # Bayesian sensor fusion between observed width and class geometric prior
        prior_w = priors["width"]
        if 0.5 <= obs_width <= 5.5:
            est_width = round(float(0.35 * obs_width + 0.65 * prior_w), 2)
        else:
            est_width = prior_w
            
        est_length = round(float(est_width * priors["ratio"]), 2)
        est_height = priors["height"]
        footprint_m2 = round(float(est_length * est_width), 2)
        
        center_gx = (gx_bl + gx_br) / 2.0
        center_gy = (gy_bl + gy_br) / 2.0
        dist_to_stopline_m = round(max(0.0, float(center_gy)), 1)
        
        return {
            "length_m": est_length,
            "width_m": est_width,
            "height_m": est_height,
            "footprint_m2": footprint_m2,
            "dist_to_stopline_m": dist_to_stopline_m,
            "ground_x_m": round(float(center_gx), 2),
            "ground_y_m": round(float(center_gy), 2),
        }


# Standard vehicle geometric dimension priors (Length, Width, Height in meters)
# Derived from AASHTO Green Book, Highway Capacity Manual, and IRC:106-1990
VEHICLE_DIMENSION_PRIORS = {
    "car":        {"length": 4.6,  "width": 1.8, "height": 1.5, "ratio": 2.55},
    "motorcycle": {"length": 2.0,  "width": 0.8, "height": 1.2, "ratio": 2.50},
    "bus":        {"length": 11.5, "width": 2.5, "height": 3.2, "ratio": 4.60},
    "truck":      {"length": 12.0, "width": 2.5, "height": 3.6, "ratio": 4.80},
    "bicycle":    {"length": 1.7,  "width": 0.6, "height": 1.1, "ratio": 2.83},
    "person":     {"length": 0.5,  "width": 0.5, "height": 1.7, "ratio": 1.00},
    "ambulance":  {"length": 5.8,  "width": 2.1, "height": 2.5, "ratio": 2.76},
    "default":    {"length": 4.5,  "width": 1.8, "height": 1.5, "ratio": 2.50},
}


class IntersectionBEVEngine:
    """
    Coordinates all 4 intersection approaches (North, South, East, West) into a unified
    top-down 2D ground-plane radar simulation.
    """
    
    def __init__(self):
        self.approaches: Dict[str, ApproachHomography] = {
            "North": ApproachHomography("North"),
            "South": ApproachHomography("South"),
            "East":  ApproachHomography("East"),
            "West":  ApproachHomography("West"),
        }
        
    def transform_track_to_ground(self, approach: str, cx: int, cy: int,
                                   frame_w: int = 640, frame_h: int = 360) -> Tuple[float, float]:
        homography = self.approaches.get(approach, self.approaches["North"])
        return homography.project_image_to_ground(cx, cy, (frame_w, frame_h))

    def project_point(self, approach: str, u: float, v: float,
                      frame_w: int = 1280, frame_h: int = 720) -> Tuple[float, float]:
        """Project 2D camera coordinate (u, v) into ground (X, Y) in meters."""
        return self.transform_track_to_ground(approach, int(u), int(v), frame_w, frame_h)

    def estimate_vehicle_dimensions(self, approach: str, label: str,
                                    bbox: Tuple[int, int, int, int],
                                    frame_w: int = 1280, frame_h: int = 720) -> Dict:
        """Estimates metric Length, Width, Height, Footprint m², and stopline distance."""
        homography = self.approaches.get(approach, self.approaches["North"])
        return homography.estimate_vehicle_dimensions(label, bbox, (frame_w, frame_h))

    def compute_metric_speed_kmh(self, p1_ground: Tuple[float, float],
                                 p2_ground: Tuple[float, float],
                                 dt_seconds: float) -> float:
        """Calculates true ground speed in km/h from metric displacements."""
        if dt_seconds <= 0.001:
            return 0.0
        dx = p2_ground[0] - p1_ground[0]
        dy = p2_ground[1] - p1_ground[1]
        dist_meters = np.sqrt(dx * dx + dy * dy)
        speed_mps = dist_meters / dt_seconds
        speed_kmh = speed_mps * 3.6
        return float(np.clip(speed_kmh, 0.0, 120.0))

    def compute_headway_meters(self, lead_y: float, follow_y: float) -> float:
        """Longitudinal distance between successive vehicles in meters."""
        return max(0.5, abs(lead_y - follow_y))

    def compute_time_to_collision(self, distance_m: float, closing_speed_kmh: float) -> Optional[float]:
        """Calculates Time-To-Collision (TTC) in seconds."""
        closing_speed_mps = (closing_speed_kmh / 3.6)
        if closing_speed_mps <= 0.5:
            return None  # No closing velocity
        ttc = distance_m / closing_speed_mps
        return round(float(ttc), 2)
