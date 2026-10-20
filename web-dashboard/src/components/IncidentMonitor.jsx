import React, { useState, useEffect } from 'react';

export default function IncidentMonitor() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedLane, setSelectedLane] = useState('North');
  const [actionMsg, setActionMsg] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [columnLayout, setColumnLayout] = useState('4'); // '4' for 4-columns/dense, '3' for 3-columns

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const data = await res.json();
        setIncidents(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch incidents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 2500);
    return () => clearInterval(interval);
  }, []);

  const showMsg = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(''), 4500);
  };

  const triggerSimulation = async (type) => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/simulate-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, lane: selectedLane }),
      });
      if (res.ok) {
        showMsg(`✓ Triggered simulation: ${type.toUpperCase()} on ${selectedLane} approach.`);
        await fetchIncidents();
      }
    } catch (e) {
      showMsg(`Simulation failed: ${e.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const clearHistory = async () => {
    if (!window.confirm('Clear all recorded incident forensic logs?')) return;
    try {
      const res = await fetch('/api/clear-incidents', { method: 'POST' });
      if (res.ok) {
        setIncidents([]);
        showMsg('✓ Incident forensic archive cleared.');
      }
    } catch {
      showMsg('Failed to clear incidents.');
    }
  };

  const counts = {
    all: incidents.length,
    accident: incidents.filter((i) => i.type === 'accident').length,
    ambulance: incidents.filter((i) => i.type === 'ambulance').length,
    parking: incidents.filter((i) => i.type === 'parking').length,
    crowd: incidents.filter((i) => i.type === 'crowd').length,
  };

  const filtered = incidents.filter((inc) => {
    if (filter === 'all') return true;
    return inc.type === filter;
  });

  const getMethodology = (type) => {
    switch (type) {
      case 'accident':
        return 'Kinematic IoU Deformation & Two-Phase Stationary Impact Dwell';
      case 'ambulance':
        return 'Optical Dual-Strobe HSV Multi-Spectral & Acoustic FFT Preemption';
      case 'parking':
        return 'Stationary Dwell Delay Threshold (>15s in Active Corridor)';
      case 'crowd':
        return 'Crosswalk Depth Alignment & Spatial Conflict Buffer';
      default:
        return 'Autonomous Neural Computer Vision Anomaly Detection';
    }
  };

  // Clean description for concise, punchy 2-line presentation
  const cleanDescription = (desc = '') => {
    if (!desc) return 'Automatic anomaly alert captured and verified by autonomous perception.';
    return desc
      .replace(/^\[!\]\s*(COLLISION|ACCIDENT|ACCIDENT SCENE|STALL|PEDESTRIAN IMPACT CONFLICT):\s*/i, '')
      .replace(/^CRITICAL:\s*/i, '')
      .replace(/^Class-1 Emergency Priority:\s*/i, '')
      .replace(/^Traffic Flow Obstruction:\s*/i, '')
      .replace(/^Pedestrian Crosswalk Safety:\s*/i, '')
      .trim();
  };

  return (
    <div className="flex flex-col w-full gap-5 max-w-[1720px] mx-auto pb-16 px-1 sm:px-3">
      {/* 1. Header with Title and Category Filter Tabs */}
      <section className="bg-[#090e1a]/95 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-2xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-xl shrink-0 shadow-inner">
            🚨
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Incident Feed &amp; Security Anomaly Archive
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              Kinematic collision verification &bull; High-res base64 forensic evidence capture &bull; Real-time Safety Preemption
            </p>
          </div>
        </div>

        {/* Filter Tabs with Dynamic Counts matching screenshot */}
        <div className="flex items-center gap-1.5 flex-wrap bg-slate-900/80 p-1.5 rounded-xl border border-white/10">
          {[
            { id: 'all', label: 'All', count: counts.all, color: 'text-sky-400 border-sky-400/40 bg-sky-500/20' },
            { id: 'accident', label: 'Accidents', icon: '🚨', count: counts.accident, color: 'text-rose-400 border-rose-400/40 bg-rose-500/20' },
            { id: 'ambulance', label: 'Ambulances', icon: '🚑', count: counts.ambulance, color: 'text-purple-400 border-purple-400/40 bg-purple-500/20' },
            { id: 'parking', label: 'Stalls (>15s)', icon: '🛑', count: counts.parking, color: 'text-amber-400 border-amber-400/40 bg-amber-500/20' },
            { id: 'crowd', label: 'Pedestrians', icon: '👥', count: counts.crowd, color: 'text-emerald-400 border-emerald-400/40 bg-emerald-500/20' },
          ].map((f) => {
            const isActive = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 border ${
                  isActive
                    ? f.color
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {f.icon && <span>{f.icon}</span>}
                <span>{f.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Interactive Testing Toolbar & Grid View Selector */}
      <section className="bg-[#090e1a]/90 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-sky-400 tracking-wider uppercase font-mono">
              Approach:
            </span>
            <select
              value={selectedLane}
              onChange={(e) => setSelectedLane(e.target.value)}
              className="bg-[#020617] text-white border border-white/20 px-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:border-sky-400"
            >
              <option value="North">North Approach</option>
              <option value="South">South Approach</option>
              <option value="East">East Approach</option>
              <option value="West">West Approach</option>
            </select>
          </div>

          {/* Density / Layout Selector */}
          <div className="flex items-center gap-1 bg-[#020617] p-1 rounded-lg border border-white/10 ml-0 sm:ml-2">
            <button
              onClick={() => setColumnLayout('4')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono transition-all flex items-center gap-1.5 ${
                columnLayout === '4'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="4 Rows / 4 Columns (Dense Grid View)"
            >
              <span>⊞</span> 4 Rows (4 Columns)
            </button>
            <button
              onClick={() => setColumnLayout('3')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono transition-all flex items-center gap-1.5 ${
                columnLayout === '3'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="3 Columns (Standard Grid View)"
            >
              <span>⊞</span> 3 Columns
            </button>
          </div>
        </div>

        {/* Action Simulation Buttons matching user screenshot */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => triggerSimulation('accident')}
            disabled={isSimulating}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/50 text-rose-300 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <span>💥</span> Simulate Crash
          </button>
          <button
            onClick={() => triggerSimulation('ambulance')}
            disabled={isSimulating}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/50 text-purple-300 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <span>🚑</span> Test Ambulance Priority
          </button>
          <button
            onClick={() => triggerSimulation('parking')}
            disabled={isSimulating}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/50 text-amber-300 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <span>🛑</span> Test Vehicle Stall
          </button>
          <button
            onClick={() => triggerSimulation('crowd')}
            disabled={isSimulating}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/50 text-sky-300 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            <span>👥</span> Test Pedestrian Conflict
          </button>
          <button
            onClick={clearHistory}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>🗑</span> Clear Log
          </button>
        </div>
      </section>

      {/* Notification Toast */}
      {actionMsg && (
        <div className="px-4 py-2.5 rounded-xl bg-sky-500/20 border border-sky-400/50 text-sky-200 font-mono text-xs font-bold shadow-lg animate-fadeIn flex items-center gap-2">
          <span>ℹ</span> {actionMsg}
        </div>
      )}

      {/* 3. Main Incident Grid (Clear View of Image + Incident Report in 2 Lines) */}
      <section className="min-h-[420px]">
        {loading && incidents.length === 0 ? (
          <div className="py-24 text-center text-slate-400 font-mono text-sm">
            Loading forensic incident archive...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#090e1a]/80 rounded-2xl p-16 border border-white/10 text-center flex flex-col items-center gap-3">
            <span className="text-5xl">🛡️</span>
            <h3 className="text-base font-bold text-emerald-400">
              No {filter !== 'all' ? filter.toUpperCase() : ''} Incidents Currently Filtered
            </h3>
            <p className="text-xs text-slate-400 max-w-md">
              No safety hazards detected under this filter. You can inject on-demand simulation tests above to verify capture.
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-4.5 ${
              columnLayout === '4'
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {filtered.map((incident, idx) => {
              const imageSrc =
                incident.frame_b64 ||
                incident.camera_frame_b64 ||
                incident.cropped_image_b64 ||
                incident.vehicle_crop_b64;

              const dateStr =
                typeof incident.timestamp === 'number'
                  ? new Date(incident.timestamp * 1000).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })
                  : String(incident.timestamp || '');

              const laneUpper = incident.lane ? incident.lane.toUpperCase() : 'NORTH';

              // Type badge info
              const typeBadges = {
                accident: { label: 'CRITICAL: COLLISION DETECTED', bg: 'bg-rose-600/90 text-white border-rose-400/40' },
                ambulance: { label: 'CLASS-1 EMERGENCY PREEMPTION', bg: 'bg-purple-600/90 text-white border-purple-400/40' },
                parking: { label: 'STALL OBSTRUCTION (>15S)', bg: 'bg-amber-600/90 text-white border-amber-400/40' },
                crowd: { label: 'PEDESTRIAN CROSSWALK HOLD', bg: 'bg-sky-600/90 text-white border-sky-400/40' },
              };
              const badge = typeBadges[incident.type] || { label: 'ANOMALY DETECTED', bg: 'bg-slate-700 text-white' };

              return (
                <div
                  key={incident.id || idx}
                  onClick={() => setSelectedIncident(incident)}
                  className="bg-[#090e1a] rounded-xl border border-white/10 hover:border-sky-400/50 overflow-hidden flex flex-col shadow-xl cursor-pointer transition-all duration-200 hover:-translate-y-1 group"
                >
                  {/* CLEAR VIEW OF IMAGE (Crisp 16:9 / 16:10 Container) */}
                  <div className="relative w-full aspect-[16/10] sm:aspect-video bg-[#020617] overflow-hidden border-b border-white/10">
                    {imageSrc ? (
                      <img
                        src={`data:image/jpeg;base64,${imageSrc}`}
                        alt={incident.description}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-500 bg-[#040814]">
                        <span className="text-3xl">
                          {incident.type === 'accident'
                            ? '💥'
                            : incident.type === 'ambulance'
                            ? '🚑'
                            : incident.type === 'parking'
                            ? '🛑'
                            : '👥'}
                        </span>
                        <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 font-bold">
                          Forensic Telemetry Active
                        </span>
                      </div>
                    )}

                    {/* Top-Left Tactical Severity Banner */}
                    <div className="absolute top-2 left-2 pointer-events-none">
                      <span
                        className={`text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide border shadow-md backdrop-blur-sm ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Bottom-Right Camera Indicator Badge matching user screenshot */}
                    <div className="absolute bottom-2 right-2 pointer-events-none">
                      <span className="bg-slate-950/85 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-md text-[10.5px] font-bold text-slate-100 tracking-wider flex items-center gap-1.5 shadow-lg font-mono">
                        📹 {laneUpper} CAM
                      </span>
                    </div>
                  </div>

                  {/* CARD FOOTER: TIMESTAMP + INCIDENT REPORT IN EXACTLY 2 LINES */}
                  <div className="p-3.5 flex flex-col gap-1.5 bg-[#090e1a]">
                    {/* Line 1: Timestamp & Telemetry Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-mono font-medium">
                        {dateStr}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900/90 border border-white/10 px-1.5 py-0.5 rounded">
                        {incident.id || `INC_${Math.floor((incident.timestamp || 0) % 10000)}`}
                      </span>
                    </div>

                    {/* Line 2 & 3: The Incident Report in exactly 2 lines */}
                    <div
                      className="text-[12.5px] text-slate-100 font-medium leading-[1.35rem] h-[2.7rem] overflow-hidden line-clamp-2 break-words"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: '1.35rem',
                        maxHeight: '2.7rem',
                        minHeight: '2.7rem',
                      }}
                      title={incident.description}
                    >
                      <span className="font-bold text-amber-400 mr-1.5">
                        {incident.type === 'accident' && '⚠ COLLISION —'}
                        {incident.type === 'ambulance' && '🚑 EMERGENCY —'}
                        {incident.type === 'parking' && '🛑 STANDSTILL —'}
                        {incident.type === 'crowd' && '👥 PEDESTRIAN —'}
                      </span>
                      {cleanDescription(incident.description)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. High-Resolution Forensic Inspection Modal */}
      {selectedIncident && (
        <div
          onClick={() => setSelectedIncident(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full bg-[#090e1a] rounded-2xl overflow-hidden border border-sky-400/40 shadow-2xl flex flex-col animate-fadeIn"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">
                  {selectedIncident.type === 'accident'
                    ? '💥'
                    : selectedIncident.type === 'ambulance'
                    ? '🚑'
                    : selectedIncident.type === 'parking'
                    ? '🛑'
                    : '👥'}
                </span>
                <div>
                  <h3 className="font-extrabold text-sm uppercase text-sky-400 tracking-wider">
                    {selectedIncident.type} Forensic Evidence Snapshot
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    [{selectedIncident.id || `INC_${Math.floor((selectedIncident.timestamp || 0) % 10000)}`}] &bull; {selectedIncident.lane || 'North'} Approach Corridor
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm border border-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Snapshot View */}
            <div className="p-3 bg-black flex items-center justify-center max-h-[60vh] overflow-hidden">
              {selectedIncident.frame_b64 || selectedIncident.camera_frame_b64 || selectedIncident.cropped_image_b64 ? (
                <img
                  src={`data:image/jpeg;base64,${
                    selectedIncident.frame_b64 ||
                    selectedIncident.camera_frame_b64 ||
                    selectedIncident.cropped_image_b64
                  }`}
                  alt="Enlarged Forensic Snapshot"
                  className="max-w-full max-h-[56vh] object-contain rounded-lg border border-white/10 shadow-lg"
                />
              ) : (
                <div className="py-20 text-center text-slate-500 font-mono text-xs">
                  Visual snapshot not attached to telemetry packet.
                </div>
              )}
            </div>

            {/* Modal Footer with Full Citation & Download */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/90 border-t border-white/10">
              <div className="flex flex-col gap-1 max-w-xl">
                <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                  {selectedIncident.description}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-mono">
                  Approach: {selectedIncident.lane || 'North'} &bull; Verification: {getMethodology(selectedIncident.type)} &bull; Time: {new Date((selectedIncident.timestamp || 0) * 1000).toLocaleString()}
                </div>
              </div>

              {(selectedIncident.frame_b64 || selectedIncident.camera_frame_b64) && (
                <a
                  href={`data:image/jpeg;base64,${selectedIncident.frame_b64 || selectedIncident.camera_frame_b64}`}
                  download={`forensic_incident_${selectedIncident.type}_${Date.now()}.jpg`}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shrink-0 shadow-md"
                >
                  <span>💾</span> Export High-Res Snapshot
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
