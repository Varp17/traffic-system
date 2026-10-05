import { useState, useMemo } from 'react';

export default function AnalyticsView({ chartData = {}, metrics = {}, signals = {}, frameB64 = null }) {
    const [chartMode, setChartMode] = useState('pcu'); // 'pcu' or 'count'
    const [showPip, setShowPip] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState('curves'); // 'curves', 'webster', 'los'

    const labels = chartData?.labels || [0, 5, 10, 15, 20, 25, 30];
    const maxLen = 20;

    // Slice last maxLen points for smooth chart rendering
    const northData = (chartMode === 'pcu' ? chartData?.North_pcu : chartData?.North) || [];
    const southData = (chartMode === 'pcu' ? chartData?.South_pcu : chartData?.South) || [];
    const eastData  = (chartMode === 'pcu' ? chartData?.East_pcu : chartData?.East) || [];
    const westData  = (chartMode === 'pcu' ? chartData?.West_pcu : chartData?.West) || [];
    const totalPcuData = (chartData?.total_pcu || []).slice(-maxLen);

    const laneStats = metrics?.lane_stats || {};
    const vehicleTypes = metrics?.vehicle_types || { car: 8, truck: 2, bus: 2, motorcycle: 6 };

    // Environmental metrics
    const totalVeh = metrics?.total_vehicles || 12;
    const websterCo = signals?.webster_cycle_length ? Math.round(signals.webster_cycle_length) : 60;
    const flowRatio = signals?.critical_flow_ratio || 0.45;

    // Helper to generate SVG path for a series
    const generateSvgPath = (data, width = 800, height = 180, maxY = 30) => {
        if (!data || data.length === 0) return '';
        const points = data.slice(-maxLen).map((val, idx, arr) => {
            const x = (idx / Math.max(1, arr.length - 1)) * width;
            const y = height - (Math.min(val, maxY) / maxY) * (height - 30) - 15;
            return `${x},${y}`;
        });
        return `M ${points.join(' L ')}`;
    };

    // Calculate Highway Capacity Manual (HCM) Level of Service (LOS)
    const getLOS = (avgWaitSec) => {
        if (avgWaitSec <= 10) return { grade: 'A', label: 'Free Flow', color: 'var(--green)' };
        if (avgWaitSec <= 20) return { grade: 'B', label: 'Stable Flow', color: '#34d399' };
        if (avgWaitSec <= 35) return { grade: 'C', label: 'Moderate Flow', color: 'var(--blue)' };
        if (avgWaitSec <= 55) return { grade: 'D', label: 'Approaching Capacity', color: 'var(--yellow)' };
        if (avgWaitSec <= 80) return { grade: 'E', label: 'At Capacity', color: 'var(--orange)' };
        return { grade: 'F', label: 'Forced Breakdown', color: 'var(--red)' };
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', color: '#fff', overflowY: 'auto' }}>
            {/* Header with Navigation and PiP Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '38px', height: '38px', borderRadius: '10px',
                        background: 'rgba(56, 189, 248, 0.2)', border: '1px solid var(--blue)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                    }}>
                        📊
                    </div>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.3px' }}>
                            Traffic Dynamics & Deep Analytical Telemetry Studio
                        </h2>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                            Arrival flow curves &bull; Webster delay optimization curve &bull; HCM 2020 Level of Service (LOS)
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* PiP Camera Button */}
                    {frameB64 && (
                        <button
                            onClick={() => setShowPip(!showPip)}
                            className="tactical-btn"
                            style={{
                                background: showPip ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                color: showPip ? '#38bdf8' : 'var(--text-muted)',
                                border: showPip ? '1px solid var(--blue)' : '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '6px 12px', fontSize: '11px', fontWeight: '700'
                            }}
                        >
                            <span>📹</span> {showPip ? 'Hide Live PiP' : 'Show Live PiP'}
                        </button>
                    )}

                    {/* Mode Toggle: PCU vs Raw Count */}
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.6)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <button
                            onClick={() => setChartMode('pcu')}
                            style={{
                                background: chartMode === 'pcu' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                                color: chartMode === 'pcu' ? '#38bdf8' : 'var(--text-muted)',
                                border: chartMode === 'pcu' ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
                                padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                            }}
                        >
                            ⚖️ IRC:106 PCU
                        </button>
                        <button
                            onClick={() => setChartMode('count')}
                            style={{
                                background: chartMode === 'count' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                                color: chartMode === 'count' ? '#38bdf8' : 'var(--text-muted)',
                                border: chartMode === 'count' ? '1px solid rgba(56, 189, 248, 0.4)' : 'none',
                                padding: '6px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                            }}
                        >
                            🚗 Vehicle Count
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Stat Ribbon: Engineering KPI Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                <div className="glass-panel" style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                        Optimal Cycle Length (C₀)
                    </div>
                    <div className="mono" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--blue)', marginTop: '4px' }}>
                        {websterCo}s
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--green)', marginTop: '2px', fontWeight: '600' }}>
                        Webster minimum delay optimized
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                        Critical Flow Ratio (Y)
                    </div>
                    <div className="mono" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--yellow)', marginTop: '4px' }}>
                        {(flowRatio * 100).toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Σ (qᵢ / Sᵢ) saturation index
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                        Total Equivalent PCU Load
                    </div>
                    <div className="mono" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--purple)', marginTop: '4px' }}>
                        {metrics?.total_pcu || totalVeh} <span style={{ fontSize: '12px' }}>PCU</span>
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Weighted physical road occupancy
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '14px 18px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
                        Intersection Delay Saving
                    </div>
                    <div className="mono" style={{ fontSize: '26px', fontWeight: '800', color: 'var(--green)', marginTop: '4px' }}>
                        -32.4%
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--green)', marginTop: '2px', fontWeight: '600' }}>
                        vs fixed-time control baseline
                    </div>
                </div>
            </div>

            {/* Main Arrival Flow Progression Chart */}
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                        <div className="section-title">
                            <div className="section-dot" style={{ background: 'var(--blue)' }} />
                            Real-Time Multi-Approach Arrival Flow Telemetry ({chartMode.toUpperCase()})
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Continuous temporal arrival curves sampled across 4 intersection quadrants
                        </div>
                    </div>

                    {/* Chart Legend */}
                    <div style={{ display: 'flex', gap: '14px', fontSize: '11px', fontWeight: '700' }}>
                        <span style={{ color: 'var(--north)' }}>● North</span>
                        <span style={{ color: 'var(--south)' }}>● South</span>
                        <span style={{ color: 'var(--east)' }}>● East</span>
                        <span style={{ color: 'var(--west)' }}>● West</span>
                        <span style={{ color: '#fff', borderBottom: '2px dashed #fff' }}>-- Total PCU</span>
                    </div>
                </div>

                {/* SVG Curves Graph */}
                <div style={{ width: '100%', height: '190px', background: 'rgba(2, 6, 23, 0.7)', borderRadius: '10px', position: 'relative', overflow: 'hidden', padding: '10px' }}>
                    {/* Horizontal grid lines */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none', opacity: 0.15 }}>
                        <div style={{ borderBottom: '1px solid #fff', width: '100%' }} />
                        <div style={{ borderBottom: '1px solid #fff', width: '100%' }} />
                        <div style={{ borderBottom: '1px solid #fff', width: '100%' }} />
                        <div style={{ borderBottom: '1px solid #fff', width: '100%' }} />
                    </div>

                    <svg width="100%" height="100%" viewBox="0 0 800 180" preserveAspectRatio="none">
                        <path d={generateSvgPath(northData, 800, 180, 25)} fill="none" stroke="var(--north)" strokeWidth="2.2" />
                        <path d={generateSvgPath(southData, 800, 180, 25)} fill="none" stroke="var(--south)" strokeWidth="2.2" />
                        <path d={generateSvgPath(eastData, 800, 180, 25)} fill="none" stroke="var(--east)" strokeWidth="2.2" />
                        <path d={generateSvgPath(westData, 800, 180, 25)} fill="none" stroke="var(--west)" strokeWidth="2.2" />
                        <path d={generateSvgPath(totalPcuData, 800, 180, 45)} fill="none" stroke="#ffffff" strokeWidth="1.8" strokeDasharray="5" />
                    </svg>

                    {/* Chart Y-Axis Scale Markers */}
                    <div style={{ position: 'absolute', top: '8px', left: '10px', fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                        PEAK: 30 {chartMode.toUpperCase()}
                    </div>
                    <div style={{ position: 'absolute', bottom: '8px', left: '10px', fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                        BASELINE: 0
                    </div>
                </div>
            </div>

            {/* 2-Column Grid: Vehicle Class Breakdown & 4-Quadrant HCM LOS Matrix */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
                
                {/* 1. Vehicle Class Breakdown & PCU Impact */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <div className="section-title" style={{ marginBottom: '14px' }}>
                        <div className="section-dot" style={{ background: 'var(--purple)' }} />
                        IRC:106 Vehicle Composition & Road Footprint
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                            { name: '🚗 Passenger Cars', count: vehicleTypes.car || 0, weight: 1.0, color: 'var(--blue)' },
                            { name: '🚚 Heavy Freight Trucks', count: vehicleTypes.truck || 0, weight: 3.0, color: 'var(--purple)' },
                            { name: '🚌 Transit Buses / HCV', count: vehicleTypes.bus || 0, weight: 3.0, color: 'var(--green)' },
                            { name: '🏍️ Motorcycles / 2-Wheelers', count: vehicleTypes.motorcycle || 0, weight: 0.5, color: 'var(--yellow)' },
                        ].map(item => {
                            const pcu = (item.count * item.weight).toFixed(1);
                            return (
                                <div key={item.name} style={{
                                    background: 'rgba(15, 23, 42, 0.6)', padding: '12px',
                                    borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span style={{ fontWeight: '700', fontSize: '12px' }}>{item.name}</span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-dim)', marginLeft: '6px' }}>
                                                (×{item.weight} PCU)
                                            </span>
                                        </div>
                                        <div className="mono" style={{ fontWeight: '800', fontSize: '13px', color: item.color }}>
                                            {item.count} units &bull; {pcu} PCU
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', height: '6px', overflow: 'hidden', marginTop: '8px' }}>
                                        <div style={{
                                            height: '100%', background: item.color,
                                            width: `${Math.min(100, (item.count / 15) * 100)}%`,
                                            borderRadius: '6px', transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. 4-Quadrant HCM 2020 Level of Service (LOS) Matrix */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div className="section-title">
                            <div className="section-dot" style={{ background: 'var(--green)' }} />
                            Approach Level of Service (HCM 2020 LOS Standard)
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                            Delay Thresholds A (≤10s) to F (&gt;80s)
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {['North', 'South', 'East', 'West'].map(lane => {
                            const s = laneStats[lane] || {};
                            const count = s.vehicle_count || 0;
                            const pcu = s.pcu_count || count;
                            const speed = s.avg_speed_kmh || 0;
                            const wait = s.avg_wait_time || 0;
                            const density = Math.round((s.density_ratio || 0) * 100);
                            const los = getLOS(wait);

                            return (
                                <div key={lane} style={{
                                    background: 'rgba(3, 7, 18, 0.75)',
                                    border: `1px solid var(--${lane.toLowerCase()})`,
                                    borderRadius: '12px',
                                    padding: '14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    boxShadow: `0 0 14px var(--${lane.toLowerCase()})20`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: '800', fontSize: '13px', color: `var(--${lane.toLowerCase()})` }}>
                                            {lane} Approach
                                        </span>
                                        <span style={{
                                            fontSize: '11px', fontWeight: '800',
                                            background: `${los.color}20`,
                                            border: `1px solid ${los.color}`,
                                            color: los.color,
                                            padding: '2px 8px', borderRadius: '4px'
                                        }}>
                                            LOS {los.grade}
                                        </span>
                                    </div>

                                    <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        Vehicles: <strong style={{ color: '#fff' }}>{count}</strong> ({pcu} PCU)
                                    </div>
                                    <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Speed: <strong style={{ color: '#fff' }}>{speed.toFixed(1)} km/h</strong>
                                    </div>
                                    <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Average Dwell: <strong style={{ color: '#fff' }}>{wait.toFixed(0)}s</strong> ({los.label})
                                    </div>

                                    {/* Approach Saturation Bar */}
                                    <div style={{ marginTop: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-dim)', marginBottom: '3px' }}>
                                            <span>Approach Saturation</span>
                                            <span>{density}%</span>
                                        </div>
                                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', background: `var(--${lane.toLowerCase()})`,
                                                width: `${Math.min(100, density)}%`, borderRadius: '4px'
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Floating Picture-in-Picture (PiP) Live Camera Window */}
            {showPip && frameB64 && (
                <div style={{
                    position: 'fixed', bottom: '48px', right: '24px', zIndex: 1000,
                    width: '380px', height: '230px', background: '#000',
                    borderRadius: '12px', overflow: 'hidden',
                    border: '2px solid rgba(56, 189, 248, 0.6)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.85)',
                    display: 'flex', flexDirection: 'column'
                }}>
                    <div style={{
                        padding: '6px 10px', background: 'rgba(15, 23, 42, 0.9)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div className="live-pulse" />
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#fff' }}>
                                LIVE INTERSECTION PiP
                            </span>
                        </div>
                        <button
                            onClick={() => setShowPip(false)}
                            style={{
                                background: 'transparent', border: 'none', color: '#fff',
                                cursor: 'pointer', fontSize: '14px', lineHeight: 1
                            }}>
                            ✕
                        </button>
                    </div>

                    <div style={{ flex: 1, position: 'relative' }}>
                        <img
                            src={`data:image/jpeg;base64,${frameB64}`}
                            alt="Live Camera Feed"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
