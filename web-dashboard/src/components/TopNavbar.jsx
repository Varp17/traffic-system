import React, { useState, useEffect, useRef } from 'react';

const VIEW_TITLES = {
  'main-command-hub': { title: 'Main Command Hub', icon: 'dashboard' },
  'dashboard': { title: 'Live Dashboard', icon: 'dashboard' },
  '4-way-ai-perception': { title: '4-Way AI Perception Stream', icon: 'grid_view' },
  'incidents': { title: 'Tactical Incident Feed & Archive', icon: 'warning' },
  'violations-anpr-capture': { title: 'Violations & ANPR Capture', icon: 'document_scanner' },
  'tactical-scanner': { title: 'Detection Matrix & Radar', icon: 'radar' },
  'digital-twin-signals': { title: 'Digital Twin & Signals', icon: 'traffic' },
  'system-architecture-telemetry': { title: 'System Architecture & Telemetry', icon: 'hub' },
};

export default function TopNavbar({
  selectedIntersection,
  setSelectedIntersection,
  emergencyActive,
  onOpenBlueprint,
  onToggleSidebar,
  onToggleCollapse,
  sidebarCollapsed = false,
  currentView = 'main-command-hub',
}) {
  const [utcTime, setUtcTime] = useState('');
  const [models, setModels] = useState([]);
  const [activeModel, setActiveModel] = useState({ id: 'yolov8_traffic_trained.pt', label: 'YOLOv8 Trained' });
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [isSwitchingModel, setIsSwitchingModel] = useState(false);
  const modelMenuRef = useRef(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch ML Models
  const fetchModels = async () => {
    try {
      const res = await fetch('/api/ml/models');
      if (res.ok) {
        const data = await res.json();
        setModels(data);
        const active = data.find((m) => m.active);
        if (active) setActiveModel(active);
      }
    } catch (e) {
      // offline fallback
    }
  };

  useEffect(() => {
    fetchModels();
    const interval = setInterval(fetchModels, 6000);
    return () => clearInterval(interval);
  }, []);

  // Close model dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target)) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectModel = async (modelId) => {
    setIsSwitchingModel(true);
    setIsModelMenuOpen(false);
    try {
      const res = await fetch('/api/ml/select-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId }),
      });
      if (res.ok) {
        await fetchModels();
      }
    } catch (e) {
      console.error('Model switch failed:', e);
    } finally {
      setIsSwitchingModel(false);
    }
  };

  const currentViewInfo = VIEW_TITLES[currentView] || { title: 'AI Perception Command', icon: 'traffic' };

  return (
    <header
      className={`fixed top-0 left-0 ${
        sidebarCollapsed ? 'lg:left-16' : 'lg:left-64'
      } right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-40 flex items-center justify-between px-3 sm:px-space-md lg:px-space-lg border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.25)] transition-all duration-300`}
    >
      {/* Left: Sidebar Toggle + Active View Breadcrumb & Intersection Selector */}
      <div className="flex items-center gap-2 sm:gap-space-sm min-w-0">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors shrink-0"
          title="Toggle Mobile Menu"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {/* Desktop sidebar collapse / expand toggle */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors shrink-0"
            title={sidebarCollapsed ? 'Expand Side Menu' : 'Collapse Side Menu'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {sidebarCollapsed ? 'menu_open' : 'view_sidebar'}
            </span>
          </button>
        )}

        {/* Active View Badge */}
        <div className="hidden md:flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1.5 rounded-lg border border-outline-variant/20 shrink-0">
          <span className="material-symbols-outlined text-primary text-[18px]">
            {currentViewInfo.icon}
          </span>
          <span className="font-headline text-[12px] font-bold tracking-wide uppercase text-on-surface whitespace-nowrap">
            {currentViewInfo.title}
          </span>
        </div>

        {/* Target Intersection Selector */}
        <div className="relative flex items-center bg-surface-container-low border border-outline-variant/30 px-2.5 sm:px-space-md py-1 rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors shrink-0">
          <span className="material-symbols-outlined text-primary text-[17px] mr-1.5 shrink-0">traffic</span>
          <div className="flex flex-col">
            <span className="font-mono text-[8px] uppercase tracking-wider text-on-surface-variant font-medium leading-none">
              JUNCTION
            </span>
            <select
              value={selectedIntersection}
              onChange={(e) => setSelectedIntersection(e.target.value)}
              className="bg-transparent text-on-surface text-[11px] sm:text-[12px] font-semibold cursor-pointer outline-none appearance-none pr-5 leading-tight"
            >
              <option className="bg-surface-container-high text-on-surface" value="j04">
                Junction 04: Grand Ave & 5th St
              </option>
              <option className="bg-surface-container-high text-on-surface" value="j05">
                Junction 05: Metro Blvd & 8th St
              </option>
              <option className="bg-surface-container-high text-on-surface" value="j02">
                Junction 02: Riverside & King Way
              </option>
              <option className="bg-surface-container-high text-on-surface" value="j07">
                Junction 07: Central Square Cross
              </option>
              <option className="bg-surface-container-high text-on-surface" value="j08">
                Junction 08: Civic Center Plaza
              </option>
              <option className="bg-surface-container-high text-on-surface" value="j09">
                Junction 09: Ring Road Expressway
              </option>
            </select>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-[15px] absolute right-1.5 pointer-events-none">
            expand_more
          </span>
        </div>
      </div>

      {/* Middle: AI Model Switcher & Status Indicators */}
      <div className="hidden xl:flex items-center gap-space-sm">
        {/* Neural Model Dropdown */}
        <div className="relative" ref={modelMenuRef}>
          <button
            onClick={() => setIsModelMenuOpen((prev) => !prev)}
            disabled={isSwitchingModel}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 text-on-surface text-[11px] font-mono transition-colors"
            title="Switch Active Computer Vision Neural Architecture"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">psychology</span>
            <span className="font-semibold text-primary">
              {isSwitchingModel ? 'Switching...' : activeModel.label || 'YOLOv8 Custom'}
            </span>
            <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
              expand_more
            </span>
          </button>

          {isModelMenuOpen && (
            <div className="absolute left-0 mt-1.5 w-60 bg-surface-container-high border border-outline-variant/40 rounded-xl shadow-2xl py-1.5 z-50">
              <div className="px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-on-surface-variant font-bold border-b border-outline-variant/20">
                ACTIVE AI DETECTOR
              </div>
              {(models.length > 0 ? models : [
                { id: 'yolov8_traffic_trained.pt', label: 'Custom YOLOv8 Trained', active: true, desc: 'Specialized 4-quadrant vehicle model' },
                { id: 'yolov8n.pt', label: 'YOLOv8 Nano (COCO)', active: false, desc: 'General real-time 80-class weights' },
                { id: 'yolov11x_edge.pt', label: 'YOLOv11 Edge (TensorRT)', active: false, desc: '60 FPS ultra high precision engine' },
              ]).map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectModel(m.id)}
                  className={`w-full text-left px-3 py-2 text-[12px] flex flex-col hover:bg-surface-container-highest transition-colors ${
                    m.id === activeModel.id ? 'bg-primary/10 border-l-2 border-primary text-primary font-bold' : 'text-on-surface'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{m.label}</span>
                    {m.id === activeModel.id && (
                      <span className="text-[10px] text-secondary font-mono font-bold">ACTIVE</span>
                    )}
                  </div>
                  {m.desc && (
                    <span className="text-[10px] text-on-surface-variant font-normal mt-0.5">
                      {m.desc}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Preemption / Green Wave Pill */}
        <div
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
            emergencyActive
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
              : 'bg-secondary-container/20 text-secondary border border-secondary/30'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">
            {emergencyActive ? 'e911_emergency' : 'shield_with_heart'}
          </span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
            {emergencyActive ? 'EMERGENCY PREEMPTION ACTIVE' : 'CORRIDOR GREEN WAVE'}
          </span>
        </div>

        {/* System Health */}
        <div className="hidden 2xl:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant/20 text-on-surface">
          <span className="material-symbols-outlined text-primary text-[15px]">monitor_heart</span>
          <span className="font-mono text-[10px] text-on-surface-variant">HEALTH:</span>
          <span className="font-mono text-[11px] text-primary font-bold">99.8%</span>
        </div>
      </div>

      {/* Right: Clock & Supervisor Profile */}
      <div className="flex items-center gap-2 sm:gap-space-md shrink-0">
        {onOpenBlueprint && (
          <button
            onClick={onOpenBlueprint}
            className="px-2 sm:px-space-sm py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary border border-primary/20 text-[10px] sm:text-[11px] font-mono font-semibold flex items-center gap-1 transition-colors"
            title="System Specifications & Mathematical Blueprint"
          >
            <span className="material-symbols-outlined text-[14px]">architecture</span>
            <span className="hidden sm:inline">BLUEPRINT</span>
          </button>
        )}

        <div className="flex items-center gap-1 bg-surface-container-high px-2 sm:px-space-sm py-1 rounded-lg border border-outline-variant/30">
          <span className="material-symbols-outlined text-on-surface-variant text-[14px]">schedule</span>
          <div className="font-mono text-[10px] sm:text-[11px] text-on-surface font-semibold tracking-tight">
            {utcTime || '14:48:22 UTC'}
          </div>
        </div>

        <div className="flex items-center gap-2 pl-1 border-l border-outline-variant/30">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-on-surface font-medium block leading-tight">
              Traffic Vision Ops
            </span>
            <span className="font-mono text-[9px] text-secondary block font-semibold">
              Station 01 [Supervisor]
            </span>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center shadow-md shrink-0">
            <span className="material-symbols-outlined text-on-primary text-[16px] sm:text-[18px]">
              admin_panel_settings
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
