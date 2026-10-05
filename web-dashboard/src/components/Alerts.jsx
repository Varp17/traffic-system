export default function Alerts({ alerts = [] }) {
    return (
        <div className="glass-panel" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="section-title">
                    <div className="section-dot" style={{ background: alerts.length > 0 ? 'var(--red)' : 'var(--green)' }} />
                    Active Safety & Kinematic Alerts
                </div>
                {alerts.length > 0 && (
                    <span style={{
                        background: 'rgba(244, 63, 94, 0.2)',
                        border: '1px solid var(--red)',
                        color: 'var(--red)',
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '2px 8px',
                        borderRadius: '12px'
                    }}>
                        {alerts.length} ANOMALIES
                    </span>
                )}
            </div>

            <div style={{ marginTop: '12px', flex: 1, overflowY: 'auto' }}>
                {alerts.length === 0 ? (
                    <div style={{
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        textAlign: 'center',
                        padding: '20px',
                        background: 'rgba(16, 185, 129, 0.04)',
                        border: '1px dashed rgba(16, 185, 129, 0.2)',
                        borderRadius: '8px'
                    }}>
                        <span style={{ color: 'var(--green)', marginRight: '6px' }}>✓</span>
                        All 4 approaches clear &bull; No active hazards
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {alerts.map((a, i) => {
                            let bg = 'rgba(56, 189, 248, 0.1)';
                            let border = 'var(--blue)';
                            let badge = 'INFO';
                            let icon = 'ℹ️';

                            if (a.severity === 'critical') {
                                bg = 'rgba(244, 63, 94, 0.18)';
                                border = 'var(--red)';
                                badge = 'CRITICAL';
                                icon = '💥';
                            } else if (a.severity === 'high') {
                                bg = 'rgba(251, 146, 60, 0.18)';
                                border = 'var(--orange)';
                                badge = 'HIGH';
                                icon = '⚠️';
                            } else if (a.severity === 'medium') {
                                bg = 'rgba(245, 158, 11, 0.18)';
                                border = 'var(--yellow)';
                                badge = 'WARN';
                                icon = '⚡';
                            }

                            return (
                                <div key={i} style={{
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    fontSize: '11px',
                                    display: 'flex',
                                    gap: '10px',
                                    alignItems: 'flex-start',
                                    background: bg,
                                    borderLeft: `3px solid ${border}`,
                                    borderTop: '1px solid rgba(255,255,255,0.04)',
                                    borderRight: '1px solid rgba(255,255,255,0.04)',
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    animation: 'fadeIn 0.25s ease'
                                }}>
                                    <span style={{ fontSize: '14px', marginTop: '1px' }}>{a.emoji || icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                            <span style={{
                                                fontSize: '9px',
                                                fontWeight: '800',
                                                color: border,
                                                letterSpacing: '0.05em'
                                            }}>
                                                {badge} {a.lane ? `&bull; ${a.lane}` : ''}
                                            </span>
                                        </div>
                                        <div style={{ color: '#fff', fontWeight: '600' }}>
                                            {a.message || a.type}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
