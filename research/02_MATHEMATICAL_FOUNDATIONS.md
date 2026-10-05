# Mathematical & Algorithmic Foundations for Intelligent Traffic Signal Control

This document formalizes the mathematical models, equations, and algorithmic heuristics implemented in the DevDominators AI Traffic De-Congestion System.

---

## 1. Passenger Car Unit (PCU) / Passenger Car Equivalent (PCE) Theory

In heterogeneous traffic streams (common in both developed and emerging urban environments), different vehicle types exhibit distinct physical dimensions, acceleration dynamics, turning radii, and road space occupancy. Treating a motorcycle the same as a multi-axle freight truck introduces severe errors in queue estimation and signal optimization.

### 1.1 Reference Standards (IRC:106-1990, Indo-HCM & US HCM 6th Edition)
To standardize flow into a single dimensionless scalar, each detected vehicle $k$ of class $c(k)$ is weighted by its Passenger Car Unit coefficient $w_{\text{pcu}}(c)$:

| Vehicle Class ($c$) | Equivalent PCU Factor ($w_{\text{pcu}}$) | Rationale & Kinematic Basis |
|:---|:---:|:---|
| **Car / Sedan / SUV / Taxi** | **1.00** | Baseline reference passenger vehicle |
| **Heavy Bus (Transit / Intercity)** | **3.00** | Large spatial footprint (~12m), low acceleration rate (0.8 m/s²) |
| **Heavy Truck / Multi-Axle Commercial** | **3.00** | High clearance distance, long braking and startup reaction times |
| **Light Commercial Vehicle (LCV / Van)** | **1.50** | Intermediate cargo capacity, moderate maneuverability |
| **Motorcycle / Scooter / Two-Wheeler** | **0.50** | High lateral agility, rapid acceleration (2.5 m/s²), lane filtering |
| **Bicycle** | **0.20** | Narrow profile, low cruising velocity |
| **Pedestrian** | **0.10** | Vulnerable road user, crossing clearance priority |
| **Ambulance / Fire Rescue** | **Override** | Preempts standard PCU summation; triggers priority preemption |

### 1.2 Total Equivalent Queue Load
For lane $j$ with $N_j$ tracked vehicles, the instantaneous equivalent PCU queue volume $Q_{\text{pcu}, j}$ is given by:
$$Q_{\text{pcu}, j} = \sum_{k=1}^{N_j} w_{\text{pcu}}(c_k)$$

---

## 2. Webster's Optimum Signal Timing Formulation

### 2.1 Derivation of Optimum Cycle Length ($C_o$)
F.V. Webster formulated the delay minimization function by modeling vehicular delay $d$ as the sum of uniform delay and random arrival delay:
$$d = \frac{C(1 - \lambda)^2}{2(1 - \lambda x)} + \frac{x^2}{2q(1 - x)} - 0.65\left(\frac{C}{q^2}\right)^{1/3} x^{(2 + 5\lambda)}$$
Where $C$ is cycle length, $\lambda = g / C$ is green ratio, $q$ is arrival rate, and $x = q / (\lambda s)$ is degree of saturation.

Differentiating total intersection delay with respect to cycle time yields Webster's classic formula for minimum delay:
$$C_o = \frac{1.5 L + 5}{1 - Y}$$

Where:
- **$L$**: Total lost time per cycle across all $n$ phases (seconds):
  $$L = \sum_{i=1}^n l_i = \sum_{i=1}^n (t_{\text{startup}} + t_{\text{clearance}})$$
  Typically $l_i \in [3, 4]\text{ seconds}$ per phase ($L \approx 12 - 16\text{s}$ for a 4-phase intersection).
- **$s_i$**: Saturation flow rate of phase $i$ (design standard: $s_i \approx 1800 \text{ to } 2000 \text{ PCU/hr/lane}$).
- **$q_i$**: Equivalent arrival flow rate of critical lane in phase $i$ (PCU/hr), derived dynamically from real-time perception:
  $$q_i = \max\left(q_{\min}, \frac{Q_{\text{pcu}, i}}{\Delta t_{\text{window}}} \times 3600\right)$$
- **$y_i$**: Flow ratio for phase $i$:
  $$y_i = \frac{q_i}{s_i}$$
- **$Y$**: Sum of critical flow ratios:
  $$Y = \sum_{i=1}^n y_i = \sum_{i=1}^n \frac{q_i}{s_i}$$

### 2.2 Numerical Stability & Boundary Clamping
In real-world conditions, when congestion surges, $Y \to 1.0$ or $Y \ge 1.0$, which would cause the denominator $(1 - Y)$ to become zero or negative. To ensure safe, stable operation, $Y$ and $C_o$ are bounded:
$$\hat{Y} = \min(0.85, \max(0.10, Y))$$
$$C_o^* = \text{clamp}(C_o, C_{\min}, C_{\max})$$
Where:
- $C_{\min} = 40\text{ seconds}$ (preserves minimum pedestrian clearance and startup efficiency).
- $C_{\max} = 120\text{ seconds}$ (prevents excessive cross-phase waiting and driver frustration).

### 2.3 Effective Green Time Allocation ($g_i$)
The net usable green time $(C_o^* - L)$ is partitioned among the phases in direct proportion to their relative flow ratios:
$$g_i = \frac{y_i}{Y} (C_o^* - L)$$

Subject to boundary constraints:
$$g_i^* = \text{clamp}(g_i, g_{\min}, g_{\max})$$
Where $g_{\min} = 10\text{s}$ (minimum green) and $g_{\max} = 60\text{s}$.

---

## 3. Dynamic Phase Allocation & Starvation Prevention

While fixed cyclic controllers step sequentially through phases (e.g., $N \to S \to E \to W$), dynamic controllers can prioritize the lane with the highest instantaneous demand. However, pure greedy selection can lead to **starvation** of low-demand approaches.

### 3.1 Priority Score with Time-Weighted Aging
To guarantee fairness, the priority score $S_j(t)$ for lane $j$ combines instantaneous PCU queue weight with cumulative elapsed wait time:
$$S_j(t) = \alpha \cdot Q_{\text{pcu}, j} + \beta \cdot (t - t_{\text{last\_green}, j})$$
Where:
- $\alpha = 1.0$ (weight for current queue density).
- $\beta = 0.5$ (aging weight per second of waiting).

### 3.2 Hard Fairness Guarantee
If any approach exceeds the maximum permissible waiting threshold:
$$(t - t_{\text{last\_green}, j}) \ge T_{\text{wait\_max}} \quad (T_{\text{wait\_max}} = 60\text{s})$$
Phase selection immediately forces approach $j$ as the next active green phase regardless of relative queue sizes.

---

## 4. Multimodal Emergency Vehicle Preemption (EVP)

### 4.1 Acoustic Siren Power Spectral Density (PSD)
Acoustic siren detection isolates the distinctive periodic audio sweep of emergency sirens (Wail/Yelp) within noisy traffic soundscapes.

Let $x[n]$ be the digital audio signal sampled at $f_s = 22050\text{ Hz}$.
The Short-Time Fourier Transform (STFT) is:
$$X(m, k) = \sum_{n=0}^{N-1} x[n + mH] w[n] e^{-j 2\pi k n / N}$$
Where $w[n]$ is a Hann window, $H$ is the hop size (512 samples), and $N = 2048$.

The spectral energy in the emergency siren band ($f \in [600, 1600]\text{ Hz}$) is:
$$E_{\text{siren}}(m) = \sum_{k = k_{\min}}^{k_{\max}} |X(m, k)|^2$$
Where $k_{\min} = \lfloor 600 \cdot N / f_s \rfloor$ and $k_{\max} = \lceil 1600 \cdot N / f_s \rceil$.

The Siren Spectral Energy Ratio $\gamma_{\text{siren}}(m)$ is:
$$\gamma_{\text{siren}}(m) = \frac{E_{\text{siren}}(m)}{\sum_{k=0}^{N/2} |X(m, k)|^2 + \epsilon}$$

An emergency siren is confirmed when $\gamma_{\text{siren}} > \theta_{\text{siren}} \quad (\theta_{\text{siren}} = 0.45)$ sustained across consecutive temporal windows with characteristic peak-frequency oscillation.

### 4.2 Multi-Modal Fusion
The fused preemption confidence $P_{\text{emergency}}(j)$ for lane $j$ combines visual and acoustic indicators:
$$P_{\text{emergency}}(j) = 1.0 \quad \text{if } \text{VisualAmbulance}_j = \text{True}$$
$$P_{\text{emergency}}(j) = \max(P_{\text{emergency}}(j), 0.85) \quad \text{if } \text{AcousticSiren} = \text{True and } Q_j > 0$$

When triggered:
1. Active non-emergency green phases immediately terminate via safe yellow clearance ($t_y = 3\text{s}$).
2. Emergency approach receives priority green ($g_{\text{emergency}} = 30 - 60\text{s}$).
3. A post-preemption recovery cycle redistributes green time to compensate interrupted phases.

---

## 5. Collision & Incident Kinematics

### 5.1 Intersection over Union (IoU)
For two vehicle bounding boxes $B_1 = [x_{11}, y_{11}, x_{12}, y_{12}]$ and $B_2 = [x_{21}, y_{21}, x_{22}, y_{22}]$:
$$\text{IoU}(B_1, B_2) = \frac{\text{Area}(B_1 \cap B_2)}{\text{Area}(B_1 \cup B_2)}$$

### 5.2 Two-Phase Collision Confirmation Algorithm
1. **Trigger Condition (Potential Impact):**
   $$\text{IoU}(B_1, B_2) \ge \tau_{\text{overlap}} \quad (\tau_{\text{overlap}} = 0.15)$$
   $$\text{AND } \|\vec{v}_1 - \vec{v}_2\|_2 < v_{\text{rel\_stop}} \quad (v_{\text{rel\_stop}} \approx 2.0\text{ px/frame})$$
2. **Persistence Confirmation (Eliminates Occlusion False Positives):**
   The candidate collision must maintain zero displacement ($\|\vec{v}\| \approx 0$) for a sustained confirmation duration:
   $$T_{\text{stopped}} \ge \tau_{\text{confirm}} \quad (\tau_{\text{confirm}} = 4.0\text{ seconds})$$
3. If confirmed, a high-severity Incident Report is generated with bounding-box snapshot, quadrant ID, timestamp, and automated emergency notification dispatch.
