import cv2, os, sys
from core.detector import Detector

det = Detector()
for cam in ['west.mp4', 'east.mp4', 'south.mp4', 'north.mp4']:
    path = os.path.join('assets', 'videos', cam)
    if not os.path.exists(path):
        print('Missing:', path, flush=True)
        continue
    cap = cv2.VideoCapture(path)
    print(f'=== {cam} ===', flush=True)
    all_classes = {}
    for f_idx in range(40):
        ret, frame = cap.read()
        if not ret: break
        if f_idx % 4 != 0: continue
        res = det.detect(frame)
        for d in res:
            all_classes[d.label] = all_classes.get(d.label, 0) + 1
            if d.is_ambulance:
                print(f'  [f={f_idx}] AMBULANCE! box={d.box}, conf={d.confidence:.2f}, strobe={getattr(d, "has_emergency_lights", False)}', flush=True)
    print('  Summary:', all_classes, flush=True)
    cap.release()
