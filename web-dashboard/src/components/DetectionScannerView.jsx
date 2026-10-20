import React, { useState, useEffect, useRef } from 'react';

export default function DetectionScannerView({
  activeTargets = [],
  audioSiren = {},
}) {
  const canvasRef = useRef(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [filterClass, setFilterClass] = useState('all');
  const [polledTargets, setPolledTargets] = useState([]);
  const liveTargets = (activeTargets && activeTargets.length > 0) ? activeTargets : polledTargets;

  // Poll fallback if activeTargets is empty
  useEffect(() => {
    if (activeTargets && activeTargets.length > 0) return;
    let isMounted = true;
    const fetchTargets = async () => {
      try {
        const res = await fetch('/api/detections');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.detections) {
            setPolledTargets(
              data.detections.map((d, idx) => ({
                id: d.id || idx + 1,
                label: d.label_raw || d.label,
                lane: d.lane || 'North',
                confidence: d.confidence || 0.88,
                is_ambulance: d.is_ambulance || false,
                dist_to_stopline_m: 12.0 + (idx % 5) * 4.2,
                speed_kmh: Math.round(28 + (idx % 4) * 6),
              }))
            );
          }
        }
      } catch (err) {
        console.debug('Failed to fetch fallback detections', err);
      }
    };
    fetchTargets();
    const interval = setInterval(fetchTargets, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeTargets]);

  // 360° Tactical Radar Sweeper
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let angle = 0;

    const renderRadar = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(cx, cy) - 12;

      ctx.clearRect(0, 0, w, h);

      // Deep dark space background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      // Range Rings (10m, 20m, 30m, 40m)
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75, 1.0].forEach((factor) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r * factor, 0, 2 * Math.PI);
        ctx.stroke();
      });

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy + r);
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.stroke();

      // Cardinal Labels (N, S, E, W)
      ctx.fillStyle = 'rgba(59, 130, 246, 0.85)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('N (NORTH)', cx, cy - r + 14);
      ctx.fillText('S (SOUTH)', cx, cy + r - 6);
      ctx.textAlign = 'left';
      ctx.fillText('E (EAST 4K)', cx + r - 60, cy - 4);
      ctx.textAlign = 'right';
      ctx.fillText('W (WEST)', cx - r + 50, cy - 4);

      // Sweeping Radar Line with Gradient Trail
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.45)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, 0, -Math.PI / 4, true);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r, 0);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Render Targets on Radar
      liveTargets.forEach((t, idx) => {
        let bx = cx;
        let by = cy;

        const lane = t.lane || 'North';
        const distM = t.dist_to_stopline_m || 15.0;
        const normalizedDist = Math.min(0.92, Math.max(0.15, distM / 35.0));
        const radialDist = r * normalizedDist;
        const lateralOffset = ((idx % 3) - 1) * 16;

        if (lane === 'North') {
          bx = cx + lateralOffset;
          by = cy - radialDist;
        } else if (lane === 'South') {
          bx = cx + lateralOffset;
          by = cy + radialDist;
        } else if (lane === 'East') {
          bx = cx + radialDist;
          by = cy + lateralOffset;
        } else {
          bx = cx - radialDist;
          by = cy + lateralOffset;
        }

        // Color by target type
        let blipColor = '#3b82f6';
        let blipRadius = 4;

        if (t.is_ambulance) {
          blipColor = '#ef4444';
          blipRadius = 6;
          // Pulse halo for ambulance
          ctx.beginPath();
          ctx.arc(bx, by, blipRadius + Math.sin(angle * 4) * 3 + 3, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (t.label === 'truck' || t.label === 'bus') {
          blipColor = '#8b5cf6';
          blipRadius = 5;
        } else if (t.label === 'motorcycle' || t.label === 'bicycle') {
          blipColor = '#f59e0b';
          blipRadius = 3.5;
        } else if (t.label === 'person') {
          blipColor = '#10b981';
          blipRadius = 3;
        }

        // Selection ring
        if (selectedTarget && selectedTarget.id === t.id) {
          ctx.beginPath();
          ctx.arc(bx, by, blipRadius + 5, 0, 2 * Math.PI);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(bx, by, blipRadius, 0, 2 * Math.PI);
        ctx.fillStyle = blipColor;
        ctx.fill();

        // Label text
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText(`#${t.id}`, bx + 7, by + 3);
      });

      angle += 0.035;
      animId = requestAnimationFrame(renderRadar);
    };

    renderRadar();
    return () => cancelAnimationFrame(animId);
  }, [liveTargets, selectedTarget]);

  const filtered = liveTargets.filter((t) => {
    if (filterClass === 'all') return true;
    if (filterClass === 'ambulance') return t.is_ambulance || t.label === 'ambulance';
    if (filterClass === 'car') return t.label === 'car';
    if (filterClass === 'two-wheeler') return ['motorcycle', 'bicycle'].includes(t.label);
    if (filterClass === 'heavy') return ['bus', 'truck'].includes(t.label);
    if (filterClass === 'person') return ['person', 'pedestrian'].includes(t.label);
    return t.label === filterClass;
  });

  return (
    <div className="flex flex-col w-full gap-5 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <section className="bg-surface-container-low/90 backdrop-blur-md rounded-2xl p-5 border border-outline-variant/30 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-lg">radar</span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant">
              Kinematics & Spatial Radar
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
            Detection Matrix & 360° Radar
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Centroid tracking, headway distances, velocity vectors, and emergency beacon discrimination.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant/30 font-mono text-xs text-primary font-bold">
            TARGETS: {liveTargets.length}
          </div>
          <div className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold ${
            audioSiren?.siren_active
              ? 'bg-error-container/20 text-error border-error/40 animate-pulse'
              : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
          }`}>
            ACOUSTIC FFT: {audioSiren?.siren_active ? 'SIREN LOCK (960 Hz)' : 'LISTENING'}
          </div>
        </div>
      </section>

      {/* 2. Filter Bar */}
      <section className="flex items-center gap-2 flex-wrap bg-surface-container-low/60 p-3 rounded-xl border border-outline-variant/30">
        <span className="text-xs font-semibold text-on-surface-variant mr-2 uppercase tracking-wider font-mono">
          Filter:
        </span>
        {[
          { id: 'all', label: `All Targets (${liveTargets.length})` },
          { id: 'ambulance', label: '🚑 Ambulances' },
          { id: 'car', label: '🚗 Cars' },
          { id: 'two-wheeler', label: '🏍️ Two-Wheelers' },
          { id: 'heavy', label: '🚌 Buses & Trucks' },
          { id: 'person', label: '🚶 Pedestrians' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilterClass(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterClass === f.id
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
            }`}
          >
            {f.label}
          </button>
        ))}
      </section>

      {/* 3. Main Split View: 360° Radar (Left) + 7-Column Matrix Table (Right) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 5 Cols: Tactical Radar */}
        <div className="lg:col-span-5 bg-surface-container-low/80 rounded-2xl p-4 border border-outline-variant/30 shadow-md flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-3 text-xs font-mono text-on-surface-variant">
            <span className="font-bold text-on-surface uppercase">360° Spatial Radar</span>
            <span className="text-secondary font-bold">● ACTIVE SWEEP</span>
          </div>

          <div className="relative w-full max-w-[340px] aspect-square rounded-full overflow-hidden border border-outline-variant/40 shadow-inner flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              className="w-full h-full block"
            />
          </div>

          <div className="mt-4 flex items-center gap-4 text-[11px] font-mono text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Car
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span> Heavy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> 2-Wheel
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Ambulance
            </span>
          </div>
        </div>

        {/* Right 7 Cols: 7-Column Matrix Table */}
        <div className="lg:col-span-7 bg-surface-container-low/80 rounded-2xl p-4 border border-outline-variant/30 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold font-mono text-on-surface uppercase tracking-wider">
                7-Column Optical Detection Matrix
              </span>
              <span className="text-[11px] font-mono text-on-surface-variant">
                Showing {filtered.length} targets
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-on-surface-variant uppercase text-[10px]">
                    <th className="pb-2 font-semibold">ID</th>
                    <th className="pb-2 font-semibold">Class</th>
                    <th className="pb-2 font-semibold">Lane</th>
                    <th className="pb-2 font-semibold">Dist (m)</th>
                    <th className="pb-2 font-semibold">Speed</th>
                    <th className="pb-2 font-semibold">Beacon</th>
                    <th className="pb-2 font-semibold text-right">Conf</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-on-surface-variant">
                        No targets matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((t) => {
                      const isAmb = t.is_ambulance;
                      const isSel = selectedTarget && selectedTarget.id === t.id;
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTarget(t)}
                          className={`hover:bg-surface-container cursor-pointer transition-colors ${
                            isSel ? 'bg-primary/10' : ''
                          }`}
                        >
                          <td className="py-2.5 font-bold text-on-surface">#{t.id}</td>
                          <td className="py-2.5 capitalize font-medium text-on-surface">
                            {t.label}
                          </td>
                          <td className="py-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px] border border-outline-variant/20">
                              {t.lane}
                            </span>
                          </td>
                          <td className="py-2.5 text-on-surface-variant">
                            {(t.dist_to_stopline_m || 15).toFixed(1)}m
                          </td>
                          <td className="py-2.5 text-on-surface-variant">
                            {t.speed_kmh || 32} km/h
                          </td>
                          <td className="py-2.5">
                            {isAmb ? (
                              <span className="px-1.5 py-0.5 rounded bg-error/20 text-error font-bold text-[10px] border border-error/40 animate-pulse">
                                🚑 PRIORITY
                              </span>
                            ) : (
                              <span className="text-on-surface-variant text-[10px]">NORMAL</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right font-bold text-secondary">
                            {((t.confidence || 0.88) * 100).toFixed(0)}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedTarget && (
            <div className="mt-4 p-3 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-between text-xs">
              <span className="font-mono text-on-surface">
                Selected: <strong>#{selectedTarget.id} ({selectedTarget.label})</strong> on {selectedTarget.lane} approach
              </span>
              <button
                onClick={() => setSelectedTarget(null)}
                className="text-primary hover:underline font-mono text-[11px]"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
