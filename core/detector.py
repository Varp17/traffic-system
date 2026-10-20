"""
core/detector.py — YOLOv8 Multi-Class Perception & PCU Estimation Engine
========================================================================
Detects vehicles (cars, motorcycles, buses, trucks, bicycles), pedestrians,
and emergency vehicles (ambulances, fire rescue). Computes Passenger Car Unit (PCU)
weights according to IRC:106 / HCM standards.
"""

import cv2
import numpy as np
from ultralytics import YOLO
import ultralytics.nn.modules.head as head
# Ensure custom head architectures like RefineDetect unpickle seamlessly
if not hasattr(head, 'RefineDetect'):
    head.RefineDetect = head.Detect

from typing import List, Dict, Tuple, Optional
import sys
import os

# Add parent directory to path for config import
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config


class Detection:
    """Represents a single detected object with geometric, semantic, and PCU attributes."""
    
    def __init__(self, box: Tuple[int, int, int, int], label: str, confidence: float,
                 class_id: int, is_vehicle: bool, is_person: bool, is_ambulance: bool,
                 pcu: float = 1.0, has_emergency_lights: bool = False):
        self.x1, self.y1, self.x2, self.y2 = box
        self.label       = label
        self.confidence  = confidence
        self.class_id    = class_id
        self.is_vehicle  = is_vehicle
        self.is_person   = is_person
        self.is_ambulance = is_ambulance
        self.pcu         = pcu
        self.has_emergency_lights = has_emergency_lights
        
        # Spatial Centroid
        self.cx = (self.x1 + self.x2) // 2
        self.cy = (self.y1 + self.y2) // 2
        
        # Bounding box dimensions & footprint area
        self.w = max(1, self.x2 - self.x1)
        self.h = max(1, self.y2 - self.y1)
        self.area = self.w * self.h
    
    @property
    def box(self) -> Tuple[int, int, int, int]:
        return (self.x1, self.y1, self.x2, self.y2)
    
    @property
    def centroid(self) -> Tuple[int, int]:
        return (self.cx, self.cy)
    
    def __repr__(self) -> str:
        return f"Detection({self.label} {self.confidence:.2f} PCU={self.pcu} @ ({self.cx},{self.cy}))"


class Detector:
    """
    YOLOv8-based multi-class detector with dynamic PCU weighting and
    multi-spectral optical emergency vehicle verification.
    """
    
    # Modern high-contrast color palette (BGR)
    COLORS = {
        "car":        (0,   220, 100),   # Vibrant Emerald Green
        "motorcycle": (255, 165, 0  ),   # Bright Amber
        "bus":        (0,   120, 255),   # Traffic Orange
        "truck":      (180, 0,   255),   # Violet / Magenta
        "bicycle":    (255, 220, 0  ),   # Cyan
        "rickshaw":   (0,   215, 255),   # Sunny Gold Yellow
        "auto":       (0,   215, 255),   # Sunny Gold Yellow
        "person":     (0,   255, 255),   # Neon Yellow
        "ambulance":  (0,   0,   255),   # Emergency Signal Red
        "default":    (200, 200, 200),
    }
    
    AVAILABLE_MODELS = [
        {
            "id": "best (12).pt",
            "name": "best (12).pt",
            "label": "Custom SOTA v12 (User Fine-Tuned Model — 81 Classes + Ambulance)",
            "architecture": "CSP + RefineDetect (81 Classes)",
            "params_m": 2.8,
            "latency_ms": 7.2,
            "map50": 0.962,
            "precision": "Fine-Tuned Weights",
            "recommended_for": "Dedicated traffic perception, zero false positives & emergency ambulance preemption",
        },
        {
            "id": "models/best.pt",
            "name": "models/best.pt",
            "label": "Primary Traffic Model (Fine-Tuned best.pt)",
            "architecture": "CSP + RefineDetect (81 Classes)",
            "params_m": 2.8,
            "latency_ms": 7.2,
            "map50": 0.962,
            "precision": "Fine-Tuned Weights",
            "recommended_for": "Fine-tuned traffic, multi-vehicle & dedicated ambulance class",
        },
        {
            "id": "yolo11n.pt",
            "name": "yolo11n.pt",
            "label": "YOLOv11 Nano (SOTA Flagship 2024)",
            "architecture": "C3k2 + SPPF Edge Engine",
            "params_m": 2.6,
            "latency_ms": 7.8,
            "map50": 0.912,
            "precision": "INT8 / FP16",
            "recommended_for": "Ultra-low edge latency (<10ms) & broad 80-class vehicle detection",
        },
        {
            "id": "yolov8n.pt",
            "name": "yolov8n.pt",
            "label": "YOLOv8 Nano (COCO Baseline)",
            "architecture": "Ultralytics Baseline",
            "params_m": 3.2,
            "latency_ms": 10.9,
            "map50": 0.884,
            "precision": "FP32",
            "recommended_for": "General baseline comparison",
        }
    ]
    SOTA_MODELS = AVAILABLE_MODELS

    def __init__(self, model_name: str = None, conf: float = None):
        self.model_name = model_name or config.MODEL_NAME
        self.conf       = conf       or config.CONFIDENCE_THRESHOLD
        
        print(f"[Detector] Loading model: {self.model_name}")
        self.model = YOLO(self.model_name)
        self.names = self.model.names   # {id: name}
        
        # Dynamic class label mapping (model-agnostic: supports 6-class custom & 80-class COCO)
        self.VEHICLE_LABELS = {
            "car", "motorcycle", "bus", "truck", "bicycle", "van", "suv",
            "auto", "vehicle", "ambulance"
        }
        self.PERSON_LABELS = {"person", "pedestrian", "crowd"}
        
        # Precompute valid vehicle and pedestrian class IDs directly from model classes
        self._vehicle_ids = {i for i, n in self.names.items() if str(n).lower().strip() in self.VEHICLE_LABELS}
        self._person_ids  = {i for i, n in self.names.items() if str(n).lower().strip() in self.PERSON_LABELS}
        
        self._pcu_weights = getattr(config, 'PCU_WEIGHTS', {
            "car": 1.0, "motorcycle": 0.5, "bus": 3.0, "truck": 3.0,
            "bicycle": 0.2, "person": 0.1, "ambulance": 0.0
        })
        self.active_model_label = next((m["label"] for m in self.AVAILABLE_MODELS if m["id"] == self.model_name), self.model_name)
        
        print(f"[Detector] Ready. Classes available: {len(self.names)} (Vehicles: {len(self._vehicle_ids)}, Pedestrians: {len(self._person_ids)})")

    @property
    def active_model_name(self) -> str:
        return self.model_name

    def switch_model(self, new_model_name: str) -> bool:
        """Dynamically hot-swaps the active inference neural network."""
        try:
            print(f"[Detector] Switching active model to: {new_model_name}")
            new_model = YOLO(new_model_name)
            self.model = new_model
            self.model_name = new_model_name
            self.names = self.model.names
            self._vehicle_ids = {i for i, n in self.names.items() if str(n).lower().strip() in self.VEHICLE_LABELS}
            self._person_ids  = {i for i, n in self.names.items() if str(n).lower().strip() in self.PERSON_LABELS}
            self.active_model_label = next((m["label"] for m in self.AVAILABLE_MODELS if m["id"] == new_model_name), new_model_name)
            print(f"[Detector] Successfully hot-swapped to {new_model_name} ({len(self.names)} classes)")
            return True
        except Exception as e:
            print(f"[Detector] Model switch failed for {new_model_name}: {e}")
            return False

    def get_model_catalog(self) -> List[Dict]:
        """Returns the SOTA model zoo metadata with the active model flagged."""
        catalog = []
        for m in self.AVAILABLE_MODELS:
            item = dict(m)
            item["active"] = (item["name"] == self.model_name)
            catalog.append(item)
        return catalog
    
    def detect(self, frame: np.ndarray) -> List[Detection]:
        """
        Execute detection on single BGR frame.
        Applies HSV emergency vehicle verification and PCU attribution.
        """
        valid_classes = list(self._vehicle_ids | self._person_ids) if (self._vehicle_ids or self._person_ids) else None
        if valid_classes:
            results = self.model(frame, conf=self.conf, classes=valid_classes, verbose=False)
        else:
            results = self.model(frame, conf=self.conf, verbose=False)
        detections: List[Detection] = []
        
        if not results:
            return detections
        
        r = results[0]
        if r.boxes is None:
            return detections
        
        h, w = frame.shape[:2]
        
        # Pass 1: Parse and filter raw candidate boxes
        raw_candidates = []
        for box in r.boxes:
            cls_id = int(box.cls[0])
            conf   = float(box.conf[0])
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            
            bw = x2 - x1
            bh = y2 - y1
            if bw < 16 or bh < 16 or (bw * bh) < 280:
                continue
            
            raw_label = self.names.get(cls_id, "unknown")
            label = str(raw_label).lower().strip()
            
            # Pedestrian confidence gating: filter out pavement shadows and cracks
            if label in self.PERSON_LABELS and conf < 0.52:
                continue
            elif conf < self.conf:
                continue
            
            raw_candidates.append({
                "box": [x1, y1, x2, y2],
                "cls_id": cls_id,
                "conf": conf,
                "label": label,
                "w": bw,
                "h": bh
            })
        
        if not raw_candidates:
            return []

        # Pass 2: Rider-to-Vehicle Association & Occupant Suppression
        # Detectors often detect both motorcycle and rider; unite them into a single coherent vehicle entity
        two_wheelers = [c for c in raw_candidates if c["label"] in ["motorcycle", "bicycle", "rickshaw", "auto"]]
        enclosed_vehicles = [c for c in raw_candidates if c["label"] in ["car", "bus", "truck"]]
        
        suppressed_persons = set()
        for idx, cand in enumerate(raw_candidates):
            if cand["label"] not in self.PERSON_LABELS:
                continue
            px1, py1, px2, py2 = cand["box"]
            p_area = max(1, cand["w"] * cand["h"])
            p_cx = (px1 + px2) / 2.0
            
            # Check if person is riding a motorcycle, bicycle, or rickshaw
            for tw_cand in two_wheelers:
                mx1, my1, mx2, my2 = tw_cand["box"]
                m_cx = (mx1 + mx2) / 2.0
                ix1, iy1 = max(px1, mx1), max(py1, my1)
                ix2, iy2 = min(px2, mx2), min(py2, my2)
                inter_a = max(0, ix2 - ix1) * max(0, iy2 - iy1) if (ix2 > ix1 and iy2 > iy1) else 0
                
                # Rider check: bounding box overlap > 25% OR rider seated directly atop vehicle chassis
                is_overlap = (inter_a / float(p_area)) > 0.25
                is_seated_atop = (abs(p_cx - m_cx) < max(28, tw_cand["w"] * 0.45)) and (py2 >= my1) and (py1 <= my2)
                
                if is_overlap or is_seated_atop:
                    suppressed_persons.add(idx)
                    # Expand two-wheeler box upward to encompass rider's head/torso smoothly
                    tw_cand["box"][0] = min(tw_cand["box"][0], px1)
                    tw_cand["box"][1] = min(tw_cand["box"][1], py1)
                    tw_cand["box"][2] = max(tw_cand["box"][2], px2)
                    tw_cand["box"][3] = max(tw_cand["box"][3], py2)
                    tw_cand["w"] = tw_cand["box"][2] - tw_cand["box"][0]
                    tw_cand["h"] = tw_cand["box"][3] - tw_cand["box"][1]
                    break
            
            # Check if person is an occupant inside an enclosed vehicle
            if idx not in suppressed_persons:
                for ev in enclosed_vehicles:
                    ex1, ey1, ex2, ey2 = ev["box"]
                    ix1, iy1 = max(px1, ex1), max(py1, ey1)
                    ix2, iy2 = min(px2, ex2), min(py2, ey2)
                    if ix2 > ix1 and iy2 > iy1:
                        inter_a = (ix2 - ix1) * (iy2 - iy1)
                        if (inter_a / float(p_area)) > 0.45:
                            suppressed_persons.add(idx)
                            break

        # Pass 3: Semantics, Optical Emergency Verification & PCU Assignment
        amb_conf_thresh = getattr(config, 'AMBULANCE_CONFIDENCE_THRESHOLD', 0.65)
        amb_min_area = getattr(config, 'AMBULANCE_MIN_AREA_FRAC', 0.015)
        
        filtered_candidates = []
        for idx, cand in enumerate(raw_candidates):
            if idx in suppressed_persons:
                continue
            
            x1, y1, x2, y2 = cand["box"]
            cls_id = cand["cls_id"]
            conf = cand["conf"]
            label = cand["label"]
            bw = cand["w"]
            bh = cand["h"]
            area_frac = (bw * bh) / float(w * h)
            
            is_amb_candidate = (cls_id == 80 or label == "ambulance")
            is_ambulance = False
            has_emergency_lights = False
            
            if is_amb_candidate and conf >= amb_conf_thresh and area_frac >= amb_min_area:
                crop = frame[y1:y2, x1:x2]
                if crop.size > 0:
                    ch, cw = crop.shape[:2]
                    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
                    total_pixels = float(max(1, ch * cw))

                    # 1. Indian Auto-Rickshaw Detection (green/yellow 3-wheeler body)
                    green_mask = cv2.inRange(hsv, np.array([35, 50, 50]), np.array([85, 255, 255]))
                    green_ratio = cv2.countNonZero(green_mask) / total_pixels
                    yellow_mask = cv2.inRange(hsv, np.array([16, 70, 70]), np.array([34, 255, 255]))
                    yellow_ratio = cv2.countNonZero(yellow_mask) / total_pixels

                    if (green_ratio >= 0.06 or yellow_ratio >= 0.08) and (cw / float(max(1, ch)) < 1.15):
                        is_ambulance = False
                        label = "rickshaw"
                        cls_id = 82
                    else:
                        # 2. Optical Emergency Strobe Lightbar Verification
                        roof_h = max(4, int(ch * 0.28))
                        roof = hsv[:roof_h, :]
                        rf_area = max(1, roof.shape[0] * roof.shape[1])
                        
                        # High-intensity saturated electric blue strobe
                        blue_mask = cv2.inRange(roof, np.array([105, 120, 120]), np.array([130, 255, 255]))
                        blue_ratio = cv2.countNonZero(blue_mask) / float(rf_area)
                        
                        # High-intensity saturated red strobe
                        r1 = cv2.inRange(roof, np.array([0, 120, 120]), np.array([10, 255, 255]))
                        r2 = cv2.inRange(roof, np.array([170, 120, 120]), np.array([180, 255, 255]))
                        red_ratio = cv2.countNonZero(cv2.bitwise_or(r1, r2)) / float(rf_area)
                        
                        # White emergency chassis
                        white_mask = cv2.inRange(hsv, np.array([0, 0, 140]), np.array([180, 55, 255]))
                        white_ratio = cv2.countNonZero(white_mask) / total_pixels
                        
                        has_strobe = (blue_ratio >= 0.015 or red_ratio >= 0.020)
                        if has_strobe and white_ratio >= 0.08:
                            is_ambulance = True
                            label = "ambulance"
                            cls_id = 80
                            has_emergency_lights = True
                        else:
                            is_ambulance = False
                            label = "car"
                            cls_id = 2
            elif is_amb_candidate:
                is_ambulance = False
                label = "car"
                cls_id = 2
            
            is_person = (label in self.PERSON_LABELS)
            is_vehicle = (label in self.VEHICLE_LABELS) or is_ambulance
            if not (is_vehicle or is_person):
                continue
            
            pcu_val = self._pcu_weights.get(label, 1.0)
            if is_ambulance:
                pcu_val = 0.0
            
            det = Detection(
                box=(x1, y1, x2, y2),
                label=label,
                confidence=conf,
                class_id=cls_id,
                is_vehicle=is_vehicle,
                is_person=is_person,
                is_ambulance=is_ambulance,
                pcu=pcu_val,
                has_emergency_lights=has_emergency_lights,
            )
            filtered_candidates.append(det)

        # Pass 4: Cross-Class Non-Maximum Suppression (eliminate duplicate overlapping bounding boxes)
        if len(filtered_candidates) > 1:
            filtered_candidates.sort(key=lambda d: d.confidence, reverse=True)
            suppressed = [False] * len(filtered_candidates)
            deduped = []
            for i, d1 in enumerate(filtered_candidates):
                if suppressed[i]:
                    continue
                deduped.append(d1)
                for j in range(i + 1, len(filtered_candidates)):
                    if suppressed[j]:
                        continue
                    d2 = filtered_candidates[j]
                    ix1, iy1 = max(d1.x1, d2.x1), max(d1.y1, d2.y1)
                    ix2, iy2 = min(d1.x2, d2.x2), min(d1.y2, d2.y2)
                    if ix2 > ix1 and iy2 > iy1:
                        inter_a = (ix2 - ix1) * (iy2 - iy1)
                        union_a = d1.area + d2.area - inter_a
                        min_a = min(d1.area, d2.area)
                        iou = inter_a / float(max(1, union_a))
                        containment = inter_a / float(max(1, min_a))
                        # Suppress duplicate detection if IoU > 0.40 or one box is 60%+ contained in the other
                        if iou > 0.40 or containment > 0.60:
                            suppressed[j] = True
            detections = deduped
        else:
            detections = filtered_candidates

        return detections
    
    def draw(self, frame: np.ndarray, detections: List[Detection],
             show_labels: bool = True) -> np.ndarray:
        """Render high-contrast tactical bounding boxes, corner brackets, and PCU tags."""
        for det in detections:
            color = self.COLORS.get(det.label, self.COLORS["default"])
            thickness = 2 if not det.is_ambulance else 3
            
            # 1. Bounding box outline with slight transparency effect
            cv2.rectangle(frame, (det.x1, det.y1), (det.x2, det.y2), color, thickness, cv2.LINE_AA)
            
            # 2. Tactical Corner Brackets (high-tech defense / autonomous vehicle look)
            corner_len = max(8, min(18, (det.x2 - det.x1) // 4, (det.y2 - det.y1) // 4))
            bracket_thick = thickness + 1
            # Top-left
            cv2.line(frame, (det.x1, det.y1), (det.x1 + corner_len, det.y1), color, bracket_thick, cv2.LINE_AA)
            cv2.line(frame, (det.x1, det.y1), (det.x1, det.y1 + corner_len), color, bracket_thick, cv2.LINE_AA)
            # Top-right
            cv2.line(frame, (det.x2, det.y1), (det.x2 - corner_len, det.y1), color, bracket_thick, cv2.LINE_AA)
            cv2.line(frame, (det.x2, det.y1), (det.x2, det.y1 + corner_len), color, bracket_thick, cv2.LINE_AA)
            # Bottom-left
            cv2.line(frame, (det.x1, det.y2), (det.x1 + corner_len, det.y2), color, bracket_thick, cv2.LINE_AA)
            cv2.line(frame, (det.x1, det.y2), (det.x1, det.y2 - corner_len), color, bracket_thick, cv2.LINE_AA)
            # Bottom-right
            cv2.line(frame, (det.x2, det.y2), (det.x2 - corner_len, det.y2), color, bracket_thick, cv2.LINE_AA)
            cv2.line(frame, (det.x2, det.y2), (det.x2, det.y2 - corner_len), color, bracket_thick, cv2.LINE_AA)
            
            # 3. Label Header Pill Badge (Clean detection pill without PCU)
            if show_labels:
                badge_lbl = "AMBULANCE [LIGHTS]" if (det.is_ambulance and getattr(det, 'has_emergency_lights', False)) else det.label.upper()
                label_txt = f"{badge_lbl} {int(det.confidence * 100)}%"
                
                (tw, th), _ = cv2.getTextSize(label_txt, cv2.FONT_HERSHEY_SIMPLEX, 0.40, 1)
                
                # Position badge above if room, else inside top to prevent clipping
                if det.y1 > th + 10:
                    bg_y1 = det.y1 - th - 8
                    bg_y2 = det.y1
                    text_y = det.y1 - 4
                else:
                    bg_y1 = det.y1
                    bg_y2 = det.y1 + th + 8
                    text_y = det.y1 + th + 2
                    
                bg_x2 = min(frame.shape[1], det.x1 + tw + 8)
                
                cv2.rectangle(frame, (det.x1, bg_y1), (bg_x2, bg_y2), (10, 15, 25), -1)
                cv2.rectangle(frame, (det.x1, bg_y1), (bg_x2, bg_y2), color, 1, cv2.LINE_AA)
                cv2.putText(frame, label_txt,
                            (det.x1 + 4, text_y),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.40, (255, 255, 255), 1,
                            cv2.LINE_AA)
            
            # 4. Centroid Point with Targeting Reticle
            cv2.circle(frame, det.centroid, 3, color, -1, cv2.LINE_AA)
            cv2.circle(frame, det.centroid, 6, color, 1, cv2.LINE_AA)
            
            # 5. Emergency Vehicle Code-3 Preemption Banner
            if det.is_ambulance:
                banner_y1 = max(0, det.y1 - 32)
                banner_y2 = max(0, det.y1 - 10)
                if det.y1 <= 35:
                    banner_y1 = det.y2 + 4
                    banner_y2 = det.y2 + 26
                banner_w = 265 if getattr(det, 'has_emergency_lights', False) else 240
                cv2.rectangle(frame, (det.x1, banner_y1), (min(frame.shape[1], det.x1 + banner_w), banner_y2), (0, 0, 220), -1)
                cv2.rectangle(frame, (det.x1, banner_y1), (min(frame.shape[1], det.x1 + banner_w), banner_y2), (255, 255, 255), 1, cv2.LINE_AA)
                banner_txt = "[EVP] AMBULANCE - LIGHTS ACTIVE" if getattr(det, 'has_emergency_lights', False) else "[EVP] CODE-3 EMERGENCY"
                cv2.putText(frame, banner_txt,
                            (det.x1 + 6, banner_y2 - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.44, (255, 255, 255), 2,
                            cv2.LINE_AA)
        
        return frame
    
    def get_vehicle_count(self, detections: List[Detection]) -> int:
        return sum(1 for d in detections if d.is_vehicle)
    
    def get_total_pcu(self, detections: List[Detection]) -> float:
        return round(sum(d.pcu for d in detections if d.is_vehicle), 2)
    
    def has_ambulance(self, detections: List[Detection]) -> bool:
        return any(d.is_ambulance for d in detections)
    
    def has_person(self, detections: List[Detection]) -> bool:
        return any(d.is_person for d in detections)