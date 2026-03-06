import React, { useState } from 'react';
import './ProspektGenerator.css';
import { apiPost } from '../utils/api';

function ProspektGenerator({ user, projekt, companySettings, onBack, onUpdateProject, onNavigate }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingResearch, setLoadingResearch] = useState(false);
  
  // Simplified wizard - fewer steps since emission details are pre-filled
  const [formData, setFormData] = useState({
    // Step 1: Bolagsinformation (basic info)
    bolag: {
      namn: companySettings?.companyName || user.company,
      organisationsnummer: companySettings?.orgNr || '',
      säte: companySettings?.city || '',
      bransch: companySettings?.industry || '',
      verksamhetsbeskrivning: ''
    },
    // Step 2: Strategi & Marknad (simplified)
    strategi: {
      affärsmodell: '',
      marknadsbeskrivning: '',
      konkurrenter: ''
    },
    // Step 3: Finansiell översikt (simplified)
    finansiellt: {
      omsättning: '',
      resultat: '',
      egetKapital: '',
      år: new Date().getFullYear() - 1
    },
    // Step 4: Team (simplified)
    team: [
      { namn: '', roll: '', bakgrund: '' }
    ],
    // Step 5: Användning av emissionslikvid (already in projekt but can elaborate)
    användning: ''
  });

  const [generatedContent, setGeneratedContent] = useState({
    verksamhet: '',
    marknad: '',
    riskfaktorer: '',
    teamBios: ''
  });

  const handleResearch = async (researchType) => {
    setLoadingResearch(true);
    try {
      const response = await apiPost('/api/generate-company-research', {
        companyName: formData.bolag.namn,
        orgNr: formData.bolag.organisationsnummer || companySettings?.orgNr || '',
        website: companySettings?.website || '',
        researchType
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Kunde inte hämta data');
      const d = result.data;

      if (researchType === 'bolagsinfo') {
        setFormData(prev => ({
          ...prev,
          bolag: {
            ...prev.bolag,
            verksamhetsbeskrivning: d.verksamhetsbeskrivning || prev.bolag.verksamhetsbeskrivning,
            bransch: d.bransch || prev.bolag.bransch,
            säte: d.ort || prev.bolag.säte
          }
        }));
      } else if (researchType === 'strategi_marknad') {
        setFormData(prev => ({
          ...prev,
          strategi: {
            affärsmodell: d.affarsmodell || prev.strategi.affärsmodell,
            marknadsbeskrivning: d.marknadsbeskrivning || prev.strategi.marknadsbeskrivning,
            konkurrenter: d.konkurrenter || prev.strategi.konkurrenter
          }
        }));
      } else if (researchType === 'finansiellt') {
        setFormData(prev => ({
          ...prev,
          finansiellt: {
            omsättning: d.omsattning || prev.finansiellt.omsättning,
            resultat: d.resultat || prev.finansiellt.resultat,
            egetKapital: d.egetKapital || prev.finansiellt.egetKapital,
            år: d.ar ? parseInt(d.ar) : prev.finansiellt.år
          }
        }));
      } else if (researchType === 'ledning') {
        if (d.team && d.team.length > 0) {
          setFormData(prev => ({
            ...prev,
            team: d.team.map(t => ({
              namn: t.namn || '',
              roll: t.roll || '',
              bakgrund: t.bakgrund || ''
            }))
          }));
        }
      }
    } catch (error) {
      console.error('Research error:', error);
      alert('Kunde inte hämta data: ' + error.message);
    }
    setLoadingResearch(false);
  };

  if (!projekt) {
    return (
      <div className="module-container">
        <div className="module-header">
          <button className="back-button" onClick={onBack}>← Tillbaka</button>
          <h1>📄 Prospekt/IM Generator</h1>
        </div>
        <div className="empty-state">
          <p>Välj ett emissionsprojekt från Dashboard för att skapa Prospekt/IM</p>
        </div>
      </div>
    );
  }

  const handleGenerateContent = async () => {
    setLoading(true);
    try {
      const company = {
        name: formData.bolag.namn,
        industry: formData.bolag.bransch
      };

      // Generate business section
      const verksamhetResponse = await apiPost('/api/generate-business-section', {
        company,
        business: {
          description: formData.bolag.verksamhetsbeskrivning,
          businessModel: formData.strategi.affärsmodell
        }
      });
      
      // Generate market section
      const marknadResponse = await apiPost('/api/generate-market-section', {
        company,
        market: {
          description: formData.strategi.marknadsbeskrivning,
          competitors: formData.strategi.konkurrenter
        }
      });

      // Generate risk factors
      const riskResponse = await apiPost('/api/generate-risk-factors', {
        company,
        business: { description: formData.bolag.verksamhetsbeskrivning },
        financial: {
          revenue: formData.finansiellt.omsättning,
          result: formData.finansiellt.resultat
        }
      });

      // Generate team bios
      const teamResponse = await apiPost('/api/generate-team-bios', {
        team: formData.team
      });

      const verksamhet = await verksamhetResponse.json();
      const marknad = await marknadResponse.json();
      const risk = await riskResponse.json();
      const team = await teamResponse.json();

      const newContent = {
        verksamhet: verksamhet.business || '',
        marknad: marknad.market || '',
        riskfaktorer: risk.risks || '',
        teamBios: team.bios || ''
      };

      setGeneratedContent(newContent);

      // Save generated content to projekt
      await onUpdateProject(projekt.id, { generatedContent: newContent });

      setStep(6); // Go to preview step
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Kunde inte generera innehåll. Kontrollera att servern är igång.');
    }
    setLoading(false);
  };

  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      const pdfPayload = {
        company: {
          name: formData.bolag.namn,
          orgNr: formData.bolag.organisationsnummer,
          industry: formData.bolag.bransch
        },
        emission: {
          sizeSEK: projekt.emissionsvillkor.emissionsvolym,
          type: projekt.emissionsvillkor.typ,
          pricePerShare: projekt.emissionsvillkor.teckningskurs,
          numberOfShares: projekt.emissionsvillkor.antalNyaAktier
        },
        generated: {
          business: generatedContent.verksamhet,
          market: generatedContent.marknad,
          risks: generatedContent.riskfaktorer,
          team: generatedContent.teamBios
        },
        financial: {
          revenue: formData.finansiellt.omsättning,
          result: formData.finansiellt.resultat,
          equity: formData.finansiellt.egetKapital,
          year: formData.finansiellt.år
        },
        usage: formData.användning
      };

      const response = await apiPost('/api/generate-pdf', pdfPayload);

      if (!response.ok) {
        throw new Error('PDF-generering misslyckades');
      }

      // Download PDF as blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${formData.bolag.namn.replace(/\s+/g, '_')}_IM.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Update projekt with prospekt info
      await onUpdateProject(projekt.id, {
        prospekt: {
          type: 'IM',
          generatedAt: new Date().toISOString()
        },
        currentModule: 'teckning'
      });
      
      alert('PDF genererad och nedladdad! Går vidare till Teckning...');
      onNavigate('teckning', projekt);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Kunde inte generera PDF: ' + error.message);
    }
    setLoading(false);
  };

  const addTeamMember = () => {
    setFormData({
      ...formData,
      team: [...formData.team, { namn: '', roll: '', bakgrund: '' }]
    });
  };

  const removeTeamMember = (index) => {
    setFormData({
      ...formData,
      team: formData.team.filter((_, i) => i !== index)
    });
  };

  const updateTeamMember = (index, field, value) => {
    const newTeam = [...formData.team];
    newTeam[index][field] = value;
    setFormData({ ...formData, team: newTeam });
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <button className="back-button" onClick={onBack}>← Tillbaka</button>
        <h1>📄 Prospekt/IM Generator</h1>
      </div>

      {/* Progress bar */}
      <div className="wizard-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(step / 6) * 100}%` }}></div>
        </div>
        <div className="progress-label">Steg {step} av 6 - Förenklad wizard (data från emissionsprojekt används)</div>
      </div>

      <div className="module-content">
        {/* Show emission details at top */}
        <div className="emission-details-banner">
          <h3>✅ Emissionsvillkor (från projektet)</h3>
          <div className="details-grid">
            <div><strong>Typ:</strong> {projekt.emissionsvillkor.typ}</div>
            <div><strong>Teckningskurs:</strong> {projekt.emissionsvillkor.teckningskurs} SEK</div>
            <div><strong>Antal aktier:</strong> {projekt.emissionsvillkor.antalNyaAktier.toLocaleString('sv-SE')}</div>
            <div><strong>Volym:</strong> {projekt.emissionsvillkor.emissionsvolym.toLocaleString('sv-SE')} SEK</div>
          </div>
        </div>

        {/* Step 1: Bolagsinformation */}
        {step === 1 && (
          <div className="wizard-step">
            <h2>Steg 1: Bolagsinformation</h2>
            <p>Grundläggande information om bolaget</p>

            <button className="btn-secondary" onClick={() => handleResearch('bolagsinfo')} disabled={loadingResearch} style={{marginBottom: '16px'}}>
              {loadingResearch ? 'Söker...' : '🤖 Fyll i med AI'}
            </button>

            <div className="form-group">
              <label>Bolagsnamn</label>
              <input 
                type="text"
                value={formData.bolag.namn}
                onChange={(e) => setFormData({...formData, bolag: {...formData.bolag, namn: e.target.value}})}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Organisationsnummer</label>
                <input 
                  type="text"
                  value={formData.bolag.organisationsnummer}
                  onChange={(e) => setFormData({...formData, bolag: {...formData.bolag, organisationsnummer: e.target.value}})}
                  placeholder="XXXXXX-XXXX"
                />
              </div>
              <div className="form-group">
                <label>Säte</label>
                <input 
                  type="text"
                  value={formData.bolag.säte}
                  onChange={(e) => setFormData({...formData, bolag: {...formData.bolag, säte: e.target.value}})}
                  placeholder="T.ex. Stockholm"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Bransch</label>
              <input 
                type="text"
                value={formData.bolag.bransch}
                onChange={(e) => setFormData({...formData, bolag: {...formData.bolag, bransch: e.target.value}})}
                placeholder="T.ex. Cleantech, SaaS, Medtech"
              />
            </div>

            <div className="form-group">
              <label>Verksamhetsbeskrivning</label>
              <textarea 
                value={formData.bolag.verksamhetsbeskrivning}
                onChange={(e) => setFormData({...formData, bolag: {...formData.bolag, verksamhetsbeskrivning: e.target.value}})}
                rows="4"
                placeholder="Beskriv vad bolaget gör, vilka produkter/tjänster ni erbjuder"
              />
            </div>
          </div>
        )}

        {/* Step 2: Strategi & Marknad */}
        {step === 2 && (
          <div className="wizard-step">
            <h2>Steg 2: Strategi & Marknad</h2>

            <button className="btn-secondary" onClick={() => handleResearch('strategi_marknad')} disabled={loadingResearch} style={{marginBottom: '16px'}}>
              {loadingResearch ? 'Söker...' : '🤖 Hämta med AI'}
            </button>

            <div className="form-group">
              <label>Affärsmodell</label>
              <textarea 
                value={formData.strategi.affärsmodell}
                onChange={(e) => setFormData({...formData, strategi: {...formData.strategi, affärsmodell: e.target.value}})}
                rows="3"
                placeholder="Hur tjänar ni pengar? Prenumeration, licens, transaktion?"
              />
            </div>

            <div className="form-group">
              <label>Marknadsbeskrivning</label>
              <textarea 
                value={formData.strategi.marknadsbeskrivning}
                onChange={(e) => setFormData({...formData, strategi: {...formData.strategi, marknadsbeskrivning: e.target.value}})}
                rows="3"
                placeholder="Beskriv er målmarknad, storlek, tillväxt"
              />
            </div>

            <div className="form-group">
              <label>Konkurrenter</label>
              <textarea 
                value={formData.strategi.konkurrenter}
                onChange={(e) => setFormData({...formData, strategi: {...formData.strategi, konkurrenter: e.target.value}})}
                rows="2"
                placeholder="Vilka är era huvudkonkurrenter?"
              />
            </div>
          </div>
        )}

        {/* Step 3: Finansiell översikt */}
        {step === 3 && (
          <div className="wizard-step">
            <h2>Steg 3: Finansiell översikt</h2>
            <p>Senaste räkenskapsåret</p>

            <button className="btn-secondary" onClick={() => handleResearch('finansiellt')} disabled={loadingResearch} style={{marginBottom: '16px'}}>
              {loadingResearch ? 'Söker...' : '🤖 Hämta med AI'}
            </button>
            <div className="info-box" style={{marginBottom: '16px', background: '#fff8e1', borderColor: '#ffe082'}}>
              <p>⚠️ AI-hämtad finansiell data bör verifieras mot bolagets årsredovisning eller kvartalsrapporter.</p>
            </div>

            <div className="form-group">
              <label>Räkenskapsår</label>
              <input 
                type="number"
                value={formData.finansiellt.år}
                onChange={(e) => setFormData({...formData, finansiellt: {...formData.finansiellt, år: parseInt(e.target.value)}})}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Omsättning (TSEK)</label>
                <input 
                  type="number"
                  value={formData.finansiellt.omsättning}
                  onChange={(e) => setFormData({...formData, finansiellt: {...formData.finansiellt, omsättning: e.target.value}})}
                />
              </div>
              <div className="form-group">
                <label>Resultat (TSEK)</label>
                <input 
                  type="number"
                  value={formData.finansiellt.resultat}
                  onChange={(e) => setFormData({...formData, finansiellt: {...formData.finansiellt, resultat: e.target.value}})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Eget kapital (TSEK)</label>
              <input 
                type="number"
                value={formData.finansiellt.egetKapital}
                onChange={(e) => setFormData({...formData, finansiellt: {...formData.finansiellt, egetKapital: e.target.value}})}
              />
            </div>
          </div>
        )}

        {/* Step 4: Team */}
        {step === 4 && (
          <div className="wizard-step">
            <h2>Steg 4: Ledning & Styrelse</h2>

            <button className="btn-secondary" onClick={() => handleResearch('ledning')} disabled={loadingResearch} style={{marginBottom: '16px'}}>
              {loadingResearch ? 'Söker...' : '🤖 Hämta med AI'}
            </button>

            {formData.team.map((member, index) => (
              <div key={index} className="team-member-card">
                <div className="team-member-header">
                  <h4>Person {index + 1}</h4>
                  {formData.team.length > 1 && (
                    <button className="btn-remove" onClick={() => removeTeamMember(index)}>
                      ✕ Ta bort
                    </button>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Namn</label>
                    <input 
                      type="text"
                      value={member.namn}
                      onChange={(e) => updateTeamMember(index, 'namn', e.target.value)}
                      placeholder="Förnamn Efternamn"
                    />
                  </div>
                  <div className="form-group">
                    <label>Roll</label>
                    <input 
                      type="text"
                      value={member.roll}
                      onChange={(e) => updateTeamMember(index, 'roll', e.target.value)}
                      placeholder="VD, CFO, Styrelseordförande, etc."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Bakgrund</label>
                  <textarea 
                    value={member.bakgrund}
                    onChange={(e) => updateTeamMember(index, 'bakgrund', e.target.value)}
                    rows="2"
                    placeholder="Relevant erfarenhet och utbildning"
                  />
                </div>
              </div>
            ))}

            <button className="btn-secondary" onClick={addTeamMember}>
              ➕ Lägg till person
            </button>
          </div>
        )}

        {/* Step 5: Användning av emissionslikvid */}
        {step === 5 && (
          <div className="wizard-step">
            <h2>Steg 5: Användning av emissionslikvid</h2>
            <p>Kapitalet från emissionen kommer användas till:</p>

            <div className="form-group">
              <label>Beskriv hur emissionslikviden ska användas</label>
              <textarea 
                value={formData.användning}
                onChange={(e) => setFormData({...formData, användning: e.target.value})}
                rows="6"
                placeholder="Exempel:&#10;• Produktutveckling: 40% (6 MSEK)&#10;• Marknadsföring: 30% (4.5 MSEK)&#10;• Anställningar: 20% (3 MSEK)&#10;• Rörelsekapital: 10% (1.5 MSEK)"
              />
            </div>

            <div className="info-box">
              <p><strong>Totalt tillgängligt från emission:</strong> {projekt.emissionsvillkor.emissionsvolym.toLocaleString('sv-SE')} SEK</p>
            </div>
          </div>
        )}

        {/* Step 6: Preview & Generate */}
        {step === 6 && (
          <div className="wizard-step">
            <h2>Granska och generera</h2>

            <div className="preview-section">
              <h3>📄 Prospekt/IM innehåll</h3>
              
              <div className="preview-card">
                <h4>Verksamhet och Strategi</h4>
                <p>{generatedContent.verksamhet}</p>
              </div>

              <div className="preview-card">
                <h4>Marknadsöversikt</h4>
                <p>{generatedContent.marknad}</p>
              </div>

              <div className="preview-card">
                <h4>Riskfaktorer</h4>
                <pre>{generatedContent.riskfaktorer}</pre>
              </div>

              <div className="preview-card">
                <h4>Ledning och Styrelse</h4>
                <pre>{generatedContent.teamBios}</pre>
              </div>

              <div className="preview-card">
                <h4>Finansiell information</h4>
                <p>Omsättning: {formData.finansiellt.omsättning} TSEK ({formData.finansiellt.år})</p>
                <p>Resultat: {formData.finansiellt.resultat} TSEK</p>
                <p>Eget kapital: {formData.finansiellt.egetKapital} TSEK</p>
              </div>

              <div className="preview-card">
                <h4>Emissionsvillkor</h4>
                <p>Typ: {projekt.emissionsvillkor.typ}</p>
                <p>Teckningskurs: {projekt.emissionsvillkor.teckningskurs} SEK</p>
                <p>Antal nya aktier: {projekt.emissionsvillkor.antalNyaAktier.toLocaleString('sv-SE')}</p>
                <p>Emissionsvolym: {projekt.emissionsvillkor.emissionsvolym.toLocaleString('sv-SE')} SEK</p>
              </div>

              <div className="preview-card">
                <h4>Användning av emissionslikvid</h4>
                <pre>{formData.användning}</pre>
              </div>
            </div>

            <button 
              className="btn-primary btn-large"
              onClick={handleGeneratePDF}
              style={{width: '100%', marginTop: '2rem'}}
            >
              📄 Generera PDF och gå vidare till Teckning
            </button>
          </div>
        )}

        {/* Navigation buttons */}
        {step < 6 && (
          <div className="wizard-navigation">
            {step > 1 && (
              <button className="btn-secondary" onClick={() => setStep(step - 1)}>
                ← Föregående
              </button>
            )}
            {step < 5 && (
              <button className="btn-primary" onClick={() => setStep(step + 1)}>
                Nästa →
              </button>
            )}
            {step === 5 && (
              <button 
                className="btn-primary"
                onClick={handleGenerateContent}
                disabled={loading}
              >
                {loading ? 'Genererar innehåll...' : '🤖 Generera innehåll med AI'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProspektGenerator;
