import { useState, useEffect, useRef } from 'react';

export default function SimulationControls({ signals = {}, audioSiren = {}, onStatusChange }) {
    const [activeTab, setActiveTab] = useState('emergency'); // emergency, override, audio
    const [loading, setLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState('');
    const canvasRef = useRef(null);

    const isEmergency = signals?.emergency_active || false;
    const emergencyLane = signals?.emergency_lane;

    // Draw live animated FFT spectrum on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let phase = 0;

        const renderSpectrum = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const numBars = 32;
            const barWidth = canvas.width / numBars - 2;

            for (let i = 0; i < numBars; i++) {
                const freq = 100 + i * 90; // ~100Hz to 3000Hz
                let height = 4;
                let color = 'rgba(56, 189, 248, 0.4)';

                if (audioSiren?.siren_active || isEmergency) {
                    // Siren active in 600-1600 Hz range (bars 6 to 17)
                    if (i >= 6 && i <= 17) {
                        height = Math.sin(phase + i * 0.4) * 20 + 26;
                        color = '#f43f5e';
                    } else {
                        height = Math.random() * 6 + 3;
                        color = 'rgba(244, 63, 94, 0.3)';
                    }
                } else {
                    height = Math.sin(phase + i * 0.3) * 6 + 8 + Math.random() * 3;
                    color = 'rgba(56, 189, 248, 0.5)';
                }

                ctx.fillStyle = color;
                ctx.fillRect(i * (barWidth + 2), canvas.height - height, barWidth, height);
            }

            phase += 0.15;
            animId = requestAnimationFrame(renderSpectrum);
        };

        renderSpectrum();
        return () => cancelAnimationFrame(animId);
    }, [audioSiren, isEmergency]);

    const showMsg = (msg) => {
        setActionMessage(msg);
        if (onStatusChange) onStatusChange(msg);
        setTimeout(() => setActionMessage(''), 3500);
    };

    const triggerEmergency = async (lane) => {
        setLoading(true);
        try {
            const res = await fetch('/api/trigger-emergency', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lane, source: 'manual' })
            });
            const data = await res.json();
            showMsg(`🚨 Emergency preemption engaged for ${lane} approach!`);
        } catch (e) {
            showMsg(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const clearEmergency = async () => {
        setLoading(true);
        try {
            await fetch('/api/clear-emergency', { method: 'POST' });
            showMsg('✓ Emergency cleared. Resumed autonomous ATSC.');
        } catch (e) {
            showMsg(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const triggerSirenTest = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/trigger-siren-test', { method: 'POST' });
            const data = await res.json();
            if (data.status === 'siren_detected_and_preempted') {
                showMsg(`🔊 Siren acoustic FFT confirmed (${data.analysis?.dominant_freq_hz || 950} Hz)! Priority granted to ${data.target_lane}.`);
            } else {
                showMsg('Acoustic test completed.');
            }
        } catch (e) {
            showMsg(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const triggerOverride = async (lane, duration = 20.0) => {
        setLoading(true);
        try {
            await fetch('/api/override-signal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lane, duration })
            });
            showMsg(`⚡ Held GREEN on ${lane} for ${duration}s.`);
        } catch (e) {
            showMsg(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div className="section-title">
                    <div className="section-dot" style={{ background: isEmergency ? 'var(--red)' : 'var(--blue)' }} />
                    Interactive Sandbox & Preemption Controls
                </div>

                {/* Sub-tabs */}
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '2px', borderRadius: '8px' }}>
                    <button
                        onClick={() => setActiveTab('emergency')}
                        style={{
                            background: activeTab === 'emergency' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                            color: activeTab === 'emergency' ? '#fff' : 'var(--text-muted)',
                            border: 'none', padding: '4px 8px', borderRadius: '6px',
                            fontSize: '10px', fontWeight: '700', cursor: 'pointer'
                        }}>
                        🚨 Emergency
                    </button>
                    <button
                        onClick={() => setActiveTab('override')}
                        style={{
                            background: activeTab === 'override' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                            color: activeTab === 'override' ? '#fff' : 'var(--text-muted)',
                            border: 'none', padding: '4px 8px', borderRadius: '6px',
                            fontSize: '10px', fontWeight: '700', cursor: 'pointer'
                        }}>
                        ⚡ Manual Hold
                    </button>
                    <button
                        onClick={() => setActiveTab('audio')}
                        style={{
                            background: activeTab === 'audio' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                            color: activeTab === 'audio' ? '#fff' : 'var(--text-muted)',
                            border: 'none', padding: '4px 8px', borderRadius: '6px',
                            fontSize: '10px', fontWeight: '700', cursor: 'pointer'
                        }}>
                        🔊 Acoustic FFT
                    </button>
                    <button
                        onClick={() => setActiveTab('videos')}
                        style={{
                            background: activeTab === 'videos' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                            color: activeTab === 'videos' ? '#38bdf8' : 'var(--text-muted)',
                            border: 'none', padding: '4px 8px', borderRadius: '6px',
                            fontSize: '10px', fontWeight: '700', cursor: 'pointer'
                        }}>
                        📹 Feeds
                    </button>
                </div>
            </div>

            {/* Action Feedback Toast */}
            {actionMessage && (
                <div style={{
                    marginBottom: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#38bdf8',
                    animation: 'fadeIn 0.2s ease'
                }}>
                    {actionMessage}
                </div>
            )}

            {/* Tab 1: Emergency Preemption */}
            {activeTab === 'emergency' && (
                <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Simulate approaching ambulance on approach (triggers 3.0s safe yellow clearance):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        {['North', 'South', 'East', 'West'].map(lane => (
                            <button
                                key={lane}
                                onClick={() => triggerEmergency(lane)}
                                disabled={loading}
                                className="tactical-btn"
                                style={{
                                    justifyContent: 'center',
                                    padding: '7px 4px',
                                    fontSize: '11px',
                                    border: emergencyLane === lane ? '1px solid var(--red)' : '1px solid rgba(255,255,255,0.08)',
                                    background: emergencyLane === lane ? 'rgba(244, 63, 94, 0.25)' : 'rgba(255,255,255,0.03)'
                                }}
                            >
                                🚑 {lane}
                            </button>
                        ))}
                    </div>

                    {isEmergency && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                            <button
                                onClick={clearEmergency}
                                disabled={loading}
                                className="tactical-btn tactical-btn-danger"
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                ❌ Disengage Emergency Preemption
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Manual Hold Override */}
            {activeTab === 'override' && (
                <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Force green on approach for 20 seconds (Police override):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                        {['North', 'South', 'East', 'West'].map(lane => (
                            <button
                                key={lane}
                                onClick={() => triggerOverride(lane, 20.0)}
                                disabled={loading}
                                className="tactical-btn"
                                style={{ justifyContent: 'center', padding: '7px 4px', fontSize: '11px' }}
                            >
                                🟢 Hold {lane}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab 3: Acoustic FFT Analyzer */}
            {activeTab === 'audio' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            FFT Spectrum (600 - 1600 Hz Siren Band):
                        </span>
                        <span className="mono" style={{ fontSize: '10px', color: audioSiren?.siren_active ? 'var(--red)' : 'var(--blue)' }}>
                            {audioSiren?.siren_active ? `SIREN DETECTED (${Math.round(audioSiren?.dominant_freq || 950)} Hz)` : 'IDLE NOISE'}
                        </span>
                    </div>

                    {/* Canvas Audio Spectrum Visualizer */}
                    <canvas
                        ref={canvasRef}
                        width={370}
                        height={40}
                        style={{
                            width: '100%',
                            height: '40px',
                            background: 'rgba(3, 7, 18, 0.8)',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.06)'
                        }}
                    />

                    <div style={{ marginTop: '8px' }}>
                        <button
                            onClick={triggerSirenTest}
                            disabled={loading}
                            className="tactical-btn tactical-btn-primary"
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            🔊 Run Acoustic Siren FFT Benchmark Test
                        </button>
                    </div>
                </div>
            )}

            {/* Tab 4: Multi-Video Feeds Preset Loader */}
            {activeTab === 'videos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Select real-world video presets for the 4-way perception engine (15 videos available):
                    </div>

                    {[
                        {
                            name: "Standard 4-Way Junction",
                            badge: "DEFAULT",
                            desc: "North, South, East, West baseline cameras",
                            feeds: { v_north: "north.mp4", v_south: "south.mp4", v_east: "east.mp4", v_west: "west.mp4" }
                        },
                        {
                            name: "Urban Mixed & Crosswalks",
                            badge: "HETEROGENEOUS",
                            desc: "Cars, bikes, pedestrians, aerial & highway",
                            feeds: { v_north: "person_bicycle_car_urban.mp4", v_south: "crosswalk_pedestrians.mp4", v_east: "traffic_aerial_intersection.mp4", v_west: "car_detection_highway.mp4" }
                        },
                        {
                            name: "Emergency Priority Flight",
                            badge: "AMBULANCE",
                            desc: "Ambulance corridor + dense junction + arterial",
                            feeds: { v_north: "ambulance_emergency_corridor.mp4", v_south: "south.mp4", v_east: "dense_junction_playback.mp4", v_west: "arterial_corridor_playback.mp4" }
                        },
                        {
                            name: "High-Density Arterial Avenue",
                            badge: "CONGESTION",
                            desc: "2K arterial playback + dense junction",
                            feeds: { v_north: "arterial_corridor_playback.mp4", v_south: "dense_junction_playback.mp4", v_east: "car_detection_highway.mp4", v_west: "east.mp4" }
                        }
                    ].map(preset => (
                        <div
                            key={preset.name}
                            style={{
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px', padding: '10px 12px',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontWeight: '800', fontSize: '11px', color: '#fff' }}>
                                        {preset.name}
                                    </span>
                                    <span style={{
                                        fontSize: '8px', fontWeight: '800', padding: '1px 5px', borderRadius: '3px',
                                        background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8'
                                    }}>
                                        {preset.badge}
                                    </span>
                                </div>
                                <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                    {preset.desc}
                                </div>
                            </div>

                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    try {
                                        const res = await fetch('/api/load-videos', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(preset.feeds)
                                        });
                                        const data = await res.json();
                                        showMsg(`✓ Loaded ${preset.name} into 4-way matrix.`);
                                    } catch (e) {
                                        showMsg(`Error: ${e.message}`);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                                className="tactical-btn"
                                style={{ padding: '5px 10px', fontSize: '10px' }}
                            >
                                ▶ Load
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
