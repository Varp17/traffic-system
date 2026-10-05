# GitHub Repositories Survey: Open-Source Traffic Management & AI Signal Systems

This document analyzes existing open-source GitHub implementations in intelligent traffic systems, computer vision vehicle detection, adaptive signal controllers, and emergency preemption.

---

## 1. Comparative Analysis of Open-Source GitHub Repositories

| Repository / Project | Architecture & Tech Stack | Perception Method | Signal Timing Logic | Emergency Handling | Critical Limitations | DevDominators Superiority |
|:---|:---|:---|:---|:---|:---|:---|
| **YOLOv8-Traffic-Signal-Control** (Various authors) | Python, OpenCV, Ultralytics YOLOv8 | Raw bounding box count per frame | Proportional rule ($T = k \cdot N$) | Visual class substring check | Ignores vehicle mass/PCU (treats motorcycle = truck); lacks starvation protection; no audio siren sensing; no multi-camera 4-way stream synchronization | Full IRC:106 PCU weighting; analytical Webster delay optimization; multimodal audio siren FFT; 4-camera composite canvas |
| **SUMO-RL** (LucasAlegre) | Python, PyTorch, SUMO simulator, Gymnasium | Simulated induction loops (synthetic) | Deep Q-Learning (DQN) / PPO | None (relies on synthetic routes) | Simulator-only; cannot ingest live RTSP or video camera feeds; vulnerable to sim-to-real transfer gap; non-deterministic black-box control | Zero-shot real-world deployment on live video/IP cameras; deterministic Webster safety guarantees with explainable splits |
| **CityFlow-Traffic-Platform** (CityFlow Team) | C++, Python, Multi-Agent RL | Virtual road grid cell matrices | Multi-Agent DRL (CoLight, PressLight) | Priority vehicle routing flags | High computational barrier; requires specialized cluster infrastructure; lack of vision perception layer; no web UI | Edge-deployable at $\ge 30\text{ FPS}$ on single GPU/CPU; integrated YOLOv8 vision pipeline; modern React SPA dashboard |
| **AI-Based-Smart-Traffic-Management-System-using-YOLOv5** | Python, Tkinter / OpenCV, YOLOv5 | YOLOv5 vehicle detector | Fixed increment per vehicle count | Hard switch (cuts abruptly to green) | Abrupt phase cuts violate yellow clearance invariant (creates real-world accident hazard); desktop Tkinter GUI lacks remote multi-user accessibility | Strict 3.0s Yellow clearance invariant before emergency green; responsive cloud-ready FastAPI WebSocket web dashboard |
| **Traffic-Net-Accident-Detection** | Python, Keras/TensorFlow CNN | Frame-level classification | None (analytics only) | None | High false alarm rate on stopped traffic at red lights; cannot distinguish normal red-light stop from real vehicle crash | Two-phase spatio-temporal confirmation ($IoU \ge 0.15$ + deceleration + post-impact dwell $\ge 4\text{s}$) prevents false alarms |

---

## 2. Deep Dive into Architectural Patterns

### Pattern A: Simple Count-Based Heuristics (Common in Hackathons)
- Formula: $G = \text{clamp}(T_{\text{base}} + N \cdot \Delta t, G_{\min}, G_{\max})$
- **Defects:**
  1. **Heterogeneous Traffic Blindness:** 5 motorcycles occupy less than 1 bus length, yet receive the same green time as 5 heavy transit buses.
  2. **Greedy Starvation:** A heavily congested main arterial repeatedly claims green lights while cross-streets starve indefinitely.
  3. **No Saturation Modeling:** Fails to account for intersection discharge capacity ($s = 1800\text{ PCU/hr}$).

### Pattern B: DevDominators Integrated Solution Architecture
DevDominators synthesizes the strengths of computer vision and classical traffic engineering:
1. **Perception Layer:** YOLOv8 multi-class detection converted to standardized Passenger Car Units (PCU) according to IRC:106 / Indo-HCM standards.
2. **Kinematic Tracker:** IoU + Centroid hybrid tracker maintaining velocity vectors ($\vec{v}$), acceleration ($\vec{a}$), and dwell times ($T_{\text{wait}}$).
3. **Analytical ATSC Core:** Webster's Optimum Delay formula dynamically recalculating optimum cycle length $C_o$ and green splits $g_i$ based on critical flow ratios.
4. **Safety & Fairness Interlocks:**
   - Hard starvation timeout ($T_{\text{wait}} \ge 60\text{s}$) guarantees service.
   - Yellow clearance invariant ($t_y = 3.0\text{s}$) prevents collision risk during emergency preemption.
5. **Multi-Modal Audio-Visual Fusion:** FFT spectral analysis flags sirens in the $600 - 1600\text{ Hz}$ acoustic corridor before vehicles enter camera FOV.
