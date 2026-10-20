import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ultralytics.nn.modules.head as head
if not hasattr(head, 'RefineDetect'):
    head.RefineDetect = head.Detect

import cv2
import config
from core.detector import Detector
from core.tracker import CentroidTracker

config.AMBULANCE_CONFIDENCE_THRESHOLD = 0.62
config.ENABLE_COLLISION_ALERTS = False

det = Detector()
tracker = CentroidTracker()

print("\n--- Running North Tracking Test ---")
cap = cv2.VideoCapture("assets/videos/north.mp4")
f_idx = 0
amb_track_seen = set()
bus_track_seen = set()

while cap.isOpened() and f_idx < 100:
    ret, frame = cap.read()
    if not ret:
        break
    dets = det.detect(frame)
    tracks = tracker.update(dets)
    for t in tracks:
        if t.is_ambulance or t.label == "ambulance":
            amb_track_seen.add(t.track_id)
            print(f"Frame {f_idx:02d}: AMBULANCE Track #{t.track_id} conf={t.confidence} box={t.box}")
        if t.label == "bus":
            bus_track_seen.add(t.track_id)
            if f_idx % 20 == 0:
                print(f"Frame {f_idx:02d}: BUS Track #{t.track_id} conf={t.confidence} box={t.box}")
    f_idx += 1
cap.release()

print(f"\nNorth Summary: {len(amb_track_seen)} Ambulance Tracks ({amb_track_seen}), {len(bus_track_seen)} Bus Tracks ({bus_track_seen})")
