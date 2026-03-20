import React, { useState, useEffect, useRef } from 'react';
import './PitchDeckEditor.css';
import { getAuthHeaders } from '../../utils/api';

const SCOPE_OPTIONS = ['Denna slide', 'Hela decket'];

const SUGGESTIONS = [
  'Gör investment highlights mer säljande',
  'Förkorta bullet points på denna slide',
  'Byt ton till mer konservativ och faktabaserad',
  'Lägg till en slide om exit-möjligheter',
];

export default function PitchDeckEditor({ emissionId, companyId }) {
  const [deck,         setDeck]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [generating,   setGenerating]   = useState(false);
  const [brandStatus,  setBrandStatus]  = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scope,        setScope]        = useState('Denna slide');
  const [prompt,       setPrompt]       = useState('');
  const [chatLoading,  setChatLoading]  = useState(false);
  const [showSugg,     setShowSugg]     = useState(true);
  const chatRef = useRef(null);

  useEffect(() => {
    const headers = getAuthHeaders();
    Promise.all([
      fetch(`/api/companies/${companyId}/brand-profile/status`, { headers }).then(r => r.json()),
      fetch(`/api/emissions/${emissionId}/pitch-deck`, { headers }).then(r => r.json())
    ]).then(([status, existingDeck]) => {
      setBrandStatus(status);
      setDeck(existingDeck);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [emissionId, companyId]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [deck?.conversation_history]);

  const handleGenerate = async (force = false) => {
    setGenerating(true);
    try {
      const res  = await fetch(`/api/emissions/${emissionId}/pitch-deck/generate`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      let data;
      try { data = await res.json(); } catch { data = {}; }
      if (res.ok) { setDeck(data); setCurrentSlide(0); }
      else alert(data.message || data.error || `Generering misslyckades (HTTP ${res.status})`);
    } catch (err) {
      alert('Nätverksfel: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleChat = async () => {
    if (!prompt.trim() || chatLoading) return;
    const slideId = scope === 'Denna slide' ? deck.slides[currentSlide]?.id : undefined;
    const userMsg = prompt;
    setPrompt('');
    setShowSugg(false);
    setChatLoading(true);

    setDeck(prev => ({
      ...prev,
      conversation_history: [
        ...(prev.conversation_history || []),
        { role: 'user', content: userMsg, ts: new Date().toISOString() }
      ]
    }));

    try {
      const res  = await fetch(`/api/emissions/${emissionId}/pitch-deck/chat`, {
        method:  'PUT',
        headers: getAuthHeaders(),
        body:    JSON.stringify({
          prompt:   userMsg,
          scope:    scope === 'Denna slide' ? 'slide' : 'deck',
          slide_id: slideId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDeck(prev => ({
          ...prev,
          slides:               data.slides,
          conversation_history: data.conversation_history
        }));
      }
    } finally {
      setChatLoading(false);
    }
  };

  const handleExport = async () => {
    const res = await fetch(`/api/emissions/${emissionId}/pitch-deck/export`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) return alert('Export misslyckades');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'Teaser.pptx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = async () => {
    if (!window.confirm('Nollställa decket och börja om?')) return;
    await fetch(`/api/emissions/${emissionId}/pitch-deck`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    setDeck(null);
    setCurrentSlide(0);
  };

  if (loading) return <div className="pd-loading">Laddar...</div>;

  const brandIncomplete = brandStatus && !brandStatus.valid;

  if (!deck) {
    return (
      <div className="pd-empty">
        {brandIncomplete && (
          <div className="pd-brand-warning">
            <span>Varumärkesprofilen saknar: {(brandStatus.missing || []).join(', ')}</span>
            <a href="/inställningar">Gå till Varumärkesprofil →</a>
          </div>
        )}
        <h3>Inget pitch deck genererat ännu</h3>
        <p>AI:n läser ert IM och varumärkesprofil och producerar ett utkast på 10 slides.</p>
        <button
          className="pd-btn-primary"
          onClick={() => handleGenerate(false)}
          disabled={generating}
        >
          {generating ? 'Genererar...' : 'Generera pitch deck'}
        </button>
        {brandIncomplete && (
          <button className="pd-btn-secondary" onClick={() => handleGenerate(true)} disabled={generating}>
            Generera ändå (utan fullständig brand profile)
          </button>
        )}
      </div>
    );
  }

  const slides = deck.slides || [];
  const active = slides[currentSlide] || {};
  const msgs   = (deck.conversation_history || []).filter(m => m.role === 'user' || m.role === 'assistant');

  return (
    <div className="pd-editor">
      {/* VÄNSTER: SLIDE PANEL */}
      <div className="pd-slide-panel">
        <div className="pd-panel-header">
          <span className="pd-panel-title">Pitch deck preview</span>
          <div className="pd-nav">
            <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}>←</button>
            <span>{currentSlide + 1} / {slides.length}</span>
            <button onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}>→</button>
          </div>
        </div>

        <div className="pd-slide-main">
          {/* Thumbnails */}
          <div className="pd-strip">
            {slides.map((s, i) => (
              <div
                key={s.id}
                className={`pd-thumb ${i === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(i)}
                title={s.title}
              >
                <span className="pd-thumb-label">{s.title}</span>
                <span className="pd-thumb-num">{i + 1}</span>
              </div>
            ))}
          </div>

          {/* Slide canvas */}
          <div className="pd-canvas">
            <SlidePreview slide={active} />
          </div>
        </div>
      </div>

      {/* HÖGER: CHAT PANEL */}
      <div className="pd-chat-panel">
        <div className="pd-chat-header">
          <div className="pd-ai-dot" />
          <span className="pd-chat-title">AI-assistent</span>
          <span className="pd-gen-badge">Utkast genererat</span>
        </div>

        <div className="pd-messages" ref={chatRef}>
          {msgs.map((m, i) => (
            <div key={i} className={`pd-msg ${m.role}`}>
              <div className="pd-bubble">{m.content}</div>
            </div>
          ))}
          {chatLoading && (
            <div className="pd-msg assistant">
              <div className="pd-bubble pd-typing">
                <span /><span /><span />
              </div>
            </div>
          )}
        </div>

        {showSugg && (
          <div className="pd-suggestions">
            {SUGGESTIONS.map(s => (
              <button key={s} className="pd-sug-chip" onClick={() => setPrompt(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="pd-input-area">
          <div className="pd-scope-row">
            {SCOPE_OPTIONS.map(o => (
              <button
                key={o}
                className={`pd-scope-btn ${scope === o ? 'active' : ''}`}
                onClick={() => setScope(o)}
              >
                {o}
              </button>
            ))}
          </div>
          <div className="pd-input-row">
            <textarea
              className="pd-input"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat(); } }}
              placeholder={scope === 'Denna slide' ? 'Beskriv vad du vill ändra på denna slide...' : 'Beskriv vad du vill ändra i hela decket...'}
              rows={2}
            />
            <button className="pd-send-btn" onClick={handleChat} disabled={chatLoading || !prompt.trim()}>
              ↑
            </button>
          </div>
          <div className="pd-action-row">
            <button className="pd-btn-ghost" onClick={handleReset}>Börja om</button>
            <button className="pd-btn-primary" onClick={handleExport}>Exportera .pptx</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlidePreview({ slide }) {
  if (!slide?.type) return <div className="pd-slide-empty">Välj en slide</div>;
  const c = slide.content || {};

  if (slide.type === 'cover') return (
    <div className="pd-slide pd-slide-cover">
      <div className="pd-cover-name">{c.company_name}</div>
      <div className="pd-cover-tagline">{c.tagline}</div>
      {c.emission_amount && (
        <div className="pd-cover-badge">{c.emission_type} · {c.emission_amount} · {c.marketplace}</div>
      )}
    </div>
  );

  if (slide.type === 'bullets') return (
    <div className="pd-slide pd-slide-content">
      <div className="pd-slide-header"><h2>{slide.title}</h2></div>
      <ul className="pd-bullets">
        {(c.bullets || []).map((b, i) => <li key={i}>{b}</li>)}
      </ul>
      {c.highlight_box && <div className="pd-highlight-box">{c.highlight_box}</div>}
    </div>
  );

  if (slide.type === 'twocol') return (
    <div className="pd-slide pd-slide-content">
      <div className="pd-slide-header"><h2>{slide.title}</h2></div>
      <div className="pd-col-grid">
        {(c.cards || []).map((card, i) => (
          <div key={i} className="pd-col-card">
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (slide.type === 'metrics') return (
    <div className="pd-slide pd-slide-content">
      <div className="pd-slide-header"><h2>{slide.title}</h2></div>
      <div className="pd-metrics-grid">
        {(c.metrics || []).map((m, i) => (
          <div key={i} className="pd-metric-card">
            <div className="pd-metric-val">{m.value}</div>
            <div className="pd-metric-lbl">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return null;
}
