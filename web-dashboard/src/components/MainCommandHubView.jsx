import React from 'react';

export default function MainCommandHubView({
  onSelectIntersection,
  onSwitchView,
  metrics,
  signals,
  emergencyActive,
}) {
  const handleInspect = (junctionId) => {
    if (onSelectIntersection) onSelectIntersection(junctionId);
    if (onSwitchView) onSwitchView('4-way-ai-perception');
  };

  const junctions = [
    { id: 'j04', name: 'Grand Ave & 5th St', status: 'Normal', congestion: '32%', alert: emergencyActive },
    { id: 'j05', name: 'Metro Blvd & 8th St', status: 'Heavy Flow', congestion: '78%', alert: false },
    { id: 'j02', name: 'Riverside & King Way', status: 'Moderate', congestion: '45%', alert: false },
    { id: 'j07', name: 'Central Square Cross', status: 'Light', congestion: '12%', alert: false },
  ];

  return (
    <div className="flex flex-col w-full pb-space-xl gap-space-lg">
      
      {/* 1. Global System Telemetry Header */}
      <section className="bg-surface-container-low/70 backdrop-blur-2xl rounded-2xl p-space-md border border-white/5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md transition-all">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse shadow-glow-success"></span>
            <span className="font-mono text-[11px] text-secondary font-bold uppercase tracking-widest">
              System Online
            </span>
          </div>
          <h2 className="font-headline text-[22px] text-on-surface font-bold tracking-tight">
            City-Wide AI Traffic Command
          </h2>
          <p className="text-[13px] text-on-surface-variant mt-1 max-w-lg leading-relaxed">
            Real-time multi-junction perception engine actively monitoring traffic flow, pedestrians, and prioritizing emergency corridors.
          </p>
        </div>

        <div className="flex gap-space-sm w-full md:w-auto">
          <div className="bg-surface-container/50 border border-white/5 p-3 rounded-xl flex flex-col min-w-[120px] shadow-inner flex-1 md:flex-auto">
            <span className="text-[10px] uppercase font-mono text-on-surface-variant font-bold mb-1">Total Vehicles</span>
            <span className="text-[24px] font-headline font-black text-on-surface">1,492</span>
            <span className="text-[9px] text-secondary font-mono">+12% vs last hour</span>
          </div>
          <div className="bg-surface-container/50 border border-white/5 p-3 rounded-xl flex flex-col min-w-[120px] shadow-inner flex-1 md:flex-auto">
            <span className="text-[10px] uppercase font-mono text-on-surface-variant font-bold mb-1">Avg AI Latency</span>
            <span className="text-[24px] font-headline font-black text-on-surface">8.4<span className="text-[14px] text-on-surface-variant">ms</span></span>
            <span className="text-[9px] text-primary font-mono">TensorRT Enabled</span>
          </div>
        </div>
      </section>

      {/* 2. Active Intersections Grid */}
      <section className="flex flex-col gap-space-md">
        <div className="flex items-center gap-space-xs px-2">
          <span className="material-symbols-outlined text-primary text-[22px]">device_hub</span>
          <h3 className="font-headline text-[16px] text-on-surface font-bold uppercase tracking-wider">
            Connected Intersections
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {junctions.map((j) => (
            <div key={j.id} className="group bg-surface-container-low/60 backdrop-blur-xl rounded-2xl p-space-md shadow-lg hover:shadow-xl hover:bg-surface-container/80 border border-white/5 hover:border-primary/30 transition-all duration-300 flex flex-col justify-between h-[200px]">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] bg-primary/10 text-primary px-2 py-1 rounded-md font-bold border border-primary/20 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      {j.id.toUpperCase()}
                    </span>
                  </div>
                  {j.alert && (
                    <span className="bg-error/15 text-error text-[9px] font-mono px-2 py-1 rounded font-bold uppercase border border-error/30 animate-pulse shadow-glow">
                      Emergency
                    </span>
                  )}
                </div>
                
                <h4 className="font-headline text-[15px] text-on-surface font-bold truncate leading-tight mb-1">
                  {j.name}
                </h4>
                
                <div className="flex items-center gap-2 mt-4">
                  <div className="flex-1 bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${parseInt(j.congestion) > 70 ? 'bg-error' : parseInt(j.congestion) > 40 ? 'bg-tertiary' : 'bg-secondary'}`} 
                      style={{ width: j.congestion }}
                    ></div>
                  </div>
                  <span className="font-mono text-[10px] text-on-surface-variant font-bold w-8 text-right">
                    {j.congestion}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleInspect(j.id)}
                className="w-full bg-surface-container/50 hover:bg-primary/20 text-on-surface hover:text-primary py-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all border border-white/5 hover:border-primary/30 group-hover:shadow-glow mt-4"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
                <span>Enter AI View</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 3. System Alerts & Quick Logs */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-space-md mt-2">
        <div className="bg-surface-container-low/60 backdrop-blur-xl rounded-2xl p-space-md border border-white/5 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-tertiary text-[20px]">notifications_active</span>
            <h3 className="font-headline text-[14px] text-on-surface font-bold uppercase tracking-wider">
              Recent System Events
            </h3>
          </div>
          <div className="flex flex-col gap-3 font-mono text-[11px]">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-error/5 border border-error/10">
              <span className="text-error font-bold w-12 shrink-0">10:42a</span>
              <span className="text-on-surface flex-1">Ambulance detected at J-04. Preemption activated.</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-tertiary/5 border border-tertiary/10">
              <span className="text-tertiary font-bold w-12 shrink-0">10:38a</span>
              <span className="text-on-surface flex-1">Queue spillover at J-05 North. Cycle time adjusted +12s.</span>
            </div>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/5 border border-secondary/10">
              <span className="text-secondary font-bold w-12 shrink-0">10:15a</span>
              <span className="text-on-surface flex-1">Daily system diagnostic passed. All nodes 100%.</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low/60 backdrop-blur-xl rounded-2xl p-space-md border border-white/5 shadow-lg flex items-center justify-center text-center">
          <div className="flex flex-col items-center opacity-60">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-2">auto_graph</span>
            <span className="font-headline text-[14px] text-on-surface font-bold">Traffic Analytics Engine</span>
            <span className="font-mono text-[11px] text-on-surface-variant mt-1">Collecting peak-hour baseline data...</span>
          </div>
        </div>
      </section>

    </div>
  );
}
