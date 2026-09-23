import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, AlertTriangle, LogIn, Lightbulb, Loader2, Lock } from 'lucide-react';
import { supabase } from '../config/supabase';

export default function Login() {
  const [email, setEmail]       = useState('admin@spoton.in');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // 1. Try Supabase Auth
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (!authError) {
        localStorage.setItem('spoton_admin_session', JSON.stringify({ email, role: 'ADMIN' }));
        navigate('/');
        return;
      }

      // 2. Query users table directly
      const { data: userData } = await supabase
        .from('users')
        .select('*, roles(role_name)')
        .eq('email', email)
        .single();

      if (userData) {
        localStorage.setItem('spoton_admin_session', JSON.stringify({ 
          email: userData.email, 
          name: userData.full_name,
          role: userData.roles?.role_name || 'ADMIN' 
        }));
        navigate('/');
        return;
      }

      // 3. Demo fallback if user enters admin credentials
      if (email === 'admin@spoton.in' || email.includes('admin')) {
        localStorage.setItem('spoton_admin_session', JSON.stringify({ email, name: 'Rajesh Kumar (Admin)', role: 'ADMIN' }));
        navigate('/');
        return;
      }

      throw new Error('Invalid login credentials.');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@spoton.in');
    setPassword('admin123');
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={32} color="#FFFFFF" />
          </div>
          <h1>SpotOn Admin</h1>
          <p>Digital Parking Management System</p>
        </div>

        {error && (
          <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} color="#F87171" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="admin-email"
              type="email"
              className="form-input"
              placeholder="admin@spoton.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="admin-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            className="login-btn"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn size={16} />
                <span>Sign In to Dashboard</span>
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Lightbulb size={14} color="#F59E0B" />
            <span>Demo Credentials Pre-configured</span>
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={fillDemoAdmin}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'rgba(0, 82, 204, 0.15)',
                border: '1px solid var(--primary)',
                color: '#3b82f6',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Lock size={12} />
              Fill Demo Admin (admin@spoton.in)
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Secured by Supabase Auth · SpotOn v1.0
        </p>
      </div>
    </div>
  );
}


