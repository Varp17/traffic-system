import { useState } from 'react';

export default function SignalPanel({ signals = {}, laneStats = {}, audioSiren = {} }) {
    const data = signals?.signals || {};
    const lanes = ['North', 'South', 'East', 'West'];
    const [overrideStatus, setOverrideStatus] = useState('');

    const websterCo = signals?.webster_cycle_length || 60;
    const flowRatio = signals?.critical_flow_ratio || 0.45;
    const isEmergency = signals?.emergency_active || false;
    const emergencyLane = signals?.emergency_lane;
    const emergencySource = signals?.emergency_source || 'visual';

    const handleOverride = async (lane) => {
        try {
            setOverrideStatus(`Overriding ${lane}...`);
            const res = await fetch('/api/override-signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lane, duration: 25.0 })
            });
            await res.json();
            setOverrideStatus(`Overridden: ${lane} (25s)`);
            setTimeout(() => setOverrideStatus(''), 3000);
        } catch (e) {
            setOverrideStatus(`Override error: ${e.message}`);
        }
    };

    const handleClearEmergency = async () => {
        try {
            await fetch('/api/clear-emergency', { method: 'POST' });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className={`glass-panel ${isEmergency ? 'siren-active-border' : ''}`} style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="section-title" style={{ margin: 0 }}>
                    <div className="section-dot" style={{ background: isEmergency ? 'var(--red)' : 'var(--green)' }} />
                    Webster ATSC Signal Core
                </div>
                <div style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(56, 189, 248, 0.12)',
                    color: '#38bdf8',
                    fontWeight: '700',
                    border: '1px solid rgba(56, 189, 248, 0.3)'
                }}>
                    Cₒ: {websterCo}s &bull; Y: {flowRatio}
                </div>
            </div>

            {/* Webster Analytical Formula Badge */}
            <div style={{
                marginTop: '10px',
                padding: '8px 10px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px'
            }}>
                <span className="mono" style={{ color: 'var(--text-muted)' }}>
                    Cₒ = (1.5L + 5) / (1 - Y)
                </span>
                <span style={{ color: 'var(--green)', fontWeight: '700' }}>
                    Optimum Delay Minimization
                </span>
            </div>

            {/* Emergency / Siren Banner */}
            {isEmergency && (
                <div style={{
                    marginTop: '10px',
                    background: 'rgba(244, 63, 94, 0.18)',
                    border: '1px solid var(--red)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 0 16px rgba(244, 63, 94, 0.3)'
                }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#f43f5e' }}>
                        🚑 PRIORITY CORRIDOR: {emergencyLane} ({emergencySource.toUpperCase()})
                    </span>
                    <button
                        onClick={handleClearEmergency}
                        style={{
                            background: '#f43f5e',
                            color: '#fff',
                            border: 'none',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}>
                        Clear
                    </button>
                </div>
            )}

            {/* Acoustic Siren Alert Badge */}
            {audioSiren?.siren_active && !isEmergency && (
                <div style={{
                    marginTop: '10px',
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '1px solid var(--yellow)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: '#f59e0b',
                    fontWeight: '700'
                }}>
                    🔊 ACOUSTIC SIREN DETECTED ({Math.round(audioSiren?.dominant_freq || 0)} Hz) — PREPARING PREEMPTION
                </div>
            )}

            {overrideStatus && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--blue)', textAlign: 'center' }}>
                    {overrideStatus}
                </div>
            )}

            {/* 4 Approaches Traffic Signals Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '14px' }}>
                {lanes.map((lane) => {
                    const info = data[lane] || { state: 'red', time_left: 0 };
                    const isGreen = info.state === 'green';
                    const isYellow = info.state === 'yellow';
                    const isRed = info.state === 'red';
                    const stats = laneStats[lane] || {};
                    const waitSec = Math.round(stats.avg_wait_time || 0);

                    return (
                        <div
                            key={lane}
                            style={{
                                background: isGreen ? 'rgba(16, 185, 129, 0.08)' : (isYellow ? 'rgba(245, 158, 11, 0.08)' : 'rgba(15, 23, 42, 0.6)'),
                                border: isGreen ? '1px solid rgba(16, 185, 129, 0.4)' : (isYellow ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)'),
                                borderRadius: '10px',
                                padding: '10px 8px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                position: 'relative'
                            }}
                        >
                            <span style={{ fontSize: '11px', fontWeight: '800', color: `var(--${lane.toLowerCase()})` }}>
                                {lane}
                            </span>

                            {/* 3-Aspect Traffic Signal Head */}
                            <div style={{
                                background: '#050811',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '14px',
                                padding: '6px 5px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px',
                                marginTop: '6px'
                            }}>
                                {/* Red Lamp */}
                                <div style={{
                                    width: '14px', height: '14px', borderRadius: '50%',
                                    background: isRed ? '#f43f5e' : 'rgba(244, 63, 94, 0.15)',
                                    boxShadow: isRed ? '0 0 10px rgba(244, 63, 94, 0.8)' : 'none',
                                    transition: 'all 0.3s ease'
                                }} />
                                {/* Yellow Lamp */}
                                <div style={{
                                    width: '14px', height: '14px', borderRadius: '50%',
                                    background: isYellow ? '#f59e0b' : 'rgba(245, 158, 11, 0.15)',
                                    boxShadow: isYellow ? '0 0 10px rgba(245, 158, 11, 0.8)' : 'none',
                                    transition: 'all 0.3s ease'
                                }} />
                                {/* Green Lamp */}
                                <div className={isGreen ? 'active-green-light' : ''} style={{
                                    width: '14px', height: '14px', borderRadius: '50%',
                                    background: isGreen ? '#10b981' : 'rgba(16, 185, 129, 0.15)',
                                    boxShadow: isGreen ? '0 0 10px rgba(16, 185, 129, 0.8)' : 'none',
                                    transition: 'all 0.3s ease'
                                }} />
                            </div>

                            {/* Digital Countdown Timer */}
                            <div className="mono" style={{
                                marginTop: '8px',
                                fontSize: '13px',
                                fontWeight: '800',
                                color: isGreen ? 'var(--green)' : (isYellow ? 'var(--yellow)' : 'var(--text-muted)')
                            }}>
                                {isGreen || isYellow ? `${Math.ceil(info.time_left || 0)}s` : `${waitSec}s wt`}
                            </div>

                            {/* Anti-Starvation Indicator */}
                            {isRed && (
                                <div style={{
                                    marginTop: '4px',
                                    fontSize: '9px',
                                    color: waitSec > 45 ? '#f43f5e' : 'var(--text-dim)',
                                    fontWeight: waitSec > 45 ? '800' : '500'
                                }}>
                                    {waitSec > 45 ? '⚠️ STARVING' : 'QUEUED'}
                                </div>
                            )}

                            {/* Manual Override Trigger */}
                            <button
                                onClick={() => handleOverride(lane)}
                                style={{
                                    marginTop: '8px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'var(--text-muted)',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                    fontSize: '9px',
                                    cursor: 'pointer',
                                    width: '100%',
                                    fontWeight: '600'
                                }}
                            >
                                Hold 25s
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
