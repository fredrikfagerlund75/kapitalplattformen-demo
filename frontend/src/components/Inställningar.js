import React, { useState, useEffect } from 'react';
import './Inställningar.css';
import { apiPost, apiGet, apiPut } from '../utils/api';

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

  const [brandProfile, setBrandProfile] = useState({
    ton: 'Professionell',
    tagline: '',
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    font: 'Inter',
    logoUrl: ''
  });
  const [brandSaved, setBrandSaved] = useState(false);

  useEffect(() => {
    apiGet('/api/settings/brand-profile')
      .then(r => r.json())
      .then(data => setBrandProfile(data))
      .catch(() => {});
  }, []);

  const handleBrandChange = (field, value) => {
    setBrandProfile(prev => ({ ...prev, [field]: value }));
    setBrandSaved(false);
  };

  const handleBrandSave = async () => {
    try {
      await apiPut('/api/settings/brand-profile', brandProfile);
      setBrandSaved(true);
    } catch {
      alert('Kunde inte spara varumärkesprofil');
    }
  };

  const handleBrandDemo = () => {
    setBrandProfile({
      ton: 'Tillväxt',
      tagline: 'Investera i morgondagens infrastruktur',
      primaryColor: '#2563eb',
      secondaryColor: '#7c3aed',
      font: 'Inter',
      logoUrl: ''
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

  return (
    <div className="module-container">
      <div className="module-header">
        <button className="back-button" onClick={onBack}>← Tillbaka</button>
        <h1>⚙️ Inställningar</h1>
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
                    {loading ? 'Söker...' : '🔍 Hämta info'}
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
              {saved ? '✅ Sparat' : '💾 Spara inställningar'}
            </button>
          </div>
        </div>

        <div className="settings-info-box">
          <p>💡 Informationen som sparas här används som grund i Kapitalrådgivaren, Prospektgeneratorn och övriga moduler.
          Du kan alltid ändra uppgifterna i respektive modul.</p>
        </div>

        <div className="settings-card" style={{ marginTop: '1.5rem' }}>
          <h2>🎨 Varumärkesprofil</h2>
          <p className="settings-desc">
            Används av Kampanjmotorn i Marknadsföring för att anpassa ton och stil på genererat innehåll.
          </p>

          <div className="settings-form">
            <div className="form-row two-col">
              <div className="form-group">
                <label>Kommunikationston</label>
                <select value={brandProfile.ton} onChange={(e) => handleBrandChange('ton', e.target.value)}>
                  <option value="Professionell">Professionell</option>
                  <option value="Tillväxt">Tillväxt</option>
                  <option value="Nordisk">Nordisk</option>
                </select>
              </div>
              <div className="form-group">
                <label>Typsnitt</label>
                <select value={brandProfile.font} onChange={(e) => handleBrandChange('font', e.target.value)}>
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Playfair Display">Playfair Display</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tagline</label>
                <input
                  type="text"
                  value={brandProfile.tagline}
                  onChange={(e) => handleBrandChange('tagline', e.target.value)}
                  placeholder="Investera i morgondagens infrastruktur"
                />
              </div>
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label>Primärfärg</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={brandProfile.primaryColor}
                    onChange={(e) => handleBrandChange('primaryColor', e.target.value)}
                    style={{ width: '48px', height: '38px', padding: '2px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                  <input
                    type="text"
                    value={brandProfile.primaryColor}
                    onChange={(e) => handleBrandChange('primaryColor', e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Sekundärfärg</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={brandProfile.secondaryColor}
                    onChange={(e) => handleBrandChange('secondaryColor', e.target.value)}
                    style={{ width: '48px', height: '38px', padding: '2px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                  />
                  <input
                    type="text"
                    value={brandProfile.secondaryColor}
                    onChange={(e) => handleBrandChange('secondaryColor', e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Logotyp-URL (valfritt)</label>
                <input
                  type="text"
                  value={brandProfile.logoUrl}
                  onChange={(e) => handleBrandChange('logoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
          </div>

          <div className="settings-actions">
            <button className="btn-secondary" onClick={handleBrandDemo}>
              🎲 Fyll i exempeldata
            </button>
            <button className="btn-primary" onClick={handleBrandSave}>
              {brandSaved ? '✅ Sparat' : '💾 Spara varumärkesprofil'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Inställningar;
