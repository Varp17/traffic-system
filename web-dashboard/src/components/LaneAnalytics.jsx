export default function LaneAnalytics({ laneStats = {} }) {
    const lanes = ['North', 'South', 'East', 'West'];

    return (
        <div className="glass-panel" style={{ padding: '16px' }}>
            <div className="section-title">
                <div className="section-dot" style={{ background: 'var(--purple)' }} />
                Approach Analytics & Queue Density
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                {lanes.map(lane => {
                    const stats = laneStats[lane] || {};
                    const queue = stats.queue_length || 0;
                    const count = stats.vehicle_count || 0;
                    const pcu = stats.pcu_count ?? stats.pcu ?? count;
                    const speed = Math.round(stats.avg_speed_kmh ?? stats.avg_speed ?? 0);
                    const ci_raw = stats.congestion_index;
                    const density = ci_raw !== undefined ? Math.round(ci_raw * 100) : Math.round((stats.density_ratio || 0) * 100);
                    const wait = Math.round(stats.avg_wait_time || 0);

                    let barColor = 'var(--green)';
                    if (density >= 40) barColor = 'var(--yellow)';
                    if (density >= 75) barColor = 'var(--red)';

                    const nameColor = `var(--${lane.toLowerCase()})`;

                    let speedTag = { label: 'FREE FLOW', color: 'var(--green)', bg: 'rgba(16, 185, 129, 0.12)' };
                    if (speed < 20) {
                        speedTag = { label: 'HEAVY QUEUE', color: 'var(--red)', bg: 'rgba(244, 63, 94, 0.12)' };
                    } else if (speed < 40) {
                        speedTag = { label: 'MODERATE', color: 'var(--yellow)', bg: 'rgba(245, 158, 11, 0.12)' };
                    }

                    return (
                        <div key={lane} style={{
                            background: 'rgba(15, 23, 42, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            borderRadius: '10px',
                            padding: '10px 12px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '800' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: nameColor, boxShadow: `0 0 8px ${nameColor}` }} />
                                    <span style={{ color: nameColor }}>{lane} Approach</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: '9px',
                                        fontWeight: '800',
                                        color: speedTag.color,
                                        background: speedTag.bg,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: `1px solid ${speedTag.color}40`
                                    }}>
                                        {speedTag.label}
                                    </span>
                                    <div className="mono" style={{ fontSize: '11px', color: '#fff', fontWeight: '700' }}>
                                        {count} veh <span style={{ color: 'var(--blue)' }}>({pcu} PCU)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Density Progress Bar */}
                            <div style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '6px', height: '6px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    background: barColor,
                                    width: `${Math.min(density, 100)}%`,
                                    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1), background 0.4s ease',
                                    borderRadius: '6px'
                                }} />
                            </div>

                            <div className="mono" style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginTop: '8px',
                                fontSize: '10px',
                                color: 'var(--text-muted)'
                            }}>
                                <span>Density: <strong style={{ color: '#fff' }}>{density}%</strong></span>
                                <span>Speed: <strong style={{ color: '#fff' }}>{speed} km/h</strong></span>
                                <span>Queue: <strong style={{ color: '#fff' }}>{queue}</strong></span>
                                <span>Avg Wait: <strong style={{ color: '#fff' }}>{wait}s</strong></span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
