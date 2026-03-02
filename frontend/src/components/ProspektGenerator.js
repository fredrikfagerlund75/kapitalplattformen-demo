import React, { useState } from 'react';
import './ProspektGenerator.css';

const API_URL = 'http://localhost:3001';

function ProspektGenerator({ user, project, onBack }) {
  // ═══════════════════════════════════════════════════════════════════════════
  //  STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const [step, setStep] = useState(0);
  const [docType, setDocType] = useState(null);
  const [qualification, setQualification] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Step 0: Qualification
    market: '',
    emissionSizeSEK: '',
    period12Months: true,
    audience: '',
    
    // Step 1: Company Basics
    companyName: project?.name || '',
    orgNr: '',
    industry: '',
    location: '',
    website: '',
    
    // Step 2: Emission Details
    emissionPurpose: '',
    subscriptionPeriod: '',
    
    // Step 3: Business Description
    businessDescription: '',
    products: '',
    businessModel: '',
    strategy: '',
    
    // Step 4: Market Analysis
    marketDescription: '',
    marketSize: '',
    geography: '',
    competitors: '',
    
    // Step 5: Financial Snapshot
    revenue: '',
    result: '',
    equity: '',
    financialYear: new Date().getFullYear() - 1,
    
    // Step 6: Team
    team: [
      { name: '', role: '', background: '' }
    ]
  });
  
  const [generatedContent, setGeneratedContent] = useState({
    executiveSummary: '',
    businessSection: '',
    marketSection: '',
    offeringTerms: '',
    riskFactors: '',
    teamBios: ''
  });

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // ═══════════════════════════════════════════════════════════════════════════
  //  COMPANY LOOKUP
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleCompanyLookup = async () => {
    if (!formData.orgNr || formData.orgNr.length < 10) {
      setLookupError('Ange ett giltigt organisationsnummer (t.ex. 556123-4567)');
      return;
    }
    
    setLookupLoading(true);
    setLookupError('');
    
    try {
      const response = await fetch(`${API_URL}/api/lookup-company`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgNr: formData.orgNr })
      });
      
      const result = await response.json();
      
      if (result.found && result.company) {
        setFormData(prev => ({
          ...prev,
          companyName: result.company.name || prev.companyName,
          orgNr: result.company.orgNr || prev.orgNr,
          industry: result.company.industry || prev.industry,
          location: result.company.location || prev.location,
          website: result.company.website || prev.website
        }));
        setLookupError('');
      } else {
        setLookupError(result.error || 'Inget bolag hittades');
      }
    } catch (error) {
      console.error('Lookup error:', error);
      setLookupError('Kunde inte hämta bolagsuppgifter. Försök igen.');
    } finally {
      setLookupLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  //  STEP 0: DOCUMENT TYPE QUALIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleQualification = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/qualify-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market: formData.market,
          emissionSizeSEK: parseInt(formData.emissionSizeSEK),
          period12Months: formData.period12Months,
          audience: formData.audience
        })
      });
      
      const result = await response.json();
      setQualification(result);
      setDocType(result.recommendedType);
      setLoading(false);
    } catch (error) {
      console.error('Qualification error:', error);
      setLoading(false);
      alert('Ett fel uppstod vid kvalificeringen. Vänligen försök igen.');
    }
  };
  
  const renderQualificationStep = () => (
    <div className="pg-step-container">
      <h2>Välkommen till Prospekt/IM Generator</h2>
      <p className="pg-step-intro">Besvara några frågor så hjälper vi dig att avgöra vilket dokument du behöver för din kapitalanskaffning.</p>
      
      <div className="pg-form-group">
        <label>Var är bolaget noterat/planerar notering?</label>
        <select 
          value={formData.market} 
          onChange={(e) => setFormData({...formData, market: e.target.value})}
          required
        >
          <option value="">-- Välj marknadsplats --</option>
          <option value="nasdaq_stockholm">Nasdaq Stockholm (reglerad marknad)</option>
          <option value="first_north">Nasdaq First North</option>
          <option value="spotlight">Spotlight Stock Market</option>
          <option value="nordic_sme">Nordic SME</option>
          <option value="unlisted">Onoterat / Planerar ej notering</option>
        </select>
      </div>
      
      <div className="pg-form-group">
        <label>Total kapitalanskaffning (SEK)</label>
        <input 
          type="number" 
          value={formData.emissionSizeSEK}
          onChange={(e) => setFormData({...formData, emissionSizeSEK: e.target.value})}
          placeholder="15000000"
          required
        />
        <small>Ange totalt belopp ni planerar att anskaffa</small>
      </div>
      
      <div className="pg-form-group pg-checkbox-group">
        <label>
          <input 
            type="checkbox"
            checked={formData.period12Months}
            onChange={(e) => setFormData({...formData, period12Months: e.target.checked})}
          />
          Detta är den enda emissionen under en 12-månadersperiod
        </label>
        <small>Om ni planerar flera emissioner inom 12 månader summeras dessa för prospektskyldighet</small>
      </div>
      
      <div className="pg-form-group">
        <label>Vem riktar sig emissionen till?</label>
        <select 
          value={formData.audience} 
          onChange={(e) => setFormData({...formData, audience: e.target.value})}
          required
        >
          <option value="">-- Välj målgrupp --</option>
          <option value="public">Allmänheten / Befintliga aktieägare (≥150 personer)</option>
          <option value="qualified">Enbart kvalificerade investerare (&lt;150 st)</option>
          <option value="syndicate">Avgränsat syndikat (VC/PE/affärsänglar)</option>
        </select>
      </div>
      
      <button 
        className="btn-primary"
        onClick={handleQualification}
        disabled={!formData.market || !formData.emissionSizeSEK || !formData.audience || loading}
      >
        {loading ? 'Analyserar...' : 'Fortsätt'}
      </button>
    </div>
  );
  
  const renderQualificationResult = () => (
    <div className="pg-qualification-result">
      <h2>Rekommendation</h2>
      <div className={`pg-recommendation-card ${docType === 'PROSPEKT' ? 'prospekt' : 'im'}`}>
        <h3>{docType === 'PROSPEKT' ? '📋 Prospekt krävs' : '📄 Informationsmemorandum rekommenderas'}</h3>
        <p>{qualification.reasoning}</p>
        
        <div className="pg-emission-summary">
          <strong>Emissionsstorlek:</strong> ~€{qualification.emissionSizeEUR.toLocaleString('sv-SE')}
        </div>
      </div>
      
      <div className="pg-document-comparison">
        <h4>Vad är skillnaden?</h4>
        <div className="pg-comparison-grid">
          <div className="pg-comparison-col">
            <h5>📄 Informationsmemorandum</h5>
            <ul>
              <li>✓ Snabbare att producera (3-5 dagar)</li>
              <li>✓ Lägre kostnad (frivilligt format)</li>
              <li>✓ Ingen FI-granskning</li>
              <li>✓ Lämpligt för riktade emissioner &lt;€8M</li>
            </ul>
          </div>
          <div className="pg-comparison-col">
            <h5>📋 Prospekt</h5>
            <ul>
              <li>✓ FI-godkänt (högre trovärdighet)</li>
              <li>✓ Nödvändigt för allmänna erbjudanden ≥€8M</li>
              <li>⚠ Striktare formatkrav</li>
              <li>⚠ Längre processtid (4-6 veckor)</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="pg-action-buttons">
        {docType === 'IM' && (
          <button className="btn-primary" onClick={() => setStep(1)}>
            Fortsätt med Informationsmemorandum
          </button>
        )}
        {docType === 'PROSPEKT' && (
          <div className="pg-prospekt-notice">
            <p><strong>OBS:</strong> Prospektflödet är inte fullt utvecklat i denna demo.</p>
            <button className="btn-secondary" onClick={() => { setDocType('IM'); }}>
              Skapa IM istället (demo)
            </button>
          </div>
        )}
        {docType === 'IM' && (
          <button className="btn-secondary" onClick={() => { setDocType('PROSPEKT'); }}>
            Jag vill ändå göra ett prospekt
          </button>
        )}
      </div>
      
      <button className="pg-btn-link" onClick={() => { setStep(0); setQualification(null); setDocType(null); }}>
        ← Ändra mina svar
      </button>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  STEP 1: COMPANY BASICS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const renderStep1 = () => (
    <div className="pg-step-container">
      <div className="pg-progress-bar">
        <div className="pg-progress-fill" style={{width: '14%'}}></div>
      </div>
      <h2>Steg 1 av 7: Företagsinformation</h2>
      
      <div className="pg-lookup-section">
        <div className="pg-form-group">
          <label>Organisationsnummer</label>
          <div className="pg-input-with-button">
            <input 
              type="text"
              value={formData.orgNr}
              onChange={(e) => {
                setFormData({...formData, orgNr: e.target.value});
                setLookupError('');
              }}
              placeholder="556123-4567"
            />
            <button 
              className="pg-btn-lookup"
              onClick={handleCompanyLookup}
              disabled={lookupLoading || !formData.orgNr}
            >
              {lookupLoading ? '⏳ Söker...' : '🔍 Hämta uppgifter'}
            </button>
          </div>
          {lookupError && <span className="pg-error-text">{lookupError}</span>}
          <span className="pg-help-text">Ange organisationsnummer för att automatiskt hämta bolagsuppgifter från Bolagsverket</span>
        </div>
      </div>
      
      <div className="pg-form-group">
        <label>Företagsnamn *</label>
        <input 
          type="text"
          value={formData.companyName}
          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
          placeholder="Innovativ Tech AB"
          required
        />
      </div>
      
      <div className="pg-form-group">
        <label>Bransch *</label>
        <input 
          type="text"
          value={formData.industry}
          onChange={(e) => setFormData({...formData, industry: e.target.value})}
          placeholder="Teknologi / SaaS / Medicinteknik / etc."
          required
        />
      </div>
      
      <div className="pg-form-group">
        <label>Säte</label>
        <input 
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({...formData, location: e.target.value})}
          placeholder="Stockholm, Sverige"
        />
      </div>
      
      <div className="pg-form-group">
        <label>Webbplats</label>
        <input 
          type="url"
          value={formData.website}
          onChange={(e) => setFormData({...formData, website: e.target.value})}
          placeholder="https://www.exempel.se"
        />
      </div>
      
      <div className="pg-button-group">
        <button className="btn-secondary" onClick={() => setStep(0)}>← Tillbaka</button>
        <button 
          className="btn-primary" 
          onClick={() => setStep(2)}
          disabled={!formData.companyName || !formData.industry}
        >
          Nästa →
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  STEP 2: EMISSION DETAILS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const renderStep2 = () => (
    <div className="pg-step-container">
      <div className="pg-progress-bar">
        <div className="pg-progress-fill" style={{width: '28%'}}></div>
      </div>
      <h2>Steg 2 av 7: Emissionsdetaljer</h2>
      
      <div className="pg-info-card">
        <strong>Emissionsstorlek:</strong> {parseInt(formData.emissionSizeSEK).toLocaleString('sv-SE')} SEK
      </div>
      
      <div className="pg-form-group">
        <label>Användning av kapitalet *</label>
        <textarea 
          value={formData.emissionPurpose}
          onChange={(e) => setFormData({...formData, emissionPurpose: e.target.value})}
          placeholder="Beskriv kortfattat hur ni planerar att använda det anskaffade kapitalet. Exempel: Produktutveckling, marknadsföring, internationell expansion, rörelsekapital."
          rows="4"
          required
        />
      </div>
      
      <div className="pg-form-group">
        <label>Planerad teckningsperiod</label>
        <input 
          type="text"
          value={formData.subscriptionPeriod}
          onChange={(e) => setFormData({...formData, subscriptionPeriod: e.target.value})}
          placeholder="2026-03-15 till 2026-03-29"
        />
        <small>Ange ungefärligt datumintervall om det är bestämt</small>
      </div>
      
      <div className="pg-button-group">
        <button className="btn-secondary" onClick={() => setStep(1)}>← Tillbaka</button>
        <button 
          className="btn-primary" 
          onClick={() => setStep(3)}
          disabled={!formData.emissionPurpose}
        >
          Nästa →
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  STEP 3: BUSINESS DESCRIPTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  const renderStep3 = () => (
    <div className="pg-step-container">
      <div className="pg-progress-bar">
        <div className="pg-progress-fill" style={{width: '42%'}}></div>
      </div>
      <h2>Steg 3 av 7: Verksamhetsbeskrivning</h2>
      <p className="pg-step-intro">Denna information används för att generera sektionerna "Verksamhet och Strategi" samt "Executive Summary".</p>
      
      <div className="pg-form-group">
        <label>Vad gör företaget? *</label>
        <textarea 
          value={formData.businessDescription}
          onChange={(e) => setFormData({...formData, businessDescription: e.target.value})}
          placeholder="Beskriv er kärnverksamhet: Vad erbjuder ni? Vilket problem löser ni? För vilka kunder?"
          rows="5"
          required
        />
      </div>
      
      <div className="pg-form-group">
        <label>Produkter / Tjänster</label>
        <textarea 
          value={formData.products}
          onChange={(e) => setFormData({...formData, products: e.target.value})}
          placeholder="Beskriv era huvudsakliga produkter eller tjänster. Vad är unikt med er lösning?"
          rows="4"
        />
      </div>
      
      <div className="pg-form-group">
        <label>Affärsmodell</label>
        <textarea 
          value={formData.businessModel}
          onChange={(e) => setFormData({...formData, businessModel: e.target.value})}
          placeholder="Hur tjänar ni pengar? (t.ex. SaaS-prenumeration, transaktion, licensiering, produktförsäljning)"
          rows="3"
        />
      </div>
      
      <div className="pg-form-group">
        <label>Strategi och vision</label>
        <textarea 
          value={formData.strategy}
          onChange={(e) => setFormData({...formData, strategy: e.target.value})}
          placeholder="Beskriv er strategi för de kommande 2-3 åren. Vad är era viktigaste mål?"
          rows="4"
        />
      </div>
      
      <div className="pg-button-group">
        <button className="btn-secondary" onClick={() => setStep(2)}>← Tillbaka</button>
        <button 
          className="btn-primary" 
          onClick={() => setStep(4)}
          disabled={!formData.businessDescription}
        >
          Nästa →
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  STEP 4: MARKET ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const renderStep4 = () => (
    <div className="pg-step-container">
      <div className="pg-progress-bar">
        <div className="pg-progress-fill" style={{width: '56%'}}></div>
      </div>
      <h2>Steg 4 av 7: Marknadsanalys</h2>
      <p className="pg-step-intro">Information om er marknad och konkurrenssituation.</p>
      
      <div className="pg-form-group">
        <label>Marknadsbeskrivning *</label>
        <textarea 
          value={formData.marketDescription}
          onChange={(e) => setFormData({...formData, marketDescription: e.target.value})}
          placeholder="Beskriv den marknad ni verkar på. Vilka är de viktigaste drivkrafterna? Vilka trender ser ni?"
          rows="5"
          required
        />
      </div>
      
      <div className="pg-form-group">
        <label>Marknadsstorlek (TAM/SAM)</label>
        <input 
          type="text"
          value={formData.marketSize}
          onChange={(e) => setFormData({...formData, marketSize: e.target.value})}
          placeholder="Exempel: Global marknad 50 Mdr USD, Nordisk marknad 2 Mdr SEK"
        />
        <small>Ange uppskattad marknadsstorlek om ni har data</small>
      </div>
      
      <div className="pg-form-group">
        <label>Geografiska marknader</label>
        <input 
          type="text"
          value={formData.geography}
          onChange={(e) => setFormData({...formData, geography: e.target.value})}
          placeholder="Norden, Europa, Nordamerika..."
        />
      </div>
      
      <div className="pg-form-group">
        <label>Huvudkonkurrenter</label>
        <textarea 
          value={formData.competitors}
          onChange={(e) => setFormData({...formData, competitors: e.target.value})}
          placeholder="Lista era viktigaste konkurrenter och beskriv kortfattat er konkurrensfördel."
          rows="4"
        />
      </div>
      
      <div className="pg-button-group">
        <button className="btn-secondary" onClick={() => setStep(3)}>← Tillbaka</button>
        <button 
          className="btn-primary" 
          onClick={() => setStep(5)}
          disabled={!formData.marketDescription}
        >
          Nästa →
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  STEP 5: FINANCIAL SNAPSHOT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const renderStep5 = () => (
    <div className="pg-step-container">
      <div className="pg-progress-bar">
        <div className="pg-progress-fill" style={{width: '70%'}}></div>
      </div>
      <h2>Steg 5 av 7: Finansiell översikt</h2>
      <p className="pg-step-intro">Ange nyckeltal från senaste räkenskapsåret. Detta kommer att visas i dokumentet tillsammans med en hänvisning till fullständig årsredovisning.</p>
      
      <div className="pg-form-group">
        <label>Räkenskapsår</label>
        <input 
          type="number"
          value={formData.financialYear}
          onChange={(e) => setFormData({...formData, financialYear: parseInt(e.target.value)})}
          min="2020"
          max={new Date().getFullYear()}
        />
      </div>
      
      <div className="pg-form-group">
        <label>Omsättning (TSEK)</label>
        <input 
          type="number"
          value={formData.revenue}
          onChange={(e) => setFormData({...formData, revenue: e.target.value})}
          placeholder="15000"
        />
      </div>
      
      <div className="pg-form-group">
        <label>Resultat (TSEK)</label>
        <input 
          type="number"
          value={formData.result}
          onChange={(e) => setFormData({...formData, result: e.target.value})}
          placeholder="-3500"
        />
        <small>Ange negativt värde om förlust</small>
      </div>
      
      <div className="pg-form-group">
        <label>Eget kapital (TSEK)</label>
        <input 
          type="number"
          value={formData.equity}
          onChange={(e) => setFormData({...formData, equity: e.target.value})}
          placeholder="25000"
        />
      </div>
      
      <div className="pg-info-card">
        <strong>OBS:</strong> För ett fullständigt informationsmemorandum bör fullständiga finansiella rapporter (årsredovisning och eventuell delårsrapport) bifogas som bilaga.
      </div>
      
      <div className="pg-button-group">
        <button className="btn-secondary" onClick={() => setStep(4)}>← Tillbaka</button>
        <button 
          className="btn-primary" 
          onClick={() => setStep(6)}
        >
          Nästa →
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  STEP 6: TEAM
  // ═══════════════════════════════════════════════════════════════════════════
  
  const addTeamMember = () => {
    setFormData({
      ...formData,
      team: [...formData.team, { name: '', role: '', background: '' }]
    });
  };
  
  const updateTeamMember = (index, field, value) => {
    const newTeam = [...formData.team];
    newTeam[index][field] = value;
    setFormData({...formData, team: newTeam});
  };
  
  const removeTeamMember = (index) => {
    const newTeam = formData.team.filter((_, i) => i !== index);
    setFormData({...formData, team: newTeam});
  };
  
  const renderStep6 = () => (
    <div className="pg-step-container">
      <div className="pg-progress-bar">
        <div className="pg-progress-fill" style={{width: '84%'}}></div>
      </div>
      <h2>Steg 6 av 7: Ledning och styrelse</h2>
      <p className="pg-step-intro">Lägg till nyckelpersoner i ledningen och styrelsen. AI kommer att generera professionella biografier baserat på er input.</p>
      
      {formData.team.map((person, index) => (
        <div key={index} className="pg-team-member-card">
          <div className="pg-team-member-header">
            <h4>Person {index + 1}</h4>
            {formData.team.length > 1 && (
              <button className="pg-btn-remove" onClick={() => removeTeamMember(index)}>Ta bort</button>
            )}
          </div>
          
          <div className="pg-form-group">
            <label>Namn *</label>
            <input 
              type="text"
              value={person.name}
              onChange={(e) => updateTeamMember(index, 'name', e.target.value)}
              placeholder="Anna Andersson"
              required
            />
          </div>
          
          <div className="pg-form-group">
            <label>Roll *</label>
            <input 
              type="text"
              value={person.role}
              onChange={(e) => updateTeamMember(index, 'role', e.target.value)}
              placeholder="VD / Styrelseordförande / CFO / etc."
              required
            />
          </div>
          
          <div className="pg-form-group">
            <label>Bakgrund och erfarenhet</label>
            <textarea 
              value={person.background}
              onChange={(e) => updateTeamMember(index, 'background', e.target.value)}
              placeholder="Beskriv relevant erfarenhet, tidigare befattningar, utbildning..."
              rows="3"
            />
          </div>
        </div>
      ))}
      
      <button className="btn-secondary" onClick={addTeamMember}>+ Lägg till person</button>
      
      <div className="pg-button-group" style={{marginTop: '2rem'}}>
        <button className="btn-secondary" onClick={() => setStep(5)}>← Tillbaka</button>
        <button 
          className="btn-primary" 
          onClick={() => setStep(7)}
          disabled={!formData.team.every(p => p.name && p.role)}
        >
          Nästa →
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  STEP 7: REVIEW AND GENERATE
  // ═══════════════════════════════════════════════════════════════════════════
  
  const generateAllContent = async () => {
    setLoading(true);
    
    try {
      const summaryRes = await fetch(`${API_URL}/api/generate-executive-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: { name: formData.companyName, industry: formData.industry },
          business: { description: formData.businessDescription },
          market: { description: formData.marketDescription },
          emission: { sizeSEK: parseInt(formData.emissionSizeSEK), purpose: formData.emissionPurpose }
        })
      });
      const summaryData = await summaryRes.json();
      
      const businessRes = await fetch(`${API_URL}/api/generate-business-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: { name: formData.companyName, industry: formData.industry },
          business: {
            description: formData.businessDescription,
            products: formData.products,
            businessModel: formData.businessModel,
            strategy: formData.strategy
          }
        })
      });
      const businessData = await businessRes.json();
      
      const marketRes = await fetch(`${API_URL}/api/generate-market-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: { industry: formData.industry },
          market: {
            description: formData.marketDescription,
            size: formData.marketSize,
            geography: formData.geography,
            competitors: formData.competitors
          }
        })
      });
      const marketData = await marketRes.json();
      
      const riskRes = await fetch(`${API_URL}/api/generate-risk-factors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: { name: formData.companyName, industry: formData.industry, market: formData.market },
          business: { description: formData.businessDescription },
          financial: { revenue: formData.revenue, result: formData.result }
        })
      });
      const riskData = await riskRes.json();
      
      const offeringRes = await fetch(`${API_URL}/api/generate-offering-terms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: { name: formData.companyName, orgNr: formData.orgNr },
          emission: {
            sizeSEK: parseInt(formData.emissionSizeSEK),
            purpose: formData.emissionPurpose,
            subscriptionPeriod: formData.subscriptionPeriod,
            audience: formData.audience
          }
        })
      });
      const offeringData = await offeringRes.json();
      
      const teamRes = await fetch(`${API_URL}/api/generate-team-bios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: formData.team })
      });
      const teamData = await teamRes.json();
      
      const newContent = {
        executiveSummary: summaryData.summary,
        businessSection: businessData.business,
        marketSection: marketData.market,
        offeringTerms: offeringData.offeringTerms,
        riskFactors: riskData.risks,
        teamBios: teamData.bios
      };
      setGeneratedContent(newContent);
      
      // Persist IM data to localStorage so MarketingModule can use it
      try {
        localStorage.setItem('kapital_im_data', JSON.stringify({
          formData,
          generatedContent: newContent,
          savedAt: new Date().toISOString()
        }));
      } catch (e) {
        console.warn('Could not save IM data to localStorage', e);
      }
      
      setLoading(false);
      setStep(8);
      
    } catch (error) {
      console.error('Generation error:', error);
      setLoading(false);
      alert('Ett fel uppstod vid genereringen. Vänligen försök igen.');
    }
  };
  
  const renderStep7 = () => (
    <div className="pg-step-container">
      <div className="pg-progress-bar">
        <div className="pg-progress-fill" style={{width: '100%'}}></div>
      </div>
      <h2>Steg 7 av 7: Granska och generera</h2>
      <p className="pg-step-intro">Kontrollera att all information är korrekt innan vi genererar ditt informationsmemorandum.</p>
      
      <div className="pg-review-section">
        <h3>Företagsinformation</h3>
        <div className="pg-review-item"><strong>Företag:</strong> {formData.companyName}</div>
        <div className="pg-review-item"><strong>Bransch:</strong> {formData.industry}</div>
        <div className="pg-review-item"><strong>Säte:</strong> {formData.location || 'Ej angivet'}</div>
      </div>
      
      <div className="pg-review-section">
        <h3>Emission</h3>
        <div className="pg-review-item"><strong>Belopp:</strong> {parseInt(formData.emissionSizeSEK).toLocaleString('sv-SE')} SEK</div>
        <div className="pg-review-item"><strong>Användning:</strong> {formData.emissionPurpose}</div>
      </div>
      
      <div className="pg-review-section">
        <h3>Team</h3>
        {formData.team.map((person, i) => (
          <div key={i} className="pg-review-item">
            <strong>{person.name}</strong> - {person.role}
          </div>
        ))}
      </div>
      
      <div className="pg-info-card">
        <strong>Nästa steg:</strong> När du klickar på "Generera dokument" kommer AI att skapa alla sektioner i ditt informationsmemorandum. Detta tar vanligtvis 30-60 sekunder.
      </div>
      
      <div className="pg-button-group">
        <button className="btn-secondary" onClick={() => setStep(6)}>← Tillbaka</button>
        <button 
          className="btn-primary pg-btn-large" 
          onClick={generateAllContent}
          disabled={loading}
        >
          {loading ? 'Genererar dokument...' : '🚀 Generera informationsmemorandum'}
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  STEP 8: PREVIEW AND DOWNLOAD
  // ═══════════════════════════════════════════════════════════════════════════
  
  const downloadPDF = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: {
            name: formData.companyName,
            orgNr: formData.orgNr,
            industry: formData.industry,
            location: formData.location,
            market: formData.market
          },
          emission: {
            sizeSEK: parseInt(formData.emissionSizeSEK),
            purpose: formData.emissionPurpose,
            subscriptionPeriod: formData.subscriptionPeriod,
            audience: formData.audience
          },
          financial: {
            revenue: formData.revenue,
            result: formData.result,
            equity: formData.equity,
            year: formData.financialYear
          },
          generated: generatedContent
        })
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formData.companyName.replace(/\s+/g, '_')}_IM.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      setLoading(false);
    } catch (error) {
      console.error('PDF generation error:', error);
      setLoading(false);
      alert('Ett fel uppstod vid PDF-genereringen.');
    }
  };
  
  const renderStep8 = () => (
    <div className="pg-step-container pg-preview-step">
      <h2>✅ Ditt informationsmemorandum är klart!</h2>
      <p className="pg-step-intro">Granska innehållet nedan. Du kan ladda ner dokumentet som PDF när du är nöjd.</p>
      
      <div className="pg-preview-section">
        <h3>Executive Summary</h3>
        <div className="pg-preview-content">{generatedContent.executiveSummary}</div>
      </div>
      
      <div className="pg-preview-section">
        <h3>Verksamhet och Strategi</h3>
        <div className="pg-preview-content">{generatedContent.businessSection}</div>
      </div>
      
      <div className="pg-preview-section">
        <h3>Marknadsöversikt</h3>
        <div className="pg-preview-content">{generatedContent.marketSection}</div>
      </div>
      
      <div className="pg-preview-section">
        <h3>Villkor för teckningserbjudandet</h3>
        <div className="pg-preview-content">{generatedContent.offeringTerms}</div>
      </div>
      
      <div className="pg-preview-section">
        <h3>Riskfaktorer</h3>
        <div className="pg-preview-content">{generatedContent.riskFactors}</div>
      </div>
      
      <div className="pg-preview-section">
        <h3>Ledning och Styrelse</h3>
        <div className="pg-preview-content">{generatedContent.teamBios}</div>
      </div>
      
      <div className="pg-action-buttons">
        <button 
          className="btn-primary pg-btn-large" 
          onClick={downloadPDF}
          disabled={loading}
        >
          {loading ? 'Genererar PDF...' : '📥 Ladda ner PDF'}
        </button>
        <button className="btn-secondary" onClick={() => setStep(7)}>← Redigera information</button>
      </div>
      
      <div className="pg-info-card" style={{marginTop: '2rem'}}>
        <strong>Nästa steg:</strong>
        <ul style={{marginTop: '0.5rem', paddingLeft: '1.5rem'}}>
          <li>Granska dokumentet noggrant</li>
          <li>Bifoga fullständiga finansiella rapporter (årsredovisning, delårsrapport)</li>
          <li>Låt juridisk rådgivare granska innehållet</li>
          <li>Distribuera till potentiella investerare</li>
        </ul>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  
  return (
    <div className="module-container">
      <div className="module-header">
        <button className="back-button" onClick={onBack}>← Tillbaka</button>
        <h1>📄 Prospekt/IM Generator</h1>
      </div>

      <div className="pg-wizard-content">
        {step === 0 && !qualification && renderQualificationStep()}
        {step === 0 && qualification && renderQualificationResult()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderStep6()}
        {step === 7 && renderStep7()}
        {step === 8 && renderStep8()}
      </div>
    </div>
  );
}

export default ProspektGenerator;
