import React, { useState, useEffect, useRef } from 'react';
import './Emissionsnyheter.css';
import { apiGet } from '../utils/api';

const KATEGORIER = [
  { id: 'alla', label: 'Alla' },
  { id: 'emission', label: 'Emissioner' },
  { id: 'regelverk', label: 'Regelverk' },
  { id: 'finansiering', label: 'Finansiering' },
  { id: 'listning', label: 'Listning' },
  { id: 'övrigt', label: 'Övrigt' },
];

const KATEGORI_COLOR = {
  emission: 'blue',
  regelverk: 'green',
  finansiering: 'orange',
  listning: 'purple',
  övrigt: 'gray',
};

function Emissionsnyheter({ user, onBack }) {
  const [kategori, setKategori] = useState('alla');
  const [nyheter, setNyheter] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [sok, setSok] = useState('');
  const [sokResultat, setSokResultat] = useState(null);
  const debounceRef = useRef(null);

  const LIMIT = 20;

  useEffect(() => {
    laddaNyheter(kategori, 0, true);
  }, [kategori]); // eslint-disable-line react-hooks/exhaustive-deps

  const laddaNyheter = async (kat, skp, reset) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const res = await apiGet(`/api/nyheter?category=${kat}&limit=${LIMIT}&skip=${skp}`);
      if (res.ok) {
        const data = await res.json();
        setNyheter(prev => reset ? data.news : [...prev, ...data.news]);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setSkip(skp + data.news.length);
      } else {
        setError('Kunde inte hämta nyheter.');
      }
    } catch (e) {
      setError('Nätverksfel: ' + e.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleKategori = (kat) => {
    setKategori(kat);
    setSok('');
    setSokResultat(null);
  };

  const handleSok = (val) => {
    setSok(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setSokResultat(null); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiGet(`/api/nyheter/search?q=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          setSokResultat(data.news);
        }
      } catch { /* ignore */ }
    }, 350);
  };

  const visaNyheter = sokResultat !== null ? sokResultat : nyheter;

  return (
    <div className="en-container module-container">
      {/* Header */}
      <div className="module-header">
        <button className="back-button" onClick={onBack}>←</button>
        <h1>📰 Emissionsnyheter</h1>
      </div>

      {/* Sök */}
      <div className="en-search-row">
        <input
          className="en-search"
          type="text"
          placeholder="Sök nyheter…"
          value={sok}
          onChange={e => handleSok(e.target.value)}
        />
        {sokResultat !== null && (
          <button className="en-clear-search" onClick={() => { setSok(''); setSokResultat(null); }}>✕ Rensa</button>
        )}
      </div>

      {/* Filter-knappar */}
      {sokResultat === null && (
        <div className="en-filters">
          {KATEGORIER.map(k => (
            <button
              key={k.id}
              className={`en-filter-btn ${kategori === k.id ? 'en-filter-btn--active' : ''}`}
              onClick={() => handleKategori(k.id)}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}

      {/* Status-rad */}
      {sokResultat === null && !loading && (
        <p className="en-count">
          {total > 0 ? `${total} nyheter${kategori !== 'alla' ? ` i kategorin "${KATEGORIER.find(k=>k.id===kategori)?.label}"` : ''}` : 'Inga nyheter ännu'}
        </p>
      )}
      {sokResultat !== null && (
        <p className="en-count">{sokResultat.length} resultat för "{sok}"</p>
      )}

      {/* Error */}
      {error && <div className="en-alert">{error}</div>}

      {/* Laddar */}
      {loading && <div className="en-loading">Hämtar nyheter…</div>}

      {/* Tom state */}
      {!loading && visaNyheter.length === 0 && !error && (
        <div className="empty-state">
          <div className="empty-icon">📰</div>
          <h3>{sokResultat !== null ? 'Inga träffar' : 'Inga nyheter ännu'}</h3>
          <p>{sokResultat !== null ? 'Prova ett annat sökord.' : 'Nyheter hämtas var 15:e minut. Kom tillbaka snart!'}</p>
        </div>
      )}

      {/* Nyhetslista */}
      {!loading && visaNyheter.length > 0 && (
        <div className="en-list">
          {visaNyheter.map(n => (
            <div key={n.id} className="en-card">
              <div className="en-card-meta">
                <span className="en-source">{n.source}</span>
                <span className="en-dot">·</span>
                <span className="en-time">{n.tidSedan || new Date(n.publishedAt).toLocaleDateString('sv-SE')}</span>
              </div>
              <h3 className="en-title">{n.title}</h3>
              {n.content && (
                <p className="en-excerpt">
                  {n.content.length > 150 ? n.content.slice(0, 150) + '…' : n.content}
                </p>
              )}
              <div className="en-card-footer">
                <span className={`en-badge en-badge--${KATEGORI_COLOR[n.category] || 'gray'}`}>
                  {KATEGORIER.find(k => k.id === n.category)?.label || n.category}
                </span>
                <a
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="en-read-more"
                >
                  Läs mer →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ladda fler */}
      {sokResultat === null && hasMore && !loading && (
        <div className="en-load-more-row">
          <button
            className="btn-secondary"
            onClick={() => laddaNyheter(kategori, skip, false)}
            disabled={loadingMore}
          >
            {loadingMore ? 'Laddar…' : 'Ladda fler →'}
          </button>
        </div>
      )}
    </div>
  );
}

export default Emissionsnyheter;
