import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ultralytics.nn.modules.head as head
if not hasattr(head, 'RefineDetect'):
    head.RefineDetect = head.Detect

import cv2
import config
from ultralytics import YOLO

model = YOLO(config.MODEL_NAME)

videos = {
    "north": "assets/videos/north.mp4",
    "south": "assets/videos/south.mp4",
    "east": "assets/videos/east.mp4",
    "west1": "assets/videos/west1.mp4",
}

for name, path in videos.items():
    if not os.path.exists(path):
        continue
    cap = cv2.VideoCapture(path)
    print(f"=== Checking {name} ===")
    f_idx = 0
    while cap.isOpened() and f_idx < 80:
        ret, frame = cap.read()
        if not ret:
            break
        if f_idx % 10 == 0:
            results = model(frame, conf=0.35, verbose=False)
            if results and results[0].boxes is not None:
                for b in results[0].boxes:
                    cid = int(b.cls[0])
                    conf = float(b.conf[0])
                    cname = model.names.get(cid, "unknown")
                    if cid in (5, 80) or cname in ('bus', 'ambulance') or 'amb' in cname.lower() or 'bus' in cname.lower():
                        xy = [int(v) for v in b.xyxy[0]]
                        print(f"  [{name} f{f_idx}] cid={cid} ({cname}) conf={conf:.3f} box={xy}")
        f_idx += 1
    cap.release()
print("Done!")
