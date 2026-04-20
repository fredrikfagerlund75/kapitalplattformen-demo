import React, { useState } from 'react';
import './ProspektGenerator.css';
import { apiPost, getAuthHeaders } from '../utils/api';
import PitchDeckEditor from './PitchDeckEditor/PitchDeckEditor';
import { ChevronLeft, ChevronRight, FileText, CheckCircle2, ClipboardList, Sparkles, Download, AlertTriangle, Lightbulb, Save, Plus, X, Dices } from 'lucide-react';

const DEMO_EMISSION_ID = '83ed09ce-cd14-46e0-bcc9-5141d6aa70c3';
const DEMO_COMPANY_ID  = '1485df45-910c-43cc-8197-ead8282e357d';

function ProspektGenerator({ user, projekt, companySettings, onBack, onUpdateProject, onNavigate }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingResearch, setLoadingResearch] = useState(false);
  const [qualification, setQualification] = useState(null);
  const [qualificationForm, setQualificationForm] = useState({
    market: '',
    emissionSizeSEK: projekt?.emissionsvillkor?.emissionsvolym || '',
    period12Months: true,
    audience: ''
  });
  
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
    teamBios: '',
    finansiellInfo: '',
    emissionsvillkorText: '',
    användningText: ''
  });

  const [investmentThesis, setInvestmentThesis] = useState(null);
  const [analyzingCompany, setAnalyzingCompany] = useState(false);

  const saveImSections = async () => {
    const sections = [
      { section_key: 'verksamhet',      section_title: 'Verksamhet och Strategi',        content: generatedContent.verksamhet,  order_index: 1 },
      { section_key: 'marknad',         section_title: 'Marknadsöversikt',               content: generatedContent.marknad,     order_index: 2 },
      { section_key: 'riskfaktorer',    section_title: 'Riskfaktorer',                   content: generatedContent.riskfaktorer,order_index: 3 },
      { section_key: 'team',            section_title: 'Ledning och Styrelse',           content: generatedContent.teamBios,    order_index: 4 },
      { section_key: 'finansiellt',     section_title: 'Finansiell information',         content: generatedContent.finansiellInfo,      order_index: 5 },
      { section_key: 'emissionsvillkor',section_title: 'Emissionsvillkor',               content: generatedContent.emissionsvillkorText, order_index: 6 },
      { section_key: 'anvandning',      section_title: 'Användning av emissionslikvid', content: generatedContent.användningText,      order_index: 7 },
    ].filter(s => s.content && s.content.trim());

    const res = await fetch(`/api/emissions/${DEMO_EMISSION_ID}/im-sections`, {
      method:  'PUT',
      headers: getAuthHeaders(),
      body:    JSON.stringify({ sections }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
  };

  const handleResearch = async (researchType) => {
    if (!formData.bolag.namn) {
      alert('Fyll i bolagsnamnet (eller org.nr) först, sedan kan AI:n söka information.');
      return;
    }
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
        if (!d.omsattning && !d.resultat && !d.egetKapital) {
          alert('Kunde inte hitta finansiell data för detta bolag. Fyll i manuellt.');
        } else {
          setFormData(prev => ({
            ...prev,
            finansiellt: {
              omsättning: d.omsattning || prev.finansiellt.omsättning,
              resultat: d.resultat || prev.finansiellt.resultat,
              egetKapital: d.egetKapital || prev.finansiellt.egetKapital,
              år: d.ar ? parseInt(d.ar) : prev.finansiellt.år
            }
          }));
        }
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
        } else {
          alert('Kunde inte hitta ledningsinformation för detta bolag. Fyll i manuellt.');
        }
      }
    } catch (error) {
      console.error('Research error:', error);
      alert('Kunde inte hämta data: ' + error.message);
    }
    setLoadingResearch(false);
  };

  const handleQualification = async () => {
    setLoading(true);
    try {
      const response = await apiPost('/api/qualify-document', qualificationForm);
      const data = await response.json();
      setQualification(data);
    } catch (error) {
      console.error('Qualification error:', error);
      alert('Kunde inte avgöra dokumenttyp');
    }
    setLoading(false);
  };

  if (!projekt) {
    return (
      <div className="module-container">
        <div className="module-header">
          <button className="back-button" onClick={onBack}><ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka</button>
          <h1><FileText size={20} strokeWidth={1.5} /> IM/Prospekt Generator</h1>
        </div>
        <div className="empty-state">
          <p>Välj ett emissionsprojekt från Dashboard för att skapa Prospekt/IM</p>
        </div>
      </div>
    );
  }

  const readStream = async (response, onChunk) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        if (payload === '[DONE]') return;
        try {
          const parsed = JSON.parse(payload);
          if (parsed.text) onChunk(parsed.text);
          if (parsed.error) throw new Error(parsed.error);
        } catch (_) {}
      }
    }
  };

  const handleGenerateContent = async () => {
    setLoading(true);
    setGeneratedContent({ verksamhet: '', marknad: '', riskfaktorer: '', teamBios: '', finansiellInfo: '', emissionsvillkorText: '', användningText: '' });
    setInvestmentThesis(null);
    setStep(6);

    const company = { name: formData.bolag.namn, industry: formData.bolag.bransch };

    // Steg 1: Analytiskt förpass
    setAnalyzingCompany(true);
    let thesis = null;
    try {
      const analyzeResp = await apiPost('/api/analyze-company', {
        company,
        business:  { description: formData.bolag.verksamhetsbeskrivning, businessModel: formData.strategi.affärsmodell, strategy: formData.strategi.strategi || '' },
        market:    { description: formData.strategi.marknadsbeskrivning, competitors: formData.strategi.konkurrenter, size: formData.strategi.marknadsstorlek || '' },
        financial: { revenue: formData.finansiellt.omsättning, result: formData.finansiellt.resultat, equity: formData.finansiellt.egetKapital, år: formData.finansiellt.år },
        team:      formData.team,
        användning: formData.användning,
        emission:  { sizeSEK: projekt?.emissionsvillkor?.emissionsvolym }
      });
      const analyzeData = await analyzeResp.json();
      thesis = analyzeData.thesis;
      setInvestmentThesis(thesis);
    } catch (err) {
      console.warn('Thesis analysis failed, continuing without context:', err);
    } finally {
      setAnalyzingCompany(false);
    }

    // Steg 2: Generera sektioner med thesis som kontext
    try {
      const [verksamhetResp, marknadResp, riskResp, teamResp, finansiellResp, villkorResp, användningResp] = await Promise.all([
        apiPost('/api/generate-business-section', { company, business: { description: formData.bolag.verksamhetsbeskrivning, businessModel: formData.strategi.affärsmodell }, investmentThesis: thesis }),
        apiPost('/api/generate-market-section', { company, market: { description: formData.strategi.marknadsbeskrivning, competitors: formData.strategi.konkurrenter }, investmentThesis: thesis }),
        apiPost('/api/generate-risk-factors', { company, business: { description: formData.bolag.verksamhetsbeskrivning }, financial: { revenue: formData.finansiellt.omsättning, result: formData.finansiellt.resultat }, investmentThesis: thesis }),
        apiPost('/api/generate-team-bios', { team: formData.team, investmentThesis: thesis }),
        apiPost('/api/generate-financial-section', { company, financial: { revenue: formData.finansiellt.omsättning, result: formData.finansiellt.resultat, equity: formData.finansiellt.egetKapital, år: formData.finansiellt.år }, investmentThesis: thesis }),
        apiPost('/api/generate-emission-terms-section', { company, emission: projekt.emissionsvillkor, investmentThesis: thesis }),
        apiPost('/api/generate-use-of-proceeds', { company, användning: formData.användning, emission: projekt.emissionsvillkor, investmentThesis: thesis })
      ]);

      await Promise.all([
        readStream(verksamhetResp, (chunk) => setGeneratedContent(prev => ({ ...prev, verksamhet: prev.verksamhet + chunk }))),
        readStream(marknadResp,    (chunk) => setGeneratedContent(prev => ({ ...prev, marknad: prev.marknad + chunk }))),
        readStream(riskResp,       (chunk) => setGeneratedContent(prev => ({ ...prev, riskfaktorer: prev.riskfaktorer + chunk }))),
        readStream(teamResp,       (chunk) => setGeneratedContent(prev => ({ ...prev, teamBios: prev.teamBios + chunk }))),
        readStream(finansiellResp, (chunk) => setGeneratedContent(prev => ({ ...prev, finansiellInfo: prev.finansiellInfo + chunk }))),
        readStream(villkorResp,    (chunk) => setGeneratedContent(prev => ({ ...prev, emissionsvillkorText: prev.emissionsvillkorText + chunk }))),
        readStream(användningResp, (chunk) => setGeneratedContent(prev => ({ ...prev, användningText: prev.användningText + chunk })))
      ]);

      setGeneratedContent(prev => {
        onUpdateProject(projekt.id, { generatedContent: prev });
        return prev;
      });
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Kunde inte generera innehåll. Kontrollera att servern är igång.');
    }
    setLoading(false);
  };

  const handleGenerateDocx = async () => {
    try {
      const response = await apiPost('/api/generate-docx', {
        company: { name: formData.bolag.namn },
        content: generatedContent,
        emissionsvillkor: projekt.emissionsvillkor
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(formData.bolag.namn || 'Bolag').replace(/\s+/g, '_')}_IM.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Kunde inte generera Word-fil: ' + error.message);
    }
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
        <button className="back-button" onClick={onBack}><ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka</button>
        <h1><FileText size={20} strokeWidth={1.5} /> IM/Prospekt Generator</h1>
      </div>

      {/* Progress bar */}
      <div className="wizard-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(step / 7) * 100}%` }}></div>
        </div>
        <div className="progress-label">{step === 0 ? 'Dokumentkvalificering' : `Steg ${step} av 6`}{qualification ? ` — ${qualification.recommendedType === 'PROSPEKT' ? 'Prospekt' : 'Informationsmemorandum'}` : ''}</div>
      </div>

      {step < 7 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 0 8px' }}>
          <button
            title="OBS: Pitch deck genereras på seed-data om du inte har sparat IM (steg 6)"
            style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: '0.5px solid #e5e7eb', background: '#f9fafb', color: '#9ca3af', cursor: 'pointer' }}
            onClick={() => {
              if (step < 6) {
                if (!window.confirm('Du har inte gått igenom steg 6 ännu — pitch deck kommer genereras på demo-data (GreenTech Nordic). Fortsätt ändå?')) return;
              }
              setStep(7);
            }}
          >
            Testa Pitch Deck direkt (dev) <ChevronRight size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div className="module-content">
        {/* Show emission details at top */}
        <div className="emission-details-banner">
          <h3><CheckCircle2 size={16} strokeWidth={1.5} /> Emissionsvillkor (från projektet)</h3>
          <div className="details-grid">
            <div><strong>Typ:</strong> {projekt.emissionsvillkor.typ}</div>
            <div><strong>Teckningskurs:</strong> {projekt.emissionsvillkor.teckningskurs} SEK</div>
            <div><strong>Antal aktier:</strong> {projekt.emissionsvillkor.antalNyaAktier.toLocaleString('sv-SE')}</div>
            <div><strong>Volym:</strong> {projekt.emissionsvillkor.emissionsvolym.toLocaleString('sv-SE')} SEK</div>
          </div>
        </div>

        {/* Step 0: Qualification */}
        {step === 0 && (
          <div className="wizard-step">
            <h2>Välkommen till IM/Prospekt Generatorn</h2>
            <p>Besvara några frågor så avgör vi vilket dokument som behövs för er kapitalanskaffning.</p>
            <div style={{background:'#fffbeb', border:'1px solid #f6d860', borderRadius:'8px', padding:'10px 14px', marginBottom:'16px', fontSize:'0.85rem', color:'#7c5a00'}}>
              <strong>EU Listing Act (juni 2026):</strong> Prospektgränsen höjs från €2,5M till €12M. Emissioner under €12M riktade till allmänheten kommer inte längre kräva FI-godkänt prospekt.
            </div>

            {!qualification ? (
              <>
                <div className="form-group">
                  <label>Var är bolaget noterat/planerar notering?</label>
                  <select value={qualificationForm.market} onChange={(e) => setQualificationForm({...qualificationForm, market: e.target.value})}>
                    <option value="">-- Välj marknadsplats --</option>
                    <option value="nasdaq_stockholm">Nasdaq Stockholm (reglerad marknad)</option>
                    <option value="first_north">Nasdaq First North</option>
                    <option value="spotlight">Spotlight Stock Market</option>
                    <option value="nordic_sme">Nordic SME</option>
                    <option value="unlisted">Onoterat / Planerar ej notering</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Total kapitalanskaffning (SEK)</label>
                  <input type="number" value={qualificationForm.emissionSizeSEK}
                    onChange={(e) => setQualificationForm({...qualificationForm, emissionSizeSEK: e.target.value})}
                    placeholder="15000000" />
                  <small style={{color: '#718096', display: 'block', marginTop: '4px'}}>Ange totalt belopp ni planerar att anskaffa</small>
                </div>

                <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <input type="checkbox" id="period12m" checked={qualificationForm.period12Months}
                    onChange={(e) => setQualificationForm({...qualificationForm, period12Months: e.target.checked})} />
                  <label htmlFor="period12m" style={{margin: 0}}>Detta är den enda emissionen under en 12-månadersperiod</label>
                </div>
                <small style={{color: '#718096', display: 'block', marginBottom: '16px'}}>Om ni planerar flera emissioner inom 12 månader summeras dessa för prospektskyldighet</small>

                <div className="form-group">
                  <label>Vem riktar sig emissionen till?</label>
                  <select value={qualificationForm.audience} onChange={(e) => setQualificationForm({...qualificationForm, audience: e.target.value})}>
                    <option value="">-- Välj målgrupp --</option>
                    <option value="public">Allmänheten / Befintliga aktieägare (≥150 personer)</option>
                    <option value="qualified">Enbart kvalificerade investerare (&lt;150 st)</option>
                    <option value="syndicate">Avgränsat syndikat (VC/PE/affärsänglar)</option>
                  </select>
                </div>

                <button className="btn-primary" onClick={handleQualification}
                  disabled={!qualificationForm.market || !qualificationForm.emissionSizeSEK || !qualificationForm.audience || loading}>
                  {loading ? 'Analyserar...' : <>Analysera <ChevronRight size={14} strokeWidth={1.5} /></>}
                </button>
              </>
            ) : (
              <>
                <div style={{
                  background: qualification.recommendedType === 'PROSPEKT' ? '#fff5f5' : '#f0fff4',
                  border: `2px solid ${qualification.recommendedType === 'PROSPEKT' ? '#fc8181' : '#48bb78'}`,
                  borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem'
                }}>
                  <h3>{qualification.recommendedType === 'PROSPEKT' ? <><ClipboardList size={16} strokeWidth={1.5} /> Prospekt krävs</> : <><FileText size={16} strokeWidth={1.5} /> Informationsmemorandum rekommenderas</>}</h3>
                  <p>{qualification.reasoning}</p>
                  <p style={{marginTop: '0.5rem', fontSize: '0.9rem', color: '#718096'}}>
                    <strong>Emissionsstorlek:</strong> ~€{(qualification.emissionSizeEUR || 0).toLocaleString('sv-SE')}
                  </p>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem'
                }}>
                  <div style={{background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem'}}>
                    <h4><FileText size={16} strokeWidth={1.5} /> Informationsmemorandum</h4>
                    <ul style={{marginLeft: '1rem', fontSize: '0.9rem', lineHeight: '1.8'}}>
                      <li>✓ Snabbare att producera (3-5 dagar)</li>
                      <li>✓ Lägre kostnad (frivilligt format)</li>
                      <li>✓ Ingen FI-granskning</li>
                      <li>✓ Lämpligt för emissioner &lt;€12M (fr.o.m. juni 2026)</li>
                    </ul>
                  </div>
                  <div style={{background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem'}}>
                    <h4><ClipboardList size={16} strokeWidth={1.5} /> Prospekt</h4>
                    <ul style={{marginLeft: '1rem', fontSize: '0.9rem', lineHeight: '1.8'}}>
                      <li>✓ FI-godkänt (högre trovärdighet)</li>
                      <li>✓ Nödvändigt för allmänna erbjudanden ≥€12M (fr.o.m. juni 2026)</li>
                      <li>⚠ Striktare formatkrav</li>
                      <li>⚠ Längre processtid (4-6 veckor)</li>
                    </ul>
                  </div>
                </div>

                <div style={{display: 'flex', gap: '8px'}}>
                  <button className="btn-primary" onClick={() => setStep(1)}>
                    Fortsätt med {qualification.recommendedType === 'PROSPEKT' ? 'Prospekt' : 'Informationsmemorandum'} <ChevronRight size={14} strokeWidth={1.5} />
                  </button>
                  <button className="btn-secondary" onClick={() => { setQualification(null); }}>
                    <ChevronLeft size={16} strokeWidth={1.5} /> Ändra mina svar
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 1: Bolagsinformation */}
        {step === 1 && (
          <div className="wizard-step">
            <h2>Steg 1: Bolagsinformation</h2>
            <p>Grundläggande information om bolaget</p>

            <button className="btn-secondary" onClick={() => handleResearch('bolagsinfo')} disabled={loadingResearch} style={{marginBottom: '16px'}}>
              {loadingResearch ? 'Söker...' : <><Sparkles size={14} strokeWidth={1.5} /> Fyll i med AI</>}
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
              {loadingResearch ? 'Söker...' : <><Sparkles size={14} strokeWidth={1.5} /> Hämta med AI</>}
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

            <div style={{display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap'}}>
              <button className="btn-secondary" onClick={() => handleResearch('finansiellt')} disabled={loadingResearch}>
                {loadingResearch ? 'Söker...' : <><Sparkles size={14} strokeWidth={1.5} /> Hämta med AI</>}
              </button>
              {projekt?.finansiellData && (
                <button className="btn-primary" onClick={() => {
                  const fd = projekt.finansiellData;
                  const totalOms = Array.isArray(fd.omsättning) ? fd.omsättning.filter(v => v !== null).reduce((a, b) => a + b, 0) : '';
                  const totalRes = Array.isArray(fd.resultat) ? fd.resultat.filter(v => v !== null).reduce((a, b) => a + b, 0) : '';
                  setFormData(prev => ({
                    ...prev,
                    finansiellt: {
                      omsättning: totalOms || prev.finansiellt.omsättning,
                      resultat: totalRes || prev.finansiellt.resultat,
                      egetKapital: fd.egetKapital || prev.finansiellt.egetKapital,
                      år: fd.period ? parseInt(fd.period.match(/\d{4}/)?.[0]) || prev.finansiellt.år : prev.finansiellt.år
                    }
                  }));
                  alert('Data importerad från Kapitalrådgivaren!');
                }}>
                  <Download size={14} strokeWidth={1.5} /> Importera från Kapitalrådgivaren
                </button>
              )}
            </div>
            <div className="info-box" style={{marginBottom: '16px', background: '#fff8e1', borderColor: '#ffe082'}}>
              <p><AlertTriangle size={14} strokeWidth={1.5} /> AI-hämtad finansiell data bör verifieras mot bolagets årsredovisning eller kvartalsrapporter.</p>
              {projekt?.finansiellData && (
                <p style={{marginTop: '8px'}}><Lightbulb size={14} strokeWidth={1.5} /> Du har finansiell data från Kapitalrådgivaren — klicka "Importera" ovan för att använda den.</p>
              )}
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
              {loadingResearch ? 'Söker...' : <><Sparkles size={14} strokeWidth={1.5} /> Hämta med AI</>}
            </button>

            {formData.team.map((member, index) => (
              <div key={index} className="team-member-card">
                <div className="team-member-header">
                  <h4>Person {index + 1}</h4>
                  {formData.team.length > 1 && (
                    <button className="btn-remove" onClick={() => removeTeamMember(index)}>
                      <X size={14} strokeWidth={1.5} /> Ta bort
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
              <Plus size={14} strokeWidth={1.5} /> Lägg till person
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

            {(loading || analyzingCompany) && (
              <div style={{background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#166534', fontSize: '0.9rem'}}>
                <Sparkles size={16} strokeWidth={1.5} style={{flexShrink: 0, animation: 'spin 1.5s linear infinite'}} />
                {analyzingCompany ? 'Analyserar bolaget och bygger investment thesis...' : 'AI genererar alla sektioner parallellt — texten byggs upp nedan...'}
              </div>
            )}

            <div className="preview-section">
              <h3><FileText size={16} strokeWidth={1.5} /> Prospekt/IM innehåll</h3>

              {investmentThesis && (
                <div style={{background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#1e3a5f'}}>
                  <div style={{fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
                    <Lightbulb size={14} strokeWidth={1.5} />
                    Investment Thesis (intern — syns inte i IM)
                  </div>
                  <p style={{margin: '0 0 0.5rem'}}>{investmentThesis.thesis}</p>
                  <div style={{display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '0.5rem'}}>
                    <div><span style={{fontWeight: 500}}>Styrkor: </span>{investmentThesis.strengths?.join(' · ')}</div>
                  </div>
                  <div style={{marginTop: '0.4rem'}}>
                    <span style={{fontWeight: 500}}>Nyckelfrågan: </span>{investmentThesis.keyQuestion}
                  </div>
                </div>
              )}
              
              <div className="preview-card">
                <h4>Verksamhet och Strategi</h4>
                <textarea
                  value={generatedContent.verksamhet}
                  onChange={(e) => setGeneratedContent({...generatedContent, verksamhet: e.target.value})}
                  rows={8}
                  style={{width: '100%', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical', boxSizing: 'border-box'}}
                />
              </div>

              <div className="preview-card">
                <h4>Marknadsöversikt</h4>
                <textarea
                  value={generatedContent.marknad}
                  onChange={(e) => setGeneratedContent({...generatedContent, marknad: e.target.value})}
                  rows={8}
                  style={{width: '100%', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical', boxSizing: 'border-box'}}
                />
              </div>

              <div className="preview-card">
                <h4>Riskfaktorer</h4>
                <textarea
                  value={generatedContent.riskfaktorer}
                  onChange={(e) => setGeneratedContent({...generatedContent, riskfaktorer: e.target.value})}
                  rows={10}
                  style={{width: '100%', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical', boxSizing: 'border-box'}}
                />
              </div>

              <div className="preview-card">
                <h4>Ledning och Styrelse</h4>
                <textarea
                  value={generatedContent.teamBios}
                  onChange={(e) => setGeneratedContent({...generatedContent, teamBios: e.target.value})}
                  rows={8}
                  style={{width: '100%', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical', boxSizing: 'border-box'}}
                />
              </div>

              <div className="preview-card">
                <h4>Finansiell information</h4>
                <textarea
                  value={generatedContent.finansiellInfo}
                  onChange={(e) => setGeneratedContent({...generatedContent, finansiellInfo: e.target.value})}
                  rows={8}
                  style={{width: '100%', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical', boxSizing: 'border-box'}}
                />
              </div>

              <div className="preview-card">
                <h4>Emissionsvillkor</h4>
                <textarea
                  value={generatedContent.emissionsvillkorText}
                  onChange={(e) => setGeneratedContent({...generatedContent, emissionsvillkorText: e.target.value})}
                  rows={8}
                  style={{width: '100%', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical', boxSizing: 'border-box'}}
                />
              </div>

              <div className="preview-card">
                <h4>Användning av emissionslikvid</h4>
                <textarea
                  value={generatedContent.användningText}
                  onChange={(e) => setGeneratedContent({...generatedContent, användningText: e.target.value})}
                  rows={8}
                  style={{width: '100%', fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', resize: 'vertical', boxSizing: 'border-box'}}
                />
              </div>
            </div>

            <div style={{marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
              <button
                className="btn-secondary"
                onClick={async () => {
                  try {
                    await saveImSections();
                    onUpdateProject(projekt.id, { generatedContent });
                    alert('Sparat!');
                  } catch (e) { alert('Kunde inte spara: ' + e.message); }
                }}
                style={{width: '100%'}}
              >
                <Save size={14} strokeWidth={1.5} /> Spara ändringar
              </button>
              <button
                className="btn-secondary"
                onClick={handleGenerateDocx}
                style={{width: '100%'}}
              >
                📝 Exportera som Word (.docx)
              </button>
              <button
                className="btn-primary btn-large"
                onClick={handleGeneratePDF}
                style={{width: '100%'}}
              >
                <FileText size={14} strokeWidth={1.5} /> Generera PDF och gå vidare till Teckning
              </button>
              <button
                className="btn-secondary"
                onClick={async () => {
                  try {
                    await saveImSections();
                  } catch (e) {
                    if (!window.confirm(`Kunde inte spara IM till databasen (${e.message}). Fortsätt ändå med seed-data?`)) return;
                  }
                  setStep(7);
                }}
                style={{width: '100%'}}
              >
                <Sparkles size={14} strokeWidth={1.5} /> Skapa Pitch Deck / Teaser
              </button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="wizard-step">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setStep(6)}><ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka till Prospekt/IM</button>
              <h2 style={{ margin: 0 }}><Sparkles size={16} strokeWidth={1.5} /> Pitch Deck / Teaser</h2>
            </div>
            <PitchDeckEditor
              emissionId={DEMO_EMISSION_ID}
              companyId={DEMO_COMPANY_ID}
            />
          </div>
        )}

        {/* Navigation buttons */}
        {step >= 1 && step < 6 && (
          <div className="wizard-navigation">
            {step > 1 ? (
              <button className="btn-secondary" onClick={() => setStep(step - 1)}>
                <ChevronLeft size={16} strokeWidth={1.5} /> Föregående
              </button>
            ) : (
              <button className="btn-secondary" onClick={() => setStep(0)}>
                <ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka till kvalifikation
              </button>
            )}
            {step < 5 && (
              <button className="btn-primary" onClick={() => setStep(step + 1)}>
                Nästa <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            )}
            {step === 5 && (
              <button
                className="btn-primary"
                onClick={handleGenerateContent}
                disabled={loading}
              >
                {loading ? 'Genererar utkast...' : <><Sparkles size={14} strokeWidth={1.5} /> Generera utkast till Prospekt/IM</>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProspektGenerator;
