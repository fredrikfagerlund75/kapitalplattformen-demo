import React, { useState } from 'react';
import { apiPost, setAuthToken, setUser } from '../utils/api';
import logoLogin from '../assets/logo-login.svg';
import './Login.css';

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
      const response = await apiPost('/api/auth/login', { email, password });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Inloggning misslyckades');
      }

      // Store token and user in session
      setAuthToken(data.token);
      setUser(data.user);

      // Notify parent with user object
      onLogin(data.user);
    } catch (err) {
      setError(err.message || 'Kunde inte ansluta till servern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src={logoLogin} alt="Kapitalplattformen" className="login-logo" />
          <p>AI-driven plattform för kapitalanskaffning</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

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
          <p><strong>Demo:</strong> demo@kapital.se / Demo2026!</p>
        </div>

        <div className="login-footer">
          <p>Ny användare? <a href="#register">Skapa konto</a></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
