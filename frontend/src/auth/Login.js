import React, { useState } from 'react';
import './Login.css';
import { apiPost, setAuthToken, setUser } from '../utils/api';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(
        (window.location.port === '3000' ? 'http://localhost:3001' : '') + '/api/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Inloggningen misslyckades');
        setLoading(false);
        return;
      }

      // Store token and user in session
      setAuthToken(data.token);
      setUser(data.user);
      onLogin(data.user);
    } catch (err) {
      console.error('Login error:', err);
      setError('Kunde inte ansluta till servern. Försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>💼 Kapitalplattformen</h1>
          <p>AI-driven plattform för kapitalanskaffning</p>
        </div>

        {error && (
          <div className="login-error">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@email.se"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Lösenord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>

        <div className="login-demo-notice">
          <p><strong>Demo-version:</strong> Använd <code>demo@kapital.se</code> / <code>Demo2026!</code></p>
        </div>

        <div className="login-footer">
          <p>Kapitalplattformen v2.0</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
