import React, { useState } from 'react';
import './Login.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>💼 Kapitalplattformen</h1>
          <p>AI-driven plattform för kapitalanskaffning</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@email.se"
              required
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
            />
          </div>

          <button type="submit" className="btn-login">
            Logga in
          </button>
        </form>

        <div className="login-demo-notice">
          <p><strong>Demo-version:</strong> Ange valfri e-post och lösenord för att logga in</p>
        </div>

        <div className="login-footer">
          <p>Ny användare? <a href="#register">Skapa konto</a></p>
        </div>
      </div>
    </div>
  );
}

export default Login;
