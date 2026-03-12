import React, { useState } from 'react';
import './ProjektVy.css';
import { apiPost } from '../utils/api';

function ProjektVy({ user, projekt, onBack, onUpdateProject, onNavigate }) {
  const [activeTab, setActiveTab] = useState('oversikt');
  const [loadingMarPm, setLoadingMarPm] = useState(false);
  const [loadingProtokoll, setLoadingProtokoll] = useState(false);
  const [insynsloggKvitterad, setInsynsloggKvitterad] = useState(false);
  const [marPmDraft, setMarPmDraft] = useState('');
  const [protokollDraft, setProtokollDraft] = useState('');
  const [marPmSaved, setMarPmSaved] = useState(false);
  const [protokollSaved, setProtokollSaved] = useState(false);
  const [marPmSkipped, setMarPmSkipped] = useState(false);
  const [protokollSkipped, setProtokollSkipped] = useState(false);

  if (!projekt) {
    return (
      <div className="module-container">
        <div className="module-header">
          <button className="back-button" onClick={onBack}>← Tillbaka</button>
          <h1>📋 Projektvy</h1>
        </div>
        <div className="empty-state">
          <p>Välj ett emissionsprojekt från Dashboard</p>
        </div>
      </div>
    );
  }

  const handleGenerateMarPM = async () => {
    setLoadingMarPm(true);
    try {
      const response = await apiPost('/api/kapitalradgivaren/mar-pm', {
        type: 'beslut',
        projektData: {
          companyName: projekt.companyName || user.company,
          emissionsvillkor: projekt.emissionsvillkor
        }
      });
      if (!response.ok) throw new Error('Serverfel');
      const data = await response.json();
      setMarPmDraft(data.pressmeddelande || data.content || '');
      setMarPmSaved(false);
    } catch (error) {
      console.error('Failed to generate MAR-PM:', error);
      alert('Kunde inte generera MAR-PM: ' + error.message);
    }
    setLoadingMarPm(false);
  };

  const handleGenerateProtokoll = async () => {
    setLoadingProtokoll(true);
    try {
      const response = await apiPost('/api/kapitalradgivaren/styrelseprotokoll', {
        projektId: projekt.id,
        type: 'emissionsbeslut',
        projektData: {
          companyName: projekt.companyName || user.company,
          emissionsvillkor: projekt.emissionsvillkor
        }
      });
      if (!response.ok) throw new Error('Serverfel');
      const data = await response.json();
      setProtokollDraft(data.protokoll || data.content || '');
      setProtokollSaved(false);
    } catch (error) {
      console.error('Failed to generate protokoll:', error);
      alert('Kunde inte generera styrelseprotokoll: ' + error.message);
    }
    setLoadingProtokoll(false);
  };

  const canProceed = insynsloggKvitterad && (marPmDraft || marPmSkipped) && (protokollDraft || protokollSkipped);

  return (
    <div className="module-container">
      <div className="module-header">
        <button className="back-button" onClick={onBack}>← Tillbaka</button>
        <h1>📋 Projektvy — {projekt.name}</h1>
      </div>

      <div className="module-tabs">
        <button className={`tab ${activeTab === 'oversikt' ? 'active' : ''}`} onClick={() => setActiveTab('oversikt')}>
          Översikt
        </button>
        <button className={`tab ${activeTab === 'tidsplan' ? 'active' : ''}`} onClick={() => setActiveTab('tidsplan')}>
          Tidsplan
        </button>
      </div>

      <div className="module-content">
        {activeTab === 'oversikt' && (
          <div className="projektvy-oversikt">
            {/* Project Info */}
            <div className="projekt-info-card">
              <h2>Emissionsinformation</h2>
              <div className="info-grid-2col">
                <div className="info-item">
                  <span className="info-label">Projektnamn</span>
                  <span className="info-value">{projekt.name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Status</span>
                  <span className={`status-badge status-${projekt.status === 'active' ? 'blue' : 'gray'}`}>
                    {projekt.status === 'active' ? 'Aktiv' : 'Utkast'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Emissionstyp</span>
                  <span className="info-value">{projekt.emissionsvillkor?.typ}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Emissionsvolym</span>
                  <span className="info-value">{(projekt.emissionsvillkor?.emissionsvolym || 0).toLocaleString('sv-SE')} SEK</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Teckningskurs</span>
                  <span className="info-value">{projekt.emissionsvillkor?.teckningskurs} SEK</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Antal nya aktier</span>
                  <span className="info-value">{(projekt.emissionsvillkor?.antalNyaAktier || 0).toLocaleString('sv-SE')}</span>
                </div>
                {projekt.emissionsvillkor?.typ === 'Företrädesemission' && (
                  <div className="info-item">
                    <span className="info-label">Teckningsrätter</span>
                    <span className="info-value">{projekt.emissionsvillkor?.teckningsrätter}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions before Prospekt */}
            <div className="atgarder-section">
              <h2>Åtgärder innan Prospekt/IM</h2>
              <p className="atgarder-desc">Genomför följande steg innan du går vidare till Prospekt/IM-generatorn.</p>

              {/* 1. Insynslogg */}
              <div className={`atgard-card ${insynsloggKvitterad ? 'completed' : ''}`}>
                <div className="atgard-header">
                  <div className="atgard-status">
                    {insynsloggKvitterad ? '✅' : '⚠️'}
                  </div>
                  <div className="atgard-info">
                    <h3>Öppna insynslogg</h3>
                    <p>Enligt MAR (EU:s marknadsmissbruksförordning) ska insynslogg föras över alla personer med insiderinformation om emissionen.</p>
                  </div>
                </div>
                <div className="atgard-actions">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={insynsloggKvitterad} 
                      onChange={(e) => setInsynsloggKvitterad(e.target.checked)}
                    />
                    Jag har öppnat/uppdaterat insynsloggen
                  </label>
                </div>
              </div>

              {/* 2. MAR-PM */}
              <div className={`atgard-card ${marPmDraft || marPmSkipped ? 'completed' : ''}`}>
                <div className="atgard-header">
                  <div className="atgard-status">
                    {marPmDraft ? '✅' : marPmSkipped ? '⏩' : '📄'}
                  </div>
                  <div className="atgard-info">
                    <h3>Ta fram utkast till pressmeddelande (MAR)</h3>
                    <p>Pressmeddelande om styrelsebeslut om emission — ska publiceras enligt MAR:s krav om offentliggörande av insiderinformation.</p>
                  </div>
                </div>
                <div className="atgard-actions">
                  {!marPmSkipped && !marPmDraft ? (
                    <>
                      <button className="btn-primary" onClick={handleGenerateMarPM} disabled={loadingMarPm}>
                        {loadingMarPm ? 'Genererar...' : '🤖 Generera MAR-PM med AI'}
                      </button>
                      <label className="checkbox-label" style={{marginTop: '0.75rem', color: '#718096'}}>
                        <input 
                          type="checkbox" 
                          checked={marPmSkipped} 
                          onChange={(e) => setMarPmSkipped(e.target.checked)}
                        />
                        Hoppa över — jag hanterar detta separat
                      </label>
                    </>
                  ) : marPmSkipped && !marPmDraft ? (
                    <div style={{color: '#718096', fontStyle: 'italic'}}>
                      <p>⏩ Överhoppad</p>
                      <button className="btn-secondary" onClick={() => setMarPmSkipped(false)} style={{marginTop: '0.5rem'}}>
                        Ångra — generera ändå
                      </button>
                    </div>
                  ) : (
                    <div className="draft-section">
                      <label><strong>Utkast — redigera vid behov:</strong></label>
                      <textarea
                        className="draft-textarea"
                        value={marPmDraft}
                        onChange={(e) => { setMarPmDraft(e.target.value); setMarPmSaved(false); }}
                        rows={12}
                      />
                      <div className="draft-buttons">
                        <button className="btn-secondary" onClick={() => { setMarPmSaved(true); }}>
                          {marPmSaved ? '✅ Utkast sparat' : '💾 Spara utkast'}
                        </button>
                        <button className="btn-secondary" onClick={handleGenerateMarPM} disabled={loadingMarPm}>
                          🔄 Generera om
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Styrelseprotokoll */}
              <div className={`atgard-card ${protokollDraft || protokollSkipped ? 'completed' : ''}`}>
                <div className="atgard-header">
                  <div className="atgard-status">
                    {protokollDraft ? '✅' : protokollSkipped ? '⏩' : '📋'}
                  </div>
                  <div className="atgard-info">
                    <h3>Skapa styrelseprotokoll för beslut</h3>
                    <p>Formellt styrelseprotokoll som dokumenterar styrelsens beslut om att genomföra emissionen.</p>
                  </div>
                </div>
                <div className="atgard-actions">
                  {!protokollSkipped && !protokollDraft ? (
                    <>
                      <button className="btn-primary" onClick={handleGenerateProtokoll} disabled={loadingProtokoll}>
                        {loadingProtokoll ? 'Genererar...' : '🤖 Generera styrelseprotokoll med AI'}
                      </button>
                      <label className="checkbox-label" style={{marginTop: '0.75rem', color: '#718096'}}>
                        <input 
                          type="checkbox" 
                          checked={protokollSkipped} 
                          onChange={(e) => setProtokollSkipped(e.target.checked)}
                        />
                        Hoppa över — jag hanterar detta separat
                      </label>
                    </>
                  ) : protokollSkipped && !protokollDraft ? (
                    <div style={{color: '#718096', fontStyle: 'italic'}}>
                      <p>⏩ Överhoppad</p>
                      <button className="btn-secondary" onClick={() => setProtokollSkipped(false)} style={{marginTop: '0.5rem'}}>
                        Ångra — generera ändå
                      </button>
                    </div>
                  ) : (
                    <div className="draft-section">
                      <label><strong>Utkast — redigera vid behov:</strong></label>
                      <textarea
                        className="draft-textarea"
                        value={protokollDraft}
                        onChange={(e) => { setProtokollDraft(e.target.value); setProtokollSaved(false); }}
                        rows={12}
                      />
                      <div className="draft-buttons">
                        <button className="btn-secondary" onClick={() => { setProtokollSaved(true); }}>
                          {protokollSaved ? '✅ Utkast sparat' : '💾 Spara utkast'}
                        </button>
                        <button className="btn-secondary" onClick={handleGenerateProtokoll} disabled={loadingProtokoll}>
                          🔄 Generera om
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Continue to Prospekt */}
            <div className="proceed-section">
              {!canProceed && (
                <p className="proceed-hint">Slutför alla tre åtgärder ovan för att gå vidare till Prospekt/IM.</p>
              )}
              <button 
                className="btn-primary btn-large"
                disabled={!canProceed}
                onClick={() => onNavigate('prospekt', projekt)}
              >
                Gå vidare till Prospekt/IM →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'tidsplan' && (
          <div className="projektvy-tidsplan">
            <h2>📅 Tidsplan</h2>
            <p>Automatiskt genererad tidsplan baserad på projektets startdatum.</p>

            {projekt.tidsplan && projekt.tidsplan.length > 0 ? (
              <div className="tidsplan-timeline">
                {projekt.tidsplan.map((milestone, index) => (
                  <div key={index} className={`tidsplan-item ${milestone.completed ? 'completed' : ''}`}>
                    <div className="tidsplan-dot">
                      {milestone.completed ? '✅' : <span className="dot-number">{index + 1}</span>}
                    </div>
                    <div className="tidsplan-content">
                      <div className="tidsplan-date">{milestone.datum}</div>
                      <div className="tidsplan-milestone">{milestone.milestone}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="info-box">
                <p>Ingen tidsplan tillgänglig för detta projekt ännu.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjektVy;
