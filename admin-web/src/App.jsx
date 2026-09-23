import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './config/supabase';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SlotManagement from './pages/SlotManagement';
import StaffManagement from './pages/StaffManagement';
import Bookings from './pages/Bookings';
import Users from './pages/Users';
import ActivityLogs from './pages/ActivityLogs';

function ProtectedLayout({ children }) {
  return (
    <div className="admin-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    // 1. Check local session
    const localSess = localStorage.getItem('spoton_admin_session');
    if (localSess) {
      setSession(JSON.parse(localSess));
    }

    // 2. Check Supabase auth
    supabase.auth.getSession().then(({ data: { session: supaSess } }) => {
      if (supaSess) setSession(supaSess);
      else if (!localSess) setSession(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, supaSess) => {
      if (supaSess) setSession(supaSess);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Loading state
  if (session === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0D1117', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>🅿</div>
        <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>SpotOn Admin</div>
        <div style={{ color: '#64748B', fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        {session ? (
          <>
            <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/slots" element={<ProtectedLayout><SlotManagement /></ProtectedLayout>} />
            <Route path="/staff" element={<ProtectedLayout><StaffManagement /></ProtectedLayout>} />
            <Route path="/bookings" element={<ProtectedLayout><Bookings /></ProtectedLayout>} />
            <Route path="/users" element={<ProtectedLayout><Users /></ProtectedLayout>} />
            <Route path="/activity-logs" element={<ProtectedLayout><ActivityLogs /></ProtectedLayout>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
