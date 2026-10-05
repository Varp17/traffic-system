import React, { useState, useEffect } from 'react';

export default function FourWayPerceptionView({
  selectedIntersection,
  onSwitchView,
  signals,
  emergencyActive,
}) {
  const [layoutMode, setLayoutMode] = useState('quad'); // 'quad' | 'pip'
  const [showLiveStream, setShowLiveStream] = useState(true); // Default to Real OpenCV Detection Stream
  const [phaseTimer, setPhaseTimer] = useState(16.2);
  const [frameNumber, setFrameNumber] = useState(184920);

  // AI Filter Toggles
  const [filters, setFilters] = useState({
    boxes: true,
    vectors: true,
    footpath: true,
    plates: true,
    heatmap: true,
    medical: true,
  });

  // Action Toast Notification State
  const [toast, setToast] = useState({ show: false, text: '', icon: '', isError: false });

  const triggerToast = (text, icon, isError = false) => {
    setToast({ show: true, text, icon, isError });
    setTimeout(() => {
      setToast({ show: false, text: '', icon: '', isError: false });
    }, 4000);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setPhaseTimer((prev) => (prev <= 0.2 ? 24.0 : parseFloat((prev - 0.1).toFixed(1))));
    }, 100);
    const frameInterval = setInterval(() => {
      setFrameNumber((prev) => prev + 4);
    }, 66);
    return () => {
      clearInterval(timer);
      clearInterval(frameInterval);
    };
  }, []);

  const junctionNames = {
    j04: 'Junction 04: Grand Ave & 5th St',
    j05: 'Junction 05: Metro Blvd & 8th St',
    j02: 'Junction 02: Riverside & King Way',
    j07: 'Junction 07: Central Square Cross',
    j08: 'Junction 08: Civic Center Plaza',
    j09: 'Junction 09: Ring Road Expressway',
  };

  const currentJunctionTitle = junctionNames[selectedIntersection] || 'Junction 04: Grand Ave & 5th St';

  return (
    <div className="flex flex-col w-full gap-space-md pb-space-xl">
      {/* 1. Operational Sub-Header Bar */}
      <section className="bg-surface-container-low/80 backdrop-blur-md rounded-xl p-space-md flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-md border border-outline-variant/30 shadow-md">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-space-sm">
            <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px] uppercase tracking-wider font-bold border border-primary/20">
              Live Vision Matrix
            </span>
            <h1 className="font-headline text-[18px] text-on-surface font-bold tracking-tight">
              {currentJunctionTitle} — 4-Way Spatial Multi-Camera Perception
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface-variant font-mono text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              <span>4 RTSP Streams Synchronized @ 60 FPS</span>
            </span>
            <span className="text-outline/40">/</span>
            <span className="text-primary font-medium">TensorRT YOLOv11 Engine Active (8.4ms)</span>
            <span className="text-outline/40">/</span>
            <span className="text-on-surface font-bold">Spatial Homography BEV Calibrated</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm">
          {/* Active Phase Pill */}
          <div className="flex items-center gap-2 px-3 py-1 bg-secondary-container/20 rounded-lg text-secondary border border-secondary/30">
            <span className="material-symbols-outlined text-[18px] animate-spin" style={{ animationDuration: '9s' }}>
              sync
            </span>
            <div className="flex flex-col font-mono leading-tight">
              <span className="text-[9px] uppercase tracking-widest text-secondary/80 font-bold">Signal Phase</span>
              <span className="text-[11px] font-bold text-secondary flex items-center gap-1">
                Phase 02: E-W Protected Green
                <span className="text-[12px] text-primary">({phaseTimer}s)</span>
              </span>
            </div>
          </div>

          {/* Toggle Live Feed vs Graphic Canvas */}
          <button
            onClick={() => setShowLiveStream(!showLiveStream)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold transition-all border ${
              showLiveStream
                ? 'bg-secondary/20 text-secondary border-secondary/40'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface border-outline-variant/30'
            }`}
            title="Toggle Live Camera Stream from Engine"
          >
            <span className="material-symbols-outlined text-[16px]">
              {showLiveStream ? 'videocam' : 'visibility'}
            </span>
            <span>{showLiveStream ? 'Live Video Mode' : 'AI HUD Matrix'}</span>
          </button>


          {/* Buffer Frame Counter */}
          <div className="hidden sm:flex flex-col items-end px-3 py-1 bg-surface-container rounded-lg border border-outline-variant/20 font-mono">
            <span className="text-[9px] text-on-surface-variant font-semibold">BUFFER SYNC</span>
            <span className="text-[11px] text-primary font-bold tracking-wider">
              FRAME #{frameNumber.toLocaleString()}
            </span>
          </div>
        </div>
      </section>

      {/* Live Stream Full Panel (If User enabled Live Video Mode) */}
      {showLiveStream && (
        <section className="bg-surface-container-lowest rounded-xl overflow-hidden border border-primary/40 shadow-2xl relative">
          <div className="p-space-sm bg-surface-container-low flex items-center justify-between border-b border-outline-variant/20 font-mono text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-on-surface font-bold">RTSP COMPOSITE STREAM (PORT 8000)</span>
            </div>
            <span className="text-secondary">Connected · 30 FPS Hardware Accelerated</span>
          </div>
          <div className="w-full max-h-[560px] bg-black flex items-center justify-center relative overflow-hidden">
            <img
              src="/api/stream"
              alt="4-Way Composite Real-Time Live Feed"
              className="w-full max-h-[560px] object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML =
                  '<div class="text-on-surface-variant font-mono text-[13px] flex flex-col items-center gap-2 py-10"><span class="material-symbols-outlined text-[36px] text-primary">videocam_off</span><span>Backend stream active at /api/stream</span></div>';
              }}
            />
          </div>
        </section>
      )}



      {/* 3. Bottom Telemetry & Quick Action Command Dock */}
      <section className="bg-surface-container-low/90 backdrop-blur-md rounded-xl p-space-md flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-md border border-outline-variant/30 shadow-lg">
        {/* Dynamic AI Perception Filters & Toggles */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-on-surface-variant font-mono text-[10px] uppercase tracking-wider font-bold">
            <span className="material-symbols-outlined text-primary text-[16px]">layers</span>
            <span>Active AI Perception Filters & Toggles</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'boxes', label: 'Vehicle Bounding Boxes' },
              { id: 'vectors', label: 'Speed Vectors' },
              { id: 'footpath', label: 'Footpath Polygons' },
              { id: 'plates', label: 'License Plate Triggers' },
              { id: 'heatmap', label: 'Crowd Heatmap' },
              { id: 'medical', label: 'Medical/Collapse Anomaly', highlight: true },
            ].map((f) => (
              <label
                key={f.id}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg cursor-pointer transition-colors border select-none font-mono text-[11px] ${
                  f.highlight
                    ? 'bg-tertiary-container/20 text-tertiary border-tertiary/40 font-bold'
                    : 'bg-surface-container-high/80 text-on-surface border-outline-variant/30 hover:bg-surface-container-highest'
                }`}
              >
                <input
                  type="checkbox"
                  checked={filters[f.id]}
                  onChange={(e) => setFilters({ ...filters, [f.id]: e.target.checked })}
                  className="w-3.5 h-3.5 rounded bg-surface text-primary focus:ring-0 cursor-pointer"
                />
                <span>{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Operational Triggers */}
        <div className="flex flex-wrap items-center gap-space-sm font-mono text-[12px]">
          <button
            onClick={() => {
              triggerToast('Frame Flagged: Scooter Footpath Violation logged to Violations & Citations Registry.', 'gavel', true);
              if (onSwitchView) {
                setTimeout(() => onSwitchView('violations-anpr-capture'), 1200);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-error-container/40 hover:bg-error-container/60 text-error transition-all font-bold border border-error/40 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">gavel</span>
            <span>Flag Frame to Violations & Citations</span>
          </button>

          <button
            onClick={() => triggerToast('Export Initiated: 4x 4K Synchronized Streams Queued for Archive.', 'download', false)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-bold transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">video_file</span>
            <span>Export 4-Cam Sync Clip (1080p60)</span>
          </button>
        </div>
      </section>

      {/* Floating Action Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-surface-container-highest text-on-surface shadow-2xl flex items-center gap-3 border border-outline-variant/40 animate-slideIn">
          <span className={`material-symbols-outlined text-[22px] ${toast.isError ? 'text-error' : 'text-secondary'}`}>
            {toast.icon}
          </span>
          <span className="font-mono text-[12px] font-semibold">{toast.text}</span>
        </div>
      )}
    </div>
  );
}
