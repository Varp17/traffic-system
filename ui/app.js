// ui/app.js - Fetch metrics and intersection status dynamically

const statusMap = {
  normal: "🟢 Normal",
  congestion: "🟡 Congestion",
  accident: "🔴 Accident"
};

async function updateDashboard() {
  try {
    // 1. Fetch Intersections
    const resIntersections = await fetch('/api/intersections');
    if (resIntersections.ok) {
      const intersections = await resIntersections.json();
      intersections.forEach((item, idx) => {
        const el = document.getElementById(`intersection-${item.id || (idx + 1)}`);
        if (el) {
          const statusP = el.querySelector('.status');
          if (statusP) {
            statusP.textContent = statusMap[item.status.toLowerCase()] || item.status;
          }
        }
      });
    }

    // 2. Fetch Ambulances
    const resAmbulances = await fetch('/api/ambulances');
    if (resAmbulances.ok) {
      const ambData = await resAmbulances.json();
      const ambEl = document.getElementById('ambulance-count');
      if (ambEl) ambEl.textContent = ambData.count ?? 0;
    }

    // 3. Fetch Violations
    const resViolations = await fetch('/api/violations');
    if (resViolations.ok) {
      const violData = await resViolations.json();
      const violEl = document.getElementById('violation-count');
      if (violEl) violEl.textContent = violData.count ?? 0;
    }

    // 4. Fetch Pedestrians / Crowd
    const resPedestrians = await fetch('/api/pedestrians');
    if (resPedestrians.ok) {
      const pedData = await resPedestrians.json();
      const crowdedCount = pedData.filter(p => p.crowd_level === 'medium' || p.crowd_level === 'high').length;
      const crowdEl = document.getElementById('crowd-count');
      if (crowdEl) crowdEl.textContent = crowdedCount;
    }
  } catch (err) {
    console.error("Dashboard refresh error:", err);
  }
}

// Initial load and periodic refresh every 5 seconds
document.addEventListener('DOMContentLoaded', () => {
  updateDashboard();
  setInterval(updateDashboard, 5000);
});
