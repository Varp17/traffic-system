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

          {/* Layout Switcher Toggles */}
          <div className="flex items-center p-0.5 bg-surface-container-high rounded-lg border border-outline-variant/30 font-mono text-[11px]">
            <button
              onClick={() => setLayoutMode('quad')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold transition-all ${
                layoutMode === 'quad'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">grid_view</span>
              <span>2x2 Quad</span>
            </button>
            <button
              onClick={() => setLayoutMode('pip')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold transition-all ${
                layoutMode === 'pip'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">pip</span>
              <span>Focus + 3 PiP</span>
            </button>
          </div>

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

      {/* 2. Central 2x2 Synchronized Spatial Perception Canvas */}
      <div
        className={`transition-all duration-300 ${
          layoutMode === 'quad'
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-space-md'
            : 'grid grid-cols-1 lg:grid-cols-3 gap-space-md'
        }`}
      >
        {/* CAMERA 1: NORTH APPROACH */}
        <div
          className={`relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-xl aspect-[16/10] group border border-outline-variant/30 ${
            layoutMode === 'pip' ? 'lg:col-span-2 lg:row-span-2' : ''
          }`}
        >
          {/* Background Surveillance Base */}
          <div
            className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-luminosity filter contrast-125 transition-transform duration-700 group-hover:scale-105"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80')",
            }}
          ></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(7,13,31,0.75)_100%)] pointer-events-none"></div>

          {/* CRT / Scanline + Grid HUD Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            <defs>
              <pattern id="cam1-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-outline-variant" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cam1-grid)" />
          </svg>

          {/* Lane Boundary & Footpath Telemetry Vector Layers */}
          {filters.footpath && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-current" fill="none" viewBox="0 0 800 500">
              <path d="M 260 500 L 360 210" strokeDasharray="6 4" strokeWidth="1.5" className="text-primary/50" />
              <path d="M 440 500 L 430 210" strokeDasharray="6 4" strokeWidth="1.5" className="text-primary/50" />
              {/* Dedicated Bus Lane Corridor Overlay */}
              <polygon points="560,500 480,210 540,210 690,500" fill="currentColor" className="text-primary/10" />
              <path d="M 560 500 L 480 210" strokeWidth="2" className="text-primary/70" />
              <text x="580" y="470" fill="currentColor" className="text-primary font-mono text-[10px] font-bold tracking-wider">
                BUS ONLY CORRIDOR
              </text>
              {/* North Sidewalk Polygon Geometry */}
              <polygon points="695,490 545,210 620,210 770,490" fill="currentColor" className="text-secondary/15" />
              <path d="M 695 490 L 545 210 L 620 210 L 770 490 Z" strokeWidth="1.5" className="text-secondary/60" />
            </svg>
          )}

          {/* Computer Vision Real-Time Bounding Boxes (YOLO Overlays) */}
          {filters.boxes && (
            <>
              {/* Vehicle #201: Car */}
              <div className="absolute top-[42%] left-[38%] w-[24%] h-[26%] pointer-events-auto">
                <div className="w-full h-full rounded border-2 border-primary/90 bg-primary/10 relative shadow-[0_0_12px_rgba(76,215,246,0.35)]">
                  <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-primary text-on-primary font-mono text-[10px] font-bold rounded flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-[11px]">directions_car</span>
                    <span>Car #201 · 34 km/h</span>
                  </div>
                  <span className="absolute -top-1 -left-1 w-2 h-2 bg-primary"></span>
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary"></span>
                  <span className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary"></span>
                  <span className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary"></span>
                </div>
              </div>

              {/* Vehicle #44: Public Transit Bus */}
              <div className="absolute top-[28%] left-[58%] w-[20%] h-[36%] pointer-events-auto">
                <div className="w-full h-full rounded border-2 border-primary/90 bg-primary/10 relative shadow-[0_0_12px_rgba(76,215,246,0.35)]">
                  <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-primary text-on-primary font-mono text-[10px] font-bold rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">directions_bus</span>
                    <span>Bus #44 · 18 km/h</span>
                  </div>
                  <span className="absolute bottom-1 right-1 font-mono text-[9px] px-1 bg-surface-container-lowest/90 text-secondary rounded">
                    SCHEDULE: +1.2m
                  </span>
                </div>
              </div>

              {/* Vehicle #89: Motorbike */}
              <div className="absolute top-[52%] left-[27%] w-[10%] h-[18%] pointer-events-auto">
                <div className="w-full h-full rounded border-2 border-primary/70 bg-primary/10 relative">
                  <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-primary text-on-primary font-mono text-[10px] font-bold rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">two_wheeler</span>
                    <span>Moto #89 · 41 km/h</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Sidewalk Status Floating Badge */}
          {filters.footpath && (
            <div className="absolute top-[35%] right-[6%] px-3 py-1.5 bg-surface-container-lowest/90 backdrop-blur-md rounded-lg flex items-center gap-2 border border-outline-variant/30 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <div className="flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-wider text-on-surface-variant">
                  Sidewalk CV Detection
                </span>
                <span className="font-mono text-[10px] text-secondary font-bold">
                  North Sidewalk: Clear (0 Ped)
                </span>
              </div>
            </div>
          )}

          {/* Camera Header Telemetry Bar */}
          <div className="absolute top-0 left-0 right-0 p-2 flex items-center justify-between bg-gradient-to-b from-surface-container-lowest/90 to-transparent">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-primary text-on-primary font-mono text-[10px] font-bold">
                CAM-01 [NORTH]
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high/80 text-on-surface font-mono text-[10px]">
                4K 60FPS
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high/80 text-secondary font-mono text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                INBOUND
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-on-surface-variant">
              <span className="hidden sm:inline">FOV: 112° AZI: 004°</span>
              <span className="text-primary font-bold">REC 00:48:19:12</span>
            </div>
          </div>

          {/* Camera Bottom Analytics Overlay Shelf */}
          <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between bg-gradient-to-t from-surface-container-lowest/95 via-surface-container-lowest/70 to-transparent">
            <div className="flex items-center gap-4 text-on-surface font-mono">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-on-surface-variant">Queue Depth</span>
                <span className="text-[12px] font-bold">38m</span>
              </div>
              <div className="h-6 w-px bg-outline-variant/40"></div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-on-surface-variant">Avg Speed</span>
                <span className="text-[12px] text-secondary font-bold">32 km/h</span>
              </div>
              <div className="h-6 w-px bg-outline-variant/40"></div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-on-surface-variant">Congestion</span>
                <span className="text-[12px] text-secondary font-bold uppercase">Low</span>
              </div>
            </div>
          </div>
        </div>

        {/* CAMERA 2: SOUTH APPROACH */}
        <div className="relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-xl aspect-[16/10] group border border-outline-variant/30">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity filter contrast-125 transition-transform duration-700 group-hover:scale-105"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80')",
            }}
          ></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(7,13,31,0.75)_100%)] pointer-events-none"></div>

          {/* Zebra Crosswalk & Virtual Sensor */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-current" fill="none" viewBox="0 0 800 500">
            <polygon points="120,410 680,410 640,320 160,320" fill="currentColor" className="text-secondary/15" />
            <path d="M 120 410 L 680 410 L 640 320 L 160 320 Z" strokeWidth="2" className="text-secondary/60" />
            <line x1="110" y1="415" x2="280" y2="415" strokeWidth="3" strokeDasharray="4 4" className="text-secondary" />
          </svg>

          {/* Pedestrian Crosswalk Intelligence Alert Box */}
          <div className="absolute bottom-[28%] left-[12%] pointer-events-auto">
            <div className="rounded border-2 border-secondary bg-secondary/10 px-space-sm py-1.5 backdrop-blur-md shadow-[0_0_16px_rgba(78,222,163,0.35)] flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px] animate-bounce">
                directions_walk
              </span>
              <div className="flex flex-col font-mono">
                <span className="text-[9px] uppercase text-secondary font-bold tracking-wider">
                  Crosswalk AI Safe-Zone
                </span>
                <span className="text-[11px] text-on-surface font-semibold">
                  Pedestrians Crossing: 3 persons (Waiting on curb)
                </span>
              </div>
              <span className="ml-2 px-1.5 py-0.5 rounded bg-secondary text-on-secondary font-mono text-[9px] font-bold">
                CROSS CALL +8s
              </span>
            </div>
          </div>

          {/* Stopped Queues */}
          {filters.boxes && (
            <>
              <div className="absolute top-[28%] left-[26%] w-[22%] h-[24%] pointer-events-auto">
                <div className="w-full h-full rounded border border-tertiary/80 bg-tertiary/10 relative">
                  <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-tertiary text-on-tertiary font-mono text-[10px] font-bold rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">directions_car</span>
                    <span>Car #109 · STOPPED</span>
                  </div>
                </div>
              </div>
              <div className="absolute top-[32%] left-[52%] w-[20%] h-[26%] pointer-events-auto">
                <div className="w-full h-full rounded border border-tertiary/80 bg-tertiary/10 relative">
                  <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-tertiary text-on-tertiary font-mono text-[10px] font-bold rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">local_shipping</span>
                    <span>Van #312 · STOPPED</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-2 flex items-center justify-between bg-gradient-to-b from-surface-container-lowest/90 to-transparent">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-mono text-[10px] font-bold">
                CAM-02 [SOUTH]
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high/80 text-on-surface font-mono text-[10px]">
                4K 60FPS
              </span>
              <span className="px-2 py-0.5 rounded bg-error/20 text-error font-mono text-[10px] flex items-center gap-1 border border-error/30 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                RED PHASE
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-on-surface-variant">
              <span>FOV: 104° AZI: 184°</span>
              <span className="text-primary font-bold">REC 00:48:19:12</span>
            </div>
          </div>

          {/* Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between bg-gradient-to-t from-surface-container-lowest/95 via-surface-container-lowest/70 to-transparent">
            <div className="flex items-center gap-4 text-on-surface font-mono">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-on-surface-variant">Queue Length</span>
                <span className="text-[12px] text-tertiary font-bold">64m</span>
              </div>
              <div className="h-6 w-px bg-outline-variant/40"></div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-on-surface-variant">Wait Time</span>
                <span className="text-[12px] text-tertiary font-bold">28s</span>
              </div>
              <div className="h-6 w-px bg-outline-variant/40"></div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-on-surface-variant">Congestion Index</span>
                <span className="text-[12px] text-tertiary font-bold uppercase">Moderate</span>
              </div>
            </div>
          </div>
        </div>

        {/* CAMERA 3: EAST APPROACH (EMERGENCY CORRIDOR + FOOTPATH ENCROACHMENT) */}
        <div className="relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-xl aspect-[16/10] group border border-outline-variant/30">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity filter contrast-125 transition-transform duration-700 group-hover:scale-105"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=1200&q=80')",
            }}
          ></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(7,13,31,0.75)_100%)] pointer-events-none"></div>

          {/* Dynamic Green Corridor Guidance Overlay */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-current" fill="none" viewBox="0 0 800 500">
            <polygon points="340,500 460,500 440,150 360,150" fill="currentColor" className="text-secondary/15" />
            <path d="M 340 500 L 360 150 M 460 500 L 440 150" strokeWidth="2.5" className="text-secondary/80" />
            {/* Red Dashed Encroachment Violation Zone Polygon */}
            {filters.footpath && (
              <>
                <polygon points="610,480 780,480 730,340 590,340" fill="currentColor" className="text-error/20" />
                <polygon
                  points="610,480 780,480 730,340 590,340"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  className="text-error animate-pulse"
                />
              </>
            )}
          </svg>

          {/* PULSING HIGHLIGHT: AMBULANCE #884 EMERGENCY */}
          <div className="absolute top-[38%] left-[40%] w-[24%] h-[34%] pointer-events-auto">
            <div className="w-full h-full rounded border-2 border-secondary bg-secondary/20 relative shadow-[0_0_24px_rgba(78,222,163,0.6)] animate-pulse">
              <div className="absolute -top-7 -left-6 whitespace-nowrap px-space-sm py-1 bg-secondary text-on-secondary font-mono text-[10px] font-bold rounded flex items-center gap-1.5 shadow-lg">
                <span className="material-symbols-outlined text-[16px] animate-spin" style={{ animationDuration: '3s' }}>
                  e911_emergency
                </span>
                <span>EMERGENCY: Ambulance #884 · 58 km/h</span>
                <span className="px-1 rounded bg-on-secondary text-secondary text-[8px] font-bold">CLEAR CORRIDOR</span>
              </div>
              <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className="material-symbols-outlined text-secondary text-[22px]">keyboard_double_arrow_down</span>
              </div>
            </div>
          </div>

          {/* Footpath Encroachment Warning Box (Auto-Cropped Enforcement) */}
          {filters.footpath && (
            <div className="absolute top-[52%] right-[4%] w-[28%] h-[32%] pointer-events-auto">
              <div className="w-full h-full rounded border-2 border-error bg-error/15 relative p-1.5 shadow-[0_0_20px_rgba(255,180,171,0.4)] flex flex-col justify-between">
                <div className="px-1.5 py-0.5 bg-error text-on-error font-mono text-[9px] font-bold rounded flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">warning</span>
                  <span>VIOLATION DETECTED</span>
                </div>
                <div className="p-1.5 bg-surface-container-lowest/90 backdrop-blur-md rounded border border-error/30 font-mono">
                  <span className="text-[10px] text-error font-bold block leading-tight">Scooter on Sidewalk</span>
                  <span className="text-[8px] text-on-surface-variant block mt-0.5">
                    Crop ID #V-9041 · Auto-Cropped to Enforcement
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-2 flex items-center justify-between bg-gradient-to-b from-surface-container-lowest/90 to-transparent">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-secondary text-on-secondary font-mono text-[10px] font-bold">
                CAM-03 [EAST]
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high/80 text-on-surface font-mono text-[10px]">
                4K 60FPS
              </span>
              <span className="px-2 py-0.5 rounded bg-secondary-container/30 text-secondary font-mono text-[10px] font-bold tracking-wider animate-pulse flex items-center gap-1 border border-secondary/40">
                <span className="material-symbols-outlined text-[12px]">bolt</span>
                PRIORITY GREEN HOLD
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-on-surface-variant">
              <span>FOV: 98° AZI: 092°</span>
              <span className="text-primary font-bold">REC 00:48:19:12</span>
            </div>
          </div>

          {/* Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between bg-gradient-to-t from-surface-container-lowest/95 via-surface-container-lowest/70 to-transparent">
            <div className="flex items-center gap-4 text-on-surface font-mono">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-on-surface-variant">Emergency Speed</span>
                <span className="text-[12px] text-secondary font-bold">58 km/h</span>
              </div>
              <div className="h-6 w-px bg-outline-variant/40"></div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-on-surface-variant">ETA Intersection</span>
                <span className="text-[12px] text-secondary font-bold">6s</span>
              </div>
              <div className="h-6 w-px bg-outline-variant/40"></div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-on-surface-variant">Preemption</span>
                <span className="text-[12px] text-secondary font-bold uppercase">Green Hold (Active)</span>
              </div>
            </div>
          </div>
        </div>

        {/* CAMERA 4: WEST APPROACH (HEATMAP & COLLAPSE MEDICAL ANOMALY) */}
        <div className="relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-xl aspect-[16/10] group border border-outline-variant/30">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity filter contrast-125 transition-transform duration-700 group-hover:scale-105"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80')",
            }}
          ></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(7,13,31,0.75)_100%)] pointer-events-none"></div>

          {/* Crowd Density AI Heatmap Overlay */}
          {filters.heatmap && (
            <div className="absolute top-[28%] left-[10%] w-[42%] h-[55%] pointer-events-none rounded-xl bg-gradient-to-br from-tertiary-container/30 via-tertiary/20 to-transparent blur-md"></div>
          )}

          {/* Transit Hub Crowd Cluster Bounding Box */}
          <div className="absolute top-[32%] left-[14%] w-[34%] h-[48%] pointer-events-auto">
            <div className="w-full h-full rounded border-2 border-tertiary bg-tertiary/10 relative p-1.5">
              <div className="absolute -top-6 left-0 px-2 py-0.5 bg-tertiary text-on-tertiary font-mono text-[9px] font-bold rounded flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined text-[12px]">groups</span>
                <span>Plaza Transit Hub: 18 Persons (1.8 p/m²)</span>
              </div>
              <span className="absolute top-1 right-1 px-1 bg-surface-container-lowest/80 text-tertiary font-mono text-[8px] rounded font-bold">
                CLUSTER DENSE
              </span>
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-on-surface font-mono text-[9px]">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-ping"></span>
                <span>Flow: Westbound Boarding</span>
              </div>
            </div>
          </div>

          {/* MEDICAL SAFETY ALERT: PERSON COLLAPSED / SLUMPED */}
          {filters.medical && (
            <div className="absolute top-[44%] right-[10%] w-[30%] h-[36%] pointer-events-auto">
              <div className="w-full h-full rounded border-2 border-tertiary-fixed-dim bg-tertiary-fixed-dim/20 relative p-1.5 shadow-[0_0_24px_rgba(255,185,95,0.45)] border-tertiary">
                <div className="absolute -top-6 -right-1 px-2 py-0.5 bg-tertiary-container text-on-tertiary font-mono text-[9px] font-bold rounded flex items-center gap-1 shadow-md">
                  <span className="material-symbols-outlined text-[12px] animate-pulse">medical_services</span>
                  <span>SAFETY ALERT: Person Slumped / Collapsed</span>
                </div>
                <div className="absolute inset-x-2 bottom-2 p-1.5 bg-surface-container-lowest/90 backdrop-blur-md rounded border border-tertiary/30 font-mono">
                  <span className="text-[10px] text-tertiary font-bold block">Incident AI Verified (Pose Anomaly)</span>
                  <span className="text-[8px] text-secondary font-bold block mt-0.5">
                    Civil Transit Assistance Alerted · Dispatch #803
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-2 flex items-center justify-between bg-gradient-to-b from-surface-container-lowest/90 to-transparent">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-mono text-[10px] font-bold">
                CAM-04 [WEST]
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high/80 text-on-surface font-mono text-[10px]">
                4K 60FPS
              </span>
              <span className="px-2 py-0.5 rounded bg-tertiary/20 text-tertiary font-mono text-[10px] flex items-center gap-1 border border-tertiary/30 font-bold">
                <span className="material-symbols-outlined text-[12px]">accessibility</span>
                PEDESTRIAN PLAZA
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-on-surface-variant">
              <span>FOV: 120° AZI: 274°</span>
              <span className="text-primary font-bold">REC 00:48:19:12</span>
            </div>
          </div>

          {/* Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between bg-gradient-to-t from-surface-container-lowest/95 via-surface-container-lowest/70 to-transparent">
            <div className="flex items-center gap-4 text-on-surface font-mono">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-on-surface-variant">Crowd Status</span>
                <span className="text-[12px] text-tertiary font-bold uppercase">Elevated</span>
              </div>
              <div className="h-6 w-px bg-outline-variant/40"></div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-on-surface-variant">Ped Crosswalk</span>
                <span className="text-[12px] text-secondary font-bold uppercase">Clear</span>
              </div>
              <div className="h-6 w-px bg-outline-variant/40"></div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase text-on-surface-variant">Thermal Sensor</span>
                <span className="text-[12px] text-primary font-bold">36.8°C NOM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
