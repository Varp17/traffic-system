import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import ultralytics.nn.modules.head as head
if not hasattr(head, 'RefineDetect'):
    head.RefineDetect = head.Detect

import cv2
import config
from ultralytics import YOLO

model = YOLO(config.MODEL_NAME)

for vid_name in ["west1.mp4", "north.mp4"]:
    vpath = os.path.join("assets", "videos", vid_name)
    cap = cv2.VideoCapture(vpath)
    print(f"\n==================== {vid_name} ====================")
    f_idx = 0
    saved = 0
    while cap.isOpened() and f_idx < 400:
        ret, frame = cap.read()
        if not ret:
            break
        if f_idx % 15 == 0:
            res = model(frame, conf=0.40, verbose=False)
            if res and res[0].boxes is not None:
                for b in res[0].boxes:
                    cid = int(b.cls[0])
                    conf = float(b.conf[0])
                    cname = model.names.get(cid, "unknown")
                    if cid in (5, 80) or 'bus' in cname or 'amb' in cname:
                        x1, y1, x2, y2 = [int(v) for v in b.xyxy[0]]
                        print(f"Frame {f_idx:03d}: cid={cid} ({cname}) conf={conf:.3f} box=({x1},{y1},{x2},{y2})")
                        if saved < 10 and (x2 - x1) > 50:
                            crop = frame[y1:y2, x1:x2]
                            cname_clean = f"crop_{vid_name[:4]}_f{f_idx}_{cname}_{cid}.jpg"
                            cv2.imwrite(cname_clean, crop)
                            saved += 1
        f_idx += 1
    cap.release()
