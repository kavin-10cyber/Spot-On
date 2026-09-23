import React from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar } from 'lucide-react';

const PAGE_META = {
  '/':              { title: 'Dashboard',       subtitle: 'Live overview of parking operations' },
  '/slots':         { title: 'Slot Management', subtitle: 'Manage parking slot availability & status' },
  '/staff':         { title: 'Staff Management',subtitle: 'Manage staff accounts and permissions' },
  '/bookings':      { title: 'Bookings',         subtitle: 'All parking reservations from the database' },
  '/users':         { title: 'Users',            subtitle: 'Registered app users directory' },
  '/activity-logs': { title: 'Activity Logs',    subtitle: 'Verification logs & audit trail' },
};

export default function Topbar() {
  const { pathname } = useLocation();
  const meta = PAGE_META[pathname] || { title: 'SpotOn Admin', subtitle: '' };
  const now = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{meta.title}</div>
        {meta.subtitle && <div className="topbar-subtitle">{meta.subtitle}</div>}
      </div>
      <div className="topbar-right">
        <span className="live-badge"><span className="live-dot" />Live</span>
        <span className="topbar-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={14} color="#94A3B8" />
          {now}
        </span>
        <div className="topbar-avatar" title="Admin">A</div>
      </div>
    </header>
  );
}

