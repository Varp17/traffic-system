import { useState, useEffect } from 'react';

export default function V2XCorridorMonitor({ spatData = {}, greenWave = {}, pedSafety = {} }) {
    const [corridorPlan, setCorridorPlan] = useState(greenWave);
    const [v2xSpat, setV2xSpat] = useState(spatData);
    const [reqStatus, setReqStatus] = useState('');

    useEffect(() => {
        if (greenWave && Object.keys(greenWave).length > 0) {
            setCorridorPlan(greenWave);
        }
        if (spatData && Object.keys(spatData).length > 0) {
            setV2xSpat(spatData);
        }
    }, [greenWave, spatData]);

    const sendV2XRequest = async (lane, priority) => {
        try {
            setReqStatus(`Transmitting SAE J2735 ${priority} request for ${lane}...`);
            const res = await fetch('/api/v2x/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lane, priority, type: priority === 'EVP' ? 'ambulance' : 'bus' })
            });
            const data = await res.json();
            setReqStatus(`✓ Priority granted: ${data.priority} acknowledged for ${data.lane} approach`);
            setTimeout(() => setReqStatus(''), 4000);
        } catch (e) {
            setReqStatus(`Error: ${e.message}`);
        }
    };

    const phases = v2xSpat?.phases || [
        { lane: 'North', currentState: 'green', timeRemainingSec: 15.0 },
        { lane: 'South', currentState: 'red', timeRemainingSec: 0.0 },
        { lane: 'East',  currentState: 'red', timeRemainingSec: 0.0 },
        { lane: 'West',  currentState: 'red', timeRemainingSec: 0.0 },
    ];

    const corridorNodes = corridorPlan?.corridorNodes || {
        'North_Jct_2': { neighborId: 'INT_NORTH_002', distanceMeters: 450, progressionSpeedKmh: 45, idealOffsetSec: 36.0, platoonEtaSec: 36.0 },
        'South_Jct_2': { neighborId: 'INT_SOUTH_002', distanceMeters: 520, progressionSpeedKmh: 45, idealOffsetSec: 41.6, platoonEtaSec: 41.6 },
        'East_Jct_2':  { neighborId: 'INT_EAST_002',  distanceMeters: 380, progressionSpeedKmh: 45, idealOffsetSec: 30.4, platoonEtaSec: 30.4 },
        'West_Jct_2':  { neighborId: 'INT_WEST_002',  distanceMeters: 490, progressionSpeedKmh: 45, idealOffsetSec: 39.2, platoonEtaSec: 39.2 },
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1360px', margin: '0 auto', color: '#fff', overflowY: 'auto' }}>
            {/* Header Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '38px', height: '38px', borderRadius: '10px',
                        background: 'rgba(168, 85, 247, 0.2)', border: '1px solid var(--purple)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                    }}>
                        📡
                    </div>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.01em' }}>
                            Connected Vehicle V2X & Arterial Green Wave Coordinator
                        </h2>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                            SAE J2735 SPaT (ID 19) / MAP (ID 18) Broadcasts &bull; Bandwidth Maximization &bull; MUTCD Pedestrian PCI
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{
                        background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.35)',
                        padding: '6px 12px', borderRadius: '8px', fontSize: '11px', color: '#38bdf8', fontWeight: '800'
                    }}>
                        C-V2X / DSRC (10 Hz)
                    </span>
                    <span style={{
                        background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)',
                        padding: '6px 12px', borderRadius: '8px', fontSize: '11px', color: '#10b981', fontWeight: '800'
                    }}>
                        MUTCD PCI: {pedSafety?.pci_duration || 11.7}s
                    </span>
                </div>
            </div>

            {reqStatus && (
                <div style={{
                    marginBottom: '18px', padding: '10px 16px',
                    background: 'rgba(56, 189, 248, 0.15)', border: '1px solid var(--blue)',
                    borderRadius: '10px', fontSize: '12px', color: '#38bdf8', fontWeight: '700'
                }}>
                    {reqStatus}
                </div>
            )}

            {/* Visual Arterial Green Wave Corridor Schematic */}
            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
                <div className="section-title" style={{ marginBottom: '16px' }}>
                    <div className="section-dot" style={{ background: 'var(--green)' }} />
                    Arterial Progression Topology & Platoon Synchronization
                </div>

                <div style={{
                    position: 'relative', height: '140px',
                    background: 'rgba(3, 7, 18, 0.75)', borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-around',
                    padding: '0 40px'
                }}>
                    {/* Connecting Green Wave Progression Beam */}
                    <div style={{
                        position: 'absolute', height: '4px', left: '100px', right: '100px',
                        background: 'linear-gradient(90deg, #10b981 0%, #38bdf8 50%, #a855f7 100%)',
                        boxShadow: '0 0 12px rgba(16, 185, 129, 0.6)',
                        zIndex: 1
                    }} />

                    {/* Nodes */}
                    {[
                        { label: 'West Node', id: 'INT_WEST_002', dist: '490m', offset: '39.2s' },
                        { label: 'Primary ATSC', id: 'INT_DEV_001', dist: 'MASTER', offset: '0.0s', isMaster: true },
                        { label: 'East Node', id: 'INT_EAST_002', dist: '380m', offset: '30.4s' },
                    ].map((node, i) => (
                        <div key={i} style={{
                            position: 'relative', zIndex: 2, textAlign: 'center',
                            background: node.isMaster ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.9)',
                            border: node.isMaster ? '2px solid var(--blue)' : '1px solid rgba(255, 255, 255, 0.15)',
                            padding: '12px 18px', borderRadius: '12px',
                            boxShadow: node.isMaster ? '0 0 20px rgba(56, 189, 248, 0.3)' : 'none'
                        }}>
                            <div style={{ fontSize: '18px', marginBottom: '4px' }}>
                                {node.isMaster ? '🚦' : '🌐'}
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: node.isMaster ? 'var(--blue)' : '#fff' }}>
                                {node.label}
                            </div>
                            <div className="mono" style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                {node.id}
                            </div>
                            <div style={{
                                marginTop: '6px', fontSize: '9px', fontWeight: '700',
                                color: 'var(--green)', background: 'rgba(16, 185, 129, 0.1)',
                                padding: '2px 6px', borderRadius: '4px'
                            }}>
                                Offset: {node.offset}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                {/* 1. SAE J2735 SPaT Broadcast Card */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <div className="section-title">
                        <div className="section-dot" style={{ background: 'var(--blue)' }} />
                        SAE J2735 SPaT Live Broadcast
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Intersection ID: {v2xSpat?.intersectionId || 'INT_DEV_001'} &bull; DSRC Msg ID: 19
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {phases.map((p) => {
                            const isGreen = p.currentState === 'green';
                            const isYellow = p.currentState === 'yellow';
                            const color = isGreen ? 'var(--green)' : (isYellow ? 'var(--yellow)' : 'var(--text-muted)');

                            return (
                                <div key={p.lane} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'rgba(255, 255, 255, 0.02)', padding: '12px 14px', borderRadius: '10px',
                                    border: `1px solid ${isGreen ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.06)'}`
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '10px', height: '10px', borderRadius: '50%',
                                            background: color, boxShadow: isGreen ? '0 0 10px var(--green)' : 'none'
                                        }} />
                                        <span style={{ fontWeight: '800', fontSize: '13px' }}>{p.lane} Approach</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className="mono" style={{ fontSize: '14px', fontWeight: '800', color }}>
                                            {p.currentState.toUpperCase()}
                                        </span>
                                        {isGreen && (
                                            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                                {parseFloat(p.timeRemainingSec || 0).toFixed(1)}s remaining
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. Arterial Progression & Green Wave Offsets */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <div className="section-title">
                        <div className="section-dot" style={{ background: 'var(--purple)' }} />
                        Downstream Nodes & Ideal Offsets
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Offset = (Distance / v_prog) mod Cₒ &bull; v_prog = 45 km/h
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {Object.entries(corridorNodes).map(([name, node]) => (
                            <div key={name} style={{
                                background: 'rgba(255, 255, 255, 0.02)', padding: '12px 14px', borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.06)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: '800', fontSize: '12px', color: '#fff' }}>
                                        {name.replace('_', ' ')}
                                    </span>
                                    <span style={{
                                        fontSize: '9px', fontWeight: '800',
                                        background: 'rgba(16, 185, 129, 0.12)', color: 'var(--green)',
                                        padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)'
                                    }}>
                                        SYNCHRONIZED
                                    </span>
                                </div>
                                <div className="mono" style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px'
                                }}>
                                    <span>Dist: <strong>{node.distanceMeters}m</strong></span>
                                    <span>Offset: <strong style={{ color: 'var(--blue)' }}>{node.idealOffsetSec}s</strong></span>
                                    <span>Platoon ETA: <strong style={{ color: 'var(--yellow)' }}>{node.platoonEtaSec}s</strong></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. V2X Priority Signal Request (SRM) Emulator */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <div className="section-title">
                        <div className="section-dot" style={{ background: 'var(--red)' }} />
                        Vehicle-to-Infrastructure (V2I) Priority Request
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Transmit Signal Request Message (SRM) to intersection controller
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {['North', 'South', 'East', 'West'].map((lane) => (
                            <div key={lane} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: '10px',
                                border: '1px solid rgba(255, 255, 255, 0.06)'
                            }}>
                                <span style={{ fontWeight: '700', fontSize: '12px' }}>{lane} Approach</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => sendV2XRequest(lane, 'TSP')}
                                        className="tactical-btn"
                                        style={{ padding: '6px 10px', fontSize: '10px' }}
                                    >
                                        🚌 Bus (TSP)
                                    </button>
                                    <button
                                        onClick={() => sendV2XRequest(lane, 'EVP')}
                                        className="tactical-btn tactical-btn-danger"
                                        style={{ padding: '6px 10px', fontSize: '10px' }}
                                    >
                                        🚑 EVP Siren
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
