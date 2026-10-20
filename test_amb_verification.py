import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ultralytics.nn.modules.head as head
if not hasattr(head, 'RefineDetect'):
    head.RefineDetect = head.Detect

import cv2, numpy as np
import config
from ultralytics import YOLO

model = YOLO(config.MODEL_NAME)

def verify_ambulance(frame, box, conf, cls_id):
    """
    Returns True only if the candidate is a genuine emergency ambulance,
    and returns False if it is a transit bus, delivery truck, or car.
    """
    x1, y1, x2, y2 = box
    bw = x2 - x1
    bh = y2 - y1
    
    # Rule 1: High neural confidence required (genuine ambulance has conf 0.65-0.85)
    if conf < 0.60:
        return False, "low_conf"
    
    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return False, "empty_crop"
        
    h, w = crop.shape[:2]
    
    # Aspect ratio check: transit buses viewed from side/front-side are long/horizontal (w >> h)
    # Genuine ambulance van viewed front/angle has upright van profile (h >= 0.8 * w)
    ar = w / float(max(1, h))
    if ar > 1.75:
        # A long horizontal vehicle is a transit bus, not an ambulance
        return False, "bus_aspect_ratio"
        
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    
    # Roof region (top 28% of vehicle) where emergency lightbars/strobes are mounted
    roof_h = max(4, int(h * 0.28))
    roof = hsv[:roof_h, :]
    rf_area = max(1, roof.shape[0] * roof.shape[1])
    
    # Blue emergency strobe (signature of Indian emergency ambulances)
    blue_mask = cv2.inRange(roof, np.array([95, 75, 75]), np.array([135, 255, 255]))
    blue_ratio = cv2.countNonZero(blue_mask) / float(rf_area)
    
    # Red emergency strobe
    r1 = cv2.inRange(roof, np.array([0, 85, 85]), np.array([12, 255, 255]))
    r2 = cv2.inRange(roof, np.array([168, 85, 85]), np.array([180, 255, 255]))
    red_ratio = cv2.countNonZero(cv2.bitwise_or(r1, r2)) / float(rf_area)
    
    # White/light body surface
    white_mask = cv2.inRange(hsv, np.array([0, 0, 140]), np.array([180, 60, 255]))
    white_ratio = cv2.countNonZero(white_mask) / float(max(1, h * w))
    
    # Check if roof strobe is present
    has_strobe = (blue_ratio >= 0.012 or red_ratio >= 0.035)
    
    # Check if light/white emergency body is present
    has_light_body = (white_ratio >= 0.040)
    
    # True ambulance criteria:
    # 1. Model predicted class 80 / ambulance
    # 2. Must either have active roof strobe lightbar OR (high confidence >= 0.65 AND light body)
    if has_strobe or (conf >= 0.65 and has_light_body and ar <= 1.45):
        return True, f"verified (blue={blue_ratio:.3f}, white={white_ratio:.3f})"
    
    return False, f"unverified (no strobe, white={white_ratio:.3f})"

# Test on west1 and north across 100 frames
for v_name in ["west1.mp4", "north.mp4"]:
    vpath = os.path.join("assets", "videos", v_name)
    cap = cv2.VideoCapture(vpath)
    print(f"\n--- Testing {v_name} with verification ---")
    f_idx = 0
    while cap.isOpened() and f_idx < 120:
        ret, frame = cap.read()
        if not ret:
            break
        if f_idx % 10 == 0:
            res = model(frame, conf=0.35, verbose=False)
            if res and res[0].boxes is not None:
                # First collect all bus boxes
                bus_boxes = []
                for b in res[0].boxes:
                    cid = int(b.cls[0])
                    if cid == 5:
                        bus_boxes.append([int(v) for v in b.xyxy[0]])
                
                for b in res[0].boxes:
                    cid = int(b.cls[0])
                    conf = float(b.conf[0])
                    box = [int(v) for v in b.xyxy[0]]
                    if cid == 80:
                        # Check overlap with any bus box
                        is_bus_overlap = False
                        for bbox in bus_boxes:
                            # compute iou
                            xA = max(box[0], bbox[0])
                            yA = max(box[1], bbox[1])
                            xB = min(box[2], bbox[2])
                            yB = min(box[3], bbox[3])
                            inter = max(0, xB - xA) * max(0, yB - yA)
                            area1 = (box[2] - box[0]) * (box[3] - box[1])
                            area2 = (bbox[2] - bbox[0]) * (bbox[3] - bbox[1])
                            iou = inter / float(area1 + area2 - inter) if (area1 + area2 - inter) > 0 else 0
                            if iou > 0.30:
                                is_bus_overlap = True
                                break
                        
                        if is_bus_overlap:
                            print(f"Frame {f_idx:02d}: REJECTED amb candidate box={box} conf={conf:.3f} -> OVERLAPS BUS!")
                        else:
                            is_real_amb, reason = verify_ambulance(frame, box, conf, cid)
                            if is_real_amb:
                                print(f"Frame {f_idx:02d}: *** REAL AMBULANCE *** conf={conf:.3f} box={box} ({reason})")
                            else:
                                print(f"Frame {f_idx:02d}: REJECTED amb candidate conf={conf:.3f} box={box} ({reason})")
        f_idx += 1
    cap.release()
