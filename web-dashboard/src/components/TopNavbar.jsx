import React, { useState, useEffect } from 'react';

const VIEW_TITLES = {
  'main-command-hub': { title: 'Main Command Hub', subtitle: '4-Way Intersection Overview', icon: 'dashboard', tag: 'OVERVIEW' },
  'dashboard': { title: 'Main Command Hub', subtitle: '4-Way Intersection Overview', icon: 'dashboard', tag: 'OVERVIEW' },
  '4-way-ai-perception': { title: '4-Way AI Perception', subtitle: 'Live Multi-Camera Stream', icon: 'grid_view', tag: '4-CAM AI' },
  'detection-scanner': { title: 'Detection Matrix & Radar', subtitle: '360° Tactical Radar & Target Matrix', icon: 'radar', tag: 'AI RADAR' },
  'incidents': { title: 'Incident Feed', subtitle: 'Safety Anomalies & Emergency Events', icon: 'warning', tag: 'INCIDENTS' },
};

export default function TopNavbar({
  emergencyActive,
  onToggleSidebar,
  sidebarCollapsed = false,
  currentView = 'main-command-hub',
  isConnected = false,
  uptime = '',
}) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentViewInfo = VIEW_TITLES[currentView] || {
    title: 'Main Command Hub',
    subtitle: 'Traffic Operations',
    icon: 'traffic',
    tag: 'SYSTEM',
  };

  return (
    <header
      className={`fixed top-0 left-0 ${
        sidebarCollapsed ? 'lg:left-16' : 'lg:left-64'
      } right-0 h-16 bg-surface-dim/95 backdrop-blur-md z-40 flex items-center justify-between px-4 sm:px-6 border-b border-outline-variant/30 shadow-md transition-all duration-300`}
    >
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
          title="Open Menu"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <div className="flex items-center gap-2.5 truncate">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[20px]">
              {currentViewInfo.icon}
            </span>
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-on-surface tracking-tight truncate">
                {currentViewInfo.title}
              </span>
              <span className="hidden sm:inline-block font-mono text-[9px] px-1.5 py-0.5 rounded font-bold bg-primary/20 text-primary border border-primary/30">
                {currentViewInfo.tag}
              </span>
            </div>
            <span className="hidden md:block text-[11px] text-on-surface-variant truncate">
              {currentViewInfo.subtitle}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions, Emergency & Clock */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {emergencyActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container/30 text-error border border-error/50 animate-pulse text-xs font-bold">
            <span>🚑</span>
            <span className="hidden sm:inline">AMBULANCE PRIORITY</span>
            <span className="sm:hidden">EVP</span>
          </div>
        )}

        {/* Feeds Active & WS Badge */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface-variant font-mono">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-secondary animate-pulse' : 'bg-error'}`}></span>
          <span>{isConnected ? '4 Feeds Online' : 'Connecting...'}</span>
          {uptime ? <span className="text-[10px] text-on-surface-variant/70">({uptime})</span> : null}
        </div>

        {/* Real Clock */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface-variant font-mono">
          <span className="material-symbols-outlined text-[15px] text-on-surface-variant">schedule</span>
          <span>{timeStr}</span>
        </div>
      </div>
    </header>
  );
}
