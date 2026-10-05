export default function DetectionStats({ vehicleTypes = {} }) {
    const stats = [
        { label: 'Passenger Cars', key: 'car', weight: 1.0, color: 'var(--blue)', icon: '🚗' },
        { label: 'Heavy Trucks', key: 'truck', weight: 3.0, color: 'var(--purple)', icon: '🚚' },
        { label: 'Buses / HCV', key: 'bus', weight: 3.0, color: 'var(--green)', icon: '🚌' },
        { label: 'Motorcycles', key: 'motorcycle', weight: 0.5, color: 'var(--yellow)', icon: '🏍️' }
    ];

    const carCount = vehicleTypes.car || 0;
    const truckCount = vehicleTypes.truck || 0;
    const busCount = vehicleTypes.bus || 0;
    const motoCount = vehicleTypes.motorcycle || 0;
    const totalCount = carCount + truckCount + busCount + motoCount || 1;

    const totalPcu = (carCount * 1.0 + truckCount * 3.0 + busCount * 3.0 + motoCount * 0.5).toFixed(1);

    return (
        <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div className="section-title">
                        <div className="section-dot" style={{ background: 'var(--blue)' }} />
                        IRC:106 Vehicle Classes & PCU
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Passenger Car Units (Car = 1.0, Bus/Truck = 3.0, Moto = 0.5)
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: '12px', color: 'var(--yellow)', fontWeight: '800' }}>
                        {totalPcu} PCU
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        Equiv. Road Load
                    </div>
                </div>
            </div>

            {/* PCU Distribution Visual Bar */}
            <div style={{
                marginTop: '10px',
                height: '6px',
                borderRadius: '6px',
                overflow: 'hidden',
                display: 'flex',
                background: 'rgba(255, 255, 255, 0.05)'
            }}>
                <div style={{ width: `${(carCount / totalCount) * 100}%`, background: 'var(--blue)', transition: 'width 0.3s ease' }} title={`Cars: ${carCount} (${(carCount * 1.0).toFixed(1)} PCU)`} />
                <div style={{ width: `${(truckCount / totalCount) * 100}%`, background: 'var(--purple)', transition: 'width 0.3s ease' }} title={`Trucks: ${truckCount} (${(truckCount * 3.0).toFixed(1)} PCU)`} />
                <div style={{ width: `${(busCount / totalCount) * 100}%`, background: 'var(--green)', transition: 'width 0.3s ease' }} title={`Buses: ${busCount} (${(busCount * 3.0).toFixed(1)} PCU)`} />
                <div style={{ width: `${(motoCount / totalCount) * 100}%`, background: 'var(--yellow)', transition: 'width 0.3s ease' }} title={`Motorcycles: ${motoCount} (${(motoCount * 0.5).toFixed(1)} PCU)`} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                {stats.map(item => {
                    const count = vehicleTypes[item.key] || 0;
                    const pcuSubtotal = (count * item.weight).toFixed(1);
                    return (
                        <div key={item.key} style={{
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '10px',
                            padding: '10px 12px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <div className="mono" style={{ fontSize: '20px', fontWeight: '800', color: item.color }}>
                                    {count}
                                </div>
                                <span className="mono" style={{ fontSize: '11px', color: item.color, fontWeight: '700' }}>
                                    {pcuSubtotal} PCU
                                </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>{item.icon}</span> {item.label}
                                </div>
                                <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                                    (×{item.weight})
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
