import React, { useState, useEffect, useRef } from 'react';
import './MarketingModule.css';

const API_URL = 'http://localhost:3001';

// Demo fallback data when no IM has been generated yet
const DEMO_EMISSION_DATA = {
  formData: {
    companyName: 'TechVenture Nordic AB',
    orgNr: '559123-4567',
    industry: 'Fintech / SaaS',
    location: 'Stockholm',
    website: 'https://techventure.se',
    emissionSizeSEK: '15000000',
    emissionPurpose: 'TechVenture Nordic AB genomför en företrädesemission om 15 MSEK i syfte att accelerera kommersialiseringen av bolagets AI-drivna betalningsplattform. Kapitalet kommer primärt att användas för:\n\n• Produktutveckling och teknik (40%) – Vidareutveckling av AI-modeller för bedrägeridetektering och automatiserad KYC\n• Marknadsexpansion (35%) – Lansering på den nordiska marknaden med fokus på Norge och Finland\n• Rörelsekapital (25%) – Stärka kassaflödet under tillväxtfasen',
    subscriptionPeriod: '15 april – 30 april 2026',
    market: 'first_north',
    audience: 'public',
    revenue: '8 200 000',
    result: '-1 400 000',
    equity: '12 300 000',
    team: [
      { name: 'Anna Lindqvist', role: 'VD / CEO', background: 'Tidigare VP Product på Klarna, 12 års erfarenhet inom fintech och digital betalning.' },
      { name: 'Erik Johansson', role: 'Styrelseordförande', background: 'Grundare av Nordic Capital Partners. Lång erfarenhet av tillväxtbolag inom tech-sektorn.' },
      { name: 'Maria Svensson', role: 'CFO', background: 'Ekonomichef med bakgrund från EY och SEB. Specialiserad på tillväxtfinansiering.' }
    ]
  },
  generatedContent: {
    executiveSummary: 'TechVenture Nordic AB är ett snabbväxande fintechbolag som utvecklar en AI-driven betalningsplattform för e-handelsföretag. Bolaget har sedan lanseringen 2023 tecknat avtal med över 120 handlare och processar transaktioner om cirka 450 MSEK årligen.\n\nMed en patenterad AI-modell för bedrägeridetektering minskar TechVenture sina kunders svinn med i genomsnitt 67%, samtidigt som konverteringsgraden vid checkout ökar med 12%. Bolagets intäktsmodell baseras på transaktionsavgifter om 0,8-1,2% per genomförd betalning.\n\nFöreträdesemissionen om 15 MSEK genomförs för att finansiera expansion till den bredare nordiska marknaden samt vidareutveckling av bolagets AI-kapacitet.',
    businessSection: 'TechVenture Nordic utvecklar och tillhandahåller en SaaS-baserad betalningsplattform med inbyggd AI-driven bedrägeridetektering. Plattformen integreras via API med e-handlares checkout-flöden och erbjuder:\n\n• Realtidsanalys av transaktioner med maskininlärning\n• Automatiserad KYC/AML-kontroll\n• Dynamisk riskbedömning per transaktion\n• Dashboard för handlare med insikter och analytics\n\nBolaget grundades 2022 av Anna Lindqvist och har idag 18 anställda fördelade på kontor i Stockholm och Göteborg.',
    marketSection: 'Den nordiska e-handelsmarknaden omsätter cirka 320 miljarder SEK och förväntas växa med 8-10% årligen. Fraud management-segmentet, där TechVenture primärt verkar, värderas till cirka 4,2 miljarder SEK i Norden.\n\nKonkurrenter inkluderar internationella aktörer som Stripe Radar och Adyen, men TechVenture differentierar sig genom:\n\n• Lokal anpassning för nordiska betalmönster\n• Lägre latens genom regionala AI-modeller\n• Starkare integration med nordiska banksystem (BankID, Swish)',
    offeringTerms: 'Emissionstyp: Företrädesemission\nEmissionsbelopp: 15 000 000 SEK\nTeckningskurs: 10,00 SEK per aktie\nAntal nya aktier: 1 500 000\nPre-money-värdering: 75 MSEK\nTeckningsperiod: 15 april – 30 april 2026\nTeckningsrätt: Befintliga aktieägare har företrädesrätt. Varje (5) befintliga aktier berättigar till teckning av (1) ny aktie.\nLägsta teckningspost: 500 aktier (5 000 SEK)\nBeräknad likviddag: 15 maj 2026',
    riskFactors: 'Investeringar i TechVenture Nordic AB är förenade med risk. Nedan sammanfattas de väsentligaste riskfaktorerna:\n\n• Marknadsrisk – E-handelsmarknaden är konkurrensutsatt och snabbrörlig. Teknologiskiften kan påverka bolagets konkurrensposition.\n• Intäktsrisk – Bolaget befinner sig i en tillväxtfas och har ännu inte uppnått lönsamhet. Det finns risk att tillräckliga intäkter ej uppnås enligt plan.\n• Regulatorisk risk – Betaltjänster är föremål för omfattande reglering (PSD2, GDPR). Förändrad lagstiftning kan medföra ökade kostnader.\n• Teknisk risk – AI-modeller kräver kontinuerlig träning och validering. Felaktiga modeller kan leda till ökad fraud-exposure.\n• Finansieringsrisk – Ytterligare kapitalbehov kan uppstå om tillväxten överstiger prognos.',
    teamBios: ''
  }
};

function MarketingModule({ user, project, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [landingPageHtml, setLandingPageHtml] = useState('');
  const blobUrlRef = useRef(null);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);
  
  // Marketing campaign state
  const [campaign, setCampaign] = useState({
    landingPage: {
      generated: false,
      url: '',
      seoScore: 0
    },
    emailCampaign: {
      status: 'not-started',
      emails: ['pre-launch', 'opening', 'last-call'],
      sent: 0,
      opens: 0,
      clicks: 0
    },
    googleAds: {
      status: 'not-started',
      budget: 25000,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      cpl: 0
    }
  });

  // Load IM data from localStorage or use demo fallback
  const getEmissionData = () => {
    try {
      const saved = localStorage.getItem('kapital_im_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData && parsed.generatedContent) return parsed;
      }
    } catch (e) {
      console.warn('Could not load IM data from localStorage', e);
    }
    return DEMO_EMISSION_DATA;
  };

  // Generate landing page
  const generateLandingPage = async () => {
    setLoading(true);
    try {
      const imData = getEmissionData();
      const fd = imData.formData;
      const gc = imData.generatedContent;

      const response = await fetch(`${API_URL}/api/marketing/generate-landing-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: fd.companyName || user.company,
          orgNr: fd.orgNr || '',
          location: fd.location || '',
          industry: fd.industry || '',
          website: fd.website || '',
          emissionType: fd.market === 'unlisted' ? 'Riktad emission' : 'Företrädesemission',
          emissionSize: fd.emissionSizeSEK ? `${parseInt(fd.emissionSizeSEK).toLocaleString('sv-SE')} SEK` : '15 000 000 SEK',
          subscriptionPeriod: fd.subscriptionPeriod || '',
          emissionPurpose: fd.emissionPurpose || '',
          executiveSummary: gc.executiveSummary || '',
          businessSection: gc.businessSection || '',
          marketSection: gc.marketSection || '',
          offeringTerms: gc.offeringTerms || '',
          riskFactors: gc.riskFactors || '',
          team: fd.team || [],
          revenue: fd.revenue || '',
          result: fd.result || '',
          equity: fd.equity || ''
        })
      });
      
      const data = await response.json();
      
      // Create blob URL for iframe preview
      if (data.landingPageHtml) {
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const blob = new Blob([data.landingPageHtml], { type: 'text/html' });
        blobUrlRef.current = URL.createObjectURL(blob);
        setLandingPageHtml(data.landingPageHtml);
      }

      setCampaign({
        ...campaign,
        landingPage: {
          generated: true,
          url: data.url,
          seoScore: data.seoScore
        }
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Landing page generation error:', error);
      // Demo fallback
      setCampaign({
        ...campaign,
        landingPage: {
          generated: true,
          url: `https://kapital.demo/${user.company.toLowerCase().replace(/\s+/g, '-')}-emission`,
          seoScore: 87
        }
      });
      setLoading(false);
    }
  };

  // Setup email campaign
  const setupEmailCampaign = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/marketing/setup-email-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project?.id || 1,
          companyName: user.company
        })
      });
      
      await response.json();
      
      setCampaign({
        ...campaign,
        emailCampaign: {
          ...campaign.emailCampaign,
          status: 'scheduled'
        }
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Email campaign setup error:', error);
      // Demo fallback
      setCampaign({
        ...campaign,
        emailCampaign: {
          ...campaign.emailCampaign,
          status: 'scheduled'
        }
      });
      setLoading(false);
    }
  };

  // Setup Google Ads
  const setupGoogleAds = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/marketing/setup-google-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project?.id || 1,
          companyName: user.company,
          budget: campaign.googleAds.budget
        })
      });
      
      await response.json();
      
      setCampaign({
        ...campaign,
        googleAds: {
          ...campaign.googleAds,
          status: 'active'
        }
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Google Ads setup error:', error);
      // Demo fallback
      setCampaign({
        ...campaign,
        googleAds: {
          ...campaign.googleAds,
          status: 'active'
        }
      });
      setLoading(false);
    }
  };

  // Simulate campaign data (for demo)
  const simulateCampaignProgress = () => {
    setCampaign({
      ...campaign,
      emailCampaign: {
        ...campaign.emailCampaign,
        sent: 2847,
        opens: 1024,
        clicks: 312
      },
      googleAds: {
        ...campaign.googleAds,
        impressions: 45230,
        clicks: 1247,
        conversions: 89,
        cpl: 281
      }
    });
  };

  const renderOverview = () => (
    <div className="marketing-overview">
      <div className="overview-header">
        <h2>Marknadsföringskampanj</h2>
        {project && <p className="project-name">Projekt: {project.name}</p>}
      </div>

      <div className="campaign-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <h3>Total Reach</h3>
            <div className="stat-value">
              {(campaign.emailCampaign.sent + campaign.googleAds.impressions).toLocaleString('sv-SE')}
            </div>
            <p className="stat-label">Personer nådda</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📧</div>
          <div className="stat-content">
            <h3>Email Opens</h3>
            <div className="stat-value">
              {campaign.emailCampaign.opens > 0 
                ? `${Math.round((campaign.emailCampaign.opens / campaign.emailCampaign.sent) * 100)}%`
                : '—'}
            </div>
            <p className="stat-label">{campaign.emailCampaign.opens.toLocaleString('sv-SE')} öppningar</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Cost Per Lead</h3>
            <div className="stat-value">
              {campaign.googleAds.cpl > 0 ? `${campaign.googleAds.cpl} SEK` : '—'}
            </div>
            <p className="stat-label">Kostnad per teckningsavsikt</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Conversions</h3>
            <div className="stat-value">
              {campaign.googleAds.conversions > 0 
                ? campaign.googleAds.conversions 
                : '—'}
            </div>
            <p className="stat-label">Teckningsavsikter</p>
          </div>
        </div>
      </div>

      <div className="campaign-components">
        <h3>Kampanjkomponenter (Fas 1 MVP)</h3>
        
        {/* Landing Page */}
        <div className={`component-card ${campaign.landingPage.generated ? 'active' : ''}`}>
          <div className="component-header">
            <div>
              <h4>🌐 Emissionssida (Landing Page)</h4>
              <p>SEO-optimerad landningssida för emissionen</p>
            </div>
            <span className={`status-badge ${campaign.landingPage.generated ? 'status-active' : 'status-pending'}`}>
              {campaign.landingPage.generated ? 'Aktiv' : 'Ej skapad'}
            </span>
          </div>
          
          {campaign.landingPage.generated ? (
            <div className="component-content">
              <div className="component-details">
                <div className="detail-item">
                  <strong>URL:</strong> 
                  <a href={campaign.landingPage.url} target="_blank" rel="noopener noreferrer">
                    {campaign.landingPage.url}
                  </a>
                </div>
                <div className="detail-item">
                  <strong>SEO Score:</strong> 
                  <span className="seo-score">{campaign.landingPage.seoScore}/100</span>
                </div>
              </div>
              <div className="component-actions">
                <button className="btn-primary" onClick={() => setActiveTab('landing')}>Förhandsgranska</button>
                <button className="btn-secondary" onClick={() => {
                  if (landingPageHtml && blobUrlRef.current) {
                    window.open(blobUrlRef.current, '_blank');
                  }
                }}>Öppna i nytt fönster</button>
              </div>
            </div>
          ) : (
            <div className="component-actions">
              <button 
                className="btn-primary"
                onClick={generateLandingPage}
                disabled={loading}
              >
                {loading ? 'Genererar...' : 'Generera emissionssida'}
              </button>
            </div>
          )}
        </div>

        {/* Email Campaign */}
        <div className={`component-card ${campaign.emailCampaign.status !== 'not-started' ? 'active' : ''}`}>
          <div className="component-header">
            <div>
              <h4>📧 Email-kampanj (3-stegs drip)</h4>
              <p>Automatiserad email-sekvens till opt-in investerare</p>
            </div>
            <span className={`status-badge status-${campaign.emailCampaign.status}`}>
              {campaign.emailCampaign.status === 'not-started' ? 'Ej startad' : 
               campaign.emailCampaign.status === 'scheduled' ? 'Schemalagd' : 'Aktiv'}
            </span>
          </div>
          
          {campaign.emailCampaign.status !== 'not-started' ? (
            <div className="component-content">
              <div className="email-sequence">
                {campaign.emailCampaign.emails.map((email, i) => (
                  <div key={i} className="email-item">
                    <span className="email-number">{i + 1}</span>
                    <span className="email-name">
                      {email === 'pre-launch' ? 'Pre-launch (3 dagar före)' :
                       email === 'opening' ? 'Öppning (dag 1)' :
                       'Last Call (2 dagar kvar)'}
                    </span>
                    <span className="email-status">✅ Schemalagd</span>
                  </div>
                ))}
              </div>
              {campaign.emailCampaign.sent > 0 && (
                <div className="component-stats">
                  <div className="stat-item">
                    <strong>Skickade:</strong> {campaign.emailCampaign.sent.toLocaleString('sv-SE')}
                  </div>
                  <div className="stat-item">
                    <strong>Öppningar:</strong> {campaign.emailCampaign.opens.toLocaleString('sv-SE')}
                  </div>
                  <div className="stat-item">
                    <strong>Klick:</strong> {campaign.emailCampaign.clicks.toLocaleString('sv-SE')}
                  </div>
                </div>
              )}
              <div className="component-actions">
                <button className="btn-secondary">Visa mallar</button>
                <button className="btn-secondary">Redigera</button>
              </div>
            </div>
          ) : (
            <div className="component-actions">
              <button 
                className="btn-primary"
                onClick={setupEmailCampaign}
                disabled={loading || !campaign.landingPage.generated}
              >
                {loading ? 'Konfigurerar...' : 'Konfigurera email-kampanj'}
              </button>
              {!campaign.landingPage.generated && (
                <p className="requirement-note">Kräver att emissionssida är skapad först</p>
              )}
            </div>
          )}
        </div>

        {/* Google Ads */}
        <div className={`component-card ${campaign.googleAds.status !== 'not-started' ? 'active' : ''}`}>
          <div className="component-header">
            <div>
              <h4>🎯 Google Search Ads</h4>
              <p>Keyword-targeterad sökannonser ing</p>
            </div>
            <span className={`status-badge status-${campaign.googleAds.status}`}>
              {campaign.googleAds.status === 'not-started' ? 'Ej startad' : 
               campaign.googleAds.status === 'scheduled' ? 'Schemalagd' : 'Aktiv'}
            </span>
          </div>
          
          {campaign.googleAds.status !== 'not-started' ? (
            <div className="component-content">
              <div className="component-details">
                <div className="detail-item">
                  <strong>Budget:</strong> {campaign.googleAds.budget.toLocaleString('sv-SE')} SEK
                </div>
                <div className="detail-item">
                  <strong>Keywords:</strong> [företagsnamn] emission, [bransch] investering, nya emissioner 2025
                </div>
              </div>
              {campaign.googleAds.impressions > 0 && (
                <div className="component-stats">
                  <div className="stat-item">
                    <strong>Impressions:</strong> {campaign.googleAds.impressions.toLocaleString('sv-SE')}
                  </div>
                  <div className="stat-item">
                    <strong>Klick:</strong> {campaign.googleAds.clicks.toLocaleString('sv-SE')}
                  </div>
                  <div className="stat-item">
                    <strong>CTR:</strong> {((campaign.googleAds.clicks / campaign.googleAds.impressions) * 100).toFixed(2)}%
                  </div>
                  <div className="stat-item">
                    <strong>Konverteringar:</strong> {campaign.googleAds.conversions}
                  </div>
                </div>
              )}
              <div className="component-actions">
                <button className="btn-secondary">Visa kampanj</button>
                <button className="btn-secondary">Justera budget</button>
              </div>
            </div>
          ) : (
            <div className="component-setup">
              <div className="form-group">
                <label>Kampanjbudget (SEK)</label>
                <input 
                  type="number"
                  value={campaign.googleAds.budget}
                  onChange={(e) => setCampaign({
                    ...campaign,
                    googleAds: { ...campaign.googleAds, budget: parseInt(e.target.value) }
                  })}
                />
                <small>Rekommenderat: 20 000 - 30 000 SEK per emission</small>
              </div>
              <div className="component-actions">
                <button 
                  className="btn-primary"
                  onClick={setupGoogleAds}
                  disabled={loading || !campaign.landingPage.generated}
                >
                  {loading ? 'Skapar kampanj...' : 'Skapa Google Ads-kampanj'}
                </button>
                {!campaign.landingPage.generated && (
                  <p className="requirement-note">Kräver att emissionssida är skapad först</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Demo Actions */}
      <div className="demo-actions">
        <button 
          className="btn-secondary"
          onClick={simulateCampaignProgress}
        >
          🎲 Simulera kampanjdata (Demo)
        </button>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <h4>💡 Fas 1 MVP - Vad ingår</h4>
        <ul>
          <li>✅ SEO-optimerad emissionssida med dynamisk innehåll från IM/Prospekt</li>
          <li>✅ Automatiserad 3-stegs email-kampanj (Pre-launch, Opening, Last Call)</li>
          <li>✅ Google Search Ads med keyword-targeting och konverteringsspårning</li>
        </ul>
        <p><strong>Totalkostnad för kund:</strong> +30 TSEK ovanpå IM-kostnaden</p>
        <p><strong>Estimerad reach:</strong> 50 000 - 100 000 personer</p>
        <p><strong>Estimerad CPL:</strong> 200-400 SEK per teckningsavsikt</p>
      </div>
    </div>
  );

  const renderLandingPage = () => (
    <div className="landing-page-builder">
      <h2>Emissionssida - Preview</h2>
      {campaign.landingPage.generated && blobUrlRef.current ? (
        <div className="landing-page-preview-container">
          <div className="landing-page-actions">
            <div className="landing-page-info">
              <span className="seo-score">SEO: {campaign.landingPage.seoScore}/100</span>
              <span className="page-url">{campaign.landingPage.url}</span>
            </div>
            <div className="landing-page-buttons">
              <button 
                className="btn-primary"
                onClick={() => window.open(blobUrlRef.current, '_blank')}
              >
                Öppna i nytt fönster ↗
              </button>
              <button 
                className="btn-secondary"
                onClick={generateLandingPage}
                disabled={loading}
              >
                {loading ? 'Regenerar...' : 'Generera om'}
              </button>
            </div>
          </div>
          <div className="landing-page-preview">
            <iframe 
              src={blobUrlRef.current}
              title="Emissionssida Preview"
              style={{ width: '100%', height: '850px', border: 'none', borderRadius: '8px' }}
            />
          </div>
          <p className="landing-page-note">
            💡 I produktion publiceras denna sida automatiskt som en dedikerad webbsida med egen URL, 
            optimerad för sökmotorer och kopplad till din emissions-kampanj.
          </p>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🌐</div>
          <h3>Ingen emissionssida genererad</h3>
          <p>Klicka på knappen nedan för att generera en professionell emissionssida baserad på ditt informationsmemorandum.</p>
          <button 
            className="btn-primary"
            onClick={generateLandingPage}
            disabled={loading}
            style={{ marginTop: '1rem' }}
          >
            {loading ? 'Genererar emissionssida...' : 'Generera emissionssida'}
          </button>
        </div>
      )}
    </div>
  );

  const renderEmailCampaigns = () => (
    <div className="email-campaigns">
      <h2>Email-kampanjer</h2>
      {campaign.emailCampaign.status !== 'not-started' ? (
        <div className="email-templates">
          {campaign.emailCampaign.emails.map((email, i) => (
            <div key={i} className="email-template-card">
              <h3>Email {i + 1}: {email === 'pre-launch' ? 'Pre-launch' : email === 'opening' ? 'Öppning' : 'Last Call'}</h3>
              <p><strong>Skickas:</strong> {email === 'pre-launch' ? '3 dagar före' : email === 'opening' ? 'Emissionsdag 1' : '2 dagar kvar'}</p>
              <button className="btn-secondary">Förhandsgranska mall</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Email-kampanjen har inte konfigurerats än.</p>
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="analytics-dashboard">
      <h2>Kampanjanalys</h2>
      {campaign.googleAds.impressions > 0 || campaign.emailCampaign.sent > 0 ? (
        <div className="analytics-content">
          <h3>Kanalprestanda</h3>
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Kanal</th>
                <th>Reach</th>
                <th>Engagement</th>
                <th>Konverteringar</th>
                <th>CPL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Email</td>
                <td>{campaign.emailCampaign.sent.toLocaleString('sv-SE')}</td>
                <td>{campaign.emailCampaign.opens.toLocaleString('sv-SE')} öppningar</td>
                <td>{campaign.emailCampaign.clicks}</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Google Ads</td>
                <td>{campaign.googleAds.impressions.toLocaleString('sv-SE')}</td>
                <td>{campaign.googleAds.clicks.toLocaleString('sv-SE')} klick</td>
                <td>{campaign.googleAds.conversions}</td>
                <td>{campaign.googleAds.cpl} SEK</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>Ingen kampanjdata tillgänglig än. Starta kampanjkomponenter för att se analys.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="marketing-module">
      <div className="module-header">
        <button className="back-button" onClick={onBack}>← Tillbaka</button>
        <h1>📢 Marknadsföring</h1>
      </div>

      <div className="module-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Översikt
        </button>
        <button 
          className={`tab ${activeTab === 'landing' ? 'active' : ''}`}
          onClick={() => setActiveTab('landing')}
        >
          Emissionssida
        </button>
        <button 
          className={`tab ${activeTab === 'email' ? 'active' : ''}`}
          onClick={() => setActiveTab('email')}
        >
          Email
        </button>
        <button 
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analys
        </button>
      </div>

      <div className="module-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'landing' && renderLandingPage()}
        {activeTab === 'email' && renderEmailCampaigns()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
}

export default MarketingModule;
