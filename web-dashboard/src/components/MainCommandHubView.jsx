import React, { useState } from 'react';

export default function MainCommandHubView({
  onSelectIntersection,
  onSwitchView,
  metrics,
  signals,
  emergencyActive,
  onTriggerEmergency,
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [consoleNotice, setConsoleNotice] = useState(null);

  const handleActionClick = (actionName) => {
    if (actionName === 'ems') {
      if (onTriggerEmergency) onTriggerEmergency('East');
      setConsoleNotice('EMS Corridor Override Broadcasted to Traffic Network!');
    } else if (actionName === 'all_red') {
      setConsoleNotice('All-Red Emergency Clearance Hold Commanded for 15s.');
    } else if (actionName === 'sync') {
      setConsoleNotice('Webster Coordination Green Wave Offsets Re-Synchronized.');
    } else if (actionName === 'export') {
      setConsoleNotice('ANPR Evidence CSV and PDF Citations Ledger Exported.');
    }
    setTimeout(() => setConsoleNotice(null), 4000);
  };

  const handleInspect = (junctionId) => {
    if (onSelectIntersection) onSelectIntersection(junctionId);
    if (onSwitchView) onSwitchView('4-way-ai-perception');
  };

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* Console Alert Banner if action triggered */}
      {consoleNotice && (
        <div className="mb-space-md p-space-sm rounded-xl bg-primary-container/20 border border-primary/40 text-primary flex items-center justify-between shadow-lg animate-bounce">
          <div className="flex items-center gap-space-xs font-mono text-[12px] font-bold">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>{consoleNotice}</span>
          </div>
          <button onClick={() => setConsoleNotice(null)} className="text-primary hover:text-white">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* 1. Executive KPI Strip */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter mb-space-lg">
        {/* City Traffic Flow */}
        <div className="bg-surface-container-low/90 backdrop-blur-xl p-space-md rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/30 group">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500"></div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
              City Traffic Flow
            </span>
            <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>
          </div>
          <div className="my-space-xs flex items-baseline justify-between">
            <span className="text-[24px] text-on-surface font-bold">Optimal</span>
            <span className="font-mono text-[30px] font-bold text-primary">78%</span>
          </div>
          <div className="space-y-1">
            <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full w-[78%] rounded-full shadow-[0_0_8px_rgba(76,215,246,0.5)]"></div>
            </div>
            <div className="flex justify-between font-mono text-[10px] text-on-surface-variant">
              <span>Target &gt; 70%</span>
              <span className="text-secondary">+4.2% vs 1h ago</span>
            </div>
          </div>
        </div>

        {/* Surveillance Grid */}
        <div className="bg-surface-container-low/90 backdrop-blur-xl p-space-md rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
              Surveillance Grid
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
            </span>
          </div>
          <div className="my-space-xs">
            <div className="flex items-baseline gap-space-xs">
              <span className="font-mono text-[32px] font-bold text-on-surface">12</span>
              <span className="font-mono text-[11px] text-secondary font-bold">ACTIVE</span>
            </div>
            <div className="text-[12px] text-on-surface-variant mt-0.5">0 Intersections Offline</div>
          </div>
          <div className="flex items-center gap-space-xs font-mono text-[10px] text-secondary bg-secondary-container/20 px-2 py-0.5 rounded font-semibold w-fit">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            <span>100% TELEMETRY SYNC</span>
          </div>
        </div>

        {/* AI Incidents */}
        <div className="bg-surface-container-low/90 backdrop-blur-xl p-space-md rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
              AI Incidents Real-time
            </span>
            <span className="material-symbols-outlined text-tertiary text-[18px]">smart_toy</span>
          </div>
          <div className="my-space-xs flex items-baseline justify-between">
            <span className="font-mono text-[32px] font-bold text-tertiary">3</span>
            <span className="font-mono text-[10px] text-tertiary bg-tertiary-container/30 px-2 py-0.5 rounded font-bold">
              ATTENTION REQ.
            </span>
          </div>
          <div className="text-[12px] text-on-surface-variant truncate">
            1 Footpath · 1 Stalled Veh · 1 Med Assist
          </div>
        </div>

        {/* ANPR Violations Today */}
        <div className="bg-surface-container-low/90 backdrop-blur-xl p-space-md rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
              ANPR Violations (Today)
            </span>
            <span className="material-symbols-outlined text-error text-[18px]">document_scanner</span>
          </div>
          <div className="my-space-xs flex items-baseline justify-between">
            <span className="font-mono text-[32px] font-bold text-on-surface">142</span>
            <span className="font-mono text-[10px] text-secondary font-bold">AUTO-CITING</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-on-surface-variant">
            <span>YOLOv11 OCR Edge</span>
            <span className="text-primary font-bold">99.4% Match</span>
          </div>
        </div>

        {/* Emergency Corridors */}
        <div className="bg-surface-container-low/90 backdrop-blur-xl p-space-md rounded-xl flex flex-col justify-between shadow-sm relative overflow-hidden border border-outline-variant/30 bg-gradient-to-br from-surface-container-low via-surface-container-low to-secondary-container/10">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
              Emergency Corridors
            </span>
            <span className="material-symbols-outlined text-secondary text-[18px]">emergency</span>
          </div>
          <div className="my-space-xs">
            <div className="flex items-baseline gap-space-xs">
              <span className="font-mono text-[32px] font-bold text-secondary">1</span>
              <span className="font-mono text-[10px] text-secondary-fixed bg-secondary-container/30 px-2 py-0.5 rounded font-bold uppercase">
                ACTIVE ROUTE
              </span>
            </div>
            <div className="text-[12px] text-on-surface font-semibold truncate mt-0.5">
              Ambulance #884 · Grand Ave
            </div>
          </div>
          <div className="flex items-center gap-space-xs font-mono text-[10px] text-secondary font-medium">
            <span className="material-symbols-outlined text-[14px]">sensors</span>
            <span>Opticom Strobe Locked</span>
          </div>
        </div>
      </section>

      {/* 2. Filter & Quick Jump Mode Bar */}
      <section className="bg-surface-container-low/70 backdrop-blur-md p-space-sm rounded-xl mb-space-lg flex flex-wrap items-center justify-between gap-space-md border border-outline-variant/30 shadow-sm">
        <div className="flex flex-wrap items-center gap-space-xs">
          <span className="font-mono text-[10px] text-on-surface-variant px-1 uppercase font-semibold">
            Filter Incidents:
          </span>
          {[
            { id: 'all', label: 'All (145)' },
            { id: 'red_light', label: 'Red Light (64)' },
            { id: 'anpr', label: 'Speed ANPR (58)' },
            { id: 'footpath', label: 'Footpath Encroach (12)' },
            { id: 'crowd', label: 'Pedestrian Crowd (8)' },
            { id: 'medical', label: 'Medical Anomaly (3)', highlight: true },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1 rounded-lg font-mono text-[11px] font-medium transition-colors ${
                activeFilter === f.id
                  ? 'bg-primary/25 text-primary border border-primary/40 font-bold'
                  : f.highlight
                  ? 'bg-surface-container-high/80 text-tertiary hover:bg-surface-container-highest'
                  : 'bg-surface-container-high/80 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-on-surface-variant mr-1 font-semibold">
            QUICK JUMP:
          </span>
          {['j04', 'j05', 'j02', 'j07', 'j09'].map((j) => (
            <button
              key={j}
              onClick={() => handleInspect(j)}
              className="bg-surface-container-high text-primary hover:bg-primary hover:text-on-primary font-mono text-[11px] font-bold px-2.5 py-1 rounded border border-outline-variant/30 transition-all uppercase"
            >
              {j.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {/* 3. Core Dashboard Grid: 4 Major Intersections Fleet vs Live Incident Drawer */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">
        {/* Left 8 Columns: Multiple Intersections Fleet Grid */}
        <div className="xl:col-span-8 flex flex-col gap-space-md">
          <div className="flex items-center justify-between px-space-xs">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
              <h2 className="font-headline text-[16px] text-on-surface font-bold uppercase tracking-wide">
                Multi-Intersection Core Grid
              </h2>
            </div>
            <div className="flex items-center gap-space-sm font-mono text-[10px]">
              <span className="text-on-surface-variant">SYNC RATE: 100ms</span>
              <span className="text-secondary bg-surface-container-low px-2 py-0.5 rounded border border-secondary/30 font-bold">
                AI AUTO-CYCLE ON
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {/* CARD 1: Junction 04 (Grand Ave & 5th St) - ACTIVE FOCUS */}
            <div className="bg-surface-container-low rounded-xl p-space-md shadow-md flex flex-col justify-between relative overflow-hidden border border-primary/40 transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary"></div>
              <div>
                <div className="flex items-start justify-between mb-space-xs">
                  <div>
                    <div className="flex items-center gap-space-xs">
                      <span className="font-mono text-[11px] bg-primary/20 text-primary px-2 py-0.5 rounded font-bold border border-primary/30">
                        J-04
                      </span>
                      <span className="font-headline text-[15px] text-on-surface font-bold truncate">
                        Grand Ave & 5th St
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-on-surface-variant mt-0.5">
                      Downtown Financial Corridor
                    </div>
                  </div>
                  <span className="bg-secondary-container/20 text-secondary text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 font-bold uppercase border border-secondary/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Primary Focus
                  </span>
                </div>

                {/* Mini 4-Quadrant Preview & Signal Timer */}
                <div className="bg-surface-container-lowest/80 rounded-lg p-space-sm my-space-sm flex items-center justify-between gap-space-sm border border-outline-variant/30">
                  <div className="relative w-28 h-24 rounded bg-surface-container-high/40 overflow-hidden flex items-center justify-center border border-outline-variant/20">
                    <svg className="w-full h-full text-outline-variant/30" fill="none" viewBox="0 0 100 100">
                      <rect fill="currentColor" height="100" width="16" x="42" y="0"></rect>
                      <rect fill="currentColor" height="16" width="100" x="0" y="42"></rect>
                      <line stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" strokeWidth="2" x1="38" x2="62" y1="36" y2="36"></line>
                      <line stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" strokeWidth="2" x1="38" x2="62" y1="64" y2="64"></line>
                      <line stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" strokeWidth="2" x1="36" x2="36" y1="38" y2="62"></line>
                      <line stroke="rgba(255,255,255,0.2)" strokeDasharray="2 2" strokeWidth="2" x1="64" x2="64" y1="38" y2="62"></line>
                      {/* East-West Green Path Glow */}
                      <rect fill="#4edea3" height="8" opacity="0.45" width="100" x="0" y="46"></rect>
                      {/* Ambulance Pulse Dot */}
                      <circle className="animate-ping" cx="28" cy="50" fill="#ffb95f" r="4"></circle>
                      <circle cx="28" cy="50" fill="#ffb95f" r="3"></circle>
                    </svg>
                    <div className="absolute bottom-1 right-1 font-mono text-[8px] text-on-surface-variant bg-surface-container-lowest px-1 rounded">
                      CAM 4-ARRAY
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-1 font-mono">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant">ACTIVE SIGNAL:</span>
                      <span className="text-secondary font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span> E-W GREEN
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant">CYCLE REMAINING:</span>
                      <span className="text-primary font-bold">18s (+12s HOLD)</span>
                    </div>
                    <div className="text-[10px] text-tertiary flex items-center gap-1 pt-1 font-semibold">
                      <span className="material-symbols-outlined text-[13px]">emergency</span>
                      <span>Ambulance #884 in Transit</span>
                    </div>
                  </div>
                </div>

                {/* 4-Way Approach Status Chips */}
                <div className="grid grid-cols-2 gap-space-xs font-mono text-[10px] mt-space-xs">
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">N: 5th St</span>
                    <span className="text-secondary font-bold">Normal 42 v/m</span>
                  </div>
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">S: 5th St</span>
                    <span className="text-tertiary font-bold">Mod 68 v/m</span>
                  </div>
                  <div className="bg-error/15 p-space-xs rounded flex items-center justify-between border border-error/30">
                    <span className="text-error font-medium">E: Grand Ave</span>
                    <span className="text-error font-bold">Congest 112 v/m</span>
                  </div>
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">W: Grand Ave</span>
                    <span className="text-secondary font-bold">Normal 35 v/m</span>
                  </div>
                </div>

                {/* AI Tags */}
                <div className="flex items-center gap-space-xs mt-space-sm font-mono text-[9px] font-bold">
                  <span className="bg-secondary/15 text-secondary px-2 py-0.5 rounded border border-secondary/30">
                    Footpath: Clear
                  </span>
                  <span className="bg-tertiary/15 text-tertiary px-2 py-0.5 rounded border border-tertiary/30">
                    Preemption Active
                  </span>
                </div>
              </div>

              {/* Bottom Action CTA */}
              <div className="mt-space-md pt-space-xs">
                <button
                  onClick={() => handleInspect('j04')}
                  className="w-full bg-primary/20 hover:bg-primary/30 text-primary py-2 px-space-sm rounded-lg text-[13px] font-bold flex items-center justify-center gap-space-xs transition-colors border border-primary/30 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">videocam</span>
                  <span>Open 4-Way AI Camera View</span>
                </button>
              </div>
            </div>

            {/* CARD 2: Junction 05 (Metro Blvd & 8th St) */}
            <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:bg-surface-container-low/95 transition-all border border-outline-variant/30">
              <div>
                <div className="flex items-start justify-between mb-space-xs">
                  <div>
                    <div className="flex items-center gap-space-xs">
                      <span className="font-mono text-[11px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded font-bold border border-outline-variant/30">
                        J-05
                      </span>
                      <span className="font-headline text-[15px] text-on-surface font-bold truncate">
                        Metro Blvd & 8th St
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-on-surface-variant mt-0.5">
                      Commercial Transit Junction
                    </div>
                  </div>
                  <span className="bg-secondary-container/20 text-secondary text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 font-bold uppercase border border-secondary/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> All Clear
                  </span>
                </div>

                {/* Mini Preview Thumbnail */}
                <div className="bg-surface-container-lowest/80 rounded-lg p-space-sm my-space-sm flex items-center justify-between gap-space-sm border border-outline-variant/30">
                  <div className="relative w-28 h-24 rounded bg-surface-container-high/40 overflow-hidden flex items-center justify-center border border-outline-variant/20">
                    <svg className="w-full h-full text-outline-variant/30" fill="none" viewBox="0 0 100 100">
                      <rect fill="currentColor" height="100" width="16" x="42" y="0"></rect>
                      <rect fill="currentColor" height="16" width="100" x="0" y="42"></rect>
                      <rect fill="#4edea3" height="100" opacity="0.4" width="8" x="46" y="0"></rect>
                    </svg>
                    <div className="absolute bottom-1 right-1 font-mono text-[8px] text-on-surface-variant bg-surface-container-lowest px-1 rounded">
                      CAM 4-ARRAY
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-1 font-mono">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant">ACTIVE SIGNAL:</span>
                      <span className="text-secondary font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span> N-S GREEN
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant">CYCLE REMAINING:</span>
                      <span className="text-on-surface font-bold">24s</span>
                    </div>
                    <div className="text-[10px] text-secondary flex items-center gap-1 pt-1 font-semibold">
                      <span className="material-symbols-outlined text-[13px]">check</span>
                      <span>Smooth Progression Wave</span>
                    </div>
                  </div>
                </div>

                {/* 4-Way Approach Status Chips */}
                <div className="grid grid-cols-2 gap-space-xs font-mono text-[10px] mt-space-xs">
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">N: Metro Blvd</span>
                    <span className="text-secondary font-bold">Clear 18 v/m</span>
                  </div>
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">S: Metro Blvd</span>
                    <span className="text-secondary font-bold">Normal 28 v/m</span>
                  </div>
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">E: 8th St</span>
                    <span className="text-secondary font-bold">Normal 31 v/m</span>
                  </div>
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">W: 8th St</span>
                    <span className="text-tertiary font-bold">Heavy 54 v/m</span>
                  </div>
                </div>

                <div className="flex items-center gap-space-xs mt-space-sm font-mono text-[9px] font-bold">
                  <span className="bg-secondary/15 text-secondary px-2 py-0.5 rounded border border-secondary/30">
                    Speed Compliant 98%
                  </span>
                  <span className="bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant/30">
                    Zero Incidents
                  </span>
                </div>
              </div>

              <div className="mt-space-md pt-space-xs">
                <button
                  onClick={() => handleInspect('j05')}
                  className="w-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface py-2 px-space-sm rounded-lg text-[13px] font-semibold flex items-center justify-center gap-space-xs transition-colors border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[18px]">videocam</span>
                  <span>Inspect Junction 05</span>
                </button>
              </div>
            </div>

            {/* CARD 3: Junction 02 (Riverside & King Way) */}
            <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:bg-surface-container-low/95 transition-all border border-error/30">
              <div>
                <div className="flex items-start justify-between mb-space-xs">
                  <div>
                    <div className="flex items-center gap-space-xs">
                      <span className="font-mono text-[11px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded font-bold border border-outline-variant/30">
                        J-02
                      </span>
                      <span className="font-headline text-[15px] text-on-surface font-bold truncate">
                        Riverside & King Way
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-on-surface-variant mt-0.5">
                      Westbank Expressway Feed
                    </div>
                  </div>
                  <span className="bg-error-container/30 text-error text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 font-bold uppercase border border-error/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span> Violation Alert
                  </span>
                </div>

                <div className="bg-surface-container-lowest/80 rounded-lg p-space-sm my-space-sm flex items-center justify-between gap-space-sm border border-outline-variant/30">
                  <div className="relative w-28 h-24 rounded bg-surface-container-high/40 overflow-hidden flex items-center justify-center border border-outline-variant/20">
                    <svg className="w-full h-full text-outline-variant/30" fill="none" viewBox="0 0 100 100">
                      <rect fill="currentColor" height="100" width="16" x="42" y="0"></rect>
                      <rect fill="currentColor" height="16" width="100" x="0" y="42"></rect>
                      <circle cx="50" cy="50" fill="#93000a" opacity="0.35" r="10"></circle>
                      <path d="M70 46 L30 46" stroke="#ffb4ab" strokeDasharray="3 3" strokeWidth="2"></path>
                      <circle cx="35" cy="46" fill="#ffb4ab" r="3"></circle>
                    </svg>
                    <div className="absolute bottom-1 right-1 font-mono text-[8px] text-on-surface-variant bg-surface-container-lowest px-1 rounded">
                      CAM 4-ARRAY
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-1 font-mono">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant">ACTIVE SIGNAL:</span>
                      <span className="text-error font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-error"></span> E-W RED
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant">RED DURATION:</span>
                      <span className="text-error font-bold">08s remaining</span>
                    </div>
                    <div className="text-[10px] text-error flex items-center gap-1 pt-1 font-bold">
                      <span className="material-symbols-outlined text-[13px]">warning</span>
                      <span>Wrong-Way Bike Flag</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-space-xs font-mono text-[10px] mt-space-xs">
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">N: King Way</span>
                    <span className="text-secondary font-bold">Normal 30 v/m</span>
                  </div>
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">S: King Way</span>
                    <span className="text-secondary font-bold">Normal 33 v/m</span>
                  </div>
                  <div className="bg-error/15 p-space-xs rounded flex items-center justify-between border border-error/30">
                    <span className="text-error font-medium">E: Riverside</span>
                    <span className="text-error font-bold">Wrong-Way Flag</span>
                  </div>
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">W: Riverside</span>
                    <span className="text-secondary font-bold">Normal 22 v/m</span>
                  </div>
                </div>

                <div className="flex items-center gap-space-xs mt-space-sm font-mono text-[9px] font-bold">
                  <span className="bg-error/15 text-error px-2 py-0.5 rounded border border-error/30">
                    ANPR Logged: MH-02-EE-4921
                  </span>
                </div>
              </div>

              <div className="mt-space-md pt-space-xs">
                <button
                  onClick={() => handleInspect('j02')}
                  className="w-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface py-2 px-space-sm rounded-lg text-[13px] font-semibold flex items-center justify-center gap-space-xs transition-colors border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[18px]">videocam</span>
                  <span>Inspect Junction 02</span>
                </button>
              </div>
            </div>

            {/* CARD 4: Junction 07 (Central Square Cross) */}
            <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm flex flex-col justify-between hover:bg-surface-container-low/95 transition-all border border-tertiary/30">
              <div>
                <div className="flex items-start justify-between mb-space-xs">
                  <div>
                    <div className="flex items-center gap-space-xs">
                      <span className="font-mono text-[11px] bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded font-bold border border-outline-variant/30">
                        J-07
                      </span>
                      <span className="font-headline text-[15px] text-on-surface font-bold truncate">
                        Central Square Cross
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-on-surface-variant mt-0.5">
                      High Pedestrian Activity Hub
                    </div>
                  </div>
                  <span className="bg-tertiary-container/30 text-tertiary text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 font-bold uppercase border border-tertiary/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span> Crowd Spike
                  </span>
                </div>

                <div className="bg-surface-container-lowest/80 rounded-lg p-space-sm my-space-sm flex items-center justify-between gap-space-sm border border-outline-variant/30">
                  <div className="relative w-28 h-24 rounded bg-surface-container-high/40 overflow-hidden flex items-center justify-center border border-outline-variant/20">
                    <svg className="w-full h-full text-outline-variant/30" fill="none" viewBox="0 0 100 100">
                      <rect fill="currentColor" height="100" width="16" x="42" y="0"></rect>
                      <rect fill="currentColor" height="16" width="100" x="0" y="42"></rect>
                      <line stroke="#ffb95f" strokeDasharray="2 2" strokeWidth="2" x1="30" x2="70" y1="30" y2="70"></line>
                      <line stroke="#ffb95f" strokeDasharray="2 2" strokeWidth="2" x1="70" x2="30" y1="30" y2="70"></line>
                      <circle cx="28" cy="28" fill="#ffb95f" opacity="0.3" r="7"></circle>
                      <circle cx="72" cy="72" fill="#ffb95f" opacity="0.3" r="8"></circle>
                    </svg>
                    <div className="absolute bottom-1 right-1 font-mono text-[8px] text-on-surface-variant bg-surface-container-lowest px-1 rounded">
                      CAM 4-ARRAY
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-1 font-mono">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant">ACTIVE SIGNAL:</span>
                      <span className="text-tertiary font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-tertiary"></span> PED SCRAMBLE
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant">WALK WINDOW:</span>
                      <span className="text-on-surface font-bold">14s left</span>
                    </div>
                    <div className="text-[10px] text-tertiary flex items-center gap-1 pt-1 font-bold">
                      <span className="material-symbols-outlined text-[13px]">groups</span>
                      <span>48 Pedestrians in Crosswalk</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-space-xs font-mono text-[10px] mt-space-xs">
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">N: Square Mall</span>
                    <span className="text-tertiary font-bold">Footpath Congest</span>
                  </div>
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">S: Subway Ext</span>
                    <span className="text-secondary font-bold">Normal 18 v/m</span>
                  </div>
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">E: Broadway</span>
                    <span className="text-secondary font-bold">Normal 26 v/m</span>
                  </div>
                  <div className="bg-surface-container-high/60 p-space-xs rounded flex items-center justify-between border border-outline-variant/20">
                    <span className="text-on-surface-variant font-medium">W: Broadway</span>
                    <span className="text-secondary font-bold">Normal 21 v/m</span>
                  </div>
                </div>

                <div className="flex items-center gap-space-xs mt-space-sm font-mono text-[9px] font-bold">
                  <span className="bg-tertiary/15 text-tertiary px-2 py-0.5 rounded border border-tertiary/30">
                    Extended Pedestrian Phase Active
                  </span>
                </div>
              </div>

              <div className="mt-space-md pt-space-xs">
                <button
                  onClick={() => handleInspect('j07')}
                  className="w-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface py-2 px-space-sm rounded-lg text-[13px] font-semibold flex items-center justify-center gap-space-xs transition-colors border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[18px]">videocam</span>
                  <span>Inspect Junction 07</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Snapshot Aerial Arterial Progress Bar */}
          <div className="bg-surface-container-low/80 rounded-xl p-space-md shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-md border border-outline-variant/30">
            <div className="flex items-center gap-space-md">
              <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center flex-shrink-0 border border-outline-variant/30">
                <span className="material-symbols-outlined text-primary text-[24px]">satellite_alt</span>
              </div>
              <div>
                <div className="font-headline text-[14px] text-on-surface font-bold">
                  City Arterial Synchronization Status
                </div>
                <div className="text-[12px] text-on-surface-variant">
                  Green Corridor progression running dynamically on Route 101 to Regional Trauma Center.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-space-xs self-stretch md:self-auto justify-end">
              <button
                onClick={() => handleActionClick('ems')}
                className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-space-md py-1.5 rounded-lg text-[12px] font-mono font-medium transition-colors border border-outline-variant/30"
              >
                Corridor Override
              </button>
              <button
                onClick={() => onSwitchView('4-way-ai-perception')}
                className="bg-primary/20 hover:bg-primary/30 text-primary px-space-md py-1.5 rounded-lg text-[12px] font-mono font-bold transition-colors border border-primary/30"
              >
                All 4-Cam Perceptions
              </button>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Live Incident Feed & Quick Operations Console */}
        <div className="xl:col-span-4 flex flex-col gap-space-md">
          {/* Live Incident Drawer */}
          <div className="bg-surface-container-low rounded-xl p-space-md shadow-md flex-1 flex flex-col justify-between border border-outline-variant/30">
            <div>
              <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-outline-variant/20">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-secondary text-[20px]">notifications_active</span>
                  <h3 className="font-headline text-[15px] text-on-surface font-bold uppercase tracking-wide">
                    Live Incident Feed
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-secondary bg-secondary-container/20 px-2 py-0.5 rounded font-bold border border-secondary/30">
                  REAL-TIME
                </span>
              </div>

              {/* Alert Item List */}
              <div className="space-y-space-sm">
                {/* Alert 1: Emergency Corridor (Ambulance) */}
                <div className="bg-surface-container-high/60 hover:bg-surface-container-high p-space-sm rounded-lg transition-colors flex gap-space-sm relative overflow-hidden group border border-outline-variant/20">
                  <div className="w-1 bg-secondary absolute left-0 top-0 bottom-0"></div>
                  <div className="w-7 h-7 rounded-lg bg-secondary-container/30 text-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[16px]">ambulance</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-secondary font-bold">
                        JUNCTION 04 · AMBULANCE PREEMPTION
                      </span>
                      <span className="font-mono text-[10px] text-on-surface-variant">10:48:12</span>
                    </div>
                    <div className="text-[12px] text-on-surface mt-0.5 leading-snug">
                      Ambulance detected on East approach. Corridor green phase extended{' '}
                      <strong className="text-secondary">+12s</strong>.
                    </div>
                    <div className="flex items-center gap-space-xs mt-1 font-mono text-[9px] text-on-surface-variant">
                      <span className="text-secondary font-bold">● Optical GPS Lock</span>
                      <span>· Delay Saved: 44s</span>
                    </div>
                  </div>
                </div>

                {/* Alert 2: ANPR Red Light */}
                <div className="bg-surface-container-high/60 hover:bg-surface-container-high p-space-sm rounded-lg transition-colors flex gap-space-sm relative overflow-hidden group border border-outline-variant/20">
                  <div className="w-1 bg-error absolute left-0 top-0 bottom-0"></div>
                  <div className="w-7 h-7 rounded-lg bg-error-container/30 text-error flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-error font-bold">
                        JUNCTION 02 · RED LIGHT JUMP
                      </span>
                      <span className="font-mono text-[10px] text-on-surface-variant">10:47:33</span>
                    </div>
                    <div className="text-[12px] text-on-surface mt-0.5 leading-snug">
                      Plate{' '}
                      <span className="text-primary font-mono font-bold bg-surface-container-lowest px-1 rounded border border-primary/30">
                        MH-02-EE-4921
                      </span>{' '}
                      crossed stop line 2.8s after red.
                    </div>
                    <div className="flex items-center justify-between mt-1 font-mono text-[9px] text-on-surface-variant">
                      <span>Evidence cropped & cited</span>
                      <button
                        onClick={() => onSwitchView('violations-anpr-capture')}
                        className="text-primary hover:underline font-bold"
                      >
                        Review Clip →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Alert 3: Footpath Crowd Spike */}
                <div className="bg-surface-container-high/60 hover:bg-surface-container-high p-space-sm rounded-lg transition-colors flex gap-space-sm relative overflow-hidden group border border-outline-variant/20">
                  <div className="w-1 bg-tertiary absolute left-0 top-0 bottom-0"></div>
                  <div className="w-7 h-7 rounded-lg bg-tertiary-container/30 text-tertiary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[16px]">groups</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-tertiary font-bold">
                        JUNCTION 07 · FOOTPATH SAFETY
                      </span>
                      <span className="font-mono text-[10px] text-on-surface-variant">10:45:01</span>
                    </div>
                    <div className="text-[12px] text-on-surface mt-0.5 leading-snug">
                      Dense crowd surge (&gt;45 persons) encroaching into roadside safety corridor on North footpath.
                    </div>
                    <div className="flex items-center justify-between mt-1 font-mono text-[9px] text-on-surface-variant">
                      <span className="text-tertiary font-bold">Pedestrian Scramble active</span>
                      <button
                        onClick={() => handleInspect('j07')}
                        className="text-primary hover:underline font-bold"
                      >
                        Live View →
                      </button>
                    </div>
                  </div>
                </div>

                {/* Alert 4: Medical Anomaly */}
                <div className="bg-surface-container-high/60 hover:bg-surface-container-high p-space-sm rounded-lg transition-colors flex gap-space-sm relative overflow-hidden group border border-outline-variant/20">
                  <div className="w-1 bg-primary absolute left-0 top-0 bottom-0"></div>
                  <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[16px]">health_and_safety</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-primary font-bold">
                        JUNCTION 04 · MEDICAL ANOMALY
                      </span>
                      <span className="font-mono text-[10px] text-on-surface-variant">10:42:19</span>
                    </div>
                    <div className="text-[12px] text-on-surface mt-0.5 leading-snug">
                      Person fallen/stationary on West Plaza for &gt;120s. Pose model flag confirmed by Station 01.
                    </div>
                    <div className="flex items-center justify-between mt-1 font-mono text-[9px] text-on-surface-variant">
                      <span className="text-secondary font-bold">Foot patrol dispatched</span>
                      <span className="text-secondary font-bold">Assisted</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Audit Snapshot */}
            <div className="mt-space-md pt-space-sm bg-surface-container-high/40 p-space-sm rounded-lg border border-outline-variant/20">
              <div className="flex items-center justify-between text-on-surface-variant font-mono text-[10px] mb-1">
                <span>EDGE INFERENCE LOAD</span>
                <span className="text-secondary font-bold">60 FPS · 8.4ms Latency</span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                <div className="bg-secondary h-full w-[84%] shadow-[0_0_6px_rgba(78,222,163,0.4)]"></div>
              </div>
              <div className="flex items-center justify-between font-mono text-[9px] text-on-surface-variant mt-2">
                <span>Logged to Municipal Ledger</span>
                <span className="text-primary font-bold">Block #889214</span>
              </div>
            </div>
          </div>

          {/* Quick Operator Controls Console */}
          <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm border border-outline-variant/30">
            <div className="flex items-center justify-between mb-space-xs">
              <span className="font-headline text-[14px] text-on-surface font-bold">
                City Operations Console
              </span>
              <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
            </div>
            <div className="text-[12px] text-on-surface-variant mb-space-sm">
              Execute instantaneous corridor-wide commands or switch monitoring regimes.
            </div>
            <div className="grid grid-cols-2 gap-space-xs font-mono text-[11px]">
              <button
                onClick={() => handleActionClick('all_red')}
                className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface p-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-outline-variant/20 font-bold"
              >
                <span className="material-symbols-outlined text-[16px] text-tertiary">traffic</span>
                <span>All Red Flush</span>
              </button>
              <button
                onClick={() => handleActionClick('sync')}
                className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface p-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-outline-variant/20 font-bold"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">flash_on</span>
                <span>Sync Offsets</span>
              </button>
              <button
                onClick={() => handleActionClick('export')}
                className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface p-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-outline-variant/20 font-bold"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">download</span>
                <span>Export ANPR Log</span>
              </button>
              <button
                onClick={() => handleActionClick('ems')}
                className="bg-primary/20 hover:bg-primary/30 text-primary p-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-primary/30 font-bold shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">emergency_share</span>
                <span>EMS Override</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
