"""
backend/app_detection.py — Real OpenCV + YOLOv8 Detection Pipeline
====================================================================
Uses the actual traffic .mp4 files already in the project folder
(north.mp4, south.mp4, east.mp4, west.mp4, ambulance_emergency_corridor.mp4, etc.)
exactly the same way the existing 4-way processor uses them.

For EACH detected vehicle / incident we crop ONLY that bounding-box region
from the frame and encode it as base64 JPEG — not the full frame.

Endpoints
---------
  GET /api/frame            → latest annotated JPEG (MJPEG-friendly)
  GET /api/detections       → cropped bbox images for every current detection
  GET /api/incidents        → cropped incident images (ambulance / stall / accident)
  GET /api/detection_stats  → fps, counts, PCU, model info
"""

import cv2
import numpy as np
import threading
import time
import base64
import os
import sys
from collections import deque, defaultdict
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter
from fastapi.responses import Response, JSONResponse

# ── project root on sys.path ──────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

# ── locate the best YOLO model available ──────────────────────────────────────
def _find(name: str) -> Optional[str]:
    p = os.path.join(BASE_DIR, name)
    return p if os.path.exists(p) else None

MODEL_PATH = (
    _find("backend/models/best12.pt") or
    _find("yolov8_traffic_trained.pt") or
    _find("yolo11n.pt")                or
    _find("yolov8n.pt")
)

# ── real traffic videos already in the project folder ────────────────────────
#   Priority: use the 4-directional feeds the existing system uses.
#   We cycle through them as 4 "camera" streams and composite them 2×2,
#   exactly like VideoProcessor4Way does.

def _vp(name: str) -> Optional[str]:
    """Return full path only if file exists."""
    p = os.path.join(BASE_DIR, name)
    return p if os.path.exists(p) else None

# The same video priority order as in VideoProcessor4Way / run_4way.py
STREAM_VIDEOS: List[str] = [v for v in [
    _vp("north.mp4"),
    _vp("south.mp4"),
    _vp("east.mp4"),
    _vp("west1.mp4") or _vp("west.mp4"),
] if v]

# Fallback: use whatever single video is available
if not STREAM_VIDEOS:
    for candidate in [
        "ambulance_emergency_corridor.mp4",
        "car_detection_highway.mp4",
        "person_bicycle_car_urban.mp4",
        "traffic_aerial_intersection.mp4",
        "crosswalk_pedestrians.mp4",
        "dense_junction_playback.mp4",
        "arterial_corridor_playback.mp4",
        "amb.mp4",
        "south1.mp4",
        "west11.mp4",
    ]:
        p = _vp(candidate)
        if p:
            STREAM_VIDEOS.append(p)
            break

FRAME_W, FRAME_H = 1280, 720   # composite output resolution
CONF_THRESH       = 0.30
TARGET_FPS        = 15          # detection loop rate

# ── IRC:106 PCU weights ───────────────────────────────────────────────────────
PCU_MAP = {
    "car": 1.0, "motorcycle": 0.5, "bus": 3.0, "truck": 3.0,
    "bicycle": 0.2, "person": 0.1, "ambulance": 0.0, "van": 1.0,
}
LABEL_DISPLAY = {
    "car":"Car","motorcycle":"Motorcycle","bus":"Bus","truck":"Truck",
    "bicycle":"Bicycle","person":"Person","ambulance":"Ambulance","van":"Van",
}
COLORS_BGR = {
    "car":        (0,   220, 100),
    "motorcycle": (255, 165, 0  ),
    "bus":        (0,   120, 255),
    "truck":      (180, 0,   255),
    "bicycle":    (255, 220, 0  ),
    "person":     (0,   255, 255),
    "ambulance":  (0,   0,   255),
    "default":    (200, 200, 200),
}
VEHICLE_LABELS = {"car","motorcycle","bus","truck","bicycle","van","suv","ambulance","vehicle"}
IGNORE_LABELS  = {
    "chair","couch","bed","dining table","toilet","tv","laptop",
    "cell phone","potted plant","keyboard","mouse","book","clock",
    "vase","scissors","teddy bear","hair drier","toothbrush",
    "bottle","cup","fork","knife","spoon","bowl","banana","apple",
}
AMBULANCE_KW = {"ambulance","emergency","fire","rescue"}


# ── shared state ──────────────────────────────────────────────────────────────
class _State:
    def __init__(self):
        self.lock               = threading.Lock()
        self.latest_frame       : Optional[np.ndarray] = None
        self.latest_detections  : List[Dict]            = []
        self.crop_ring          : deque                 = deque(maxlen=80)
        self.incident_crops     : deque                 = deque(maxlen=50)
        self.class_counts       : Dict[str,int]         = {}
        self.total_pcu          : float                 = 0.0
        self.fps                : float                 = 0.0
        self.frame_count        : int                   = 0
        self.running            : bool                  = False
        self.model_name         : str                   = os.path.basename(MODEL_PATH) if MODEL_PATH else "N/A"
        self.video_sources      : List[str]             = [os.path.basename(v) for v in STREAM_VIDEOS]

state = _State()


# ── crop helper ───────────────────────────────────────────────────────────────
def _crop_b64(frame: np.ndarray, x1:int, y1:int, x2:int, y2:int, pad:int=5) -> str:
    """
    Extract ONLY the bounding-box region (with small padding) and return
    as base64-encoded JPEG.  This is the 'capture only that box' feature.
    """
    h, w = frame.shape[:2]
    cx1, cy1 = max(0, x1-pad), max(0, y1-pad)
    cx2, cy2 = min(w, x2+pad), min(h, y2+pad)
    crop = frame[cy1:cy2, cx1:cx2]
    if crop.size == 0:
        return ""
    ch, cw = crop.shape[:2]
    # upscale very small crops so they're actually visible
    if cw < 80 or ch < 60:
        scale = max(80/max(cw,1), 60/max(ch,1))
        crop  = cv2.resize(crop, (int(cw*scale), int(ch*scale)), interpolation=cv2.INTER_LINEAR)
    _, buf = cv2.imencode(".jpg", crop, [cv2.IMWRITE_JPEG_QUALITY, 88])
    return base64.b64encode(buf.tobytes()).decode("utf-8")


# ── annotation helpers ────────────────────────────────────────────────────────
def _draw_box(frame:np.ndarray, x1:int,y1:int,x2:int,y2:int,
              label:str, conf:float, pcu:float, color:tuple) -> None:
    thick = 3 if label == "ambulance" else 2
    cv2.rectangle(frame, (x1,y1), (x2,y2), color, thick, cv2.LINE_AA)

    # corner brackets
    cl = max(8, min(20, (x2-x1)//5, (y2-y1)//5))
    bt = thick+1
    for px,py,sx,sy in [(x1,y1,1,1),(x2,y1,-1,1),(x1,y2,1,-1),(x2,y2,-1,-1)]:
        cv2.line(frame,(px,py),(px+sx*cl,py),   color,bt,cv2.LINE_AA)
        cv2.line(frame,(px,py),(px,py+sy*cl),   color,bt,cv2.LINE_AA)

    # label pill (Clean detection pill without PCU)
    disp = f"{label.upper()} {int(conf*100)}%"
    (tw,th),_ = cv2.getTextSize(disp, cv2.FONT_HERSHEY_SIMPLEX, 0.44, 1)
    by1 = y1-th-8 if y1>th+10 else y1
    by2 = by1+th+8
    bx2 = min(frame.shape[1], x1+tw+10)
    cv2.rectangle(frame,(x1,by1),(bx2,by2),(12,12,20),-1)
    cv2.rectangle(frame,(x1,by1),(bx2,by2),color,1,cv2.LINE_AA)
    cv2.putText(frame,disp,(x1+4,by2-3),cv2.FONT_HERSHEY_SIMPLEX,0.44,(255,255,255),1,cv2.LINE_AA)

    # centroid
    cx,cy=(x1+x2)//2,(y1+y2)//2
    cv2.circle(frame,(cx,cy),3,color,-1,cv2.LINE_AA)
    cv2.circle(frame,(cx,cy),6,color,1, cv2.LINE_AA)

    # emergency banner
    if label=="ambulance":
        be1=max(0,y1-34); be2=max(0,y1-10)
        if y1<=38: be1,be2=y2+4,y2+28
        cv2.rectangle(frame,(x1,be1),(min(frame.shape[1],x1+260),be2),(0,0,200),-1)
        cv2.putText(frame,"[EVP] CODE-3 EMERGENCY",(x1+6,be2-5),
                    cv2.FONT_HERSHEY_SIMPLEX,0.48,(255,255,255),2,cv2.LINE_AA)


def _build_composite(caps: List[cv2.VideoCapture],
                     qw:int, qh:int) -> np.ndarray:
    """
    Read one frame from each capture, resize to quadrant size,
    and tile them 2×2 — exactly as VideoProcessor4Way does.
    """
    quads = []
    for cap in caps:
        ret, f = cap.read()
        if not ret or f is None:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, f = cap.read()
        if ret and f is not None:
            quads.append(cv2.resize(f, (qw, qh)))
        else:
            blank = np.zeros((qh, qw, 3), dtype=np.uint8)
            cv2.putText(blank, "NO SIGNAL", (qw//4, qh//2),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)
            quads.append(blank)

    # pad to 4 if we have fewer sources
    while len(quads) < 4:
        quads.append(quads[-1].copy() if quads else
                     np.zeros((qh, qw, 3), dtype=np.uint8))

    top = np.hstack((quads[0], quads[1]))
    bot = np.hstack((quads[2], quads[3]))
    return np.vstack((top, bot))


# ── detection loop ────────────────────────────────────────────────────────────
def _detection_loop():
    from ultralytics import YOLO

    if not MODEL_PATH:
        print("[DetectionLoop] No YOLO model found in project folder.")
        state.running = False
        return
    if not STREAM_VIDEOS:
        print("[DetectionLoop] No video files found in project folder.")
        state.running = False
        return

    print(f"[DetectionLoop] Model  : {MODEL_PATH}")
    print(f"[DetectionLoop] Videos : {[os.path.basename(v) for v in STREAM_VIDEOS]}")

    try:
        model = YOLO(MODEL_PATH)
    except Exception as e:
        print(f"[DetectionLoop] Cannot load model: {e}")
        state.running = False
        return

    names = model.names   # {id: label}

    # open captures for each video
    qw, qh = FRAME_W//2, FRAME_H//2
    if len(STREAM_VIDEOS) >= 4:
        caps = [cv2.VideoCapture(v) for v in STREAM_VIDEOS[:4]]
    elif len(STREAM_VIDEOS) == 1:
        # replicate single video across all 4 quadrants (common demo mode)
        caps = [cv2.VideoCapture(STREAM_VIDEOS[0]) for _ in range(4)]
    else:
        # replicate available videos to fill 4 slots
        caps = []
        for i in range(4):
            caps.append(cv2.VideoCapture(STREAM_VIDEOS[i % len(STREAM_VIDEOS)]))

    for i, cap in enumerate(caps):
        if not cap.isOpened():
            print(f"[DetectionLoop] Warning: could not open video slot {i}: {STREAM_VIDEOS[i % len(STREAM_VIDEOS)]}")

    delay  = 1.0 / TARGET_FPS
    prev_t = time.time()

    # stall tracker: grid-snapped position → (first_seen_time, centroid)
    stall_tracker: Dict[int, Tuple[float, Tuple[int,int]]] = {}
    _last_incident_t: Dict[str, float] = {}   # type → last recorded time (dedup)

    print("[DetectionLoop] Running — real video feeds active.")

    while state.running:
        t0 = time.time()

        # ── build 4-quadrant composite ────────────────────────────────────
        frame = _build_composite(caps, qw, qh)   # (FRAME_H × FRAME_W × 3)
        annotated = frame.copy()

        # ── YOLOv8 inference ──────────────────────────────────────────────
        results = model(frame, conf=CONF_THRESH, verbose=False)
        boxes   = results[0].boxes if results else None

        frame_dets:   List[Dict]    = []
        class_counts: Dict[str,int] = defaultdict(int)
        total_pcu                   = 0.0
        now = time.time()

        if boxes is not None:
            for i, box in enumerate(boxes):
                cls_id = int(box.cls[0])
                conf   = float(box.conf[0])
                x1,y1,x2,y2 = map(int, box.xyxy[0])
                x1,y1 = max(0,x1), max(0,y1)
                x2,y2 = min(FRAME_W,x2), min(FRAME_H,y2)
                if (x2-x1)<10 or (y2-y1)<10:
                    continue

                raw = str(names.get(cls_id,"unknown")).lower().strip()
                if raw in IGNORE_LABELS:
                    continue

                is_ambulance = (raw in AMBULANCE_KW or any(k in raw for k in AMBULANCE_KW)) and conf >= 0.55
                is_person    = raw in {"person","pedestrian"}
                is_vehicle   = raw in VEHICLE_LABELS or (not is_person and raw!="unknown")

                label  = "ambulance" if is_ambulance else raw
                pcu    = PCU_MAP.get(label, 1.0)
                color  = COLORS_BGR.get(label, COLORS_BGR["default"])

                # ── draw on composite frame ───────────────────────────────
                _draw_box(annotated, x1,y1,x2,y2, label, conf, pcu, color)

                # ── crop ONLY the bbox region (the 'capturing only that box' feature) ─
                crop = _crop_b64(frame, x1,y1,x2,y2)

                class_counts[label] += 1
                if is_vehicle and not is_ambulance:
                    total_pcu += pcu

                det = {
                    "id":           f"d{state.frame_count}_{i}",
                    "label":        LABEL_DISPLAY.get(label, label.title()),
                    "label_raw":    label,
                    "confidence":   round(conf, 3),
                    "pcu":          round(pcu, 2),
                    "bbox":         [x1,y1,x2,y2],
                    "is_vehicle":   bool(is_vehicle),
                    "is_person":    bool(is_person),
                    "is_ambulance": bool(is_ambulance),
                    "crop_b64":     crop,
                    "timestamp":    round(now, 3),
                }
                frame_dets.append(det)

                with state.lock:
                    state.crop_ring.appendleft(det)

                # ── incident classification ───────────────────────────────
                inc_type = inc_desc = None

                if is_ambulance:
                    inc_type = "ambulance"
                    inc_desc = "Emergency vehicle (Ambulance/EVP) detected — Code-3 corridor required."

                elif is_vehicle:
                    cx,cy = (x1+x2)//2, (y1+y2)//2
                    tid   = hash((round(cx/30), round(cy/30)))
                    if tid in stall_tracker:
                        st_t, st_c = stall_tracker[tid]
                        dist = ((cx-st_c[0])**2+(cy-st_c[1])**2)**0.5
                        if dist < 15 and (now - st_t) >= 15.0:
                            inc_type = "stall"
                            inc_desc = f"Stalled {label} detected (>15s stationary)."
                    # update tracker: reset timer only if vehicle moved significantly
                    if tid in stall_tracker:
                        st_t, st_c = stall_tracker[tid]
                        dist = ((cx-st_c[0])**2+(cy-st_c[1])**2)**0.5
                        if dist > 15:
                            stall_tracker[tid] = (now, (cx,cy))
                    else:
                        stall_tracker[tid] = (now, (cx,cy))

                # record incident (with dedup: same type ≤ 10s apart → skip)
                if inc_type and crop:
                    last = _last_incident_t.get(inc_type, 0)
                    if now - last >= 10.0:
                        _last_incident_t[inc_type] = now
                        try:
                            # build incident crop with a coloured banner at bottom
                            raw_crop = frame[max(0,y1-5):min(FRAME_H,y2+5),
                                             max(0,x1-5):min(FRAME_W,x2+5)].copy()
                            ih,iw = raw_crop.shape[:2]
                            if iw < 80 or ih < 60:
                                sc = max(80/max(iw,1), 60/max(ih,1))
                                raw_crop = cv2.resize(raw_crop,(int(iw*sc),int(ih*sc)))
                                ih,iw = raw_crop.shape[:2]
                            BANNERS = {"ambulance":(0,0,220),"stall":(0,140,255),"accident":(180,0,200)}
                            bc = BANNERS.get(inc_type,(0,0,180))
                            bh = 26
                            canvas = np.zeros((ih+bh, iw, 3), dtype=np.uint8)
                            canvas[:ih] = raw_crop
                            cv2.rectangle(canvas,(0,ih),(iw,ih+bh),bc,-1)
                            badge = f"{inc_type.upper()}  |  {time.strftime('%H:%M:%S')}"
                            cv2.putText(canvas, badge, (4, ih+bh-6),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.44,
                                        (255,255,255),1,cv2.LINE_AA)
                            _,ibuf = cv2.imencode(".jpg",canvas,[cv2.IMWRITE_JPEG_QUALITY,88])
                            inc_b64 = base64.b64encode(ibuf.tobytes()).decode("utf-8")
                        except Exception:
                            inc_b64 = crop

                        inc_entry = {
                            "id":          f"INC{int(now*1000)%999999}",
                            "type":        inc_type,
                            "label":       LABEL_DISPLAY.get(label, label.title()),
                            "description": inc_desc,
                            "bbox":        [x1,y1,x2,y2],
                            "crop_b64":    inc_b64,
                            "timestamp":   round(now,3),
                            "time_str":    time.strftime("%H:%M:%S"),
                        }
                        with state.lock:
                            state.incident_crops.appendleft(inc_entry)

        # ── quadrant labels on composite ──────────────────────────────────
        labels_4 = ["NORTH","SOUTH","EAST","WEST"]
        for idx,(lx,ly) in enumerate([(0,0),(qw,0),(0,qh),(qw,qh)]):
            cv2.rectangle(annotated,(lx,ly),(lx+90,ly+20),(0,0,0),-1)
            cv2.putText(annotated, labels_4[idx],
                        (lx+4, ly+15), cv2.FONT_HERSHEY_SIMPLEX,
                        0.50, (80,180,255), 1, cv2.LINE_AA)
        # dividing lines
        cv2.line(annotated,(qw,0),(qw,FRAME_H),(60,60,60),1)
        cv2.line(annotated,(0,qh),(FRAME_W,qh),(60,60,60),1)

        # ── HUD ───────────────────────────────────────────────────────────
        total_v = sum(v for k,v in class_counts.items() if k in VEHICLE_LABELS)
        cv2.rectangle(annotated,(0,0),(350,72),(10,10,20),-1)
        cv2.rectangle(annotated,(0,0),(350,72),(50,50,70),1)
        cv2.putText(annotated, f"VEHICLES: {total_v}   PCU: {total_pcu:.1f}",
                    (10,26), cv2.FONT_HERSHEY_SIMPLEX,0.62,(0,220,100),2,cv2.LINE_AA)
        cv2.putText(annotated, f"DETECTIONS: {len(frame_dets)}   FPS: {state.fps:.1f}",
                    (10,52), cv2.FONT_HERSHEY_SIMPLEX,0.50,(180,180,180),1,cv2.LINE_AA)
        cv2.putText(annotated, os.path.basename(MODEL_PATH) if MODEL_PATH else "",
                    (FRAME_W-340, FRAME_H-12),
                    cv2.FONT_HERSHEY_SIMPLEX,0.40,(100,160,255),1,cv2.LINE_AA)

        # ── FPS calc ──────────────────────────────────────────────────────
        elapsed = time.time()-prev_t
        fps_val = 1.0/elapsed if elapsed>0 else 0.0
        prev_t  = time.time()

        with state.lock:
            state.latest_frame      = annotated
            state.latest_detections = frame_dets
            state.class_counts      = dict(class_counts)
            state.total_pcu         = round(total_pcu,2)
            state.fps               = round(fps_val,1)
            state.frame_count      += 1

        spent = time.time()-t0
        time.sleep(max(0.0, delay-spent))

    for cap in caps:
        cap.release()
    print("[DetectionLoop] Stopped.")


# ── start / stop ──────────────────────────────────────────────────────────────
_worker: Optional[threading.Thread] = None

def start_detection():
    global _worker
    if state.running:
        return
    state.running = True
    _worker = threading.Thread(target=_detection_loop, daemon=True, name="DetectionLoop")
    _worker.start()
    print("[DetectionBackend] Detection loop started.")

def stop_detection():
    state.running = False
    if _worker:
        _worker.join(timeout=5.0)
    print("[DetectionBackend] Detection loop stopped.")


# ── FastAPI router ────────────────────────────────────────────────────────────
router = APIRouter(tags=["Real Detection"])


@router.get("/api/frame",
            summary="Live YOLOv8-annotated JPEG from 4-camera composite")
async def get_frame():
    """
    Returns the latest annotated JPEG frame.
    Uses the actual project traffic videos (north/south/east/west .mp4)
    tiled into a 4-quadrant composite, with YOLOv8 boxes drawn on them.
    """
    with state.lock:
        frame = state.latest_frame

    if frame is None:
        ph = np.zeros((FRAME_H, FRAME_W, 3), dtype=np.uint8)
        videos_str = ", ".join(state.video_sources) or "none found"
        cv2.putText(ph, "Starting detection loop...",
                    (FRAME_W//4, FRAME_H//2 - 20),
                    cv2.FONT_HERSHEY_SIMPLEX,1.0,(80,80,255),2,cv2.LINE_AA)
        cv2.putText(ph, f"Videos: {videos_str}",
                    (20, FRAME_H//2 + 20),
                    cv2.FONT_HERSHEY_SIMPLEX,0.5,(160,160,160),1,cv2.LINE_AA)
        _, buf = cv2.imencode(".jpg", ph)
    else:
        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])

    return Response(content=buf.tobytes(), media_type="image/jpeg")


@router.get("/api/detections",
            summary="Cropped bbox images for each detected vehicle/person")
async def get_detections():
    """
    Each entry has:
      crop_b64 — base64 JPEG of ONLY the bounding-box region, not the full frame.
    """
    with state.lock:
        crops = list(state.crop_ring)[:40]
    return JSONResponse({"detections": crops, "count": len(crops)})


@router.get("/api/incidents",
            summary="Cropped incident snapshots (ambulance / stall / accident)")
async def get_incidents():
    """
    Only the bounding-box region is captured + incident type banner.
    """
    with state.lock:
        incs = list(state.incident_crops)[:20]
    return JSONResponse({"incidents": incs, "count": len(incs)})


@router.get("/api/detection_stats",
            summary="FPS, vehicle counts, PCU totals, model & video info")
async def get_detection_stats():
    with state.lock:
        cc    = dict(state.class_counts)
        fps   = state.fps
        fc    = state.frame_count
        pcu   = state.total_pcu
        model = state.model_name
        vids  = list(state.video_sources)
        dets  = len(state.latest_detections)
        incs  = len(state.incident_crops)
        run   = state.running

    return JSONResponse({
        "fps":             fps,
        "frame_count":     fc,
        "total_pcu":       pcu,
        "class_counts":    cc,
        "model":           model,
        "video_sources":   vids,
        "detection_count": dets,
        "incident_count":  incs,
        "running":         run,
    })
