import React, { useState, useEffect } from 'react';
import './Inställningar.css';
import { apiPost, getAuthHeaders } from '../utils/api';
import { ChevronLeft, Settings, Search, CheckCircle2, Save, Lightbulb, Palette, AlertTriangle, Dices } from 'lucide-react';

// Demo company ID (from DB seed)
const DEMO_COMPANY_ID = '1485df45-910c-43cc-8197-ead8282e357d';

const BRAND_DEFAULTS = {
  company_name: '',
  tagline: '',
  logo_url: '',
  logo_dark_url: '',
  website_url: '',
  color_primary: '#1E2761',
  color_secondary: '#185FA5',
  color_accent: '#1D9E75',
  color_text_on_primary: '#FFFFFF',
  font_heading: 'Georgia',
  font_body: 'Calibri',
  tone: 'balanserad',
  language: 'sv',
  keywords: [],
  avoid_words: [],
  ir_contact_name: '',
  ir_contact_email: '',
  ir_contact_phone: '',
  disclaimer_text: '',
  hero_images: []
};

function Inställningar({ user, companySettings, onSave, onBack }) {
  const [formData, setFormData] = useState({
    companyName: companySettings?.companyName || user?.company || '',
    orgNr: companySettings?.orgNr || '',
    address: companySettings?.address || '',
    city: companySettings?.city || '',
    industry: companySettings?.industry || '',
    website: companySettings?.website || ''
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [brandProfile, setBrandProfile] = useState(BRAND_DEFAULTS);
  const [brandSaved, setBrandSaved] = useState(false);
  const [brandStatus, setBrandStatus] = useState(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [avoidInput, setAvoidInput] = useState('');

  useEffect(() => {
    fetch(`/api/companies/${DEMO_COMPANY_ID}/brand-profile`, {
      headers: getAuthHeaders()
    })
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) setBrandProfile({
            ...BRAND_DEFAULTS,
            ...data,
            disclaimer_text: data.disclaimer_text || '',
            keywords:        Array.isArray(data.keywords)    ? data.keywords    : [],
            avoid_words:     Array.isArray(data.avoid_words) ? data.avoid_words : [],
            hero_images:     Array.isArray(data.hero_images) ? data.hero_images : []
          });
      })
      .catch(() => {});

    fetch(`/api/companies/${DEMO_COMPANY_ID}/brand-profile/status`, {
      headers: getAuthHeaders()
    })
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) setBrandStatus(data);
      })
      .catch(() => {});
  }, []);

  const handleBrandChange = (field, value) => {
    setBrandProfile(prev => ({ ...prev, [field]: value }));
    setBrandSaved(false);
  };

  const handleBrandSave = async () => {
    try {
      const res = await fetch(`/api/companies/${DEMO_COMPANY_ID}/brand-profile`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(brandProfile)
      });
      const updated = await res.json();
      if (updated && !updated.error) setBrandProfile({
        ...BRAND_DEFAULTS,
        ...updated,
        disclaimer_text: updated.disclaimer_text || '',
        keywords:        Array.isArray(updated.keywords)    ? updated.keywords    : [],
        avoid_words:     Array.isArray(updated.avoid_words) ? updated.avoid_words : [],
        hero_images:     Array.isArray(updated.hero_images) ? updated.hero_images : []
      });
      setBrandSaved(true);
      fetch(`/api/companies/${DEMO_COMPANY_ID}/brand-profile/status`, {
        headers: getAuthHeaders()
      }).then(r => r.json()).then(data => { if (data && !data.error) setBrandStatus(data); }).catch(() => {});
    } catch {
      alert('Kunde inte spara varumärkesprofil');
    }
  };

  const handleBrandDemo = () => {
    setBrandProfile({
      company_name: 'GreenTech Nordic AB',
      tagline: 'Investera i morgondagens infrastruktur',
      logo_url: '',
      logo_dark_url: '',
      website_url: 'https://greentechnordic.se',
      color_primary: '#1E2761',
      color_secondary: '#185FA5',
      color_accent: '#1D9E75',
      color_text_on_primary: '#FFFFFF',
      font_heading: 'Georgia',
      font_body: 'Calibri',
      tone: 'balanserad',
      language: 'sv',
      keywords: ['hållbarhet', 'tillväxt', 'innovation'],
      avoid_words: ['spekulativ', 'garanterad avkastning'],
      ir_contact_name: 'Anna Lindqvist',
      ir_contact_email: 'ir@greentechnordic.se',
      ir_contact_phone: '+46 70 123 45 67',
      disclaimer_text: 'Detta material utgör inte ett erbjudande om att teckna aktier och har enbart informationssyfte. Historisk avkastning är ingen garanti för framtida avkastning.',
      hero_images: [
        'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800',
        'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=800'
      ]
    });
    setBrandSaved(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleLookup = async () => {
    if (!formData.orgNr) {
      alert('Ange organisationsnummer först');
      return;
    }
    setLoading(true);
    try {
      const response = await apiPost('/api/lookup-company', { orgNr: formData.orgNr });
      const data = await response.json();
      if (data.found && data.company) {
        setFormData(prev => ({
          ...prev,
          companyName: data.company.name || prev.companyName,
          industry: data.company.industry || prev.industry,
          city: data.company.location || prev.city,
          website: data.company.website || prev.website
        }));
        setSaved(false);
      } else {
        alert(data.error || 'Kunde inte hitta bolaget');
      }
    } catch (error) {
      console.error('Lookup error:', error);
      alert('Kunde inte ansluta till tjänsten');
    }
    setLoading(false);
  };

  const handleSave = () => {
    onSave(formData);
    setSaved(true);
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw || (brandProfile.keywords || []).length >= 5) return;
    handleBrandChange('keywords', [...(brandProfile.keywords || []), kw]);
    setKeywordInput('');
  };

  const removeKeyword = (kw) => {
    handleBrandChange('keywords', (brandProfile.keywords || []).filter(k => k !== kw));
  };

  const addAvoidWord = () => {
    const w = avoidInput.trim();
    if (!w || (brandProfile.avoid_words || []).length >= 10) return;
    handleBrandChange('avoid_words', [...(brandProfile.avoid_words || []), w]);
    setAvoidInput('');
  };

  const removeAvoidWord = (w) => {
    handleBrandChange('avoid_words', (brandProfile.avoid_words || []).filter(x => x !== w));
  };

  const addHeroImage = () => {
    if ((brandProfile.hero_images || []).length >= 3) return;
    handleBrandChange('hero_images', [...(brandProfile.hero_images || []), '']);
  };

  const updateHeroImage = (idx, val) => {
    const updated = [...(brandProfile.hero_images || [])];
    updated[idx] = val;
    handleBrandChange('hero_images', updated);
  };

  const removeHeroImage = (idx) => {
    handleBrandChange('hero_images', (brandProfile.hero_images || []).filter((_, i) => i !== idx));
  };

  return (
    <div className="module-container">
      <div className="module-header">
        <button className="back-button" onClick={onBack}><ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka</button>
        <h1><Settings size={20} strokeWidth={1.5} /> Inställningar</h1>
      </div>

      <div className="settings-content">
        <div className="settings-card">
          <h2>Bolagsinformation</h2>
          <p className="settings-desc">
            Grundinformation om bolaget som används i övriga moduler.
            Fyll i organisationsnummer och klicka "Hämta info" för att automatiskt fylla i uppgifter.
          </p>

          <div className="settings-form">
            <div className="form-row">
              <div className="form-group">
                <label>Organisationsnummer</label>
                <div className="input-with-button">
                  <input
                    type="text"
                    value={formData.orgNr}
                    onChange={(e) => handleChange('orgNr', e.target.value)}
                    placeholder="XXXXXX-XXXX"
                  />
                  <button className="btn-secondary" onClick={handleLookup} disabled={loading}>
                    {loading ? 'Söker...' : <><Search size={14} strokeWidth={1.5} /> Hämta info</>}
                  </button>
                </div>
              </div>
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label>Bolagsnamn</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="AB Exempel"
                />
              </div>
              <div className="form-group">
                <label>Bransch</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  placeholder="Informationsteknik"
                />
              </div>
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label>Registrerad adress</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Gatuadress 1"
                />
              </div>
              <div className="form-group">
                <label>Postort</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Stockholm, Sverige"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Hemsida</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://www.example.se"
                />
              </div>
            </div>
          </div>

          <div className="settings-actions">
            <button className="btn-primary" onClick={handleSave}>
              {saved ? <><CheckCircle2 size={14} strokeWidth={1.5} /> Sparat</> : <><Save size={14} strokeWidth={1.5} /> Spara inställningar</>}
            </button>
          </div>
        </div>

        <div className="settings-info-box">
          <p><Lightbulb size={14} strokeWidth={1.5} /> Informationen som sparas här används som grund i Kapitalrådgivaren, Prospektgeneratorn och övriga moduler.
          Du kan alltid ändra uppgifterna i respektive modul.</p>
        </div>

        <div className="settings-card" style={{ marginTop: '1.5rem' }}>
          <h2><Palette size={18} strokeWidth={1.5} /> Varumärkesprofil</h2>
          <p className="settings-desc">
            Används av Kampanjmotorn och Pitch Deck-generatorn för att anpassa ton, stil och grafisk profil.
          </p>

          {brandStatus && !brandStatus.valid && (
            <div className="brand-status-warning">
              <AlertTriangle size={14} strokeWidth={1.5} /> Varumärkesprofilen är ofullständig — pitch deck kan inte genereras.<br />
              <span>Saknade fält: {(brandStatus.missing || []).join(', ')}</span>
            </div>
          )}

          <div className="settings-form">
            <h3 className="brand-section-heading">Identitet</h3>

            <div className="form-row two-col">
              <div className="form-group">
                <label>Bolagsnamn</label>
                <input
                  type="text"
                  value={brandProfile.company_name}
                  onChange={(e) => handleBrandChange('company_name', e.target.value)}
                  placeholder="GreenTech Nordic AB"
                />
              </div>
              <div className="form-group">
                <label>Tagline <span className="field-hint">(max 120 tecken)</span></label>
                <input
                  type="text"
                  value={brandProfile.tagline}
                  onChange={(e) => handleBrandChange('tagline', e.target.value)}
                  maxLength={120}
                  placeholder="Investera i morgondagens infrastruktur"
                />
              </div>
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label>Logotyp-URL</label>
                <input
                  type="text"
                  value={brandProfile.logo_url}
                  onChange={(e) => handleBrandChange('logo_url', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                {brandProfile.logo_url && (
                  <img src={brandProfile.logo_url} alt="Logotyp" className="logo-preview" />
                )}
              </div>
              <div className="form-group">
                <label>Logotyp mörk bakgrund <span className="field-hint" title="Vit/ljus version för mörka slide-bakgrunder">(?)</span></label>
                <input
                  type="text"
                  value={brandProfile.logo_dark_url}
                  onChange={(e) => handleBrandChange('logo_dark_url', e.target.value)}
                  placeholder="https://example.com/logo-white.png"
                />
                {brandProfile.logo_dark_url && (
                  <img src={brandProfile.logo_dark_url} alt="Logotyp mörk" className="logo-preview logo-preview-dark" />
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Webbplats</label>
                <input
                  type="text"
                  value={brandProfile.website_url}
                  onChange={(e) => handleBrandChange('website_url', e.target.value)}
                  placeholder="https://www.example.se"
                />
              </div>
            </div>

            <h3 className="brand-section-heading">Färger</h3>

            <div className="form-row two-col">
              <div className="form-group">
                <label>Primärfärg</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={brandProfile.color_primary}
                    onChange={(e) => handleBrandChange('color_primary', e.target.value)}
                    style={{ width: '48px', height: '38px', padding: '2px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                  <input
                    type="text"
                    value={brandProfile.color_primary}
                    onChange={(e) => handleBrandChange('color_primary', e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Sekundärfärg</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={brandProfile.color_secondary}
                    onChange={(e) => handleBrandChange('color_secondary', e.target.value)}
                    style={{ width: '48px', height: '38px', padding: '2px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                  <input
                    type="text"
                    value={brandProfile.color_secondary}
                    onChange={(e) => handleBrandChange('color_secondary', e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label>Accentfärg</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={brandProfile.color_accent}
                    onChange={(e) => handleBrandChange('color_accent', e.target.value)}
                    style={{ width: '48px', height: '38px', padding: '2px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                  <input
                    type="text"
                    value={brandProfile.color_accent}
                    onChange={(e) => handleBrandChange('color_accent', e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Textfärg på primär <span className="field-hint" title="Beräknas automatiskt om tomt">(?)</span></label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={brandProfile.color_text_on_primary}
                    onChange={(e) => handleBrandChange('color_text_on_primary', e.target.value)}
                    style={{ width: '48px', height: '38px', padding: '2px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                  <input
                    type="text"
                    value={brandProfile.color_text_on_primary}
                    onChange={(e) => handleBrandChange('color_text_on_primary', e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>

            <h3 className="brand-section-heading">Typografi</h3>

            <div className="form-row two-col">
              <div className="form-group">
                <label>Rubrikfont</label>
                <select value={brandProfile.font_heading} onChange={(e) => handleBrandChange('font_heading', e.target.value)}>
                  <option value="Georgia">Georgia</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Arial Black">Arial Black</option>
                  <option value="Cambria">Cambria</option>
                </select>
              </div>
              <div className="form-group">
                <label>Brödtextfont</label>
                <select value={brandProfile.font_body} onChange={(e) => handleBrandChange('font_body', e.target.value)}>
                  <option value="Calibri">Calibri</option>
                  <option value="Arial">Arial</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                </select>
              </div>
            </div>

            <h3 className="brand-section-heading">Ton &amp; röst</h3>

            <div className="form-row two-col">
              <div className="form-group">
                <label>Kommunikationston</label>
                <select value={brandProfile.tone} onChange={(e) => handleBrandChange('tone', e.target.value)}>
                  <option value="formell">Formell</option>
                  <option value="balanserad">Balanserad</option>
                  <option value="säljande">Säljande</option>
                </select>
              </div>
              <div className="form-group">
                <label>Språk</label>
                <select value={brandProfile.language} onChange={(e) => handleBrandChange('language', e.target.value)}>
                  <option value="sv">Svenska</option>
                  <option value="en">Engelska</option>
                  <option value="bilingual">Tvåspråkig</option>
                </select>
              </div>
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label>Nyckelord <span className="field-hint">(max 5)</span></label>
                <div className="tag-input-row">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                    placeholder="Lägg till nyckelord..."
                    disabled={(brandProfile.keywords || []).length >= 5}
                  />
                  <button className="btn-secondary btn-small" onClick={addKeyword} disabled={(brandProfile.keywords || []).length >= 5}>+</button>
                </div>
                <div className="tag-list">
                  {(brandProfile.keywords || []).map(kw => (
                    <span key={kw} className="tag-item">{kw} <button onClick={() => removeKeyword(kw)}>×</button></span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Undvik dessa ord <span className="field-hint">(max 10)</span></label>
                <div className="tag-input-row">
                  <input
                    type="text"
                    value={avoidInput}
                    onChange={(e) => setAvoidInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addAvoidWord()}
                    placeholder="Lägg till ord att undvika..."
                    disabled={(brandProfile.avoid_words || []).length >= 10}
                  />
                  <button className="btn-secondary btn-small" onClick={addAvoidWord} disabled={(brandProfile.avoid_words || []).length >= 10}>+</button>
                </div>
                <div className="tag-list">
                  {(brandProfile.avoid_words || []).map(w => (
                    <span key={w} className="tag-item tag-item-avoid">{w} <button onClick={() => removeAvoidWord(w)}>×</button></span>
                  ))}
                </div>
              </div>
            </div>

            <h3 className="brand-section-heading">Bakgrundsbilder för pitch deck</h3>

            <p className="settings-desc">
              Används som bakgrundsbilder i pitch deck-exporten. Minst en bild rekommenderas.
              Bilden bör vara minst 1920×1080px.
            </p>

            {(brandProfile.hero_images || []).map((url, idx) => (
              <div key={idx} className="form-row hero-image-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Bild {idx + 1}</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => updateHeroImage(idx, e.target.value)}
                    placeholder="https://example.com/hero.jpg"
                  />
                  {url && <img src={url} alt={`Hero ${idx + 1}`} className="hero-preview" />}
                </div>
                <button className="btn-secondary btn-small" onClick={() => removeHeroImage(idx)} style={{ alignSelf: 'flex-end', marginBottom: '4px' }}>Ta bort</button>
              </div>
            ))}

            {(brandProfile.hero_images || []).length < 3 && (
              <button className="btn-secondary" onClick={addHeroImage}>+ Lägg till bild</button>
            )}

            <h3 className="brand-section-heading">Investor Relations</h3>

            <div className="form-row two-col">
              <div className="form-group">
                <label>Kontaktperson IR</label>
                <input
                  type="text"
                  value={brandProfile.ir_contact_name}
                  onChange={(e) => handleBrandChange('ir_contact_name', e.target.value)}
                  placeholder="Anna Lindqvist"
                />
              </div>
              <div className="form-group">
                <label>IR-telefon</label>
                <input
                  type="text"
                  value={brandProfile.ir_contact_phone}
                  onChange={(e) => handleBrandChange('ir_contact_phone', e.target.value)}
                  placeholder="+46 70 123 45 67"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>IR-epost</label>
                <input
                  type="email"
                  value={brandProfile.ir_contact_email}
                  onChange={(e) => handleBrandChange('ir_contact_email', e.target.value)}
                  placeholder="ir@example.se"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ansvarsfriskrivning <span className="field-hint">(lämna tomt för standardtext)</span></label>
                <textarea
                  value={brandProfile.disclaimer_text}
                  onChange={(e) => handleBrandChange('disclaimer_text', e.target.value)}
                  placeholder="Detta material utgör inte ett erbjudande att teckna värdepapper..."
                  rows={3}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          <div className="settings-actions">
            <button className="btn-secondary" onClick={handleBrandDemo}>
              <Dices size={14} strokeWidth={1.5} /> Fyll i exempeldata
            </button>
            <button className="btn-primary" onClick={handleBrandSave}>
              {brandSaved ? <><CheckCircle2 size={14} strokeWidth={1.5} /> Sparat</> : <><Save size={14} strokeWidth={1.5} /> Spara varumärkesprofil</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Inställningar;
