import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  SquareParking, 
  CheckCircle2, 
  Car, 
  ClipboardList, 
  IndianRupee, 
  Inbox, 
  AlertTriangle, 
  ArrowDownLeft, 
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '../config/supabase';

const CHART_DATASETS = {
  occupancy: {
    label: 'Occupancy %',
    color1: '#6366F1',
    color2: '#818CF8',
    glow: 'rgba(99,102,241,0.35)',
    unit: '%',
    data: [
      { day: 'Mon', val: 65 }, { day: 'Tue', val: 78 }, { day: 'Wed', val: 70 },
      { day: 'Thu', val: 85 }, { day: 'Fri', val: 92 }, { day: 'Sat', val: 88 },
      { day: 'Sun', val: 55 },
    ],
  },
  revenue: {
    label: 'Revenue (₹00s)',
    color1: '#10B981',
    color2: '#34D399',
    glow: 'rgba(16,185,129,0.35)',
    unit: '',
    data: [
      { day: 'Mon', val: 42 }, { day: 'Tue', val: 67 }, { day: 'Wed', val: 55 },
      { day: 'Thu', val: 78 }, { day: 'Fri', val: 95 }, { day: 'Sat', val: 83 },
      { day: 'Sun', val: 38 },
    ],
  },
  bookings: {
    label: 'Bookings',
    color1: '#F59E0B',
    color2: '#FCD34D',
    glow: 'rgba(245,158,11,0.35)',
    unit: '',
    data: [
      { day: 'Mon', val: 28 }, { day: 'Tue', val: 45 }, { day: 'Wed', val: 36 },
      { day: 'Thu', val: 52 }, { day: 'Fri', val: 71 }, { day: 'Sat', val: 64 },
      { day: 'Sun', val: 22 },
    ],
  },
};

const STAT_CARDS = (s) => [
  { label: 'Total Locations', value: s.totalLots,       icon: MapPin,        accent: '#0052cc', change: 'Active', changeCls: 'badge-blue' },
  { label: 'Total Slots',     value: s.totalSlots,      icon: SquareParking, accent: '#7C3AED', change: 'Configured', changeCls: 'badge-purple' },
  { label: 'Available Slots', value: s.availableSlots,  icon: CheckCircle2,  accent: '#10B981', change: 'Free', changeCls: 'badge-green' },
  { label: 'Occupied/Reserved',value: s.occupiedSlots,  icon: Car,           accent: '#EF4444', change: 'In use', changeCls: 'badge-red' },
  { label: 'Total Bookings',  value: s.totalBookings,   icon: ClipboardList, accent: '#F59E0B', change: 'All time', changeCls: 'badge-amber' },
  { label: 'Total Revenue',   value: `₹${s.totalRevenue.toLocaleString()}`, icon: IndianRupee, accent: '#10B981', change: 'Collected', changeCls: 'badge-green' },
];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLots: 0, totalSlots: 0, availableSlots: 0,
    occupiedSlots: 0, totalBookings: 0, totalRevenue: 0,
  });
  const [activity, setActivity]  = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [chartMode, setChartMode] = useState('occupancy');
  const [hoveredBar, setHoveredBar] = useState(null);
  const [animated, setAnimated] = useState(false);

  const fetchStats = async () => {
    try {
      const [{ data: locs }, { data: slots }, { data: bookings }, { data: payments }] = await Promise.all([
        supabase.from('parking_locations').select('location_id'),
        supabase.from('parking_slots').select('slot_id,status'),
        supabase.from('bookings').select('booking_id'),
        supabase.from('payments').select('amount'),
      ]);

      setStats({
        totalLots:     locs?.length ?? 0,
        totalSlots:    slots?.length ?? 0,
        availableSlots: slots?.filter(s => s.status === 'AVAILABLE').length ?? 0,
        occupiedSlots:  slots?.filter(s => ['OCCUPIED','RESERVED'].includes(s.status)).length ?? 0,
        totalBookings:  bookings?.length ?? 0,
        totalRevenue:   payments?.reduce((acc, p) => acc + Number(p.amount || 0), 0) ?? 0,
      });
    } catch (e) {
      console.error('fetchStats:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchActivity = async () => {
    try {
      const { data: logs } = await supabase
        .from('verification_logs')
        .select('*, bookings(booking_code, parking_slots(slot_number), vehicles(vehicle_number), users(full_name))')
        .order('created_at', { ascending: false })
        .limit(10);

      if (logs && logs.length > 0) {
        setActivity(logs.map(l => ({
          id:       String(l.log_id),
          vehicle:  l.bookings?.vehicles?.vehicle_number || 'N/A',
          customer: l.bookings?.users?.full_name || 'Walk-in',
          code:     l.bookings?.booking_code || '—',
          slot:     l.bookings?.parking_slots?.slot_number || '—',
          type:     l.action === 'ENTRY_SCAN' ? 'in' : 'out',
          status:   l.status || 'SUCCESS',
          time:     new Date(l.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          date:     new Date(l.created_at).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' }),
        })));
      } else {
        // Fallback to bookings if no logs
        const { data: bks } = await supabase
          .from('bookings')
          .select('*, parking_slots(slot_number), vehicles(vehicle_number), users(full_name)')
          .order('created_at', { ascending: false })
          .limit(10);
        if (bks) {
          setActivity(bks.map(b => ({
            id:       String(b.booking_id),
            vehicle:  b.vehicles?.vehicle_number || 'N/A',
            customer: b.users?.full_name || 'User',
            code:     b.booking_code || '—',
            slot:     b.parking_slots?.slot_number || '—',
            type:     'in',
            status:   b.status === 'CONFIRMED' ? 'SUCCESS' : b.status,
            time:     new Date(b.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            date:     new Date(b.created_at).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' }),
          })));
        }
      }
    } catch (e) {
      console.error('fetchActivity:', e);
    } finally {
      setLoadingActivity(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchActivity();
    // Trigger bar entrance animation after a short delay
    setTimeout(() => setAnimated(true), 100);

    // Real-time subscriptions
    const slotSub = supabase.channel('dashboard-slots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, fetchStats)
      .subscribe();
    const bkSub = supabase.channel('dashboard-bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => { fetchStats(); fetchActivity(); })
      .subscribe();

    return () => { supabase.removeChannel(slotSub); supabase.removeChannel(bkSub); };
  }, []);

  const handleChartMode = (mode) => {
    setAnimated(false);
    setHoveredBar(null);
    setChartMode(mode);
    setTimeout(() => setAnimated(true), 80);
  };

  const cards = STAT_CARDS(stats);
  const availPct = stats.totalSlots ? Math.round((stats.availableSlots / stats.totalSlots) * 100) : 0;
  const occupPct = stats.totalSlots ? Math.round((stats.occupiedSlots  / stats.totalSlots) * 100) : 0;
  const activeDataset = CHART_DATASETS[chartMode];
  const maxVal = Math.max(...activeDataset.data.map(d => d.val));

  return (
    <div className="page-body">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Performance Overview</h1>
          <p>Live data from your Supabase database · auto-refreshes in real-time</p>
        </div>
      </div>

      {/* Stats Grid */}
      {loadingStats ? (
        <div className="loading-spinner"><div className="spinner" /> Loading live stats…</div>
      ) : (
        <div className="stats-grid">
          {cards.map((c, i) => {
            const IconComp = c.icon;
            return (
              <div key={i} className="stat-card" style={{ '--card-accent': c.accent }}>
                <div className="stat-label">{c.label}</div>
                <div className="stat-value">{c.value}</div>
                <div className="stat-icon-row">
                  <span className={`badge ${c.changeCls}`}>{c.change}</span>
                  <div className="stat-icon-bg" style={{ background: c.accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconComp size={18} color={c.accent} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        {/* Charts + Activity */}
      <div className="dashboard-grid">

        {/* ── Premium Weekly Chart ── */}
        <div className="card premium-chart-card" style={{ marginBottom: 20 }}>
          {/* Header */}
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: `linear-gradient(135deg, ${activeDataset.color1}, ${activeDataset.color2})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 12px ${activeDataset.glow}`,
              }}>
                <TrendingUp size={16} color="#fff" />
              </div>
              <div>
                <div className="card-title">Weekly Performance</div>
                <div className="card-subtitle">{activeDataset.label} — this week</div>
              </div>
            </div>

            {/* Dataset Toggle Tabs */}
            <div style={{ display: 'flex', gap: 6, background: 'var(--bg)', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
              {Object.entries(CHART_DATASETS).map(([key, ds]) => (
                <button
                  key={key}
                  onClick={() => handleChartMode(key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 7,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    transition: 'all 0.2s',
                    background: chartMode === key ? `linear-gradient(135deg, ${ds.color1}, ${ds.color2})` : 'transparent',
                    color: chartMode === key ? '#fff' : 'var(--text-muted)',
                    boxShadow: chartMode === key ? `0 2px 8px ${ds.glow}` : 'none',
                  }}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="card-body" style={{ paddingTop: 8 }}>
            {/* Chart Container */}
            <div style={{ position: 'relative' }}>
              {/* Horizontal Grid Lines */}
              <div style={{ position: 'absolute', inset: '0 0 28px 0', pointerEvents: 'none' }}>
                {[25, 50, 75, 100].map(pct => (
                  <div key={pct} style={{
                    position: 'absolute',
                    bottom: `${pct}%`,
                    left: 0, right: 0,
                    height: 1,
                    background: 'var(--border)',
                    opacity: 0.6,
                  }}>
                    <span style={{
                      position: 'absolute', left: -2, top: -8,
                      fontSize: 9, color: 'var(--text-muted)', fontWeight: 600,
                    }}>{Math.round(maxVal * pct / 100)}{activeDataset.unit}</span>
                  </div>
                ))}
              </div>

              {/* Bars */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 10,
                height: 180,
                paddingLeft: 28,
                paddingBottom: 28,
                position: 'relative',
              }}>
                {activeDataset.data.map((d, i) => {
                  const heightPct = animated ? (d.val / maxVal) * 100 : 0;
                  const isPeak    = d.val === maxVal;
                  const isHovered = hoveredBar === i;

                  return (
                    <div
                      key={d.day}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', position: 'relative' }}
                      onMouseEnter={() => setHoveredBar(i)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div style={{
                          position: 'absolute',
                          top: -44,
                          background: '#1E293B',
                          color: '#fff',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: 8,
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                          zIndex: 10,
                          pointerEvents: 'none',
                        }}>
                          {d.day}: {d.val}{activeDataset.unit}
                          <div style={{
                            position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
                            width: 0, height: 0,
                            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                            borderTop: '5px solid #1E293B',
                          }} />
                        </div>
                      )}

                      {/* Bar Track */}
                      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
                        {/* Bar Fill */}
                        <div style={{
                          width: '100%',
                          height: `${heightPct}%`,
                          background: `linear-gradient(to top, ${activeDataset.color1}, ${activeDataset.color2})`,
                          borderRadius: '6px 6px 3px 3px',
                          transition: `height 0.7s cubic-bezier(0.34,1.56,0.64,1) ${i * 60}ms`,
                          position: 'relative',
                          boxShadow: isHovered ? `0 0 16px ${activeDataset.glow}` : `0 2px 8px ${activeDataset.glow}`,
                          opacity: isHovered ? 1 : 0.85,
                          cursor: 'pointer',
                        }}>
                          {/* Glow cap on top */}
                          <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0,
                            height: 6,
                            background: activeDataset.color2,
                            borderRadius: '6px 6px 0 0',
                            opacity: 0.9,
                          }} />
                          {/* Peak star badge */}
                          {isPeak && (
                            <div style={{
                              position: 'absolute',
                              top: -22,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              background: activeDataset.color1,
                              color: '#fff',
                              fontSize: 9,
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: 20,
                              whiteSpace: 'nowrap',
                              letterSpacing: 0.5,
                              boxShadow: `0 2px 6px ${activeDataset.glow}`,
                            }}>
                              ★ PEAK
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Day Label */}
                      <div style={{
                        fontSize: 11, fontWeight: 700,
                        color: isPeak ? activeDataset.color1 : 'var(--text-muted)',
                        transition: 'color 0.3s',
                      }}>
                        {d.day}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Legend */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: '#10B981' }} />
                  Available {availPct}%
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: '#EF4444' }} />
                  Occupied {occupPct}%
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                Peak: {maxVal}{activeDataset.unit} on {activeDataset.data.find(d => d.val === maxVal)?.day}
              </div>
            </div>
          </div>
        </div>

        {/* Slot Distribution */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Slot Distribution</div>
              <div className="card-subtitle">Current status breakdown</div>
            </div>
          </div>
          <div className="card-body">
            {[
              { label: 'Available', count: stats.availableSlots, color: '#10B981', bg: '#D1FAE5' },
              { label: 'Occupied',  count: stats.occupiedSlots,  color: '#EF4444', bg: '#FEE2E2' },
              { label: 'Other',     count: Math.max(0, stats.totalSlots - stats.availableSlots - stats.occupiedSlots), color: '#94A3B8', bg: '#F1F5F9' },
            ].map(item => {
              const pct = stats.totalSlots ? Math.round((item.count / stats.totalSlots) * 100) : 0;
              return (
                <div key={item.label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: item.color }}>{item.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 99, transition: 'width .6s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent Activity</div>
            <div className="card-subtitle">Latest verification logs from database</div>
          </div>
          <span className="live-badge"><span className="live-dot" />Live Supabase</span>
        </div>

        {loadingActivity ? (
          <div className="loading-spinner"><div className="spinner" /> Fetching logs…</div>
        ) : activity.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
              <Inbox size={32} color="#94A3B8" />
            </div>
            <p>No activity logs found in database.</p>
          </div>
        ) : (
          activity.map(act => {
            const isIn   = act.type === 'in';
            const isFail = ['EXPIRED','FAILED','REJECTED'].includes(act.status);
            const iconBg  = isFail ? '#FEE2E2' : isIn ? '#D1FAE5' : '#DBEAFE';
            const iconClr = isFail ? '#EF4444' : isIn ? '#10B981' : '#2563EB';

            return (
              <div key={act.id} className="activity-item">
                <div className="activity-icon" style={{ background: iconBg, color: iconClr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isFail ? <AlertTriangle size={16} /> : isIn ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div className="activity-content">
                  <div className="activity-title">{act.vehicle} · {act.customer}</div>
                  <div className="activity-sub">Code: <strong>{act.code}</strong> · Slot: <strong>{act.slot}</strong></div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span className={`badge ${isFail ? 'badge-red' : isIn ? 'badge-green' : 'badge-blue'}`} style={{ marginBottom: 4, display: 'inline-block' }}>
                    {isFail ? 'Failed' : isIn ? 'Check In' : 'Check Out'}
                  </span>
                  <div className="activity-time">{act.date} · {act.time}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

