import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  SquareParking, 
  Users, 
  ClipboardList, 
  UserCheck, 
  Search, 
  LogOut,
  Car
} from 'lucide-react';
import { supabase } from '../config/supabase';

const NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/slots',         icon: SquareParking,   label: 'Slot Management' },
  { to: '/staff',         icon: Users,           label: 'Staff Management' },
  { to: '/bookings',      icon: ClipboardList,   label: 'Bookings' },
  { to: '/users',         icon: UserCheck,       label: 'Users' },
  { to: '/activity-logs', icon: Search,          label: 'Activity Logs' },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    localStorage.removeItem('spoton_admin_session');
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-row">
          <div className="sidebar-logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={22} color="#FFFFFF" />
          </div>
          <div>
            <div className="sidebar-logo-text">SpotOn</div>
            <div className="sidebar-logo-sub">Admin Console</div>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-label">Main Menu</div>
        {NAV.map((item) => {
          const IconComp = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? ' active' : ''}`
              }
            >
              <span className="nav-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <IconComp size={18} />
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <button className="sidebar-nav-item" onClick={handleLogout} style={{ color: '#F87171' }}>
          <span className="nav-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <LogOut size={18} />
          </span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

