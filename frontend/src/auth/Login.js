import { useState, useEffect, useRef } from 'react';
import { apiPost, setAuthToken, setUser } from '../utils/api';
import './Login.css';

// Chip signal traces: from pad outward → inward (x1,y1 = pad side, x2,y2 = board side)
const TRACES = [
  { id: 't-top-l', x1: -14, y1: -51, x2: -14, y2: -32, d:    0 },
  { id: 't-top-c', x1:   0, y1: -47, x2:   0, y2: -32, d:  220 },
  { id: 't-top-r', x1:  14, y1: -51, x2:  14, y2: -32, d:  440 },
  { id: 't-lef-t', x1: -51, y1: -14, x2: -32, y2: -14, d:  550 },
  { id: 't-lef-c', x1: -47, y1:   0, x2: -32, y2:   0, d:  770 },
  { id: 't-lef-b', x1: -51, y1:  14, x2: -32, y2:  14, d:  990 },
  { id: 't-bot-l', x1: -14, y1:  51, x2: -14, y2:  32, d: 1100 },
  { id: 't-bot-c', x1:   0, y1:  47, x2:   0, y2:  32, d: 1320 },
  { id: 't-bot-r', x1:  14, y1:  51, x2:  14, y2:  32, d: 1540 },
  { id: 't-rig-t', x1:  51, y1: -14, x2:  32, y2: -14, d: 1650 },
  { id: 't-rig-c', x1:  47, y1:   0, x2:  32, y2:   0, d: 1870 },
  { id: 't-rig-b', x1:  51, y1:  14, x2:  32, y2:  14, d: 2090 },
];

const PAD_DELAYS = [0, 0.22, 0.44, 0.55, 0.77, 0.99, 1.10, 1.32, 1.54, 1.65, 1.87, 2.09];
const PULSE_SPEED = 3.6; // seconds

function useChipAnimation(signalLayerRef) {
  useEffect(() => {
    const NS = 'http://www.w3.org/2000/svg';
    const layer = signalLayerRef.current;
    if (!layer) return;

    const timers = [];

    function spawnSignal(t) {
      const g = document.createElementNS(NS, 'g');
      const streak = document.createElementNS(NS, 'line');
      const dot = document.createElementNS(NS, 'circle');

      const dx = t.x2 - t.x1, dy = t.y2 - t.y1;
      const len = Math.hypot(dx, dy);
      const ux = dx / len, uy = dy / len;
      const travelMs = Math.max(380, PULSE_SPEED * 1000 * 0.28);

      dot.setAttribute('r', '1.6');
      dot.setAttribute('fill', '#ffffff');
      dot.setAttribute('class', 'chip-signal');

      streak.setAttribute('stroke', 'var(--lp-teal-400)');
      streak.setAttribute('stroke-width', '1.6');
      streak.setAttribute('stroke-linecap', 'round');
      streak.setAttribute('opacity', '0');

      g.appendChild(streak);
      g.appendChild(dot);
      layer.appendChild(g);

      const start = performance.now();
      let rafId;

      function frame(now) {
        const p = Math.min(1, (now - start) / travelMs);
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

        const x = t.x1 + dx * e;
        const y = t.y1 + dy * e;

        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        const opacity = p < 0.1 ? p * 10 : p > 0.85 ? (1 - p) / 0.15 : 1;
        dot.style.opacity = opacity;

        const tailLen = Math.min(6, len * e);
        streak.setAttribute('x1', x - ux * tailLen);
        streak.setAttribute('y1', y - uy * tailLen);
        streak.setAttribute('x2', x);
        streak.setAttribute('y2', y);
        streak.style.opacity = opacity;

        if (p < 1) {
          rafId = requestAnimationFrame(frame);
        } else {
          g.remove();
        }
      }
      rafId = requestAnimationFrame(frame);
      return () => { cancelAnimationFrame(rafId); g.remove(); };
    }

    function loopSignal(t) {
      let tid;
      const cycle = () => {
        spawnSignal(t);
        tid = setTimeout(cycle, PULSE_SPEED * 1000);
      };
      tid = setTimeout(cycle, t.d);
      timers.push(() => clearTimeout(tid));
    }

    TRACES.forEach(loopSignal);
    return () => timers.forEach(fn => fn());
  }, [signalLayerRef]);
}

function useClock(clockRef) {
  useEffect(() => {
    const tick = () => {
      if (!clockRef.current) return;
      const s = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      clockRef.current.textContent = s + ' CET';
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clockRef]);
}

function Login({ onLogin }) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe]     = useState(true);
  const [emailError, setEmailError]     = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [serverError, setServerError]   = useState('');
  const [loading, setLoading]           = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const signalLayerRef = useRef(null);
  const clockRef = useRef(null);

  useChipAnimation(signalLayerRef);
  useClock(clockRef);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    let ok = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setEmailError(true); ok = false; }
    if (password.length < 6) { setPasswordError(true); ok = false; }
    if (!ok) return;

    setLoading(true);
    try {
      const response = await apiPost('/api/auth/login', { email: email.trim(), password });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Inloggning misslyckades');
      }

      setAuthenticated(true);
      setAuthToken(data.token);
      setUser(data.user);

      setTimeout(() => onLogin(data.user), 600);
    } catch (err) {
      setServerError(err.message || 'Kunde inte ansluta till servern');
      setLoading(false);
    }
  };

  return (
    <div className="lp-root" data-theme="dark">
      <div className="lp-backdrop" />

      {/* Top bar */}
      <header className="lp-topbar">
        <div className="lp-brand">
          <svg viewBox="0 0 120 120" aria-hidden="true" className="lp-brand-icon">
            <g transform="translate(60,60)">
              <rect x="-32" y="-32" width="64" height="64" rx="8" fill="none" stroke="currentColor" strokeWidth="3"/>
              <rect x="-16" y="-16" width="32" height="32" rx="4" fill="currentColor" opacity=".18"/>
              <text x="0" y="6" fontFamily="Inter" fontSize="22" fontWeight="700" fill="currentColor" textAnchor="middle">K</text>
            </g>
          </svg>
          <span>Kapitalplattformen</span>
        </div>
        <div className="lp-meta">
          <span><span className="lp-status-dot" />Systems nominal</span>
          <span>v5</span>
        </div>
      </header>

      <main className="lp-app">

        {/* Left hero */}
        <section className="lp-hero">
          <div className="lp-chip-wrap">
            <svg className="lp-chip" viewBox="-60 -60 120 120" aria-hidden="true">
              <defs>
                <filter id="lp-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.2" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              <rect className="lp-board" x="-32" y="-32" width="64" height="64" rx="8" fill="none" strokeWidth="1.2"/>

              <g className="lp-core-group">
                <rect className="lp-core" x="-20" y="-20" width="40" height="40" rx="5" fill="none" strokeWidth="2"/>
                <text className="lp-k-letter" x="0" y="7" fontFamily="Inter, sans-serif" fontSize="18" fontWeight="700" textAnchor="middle">K</text>
              </g>

              {/* TOP */}
              <line className="lp-trace" x1="-14" y1="-48" x2="-14" y2="-32" strokeWidth="1.5"/>
              <circle className="lp-pad" cx="-14" cy="-51" r="3" style={{animationDelay: `${PAD_DELAYS[0]}s`}}/>
              <line className="lp-trace" x1="0" y1="-44" x2="0" y2="-32" strokeWidth="1.5"/>
              <circle className="lp-pad" cx="0" cy="-47" r="3" style={{animationDelay: `${PAD_DELAYS[1]}s`}}/>
              <line className="lp-trace" x1="14" y1="-48" x2="14" y2="-32" strokeWidth="1.5"/>
              <circle className="lp-pad" cx="14" cy="-51" r="3" style={{animationDelay: `${PAD_DELAYS[2]}s`}}/>

              {/* LEFT */}
              <line className="lp-trace" x1="-48" y1="-14" x2="-32" y2="-14" strokeWidth="1.5"/>
              <circle className="lp-pad" cx="-51" cy="-14" r="3" style={{animationDelay: `${PAD_DELAYS[3]}s`}}/>
              <line className="lp-trace" x1="-44" y1="0" x2="-32" y2="0" strokeWidth="1.5"/>
              <circle className="lp-pad" cx="-47" cy="0" r="3" style={{animationDelay: `${PAD_DELAYS[4]}s`}}/>
              <line className="lp-trace" x1="-48" y1="14" x2="-32" y2="14" strokeWidth="1.5"/>
              <circle className="lp-pad" cx="-51" cy="14" r="3" style={{animationDelay: `${PAD_DELAYS[5]}s`}}/>

              {/* BOTTOM */}
              <line className="lp-trace" x1="-14" y1="32" x2="-14" y2="48" strokeWidth="1.5"/>
              <circle className="lp-pad" cx="-14" cy="51" r="3" style={{animationDelay: `${PAD_DELAYS[6]}s`}}/>
              <line className="lp-trace" x1="0" y1="32" x2="0" y2="44" strokeWidth="1.5"/>
              <circle className="lp-pad" cx="0" cy="47" r="3" style={{animationDelay: `${PAD_DELAYS[7]}s`}}/>
              <line className="lp-trace" x1="14" y1="32" x2="14" y2="48" strokeWidth="1.5"/>
              <circle className="lp-pad" cx="14" cy="51" r="3" style={{animationDelay: `${PAD_DELAYS[8]}s`}}/>

              {/* RIGHT */}
              <line className="lp-trace" x1="32" y1="-14" x2="48" y2="-14" strokeWidth="1.5"/>
              <circle className="lp-pad" cx="51" cy="-14" r="3" style={{animationDelay: `${PAD_DELAYS[9]}s`}}/>
              <line className="lp-trace" x1="32" y1="0" x2="44" y2="0" strokeWidth="1.5"/>
              <circle className="lp-pad" cx="47" cy="0" r="3" style={{animationDelay: `${PAD_DELAYS[10]}s`}}/>
              <line className="lp-trace" x1="32" y1="14" x2="48" y2="14" strokeWidth="1.5"/>
              <circle className="lp-pad" cx="51" cy="14" r="3" style={{animationDelay: `${PAD_DELAYS[11]}s`}}/>

              <g id="lp-signals" ref={signalLayerRef} filter="url(#lp-glow)" />
            </svg>
          </div>

          <div className="lp-copy">
            <div className="lp-eyebrow">Kapitalplattformen</div>
            <h1>AI-driven plattform för <em>Nordisk</em> kapitalanskaffning.</h1>
            <p className="lp-lede">Demokratiserar tillgången till professionell kapitalanskaffning och marknadsföring för noterade bolag.</p>
          </div>
        </section>

        {/* Right form */}
        <section className="lp-form-side">
          <form className="lp-card" onSubmit={handleSubmit} noValidate>

            {/* Mobile chip */}
            <div className="lp-card-chip">
              <svg viewBox="-60 -60 120 120" aria-hidden="true">
                <rect x="-32" y="-32" width="64" height="64" rx="8" fill="none" stroke="var(--lp-teal-400)" strokeWidth="1.2"/>
                <rect x="-20" y="-20" width="40" height="40" rx="5" fill="none" stroke="var(--lp-teal-400)" strokeWidth="2"/>
                <text x="0" y="7" fontFamily="Inter" fontSize="18" fontWeight="700" fill="var(--lp-teal-400)" textAnchor="middle">K</text>
              </svg>
            </div>

            <h2>Logga in</h2>
            <p className="lp-sub">Välkommen tillbaka. Autentisera för att fortsätta.</p>

            {serverError && (
              <div className="lp-server-error">{serverError}</div>
            )}

            {/* Email */}
            <div className={`lp-field${emailError ? ' lp-error' : ''}`}>
              <label htmlFor="lp-email">
                E-post i tjänsten <span className="lp-label-muted">obligatoriskt</span>
              </label>
              <div className="lp-input-wrap">
                <svg className="lp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>
                </svg>
                <input
                  id="lp-email"
                  type="email"
                  autoComplete="email"
                  placeholder="du@foretag.se"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(false); }}
                  disabled={loading || authenticated}
                />
              </div>
              <div className="lp-errmsg">Ange en giltig e-postadress.</div>
            </div>

            {/* Password */}
            <div className={`lp-field${passwordError ? ' lp-error' : ''}`}>
              <label htmlFor="lp-password">
                Lösenord
                <a href="#glömt" onClick={e => e.preventDefault()} tabIndex={-1}>Glömt?</a>
              </label>
              <div className="lp-input-wrap">
                <svg className="lp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                </svg>
                <input
                  id="lp-password"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPasswordError(false); }}
                  disabled={loading || authenticated}
                />
                <button
                  type="button"
                  className="lp-reveal"
                  aria-label="Visa lösenord"
                  onClick={() => setPasswordVisible(v => !v)}
                >
                  {passwordVisible ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              <div className="lp-errmsg">Minst 6 tecken.</div>
            </div>

            {/* Remember + SSO label */}
            <div className="lp-row">
              <label className="lp-check">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                <span className="lp-box" />
                <span>Håll mig inloggad</span>
              </label>
              <span className="lp-sso-badge">SSO · TLS 1.3</span>
            </div>

            {/* Primary button */}
            <button
              className="lp-btn lp-btn-primary"
              type="submit"
              disabled={loading || authenticated}
              data-loading={loading ? 'true' : 'false'}
            >
              <span>{authenticated ? 'Autentiserad ✓' : 'Fortsätt'}</span>
              {!authenticated && (
                <svg className="lp-arr" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>
                </svg>
              )}
            </button>

            <div className="lp-divider">eller fortsätt med</div>

            <button className="lp-btn lp-btn-ghost" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z"/>
              </svg>
              <span>Enkel inloggning (SAML)</span>
            </button>

            <div className="lp-demo-notice">
              <strong>Demo:</strong> demo@kapital.se / Demo2026!
            </div>

            <p className="lp-legal">
              Genom att logga in godkänner du våra <a href="#villkor">Villkor</a> och <a href="#integritet">Integritetsmeddelande</a>.<br/>
              Ny kund? <a href="#access" className="lp-legal-accent">Begär åtkomst →</a>
            </p>
          </form>
        </section>
      </main>

      <footer className="lp-footer">
        <span ref={clockRef}>—</span>
        <span>© 2026 Kapitalplattformen</span>
      </footer>
    </div>
  );
}

export default Login;
