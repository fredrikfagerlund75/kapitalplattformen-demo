import React, { useState } from 'react';
import './Marknadsföring.css';
import { apiPost, apiGet } from '../utils/api';

function Marknadsföring({ user, projekt, onBack, onUpdateProject, embedded }) {
  const [activeTab, setActiveTab] = useState(embedded ? 'email' : 'landing');
  const [loading, setLoading] = useState(false);

  // Landing page state
  const [landingPageHtml, setLandingPageHtml] = useState('');
  const [landingPageUrl, setLandingPageUrl] = useState('');
  const [landingPageGenerated, setLandingPageGenerated] = useState(false);

  // Email campaign state
  const [emailCampaign, setEmailCampaign] = useState(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [emailType, setEmailType] = useState('pre-launch');
  const [brevoCampaigns, setBrevoCampaigns] = useState([]);

  // Google Ads state
  const [adsBudget, setAdsBudget] = useState(10000);
  const [adsResult, setAdsResult] = useState(null);

  // Analytics state
  const [analytics, setAnalytics] = useState(null);

  // Kampanjkit state
  const [kampanjKit, setKampanjKit] = useState(null);
  const [kampanjLoading, setKampanjLoading] = useState(false);
  const [kampanjSubTab, setKampanjSubTab] = useState('social');

  if (!projekt) {
    return (
      <div className="module-container">
        <div className="module-header">
          <button className="back-button" onClick={onBack}>← Tillbaka</button>
          <h1>📢 Marknadsföring</h1>
        </div>
        <div className="empty-state">
          <p>Välj ett emissionsprojekt från Dashboard</p>
        </div>
      </div>
    );
  }

  // ---- Landing Page ----
  const handleGenerateLandingPage = async () => {
    setLoading(true);
    try {
      const gc = projekt.generatedContent || {};
      const payload = {
        companyName: user.company,
        orgNr: '',
        location: '',
        industry: '',
        website: '',
        emissionType: projekt.emissionsvillkor?.typ || 'Emission',
        emissionSize: `${(projekt.emissionsvillkor?.emissionsvolym || 0).toLocaleString('sv-SE')} SEK`,
        subscriptionPeriod: '',
        emissionPurpose: gc.verksamhet || '',
        executiveSummary: gc.verksamhet || '',
        businessSection: gc.verksamhet || '',
        marketSection: gc.marknad || '',
        riskFactors: gc.riskfaktorer || '',
        offeringTerms: '',
        team: [],
        revenue: '',
        result: '',
        equity: '',
        subscriptionPrice: projekt.emissionsvillkor?.teckningskurs || '',
        numberOfShares: projekt.emissionsvillkor?.antalNyaAktier || '',
        pricePerUnit: projekt.emissionsvillkor?.teckningskurs || ''
      };

      const response = await apiPost('/api/marketing/generate-landing-page', payload);
      const data = await response.json();

      setLandingPageHtml(data.landingPageHtml || '');
      setLandingPageUrl(data.url || '');
      setLandingPageGenerated(true);
    } catch (error) {
      console.error('Landing page error:', error);
      alert('Kunde inte generera landing page');
    }
    setLoading(false);
  };

  // ---- Email Campaign ----
  const handleSetupEmailCampaign = async () => {
    setLoading(true);
    try {
      const response = await apiPost('/api/marketing/setup-email-campaign', {
        projectId: projekt.id,
        companyName: user.company
      });
      const data = await response.json();
      setEmailCampaign(data);
    } catch (error) {
      console.error('Email campaign error:', error);
      alert('Kunde inte skapa email-kampanj');
    }
    setLoading(false);
  };

  const handleGenerateEmailDraft = async () => {
    setLoading(true);
    try {
      const response = await apiPost('/api/marketing/generate-email-draft', {
        companyName: user.company,
        emissionType: projekt.emissionsvillkor?.typ || 'Emission',
        emissionSize: `${(projekt.emissionsvillkor?.emissionsvolym || 0).toLocaleString('sv-SE')} SEK`,
        emailType
      });
      const data = await response.json();
      setEmailDraft(data.htmlContent || data.draft || data.content || '');
    } catch (error) {
      console.error('Email draft error:', error);
      alert('Kunde inte generera email-utkast');
    }
    setLoading(false);
  };

  const handleSendBrevoCampaign = async () => {
    if (!window.confirm('Vill du verkligen skicka kampanjen via Brevo?')) return;
    setLoading(true);
    try {
      const response = await apiPost('/api/marketing/send-brevo-campaign', {
        companyName: user.company,
        subject: emailCampaign?.emails?.[0]?.subject || `${user.company} - Emission`,
        htmlContent: emailDraft || '<p>Emission pågår</p>',
        listId: 2
      });
      const data = await response.json();
      alert(`Kampanj skapad! ID: ${data.campaignId || 'N/A'}`);
    } catch (error) {
      console.error('Brevo send error:', error);
      alert('Kunde inte skicka via Brevo');
    }
    setLoading(false);
  };

  const handleLoadBrevoCampaigns = async () => {
    try {
      const response = await apiGet('/api/marketing/brevo-campaigns');
      const data = await response.json();
      setBrevoCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Brevo campaigns error:', error);
    }
  };

  // ---- Google Ads ----
  const handleSetupGoogleAds = async () => {
    setLoading(true);
    try {
      const response = await apiPost('/api/marketing/setup-google-ads', {
        projectId: projekt.id,
        companyName: user.company,
        budget: adsBudget
      });
      const data = await response.json();
      setAdsResult(data);
    } catch (error) {
      console.error('Google Ads error:', error);
      alert('Kunde inte skapa Google Ads-kampanj');
    }
    setLoading(false);
  };

  // ---- Kampanjmotor ----
  const handleGenerateKampanjKit = async () => {
    setKampanjLoading(true);
    try {
      const response = await apiPost('/api/kampanjmotor/generate', {
        emissionId: projekt.id,
        companyName: user.company,
        emissionType: projekt.emissionsvillkor?.typ || 'Nyemission',
        emissionsvolym: projekt.emissionsvillkor?.emissionsvolym || 0,
        teckningskurs: projekt.emissionsvillkor?.teckningskurs || ''
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        alert('Kunde inte generera kampanjkit: ' + (data.error || 'Okänt fel'));
        return;
      }
      setKampanjKit(data);
    } catch (error) {
      console.error('Kampanjmotor error:', error);
      alert('Kunde inte generera kampanjkit');
    }
    setKampanjLoading(false);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert('Kopierad!');
  };

  // ---- Analytics ----
  const handleLoadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await apiGet(`/api/marketing/analytics/${projekt.id}`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Analytics error:', error);
    }
    setLoading(false);
  };

  return (
    <div className={embedded ? 'embedded-module' : 'module-container'}>
      {!embedded && (
        <div className="module-header">
          <button className="back-button" onClick={onBack}>← Tillbaka</button>
          <h1>📢 Marknadsföring - {projekt.name}</h1>
        </div>
      )}

      <div className="module-tabs">
        {!embedded && (
          <button className={`tab ${activeTab === 'landing' ? 'active' : ''}`} onClick={() => setActiveTab('landing')}>
            🌐 Landing Page
          </button>
        )}
        <button className={`tab ${activeTab === 'email' ? 'active' : ''}`} onClick={() => setActiveTab('email')}>
          📧 Email-kampanjer
        </button>
        <button className={`tab ${activeTab === 'brevkampanjer' ? 'active' : ''}`} onClick={() => setActiveTab('brevkampanjer')}>
          ✉️ Brevkampanjer
        </button>
        <button className={`tab ${activeTab === 'ads' ? 'active' : ''}`} onClick={() => setActiveTab('ads')}>
          🎯 Google Ads
        </button>
        <button className={`tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => { setActiveTab('analytics'); handleLoadAnalytics(); }}>
          📊 Statistik
        </button>
        <button className={`tab ${activeTab === 'kampanjkit' ? 'active' : ''}`} onClick={() => setActiveTab('kampanjkit')}>
          🎨 Kampanjkit
        </button>
      </div>

      <div className="module-content">
        {/* ===== LANDING PAGE TAB ===== */}
        {activeTab === 'landing' && (
          <div className="mf-section">
            <h2>🌐 Emissionssida (Landing Page)</h2>
            <p>Generera en Redeye-style landing page för er emission</p>

            <button className="btn-primary btn-large" onClick={handleGenerateLandingPage} disabled={loading}>
              {loading ? 'Genererar...' : '🤖 Generera Landing Page'}
            </button>

            {landingPageGenerated && (
              <div className="mf-landing-result">
                <div className="mf-landing-meta">
                  <span className="mf-badge mf-badge-success">✅ Publicerad</span>
                  <span className="mf-url">{landingPageUrl}</span>
                </div>
                <div className="mf-iframe-container">
                  <iframe
                    title="Landing Page Preview"
                    srcDoc={landingPageHtml}
                    style={{ width: '100%', height: '600px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                </div>
                <div className="mf-actions-row">
                  <button className="btn-secondary" onClick={() => {
                    const blob = new Blob([landingPageHtml], { type: 'text/html' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'emission-landing-page.html';
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}>
                    📥 Ladda ner HTML
                  </button>
                  <button className="btn-secondary" onClick={() => {
                    navigator.clipboard.writeText(landingPageHtml);
                    alert('HTML kopierad!');
                  }}>
                    📋 Kopiera HTML
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== EMAIL TAB ===== */}
        {activeTab === 'email' && (
          <div className="mf-section">
            <h2>📧 Email-kampanjer</h2>

            <div className="mf-card">
              <h3>Automatisk kampanjsekvens</h3>
              <p>AI genererar tre email-ämnesrader: Pre-launch, Opening, Last Call</p>
              <button className="btn-primary" onClick={handleSetupEmailCampaign} disabled={loading}>
                {loading ? 'Skapar...' : '🤖 Skapa email-kampanj'}
              </button>

              {emailCampaign && (
                <div className="mf-email-result">
                  <div className="mf-badge mf-badge-info">Kampanj: {emailCampaign.campaignId}</div>
                  <table className="mf-table">
                    <thead>
                      <tr><th>Typ</th><th>Ämnesrad</th><th>Datum</th></tr>
                    </thead>
                    <tbody>
                      {emailCampaign.emails.map((email, i) => (
                        <tr key={i}>
                          <td><span className="mf-tag">{email.type}</span></td>
                          <td>{email.subject}</td>
                          <td>{new Date(email.scheduledDate).toLocaleDateString('sv-SE')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mf-card" style={{ marginTop: '1.5rem' }}>
              <h3>Generera email-utkast (Brevo)</h3>
              <div className="form-group">
                <label>Typ av email</label>
                <select value={emailType} onChange={(e) => setEmailType(e.target.value)}>
                  <option value="pre-launch">Pre-launch</option>
                  <option value="opening">Emission öppnar</option>
                  <option value="last-call">Sista chansen</option>
                </select>
              </div>
              <button className="btn-secondary" onClick={handleGenerateEmailDraft} disabled={loading}>
                {loading ? 'Genererar...' : '✍️ Generera email-utkast'}
              </button>

              {emailDraft && (
                <div className="mf-draft-preview">
                  <h4>Utkast:</h4>
                  <iframe
                    srcDoc={emailDraft}
                    title="Email-förhandsgranskning"
                    sandbox="allow-same-origin"
                    style={{ width: '100%', height: '500px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}
                  />
                  <button className="btn-primary" onClick={handleSendBrevoCampaign} disabled={loading} style={{ marginTop: '12px' }}>
                    📤 Skicka via Brevo
                  </button>
                </div>
              )}
            </div>

            <div className="mf-card" style={{ marginTop: '1.5rem' }}>
              <h3>Brevo-kampanjer</h3>
              <button className="btn-secondary" onClick={handleLoadBrevoCampaigns}>
                🔄 Hämta kampanjer
              </button>
              {brevoCampaigns.length > 0 && (
                <table className="mf-table" style={{ marginTop: '12px' }}>
                  <thead>
                    <tr><th>ID</th><th>Namn</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {brevoCampaigns.map((c, i) => (
                      <tr key={i}>
                        <td>{c.id}</td>
                        <td>{c.name}</td>
                        <td>{c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ===== GOOGLE ADS TAB ===== */}
        {activeTab === 'ads' && (
          <div className="mf-section">
            <h2>🎯 Google Ads-kampanj</h2>
            <p>Skapa en kampanj mot emissionssidan med AI-genererade keywords</p>

            <div className="mf-card">
              <div className="form-group">
                <label>Daglig budget (SEK)</label>
                <input
                  type="number"
                  value={adsBudget}
                  onChange={(e) => setAdsBudget(parseInt(e.target.value) || 0)}
                  min="100"
                  step="500"
                />
              </div>
              <button className="btn-primary" onClick={handleSetupGoogleAds} disabled={loading}>
                {loading ? 'Skapar...' : '🤖 Skapa Google Ads-kampanj'}
              </button>

              {adsResult && (
                <div className="mf-ads-result">
                  <div className="mf-badge mf-badge-success">Kampanj: {adsResult.campaignId}</div>
                  <div className="mf-stats-grid">
                    <div className="mf-stat">
                      <span className="mf-stat-value">{adsResult.budget?.toLocaleString('sv-SE')} SEK</span>
                      <span className="mf-stat-label">Budget</span>
                    </div>
                    <div className="mf-stat">
                      <span className="mf-stat-value">{adsResult.estimatedReach?.toLocaleString('sv-SE')}</span>
                      <span className="mf-stat-label">Beräknad räckvidd</span>
                    </div>
                  </div>
                  <h4>AI-genererade keywords:</h4>
                  <div className="mf-keywords">
                    {adsResult.keywords?.map((kw, i) => (
                      <span key={i} className="mf-keyword-tag">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== BREVKAMPANJER TAB ===== */}
        {activeTab === 'brevkampanjer' && (
          <div className="mf-section">
            <h2>✉️ Brevkampanjer</h2>
            <div className="mf-card">
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📮</div>
                <h3>Under utveckling</h3>
                <p style={{ color: '#666', maxWidth: '500px', margin: '12px auto' }}>
                  Funktionalitet för att skicka fysiska brev med information om emissionen via Postnord eller Kivra.
                  Detta behöver utredas mer innan det kan tas i bruk.
                </p>
                <span className="mf-badge" style={{ background: '#fef3cd', color: '#856404' }}>🚧 Kommer i framtida version</span>
              </div>
            </div>
          </div>
        )}

        {/* ===== KAMPANJKIT TAB ===== */}
        {activeTab === 'kampanjkit' && (
          <div className="mf-section">
            <h2>🎨 Kampanjkit</h2>
            <p>Generera färdigt marknadsföringsinnehåll baserat på emissionsdata och varumärkesprofil</p>

            <div className="mf-kampanj-status">
              <div className="mf-kampanj-status-info">
                <strong>{projekt.name}</strong>
                <span>{projekt.emissionsvillkor?.typ || 'Emission'} · {projekt.emissionsvillkor?.emissionsvolym ? Number(projekt.emissionsvillkor.emissionsvolym).toLocaleString('sv-SE') + ' SEK' : ''}</span>
              </div>
              <button className="btn-primary" onClick={handleGenerateKampanjKit} disabled={kampanjLoading}>
                {kampanjLoading ? '⏳ Genererar...' : kampanjKit ? '🔄 Regenerera' : '🤖 Generera kampanjkit'}
              </button>
            </div>

            {kampanjKit && (
              <>
                <div className="mf-referral-box">
                  <span className="mf-referral-label">🔗 Referrallänk</span>
                  <span className="mf-referral-url">{kampanjKit.referralUrl}</span>
                  <button className="btn-secondary btn-small" onClick={() => handleCopy(kampanjKit.referralUrl)}>
                    📋 Kopiera
                  </button>
                </div>

                <div className="mf-kampanj-subtabs">
                  <button className={`mf-kampanj-subtab ${kampanjSubTab === 'social' ? 'active' : ''}`} onClick={() => setKampanjSubTab('social')}>
                    LinkedIn & X
                  </button>
                  <button className={`mf-kampanj-subtab ${kampanjSubTab === 'press' ? 'active' : ''}`} onClick={() => setKampanjSubTab('press')}>
                    Presstext
                  </button>
                  <button className={`mf-kampanj-subtab ${kampanjSubTab === 'email' ? 'active' : ''}`} onClick={() => setKampanjSubTab('email')}>
                    Email-mall
                  </button>
                </div>

                {kampanjSubTab === 'social' && (
                  <div>
                    <h3 style={{ margin: '1.5rem 0 1rem' }}>LinkedIn</h3>
                    {(kampanjKit.linkedin || []).map((v, i) => (
                      <div key={i} className="mf-variant-card">
                        <div className="mf-variant-header">
                          <span className="mf-variant-label">{v.label}</span>
                          <button className="btn-secondary btn-small" onClick={() => handleCopy(v.text)}>📋 Kopiera</button>
                        </div>
                        <p className="mf-variant-text">{v.text}</p>
                      </div>
                    ))}

                    <h3 style={{ margin: '1.5rem 0 1rem' }}>X / Twitter</h3>
                    {(kampanjKit.x || []).map((v, i) => (
                      <div key={i} className="mf-variant-card">
                        <div className="mf-variant-header">
                          <span className="mf-variant-label">{v.label}</span>
                          <button className="btn-secondary btn-small" onClick={() => handleCopy(v.text)}>📋 Kopiera</button>
                        </div>
                        <p className="mf-variant-text">{v.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {kampanjSubTab === 'press' && (
                  <div className="mf-variant-card" style={{ marginTop: '1.5rem' }}>
                    <div className="mf-variant-header">
                      <span className="mf-variant-label">Presstext</span>
                      <button className="btn-secondary btn-small" onClick={() => handleCopy(kampanjKit.presstext)}>📋 Kopiera</button>
                    </div>
                    <p className="mf-variant-text" style={{ whiteSpace: 'pre-wrap' }}>{kampanjKit.presstext}</p>
                  </div>
                )}

                {kampanjSubTab === 'email' && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                      <button className="btn-secondary btn-small" onClick={() => handleCopy(kampanjKit.emailHtml)}>📋 Kopiera HTML</button>
                    </div>
                    <iframe
                      srcDoc={kampanjKit.emailHtml}
                      title="Email-mall förhandsgranskning"
                      sandbox="allow-same-origin"
                      style={{ width: '100%', height: '500px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== ANALYTICS TAB ===== */}
        {activeTab === 'analytics' && (
          <div className="mf-section">
            <h2>📊 Marknadsföringsstatistik</h2>

            {!analytics ? (
              <div className="mf-loading">Laddar statistik...</div>
            ) : (
              <div className="mf-analytics-grid">
                <div className="mf-analytics-card">
                  <h3>🌐 Landing Page</h3>
                  <div className="mf-stats-grid">
                    <div className="mf-stat">
                      <span className="mf-stat-value">{analytics.landingPage?.visits?.toLocaleString('sv-SE')}</span>
                      <span className="mf-stat-label">Besök</span>
                    </div>
                    <div className="mf-stat">
                      <span className="mf-stat-value">{analytics.landingPage?.uniqueVisitors?.toLocaleString('sv-SE')}</span>
                      <span className="mf-stat-label">Unika besökare</span>
                    </div>
                    <div className="mf-stat">
                      <span className="mf-stat-value">{analytics.landingPage?.bounceRate}</span>
                      <span className="mf-stat-label">Bounce rate</span>
                    </div>
                    <div className="mf-stat">
                      <span className="mf-stat-value">{analytics.landingPage?.avgTimeOnPage}</span>
                      <span className="mf-stat-label">Tid på sidan</span>
                    </div>
                  </div>
                </div>

                <div className="mf-analytics-card">
                  <h3>📧 Email-kampanjer</h3>
                  <div className="mf-stats-grid">
                    <div className="mf-stat">
                      <span className="mf-stat-value">{analytics.emailCampaign?.sent?.toLocaleString('sv-SE')}</span>
                      <span className="mf-stat-label">Skickade</span>
                    </div>
                    <div className="mf-stat">
                      <span className="mf-stat-value">{analytics.emailCampaign?.opens?.toLocaleString('sv-SE')}</span>
                      <span className="mf-stat-label">Öppnade</span>
                    </div>
                    <div className="mf-stat">
                      <span className="mf-stat-value">{analytics.emailCampaign?.clicks?.toLocaleString('sv-SE')}</span>
                      <span className="mf-stat-label">Klick</span>
                    </div>
                  </div>
                </div>

                <div className="mf-analytics-card">
                  <h3>🎯 Google Ads</h3>
                  <div className="mf-stats-grid">
                    <div className="mf-stat">
                      <span className="mf-stat-value">{analytics.googleAds?.impressions?.toLocaleString('sv-SE')}</span>
                      <span className="mf-stat-label">Visningar</span>
                    </div>
                    <div className="mf-stat">
                      <span className="mf-stat-value">{analytics.googleAds?.clicks?.toLocaleString('sv-SE')}</span>
                      <span className="mf-stat-label">Klick</span>
                    </div>
                    <div className="mf-stat">
                      <span className="mf-stat-value">{analytics.googleAds?.conversions}</span>
                      <span className="mf-stat-label">Konverteringar</span>
                    </div>
                    <div className="mf-stat">
                      <span className="mf-stat-value">{analytics.googleAds?.cpl} SEK</span>
                      <span className="mf-stat-label">Kostnad/lead</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Marknadsföring;
