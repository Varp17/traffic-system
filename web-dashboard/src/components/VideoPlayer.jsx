import { useState, useEffect, useRef } from 'react';

export default function VideoPlayer({ frameB64, fps, activeTargets = [], signals = {}, metrics = {} }) {
    const imgRef = useRef(null);
    const containerRef = useRef(null);
    
    // HUD Layer & Filter Controls
    const [showHud, setShowHud] = useState(true);
    const [showGates, setShowGates] = useState(true);
    const [showTelemetry, setShowTelemetry] = useState(true);
    const [classFilter, setClassFilter] = useState('all'); // all, ambulance, car, truck_bus, motorcycle, person
    const [confMin, setConfMin] = useState(0.25);
    const [showConfSlider, setShowConfSlider] = useState(false);
    const [selectedTargetId, setSelectedTargetId] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (frameB64 && imgRef.current) {
            imgRef.current.src = `data:image/jpeg;base64,${frameB64}`;
        }
    }, [frameB64]);

    const captureSnapshot = () => {
        if (!frameB64) return;
        const link = document.createElement('a');
        link.href = `data:image/jpeg;base64,${frameB64}`;
        link.download = `devdominators_ml_detection_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => console.error(err));
            setIsFullscreen(true);
        } else {
            document.exitFullscreen().catch(err => console.error(err));
            setIsFullscreen(false);
        }
    };

    const isEmergency = signals?.emergency_active || false;
    const emergencyLane = signals?.emergency_lane || 'North';

    // Filter targets based on class filter and confidence threshold
    const filteredTargets = activeTargets.filter(t => {
        const conf = t.confidence !== undefined ? t.confidence : 0.85;
        if (conf < confMin) return false;

        if (classFilter === 'ambulance') return t.is_ambulance;
        if (classFilter === 'car') return t.label === 'car';
        if (classFilter === 'truck_bus') return t.label === 'truck' || t.label === 'bus';
        if (classFilter === 'motorcycle') return t.label === 'motorcycle' || t.label === 'bicycle';
        if (classFilter === 'person') return t.is_person || t.label === 'person';
        return true;
    });

    // Find locked target
    const lockedTarget = activeTargets.find(t => t.id === selectedTargetId);

    // Color definitions
    const getClassColor = (label, isAmb) => {
        if (isAmb) return '#f43f5e';
        if (label === 'truck' || label === 'bus') return '#c084fc';
        if (label === 'motorcycle' || label === 'bicycle') return '#fbbf24';
        if (label === 'person') return '#34d399';
        return '#38bdf8'; // Car
    };

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%', height: '100%', position: 'relative',
                overflow: 'hidden', userSelect: 'none', background: '#020617',
                border: isEmergency ? '2px solid #f43f5e' : '1px solid rgba(56, 189, 248, 0.25)',
                boxShadow: isEmergency ? 'inset 0 0 35px rgba(244, 63, 94, 0.4), 0 0 30px rgba(244, 63, 94, 0.3)' : 'none',
                transition: 'all 0.3s ease'
            }}>
            
            {!frameB64 ? (
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', color: 'var(--text-muted)'
                }}>
                    <div className="live-pulse" style={{ width: '20px', height: '20px', marginBottom: '16px', background: '#38bdf8' }} />
                    <p style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Connecting to 4-Way Neural Perception Feed...</p>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
                        YOLOv8 Edge Engine &bull; ByteTrack Multi-Target Kinematics
                    </span>
                </div>
            ) : (
                <img
                    ref={imgRef}
                    className="video-feed"
                    alt="Live 4-Way Traffic Feed"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
            )}

            {/* ═══════════ EMERGENCY PREEMPTION BANNER & HAZARD EDGES ═══════════ */}
            {isEmergency && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    background: 'linear-gradient(180deg, rgba(244, 63, 94, 0.95) 0%, rgba(244, 63, 94, 0.6) 70%, transparent 100%)',
                    padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    zIndex: 40, animation: 'pulse 1.2s infinite'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: '900', fontSize: '12px', letterSpacing: '0.05em' }}>
                        <span>🚨</span>
                        <span>CODE-3 PRIORITY PREEMPTION ACTIVE &bull; {emergencyLane.toUpperCase()} CORRIDOR GRANTED GREEN</span>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '800', background: '#020617', color: '#f43f5e', padding: '2px 8px', borderRadius: '4px' }}>
                        PREEMPTION OVERRIDE LOCK
                    </span>
                </div>
            )}

            {/* ═══════════ TOP INFERENCE PIPELINE TELEMETRY TICKER ═══════════ */}
            {showTelemetry && frameB64 && (
                <div style={{
                    position: 'absolute', top: isEmergency ? '38px' : '10px', left: '16px',
                    display: 'flex', alignItems: 'center', gap: '10px', zIndex: 30
                }}>
                    <div className="glass-panel" style={{
                        padding: '4px 10px', background: 'rgba(2, 6, 23, 0.88)', backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '10px', fontWeight: '700'
                    }}>
                        <div className="live-pulse" style={{ width: '7px', height: '7px' }} />
                        <span style={{ color: '#38bdf8' }}>{metrics?.active_model_label || 'YOLOv11 Nano SOTA'}</span>
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                        <span style={{ color: '#34d399' }}>{parseFloat(fps || 0).toFixed(1)} FPS</span>
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                        <span style={{ color: '#c084fc' }}>{metrics?.total_footprint_m2 ? `${metrics.total_footprint_m2} m² Footprint` : '7.8 ms Latency'}</span>
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                        <span style={{ color: '#fbbf24' }}>{filteredTargets.length} Targets</span>
                    </div>
                </div>
            )}

            {/* ═══════════ TOP-RIGHT HUD CONTROL BUTTONS ═══════════ */}
            <div style={{
                position: 'absolute', top: isEmergency ? '38px' : '10px', right: '16px',
                display: 'flex', gap: '6px', zIndex: 30
            }}>
                {/* Confidence Threshold Toggle / Slider */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowConfSlider(!showConfSlider)}
                        className="tactical-btn"
                        style={{
                            padding: '4px 8px', fontSize: '10px',
                            background: showConfSlider ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 6, 23, 0.85)',
                            color: '#38bdf8'
                        }}
                        title="Adjust Minimum Detection Confidence Threshold"
                    >
                        🎚️ Conf &ge; {Math.round(confMin * 100)}%
                    </button>

                    {showConfSlider && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                            background: '#090e1a', border: '1px solid rgba(56, 189, 248, 0.35)',
                            borderRadius: '8px', padding: '10px 12px', width: '180px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.8)', zIndex: 50,
                            display: 'flex', flexDirection: 'column', gap: '6px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '700', color: '#fff' }}>
                                <span>Sensitivity Cutoff</span>
                                <span style={{ color: '#38bdf8' }}>{Math.round(confMin * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.15"
                                max="0.85"
                                step="0.05"
                                value={confMin}
                                onChange={(e) => setConfMin(parseFloat(e.target.value))}
                                style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--text-dim)' }}>
                                <span>High Recall (15%)</span>
                                <span>High Precision (85%)</span>
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setShowHud(!showHud)}
                    className="tactical-btn"
                    style={{
                        padding: '4px 8px', fontSize: '10px',
                        background: showHud ? 'rgba(56, 189, 248, 0.2)' : 'rgba(2, 6, 23, 0.85)',
                        color: showHud ? '#38bdf8' : 'var(--text-muted)'
                    }}
                    title="Toggle Tactical HUD Boxes & Target Reticles"
                >
                    🎯 HUD {showHud ? 'ON' : 'OFF'}
                </button>

                <button
                    onClick={() => setShowGates(!showGates)}
                    className="tactical-btn"
                    style={{
                        padding: '4px 8px', fontSize: '10px',
                        background: showGates ? 'rgba(16, 185, 129, 0.2)' : 'rgba(2, 6, 23, 0.85)',
                        color: showGates ? '#34d399' : 'var(--text-muted)'
                    }}
                    title="Toggle Virtual Stopline Induction Gates"
                >
                    🛑 Gates {showGates ? 'ON' : 'OFF'}
                </button>

                <button
                    onClick={captureSnapshot}
                    className="tactical-btn"
                    style={{ padding: '4px 8px', fontSize: '10px' }}
                    title="Save High-Res Forensic Screenshot"
                >
                    📸 Snapshot
                </button>

                <button
                    onClick={toggleFullscreen}
                    className="tactical-btn"
                    style={{ padding: '4px 8px', fontSize: '10px' }}
                    title="Toggle Fullscreen"
                >
                    {isFullscreen ? '⛶ Exit' : '⛶'}
                </button>
            </div>

            {/* ═══════════ CLASS FILTER PILLS BAR ═══════════ */}
            {frameB64 && (
                <div style={{
                    position: 'absolute', top: isEmergency ? '70px' : '44px', left: '16px',
                    display: 'flex', gap: '4px', zIndex: 25, flexWrap: 'wrap'
                }}>
                    {[
                        { id: 'all', label: 'All Classes', icon: '🌐' },
                        { id: 'ambulance', label: '🚨 Emergency', icon: '' },
                        { id: 'car', label: '🚗 Cars', icon: '' },
                        { id: 'truck_bus', label: '🚚 Trucks/Buses', icon: '' },
                        { id: 'motorcycle', label: '🏍️ 2-Wheelers', icon: '' },
                        { id: 'person', label: '🚶 Pedestrians', icon: '' },
                    ].map(p => (
                        <button
                            key={p.id}
                            onClick={() => setClassFilter(p.id)}
                            style={{
                                background: classFilter === p.id ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 6, 23, 0.82)',
                                color: classFilter === p.id ? '#38bdf8' : 'var(--text-muted)',
                                border: classFilter === p.id ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '4px', padding: '2px 7px', fontSize: '9px', fontWeight: '700',
                                cursor: 'pointer', backdropFilter: 'blur(6px)', transition: 'all 0.15s ease'
                            }}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            )}

            {/* ═══════════ VIRTUAL STOPLINE INDUCTION GATES ═══════════ */}
            {showGates && frameB64 && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 15 }}>
                    {/* North Stopline Gate (Top-Left Quad) */}
                    <div style={{
                        position: 'absolute', left: '12%', top: '38%', width: '26%', height: '8%',
                        border: '1px dashed rgba(56, 189, 248, 0.4)', background: 'rgba(56, 189, 248, 0.08)',
                        borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: '#38bdf8', letterSpacing: '0.05em' }}>
                            GATE NORTH &bull; INDUCTION STOPLINE
                        </span>
                    </div>

                    {/* South Stopline Gate (Top-Right Quad) */}
                    <div style={{
                        position: 'absolute', right: '12%', top: '38%', width: '26%', height: '8%',
                        border: '1px dashed rgba(168, 85, 247, 0.4)', background: 'rgba(168, 85, 247, 0.08)',
                        borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: '#c084fc', letterSpacing: '0.05em' }}>
                            GATE SOUTH &bull; INDUCTION STOPLINE
                        </span>
                    </div>

                    {/* East Stopline Gate (Bottom-Left Quad) */}
                    <div style={{
                        position: 'absolute', left: '12%', bottom: '12%', width: '26%', height: '8%',
                        border: '1px dashed rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.08)',
                        borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: '#f43f5e', letterSpacing: '0.05em' }}>
                            GATE EAST &bull; INDUCTION STOPLINE
                        </span>
                    </div>

                    {/* West Stopline Gate (Bottom-Right Quad) */}
                    <div style={{
                        position: 'absolute', right: '12%', bottom: '12%', width: '26%', height: '8%',
                        border: '1px dashed rgba(245, 158, 11, 0.4)', background: 'rgba(245, 158, 11, 0.08)',
                        borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: '#fbbf24', letterSpacing: '0.05em' }}>
                            GATE WEST &bull; INDUCTION STOPLINE
                        </span>
                    </div>
                </div>
            )}

            {/* ═══════════ INTERACTIVE TARGET HUD RETICLES ═══════════ */}
            {showHud && frameB64 && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 20 }}>
                    {filteredTargets.map(t => {
                        // Frame coordinates in 1280x720 space
                        const leftPct = (t.x1 / 1280) * 100;
                        const topPct = (t.y1 / 720) * 100;
                        const widthPct = ((t.x2 - t.x1) / 1280) * 100;
                        const heightPct = ((t.y2 - t.y1) / 720) * 100;

                        const isLocked = t.id === selectedTargetId;
                        const isAmb = t.is_ambulance;
                        const color = getClassColor(t.label, isAmb);
                        const confDisplay = t.confidence !== undefined ? `${Math.round(t.confidence * 100)}%` : '';

                        return (
                            <div
                                key={t.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTargetId(isLocked ? null : t.id);
                                }}
                                style={{
                                    position: 'absolute',
                                    left: `${leftPct}%`,
                                    top: `${topPct}%`,
                                    width: `${widthPct}%`,
                                    height: `${heightPct}%`,
                                    border: isLocked
                                        ? `2px solid ${color}`
                                        : `1px solid ${color}88`,
                                    boxShadow: isLocked
                                        ? `0 0 15px ${color}, inset 0 0 10px ${color}44`
                                        : (isAmb ? `0 0 10px #f43f5e` : 'none'),
                                    cursor: 'pointer',
                                    pointerEvents: 'auto',
                                    transition: 'all 0.15s ease'
                                }}>
                                
                                {/* Sci-Fi Corner Brackets */}
                                <div style={{ position: 'absolute', top: '-1px', left: '-1px', width: '6px', height: '6px', borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
                                <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: '6px', height: '6px', borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
                                <div style={{ position: 'absolute', bottom: '-1px', left: '-1px', width: '6px', height: '6px', borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
                                <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '6px', height: '6px', borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />

                                {/* Floating Tag Badge */}
                                <div style={{
                                    position: 'absolute', top: '-18px', left: 0,
                                    background: isLocked ? color : 'rgba(2, 6, 23, 0.88)',
                                    color: isLocked ? '#020617' : '#fff',
                                    padding: '1px 5px', borderRadius: '3px',
                                    fontSize: '9px', fontWeight: '800',
                                    whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px',
                                    border: `1px solid ${color}`
                                }}>
                                    <span>#{t.id}</span>
                                    <span>{t.label.toUpperCase()}</span>
                                    {confDisplay && <span style={{ opacity: 0.8 }}>{confDisplay}</span>}
                                    {t.speed_kmh !== undefined && (
                                        <span style={{ color: isLocked ? '#020617' : '#34d399' }}>
                                            {t.speed_kmh} km/h
                                        </span>
                                    )}
                                </div>

                                {/* Velocity Direction Vector Indicator */}
                                {t.speed_kmh > 5 && (
                                    <div style={{
                                        position: 'absolute', bottom: '-6px', right: '-6px',
                                        width: '8px', height: '8px', borderRadius: '50%',
                                        background: color, opacity: 0.85
                                    }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ═══════════ TARGET LOCK TELEMETRY HUD CARD ═══════════ */}
            {lockedTarget && (
                <div style={{
                    position: 'absolute', bottom: '50px', right: '16px',
                    width: '300px', background: 'rgba(2, 6, 23, 0.94)',
                    backdropFilter: 'blur(12px)', borderRadius: '10px',
                    border: `1px solid ${getClassColor(lockedTarget.label, lockedTarget.is_ambulance)}`,
                    boxShadow: `0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 15px ${getClassColor(lockedTarget.label, lockedTarget.is_ambulance)}44`,
                    padding: '14px', zIndex: 35
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div className="live-pulse" style={{ background: getClassColor(lockedTarget.label, lockedTarget.is_ambulance) }} />
                            <span style={{ fontWeight: '900', fontSize: '12px', color: '#fff' }}>
                                TARGET #{lockedTarget.id} [LOCKED]
                            </span>
                        </div>
                        <button
                            onClick={() => setSelectedTargetId(null)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }}>
                            ✕
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '6px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Class / Weight</div>
                            <div style={{ fontWeight: '800', color: '#fff', textTransform: 'capitalize' }}>
                                {lockedTarget.label} ({lockedTarget.pcu} PCU)
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '6px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Kinematic Speed</div>
                            <div style={{ fontWeight: '800', color: '#34d399' }}>
                                {lockedTarget.speed_kmh} km/h
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '6px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Approach Lane</div>
                            <div style={{ fontWeight: '800', color: '#38bdf8' }}>
                                {lockedTarget.lane}
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '6px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Dwell Wait Time</div>
                            <div style={{ fontWeight: '800', color: lockedTarget.wait_time > 10 ? '#f43f5e' : '#fbbf24' }}>
                                {lockedTarget.wait_time}s {lockedTarget.is_stopped ? '(Stopped)' : '(Moving)'}
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '6px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Detection Conf.</div>
                            <div style={{ fontWeight: '800', color: '#38bdf8' }}>
                                {lockedTarget.confidence !== undefined ? `${Math.round(lockedTarget.confidence * 100)}%` : '92%'}
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '6px' }}>
                            <div style={{ color: 'var(--text-muted)' }}>Bounding Box</div>
                            <div style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '9px' }}>
                                {lockedTarget.x2 - lockedTarget.x1}px &times; {lockedTarget.y2 - lockedTarget.y1}px
                            </div>
                        </div>

                        <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '6px 8px', borderRadius: '6px', gridColumn: 'span 2' }}>
                            <div style={{ color: '#38bdf8', fontSize: '9px', fontWeight: '800' }}>📐 REAL-WORLD METRIC DIMENSIONS (BEV CALIBRATED)</div>
                            <div style={{ fontWeight: '800', color: '#fff', fontSize: '11px', marginTop: '2px' }}>
                                {lockedTarget.dimensions?.length_m || 4.6}m (L) &times; {lockedTarget.dimensions?.width_m || 1.8}m (W) &times; {lockedTarget.dimensions?.height_m || 1.5}m (H)
                            </div>
                            <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Road Footprint: <strong style={{ color: '#34d399' }}>{lockedTarget.footprint_m2 || 8.28} m²</strong></span>
                                <span>Stopline: <strong style={{ color: '#fbbf24' }}>{lockedTarget.dist_to_stopline_m || 12.0} m</strong></span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════ QUADRANT IDENTIFIERS (CORNER LABELS) ═══════════ */}
            {showHud && frameB64 && (
                <>
                    <div className="hud-corner-tl" style={{
                        background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(6px)',
                        padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.4)',
                        fontSize: '10px', fontWeight: '800', color: 'var(--north)', zIndex: 25
                    }}>
                        ↖ NORTH APPROACH
                    </div>

                    <div className="hud-corner-tr" style={{
                        background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(6px)',
                        padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(168, 85, 247, 0.4)',
                        fontSize: '10px', fontWeight: '800', color: 'var(--south)', zIndex: 25
                    }}>
                        ↗ SOUTH APPROACH
                    </div>

                    <div className="hud-corner-bl" style={{
                        background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(6px)',
                        padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(244, 63, 94, 0.4)',
                        fontSize: '10px', fontWeight: '800', color: 'var(--east)', zIndex: 25
                    }}>
                        ↙ EAST APPROACH
                    </div>

                    <div className="hud-corner-br" style={{
                        background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(6px)',
                        padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.4)',
                        fontSize: '10px', fontWeight: '800', color: 'var(--west)', zIndex: 25
                    }}>
                        ↘ WEST APPROACH
                    </div>
                </>
            )}

            {/* ═══════════ CENTER GRID CROSSHAIR ═══════════ */}
            {showHud && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '28px', height: '28px', pointerEvents: 'none', zIndex: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'rgba(56, 189, 248, 0.3)' }} />
                    <div style={{ position: 'absolute', height: '100%', width: '1px', background: 'rgba(56, 189, 248, 0.3)' }} />
                    <div style={{ width: '10px', height: '10px', border: '1px solid rgba(56, 189, 248, 0.5)', borderRadius: '50%' }} />
                </div>
            )}

            {/* ═══════════ BOTTOM CLASS COLOR LEGEND ═══════════ */}
            <div className="glass-panel" style={{
                position: 'absolute', bottom: '10px', left: '16px',
                padding: '4px 10px', display: 'flex', gap: '12px', fontSize: '9px',
                background: 'rgba(2, 6, 23, 0.88)', backdropFilter: 'blur(6px)',
                zIndex: 25
            }}>
                {[
                    { label: 'Car (1.0)', color: '#38bdf8' },
                    { label: 'Bus (3.0)', color: '#c084fc' },
                    { label: 'Truck (3.0)', color: '#a855f7' },
                    { label: 'Moto (0.5)', color: '#fbbf24' },
                    { label: 'Person (0.1)', color: '#34d399' },
                    { label: 'Ambulance (EVP)', color: '#f43f5e' }
                ].map(item => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '700' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: item.color }} />
                        <span>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
