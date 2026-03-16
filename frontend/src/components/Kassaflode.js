import React, { useState, useEffect } from 'react';
import './Kassaflode.css';
import { apiGet, apiPost, getAuthToken, getAuthHeaders } from '../utils/api';

const getApiBase = () =>
  (typeof window !== 'undefined' && window.location.port === '3000')
    ? 'http://localhost:3001' : '';

// ── Hjälpfunktioner ─────────────────────────────────────────────────────────

function beräknaBurnRate(månader) {
  const senaste3 = månader.slice(-3);
  if (senaste3.length === 0) return 0;
  const snitt = senaste3.reduce((s, m) => s + (m.netto || 0), 0) / senaste3.length;
  return snitt < 0 ? Math.abs(snitt) : 0;
}

function beräknaRunway(kassa, burnRate) {
  if (burnRate === 0) return null;
  return Math.floor(kassa / burnRate);
}

function formatSEK(val) {
  if (val === null || val === undefined) return '–';
  return Math.round(val).toLocaleString('sv-SE') + ' kr';
}

// ── Huvudkomponent ───────────────────────────────────────────────────────────

function Kassaflode({ user, onNavigate, onBack }) {
  const [tab, setTab] = useState('dashboard');
  const [data, setData] = useState({ månader: [], prognos: null, scenarios: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Tab 2: formulärstate
  const [form, setForm] = useState({
    datum: '', omsättning: '', övrigtIn: '',
    löner: '', lokaler: '', marknadsföring: '', leverantörer: '', övrigt: '',
    kassaBalans: ''
  });
  const [formError, setFormError] = useState(null);

  // Tab 3: prognos
  const [antaganden, setAntaganden] = useState({ tillväxt: '', kostnadsökning: '' });
  const [prognosLoading, setPrognosLoading] = useState(false);

  // Tab 4: scenarios
  const [nyttScenario, setNyttScenario] = useState({ namn: '', anställningar: '', kostnadPerPerson: '60000', marknadsföring: '', intäktsökning: '' });
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(null);

  useEffect(() => {
    laddaData();
  }, []);

  const laddaData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/api/kassaflode');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError('Kunde inte ladda kassaflödesdata.');
      }
    } catch (e) {
      setError('Nätverksfel: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── KPI-beräkningar ─────────────────────────────────────────────────────

  const senasteMånad = data.månader[data.månader.length - 1] || null;
  const kassa = senasteMånad?.kassaBalans || 0;
  const burnRate = beräknaBurnRate(data.månader);
  const runway = beräknaRunway(kassa, burnRate);

  const statusFärg = runway === null ? 'kf-status--neutral'
    : runway > 12 ? 'kf-status--green'
    : runway > 6 ? 'kf-status--yellow'
    : 'kf-status--red';

  const statusText = runway === null ? '– Lägg till data för att se status'
    : runway > 12 ? `🟢 God likviditet – ${runway} månader runway`
    : runway > 6 ? `🟡 Bevaka noga – ${runway} månader runway`
    : `🔴 Kritisk – ${runway} månader runway`;

  // ── Tab 2: Spara månad ───────────────────────────────────────────────────

  const sparaMånad = async (e) => {
    e.preventDefault();
    if (!form.datum) { setFormError('Välj ett datum.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const res = await apiPost('/api/kassaflode/manad', {
        datum: form.datum,
        inbetalningar: { omsättning: +form.omsättning || 0, övrigtIn: +form.övrigtIn || 0 },
        utbetalningar: { löner: +form.löner || 0, lokaler: +form.lokaler || 0, marknadsföring: +form.marknadsföring || 0, leverantörer: +form.leverantörer || 0, övrigt: +form.övrigt || 0 },
        kassaBalans: +form.kassaBalans || 0
      });
      if (res.ok) {
        await laddaData();
        setForm({ datum: '', omsättning: '', övrigtIn: '', löner: '', lokaler: '', marknadsföring: '', leverantörer: '', övrigt: '', kassaBalans: '' });
      } else {
        const err = await res.json();
        setFormError(err.error || 'Fel vid sparande.');
      }
    } catch (e) {
      setFormError('Nätverksfel: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const taBortMånad = async (datum) => {
    if (!window.confirm(`Ta bort ${datum}?`)) return;
    try {
      await fetch(`${getApiBase()}/api/kassaflode/manad/${datum}`, { method: 'DELETE', headers: getAuthHeaders() });
      await laddaData();
    } catch (e) {
      alert('Fel: ' + e.message);
    }
  };

  // ── Tab 3: Generera prognos ──────────────────────────────────────────────

  const genereraPrognos = async () => {
    setPrognosLoading(true);
    setError(null);
    try {
      const res = await apiPost('/api/kassaflode/generate-prognos', { antaganden });
      const json = await res.json();
      if (res.ok) {
        await laddaData();
      } else {
        setError(json.error || 'Kunde inte generera prognos.');
      }
    } catch (e) {
      setError('Nätverksfel: ' + e.message);
    } finally {
      setPrognosLoading(false);
    }
  };

  // ── Tab 4: Skapa scenario ────────────────────────────────────────────────

  const skapaScenario = async (e) => {
    e.preventDefault();
    if (!nyttScenario.namn) return;
    setScenarioLoading(true);
    setError(null);
    try {
      const ändringar = [];
      if (+nyttScenario.anställningar > 0) {
        ändringar.push({ typ: 'anställningar', antal: +nyttScenario.anställningar, kostnadPerPerson: +nyttScenario.kostnadPerPerson || 60000 });
      }
      if (+nyttScenario.marknadsföring > 0) {
        ändringar.push({ typ: 'marknadsföring', ökning: +nyttScenario.marknadsföring });
      }
      if (+nyttScenario.intäktsökning > 0) {
        ändringar.push({ typ: 'intäktsökning', belopp: +nyttScenario.intäktsökning });
      }
      const res = await apiPost('/api/kassaflode/scenarios', { namn: nyttScenario.namn, ändringar });
      const json = await res.json();
      if (res.ok) {
        await laddaData();
        setNyttScenario({ namn: '', anställningar: '', kostnadPerPerson: '60000', marknadsföring: '', intäktsökning: '' });
      } else {
        setError(json.error || 'Kunde inte skapa scenario.');
      }
    } catch (e) {
      setError('Nätverksfel: ' + e.message);
    } finally {
      setScenarioLoading(false);
    }
  };

  const taBortScenario = async (id) => {
    if (!window.confirm('Ta bort scenario?')) return;
    try {
      await fetch(`${getApiBase()}/api/kassaflode/scenarios/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      await laddaData();
    } catch (e) {
      alert('Fel: ' + e.message);
    }
  };

  const exporteraPPT = async (scenarioId) => {
    setExportLoading(scenarioId || 'prognos');
    try {
      const res = await fetch(`${getApiBase()}/api/kassaflode/export-ppt`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Export misslyckades.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const cd = res.headers.get('Content-Disposition') || '';
      const fnMatch = cd.match(/filename="(.+?)"/);
      a.download = fnMatch ? fnMatch[1] : 'kassaflode.pptx';
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Nätverksfel: ' + e.message);
    } finally {
      setExportLoading(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="kf-container module-container">
      {/* Header */}
      <div className="module-header">
        <button className="back-button" onClick={onBack}>←</button>
        <h1>💰 Ditt Kassaflöde</h1>
      </div>

      {error && <div className="kf-alert kf-alert--error">{error}</div>}

      {/* Tabs */}
      <div className="kf-tabs">
        {[['dashboard', '📊 Dashboard'], ['månadsdata', '📋 Månadsdata'], ['prognos', '🔮 Prognos'], ['scenarios', '🎯 Scenarios']].map(([id, label]) => (
          <button key={id} className={`kf-tab ${tab === id ? 'kf-tab--active' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="kf-loading">Laddar kassaflödesdata…</div>
      ) : (
        <div className="kf-content">

          {/* ── Tab 1: Dashboard ── */}
          {tab === 'dashboard' && (
            <div className="kf-dashboard">
              <div className={`kf-status-banner ${statusFärg}`}>{statusText}</div>

              <div className="kf-kpi-grid">
                <div className="kf-kpi-card">
                  <div className="kf-kpi-label">Aktuell kassa</div>
                  <div className="kf-kpi-value">{formatSEK(kassa)}</div>
                  <div className="kf-kpi-sub">{senasteMånad ? senasteMånad.datum : 'Ingen data'}</div>
                </div>
                <div className="kf-kpi-card">
                  <div className="kf-kpi-label">Burn rate (3-mån snitt)</div>
                  <div className="kf-kpi-value">{burnRate > 0 ? formatSEK(burnRate) + '/mån' : '–'}</div>
                  <div className="kf-kpi-sub">Genomsnittligt nettoutflöde</div>
                </div>
                <div className="kf-kpi-card">
                  <div className="kf-kpi-label">Runway</div>
                  <div className="kf-kpi-value">{runway !== null ? `${runway} mån` : '–'}</div>
                  <div className="kf-kpi-sub">Månader kassa räcker</div>
                </div>
              </div>

              {/* Enkel kassagraf (sista 6 mån) */}
              {data.månader.length > 0 && (
                <div className="kf-chart-section">
                  <h3>Kassautveckling (sista {Math.min(data.månader.length, 6)} månader)</h3>
                  <div className="kf-chart-bars">
                    {data.månader.slice(-6).map(m => {
                      const maxKassa = Math.max(...data.månader.slice(-6).map(x => x.kassaBalans), 1);
                      const h = Math.max((m.kassaBalans / maxKassa) * 100, 2);
                      return (
                        <div key={m.datum} className="kf-chart-col">
                          <div className="kf-chart-val">{Math.round(m.kassaBalans / 1000)}k</div>
                          <div className={`kf-chart-bar ${m.kassaBalans >= 0 ? 'kf-bar--pos' : 'kf-bar--neg'}`} style={{ height: `${h}%` }} />
                          <div className="kf-chart-label">{m.datum.slice(5)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {data.månader.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <h3>Inga data ännu</h3>
                  <p>Gå till "Månadsdata" och lägg till din första månad.</p>
                  <button className="btn-primary" onClick={() => setTab('månadsdata')}>Lägg till månadsdata →</button>
                </div>
              )}

              {runway !== null && runway < 12 && (
                <div className="kf-kapitalrad-cta">
                  <div className="kf-cta-text">
                    <strong>🚨 Runway under 12 månader</strong>
                    <p>Det är dags att planera för kapitalanskaffning.</p>
                  </div>
                  <button className="btn-primary" onClick={() => onNavigate('kapitalrådgivaren')}>
                    Öppna Kapitalrådgivaren →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Tab 2: Månadsdata ── */}
          {tab === 'månadsdata' && (
            <div className="kf-månadsdata">
              <h2>Lägg till månadsdata</h2>
              <form onSubmit={sparaMånad} className="kf-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Månad *</label>
                    <input type="month" value={form.datum} onChange={e => setForm({ ...form, datum: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Kassabalans (kr)</label>
                    <input type="number" placeholder="0" value={form.kassaBalans} onChange={e => setForm({ ...form, kassaBalans: e.target.value })} />
                  </div>
                </div>

                <div className="kf-form-section">
                  <h4>💚 Inbetalningar</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Omsättning (kr)</label>
                      <input type="number" placeholder="0" value={form.omsättning} onChange={e => setForm({ ...form, omsättning: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Övrigt in (kr)</label>
                      <input type="number" placeholder="0" value={form.övrigtIn} onChange={e => setForm({ ...form, övrigtIn: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="kf-form-section">
                  <h4>🔴 Utbetalningar</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Löner (kr)</label>
                      <input type="number" placeholder="0" value={form.löner} onChange={e => setForm({ ...form, löner: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Lokaler (kr)</label>
                      <input type="number" placeholder="0" value={form.lokaler} onChange={e => setForm({ ...form, lokaler: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Marknadsföring (kr)</label>
                      <input type="number" placeholder="0" value={form.marknadsföring} onChange={e => setForm({ ...form, marknadsföring: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Leverantörer (kr)</label>
                      <input type="number" placeholder="0" value={form.leverantörer} onChange={e => setForm({ ...form, leverantörer: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Övrigt ut (kr)</label>
                      <input type="number" placeholder="0" value={form.övrigt} onChange={e => setForm({ ...form, övrigt: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Netto (auto)</label>
                      <input
                        type="text"
                        readOnly
                        value={formatSEK(
                          (+form.omsättning || 0) + (+form.övrigtIn || 0)
                          - (+form.löner || 0) - (+form.lokaler || 0)
                          - (+form.marknadsföring || 0) - (+form.leverantörer || 0)
                          - (+form.övrigt || 0)
                        )}
                        className="kf-netto-preview"
                      />
                    </div>
                  </div>
                </div>

                {formError && <div className="kf-alert kf-alert--error">{formError}</div>}
                <div className="button-row">
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Sparar…' : '💾 Spara månad'}
                  </button>
                </div>
              </form>

              {/* Historiktabell */}
              {data.månader.length > 0 && (
                <div className="kf-historik">
                  <h3>Historik ({data.månader.length} månader)</h3>
                  <div className="kf-table-wrapper">
                    <table className="kf-table">
                      <thead>
                        <tr>
                          <th>Månad</th>
                          <th>Inbet</th>
                          <th>Utbet</th>
                          <th>Netto</th>
                          <th>Kassa</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...data.månader].reverse().map(m => {
                          const inbet = (m.inbetalningar?.omsättning || 0) + (m.inbetalningar?.övrigtIn || 0);
                          const utbet = (m.utbetalningar?.löner || 0) + (m.utbetalningar?.lokaler || 0) + (m.utbetalningar?.marknadsföring || 0) + (m.utbetalningar?.leverantörer || 0) + (m.utbetalningar?.övrigt || 0);
                          return (
                            <tr key={m.datum}>
                              <td>{m.datum}</td>
                              <td className="kf-td--pos">{formatSEK(inbet)}</td>
                              <td className="kf-td--neg">{formatSEK(utbet)}</td>
                              <td className={m.netto >= 0 ? 'kf-td--pos' : 'kf-td--neg'}>{formatSEK(m.netto)}</td>
                              <td>{formatSEK(m.kassaBalans)}</td>
                              <td><button className="kf-btn-delete" onClick={() => taBortMånad(m.datum)}>✕</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab 3: Prognos ── */}
          {tab === 'prognos' && (
            <div className="kf-prognos">
              <h2>AI-prognos</h2>
              <p className="kf-description">
                AI analyserar dina senaste {Math.min(data.månader.length, 12)} månader och genererar en 12-månaders framåtprognos.
                {data.månader.length > 12 && ` (Du har ${data.månader.length} månader – äldre data ingår inte i prognosen.)`}
              </p>

              {data.månader.length === 0 ? (
                <div className="empty-state">
                  <p>Lägg till månadsdata i Tab 2 innan du genererar prognos.</p>
                  <button className="btn-primary" onClick={() => setTab('månadsdata')}>Lägg till månadsdata →</button>
                </div>
              ) : (
                <>
                  <div className="kf-antaganden">
                    <h4>Antaganden (valfritt)</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Förväntad tillväxt (%/mån)</label>
                        <input type="number" placeholder="t.ex. 5" value={antaganden.tillväxt} onChange={e => setAntaganden({ ...antaganden, tillväxt: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Planerad kostnadsökning (kr/mån)</label>
                        <input type="number" placeholder="t.ex. 50000" value={antaganden.kostnadsökning} onChange={e => setAntaganden({ ...antaganden, kostnadsökning: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <button className="btn-primary" onClick={genereraPrognos} disabled={prognosLoading}>
                    {prognosLoading ? '⏳ Genererar AI-prognos…' : '🤖 Generera AI-prognos'}
                  </button>
                </>
              )}

              {data.prognos && (
                <div className="kf-prognos-resultat">
                  <div className="kf-prognos-summary">
                    <p>{data.prognos.sammanfattning}</p>
                    {data.prognos.varningar?.length > 0 && (
                      <div className="kf-alert kf-alert--warning">
                        {data.prognos.varningar.map((v, i) => <div key={i}>⚠️ {v}</div>)}
                      </div>
                    )}
                  </div>

                  <h4>12-månaders prognos</h4>
                  <div className="kf-table-wrapper">
                    <table className="kf-table">
                      <thead>
                        <tr><th>Månad</th><th>Prognos netto</th><th>Kassabalans</th><th>Confidence</th></tr>
                      </thead>
                      <tbody>
                        {data.prognos.framtid?.map(m => (
                          <tr key={m.månad}>
                            <td>{m.månad}</td>
                            <td className={m.prognos >= 0 ? 'kf-td--pos' : 'kf-td--neg'}>{formatSEK(m.prognos)}</td>
                            <td className={m.kassaBalans >= 0 ? '' : 'kf-td--neg'}>{formatSEK(m.kassaBalans)}</td>
                            <td>{Math.round((m.confidence || 0) * 100)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="button-row">
                    <button className="btn-secondary" onClick={() => exporteraPPT(null)} disabled={exportLoading === 'prognos'}>
                      {exportLoading === 'prognos' ? '⏳ Exporterar…' : '📊 Exportera prognos till PowerPoint'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab 4: Scenarios ── */}
          {tab === 'scenarios' && (
            <div className="kf-scenarios">
              <h2>Scenarios</h2>

              {!data.prognos ? (
                <div className="kf-alert kf-alert--info">
                  Du behöver en basprognos för att skapa scenarios. Gå till Tab 3 och generera en AI-prognos först.
                </div>
              ) : (
                <>
                  <form onSubmit={skapaScenario} className="kf-scenario-form">
                    <h4>Skapa nytt scenario</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Scenarionamn *</label>
                        <input type="text" placeholder="t.ex. Aggressiv tillväxt" value={nyttScenario.namn} onChange={e => setNyttScenario({ ...nyttScenario, namn: e.target.value })} required />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Antal nya anställda</label>
                        <input type="number" placeholder="0" value={nyttScenario.anställningar} onChange={e => setNyttScenario({ ...nyttScenario, anställningar: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Lönekostnad/pers (kr/mån)</label>
                        <input type="number" placeholder="60000" value={nyttScenario.kostnadPerPerson} onChange={e => setNyttScenario({ ...nyttScenario, kostnadPerPerson: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Ökad marknadsföring (kr/mån)</label>
                        <input type="number" placeholder="0" value={nyttScenario.marknadsföring} onChange={e => setNyttScenario({ ...nyttScenario, marknadsföring: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Ökade intäkter (kr/mån)</label>
                        <input type="number" placeholder="0" value={nyttScenario.intäktsökning} onChange={e => setNyttScenario({ ...nyttScenario, intäktsökning: e.target.value })} />
                      </div>
                    </div>
                    <div className="button-row">
                      <button type="submit" className="btn-primary" disabled={scenarioLoading}>
                        {scenarioLoading ? 'Skapar…' : '➕ Skapa scenario'}
                      </button>
                    </div>
                  </form>

                  {data.scenarios.length > 0 && (
                    <div className="kf-scenario-list">
                      <h4>Sparade scenarios ({data.scenarios.length})</h4>
                      {data.scenarios.map(sc => (
                        <div key={sc.id} className="kf-scenario-card">
                          <div className="kf-scenario-header">
                            <h3>{sc.namn}</h3>
                            <span className="kf-scenario-date">{sc.skapad}</span>
                          </div>
                          <div className="kf-scenario-stats">
                            <div>
                              <span className="kf-stat-label">Månadsändring</span>
                              <span className={`kf-stat-value ${sc.månadsändring >= 0 ? 'kf-td--pos' : 'kf-td--neg'}`}>
                                {formatSEK(sc.månadsändring)}/mån
                              </span>
                            </div>
                            <div>
                              <span className="kf-stat-label">Runway</span>
                              <span className="kf-stat-value">{sc.runway > 0 ? `${sc.runway} mån` : 'Kassan håller'}</span>
                            </div>
                            {sc.kapitalbehov > 0 && (
                              <div>
                                <span className="kf-stat-label">Kapitalbehov</span>
                                <span className="kf-stat-value kf-td--neg">{formatSEK(sc.kapitalbehov)}</span>
                              </div>
                            )}
                          </div>

                          {/* Jämförelsetabell: bas vs scenario */}
                          <div className="kf-compare-table-wrapper">
                            <table className="kf-table kf-table--compact">
                              <thead>
                                <tr><th>Månad</th><th>Basprognos</th><th>Scenario</th><th>Diff</th></tr>
                              </thead>
                              <tbody>
                                {sc.framtid.slice(0, 6).map((m, i) => {
                                  const bas = data.prognos.framtid[i]?.kassaBalans || 0;
                                  const diff = m.kassaBalans - bas;
                                  return (
                                    <tr key={m.månad}>
                                      <td>{m.månad}</td>
                                      <td>{formatSEK(bas)}</td>
                                      <td className={m.kassaBalans >= 0 ? '' : 'kf-td--neg'}>{formatSEK(m.kassaBalans)}</td>
                                      <td className={diff >= 0 ? 'kf-td--pos' : 'kf-td--neg'}>{diff >= 0 ? '+' : ''}{formatSEK(diff)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="kf-scenario-actions">
                            <button
                              className="btn-primary"
                              onClick={() => exporteraPPT(sc.id)}
                              disabled={exportLoading === sc.id}
                            >
                              {exportLoading === sc.id ? '⏳ Exporterar…' : '📊 Exportera till PowerPoint'}
                            </button>
                            <button className="btn-secondary" onClick={() => taBortScenario(sc.id)}>Ta bort</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default Kassaflode;
