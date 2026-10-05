# State of the Art Survey: Intelligent Traffic Management Systems (ITMS) & Adaptive Signal Control

## 1. Executive Summary
Traffic congestion poses significant economic, environmental, and public safety challenges in modern urban centers. Conventional fixed-time traffic controllers operate on static pre-programmed schedules that fail to accommodate real-time stochastic fluctuations in vehicle arrivals, resulting in excessive vehicle delay, increased fuel consumption, and delayed emergency vehicle responses.

This survey examines the state-of-the-art across:
1. **Computer Vision & Perception Models** (YOLOv8/v9/v11, ByteTrack, DeepSORT).
2. **Classical & Adaptive Signal Control** (Webster's Delay Formula, SCOOT, SCATS, Max-Pressure Control).
3. **Deep Reinforcement Learning (DRL) for ATSC** (DQN, PPO, Multi-Agent RL in SUMO and CityFlow).
4. **Emergency Vehicle Preemption (EVP)** (Visual detection, Audio siren frequency analysis, V2X Green Corridors).
5. **Accident & Traffic Anomaly Detection** (Spatio-temporal bounding box overlap, anomalous deceleration vectors, dwell time).

---

## 2. Perception & Multi-Object Tracking (MOT)

### 2.1 Object Detection Architectures
- **YOLOv8 (Ultralytics, 2023):** Employs an anchor-free split-head architecture with decoupled heads for classification and regression. Provides optimal latency/accuracy trade-offs for edge deployments (e.g. YOLOv8n achieves ~80-120 FPS on modern GPUs).
- **YOLOv9 (Wang et al., 2024):** Introduces Programmable Gradient Information (PGI) and Generalized Efficient Layer Aggregation Network (GELAN), addressing information bottleneck issues in deep networks.
- **YOLOv11 (Ultralytics, 2024):** Further optimizes C3k2 blocks and spatial attention, yielding superior mAP at lower parameter counts.

### 2.2 Multi-Object Tracking (MOT)
- **SORT (Simple Online and Realtime Tracking):** Utilizes Kalman filtering for motion prediction and Hungarian algorithm for bounding box IoU association. Vulnerable to identity switches during occlusions.
- **DeepSORT:** Extends SORT with deep appearance descriptor embeddings (ReID) to re-identify vehicles post-occlusion, but increases computational overhead per frame.
- **ByteTrack (Zhang et al., ECCV 2022):** Associates almost every detection box (both high and low confidence) instead of discarding low-score boxes. Retains occluded or blurred vehicles by matching low-score detections with unmatched tracks, achieving state-of-the-art MOTA with near-zero computational overhead.

---

## 3. Adaptive Traffic Signal Control (ATSC) Paradigms

### 3.1 Classical Optimization: Webster's Method
Formulated by F.V. Webster (1958) at the Road Research Laboratory, Webster's equation remains the gold standard theoretical benchmark in traffic engineering:
$$C_o = \frac{1.5 L + 5}{1 - Y}$$
Where:
- $C_o$: Optimum cycle length (seconds) minimizing total vehicular delay.
- $L$: Total lost time per cycle (start-up lost time + clearance intervals).
- $Y = \sum_{i=1}^n y_i$: Sum of critical flow ratios ($y_i = q_i / s_i$, flow rate over saturation flow rate).

The effective green time $g_i$ allocated to phase $i$ is proportional to its critical flow ratio:
$$g_i = \frac{y_i}{Y} (C_o - L)$$

### 3.2 Dynamic Max-Pressure Control (Varaiya, 2013)
Max-Pressure is a decentralized, throughput-optimal network control algorithm. The "pressure" of an intersection phase is defined as:
$$P(m) = \sum_{l \in \text{incoming}(m)} Q_l - \sum_{k \in \text{outgoing}(m)} Q_k$$
Where $Q$ represents queue length. By activating the phase with maximum pressure, the controller stabilizes queue backlogs without requiring prior arrival rate distributions.

### 3.3 Reinforcement Learning Approaches
- **Deep Q-Networks (DQN) & Double DQN:** Formulate signal control as a Markov Decision Process (MDP) where state is vehicle density/queue image, action is phase selection or duration extension, and reward is negative cumulative delay.
- **Multi-Agent Reinforcement Learning (MARL):** Addresses city-wide grid coordination (e.g. CoLight, PressLight) to achieve synchronized green waves.
- **Trade-off Consideration:** RL models require extensive training in synthetic simulators (SUMO, CityFlow) and often suffer from distributional shift or unsafe corner-case behavior under real-world sensor dropouts. Hybrid rule-based Webster/Max-Pressure systems with AI-derived queue inputs offer deterministic safety guarantees, high explainability, and immediate zero-shot deployment readiness.

---

## 4. Emergency Vehicle Preemption (EVP) & Green Corridors

### 4.1 Visual vs. Multi-Modal EVP
Visual detection of emergency vehicles (ambulances, fire engines, police cruisers) using COCO-trained YOLO models presents known challenges:
1. Standard COCO dataset does not separate "ambulance" from "truck" or "car".
2. Custom visual classifiers rely on color histograms (white body, emergency red/blue decals, top strobe lightbars).
3. Occlusions in dense traffic can obscure strobe lights.

### 4.2 Multi-Modal Audio Siren Detection
Integrating acoustic detection mitigates visual occlusions:
- Emergency sirens (Wail, Yelp, Two-Tone) emit dominant acoustic energy between 600 Hz and 1600 Hz with cyclic frequency sweeps (period ~0.2s for Yelp, ~3.5s for Wail).
- Short-Time Fourier Transform (STFT) and Mel-Frequency Cepstral Coefficients (MFCCs) isolate siren harmonics from ambient tire, engine, and wind noise.
- Audio-visual sensor fusion triggers preemption earlier (when the siren is audible 100-200m away, before entering the camera field of view).

### 4.3 Green Wave Preemption Strategy
1. **Immediate Clearance:** Downstream queues are granted priority green to discharge waiting vehicles before the emergency vehicle arrives.
2. **Hold Conflicting Phases:** All cross-traffic signals transition through safe yellow intervals (3s) to all-red.
3. **Recovery Cycle:** Following vehicle passage, the optimizer restores equitable service to starved phases through fairness credits.

---

## 5. Traffic Incident & Anomaly Detection

### 5.1 Collision & Accident Detection
- Vehicle collisions exhibit characteristic signatures:
  1. Spatial intersection / bounding box overlap ($IoU > 0.15$).
  2. Abrupt deceleration ($\Delta v / \Delta t \ll -a_{\max}$).
  3. Post-impact dwell time: vehicles remain stationary in active travel lanes beyond normal traffic stop thresholds ($T_{\text{stopped}} > 4.0\text{s}$).

### 5.2 Breakdown & Obstruction
- A stalled vehicle in a non-red lane or clearance zone with zero velocity while surrounding traffic flows freely triggers an obstruction alert.

### 5.3 Pedestrian Crossing Safety
- Spatial containment checks flag pedestrians present in active vehicular quadrants during green phases, prompting immediate warning badges and speed advisory flags.
