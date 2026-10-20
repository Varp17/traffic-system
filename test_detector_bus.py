import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ultralytics.nn.modules.head as head
if not hasattr(head, 'RefineDetect'):
    head.RefineDetect = head.Detect

import cv2
import config
from core.detector import Detector

det = Detector()

for vid_name in ["north.mp4", "west1.mp4"]:
    vpath = os.path.join("assets", "videos", vid_name)
    if not os.path.exists(vpath):
        print(f"File not found: {vpath}")
        continue
    cap = cv2.VideoCapture(vpath)
    print(f"\n--- Testing {vid_name} ---")
    frame_idx = 0
    while cap.isOpened() and frame_idx < 90:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % 15 == 0:
            res = det.detect(frame)
            ambs = [d for d in res if d.is_ambulance or d.label == "ambulance"]
            buses = [d for d in res if d.label == "bus"]
            cars = [d for d in res if d.label == "car"]
            print(f"Frame {frame_idx:02d}: {len(res)} detections | Buses: {len(buses)} | Ambulances: {len(ambs)} | Cars: {len(cars)}")
            for a in ambs:
                print(f"   [AMB] conf={a.confidence:.3f}, cls={a.class_id}, label={a.label}, box=({a.x1},{a.y1},{a.x2},{a.y2}), has_lights={a.has_emergency_lights}")
            for b in buses:
                print(f"   [BUS] conf={b.confidence:.3f}, cls={b.class_id}, label={b.label}, box=({b.x1},{b.y1},{b.x2},{b.y2})")
        frame_idx += 1
    cap.release()
