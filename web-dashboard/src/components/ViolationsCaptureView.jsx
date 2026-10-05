import React, { useState, useEffect } from 'react';

export default function ViolationsCaptureView() {
  const [selectedViolationId, setSelectedViolationId] = useState('MH02EE4921');
  const [inspectorViewMode, setInspectorViewMode] = useState('camera'); // 'camera' | 'full'
  const [zoomLevel, setZoomLevel] = useState(1.0); // 1.0 (natural single camera) to max 1.5
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [liveIncidents, setLiveIncidents] = useState([]);
  const [toast, setToast] = useState({ show: false, text: '', icon: '', isError: false });

  const triggerToast = (text, icon, isError = false) => {
    setToast({ show: true, text, icon, isError });
    setTimeout(() => {
      setToast({ show: false, text: '', icon: '', isError: false });
    }, 4000);
  };

  useEffect(() => {
    let isMounted = true;
    const fetchIncidents = async () => {
      try {
        const res = await fetch('/api/incidents');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setLiveIncidents(data);
            // Auto-select latest live camera event if currently on default mock
            if (data.length > 0) {
              const firstLive = data.find((i) => i.camera_frame_b64 || i.frame_b64);
              if (firstLive && selectedViolationId === 'MH02EE4921') {
                setSelectedViolationId(firstLive.id);
              }
            }
          }
        }
      } catch (e) {}
    };
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const baselineViolations = [
    {
      id: 'MH02EE4921',
      cropId: 'CROP #V-1049',
      challanId: '#CH-88219',
      type: 'red_light',
      typeLabel: 'RED LIGHT VIOLATION',
      severity: 'error',
      junction: 'Junction 04: East Approach',
      time: '10:47:33 UTC',
      status: 'VALIDATED',
      speed: '44 km/h',
      breachDetail: 'STOP LINE BREACH: 1.84m',
      phaseDetail: 'PHASE: RED +3.8s',
      plate: 'MH 02 EE 4921',
      plateRaw: 'MH02EE4921',
      confidence: '99.8%',
      vehicleDesc: 'Maharashtra Private SUV',
      modelDesc: 'Hyundai Creta (White)',
      regPool: 'Vahan National DB',
      fine: '$100 / ₹1,000',
      croppedImage:
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=700&q=80',
      fullImage:
        'https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=1200&q=80',
      plateCropImage:
        'https://images.unsplash.com/photo-1596707323674-88544b61ef0a?auto=format&fit=crop&w=300&q=80',
      bbox: '[1240, 840, 420, 310]',
    },
    {
      id: 'DL01AB7102',
      cropId: 'CROP #V-1048',
      challanId: '#CH-88218',
      type: 'footpath',
      typeLabel: 'FOOTPATH ENCROACHMENT',
      severity: 'tertiary',
      junction: 'Junction 04: East Walkway',
      time: '10:46:12 UTC',
      status: 'PENDING REVIEW',
      speed: '28 km/h',
      breachDetail: 'PEDESTRIAN CORRIDOR INFRACTION',
      phaseDetail: 'SIDEWALK BREACH',
      plate: 'DL 01 AB 7102',
      plateRaw: 'DL01AB7102',
      confidence: '98.9%',
      vehicleDesc: 'Delhi Commercial Two-Wheeler',
      modelDesc: 'Honda Activa (Orange)',
      regPool: 'Delhi RTO Database',
      fine: '$75 / ₹750',
      croppedImage:
        'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=700&q=80',
      fullImage:
        'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=1200&q=80',
      plateCropImage:
        'https://images.unsplash.com/photo-1596707323674-88544b61ef0a?auto=format&fit=crop&w=300&q=80',
      bbox: '[620, 480, 240, 190]',
    },
    {
      id: 'KA03MN3390',
      cropId: 'CROP #V-1047',
      challanId: '#CH-88217',
      type: 'wrong_way',
      typeLabel: 'WRONG-WAY ENTRY',
      severity: 'error',
      junction: 'Junction 02: Riverside Approach',
      time: '10:39:55 UTC',
      status: 'UNIT DISPATCHED',
      speed: '52 km/h',
      breachDetail: 'COUNTER-FLOW VECTORS: 45m',
      phaseDetail: 'CRITICAL HAZARD',
      plate: 'KA 03 MN 3390',
      plateRaw: 'KA03MN3390',
      confidence: '99.7%',
      vehicleDesc: 'Karnataka Private Sedan',
      modelDesc: 'Honda City (Silver)',
      regPool: 'Vahan National DB',
      fine: '$150 / ₹1,500',
      croppedImage:
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=700&q=80',
      fullImage:
        'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
      plateCropImage:
        'https://images.unsplash.com/photo-1596707323674-88544b61ef0a?auto=format&fit=crop&w=300&q=80',
      bbox: '[890, 510, 380, 260]',
    },
    {
      id: 'HR26BC1198',
      cropId: 'CROP #V-1046',
      challanId: '#CH-88216',
      type: 'crosswalk',
      typeLabel: 'CROSSWALK BLOCKADE',
      severity: 'tertiary-fixed-dim',
      junction: 'Junction 07: Central Square',
      time: '10:31:04 UTC',
      status: 'NOTICE TRANSMITTED',
      speed: '0 km/h (IDLE)',
      breachDetail: 'ZEBRA PATH DWELL: 48s',
      phaseDetail: 'CROSSWALK BLOCK',
      plate: 'HR 26 BC 1198',
      plateRaw: 'HR26BC1198',
      confidence: '99.1%',
      vehicleDesc: 'Haryana Commercial Van',
      modelDesc: 'Ford Transit (Blue)',
      regPool: 'National Commercial Fleet',
      fine: '$50 / ₹500',
      croppedImage:
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=700&q=80',
      fullImage:
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
      plateCropImage:
        'https://images.unsplash.com/photo-1596707323674-88544b61ef0a?auto=format&fit=crop&w=300&q=80',
      bbox: '[450, 680, 480, 320]',
    },
  ];

  // Merge live cropped OpenCV incidents into violation list
  const liveViolations = liveIncidents
    .filter((inc) => inc.camera_frame_b64 || inc.cropped_image_b64 || inc.frame_b64)
    .map((inc) => {
      const camSrc = inc.camera_frame_b64
        ? `data:image/jpeg;base64,${inc.camera_frame_b64}`
        : (inc.frame_b64 ? `data:image/jpeg;base64,${inc.frame_b64}` : `data:image/jpeg;base64,${inc.cropped_image_b64}`);
      const fullSrc = inc.full_4way_b64
        ? `data:image/jpeg;base64,${inc.full_4way_b64}`
        : camSrc;
      return {
        id: inc.id,
        cropId: `CROP #${inc.id}`,
        challanId: `#CH-${inc.id.replace('INC_', '')}`,
        type: inc.type === 'ambulance' ? 'ambulance' : (inc.type === 'accident' ? 'accident' : 'red_light'),
        typeLabel: `${inc.type.toUpperCase()} CAPTURE`,
        severity: inc.type === 'ambulance' ? 'secondary' : 'error',
        junction: `${inc.lane || 'Approach'} Camera`,
        time: new Date(inc.timestamp * 1000).toLocaleTimeString(),
        status: 'SINGLE CAMERA CAPTURE',
        speed: '36 km/h',
        breachDetail: inc.description || 'AUTOMATED SINGLE CAMERA CAPTURE',
        phaseDetail: 'REAL-TIME OPENCV CAPTURE',
        plate: 'MH 12 TS ' + inc.id.slice(-4),
        plateRaw: 'MH12TS' + inc.id.slice(-4),
        confidence: '99.2%',
        vehicleDesc: 'Target Vehicle in Camera Lane',
        modelDesc: `${inc.lane || 'Target'} Camera Feed`,
        regPool: 'OpenCV Real-Time Isolation',
        fine: '$100 / ₹1,000',
        cameraImage: camSrc,
        croppedImage: camSrc,
        fullImage: fullSrc,
        plateCropImage: camSrc,
        bbox: inc.bbox || '[0, 0, 960, 540]',
      };
    });

  const violationsData = [...liveViolations, ...baselineViolations];
  const filteredViolations = violationsData.filter((v) => {
    if (activeFilter === 'red_light' && v.type !== 'red_light') return false;
    if (activeFilter === 'footpath' && v.type !== 'footpath') return false;
    if (activeFilter === 'wrong_way' && v.type !== 'wrong_way') return false;
    if (activeFilter === 'speeding' && v.type !== 'speeding') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        v.plate.toLowerCase().includes(q) ||
        v.vehicleDesc.toLowerCase().includes(q) ||
        v.modelDesc.toLowerCase().includes(q) ||
        v.junction.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeViolation =
    violationsData.find((v) => v.id === selectedViolationId) || violationsData[0];

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* 1. Top Command Telemetry Shelf */}
      <section className="py-space-md flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
        <div className="space-y-1">
          <div className="flex items-center gap-space-xs font-mono text-[10px]">
            <span className="inline-block w-2 h-2 rounded-full bg-error animate-pulse"></span>
            <span className="uppercase tracking-wider text-error font-bold">
              Active Enforcement Engine
            </span>
            <span className="text-on-surface-variant">/</span>
            <span className="text-on-surface-variant">NODE: UK-ITCS-CAM-04X</span>
          </div>
          <h1 className="font-headline text-[22px] text-on-surface font-bold tracking-tight">
            Automated ANPR & Traffic Violation Enforcement Hub
          </h1>
          <p className="text-[12px] text-on-surface-variant max-w-4xl">
            Real-time deep learning pipeline isolations: sub-second vehicle perimeter cropping, neural OCR license plate deciphering, and autonomous e-challan execution.
          </p>
        </div>

        {/* Telemetry Aggregates */}
        <div className="grid grid-cols-3 gap-space-xs bg-surface-container-lowest p-space-xs rounded-xl shadow-sm border border-outline-variant/30">
          <div className="px-space-md py-space-xs bg-surface-container-low rounded-lg border border-outline-variant/20">
            <div className="flex items-center gap-1.5 text-on-surface-variant font-mono text-[9px] uppercase">
              <span className="material-symbols-outlined text-primary text-[14px]">gavel</span>
              <span>Violations Today</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1 font-mono">
              <span className="text-[26px] font-bold text-on-surface leading-none">42</span>
              <span className="text-[10px] text-secondary font-bold">+12.4%</span>
            </div>
          </div>

          <div className="px-space-md py-space-xs bg-surface-container-low rounded-lg border border-outline-variant/20">
            <div className="flex items-center gap-1.5 text-on-surface-variant font-mono text-[9px] uppercase">
              <span className="material-symbols-outlined text-secondary text-[14px]">document_scanner</span>
              <span>OCR Precision</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1 font-mono">
              <span className="text-[26px] font-bold text-secondary leading-none">99.4</span>
              <span className="text-[10px] text-secondary font-bold">%</span>
            </div>
          </div>

          <div className="px-space-md py-space-xs bg-surface-container-low rounded-lg border border-outline-variant/20">
            <div className="flex items-center gap-1.5 text-on-surface-variant font-mono text-[9px] uppercase">
              <span className="material-symbols-outlined text-tertiary text-[14px]">send_and_archive</span>
              <span>Dispatched</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1 font-mono">
              <span className="text-[26px] font-bold text-tertiary leading-none">39</span>
              <span className="text-[10px] text-on-surface-variant">/ 42</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Control & Filter Rail */}
      <section className="mt-space-sm mb-space-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm bg-surface-container-low p-space-xs rounded-xl shadow-sm border border-outline-variant/30">
        {/* Filter Tabs */}
        <div className="flex items-center gap-space-xs overflow-x-auto font-mono text-[11px]">
          {[
            { id: 'all', label: 'All Captures', count: 42 },
            { id: 'red_light', label: 'Red Light Jumps', count: 18 },
            { id: 'footpath', label: 'Footpath Encroachments', count: 11 },
            { id: 'wrong_way', label: 'Wrong-Way / Turns', count: 8 },
            { id: 'speeding', label: 'Speeding / Reckless', count: 5 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 transition-all font-semibold ${
                activeFilter === tab.id
                  ? 'bg-surface-container-highest text-primary border border-primary/30 shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                activeFilter === tab.id ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-space-xs w-full lg:w-96">
          <div className="relative w-full bg-surface-container-lowest rounded-lg flex items-center px-3 py-1.5 border border-outline-variant/30 focus-within:ring-1 focus-within:ring-primary">
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] mr-2">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search License Plate, Vehicle Make, or Junction..."
              className="bg-transparent text-on-surface font-body text-[12px] w-full outline-none placeholder:text-on-surface-variant/60"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-on-surface-variant hover:text-white">
                <span className="material-symbols-outlined text-[14px]">clear</span>
              </button>
            )}
          </div>
          <button
            onClick={() => triggerToast('Real-time violation cache synchronized.', 'sync', false)}
            className="px-2.5 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors border border-outline-variant/30"
            title="Refresh Capture Buffer"
          >
            <span className="material-symbols-outlined text-[18px]">sync</span>
          </button>
        </div>
      </section>

      {/* 3. Main Workstation Layout: Real-Time Auto-Cropped Violation Cards Stream vs Verification Inspector */}
      <div className="grid grid-cols-1 2xl:grid-cols-12 gap-space-md items-start">
        {/* Left 8 Cols: Real-Time Auto-Cropped Violations Feed */}
        <div className="2xl:col-span-8 flex flex-col gap-space-md">
          {filteredViolations.map((item) => {
            const isSelected = selectedViolationId === item.id;
            return (
              <article
                key={item.id}
                onClick={() => setSelectedViolationId(item.id)}
                className={`violation-card group bg-surface-container-low hover:bg-surface-container-high/90 rounded-xl overflow-hidden transition-all duration-200 shadow-md cursor-pointer relative border ${
                  isSelected ? 'border-primary ring-1 ring-primary shadow-xl' : 'border-outline-variant/30'
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  item.type === 'red_light' || item.type === 'wrong_way' ? 'bg-error' : 'bg-tertiary'
                }`}></div>

                <div className="p-space-md flex flex-col lg:flex-row gap-space-md">
                  {/* Cropped Vehicle Photo with Visual Overlay */}
                  <div className="relative w-full lg:w-72 h-48 lg:h-44 bg-surface-container-lowest rounded-lg overflow-hidden flex-shrink-0 border border-outline-variant/30">
                    <img
                      src={item.croppedImage}
                      alt={item.typeLabel}
                      className="w-full h-full object-cover filter contrast-125 transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Red Stop-Line Violation Bounding Indicator */}
                    <div className="absolute inset-x-2 bottom-2 bg-surface-container-lowest/85 backdrop-blur-md px-2 py-0.5 rounded flex items-center justify-between font-mono text-[9px] border border-outline-variant/20">
                      <span className={`flex items-center gap-1 font-bold ${
                        item.type === 'red_light' || item.type === 'wrong_way' ? 'text-error' : 'text-tertiary'
                      }`}>
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        {item.breachDetail}
                      </span>
                      <span className="text-primary font-bold">{item.cropId}</span>
                    </div>

                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded font-mono text-[9px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-md ${
                      item.type === 'red_light' || item.type === 'wrong_way'
                        ? 'bg-error text-on-error'
                        : 'bg-tertiary text-on-tertiary'
                    }`}>
                      <span className="material-symbols-outlined text-[13px]">traffic</span>
                      {item.phaseDetail}
                    </div>

                    <div className="absolute top-2 right-2 bg-surface-container-lowest/90 text-on-surface px-1.5 py-0.5 rounded font-mono text-[8px] font-semibold border border-outline-variant/30">
                      60 FPS SYNC
                    </div>
                  </div>

                  {/* Incident Forensics & High-Res License Plate Segment */}
                  <div className="flex-1 flex flex-col justify-between space-y-space-xs">
                    <div>
                      <div className="flex items-start justify-between gap-space-xs">
                        <div>
                          <div className="flex items-center gap-space-xs flex-wrap font-mono text-[10px]">
                            <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wide border ${
                              item.type === 'red_light' || item.type === 'wrong_way'
                                ? 'bg-error/20 text-error border-error/30'
                                : 'bg-tertiary/20 text-tertiary border-tertiary/30'
                            }`}>
                              {item.typeLabel}
                            </span>
                            <span className="text-on-surface-variant flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">location_on</span>
                              {item.junction}
                            </span>
                            <span className="text-on-surface-variant">{item.time}</span>
                          </div>
                          <h3 className="font-headline text-[15px] font-bold text-on-surface mt-1 flex items-center gap-2">
                            Automated Violation Notice Captured
                            <span className="px-1.5 py-0.5 rounded bg-secondary/15 text-secondary font-mono text-[9px] font-bold border border-secondary/30">
                              {item.status}
                            </span>
                          </h3>
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-[9px] text-on-surface-variant font-semibold">VELOCITY AT BREACH</div>
                          <div className="text-[16px] text-error font-bold">{item.speed}</div>
                        </div>
                      </div>

                      {/* High Res Zoomed OCR Plate Inset Container */}
                      <div className="mt-space-sm p-space-xs bg-surface-container rounded-lg flex items-center justify-between gap-space-sm border border-outline-variant/30">
                        <div className="flex items-center gap-space-md">
                          {/* Miniature Plate Crop */}
                          <div className="w-28 h-10 bg-surface-container-highest rounded overflow-hidden relative shadow-inner border border-outline-variant/40 flex items-center justify-center font-mono text-[13px] font-extrabold tracking-widest text-primary bg-black/60">
                            {item.plateRaw}
                          </div>
                          <div>
                            <div className="font-mono text-[9px] text-on-surface-variant uppercase flex items-center gap-1 font-semibold">
                              <span>ANPR Engine Recognition</span>
                              <span className="material-symbols-outlined text-secondary text-[12px]">verified</span>
                            </div>
                            <div className="font-mono text-[18px] text-primary font-bold tracking-widest leading-tight">
                              {item.plate}
                            </div>
                          </div>
                        </div>

                        <div className="text-right pr-2 hidden sm:block font-mono">
                          <span className="text-[10px] text-secondary font-bold bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">
                            {item.confidence} CONFIDENCE
                          </span>
                          <div className="text-[11px] text-on-surface-variant mt-1 font-medium">
                            {item.vehicleDesc}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-space-xs flex flex-wrap items-center justify-between gap-space-xs border-t border-outline-variant/20">
                      <div className="flex items-center gap-space-xs text-on-surface-variant font-mono text-[11px]">
                        <span className="material-symbols-outlined text-primary text-[15px]">receipt_long</span>
                        <span>
                          Auto-Challan: <strong className="text-on-surface font-bold">{item.challanId}</strong> ({item.fine})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedViolationId(item.id);
                            triggerToast(`Evidence Bundle ${item.challanId} loaded to Inspector.`, 'visibility');
                          }}
                          className="px-2.5 py-1 rounded bg-surface-container-highest hover:bg-surface-bright text-on-surface transition-colors flex items-center gap-1 border border-outline-variant/30"
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span> Evidence Bundle
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerToast(`Printing Electronic Citation Notice for ${item.plate}...`, 'print');
                          }}
                          className="px-2.5 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 font-bold transition-colors flex items-center gap-1 border border-primary/30"
                        >
                          <span className="material-symbols-outlined text-[14px]">print</span> Print Challan
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Right 4 Cols: Evidence Verification Inspector Drawer */}
        <aside className="2xl:col-span-4 sticky top-20 bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-md shadow-xl backdrop-blur-md border border-outline-variant/30">
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-1 border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
              <h2 className="font-headline text-[15px] font-bold text-on-surface">Evidence Verification Inspector</h2>
            </div>
            <span className="font-mono text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded uppercase font-bold border border-primary/20">
              FORENSIC HUD
            </span>
          </div>

          {/* Single Camera View vs 4-Way System Overview Toggle */}
          <div className="bg-surface-container-lowest p-1 rounded-lg flex items-center border border-outline-variant/30 font-mono text-[11px]">
            <button
              onClick={() => setInspectorViewMode('camera')}
              className={`flex-1 py-1 rounded text-center font-bold transition-all flex items-center justify-center gap-1.5 ${
                inspectorViewMode !== 'full'
                  ? 'bg-surface-container-high text-primary shadow-sm border border-primary/20'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">videocam</span>
              <span>Target Camera View</span>
            </button>
            <button
              onClick={() => setInspectorViewMode('full')}
              className={`flex-1 py-1 rounded text-center font-bold transition-all flex items-center justify-center gap-1.5 ${
                inspectorViewMode === 'full'
                  ? 'bg-surface-container-high text-primary shadow-sm border border-primary/20'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">grid_view</span>
              <span>4-Way System Context</span>
            </button>
          </div>

          {/* Dynamic Visual Canvas Area (Target Camera View by default, not 4-camera and not over-zoomed) */}
          <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden flex items-center justify-center border border-outline-variant/30">
            {inspectorViewMode === 'full' ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
                <img
                  src={activeViolation.fullImage}
                  alt="Full frame context"
                  className="w-full h-full object-contain filter contrast-110"
                />
                <div className="absolute top-2 right-2 bg-black/80 px-2 py-0.5 rounded font-mono text-[9px] text-on-surface-variant border border-white/10 font-bold">
                  4-WAY COMPOSITE
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
                <img
                  src={activeViolation.cameraImage || activeViolation.croppedImage || activeViolation.fullImage}
                  alt={activeViolation.plate}
                  style={{
                    transform: `scale(${zoomLevel})`,
                    transition: 'transform 0.2s ease',
                  }}
                  className="w-full h-full object-contain filter contrast-110"
                />

                {/* Target Camera Indicator Badge */}
                <div className="absolute top-2 left-2 font-mono text-[9px] text-primary bg-black/85 px-2 py-0.5 rounded border border-primary/40 font-bold flex items-center gap-1 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  <span>📹 {activeViolation.junction || 'TARGET CAMERA'}</span>
                </div>

                {/* Subtle Interactive Zoom Selector */}
                <div className="absolute top-2 right-2 bg-black/85 backdrop-blur-md px-1 py-0.5 rounded-md flex items-center gap-1 border border-outline-variant/40 font-mono text-[9px]">
                  <span className="text-on-surface-variant px-1 font-semibold">ZOOM:</span>
                  {[1.0, 1.25, 1.5].map((z) => (
                    <button
                      key={z}
                      onClick={() => setZoomLevel(z)}
                      className={`px-1.5 py-0.5 rounded transition-all font-bold ${
                        zoomLevel === z
                          ? 'bg-primary text-black'
                          : 'text-on-surface-variant hover:text-white'
                      }`}
                    >
                      {z === 1.0 ? '1.0x (Full)' : `${z}x`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="absolute bottom-2 left-2 right-2 bg-surface-container-lowest/90 backdrop-blur-md px-2.5 py-1 rounded flex items-center justify-between text-on-surface font-mono text-[9px] border border-outline-variant/30">
              <span className="text-on-surface-variant font-semibold">
                CAMERA: {activeViolation.junction || 'TARGET CAM'}
              </span>
              <span className="text-secondary font-bold">
                {inspectorViewMode === 'full' ? 'MODE: 4-WAY QUAD VIEW' : `MODE: SINGLE CAMERA (${zoomLevel}x PERSPECTIVE)`}
              </span>
            </div>
          </div>

          {/* Raw OCR Engine Diagnostic Metadata */}
          <div className="space-y-1.5 bg-surface-container p-space-sm rounded-lg border border-outline-variant/30 font-mono">
            <div className="flex items-center justify-between text-on-surface-variant text-[10px] pb-1 border-b border-outline-variant/20">
              <span className="font-semibold">ALGORITHMIC EXTRACTION</span>
              <span className="text-secondary font-bold">LPR-NET V3.2 NEURAL OCR</span>
            </div>

            <div className="grid grid-cols-2 gap-space-xs text-[10px]">
              <div className="bg-surface-container-low p-2 rounded border border-outline-variant/20">
                <span className="text-on-surface-variant block text-[8px] uppercase">RAW OCR TEXT</span>
                <span className="text-primary font-bold tracking-wider text-[12px]">{activeViolation.plateRaw}</span>
              </div>
              <div className="bg-surface-container-low p-2 rounded border border-outline-variant/20">
                <span className="text-on-surface-variant block text-[8px] uppercase">CONFIDENCE SCORE</span>
                <span className="text-secondary font-bold text-[12px]">{activeViolation.confidence}</span>
              </div>
              <div className="bg-surface-container-low p-2 rounded border border-outline-variant/20">
                <span className="text-on-surface-variant block text-[8px] uppercase">CLASSIFICATION</span>
                <span className="text-on-surface font-semibold truncate block">{activeViolation.modelDesc}</span>
              </div>
              <div className="bg-surface-container-low p-2 rounded border border-outline-variant/20">
                <span className="text-on-surface-variant block text-[8px] uppercase">REGISTRATION POOL</span>
                <span className="text-on-surface font-semibold truncate block">{activeViolation.regPool}</span>
              </div>
            </div>

            {/* Signal State Snapshot Sync */}
            <div className="mt-1 pt-1 flex items-center justify-between bg-surface-container-low px-2 py-1.5 rounded border border-outline-variant/20">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-error text-[18px]">traffic</span>
                <div>
                  <span className="text-[10px] text-on-surface block font-bold leading-tight">Stop Line Signal Phase</span>
                  <span className="text-[8px] text-on-surface-variant">Camera & Signal Hardware Time-Synced</span>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded bg-error text-on-error font-bold">
                RED (PHASE 2)
              </span>
            </div>
          </div>

          {/* Forensic Checklist */}
          <div className="space-y-1.5 font-mono text-[10px]">
            <span className="text-on-surface-variant uppercase tracking-wider font-bold block">
              Verification Checklist
            </span>
            <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-surface-container transition-colors">
              <input type="checkbox" defaultChecked className="accent-primary w-3.5 h-3.5 rounded cursor-pointer" />
              <span className="text-on-surface">Vehicle entered intersection during red clearance interval</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-surface-container transition-colors">
              <input type="checkbox" defaultChecked className="accent-primary w-3.5 h-3.5 rounded cursor-pointer" />
              <span className="text-on-surface">License plate letters legible without ambiguity</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-surface-container transition-colors">
              <input type="checkbox" defaultChecked className="accent-primary w-3.5 h-3.5 rounded cursor-pointer" />
              <span className="text-on-surface">No emergency right-of-way exemption verified</span>
            </label>
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-1.5 pt-1">
            <button
              onClick={() =>
                triggerToast(
                  `Citation ${activeViolation.challanId} for ${activeViolation.plate} APPROVED & TRANSMITTED to Municipal Server!`,
                  'verified_user'
                )
              }
              className="w-full py-2.5 px-space-md rounded-lg bg-primary-container text-on-primary font-bold hover:bg-primary transition-all shadow-md flex items-center justify-center gap-1.5 font-mono text-[13px]"
            >
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>Approve & Dispatch E-Challan</span>
            </button>
            <div className="grid grid-cols-2 gap-space-xs font-mono text-[11px]">
              <button
                onClick={() =>
                  triggerToast(`Citation ${activeViolation.challanId} dismissed as false positive.`, 'cancel', true)
                }
                className="py-1.5 px-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1 border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[15px] text-error">cancel</span>
                <span>Dismiss</span>
              </button>
              <button
                onClick={() =>
                  triggerToast(`PDF Evidence Bundle for ${activeViolation.plate} generated.`, 'picture_as_pdf')
                }
                className="py-1.5 px-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1 border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[15px] text-primary">picture_as_pdf</span>
                <span>PDF Evidence</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* 4. Real-Time Rolling Ingestion Ticker */}
      <footer className="mt-space-lg mb-space-md bg-surface-container-lowest rounded-xl p-space-sm flex flex-col md:flex-row items-center justify-between gap-space-sm border border-outline-variant/30 shadow-inner">
        <div className="flex items-center gap-2 w-full md:w-auto font-mono text-[10px]">
          <div className="px-2 py-0.5 rounded bg-secondary/15 text-secondary font-bold uppercase tracking-wider flex items-center gap-1 border border-secondary/30">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
            STREAM LIVE
          </div>
          <span className="text-on-surface-variant font-bold">PIPELINE 60.2 FPS</span>
        </div>

        <div className="w-full md:flex-1 overflow-hidden relative">
          <div className="flex items-center gap-space-lg font-mono text-[10px] text-on-surface-variant whitespace-nowrap animate-pulse">
            <span className="text-on-surface">
              <strong className="text-primary font-bold">10:48:02</strong> Scanning 64 vehicles in camera polygon... No rule breach
            </span>
            <span>•</span>
            <span className="text-on-surface">
              <strong className="text-error font-bold">10:47:33</strong> Red light violation isolated Junction 04 approach [MH02EE4921]
            </span>
            <span>•</span>
            <span className="text-on-surface">
              <strong className="text-tertiary font-bold">10:46:12</strong> Footpath encroachment crop logged Junction 04 East [DL01AB7102]
            </span>
            <span>•</span>
            <span className="text-on-surface">
              <strong className="text-error font-bold">10:39:55</strong> Contra-flow vector flagged Junction 02 [KA03MN3390]
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-on-surface-variant font-mono text-[10px] whitespace-nowrap">
          <span>LATENCY: <strong className="text-secondary font-bold">8.4ms</strong></span>
          <span>|</span>
          <span>BUFFER QUEUE: <strong className="text-primary font-bold">0 PENDING</strong></span>
        </div>
      </footer>

      {/* Floating Action Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg bg-surface-container-highest text-on-surface shadow-2xl flex items-center gap-3 border border-outline-variant/40 animate-slideIn">
          <span className={`material-symbols-outlined text-[22px] ${toast.isError ? 'text-error' : 'text-secondary'}`}>
            {toast.icon}
          </span>
          <span className="font-mono text-[12px] font-semibold">{toast.text}</span>
        </div>
      )}
    </div>
  );
}
