import React, { useState } from 'react';

export default function FourWayPerceptionView({
  onSwitchView,
  signals = {},
  emergencyActive = false,
}) {
  const [streamTs, setStreamTs] = useState(() => Date.now());
  const [isPaused, setIsPaused] = useState(false);

  const currentLane = signals.current_lane || 'North';
  const currentState = signals.current_state || 'green';
  const timeLeft = Math.max(0, Math.round(signals.time_left || 15));

  const approaches = [
    { name: 'North', label: 'Q1 · North Camera', desc: 'Standard HD traffic monitoring' },
    { name: 'South', label: 'Q2 · South Camera', desc: 'Standard HD traffic monitoring' },
    { name: 'East',  label: 'Q3 · East Camera (4K Video)', desc: 'High-resolution custom 4K feed', isCustom4K: true },
    { name: 'West',  label: 'Q4 · West Camera', desc: 'Standard HD traffic monitoring' },
  ];

  return (
    <div className="flex flex-col w-full gap-5 max-w-7xl mx-auto pb-12">
      {/* 1. Header with clear signal status */}
      <section className="bg-surface-container-low/90 backdrop-blur-md rounded-2xl p-5 border border-outline-variant/30 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse"></span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface-variant">
              Live Multi-Camera Perception
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
            4-Way Intersection Real-Time Feeds
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Synchronized 4-camera composite stream with YOLOv8 optical inference overlay.
          </p>
        </div>

        {/* Current Light Badge & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {emergencyActive && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-error/20 border border-error/40 text-error animate-pulse text-xs font-bold">
              <span>🚑</span>
              <span>EMERGENCY CORRIDOR</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/30">
            <span className={`w-2.5 h-2.5 rounded-full ${currentState === 'red' ? 'bg-error' : currentState === 'yellow' ? 'bg-amber-400' : 'bg-secondary animate-pulse'}`}></span>
            <span className="text-xs font-semibold text-on-surface">
              {currentState.toUpperCase()}: <strong className="text-secondary">{currentLane}</strong> ({timeLeft}s)
            </span>
          </div>

          <button
            onClick={() => setStreamTs(Date.now())}
            className="px-3.5 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Reload live stream"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-surface-container text-on-surface border-outline-variant/30 hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isPaused ? 'play_arrow' : 'pause'}
            </span>
            <span>{isPaused ? 'Resume' : 'Freeze'}</span>
          </button>

          <button
            onClick={() => onSwitchView && onSwitchView('detection-scanner')}
            className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">radar</span>
            <span>Target Scanner</span>
          </button>
        </div>
      </section>

      {/* 2. Main Live Video Section (Clean and Large) */}
      <section className="bg-surface-container-low/80 rounded-2xl overflow-hidden border border-outline-variant/30 shadow-xl">
        <div className="p-3 bg-surface-container-lowest/80 border-b border-outline-variant/20 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="text-secondary font-bold">● LIVE</span>
            <span>1280 × 720 Composite Stream (North, South, East, West)</span>
          </div>
          <span className="text-on-surface-variant hidden sm:inline">
            Status: <strong className="text-secondary">{isPaused ? 'FROZEN' : 'STREAMING'}</strong>
          </span>
        </div>

        <div className="relative w-full bg-black flex items-center justify-center min-h-[380px] max-h-[680px]">
          <img
            src={isPaused ? `/api/frame?t=${streamTs}` : `/api/stream?t=${streamTs}`}
            alt="Live 4-Way Traffic Camera Feed"
            className="w-full h-auto max-h-[680px] object-contain"
            onError={(e) => {
              e.target.src = `/api/frame?t=${Date.now()}`;
            }}
          />

          {/* Quadrant Overlays */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-xs font-mono font-bold text-white border border-white/20">
            NORTH APPROACH
          </div>
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-xs font-mono font-bold text-white border border-white/20">
            SOUTH APPROACH
          </div>
          <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-xs font-mono font-bold text-secondary border border-secondary/50 flex items-center gap-1.5 shadow-lg">
            <span>EAST APPROACH</span>
            <span className="text-[10px] bg-secondary/30 text-secondary px-1.5 py-0.2 rounded font-bold border border-secondary/40">
              4K VIDEO
            </span>
          </div>
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-xs font-mono font-bold text-white border border-white/20">
            WEST APPROACH
          </div>
        </div>
      </section>

      {/* 3. Quadrant Camera Status Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {approaches.map((appr) => {
          const isGreen = currentLane === appr.name;
          return (
            <div
              key={appr.name}
              className={`p-4 rounded-xl border transition-all ${
                isGreen
                  ? 'bg-secondary-container/10 border-secondary/50 shadow-sm'
                  : 'bg-surface-container-low/70 border-outline-variant/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-on-surface text-sm">
                  {appr.name} Camera
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    isGreen
                      ? 'bg-secondary/20 text-secondary border border-secondary/30'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {isGreen ? 'GREEN LIGHT' : 'RED LIGHT'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                {appr.desc}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
