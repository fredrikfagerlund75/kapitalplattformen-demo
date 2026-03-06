import React, { useState } from 'react';
import './Kapitalrådgivaren.css';
import { apiPost } from '../utils/api';

function Kapitalrådgivaren({ user, projekt, onBack, onCreateProject, onUpdateProject, onNavigate }) {
  const [step, setStep] = useState(projekt ? 'overview' : 'analys');
  const [loading, setLoading] = useState(false);
  
  const [analysData, setAnalysData] = useState({
    companyData: {
      name: user.company,
      industry: '',
      currentCapital: '',
      burnRate: '',
      runway: '',
      purpose: ''
    },
    kapitalbehov: '',
    tidhorisont: ''
  });
  
  const [generatedAnalys, setGeneratedAnalys] = useState('');
  const [emissionsvillkor, setEmissionsvillkor] = useState({
    typ: 'Företrädesemission',
    teckningskurs: '',
    antalNyaAktier: '',
    emissionsvolym: '',
    teckningsrätter: '1:5'
  });

  const [marPmResult, setMarPmResult] = useState('');
  const [protokollResult, setProtokollResult] = useState('');

  const handleGenerateAnalys = async () => {
    setLoading(true);
    try {
      const response = await apiPost('/api/kapitalradgivaren/emissionsanalys', analysData);
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server svarade ${response.status}: ${errText}`);
      }
      const data = await response.json();
      if (!data.analys) {
        throw new Error('Tomt svar från servern');
      }
      setGeneratedAnalys(data.analys);
      setStep('villkor');
    } catch (error) {
      console.error('Failed to generate analys:', error);
      alert('Fel: ' + (error.message || 'Kunde inte ansluta till servern'));
    }
    setLoading(false);
  };

  const handleGenerateMarPM = async (type) => {
    setLoading(true);
    try {
      const response = await apiPost('/api/kapitalradgivaren/mar-pm', {
        type,
        projektData: {
          companyName: projekt.companyName || projekt.name,
          emissionsvillkor: projekt.emissionsvillkor
        }
      });
      const data = await response.json();
      setMarPmResult(data.pressmeddelande);
    } catch (error) {
      console.error('Failed to generate MAR-PM:', error);
    }
    setLoading(false);
  };

  const handleGenerateProtokoll = async () => {
    setLoading(true);
    try {
      const response = await apiPost('/api/kapitalradgivaren/styrelseprotokoll', {
        projektId: projekt.id,
        company: projekt.name,
        emissionsvillkor: projekt.emissionsvillkor
      });
      const data = await response.json();
      setProtokollResult(data.content);
    } catch (error) {
      console.error('Failed to generate protokoll:', error);
    }
    setLoading(false);
  };

  const handleCreateProject = async () => {
    setLoading(true);
    try {
      const projektData = {
        name: `${emissionsvillkor.typ} ${new Date().getFullYear()}`,
        emissionsvillkor,
        tidsplan: [
          { datum: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0], milestone: 'Styrelsebeslut', completed: false },
          { datum: new Date(Date.now() + 21*24*60*60*1000).toISOString().split('T')[0], milestone: 'Prospekt klart', completed: false },
          { datum: new Date(Date.now() + 35*24*60*60*1000).toISOString().split('T')[0], milestone: 'Emission öppnar', completed: false },
          { datum: new Date(Date.now() + 49*24*60*60*1000).toISOString().split('T')[0], milestone: 'Emission stänger', completed: false },
          { datum: new Date(Date.now() + 56*24*60*60*1000).toISOString().split('T')[0], milestone: 'Tilldelning', completed: false }
        ]
      };
      
      const newProjekt = await onCreateProject(projektData);
      alert('Emissionsprojekt skapat! Går vidare till Projektvyn...');
      onNavigate('projektvy', newProjekt);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Demo: Projekt skapat (backend offline)');
    }
    setLoading(false);
  };

  if (projekt && step === 'overview') {
    return (
      <div className="module-container">
        <div className="module-header">
          <button className="back-button" onClick={onBack}>← Tillbaka</button>
          <h1>🎯 Kapitalrådgivaren</h1>
        </div>
        <div className="module-content">
          <div className="project-overview">
            <h2>{projekt.name}</h2>
            <div className="info-grid">
              <div className="info-item">
                <strong>Emissionstyp:</strong> {projekt.emissionsvillkor.typ}
              </div>
              <div className="info-item">
                <strong>Volym:</strong> {projekt.emissionsvillkor.emissionsvolym.toLocaleString('sv-SE')} SEK
              </div>
              <div className="info-item">
                <strong>Teckningskurs:</strong> {projekt.emissionsvillkor.teckningskurs} SEK
              </div>
            </div>
            
            <div className="actions-section">
              <h3>Tillgängliga åtgärder</h3>
              <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px'}}>
                <button className="btn-primary" onClick={() => handleGenerateMarPM('beslut')} disabled={loading}>
                  📄 MAR-PM: Styrelsebeslut
                </button>
                <button className="btn-primary" onClick={() => handleGenerateMarPM('prospekt')} disabled={loading}>
                  📄 MAR-PM: Prospekt godkänt
                </button>
                <button className="btn-primary" onClick={() => handleGenerateMarPM('utfall')} disabled={loading}>
                  📄 MAR-PM: Utfall emission
                </button>
              </div>
              <button className="btn-secondary" onClick={handleGenerateProtokoll} disabled={loading}>
                📋 Generera styrelseprotokoll
              </button>
              <button className="btn-secondary" onClick={() => alert('Påminnelse: Kom ihåg att föra insynslogg!')} style={{marginLeft:'8px'}}>
                ⚠️ Påminn om insynslogg
              </button>

              {marPmResult && (
                <div className="generated-content" style={{marginTop:'16px'}}>
                  <h3>📄 Genererat MAR-PM</h3>
                  <pre style={{whiteSpace:'pre-wrap',background:'#f8f9fa',padding:'16px',borderRadius:'8px',fontSize:'14px'}}>{marPmResult}</pre>
                </div>
              )}

              {protokollResult && (
                <div className="generated-content" style={{marginTop:'16px'}}>
                  <h3>📋 Genererat Styrelseprotokoll</h3>
                  <pre style={{whiteSpace:'pre-wrap',background:'#f8f9fa',padding:'16px',borderRadius:'8px',fontSize:'14px'}}>{protokollResult}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <button className="back-button" onClick={onBack}>← Tillbaka</button>
        <h1>🎯 Kapitalrådgivaren - Ny Emission</h1>
      </div>

      <div className="wizard-steps">
        <div className={`step ${step === 'analys' ? 'active' : step !== 'analys' ? 'completed' : ''}`}>1. Analys</div>
        <div className={`step ${step === 'villkor' ? 'active' : ''}`}>2. Emissionsvillkor</div>
        <div className={`step ${step === 'skapa' ? 'active' : ''}`}>3. Skapa projekt</div>
      </div>

      <div className="module-content">
        {step === 'analys' && (
          <div className="analys-form">
            <h2>Emissionsanalys</h2>
            <div className="info-box" style={{background: '#f0f7ff', border: '1px solid #c8ddf5', borderRadius: '8px', padding: '24px', marginBottom: '24px'}}>
              <p style={{fontSize: '16px', marginBottom: '12px'}}>
                <strong>🚧 Analysfunktionen är under utveckling</strong>
              </p>
              <p style={{color: '#555', marginBottom: '8px'}}>
                Syftet med detta steg är att leverera en rekommendation på bästa sättet att ta in kapital, 
                baserat på bolagets situation, marknad och behov. AI:n kommer analysera era förutsättningar 
                och ge en skräddarsydd emissionsrekommendation.
              </p>
              <p style={{color: '#555'}}>
                I demo börjar processen direkt i <strong>Steg 2 — Emissionsvillkor</strong>.
              </p>
            </div>
            
            <button 
              className="btn-primary btn-large"
              onClick={() => setStep('villkor')}
            >
              Gå vidare till Emissionsvillkor →
            </button>
          </div>
        )}

        {step === 'villkor' && (
          <div className="villkor-form">
            <h2>Emissionsvillkor</h2>
            {generatedAnalys && (
              <div className="generated-content">
                <h3>📊 Analysresultat</h3>
                <div className="analys-text">{generatedAnalys}</div>
              </div>
            )}
            
            <h3>Ange emissionsvillkor</h3>
            <div className="form-group">
              <label>Typ av emission</label>
              <select 
                value={emissionsvillkor.typ}
                onChange={(e) => setEmissionsvillkor({...emissionsvillkor, typ: e.target.value})}
              >
                <option>Företrädesemission</option>
                <option>Nyemission</option>
                <option>Riktad emission</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Teckningskurs (SEK)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={emissionsvillkor.teckningskurs}
                  onChange={(e) => setEmissionsvillkor({...emissionsvillkor, teckningskurs: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Antal nya aktier</label>
                <input 
                  type="number"
                  value={emissionsvillkor.antalNyaAktier}
                  onChange={(e) => {
                    const antal = e.target.value;
                    const volym = antal * emissionsvillkor.teckningskurs;
                    setEmissionsvillkor({...emissionsvillkor, antalNyaAktier: antal, emissionsvolym: volym});
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Emissionsvolym (SEK) - Beräknas automatiskt</label>
              <input 
                type="number"
                value={emissionsvillkor.emissionsvolym}
                readOnly
                style={{background: '#f0f0f0'}}
              />
            </div>

            {emissionsvillkor.typ === 'Företrädesemission' && (
              <div className="form-group">
                <label>Teckningsrätter</label>
                <input 
                  type="text"
                  value={emissionsvillkor.teckningsrätter}
                  onChange={(e) => setEmissionsvillkor({...emissionsvillkor, teckningsrätter: e.target.value})}
                  placeholder="T.ex. 1:5"
                />
              </div>
            )}

            <div className="button-row">
              <button className="btn-secondary" onClick={() => setStep('analys')}>← Tillbaka</button>
              <button 
                className="btn-primary"
                onClick={handleCreateProject}
                disabled={!emissionsvillkor.teckningskurs || !emissionsvillkor.antalNyaAktier}
              >
                Skapa emissionsprojekt →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Kapitalrådgivaren;
