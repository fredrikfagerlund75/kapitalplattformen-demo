import React, { useState } from 'react';
import { apiPost } from '../utils/api';
import Marknadsföring from './Marknadsföring';

function Teckning({ user, projekt, onBack, onUpdateProject, onNavigate }) {
  const [activeTab, setActiveTab] = useState('emissionssida');
  const [loading, setLoading] = useState(false);
  
  // Emissionssida state
  const [emissionssidaHtml, setEmissionssidaHtml] = useState('');
  const [emissionssidaStep, setEmissionssidaStep] = useState('generate'); // generate | preview | published
  
  // MAR-PM state
  const [marPmType, setMarPmType] = useState('prospekt');
  const [marPmDraft, setMarPmDraft] = useState('');
  const [marPmSaved, setMarPmSaved] = useState(false);

  if (!projekt) {
    return (
      <div className="module-container">
        <div className="module-header">
          <button className="back-button" onClick={onBack}>← Tillbaka</button>
          <h1>✍️ Teckning</h1>
        </div>
        <div className="empty-state">
          <p>Välj ett emissionsprojekt från Dashboard</p>
        </div>
      </div>
    );
  }

  // Initialize emissionssida step from project state
  const effectiveStep = projekt.teckning?.emissionssidaUrl ? 'published' : emissionssidaStep;

  const handleCreateEmissionssida = async () => {
    setLoading(true);
    try {
      const gc = projekt.generatedContent || projekt.prospekt?.generatedContent || {};
      const response = await apiPost('/api/marketing/generate-landing-page', {
        companyName: user.company,
        emissionType: projekt.emissionsvillkor?.typ || 'Emission',
        emissionSize: `${(projekt.emissionsvillkor?.emissionsvolym || 0).toLocaleString('sv-SE')} SEK`,
        subscriptionPrice: projekt.emissionsvillkor?.teckningskurs || '',
        numberOfShares: projekt.emissionsvillkor?.antalNyaAktier || '',
        executiveSummary: gc.verksamhet || '',
        businessSection: gc.verksamhet || '',
        marketSection: gc.marknad || '',
        riskFactors: gc.riskfaktorer || '',
        team: []
      });
      if (!response.ok) throw new Error('Serverfel');
      const data = await response.json();
      setEmissionssidaHtml(data.landingPageHtml || '');
      setEmissionssidaStep('preview');
    } catch (error) {
      console.error('Error:', error);
      alert('Kunde inte skapa emissionssida: ' + error.message);
    }
    setLoading(false);
  };

  const handlePublishEmissionssida = async () => {
    setLoading(true);
    try {
      const url = `https://kapital.demo/${(user.company || 'bolag').toLowerCase().replace(/\s+/g, '-')}-emission`;
      await onUpdateProject(projekt.id, { 
        teckning: { ...projekt.teckning, emissionssidaUrl: url, emissionssidaHtml: emissionssidaHtml } 
      });
      setEmissionssidaStep('published');
    } catch (error) {
      console.error('Error:', error);
      alert('Kunde inte publicera: ' + error.message);
    }
    setLoading(false);
  };

  const handleGenerateMarPM = async () => {
    setLoading(true);
    try {
      const response = await apiPost('/api/kapitalradgivaren/mar-pm', {
        type: marPmType,
        projektData: {
          companyName: user.company,
          emissionsvillkor: projekt.emissionsvillkor
        }
      });
      if (!response.ok) throw new Error('Serverfel');
      const data = await response.json();
      setMarPmDraft(data.pressmeddelande || data.content || '');
      setMarPmSaved(false);
    } catch (error) {
      console.error('Error:', error);
      alert('Kunde inte generera MAR-PM: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <button className="back-button" onClick={onBack}>← Tillbaka</button>
        <h1>✍️ Teckning - {projekt.name}</h1>
      </div>

      <div className="module-tabs">
        <button className={`tab ${activeTab === 'emissionssida' ? 'active' : ''}`} onClick={() => setActiveTab('emissionssida')}>
          Emissionssida
        </button>
        <button className={`tab ${activeTab === 'mar-pm' ? 'active' : ''}`} onClick={() => setActiveTab('mar-pm')}>
          MAR-PM
        </button>
        <button className={`tab ${activeTab === 'marknadsforing' ? 'active' : ''}`} onClick={() => setActiveTab('marknadsforing')}>
          📢 Marknadsföring
        </button>
        <button className={`tab ${activeTab === 'videoteckning' ? 'active' : ''}`} onClick={() => setActiveTab('videoteckning')}>
          Videoteckning
        </button>
        <button className={`tab ${activeTab === 'tilldelning' ? 'active' : ''}`} onClick={() => setActiveTab('tilldelning')}>
          Tilldelning
        </button>
        <button className={`tab ${activeTab === 'bolagsverket' ? 'active' : ''}`} onClick={() => setActiveTab('bolagsverket')}>
          Bolagsverket
        </button>
      </div>

      <div className="module-content">
        {/* ===== EMISSIONSSIDA TAB ===== */}
        {activeTab === 'emissionssida' && (
          <div>
            <h2>🌐 Publik emissionssida</h2>
            <p>Skapa, granska och publicera emissionssidan.</p>

            {effectiveStep === 'generate' && (
              <div style={{marginTop: '16px'}}>
                <p style={{color: '#666', marginBottom: '16px'}}>
                  Emissionssidan genereras baserat på projektets data och det innehåll som skapades i Prospekt/IM-steget.
                </p>
                <button className="btn-primary" onClick={handleCreateEmissionssida} disabled={loading}>
                  {loading ? 'Genererar emissionssida...' : '🌐 Skapa emissionssida'}
                </button>
              </div>
            )}

            {effectiveStep === 'preview' && (
              <div style={{marginTop: '16px'}}>
                <div style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '12px',
                  padding: '12px 16px',
                  background: '#fff8e1',
                  borderRadius: '8px',
                  border: '1px solid #ffe082'
                }}>
                  <span><strong>⚡ Förhandsvisning</strong> — Granska sidan innan publicering. I demo räcker det att klicka på Publicera.</span>
                </div>
                
                <div style={{
                  border: '2px solid #ddd',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '16px',
                  background: '#f5f5f5'
                }}>
                  <div style={{
                    background: '#eee',
                    padding: '8px 16px',
                    fontSize: '13px',
                    color: '#666',
                    borderBottom: '1px solid #ddd',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{width:'12px', height:'12px', borderRadius:'50%', background:'#ff5f56', display:'inline-block'}}></span>
                    <span style={{width:'12px', height:'12px', borderRadius:'50%', background:'#ffbd2e', display:'inline-block'}}></span>
                    <span style={{width:'12px', height:'12px', borderRadius:'50%', background:'#27c93f', display:'inline-block'}}></span>
                    <span style={{marginLeft: '12px'}}>Emissionssida — förhandsvisning</span>
                  </div>
                  <iframe 
                    srcDoc={emissionssidaHtml}
                    title="Emissionssida preview"
                    style={{
                      width: '100%',
                      height: '600px',
                      border: 'none'
                    }}
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>

                <div style={{display: 'flex', gap: '12px'}}>
                  <button className="btn-primary btn-large" onClick={handlePublishEmissionssida} disabled={loading}>
                    {loading ? 'Publicerar...' : '🚀 Publicera emissionssidan'}
                  </button>
                  <button className="btn-secondary" onClick={handleCreateEmissionssida} disabled={loading}>
                    🔄 Generera om
                  </button>
                </div>
              </div>
            )}

            {effectiveStep === 'published' && (
              <div style={{marginTop: '16px'}}>
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '16px'
                }}>
                  <p style={{margin: '0 0 8px', fontWeight: '600', color: '#166534'}}>✅ Emissionssidan är publicerad</p>
                  <p style={{margin: 0, color: '#555'}}>
                    <strong>URL:</strong> {projekt.teckning?.emissionssidaUrl}
                  </p>
                </div>
                {emissionssidaHtml && (
                  <div style={{
                    border: '2px solid #86efac',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#f5f5f5'
                  }}>
                    <div style={{
                      background: '#eee',
                      padding: '8px 16px',
                      fontSize: '13px',
                      color: '#666',
                      borderBottom: '1px solid #ddd'
                    }}>
                      Publicerad emissionssida
                    </div>
                    <iframe 
                      srcDoc={emissionssidaHtml}
                      title="Publicerad emissionssida"
                      style={{ width: '100%', height: '500px', border: 'none' }}
                      sandbox="allow-same-origin allow-scripts"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== MAR-PM TAB ===== */}
        {activeTab === 'mar-pm' && (
          <div>
            <h2>📄 Generera MAR-PM</h2>
            <p>Skapa MAR-kompatibla pressmeddelanden för olika skeden av emissionen.</p>

            <div style={{marginTop: '16px', marginBottom: '16px'}}>
              <label style={{display: 'block', marginBottom: '8px', fontWeight: '500'}}>Välj typ av MAR-PM:</label>
              <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                <button 
                  className={marPmType === 'prospekt' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setMarPmType('prospekt')}
                >
                  📄 Prospekt offentliggjort
                </button>
                <button 
                  className={marPmType === 'utfall' ? 'btn-primary' : 'btn-secondary'}
                  onClick={() => setMarPmType('utfall')}
                >
                  📊 Emissionsutfall
                </button>
              </div>
            </div>

            {!marPmDraft ? (
              <button className="btn-primary" onClick={handleGenerateMarPM} disabled={loading}>
                {loading ? 'Genererar...' : `🤖 Generera MAR-PM (${marPmType === 'prospekt' ? 'prospekt offentliggjort' : 'emissionsutfall'})`}
              </button>
            ) : (
              <div>
                <div style={{
                  background: '#f0f7ff',
                  border: '1px solid #c8ddf5',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '12px',
                  fontSize: '14px'
                }}>
                  <strong>Utkast genererat</strong> — Redigera texten vid behov innan du sparar eller exporterar.
                </div>
                <textarea
                  value={marPmDraft}
                  onChange={(e) => { setMarPmDraft(e.target.value); setMarPmSaved(false); }}
                  rows={16}
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontFamily: "'SF Mono', Monaco, Menlo, monospace",
                    fontSize: '13px',
                    lineHeight: '1.6',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
                  <button className="btn-primary" onClick={() => setMarPmSaved(true)}>
                    {marPmSaved ? '✅ Utkast sparat' : '💾 Spara utkast'}
                  </button>
                  <button className="btn-secondary" onClick={handleGenerateMarPM} disabled={loading}>
                    🔄 Generera om
                  </button>
                  <button className="btn-secondary" onClick={() => { setMarPmDraft(''); setMarPmSaved(false); }}>
                    Ny typ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== MARKNADSFÖRING TAB ===== */}
        {activeTab === 'marknadsforing' && (
          <Marknadsföring user={user} projekt={projekt} onBack={onBack} onUpdateProject={onUpdateProject} embedded={true} />
        )}

        {/* ===== VIDEOTECKNING TAB ===== */}
        {activeTab === 'videoteckning' && (
          <div className="placeholder-content">
            <h2>🎥 Videoteckning</h2>
            <p>🚧 Work in progress — Kommer i framtida version</p>
            <p>Funktionalitet: Live OD-session för att verifiera tecknare</p>
          </div>
        )}

        {/* ===== TILLDELNING TAB ===== */}
        {activeTab === 'tilldelning' && (
          <div>
            <h2>📋 Tilldelning</h2>
            <p>Ladda upp tilldelningsförslag från emissionsinstitutet.</p>
            
            <div style={{
              marginTop: '16px',
              padding: '32px',
              border: '2px dashed #ccc',
              borderRadius: '12px',
              textAlign: 'center',
              background: '#fafafa'
            }}>
              <div style={{fontSize: '40px', marginBottom: '12px'}}>📁</div>
              <p style={{margin: '0 0 16px', color: '#555'}}>Dra och släpp fil här, eller klicka för att välja</p>
              <input type="file" id="tilldelning-upload" style={{display: 'none'}} />
              <label htmlFor="tilldelning-upload" className="btn-primary" style={{cursor: 'pointer', display: 'inline-block'}}>
                Ladda upp tilldelningsförslag
              </label>
            </div>

            {projekt.teckning?.tilldelningsforslag && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '16px'
              }}>
                <p style={{margin: '0 0 12px', fontWeight: '600'}}>✅ Tilldelningsförslag uppladdat</p>
                <button className="btn-primary" onClick={async () => {
                  setLoading(true);
                  try {
                    const response = await apiPost('/api/kapitalradgivaren/styrelseprotokoll', {
                      projektId: projekt.id,
                      type: 'tilldelningsbeslut',
                      projektData: {
                        companyName: user.company,
                        emissionsvillkor: projekt.emissionsvillkor
                      }
                    });
                    const data = await response.json();
                    alert(data.protokoll || data.content || 'Styrelseprotokoll genererat!');
                  } catch (error) {
                    console.error('Error:', error);
                  }
                  setLoading(false);
                }} disabled={loading}>
                  📋 Generera styrelseprotokoll för tilldelning
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== BOLAGSVERKET TAB ===== */}
        {activeTab === 'bolagsverket' && (
          <div>
            <h2>🏛️ Bolagsverket-registrering</h2>
            <p>Förbered underlag för registrering hos Bolagsverket.</p>
            
            <div style={{marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
              <button className="btn-primary" onClick={() => alert('Demo: Underlag genererat!')} disabled={loading}>
                Generera registreringsunderlag
              </button>
            </div>
            
            {projekt.teckning?.registreradBolagsverket && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '16px'
              }}>
                <p style={{margin: 0}}>✅ Registrerad hos Bolagsverket</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Teckning;
