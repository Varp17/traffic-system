"""
core/tracker.py — Kinematic Multi-Object Tracker (IoU + Centroid Hybrid)
========================================================================
Maintains persistent vehicle identities across frames with:
  - Hybrid Hungarian IoU + Centroid distance association (ByteTrack principles)
  - Trajectory history & smooth motion modeling
  - Instantaneous velocity vector (dx, dy), calibrated speed (km/h) & acceleration
  - Stationary dwell-time tracking for accurate collision & obstruction analysis
  - Passenger Car Unit (PCU) retention
"""

import numpy as np
from typing import List, Dict, Tuple, Optional, Deque
from collections import deque, Counter
from dataclasses import dataclass, field
import time
import sys, os
import cv2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config


def compute_iou(boxA: Tuple[int, int, int, int], boxB: Tuple[int, int, int, int]) -> float:
    """Compute Intersection over Union (IoU) between two bounding boxes."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    
    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = max(1, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
    boxBArea = max(1, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))
    
    iou = interArea / float(boxAArea + boxBArea - interArea)
    return iou


@dataclass
class Track:
    """Represents a tracked vehicle or agent with kinematic state."""
    track_id:     int
    label:        str
    cx:           int
    cy:           int
    x1:           int
    y1:           int
    x2:           int
    y2:           int
    is_vehicle:   bool
    is_person:    bool
    is_ambulance: bool
    ambulance_votes: int = 0
    pcu:          float = 1.0
    confidence:   float = 0.85
    
    # Temporal & Trajectory data
    created_at:     float = field(default_factory=time.time)
    last_seen:      float = field(default_factory=time.time)
    frames_tracked: int   = 0
    label_history:  Deque[str] = field(default_factory=lambda: deque(maxlen=15))
    frames_missing: int   = 0
    hits:           int   = 1
    history:        Deque[Tuple[int, int, float]] = field(default_factory=lambda: deque(maxlen=30))
    
    # Exponential Moving Average (EMA) smoothed box coordinates to eliminate jitter/flicker
    smooth_w:       float = 0.0
    smooth_h:       float = 0.0
    smooth_cx:      float = 0.0
    smooth_cy:      float = 0.0
    smooth_x1:      float = 0.0
    smooth_y1:      float = 0.0
    smooth_x2:      float = 0.0
    smooth_y2:      float = 0.0
    
    # Kinematics
    prev_cx:      int   = 0
    prev_cy:      int   = 0
    prev_speed:   float = 0.0
    speed_px_sec: float = 0.0   # Pixels per second
    speed_kmh:    float = 0.0   # Calibrated estimate (km/h)
    acceleration: float = 0.0   # Acceleration px/s²
    had_sudden_decel: bool = False
    last_decel_spike_time: float = 0.0
    velocity_vec: Tuple[float, float] = (0.0, 0.0)
    
    # Quadrant / Lane
    lane: Optional[str] = None
    
    # Stationary / Dwell Tracking
    wait_start:    Optional[float] = None
    total_wait:    float = 0.0
    is_stopped:    bool = False
    stopped_since: float = 0.0
    
    @property
    def w(self) -> int:
        return max(1, self.x2 - self.x1)
    
    @property
    def h(self) -> int:
        return max(1, self.y2 - self.y1)
    
    @property
    def is_confirmed(self) -> bool:
        """Confirmed tracks must have survived 2+ frames to filter 1-frame flickering ghost detections."""
        return (self.frames_tracked >= 2) or (self.hits >= 2)

    @property
    def box(self) -> Tuple[int, int, int, int]:
        """Returns stable, smoothed bounding box coordinates with rigid width/height."""
        if self.smooth_w > 0:
            return (int(round(self.smooth_cx - self.smooth_w / 2.0)),
                    int(round(self.smooth_cy - self.smooth_h / 2.0)),
                    int(round(self.smooth_cx + self.smooth_w / 2.0)),
                    int(round(self.smooth_cy + self.smooth_h / 2.0)))
        if self.smooth_x2 > self.smooth_x1:
            return (int(round(self.smooth_x1)), int(round(self.smooth_y1)),
                    int(round(self.smooth_x2)), int(round(self.smooth_y2)))
        return (self.x1, self.y1, self.x2, self.y2)
    
    @property
    def centroid(self) -> Tuple[int, int]:
        return (self.cx, self.cy)
    
    @property
    def age(self) -> float:
        return time.time() - self.created_at
    
    @property
    def wait_time(self) -> float:
        """Current wait time in seconds (continuous stopped duration)."""
        if self.is_stopped and self.stopped_since > 0:
            return time.time() - self.stopped_since + self.total_wait
        return self.total_wait
    
    def update_kinematics(self, dt: float = 0.033):
        """Update velocity, speed in km/h, acceleration, and stopped status with jitter suppression."""
        dt = max(0.001, dt)
        dx = self.cx - self.prev_cx
        dy = self.cy - self.prev_cy
        # Clamp maximum delta motion to prevent astronomical speed spikes
        dist_moved = min(40.0, float(np.sqrt(dx**2 + dy**2)))
        
        # Deadband filter: Suppress bounding box pixel jitter (1.5-2px jitter creates false spikes)
        if dist_moved < 2.0:
            curr_speed_px = 0.0
            dx, dy = 0, 0
        else:
            curr_speed_px = dist_moved / dt
        
        # Pixels per second
        self.velocity_vec = (dx / dt, dy / dt)
        
        # Acceleration — only extreme kinetic shockwave (< -180 px/s²) from high speed marks sudden deceleration
        self.acceleration = (curr_speed_px - self.speed_px_sec) / dt
        if self.acceleration < -180.0 and self.speed_px_sec > 65.0:
            self.had_sudden_decel = True
            self.last_decel_spike_time = time.time()
        elif time.time() - getattr(self, 'last_decel_spike_time', 0.0) > 3.0:
            self.had_sudden_decel = False

        self.speed_px_sec = 0.85 * self.speed_px_sec + 0.15 * curr_speed_px  # High inertia motion estimate
        
        # Calibrated km/h conversion heuristic (clamped to realistic urban speeds max 65 km/h)
        if self.is_stopped:
            self.speed_kmh = 0.0
        else:
            calc_kmh = (self.speed_px_sec / 15.0) * 3.6
            self.speed_kmh = round(min(65.0, max(0.0, calc_kmh)), 1)
        
        # Stopped threshold with hysteresis:
        # Enter stopped if speed < 25 px/sec (~6 km/h)
        # Exit stopped only with sustained real movement (speed > 40 px/sec and dist_moved >= 3.0 px)
        now = time.time()
        
        if not self.is_stopped:
            if self.speed_px_sec < 25.0:
                self.is_stopped = True
                self.stopped_since = now
                self.wait_start = now
        else:
            if self.speed_px_sec > 40.0 and dist_moved >= 3.0:
                self.is_stopped = False
                if time.time() - getattr(self, 'last_decel_spike_time', 0.0) > 4.0:
                    self.had_sudden_decel = False
                if self.stopped_since > 0:
                    self.total_wait += (now - self.stopped_since)
                    self.stopped_since = 0.0
                self.wait_start = None

    def to_dict(self) -> Dict:
        """Serialize track state for frontend telemetry and scanning HUD."""
        priors = {
            "car":        {"length_m": 4.6, "width_m": 1.8, "height_m": 1.5, "footprint_m2": 8.28, "dist_to_stopline_m": 12.5},
            "motorcycle": {"length_m": 2.0, "width_m": 0.8, "height_m": 1.2, "footprint_m2": 1.60, "dist_to_stopline_m": 14.0},
            "bus":        {"length_m": 11.5, "width_m": 2.5, "height_m": 3.2, "footprint_m2": 28.75, "dist_to_stopline_m": 18.0},
            "truck":      {"length_m": 12.0, "width_m": 2.5, "height_m": 3.6, "footprint_m2": 30.00, "dist_to_stopline_m": 20.0},
            "bicycle":    {"length_m": 1.7, "width_m": 0.6, "height_m": 1.1, "footprint_m2": 1.02, "dist_to_stopline_m": 8.0},
            "person":     {"length_m": 0.5, "width_m": 0.5, "height_m": 1.7, "footprint_m2": 0.25, "dist_to_stopline_m": 4.0},
            "ambulance":  {"length_m": 5.8, "width_m": 2.1, "height_m": 2.5, "footprint_m2": 12.18, "dist_to_stopline_m": 10.0},
        }
        dim = self.dimensions if getattr(self, 'dimensions', None) else priors.get(self.label, priors["car"])
        return {
            "id": self.track_id,
            "label": self.label,
            "confidence": round(getattr(self, 'confidence', 0.85), 2),
            "lane": self.lane or "Approach",
            "pcu": self.pcu,
            "speed_kmh": round(self.speed_kmh, 1),
            "wait_time": round(self.wait_time, 1),
            "cx": self.cx,
            "cy": self.cy,
            "x1": self.x1,
            "y1": self.y1,
            "x2": self.x2,
            "y2": self.y2,
            "is_stopped": self.is_stopped,
            "is_ambulance": self.is_ambulance,
            "is_person": self.is_person,
            "dimensions": dim,
            "dist_to_stopline_m": dim.get("dist_to_stopline_m", 12.0),
            "footprint_m2": dim.get("footprint_m2", 8.28),
            "ground_x_m": getattr(self, 'ground_x_m', 0.0),
            "ground_y_m": getattr(self, 'ground_y_m', round(dim.get("dist_to_stopline_m", 12.0), 1)),
        }


class CentroidTracker:
    """
    High-accuracy multi-object tracking engine blending IoU overlap,
    motion-predicted centroid proximity, and kinematic trajectory modeling.
    """
    
    def __init__(self, max_disappeared: int = 35, max_distance: int = 120, iou_weight: float = 0.55):
        self.max_disappeared = max_disappeared
        self.max_distance    = max_distance
        self.iou_weight      = iou_weight
        
        self._next_id = 1
        self.tracks: Dict[int, Track] = {}
        self._last_update_time = time.time()
    
    def update(self, detections) -> List[Track]:
        """Update tracker with incoming frame detections."""
        now = time.time()
        dt = max(0.01, min(0.20, now - self._last_update_time))
        self._last_update_time = now
        
        # If no detections in frame, age all active tracks with velocity projection
        if not detections:
            missing_ids = []
            for tid, track in self.tracks.items():
                track.frames_missing += 1
                vx, vy = track.velocity_vec
                if (abs(vx) > 0.5 or abs(vy) > 0.5) and dt > 0:
                    track.smooth_cx += vx * dt
                    track.smooth_cy += vy * dt
                    hw = track.smooth_w / 2.0 if track.smooth_w > 0 else (track.x2 - track.x1) / 2.0
                    hh = track.smooth_h / 2.0 if track.smooth_h > 0 else (track.y2 - track.y1) / 2.0
                    track.smooth_x1 = track.smooth_cx - hw
                    track.smooth_y1 = track.smooth_cy - hh
                    track.smooth_x2 = track.smooth_cx + hw
                    track.smooth_y2 = track.smooth_cy + hh
                    track.x1 = int(round(track.smooth_x1))
                    track.y1 = int(round(track.smooth_y1))
                    track.x2 = int(round(track.smooth_x2))
                    track.y2 = int(round(track.smooth_y2))
                    track.cx = int(round(track.smooth_cx))
                    track.cy = int(round(track.smooth_cy))
                if track.frames_missing > self.max_disappeared:
                    missing_ids.append(tid)
            for tid in missing_ids:
                del self.tracks[tid]
            return list(self.tracks.values())
        
        # If no prior tracks exist, register all as new
        if not self.tracks:
            for det in detections:
                self._register(det)
            return list(self.tracks.values())
        
        # ── Multi-Metric Matching Cost Matrix (Motion-Predictive Distance + 1-IoU) ──
        track_ids = list(self.tracks.keys())
        active_tracks = [self.tracks[tid] for tid in track_ids]
        
        num_tracks = len(active_tracks)
        num_dets   = len(detections)
        cost_matrix = np.zeros((num_tracks, num_dets), dtype=float)
        
        for t_idx, track in enumerate(active_tracks):
            t_box = track.box
            vx, vy = track.velocity_vec
            # Motion-predicted centroid forward projection
            pred_cx = track.cx + (vx * dt if abs(vx) > 0.5 else 0.0)
            pred_cy = track.cy + (vy * dt if abs(vy) > 0.5 else 0.0)
            
            for d_idx, det in enumerate(detections):
                # Strict class isolation: vehicles never swap identities with pedestrians
                if (track.is_person and not det.is_person) or (track.is_vehicle and det.is_person):
                    cost_matrix[t_idx, d_idx] = 999.0
                    continue
                
                # Quadrant isolation: Never match tracks and detections across different approaches
                det_lane = getattr(det, 'lane', None)
                if track.lane and det_lane and track.lane != det_lane:
                    cost_matrix[t_idx, d_idx] = 999.0
                    continue

                # Spatial distance to predicted position
                dist = np.hypot(pred_cx - det.cx, pred_cy - det.cy)
                dist_norm = min(1.0, dist / float(self.max_distance))
                
                # IoU overlap
                iou = compute_iou(t_box, det.box)
                iou_cost = 1.0 - iou
                
                # If high IoU, heavily favor direct box overlap
                if iou >= 0.25:
                    cost_matrix[t_idx, d_idx] = 0.20 * dist_norm + 0.80 * iou_cost
                else:
                    cost_matrix[t_idx, d_idx] = (1.0 - self.iou_weight) * dist_norm + self.iou_weight * iou_cost
                
                # Hard distance cutoff for unrelated objects
                if dist > self.max_distance and iou < 0.05:
                    cost_matrix[t_idx, d_idx] = 999.0
        
        matched_tracks = set()
        matched_dets   = set()
        
        # Greedy assignment based on minimum cost
        rows, cols = np.unravel_index(np.argsort(cost_matrix, axis=None), cost_matrix.shape)
        
        for r, c in zip(rows, cols):
            if r in matched_tracks or c in matched_dets:
                continue
            if cost_matrix[r, c] > 1.8:  # Cost threshold for valid match
                break
            
            tid = track_ids[r]
            det = detections[c]
            track = self.tracks[tid]
            
            # Record trajectory (sample only when vehicle actually moved >= 2px to avoid stationary scribbles)
            if np.hypot(det.cx - track.cx, det.cy - track.cy) >= 2.0:
                track.history.append((track.cx, track.cy, now))
            
            # Update kinematics
            track.prev_cx = track.cx
            track.prev_cy = track.cy
            track.cx = det.cx
            track.cy = det.cy
            if getattr(det, 'lane', None):
                track.lane = det.lane
            
            # Exponential Moving Average (EMA) coordinate smoothing with high inertia center + dimension filtering
            w_alpha = 0.88
            c_alpha = 0.70
            if track.smooth_w > 0 and track.smooth_h > 0:
                track.smooth_w  = w_alpha * track.smooth_w  + (1.0 - w_alpha) * det.w
                track.smooth_h  = w_alpha * track.smooth_h  + (1.0 - w_alpha) * det.h
                track.smooth_cx = c_alpha * track.smooth_cx + (1.0 - c_alpha) * det.cx
                track.smooth_cy = c_alpha * track.smooth_cy + (1.0 - c_alpha) * det.cy
            else:
                track.smooth_w  = float(det.w)
                track.smooth_h  = float(det.h)
                track.smooth_cx = float(det.cx)
                track.smooth_cy = float(det.cy)

            hw = track.smooth_w / 2.0
            hh = track.smooth_h / 2.0
            track.smooth_x1 = track.smooth_cx - hw
            track.smooth_y1 = track.smooth_cy - hh
            track.smooth_x2 = track.smooth_cx + hw
            track.smooth_y2 = track.smooth_cy + hh

            track.x1 = int(round(track.smooth_x1))
            track.y1 = int(round(track.smooth_y1))
            track.x2 = int(round(track.smooth_x2))
            track.y2 = int(round(track.smooth_y2))
            track.hits += 1

            track.confidence = round(float(getattr(det, 'confidence', track.confidence)), 2)
            
            # Majority voting across detection history to prevent label fluttering
            track.label_history.append(det.label)
            modal_label = Counter(track.label_history).most_common(1)[0][0]

            # Strict vehicle type enforcement: confirmed transit bus (cls_id 5) or auto-rickshaw is not an ambulance
            if det.label == "bus" and getattr(det, 'class_id', -1) == 5:
                track.is_ambulance = False
                track.ambulance_votes = 0
                track.label = "bus"
                track.pcu = 3.0
            elif det.label in ["rickshaw", "auto"] or getattr(det, 'class_id', -1) == 82:
                track.is_ambulance = False
                track.ambulance_votes = 0
                track.label = "rickshaw"
                track.pcu = 0.8
            elif det.is_ambulance:
                track.ambulance_votes = min(15, track.ambulance_votes + 1)
                if track.ambulance_votes >= 3:
                    track.is_ambulance = True
                    track.label = "ambulance"
                    track.pcu = 0.0
                    track.last_ambulance_time = now
            else:
                track.ambulance_votes = max(0, track.ambulance_votes - 1)
                if track.ambulance_votes < 3:
                    track.is_ambulance = False
                    track.label = modal_label
                    track.pcu = getattr(det, 'pcu', 1.0)
                else:
                    track.is_ambulance = True
                    track.label = "ambulance"
                    track.pcu = 0.0

            track.last_seen = now
            track.frames_tracked += 1
            track.frames_missing = 0
            
            track.update_kinematics(dt)
            
            matched_tracks.add(r)
            matched_dets.add(c)
        
        # Register new detections
        for i, det in enumerate(detections):
            if i not in matched_dets:
                self._register(det)
        
        # Clean up stale vanished tracks and project missing tracks with velocity
        missing_ids = []
        for i, tid in enumerate(track_ids):
            if i not in matched_tracks:
                track = self.tracks[tid]
                track.frames_missing += 1
                
                # Smooth velocity projection while momentarily occluded or missing
                vx, vy = track.velocity_vec
                if (abs(vx) > 0.5 or abs(vy) > 0.5) and dt > 0:
                    track.smooth_cx += vx * dt
                    track.smooth_cy += vy * dt
                    hw = track.smooth_w / 2.0 if track.smooth_w > 0 else (track.x2 - track.x1) / 2.0
                    hh = track.smooth_h / 2.0 if track.smooth_h > 0 else (track.y2 - track.y1) / 2.0
                    track.smooth_x1 = track.smooth_cx - hw
                    track.smooth_y1 = track.smooth_cy - hh
                    track.smooth_x2 = track.smooth_cx + hw
                    track.smooth_y2 = track.smooth_cy + hh
                    track.x1 = int(round(track.smooth_x1))
                    track.y1 = int(round(track.smooth_y1))
                    track.x2 = int(round(track.smooth_x2))
                    track.y2 = int(round(track.smooth_y2))
                    track.cx = int(round(track.smooth_cx))
                    track.cy = int(round(track.smooth_cy))

                if track.frames_missing > self.max_disappeared:
                    missing_ids.append(tid)
        
        for tid in missing_ids:
            del self.tracks[tid]
        
        return list(self.tracks.values())
    
    def _register(self, det) -> Track:
        """Instantiate and track a new object detection."""
        is_bus = (det.label == "bus" or getattr(det, 'class_id', -1) == 5)
        has_amb_signal = (not is_bus) and bool(det.is_ambulance or getattr(det, 'has_emergency_lights', False))
        track_lbl = "bus" if is_bus else det.label
        track_pcu = 3.0 if is_bus else getattr(det, 'pcu', 1.0)
        track = Track(
            track_id=self._next_id,
            label=track_lbl,
            cx=det.cx, cy=det.cy,
            x1=det.x1, y1=det.y1,
            x2=det.x2, y2=det.y2,
            is_vehicle=det.is_vehicle,
            is_person=det.is_person,
            is_ambulance=False,
            ambulance_votes=1 if has_amb_signal else 0,
            pcu=track_pcu,
            confidence=round(float(getattr(det, 'confidence', 0.85)), 2),
            smooth_w=float(det.w),
            smooth_h=float(det.h),
            smooth_cx=float(det.cx),
            smooth_cy=float(det.cy),
            smooth_x1=float(det.x1),
            smooth_y1=float(det.y1),
            smooth_x2=float(det.x2),
            smooth_y2=float(det.y2),
            lane=getattr(det, 'lane', None),
            hits=1
        )
        track.prev_cx = det.cx
        track.prev_cy = det.cy
        track.history.append((det.cx, det.cy, time.time()))
        track.label_history.append(track_lbl)
        self.tracks[self._next_id] = track
        self._next_id += 1
        return track
    
    def get_vehicle_tracks(self) -> List[Track]:
        return [t for t in self.tracks.values() if t.is_vehicle]
    
    def get_ambulance_tracks(self) -> List[Track]:
        return [t for t in self.tracks.values() if t.is_ambulance]
    
    def get_stopped_vehicles(self, min_wait: float = 3.0) -> List[Track]:
        return [t for t in self.tracks.values() if t.is_vehicle and t.is_stopped and t.wait_time >= min_wait]
    
    @property
    def total_active(self) -> int:
        return len(self.tracks)
    
    def draw_tracks(self, frame: np.ndarray, track_list: Optional[List[Track]] = None) -> np.ndarray:
        """Draw smooth anti-aliased bounding boxes, labels, and motion trails on confirmed tracks."""
        tracks = track_list or list(self.tracks.values())
        h, w = frame.shape[:2]

        CLASS_COLORS = {
            "car":        (240, 160, 40),   # Sky blue (BGR)
            "bus":        (80, 210, 110),   # Emerald
            "truck":      (60, 190, 100),   # Forest emerald
            "motorcycle": (40, 180, 245),   # Amber
            "bicycle":    (60, 200, 240),   # Yellow
            "rickshaw":   (40, 210, 240),   # Warm yellow
            "auto":       (40, 210, 240),   # Warm yellow
            "person":     (210, 110, 180),  # Violet
            "ambulance":  (40, 40, 240),    # High-intensity Red
        }

        for track in tracks:
            # Filter: only draw confirmed tracks (2+ hits) and only if currently visible (frames_missing <= 2)
            # This ensures only vehicles physically present are shown, eliminating ghost boxes!
            if not track.is_confirmed or track.frames_missing > 2:
                continue

            bx1, by1, bx2, by2 = track.box
            bx1 = max(0, min(w - 5, bx1))
            by1 = max(0, min(h - 5, by1))
            bx2 = max(bx1 + 5, min(w, bx2))
            by2 = max(by1 + 5, min(h, by2))

            lbl = str(track.label).lower().strip()
            base_color = CLASS_COLORS.get(lbl, (220, 170, 50))
            if track.is_ambulance:
                base_color = (40, 40, 240)

            # Draw sleek 2px bounding box with anti-aliasing
            cv2.rectangle(frame, (bx1, by1), (bx2, by2), base_color, 2, cv2.LINE_AA)

            # Subtle white corner brackets for crisp edge definition
            c_len = max(6, min(14, (bx2 - bx1) // 4, (by2 - by1) // 4))
            cv2.line(frame, (bx1, by1), (bx1 + c_len, by1), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.line(frame, (bx1, by1), (bx1, by1 + c_len), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.line(frame, (bx2, by1), (bx2 - c_len, by1), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.line(frame, (bx2, by1), (bx2, by1 + c_len), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.line(frame, (bx1, by2), (bx1 + c_len, by2), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.line(frame, (bx1, by2), (bx1, by2 - c_len), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.line(frame, (bx2, by2), (bx2 - c_len, by2), (255, 255, 255), 2, cv2.LINE_AA)
            cv2.line(frame, (bx2, by2), (bx2, by2 - c_len), (255, 255, 255), 2, cv2.LINE_AA)

            # Draw smooth motion trail only for moving vehicles (never stationary clutter)
            if not track.is_stopped and len(track.history) > 2:
                pts = [(int(pt[0]), int(pt[1])) for pt in track.history]
                for i in range(1, len(pts)):
                    p1 = pts[i - 1]
                    p2 = pts[i]
                    # Only draw segment if within realistic movement distance (< 35px) to eliminate teleporting lines
                    if np.hypot(p2[0] - p1[0], p2[1] - p1[1]) < 35.0:
                        alpha = i / len(pts)
                        thick = 1 if i < (len(pts) // 2) else 2
                        color = (int(base_color[0] * alpha), int(base_color[1] * alpha), int(base_color[2] * alpha))
                        cv2.line(frame, p1, p2, color, thick, cv2.LINE_AA)

            # Top label badge (Clean ASCII formatting with pipe | to prevent OpenCV Hershey ?? rendering)
            if track.is_ambulance:
                tag = f"[EVP] #{track.track_id} AMBULANCE"
            elif track.is_person:
                tag = f"#{track.track_id} PEDESTRIAN"
            else:
                speed_str = f"{track.speed_kmh:.0f}km/h" if not track.is_stopped else f"STOP {track.wait_time:.0f}s"
                tag = f"#{track.track_id} {lbl.upper()} | {speed_str}"

            (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.36, 1)
            tag_y2 = max(th + 6, by1 - 3)
            tag_y1 = tag_y2 - th - 5
            tag_x1 = bx1
            tag_x2 = min(w, tag_x1 + tw + 8)

            cv2.rectangle(frame, (tag_x1, tag_y1), (tag_x2, tag_y2), (10, 15, 25), -1)
            cv2.rectangle(frame, (tag_x1, tag_y1), (tag_x2, tag_y2), base_color, 1, cv2.LINE_AA)
            cv2.putText(frame, tag, (tag_x1 + 4, tag_y2 - 3),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.36, (255, 255, 255), 1, cv2.LINE_AA)

        return frame
