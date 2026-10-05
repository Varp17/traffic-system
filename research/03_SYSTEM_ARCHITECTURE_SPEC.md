# System Architecture Specification: DevDominators AI Traffic System

## 1. High-Level Architecture Overview

The system is structured as an edge-deployable, high-throughput, multi-threaded perception and control platform.

```
                    ┌────────────────────────┐
                    │ Multi-Camera Ingestion │ (4 Streams: North, South, East, West)
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ Multi-Modal Perception │
                    │ - YOLOv8 Detector      │
                    │ - Optical Color Mask   │
                    │ - Audio Siren FFT      │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ Tracking & Kinematics  │
                    │ - Kalman Centroid / IoU│
                    │ - Speed & Acceleration │
                    │ - PCU Queue Weighting  │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ Anomaly & Incident     │
                    │ - Collision Evaluator  │
                    │ - Stalled Obstructions │
                    │ - Jaywalking Alerts    │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼────────────┐
                    │ Adaptive ATSC Engine   │
                    │ - Webster Cycle Length │
                    │ - Dynamic Green Splits │
                    │ - Starvation Fairness  │
                    │ - Emergency Preemption │
                    └───────────┬────────────┘
                                │
          ┌─────────────────────┴─────────────────────┐
          │                                           │
┌─────────▼──────────────┐                 ┌──────────▼─────────────┐
│ FastAPI WebSocket / API│                 │ Modern Web Command UI  │
│ - MJPEG & Raw Frames   │                 │ - 4-Way Video Feeds    │
│ - Telemetry & Alerts   │◄───────────────►│ - Live Glow Signals    │
│ - Remote Override API  │                 │ - Dynamic PCU Charts   │
└────────────────────────┘                 │ - Incident Log Cards   │
                                           └────────────────────────┘
```

---

## 2. Multi-Threaded Execution & Pipeline Concurrency

To ensure non-blocking, deterministic real-time video processing at $\ge 30\text{ FPS}$ without frame latency jitter:

1. **Capture Worker Thread (`_capture_thread`):**
   - Ingests frames asynchronously from 4 video sources (or 4 quadrants of a split camera feed or RTSP IP camera streams).
   - Generates a 2x2 composite tiled canvas ($1280 \times 720$).
   - Manages automatic reconnection and infinite video looping.
   - Pushes raw frames to thread-safe double-buffered shared memory guarded by `threading.Lock`.

2. **Perception & Tracking Inference Thread (`_inference_thread`):**
   - Runs YOLOv8 inference at configured stride (`PROCESS_EVERY_N_FRAMES = 2`).
   - Executes multi-object tracking and trajectory updates.
   - Computes instantaneous PCU queue densities per approach quadrant.
   - Updates the adaptive signal optimizer state machine.
   - Evaluates potential collisions and logs incident snapshots.

3. **Audio Siren Analysis Engine (`AudioSirenDetector`):**
   - Continuously monitors incoming audio stream or dedicated audio file (`siren.mp3`).
   - Computes FFT power spectrum in real time.
   - Signals the optimizer whenever sustained siren harmonics are detected.

4. **FastAPI & Async WebSocket Server (`main_4way.py`):**
   - Broadcasts JSON telemetry packets to connected browser clients at 30 Hz.
   - Serves JPEG video frames for client-side display with sub-30ms latency.
   - Exposes REST endpoints for remote manual overrides, camera feed swapping, and incident management.

---

## 3. Communication Contracts & Data Formats

### 3.1 WebSocket Telemetry Packet Schema (`/ws`)
```json
{
  "timestamp": 1727371200.5,
  "fps": 29.8,
  "signals": {
    "current_lane": "North",
    "signals": {
      "North": {"state": "green", "time_left": 18.4, "last_green": 1727371180.0},
      "South": {"state": "red", "time_left": 0.0, "last_green": 1727371140.0},
      "East":  {"state": "red", "time_left": 0.0, "last_green": 1727371100.0},
      "West":  {"state": "red", "time_left": 0.0, "last_green": 1727371060.0}
    },
    "webster_cycle_length": 65.0,
    "emergency_active": false,
    "emergency_lane": null
  },
  "lane_stats": {
    "North": {"vehicle_count": 8, "pcu_density": 11.5, "avg_speed_kmh": 28.4, "wait_time": 0.0},
    "South": {"vehicle_count": 4, "pcu_density": 5.0, "avg_speed_kmh": 14.2, "wait_time": 20.5},
    "East":  {"vehicle_count": 12, "pcu_density": 17.5, "avg_speed_kmh": 0.0, "wait_time": 60.5},
    "West":  {"vehicle_count": 3, "pcu_density": 3.5, "avg_speed_kmh": 32.1, "wait_time": 100.5}
  },
  "alerts": [
    {
      "type": "congestion",
      "message": "Heavy congestion in East lane (17.5 PCU)",
      "lane": "East",
      "severity": "medium",
      "age": 2.1
    }
  ],
  "siren_detected": false
}
```

### 3.2 REST API Specification
- `GET /api/frame`: Returns the current annotated frame as `image/jpeg`.
- `GET /api/incidents`: Returns the list of recent incident reports with base64 snapshot previews.
- `POST /api/override-signal`: Body `{"lane": "East", "duration": 25.0}` — forces manual green override.
- `POST /api/trigger-emergency`: Body `{"lane": "South", "duration": 30.0}` — manually triggers green corridor for emergency approach.
- `POST /api/trigger-siren-test`: Evaluates `siren.mp3` and demonstrates audio-driven preemption.
- `POST /api/swap-video`: Body `{"mapping": [1, 0, 2, 3]}` — rearranges camera quadrants dynamically.

---

## 4. Failsafe Mechanisms & Safety Invariants

1. **Yellow Clearance Invariant:** An approach can NEVER abruptly switch from Green directly to Red without a minimum 3.0-second Yellow transition interval.
2. **All-Red Interlock Invariant:** Under emergency preemption or manual override, cross-traffic phases are held in All-Red state to guarantee clear right-of-way.
3. **Starvation Prevention:** A maximum waiting timeout ($T_{\text{wait\_max}} = 60\text{s}$) overrides queue ranking to serve waiting approaches.
4. **Sensor Dropout Graceful Degradation:** If any camera feed disconnects or drops frames, the optimizer defaults to a balanced Webster timing policy based on historical flow rates.
