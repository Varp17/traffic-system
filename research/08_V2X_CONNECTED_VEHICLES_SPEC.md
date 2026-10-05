# V2X Connected Vehicle Protocol & Arterial Green Wave Specification

This specification formalizes the Vehicle-to-Everything (V2X) communication interfaces and Arterial Green Wave synchronization mechanisms integrated into the DevDominators Intelligent Traffic System.

---

## 1. V2X Communication Architecture

The system supports connected vehicle integration via standard **SAE J2735** message structures over Dedicated Short-Range Communications (DSRC / IEEE 802.11p) and Cellular-V2X (C-V2X / 3GPP Rel 14–16).

```
┌─────────────────────┐                 ┌─────────────────────────────┐
│ Connected Vehicles  │                 │ DevDominators Roadside Unit │
│ (Emergency, Transit,│                 │ (RSU) Edge ATSC Controller  │
│ Passenger Cars)     │                 │                             │
└──────────┬──────────┘                 └──────────────┬──────────────┘
           │                                           │
           │  1. Basic Safety Message (BSM)            │
           ├──────────────────────────────────────────►│
           │                                           │
           │  2. Signal Request Message (SRM: EVP/TSP) │
           ├──────────────────────────────────────────►│ (Preemption Trigger)
           │                                           │
           │  3. Signal Phase & Timing (SPaT)          │
           │◄──────────────────────────────────────────┤ (Real-time countdown)
           │                                           │
           │  4. Intersection Topology Map (MAP)       │
           │◄──────────────────────────────────────────┤ (Lane coordinates)
           │                                           │
```

---

## 2. Standard SAE J2735 Message Formats

### 2.1 SPaT (Signal Phase and Timing) Payload Schema
The Roadside Unit (RSU) broadcasts SPaT packets at 10 Hz:
```json
{
  "messageId": 19,
  "intersectionId": "INT_4WAY_001",
  "revision": 1,
  "status": "operational",
  "timeStamp": 1727371500.25,
  "phases": [
    {
      "phaseId": 1,
      "lane": "North",
      "currentState": "green",
      "minEndTime": 1727371518.5,
      "maxEndTime": 1727371540.0,
      "timeRemainingSec": 18.25,
      "preemptionActive": false
    },
    {
      "phaseId": 2,
      "lane": "South",
      "currentState": "red",
      "minEndTime": 1727371518.5,
      "maxEndTime": 1727371540.0,
      "timeRemainingSec": 0.0,
      "preemptionActive": false
    },
    {
      "phaseId": 3,
      "lane": "East",
      "currentState": "red",
      "minEndTime": 1727371518.5,
      "maxEndTime": 1727371540.0,
      "timeRemainingSec": 0.0,
      "preemptionActive": false
    },
    {
      "phaseId": 4,
      "lane": "West",
      "currentState": "red",
      "minEndTime": 1727371518.5,
      "maxEndTime": 1727371540.0,
      "timeRemainingSec": 0.0,
      "preemptionActive": false
    }
  ]
}
```

### 2.2 Signal Request Message (SRM: EVP & TSP)
Connected emergency vehicles and public transit buses transmit priority requests:
- **Priority Type:**
  - `EVP` (Emergency Vehicle Preemption — Ambulance, Fire, Police): Requests immediate green corridor.
  - `TSP` (Transit Signal Priority — Bus): Requests green extension ($\le 8\text{s}$) or early green truncation to maintain transit schedules without disrupting entire cycles.

---

## 3. Arterial Green Wave Synchronization Model

An arterial corridor consists of multiple successive intersections along a major boulevard. Without coordination, vehicles departing on a green light encounter red signals at adjacent downstream intersections.

### 3.1 Ideal Progression Offset ($\Delta t_{\text{offset}}$)
For two adjacent intersections $i$ and $i+1$ separated by distance $D_{i, i+1}$ (meters) with design progression speed $v_{\text{prog}}$ (m/s):
$$\Delta t_{\text{offset}} = \frac{D_{i, i+1}}{v_{\text{prog}}} \pmod{C_o}$$

Where:
- $v_{\text{prog}} \approx 12.5\text{ m/s}$ (45 km/h).
- $C_o$ is common Webster cycle length (e.g. 60–90s).

### 3.2 Green Bandwidth ($B$)
The green bandwidth represents the temporal window during which a platoon of vehicles can travel non-stop through the entire arterial without halting:
$$B = g - \frac{L_{\text{platoon}}}{v_{\text{prog}}}$$
Where $L_{\text{platoon}}$ is spatial length of the vehicle platoon and $g$ is effective green time.

DevDominators implements dynamic offset synchronization: when an upstream camera detects a vehicle platoon clearing the intersection, it notifies the downstream controller to align its next green onset precisely as the platoon arrives.
