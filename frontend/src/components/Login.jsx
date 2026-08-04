import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import './Login.css';

// Kredensial demo — ditampilkan secara plain text
const DEMO_CREDENTIALS = {
  email: 'tesakuntan@gmail.com',
  password: 'demo123'
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fillDemo = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setError('');
  };

  const logSessionToDatabase = async (userEmail, status) => {
    try {
      var apiBase = import.meta.env.VITE_API_URL || '';
      await fetch(apiBase + '/api/auth/log-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, status: status })
      });
    } catch (err) {
      console.warn('Gagal mencatat sesi login ke database:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (authError) {
        throw authError;
      }

      // Catat sesi login ke database
      await logSessionToDatabase(email, 'SUCCESS');
      setShowSuccess(true);
    } catch (err) {
      console.error('Login error:', err);
      // Catat percobaan login gagal
      await logSessionToDatabase(email, 'FAILED');
      setError('Gagal login. Periksa kembali email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="login-container">
        <div className="login-success-card">
          <div className="login-success-icon">✅</div>
          <h2>Login Berhasil!</h2>
          <p>Mengalihkan ke dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo-icon">
            <div style={{ background: '#fff', borderRadius: '50%', padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '90px', height: '90px', margin: '0 auto' }}>
              <img src="/logo-pdam.png" alt="Logo PDAM Tirta Seruyan" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
            </div>
          </div>
          <h1 className="login-title">PDAM Tirta Seruyan</h1>
          <p className="login-subtitle">Sistem Keuangan Digital</p>
        </div>

        {/* Demo Panel - Kalkulator Style */}
        <div className="demo-panel">
          <div className="demo-panel-header">
            <span className="demo-dot red"></span>
            <span className="demo-dot yellow"></span>
            <span className="demo-dot green"></span>
            <span className="demo-panel-title">DEMO MODE</span>
          </div>
          <div className="demo-panel-body">
            <div className="demo-row">
              <span className="demo-label">EMAIL</span>
              <span className="demo-value">{DEMO_CREDENTIALS.email}</span>
            </div>
            <div className="demo-row">
              <span className="demo-label">PASS</span>
              <span className="demo-value">{DEMO_CREDENTIALS.password}</span>
            </div>
            <button type="button" className="demo-fill-btn" onClick={fillDemo}>
              ⚡ Isi Otomatis
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && <div className="login-error-msg">{error}</div>}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="login-email">Email</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">📧</span>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan email"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">🔑</span>
              <input
                id="login-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? (
              <span className="login-spinner"></span>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 PDAM Seruyan • Sistem Keuangan Digital</p>
        </div>
      </div>
    </div>
  );
}
