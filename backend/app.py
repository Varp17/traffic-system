"""
backend/app.py — Main FastAPI server
=====================================
Serves:
  - All original mock dashboard APIs  (/api/intersections, /api/ambulances, etc.)
  - Real YOLOv8 detection APIs        (/api/frame, /api/detections, /api/incidents, /api/detection_stats)
  - Static UI files                   (/ui/...)
  - Root SPA                          (web-dashboard/dist or ui/)

Run with:
    python -m uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
or simply:
    python run_4way.py
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os

# ── project paths ─────────────────────────────────────────────────────────────
backend_dir  = os.path.dirname(__file__)
project_root = os.path.dirname(backend_dir)
dist_path    = os.path.join(project_root, "web-dashboard", "dist")
ui_path      = os.path.join(project_root, "ui")

primary_ui_path = dist_path if os.path.exists(dist_path) else ui_path

# ── app ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="DevDominators — Traffic Monitoring Dashboard", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── mount real detection router ───────────────────────────────────────────────
from backend.app_detection import router as detection_router, start_detection, stop_detection
app.include_router(detection_router)

# ── start / stop detection loop with server lifecycle ─────────────────────────
@app.on_event("startup")
async def _startup():
    start_detection()

@app.on_event("shutdown")
async def _shutdown():
    stop_detection()

# ── static files ──────────────────────────────────────────────────────────────
app.mount("/ui", StaticFiles(directory=ui_path, html=True), name="ui")

if os.path.exists(dist_path):
    assets_path = os.path.join(dist_path, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

# ── Pydantic models ───────────────────────────────────────────────────────────
class Intersection(BaseModel):
    id: str
    name: str
    status: str
    metrics: Optional[dict] = None

class AmbulanceInfo(BaseModel):
    count: int
    last_seen: Optional[str] = None
    details: Optional[List[dict]] = None

class ViolationInfo(BaseModel):
    count: int
    breakdown: Optional[dict] = None

class Detection(BaseModel):
    type: str
    bbox: List[int]
    confidence: float
    timestamp: str

class CameraSnapshot(BaseModel):
    camera_id: str
    image_url: str
    detections: List[Detection]

class ViolationImage(BaseModel):
    image_url: str
    type: str
    timestamp: str
    camera_id: str

class PedestrianCrowd(BaseModel):
    intersection_id: str
    crowd_level: str

class PlateCapture(BaseModel):
    plate: str
    image_url: str
    timestamp: str
    camera_id: str

# ── mock data ─────────────────────────────────────────────────────────────────
mock_intersections = [
    Intersection(id="1", name="Intersection A", status="normal"),
    Intersection(id="2", name="Intersection B", status="congestion"),
    Intersection(id="3", name="Intersection C", status="accident"),
    Intersection(id="4", name="Intersection D", status="normal"),
]

mock_ambulance  = AmbulanceInfo(count=1, last_seen="2026-10-04T15:58:00Z")
mock_violations = ViolationInfo(count=3, breakdown={"lane": 2, "red_light": 1})

mock_camera_snapshots = {
    "cam1": CameraSnapshot(
        camera_id="cam1",
        image_url="/ui/dummy_cam1.jpg",
        detections=[
            Detection(type="ambulance", bbox=[100,200,150,250], confidence=0.92,
                      timestamp="2026-10-04T15:55:00Z"),
            Detection(type="car",       bbox=[300,400,350,450], confidence=0.88,
                      timestamp="2026-10-04T15:55:00Z"),
        ],
    )
}

mock_violations_gallery = [
    ViolationImage(image_url="/ui/violation1.jpg", type="lane",
                   timestamp="2026-10-04T15:40:00Z", camera_id="cam2"),
]

mock_pedestrian = [
    PedestrianCrowd(intersection_id="1", crowd_level="low"),
    PedestrianCrowd(intersection_id="2", crowd_level="medium"),
]

mock_plates = [
    PlateCapture(plate="ABC-1234", image_url="/ui/plate1.jpg",
                 timestamp="2026-10-04T15:30:00Z", camera_id="cam2"),
]

# ── original dashboard API routes ─────────────────────────────────────────────
@app.get("/api/intersections", response_model=List[Intersection])
async def get_intersections():
    return mock_intersections

@app.get("/api/ambulances", response_model=AmbulanceInfo)
async def get_ambulance(window: Optional[str] = None):
    return mock_ambulance

@app.get("/api/violations", response_model=ViolationInfo)
async def get_violations(window: Optional[str] = None):
    return mock_violations

@app.get("/api/cameras/{camera_id}/snapshot", response_model=CameraSnapshot)
async def get_camera_snapshot(camera_id: str):
    snap = mock_camera_snapshots.get(camera_id)
    if not snap:
        raise HTTPException(status_code=404, detail="Camera snapshot not found")
    return snap

@app.get("/api/violations/gallery", response_model=List[ViolationImage])
async def get_violations_gallery(limit: int = 20):
    return mock_violations_gallery[:limit]

@app.get("/api/pedestrians", response_model=List[PedestrianCrowd])
async def get_pedestrian_crowd(window: Optional[str] = None):
    return mock_pedestrian

@app.get("/api/plates", response_model=List[PlateCapture])
async def get_plates(limit: int = 10):
    return mock_plates[:limit]

# ── root SPA ──────────────────────────────────────────────────────────────────
app.mount("/", StaticFiles(directory=primary_ui_path, html=True), name="root_static")

# ── standalone entry point ────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=False)
