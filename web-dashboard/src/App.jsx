import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import MainCommandHubView from './components/MainCommandHubView';
import FourWayPerceptionView from './components/FourWayPerceptionView';
import ViolationsCaptureView from './components/ViolationsCaptureView';
import IncidentMonitor from './components/IncidentMonitor';
import SignalPanel from './components/SignalPanel';
import SimulationControls from './components/SimulationControls';
import V2XCorridorMonitor from './components/V2XCorridorMonitor';
import DetectionScannerView from './components/DetectionScannerView';
import SystemBlueprintModal from './components/SystemBlueprintModal';

function App() {
  const [currentView, setCurrentView] = useState('main-command-hub');
  const [selectedIntersection, setSelectedIntersection] = useState('j04');
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const startTime = useRef(Date.now());
  const [uptime, setUptime] = useState('00:00');

  useEffect(() => {
    const t = setInterval(() => {
      const sec = Math.floor((Date.now() - startTime.current) / 1000);
      setUptime(
        String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0')
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const [state, setState] = useState({
    metrics: {},
    signals: {},
    alerts: [],
    chart: {},
    active_targets: [],
    audio_siren: {},
    v2x_spat: {},
    green_wave: {},
    pedestrian_safety: {},
    bev_radar: {},
    frame_b64: null,
  });

  const [isConnected, setIsConnected] = useState(false);

  // WebSocket Live Connection to Backend
  useEffect(() => {
    let ws;
    let wsRetries = 0;

    function connectWS() {
      const loc = window.location;
      const host = loc.hostname || 'localhost';
      const port = loc.port ? loc.port : '8000';
      const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${host}:${port}/ws`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsConnected(true);
          wsRetries = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setState((prev) => ({
              ...prev,
              ...data,
              metrics: data.metrics || prev.metrics,
              signals: data.signals || prev.signals,
              alerts: data.alerts || prev.alerts,
              chart: data.chart || prev.chart,
              active_targets: data.active_targets || prev.active_targets,
              audio_siren: data.audio_siren || prev.audio_siren,
              v2x_spat: data.v2x_spat || prev.v2x_spat,
              green_wave: data.green_wave || prev.green_wave,
              pedestrian_safety: data.pedestrian_safety || prev.pedestrian_safety,
              bev_radar: data.bev_radar || prev.bev_radar,
            }));
          } catch (e) {
            console.error('Failed to parse WebSocket message', e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          const delay = Math.min(10000, 1000 * Math.pow(1.5, wsRetries++));
          setTimeout(connectWS, delay);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (e) {
        console.error('WebSocket connection error:', e);
      }
    }

    connectWS();
    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handleTriggerEmergency = async (lane) => {
    try {
      await fetch('/api/emergency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lane: lane || 'North' }),
      });
    } catch (e) {
      console.warn('API trigger emergency failed:', e);
    }
  };

  const isEmergency = state.signals?.emergency_active || false;

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen selection:bg-primary-container selection:text-on-primary-container">
      {/* 1. Left Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          setMobileSidebarOpen(false);
        }}
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* 2. Responsive Content Container with dynamic sidebar offset */}
      <div
        className={`${
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        } flex flex-col min-h-screen w-full transition-all duration-300`}
      >
        {/* Unified Top Navigation & Status Bar */}
        <TopNavbar
          selectedIntersection={selectedIntersection}
          setSelectedIntersection={setSelectedIntersection}
          emergencyActive={isEmergency}
          onOpenBlueprint={() => setIsBlueprintOpen(true)}
          onToggleSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          sidebarCollapsed={sidebarCollapsed}
          currentView={currentView}
        />

        {/* Main View Port */}
        <main className="w-full pt-16 pb-24 bg-surface px-3 sm:px-gutter flex-1 overflow-y-auto">
          <div className="pt-space-md">
            {/* SCREEN: Dedicated 3-Column Incident Feed */}
            {currentView === 'incidents' && (
              <IncidentMonitor />
            )}

            {/* SCREEN 1: Main Command Hub (Live Dashboard) */}
            {(currentView === 'main-command-hub' || currentView === 'dashboard') && (
              <MainCommandHubView
                onSelectIntersection={(jId) => setSelectedIntersection(jId)}
                onSwitchView={(viewId) => setCurrentView(viewId)}
                metrics={state.metrics}
                signals={state.signals}
                emergencyActive={isEmergency}
                onTriggerEmergency={handleTriggerEmergency}
              />
            )}

            {/* SCREEN 2: 4-Way Spatial AI Perception (Dedicated Detection Screen) */}
            {currentView === '4-way-ai-perception' && (
              <FourWayPerceptionView
                selectedIntersection={selectedIntersection}
                onSwitchView={(viewId) => setCurrentView(viewId)}
                signals={state.signals}
                emergencyActive={isEmergency}
              />
            )}

            {/* SCREEN 3: Violations & ANPR Capture (Real-Time Auto-Cropped Vehicle Photos Screen) */}
            {currentView === 'violations-anpr-capture' && (
              <ViolationsCaptureView />
            )}

            {/* SCREEN 4: Tactical Multi-Quadrant Target Detection Grid & 360 Radar */}
            {currentView === 'tactical-scanner' && (
              <DetectionScannerView
                activeTargets={state.active_targets || []}
                audioSiren={state.audio_siren || {}}
                metrics={state.metrics || {}}
              />
            )}

            {/* SCREEN 5: Digital Twin & Signals */}
            {currentView === 'digital-twin-signals' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md pb-space-xl">
                <SignalPanel
                  signals={state.signals}
                  laneStats={state.metrics?.lane_stats}
                  audioSiren={state.audio_siren}
                />
                <SimulationControls
                  signals={state.signals}
                  audioSiren={state.audio_siren}
                />
              </div>
            )}

            {/* SCREEN 6: System Architecture & Telemetry (V2X & Green Wave) */}
            {currentView === 'system-architecture-telemetry' && (
              <div className="pb-space-xl">
                <V2XCorridorMonitor
                  spatData={state.v2x_spat}
                  greenWave={state.green_wave}
                  pedSafety={state.pedestrian_safety}
                />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Engineering Blueprint Modal */}
      <SystemBlueprintModal
        isOpen={isBlueprintOpen}
        onClose={() => setIsBlueprintOpen(false)}
      />
    </div>
  );
}

export default App;
