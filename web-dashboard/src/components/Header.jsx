import { useState, useEffect, useRef } from 'react';

const LAYOUT_OPTIONS = [
    { label: "🔲 Standard Quad (N, S, E, W)", value: "[0,1,2,3]" },
    { label: "↔️ Swap East ↔ West", value: "[0,1,3,2]" },
    { label: "↕️ Swap North ↔ South", value: "[1,0,2,3]" },
    { label: "🔄 Rotate 180°", value: "[2,3,0,1]" },
    { label: "🔁 Inverse Sequence", value: "[3,2,1,0]" }
];

export default function Header({ metrics, audioSiren, uptime, isConnected, currentView, setCurrentView, onOpenBlueprint }) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedLayout, setSelectedLayout] = useState(LAYOUT_OPTIONS[0]);
    const [isLiveMode, setIsLiveMode] = useState(false);
    const dropdownRef = useRef(null);

    // Neural Model Switcher State
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const [activeModelId, setActiveModelId] = useState('yolov8_traffic_trained.pt');
    const [activeModelLabel, setActiveModelLabel] = useState('Custom YOLOv8 (Your Trained Model)');
    const [isSwitchingModel, setIsSwitchingModel] = useState(false);
    const modelDropdownRef = useRef(null);

    const fetchActiveModel = async () => {
        try {
            const res = await fetch('/api/ml/models');
            if (res.ok) {
                const models = await res.json();
                const active = models.find(m => m.active);
                if (active) {
                    setActiveModelId(active.id);
                    setActiveModelLabel(active.label);
                }
            }
        } catch (e) {}
    };

    useEffect(() => {
        fetchActiveModel();
        const interval = setInterval(fetchActiveModel, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSelectModel = async (modelId) => {
        setIsSwitchingModel(true);
        setIsModelDropdownOpen(false);
        try {
            const res = await fetch('/api/ml/select-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: modelId })
            });
            if (res.ok) {
                setActiveModelId(modelId);
                fetchActiveModel();
            }
        } catch (e) {
            console.error('Failed to switch model:', e);
        } finally {
            setIsSwitchingModel(false);
        }
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
            if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
                setIsModelDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fps = parseFloat(metrics?.fps || metrics?.current_fps || 0).toFixed(1);
    const veh = metrics?.total_vehicles || metrics?.vehicle_count || 0;
    const totalPcu = metrics?.total_pcu || veh;

    // Environmental Telemetry Tracking
    const vehRef = useRef(0);
    useEffect(() => {
        vehRef.current = veh;
    }, [veh]);

    const [idleSavedSec, setIdleSavedSec] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setIdleSavedSec(prev => prev + (vehRef.current * 0.4));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const idleHours = idleSavedSec / 3600;
    const fuelSaved = idleHours * 0.8;
    const co2Reduced = fuelSaved * 2.31;

    return (
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 20px',
            background: '#090e1a',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 40
        }}>
            {/* Left: Brand Identity matching user screenshot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>🚦</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '700', fontSize: '15px', color: '#fff', letterSpacing: '0.3px' }}>
                        AI Traffic Control System
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
                        {activeModelLabel} &bull; Adaptive Signal Control
                    </span>
                </div>
            </div>

            {/* Center: Navigation Views */}
            <div style={{
                display: 'flex', gap: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '4px', borderRadius: '10px',
                alignItems: 'center',
                border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
                {/* 1. Live Dashboard Tab */}
                <button
                    onClick={() => setCurrentView('main-command-hub')}
                    style={{
                        background: (currentView === 'main-command-hub' || currentView === 'dashboard') ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                        color: (currentView === 'main-command-hub' || currentView === 'dashboard') ? '#fff' : '#94a3b8',
                        border: (currentView === 'main-command-hub' || currentView === 'dashboard') ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                        padding: '7px 14px', borderRadius: '8px',
                        fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                    <span>📊</span> Live Dashboard
                </button>

                {/* 2. Incident Feed Tab - Active Red Button matching screenshot */}
                <button
                    onClick={() => setCurrentView('incidents')}
                    style={{
                        background: currentView === 'incidents' ? '#ef4444' : 'transparent',
                        color: currentView === 'incidents' ? '#ffffff' : '#94a3b8',
                        border: currentView === 'incidents' ? '1px solid #ef4444' : '1px solid transparent',
                        boxShadow: currentView === 'incidents' ? '0 0 14px rgba(239, 68, 68, 0.45)' : 'none',
                        padding: '7px 14px', borderRadius: '8px',
                        fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                    <span>⚠️</span> Incident Feed
                </button>

                {/* 3. 7-Column Detection Matrix Tab - Preservation of beloved detection squares screen */}
                <button
                    onClick={() => setCurrentView('tactical-scanner')}
                    style={{
                        background: currentView === 'tactical-scanner' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                        color: currentView === 'tactical-scanner' ? '#10b981' : '#94a3b8',
                        border: currentView === 'tactical-scanner' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                        padding: '7px 12px', borderRadius: '8px',
                        fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                    title="7-Column Multi-Quadrant Detection Matrix & Radar"
                >
                    <span>🎯</span> 7-Col Matrix
                </button>

                {/* Neural Model Switcher Dropdown */}
                <div ref={modelDropdownRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        disabled={isSwitchingModel}
                        style={{
                            background: activeModelId.includes('traffic_trained') ? 'rgba(16, 185, 129, 0.18)' : 'rgba(56, 189, 248, 0.12)',
                            color: activeModelId.includes('traffic_trained') ? '#34d399' : '#38bdf8',
                            border: activeModelId.includes('traffic_trained') ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(56, 189, 248, 0.35)',
                            padding: '7px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: activeModelId.includes('traffic_trained') ? '0 0 10px rgba(16, 185, 129, 0.2)' : 'none'
                        }}
                        title="Active Neural Model (Click to Switch)"
                    >
                        <span>🧠</span>
                        <span>{activeModelId.includes('traffic_trained') ? 'Custom Traffic (Trained)' : (activeModelId.includes('11') ? 'YOLOv11 Nano' : 'YOLOv8 Baseline')}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>

                    {isModelDropdownOpen && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                            background: '#090e1a', border: '1px solid rgba(56, 189, 248, 0.25)',
                            borderRadius: '10px', padding: '6px', width: '280px',
                            display: 'flex', flexDirection: 'column', gap: '4px',
                            boxShadow: '0 12px 30px rgba(0,0,0,0.7)', zIndex: 100
                        }}>
                            <div style={{ padding: '4px 8px', fontSize: '10px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Neural Model Zoo
                            </div>
                            {[
                                { id: 'yolov8_traffic_trained.pt', label: '⭐ Custom Traffic (Your Trained Model)', badge: '6 Classes • Fine-Tuned (Fastest)' },
                                { id: 'yolo11n.pt', label: '⚡ YOLOv11 Nano SOTA', badge: '80 Classes • Multi-Vehicle' },
                                { id: 'yolov8n.pt', label: '📦 YOLOv8 Nano Baseline', badge: '80 Classes • Standard COCO' }
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => handleSelectModel(m.id)}
                                    style={{
                                        background: activeModelId === m.id ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                                        color: activeModelId === m.id ? '#38bdf8' : '#e2e8f0',
                                        border: 'none', padding: '8px 10px', borderRadius: '6px',
                                        fontSize: '11px', fontWeight: '600', cursor: 'pointer', textAlign: 'left',
                                        display: 'flex', flexDirection: 'column', gap: '2px'
                                    }}
                                >
                                    <span style={{ fontWeight: '700' }}>{m.label}</span>
                                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>{m.badge}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Camera Layout Dropdown */}
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        disabled={isLiveMode}
                        style={{
                            background: '#040814',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            padding: '7px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <span>{selectedLayout.label}</span>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>

                    {isDropdownOpen && !isLiveMode && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                            background: '#090e1a', border: '1px solid rgba(56, 189, 248, 0.25)',
                            borderRadius: '10px', padding: '6px', width: '220px',
                            display: 'flex', flexDirection: 'column', gap: '4px',
                            boxShadow: '0 12px 30px rgba(0,0,0,0.7)', zIndex: 100
                        }}>
                            {LAYOUT_OPTIONS.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setSelectedLayout(option);
                                        setIsDropdownOpen(false);
                                        const mapping = JSON.parse(option.value);
                                        fetch('/api/swap-video', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ mapping })
                                        }).catch(err => console.error("Swap error:", err));
                                    }}
                                    style={{
                                        background: selectedLayout.value === option.value ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                                        color: selectedLayout.value === option.value ? '#38bdf8' : '#94a3b8',
                                        border: 'none', padding: '8px 10px', borderRadius: '6px',
                                        fontSize: '11px', fontWeight: '600', cursor: 'pointer', textAlign: 'left'
                                    }}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Start / Stop Live Feed Button */}
                {!isLiveMode ? (
                    <button
                        onClick={() => {
                            fetch('/api/open-live-camera', { method: 'POST' })
                                .then(() => setIsLiveMode(true))
                                .catch(err => console.error('Failed to open live camera', err));
                        }}
                        style={{
                            background: 'rgba(56, 189, 248, 0.12)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            padding: '7px 12px', borderRadius: '8px',
                            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                    >
                        <span>📹</span> Start Live Feed
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            fetch('/api/close-live-camera', { method: 'POST' })
                                .then(() => setIsLiveMode(false))
                                .catch(err => console.error('Failed to close live camera', err));
                        }}
                        style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            padding: '7px 12px', borderRadius: '8px',
                            fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                    >
                        <span>⏹</span> Stop Live Feed
                    </button>
                )}
            </div>

            {/* Right: Real-Time Telemetry Badges matching screenshot */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                {/* Fuel Saved */}
                <div style={{ textAlign: 'center' }}>
                    <div className="mono" style={{ color: '#f59e0b', fontSize: '15px', fontWeight: '800' }}>
                        {fuelSaved.toFixed(4)}<span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '2px' }}>L</span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>FUEL SAVED</div>
                </div>

                {/* CO2 Reduced */}
                <div style={{ textAlign: 'center' }}>
                    <div className="mono" style={{ color: '#10b981', fontSize: '15px', fontWeight: '800' }}>
                        {co2Reduced.toFixed(4)}<span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '2px' }}>kg</span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>CO₂ REDUCED</div>
                </div>

                <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.1)' }}></div>

                {/* FPS */}
                <div style={{ textAlign: 'center' }}>
                    <div className="mono" style={{ color: '#10b981', fontSize: '15px', fontWeight: '800' }}>
                        {fps}
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>FPS</div>
                </div>

                {/* Vehicles */}
                <div style={{ textAlign: 'center' }}>
                    <div className="mono" style={{ color: '#38bdf8', fontSize: '15px', fontWeight: '800' }}>
                        {veh}
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>VEHICLES</div>
                </div>

                {/* Uptime */}
                <div style={{ textAlign: 'center' }}>
                    <div className="mono" style={{ color: '#c084fc', fontSize: '15px', fontWeight: '800' }}>
                        {uptime}
                    </div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>UPTIME</div>
                </div>

                {/* Project Blueprint Button */}
                {onOpenBlueprint && (
                    <button
                        onClick={onOpenBlueprint}
                        title="Architecture & Math Blueprint"
                        style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            cursor: 'pointer'
                        }}
                    >
                        <span>📋</span> Blueprint
                    </button>
                )}

                {/* System Status Pill */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: isConnected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: isConnected ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                    padding: '5px 12px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: '800',
                    color: isConnected ? '#10b981' : '#f87171'
                }}>
                    {isConnected && <div className="live-pulse" />}
                    {isConnected ? 'LIVE' : 'DISCONNECTED'}
                </div>
            </div>
        </header>
    );
}
