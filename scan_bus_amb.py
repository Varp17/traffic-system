import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ultralytics.nn.modules.head as head
if not hasattr(head, 'RefineDetect'):
    head.RefineDetect = head.Detect

import cv2
import config
from core.detector import Detector

det = Detector()

videos = {
    "north": "assets/videos/north.mp4",
    "south": "assets/videos/south.mp4",
    "east": "assets/videos/east.mp4",
    "west1": "assets/videos/west1.mp4",
}
user_vid = r"C:\Users\HP\Downloads\VID20261006170659.mp4"
if os.path.exists(user_vid):
    videos["user_vid"] = user_vid

for v_name, v_path in videos.items():
    if not os.path.exists(v_path):
        continue
    cap = cv2.VideoCapture(v_path)
    print(f"\n==================== Testing {v_name} ({v_path}) ====================")
    frame_idx = 0
    bus_cnt = 0
    amb_cnt = 0
    amb_details = []
    bus_details = []
    while cap.isOpened() and frame_idx < 300:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % 5 == 0:
            res = det.detect(frame)
            for d in res:
                if d.is_ambulance or d.label == "ambulance":
                    amb_cnt += 1
                    if len(amb_details) < 8:
                        amb_details.append((frame_idx, d.confidence, d.class_id, d.label, (d.x1, d.y1, d.x2, d.y2)))
                if d.label == "bus" or d.class_id == 5:
                    bus_cnt += 1
                    if len(bus_details) < 8:
                        bus_details.append((frame_idx, d.confidence, d.class_id, d.label, (d.x1, d.y1, d.x2, d.y2)))
        frame_idx += 1
    cap.release()
    print(f"Total checked frames: {frame_idx} | Amb frames: {amb_cnt} | Bus frames: {bus_cnt}")
    if amb_details:
        print("Sample AMBULANCE detections:")
        for sm in amb_details:
            print(f"   frame {sm[0]}: conf={sm[1]:.2f}, cls={sm[2]}, lbl={sm[3]}, box={sm[4]}")
    if bus_details:
        print("Sample BUS detections:")
        for sm in bus_details:
            print(f"   frame {sm[0]}: conf={sm[1]:.2f}, cls={sm[2]}, lbl={sm[3]}, box={sm[4]}")
