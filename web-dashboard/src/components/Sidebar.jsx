import React from 'react';

export default function Sidebar({
  currentView,
  setCurrentView,
  mobileOpen,
  onClose,
  collapsed = false,
  onToggleCollapse,
}) {
  const navItems = [
    {
      id: 'main-command-hub',
      label: 'Main Command Hub',
      icon: 'dashboard',
      tag: 'OVERVIEW',
    },
    {
      id: '4-way-ai-perception',
      label: '4-Way AI Perception',
      icon: 'grid_view',
      tag: '4-CAM AI',
    },
    {
      id: 'incidents',
      label: 'Incident Feed',
      icon: 'warning',
      tag: 'INCIDENTS',
    },
    {
      id: 'violations-anpr-capture',
      label: 'Violations & ANPR Capture',
      icon: 'document_scanner',
      tag: 'AUTO-CROP',
    },
    {
      id: 'tactical-scanner',
      label: 'Detection Matrix & Radar',
      icon: 'radar',
      tag: '7-COL MATRIX',
    },
    {
      id: 'digital-twin-signals',
      label: 'Digital Twin & Signals',
      icon: 'traffic',
      tag: 'ATSC',
    },
    {
      id: 'system-architecture-telemetry',
      label: 'System Architecture & Telemetry',
      icon: 'hub',
      tag: 'V2X',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
      <aside
        className={`fixed left-0 top-0 h-full ${
          collapsed ? 'lg:w-16' : 'lg:w-64'
        } w-64 bg-surface-container-lowest/95 backdrop-blur-xl z-50 flex flex-col border-r border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.3)] transition-all duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-space-md flex items-center justify-between border-b border-outline-variant/20 bg-surface-container-low/60 overflow-hidden">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center shadow-inner shrink-0">
              <span className="material-symbols-outlined text-primary text-[20px]">videocam</span>
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="font-headline text-[15px] font-bold tracking-wider uppercase text-primary block leading-none truncate">
                  UK-ITCS
                </span>
                <span className="font-mono text-[10px] text-on-surface-variant block mt-1 tracking-tight truncate">
                  AI VISION SUITE
                </span>
              </div>
            )}
          </div>

          {!collapsed ? (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1.5 bg-secondary-container/20 px-2 py-0.5 rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                </span>
                <span className="font-mono text-[10px] text-secondary font-bold uppercase">LIVE</span>
              </div>
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="hidden lg:flex p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors ml-1"
                  title="Collapse Menu"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
              )}
            </div>
          ) : (
            onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors mx-auto"
                title="Expand Menu"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            )
          )}
        </div>

        {/* Surveillance Grid Status Chip (Hidden when collapsed) */}
        {!collapsed && (
          <div className="px-space-md py-space-sm bg-surface-container-low/40 border-b border-outline-variant/20">
            <div className="flex items-center justify-between text-on-surface-variant">
              <span className="font-mono text-[10px] uppercase tracking-wider">SURVEILLANCE GRID</span>
              <span className="font-mono text-[10px] text-secondary bg-secondary-container/20 px-1.5 py-0.5 rounded font-semibold">
                CALIBRATED
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[12px] text-on-surface font-medium">CAMERA ARRAYS</span>
              <span className="font-mono text-[11px] text-primary font-bold">24 / 24 RTSP</span>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-space-sm py-space-md space-y-1.5 overflow-y-auto">
          {!collapsed && (
            <div className="px-space-sm pb-1 font-mono text-[10px] uppercase text-on-surface-variant tracking-wider font-semibold">
              VISION COMMAND
            </div>
          )}

          {navItems.slice(0, 3).map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-space-md py-2.5'
                } rounded-lg text-left transition-all duration-150 ${
                  isActive
                    ? 'bg-surface-container-high text-primary font-semibold shadow-sm border border-primary/20'
                    : 'text-on-surface-variant hover:bg-surface-container-high/60 hover:text-on-surface'
                }`}
              >
                <div className={`flex items-center ${collapsed ? '' : 'gap-space-sm'}`}>
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isActive ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && <span className="text-[13px]">{item.label}</span>}
                </div>
                {!collapsed && (
                  <span
                    className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      isActive ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant/70'
                    }`}
                  >
                    {item.tag}
                  </span>
                )}
              </button>
            );
          })}

          {!collapsed && (
            <div className="pt-space-md px-space-sm pb-1 font-mono text-[10px] uppercase text-on-surface-variant tracking-wider font-semibold">
              ENGINE & TELEMETRY
            </div>
          )}

          {navItems.slice(3).map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-space-md py-2.5'
                } rounded-lg text-left transition-all duration-150 ${
                  isActive
                    ? 'bg-surface-container-high text-primary font-semibold shadow-sm border border-primary/20'
                    : 'text-on-surface-variant hover:bg-surface-container-high/60 hover:text-on-surface'
                }`}
              >
                <div className={`flex items-center ${collapsed ? '' : 'gap-space-sm'}`}>
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      isActive ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && <span className="text-[13px]">{item.label}</span>}
                </div>
                {!collapsed && (
                  <span
                    className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      isActive ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant/70'
                    }`}
                  >
                    {item.tag}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Edge Inference GPU Card (Hidden when collapsed) */}
        {!collapsed ? (
          <div className="p-space-sm bg-surface-container-lowest/90 border-t border-outline-variant/20">
            <div className="p-space-sm rounded-lg bg-surface-container-low border border-outline-variant/30 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-on-surface-variant">YOLOv11 + OCR EDGE</span>
                <span className="font-mono text-[10px] text-secondary font-bold">60 FPS</span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                <div className="bg-secondary h-full w-[98%] shadow-[0_0_8px_rgba(78,222,163,0.5)]"></div>
              </div>
              <div className="flex items-center justify-between text-on-surface-variant pt-0.5">
                <span className="font-mono text-[10px]">INFERENCE PIPELINE</span>
                <span className="font-mono text-[10px] text-primary font-bold">8.4 ms</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-2 border-t border-outline-variant/20 flex justify-center" title="Edge GPU: 60 FPS • 8.4ms">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(78,222,163,0.8)]"></span>
          </div>
        )}
      </aside>
    </>
  );
}
