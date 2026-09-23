import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, X, CheckCircle2, Ban, AlertTriangle } from 'lucide-react';
import { supabase } from '../config/supabase';

export default function StaffManagement() {
  const [staff, setStaff]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff]       = useState({ full_name: '', email: '', phone: '' });
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchStaff = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'staff')
        .order('created_at', { ascending: false });
      setStaff(data || []);
    } catch (e) {
      // Try fetching all users if no role filter works
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      setStaff((data || []).filter(u => u.role === 'staff' || u.email?.includes('staff')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const toggleActive = async (user) => {
    const newStatus = user.is_active === false ? true : false;
    await supabase.from('users').update({ is_active: newStatus }).eq('user_id', user.user_id);
    showToast(`${user.full_name} ${newStatus ? 'activated' : 'deactivated'}`);
    fetchStaff();
  };

  const addStaff = async () => {
    if (!newStaff.full_name || !newStaff.email) return;
    setSaving(true);
    // Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin?.createUser?.({
      email: newStaff.email, password: 'SpotOn@123', email_confirm: true
    });
    // Insert into users table directly
    const { error } = await supabase.from('users').insert({
      full_name: newStaff.full_name,
      email:     newStaff.email,
      phone:     newStaff.phone || null,
      role:      'staff',
      is_active: true,
    });
    setSaving(false);
    if (!error) {
      showToast(`Staff ${newStaff.full_name} added`);
      setShowAddModal(false);
      setNewStaff({ full_name: '', email: '', phone: '' });
      fetchStaff();
    } else {
      showToast('Failed — ' + error.message);
    }
  };

  const filtered = staff.filter(s =>
    !search ||
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="page-body">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#0F172A', color: '#fff', padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, zIndex: 9999, boxShadow: 'var(--shadow-lg)' }}>
          {toast}
        </div>
      )}

      <div className="page-header">
        <div className="page-header-text">
          <h1>Staff Management</h1>
          <p>{staff.length} staff members registered in the system</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Add Staff
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Staff',  value: staff.length,                          color: '#0052cc', bg: '#EFF6FF' },
          { label: 'Active',       value: staff.filter(s => s.is_active !== false).length, color: '#10B981', bg: '#D1FAE5' },
          { label: 'Inactive',     value: staff.filter(s => s.is_active === false).length, color: '#EF4444', bg: '#FEE2E2' },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{ '--card-accent': c.color, flex: 1 }}>
            <div className="stat-label">{c.label}</div>
            <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="filters-row">
          <div className="search-box">
            <span className="search-icon" style={{ display: 'flex', alignItems: 'center' }}><Search size={16} color="#94A3B8" /></span>
            <input className="form-input" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="loading-spinner"><div className="spinner" /> Loading staff…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><Users size={32} color="#94A3B8" /></div>
            <p>No staff members found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.user_id || i}>
                    <td><strong style={{ color: 'var(--text-muted)' }}>{i + 1}</strong></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #0052cc, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                          {(s.full_name || 'S')[0].toUpperCase()}
                        </div>
                        <strong>{s.full_name || '—'}</strong>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.email || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.phone || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{fmt(s.created_at)}</td>
                    <td>
                      <span className={`badge ${s.is_active === false ? 'badge-red' : 'badge-green'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {s.is_active === false ? <><Ban size={12} /> Inactive</> : <><CheckCircle2 size={12} /> Active</>}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn btn-xs ${s.is_active === false ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => toggleActive(s)}
                      >
                        {s.is_active === false ? 'Activate' : 'Deactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Add New Staff Member</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="e.g. Ravi Kumar" value={newStaff.full_name} onChange={e => setNewStaff(p => ({ ...p, full_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input className="form-input" type="email" placeholder="staff@spoton.in" value={newStaff.email} onChange={e => setNewStaff(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" placeholder="+91 98765 43210" value={newStaff.phone} onChange={e => setNewStaff(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addStaff} disabled={saving}>{saving ? 'Saving…' : 'Add Staff'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

