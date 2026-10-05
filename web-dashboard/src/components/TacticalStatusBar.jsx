export default function TacticalStatusBar({ metrics = {}, signals = {}, audioSiren = {}, onOpenBlueprint }) {
    const isEmergency = signals?.emergency_active || false;
    const emergencyLane = signals?.emergency_lane;
    const currentLane = signals?.current_lane || 'North';
    const currentSig = signals?.signals?.[currentLane];
    const stateStr = currentSig?.state || 'green';
    const timeLeft = currentSig?.time_left ? Math.ceil(currentSig.time_left) : 0;
    const websterCo = signals?.webster_cycle_length ? Math.round(signals.webster_cycle_length) : 60;
    const totalPcu = metrics?.total_pcu || 0;
    const totalVeh = metrics?.total_vehicles || 0;
    const sirenActive = audioSiren?.siren_active || false;
    const fps = parseFloat(metrics?.fps || metrics?.current_fps || 0).toFixed(1);

    return (
        <footer style={{
            height: '32px',
            background: 'rgba(3, 7, 18, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            zIndex: 60,
            userSelect: 'none'
        }}>
            {/* Left Segment: Intersection & Active Signal Phase */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="live-pulse" />
                    <span className="mono" style={{ color: '#fff', fontWeight: '800' }}>
                        INT-8042-4WAY
                    </span>
                </div>

                <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                        Active Phase:
                    </span>
                    {isEmergency ? (
                        <span style={{
                            color: '#f43f5e', fontWeight: '800',
                            background: 'rgba(244, 63, 94, 0.2)', padding: '1px 6px', borderRadius: '4px',
                            border: '1px solid var(--red)'
                        }}>
                            🚨 EMERGENCY PREEMPTION ({emergencyLane?.toUpperCase()})
                        </span>
                    ) : (
                        <span style={{
                            color: stateStr === 'green' ? 'var(--green)' : 'var(--yellow)',
                            fontWeight: '800'
                        }}>
                            {currentLane.toUpperCase()} {stateStr.toUpperCase()} ({timeLeft}s)
                        </span>
                    )}
                </div>

                <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

                <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                        Webster Cycle:
                    </span>{' '}
                    <span className="mono" style={{ color: '#38bdf8', fontWeight: '700' }}>
                        C₀ = {websterCo}s
                    </span>
                </div>
            </div>

            {/* Center Segment: Live Road Load (Vehicles & PCU) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                        Road Load:
                    </span>{' '}
                    <strong style={{ color: '#fff' }}>{totalVeh}v</strong>{' '}
                    <span style={{ color: '#38bdf8' }}>({totalPcu} PCU)</span>
                </div>

                <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                        Acoustic Siren:
                    </span>
                    {sirenActive ? (
                        <span style={{ color: '#f43f5e', fontWeight: '800' }}>● SIREN DETECTED</span>
                    ) : (
                        <span style={{ color: 'var(--green)', fontWeight: '700' }}>○ STANDBY (600-1600Hz)</span>
                    )}
                </div>

                <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

                <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                        V2X:
                    </span>{' '}
                    <span style={{ color: '#c084fc', fontWeight: '700' }}>SAE J2735 SPaT</span>
                </div>
            </div>

            {/* Right Segment: Engine Rate & Spec Modal Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                        Footprint:
                    </span>{' '}
                    <span className="mono" style={{ color: '#38bdf8', fontWeight: '700' }}>
                        {metrics?.total_footprint_m2 || 0} m²
                    </span>
                </div>

                <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

                <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                        Model:
                    </span>{' '}
                    <span style={{ color: '#c084fc', fontWeight: '700' }}>
                        {metrics?.active_model_label ? metrics.active_model_label.split(' ')[0] : 'YOLOv11'}
                    </span>
                </div>

                <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

                <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                        Inference:
                    </span>{' '}
                    <span className="mono" style={{ color: 'var(--green)', fontWeight: '700' }}>
                        {fps} FPS
                    </span>
                </div>

                <button
                    onClick={onOpenBlueprint}
                    style={{
                        background: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        color: '#38bdf8',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    <span>📐</span> Blueprint & Formulas
                </button>
            </div>
        </footer>
    );
}
