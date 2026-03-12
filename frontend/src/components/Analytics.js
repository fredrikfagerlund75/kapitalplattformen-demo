import React, { useState } from 'react';
import { apiPost } from '../utils/api';

function Analytics({ user, projekt, onBack, onUpdateProject }) {
  const [manualTeckning, setManualTeckning] = useState({
    total: projekt?.analytics?.teckning?.total || 0,
    antalTecknare: projekt?.analytics?.teckning?.antalTecknare || 0
  });
  const [updating, setUpdating] = useState(false);

  if (!projekt) {
    return (
      <div className="module-container">
        <div className="module-header">
          <button className="back-button" onClick={onBack}>← Tillbaka</button>
          <h1>📊 Analytics</h1>
        </div>
        <div className="empty-state">
          <p>Välj ett emissionsprojekt från Dashboard</p>
        </div>
      </div>
    );
  }

  const percent = projekt.analytics.teckning.percent || 0;
  const målvolym = projekt.emissionsvillkor.emissionsvolym;

  return (
    <div className="module-container">
      <div className="module-header">
        <button className="back-button" onClick={onBack}>← Tillbaka</button>
        <h1>📊 Analytics - {projekt.name}</h1>
      </div>

      <div className="module-content">
        <h2>Emissionsdashboard</h2>
        
        {/* Teckning Status */}
        <div className="analytics-section">
          <h3>✍️ Teckningsstatus</h3>
          <div className="big-metric">
            <div className="metric-value">{percent.toFixed(1)}%</div>
            <div className="metric-label">Tecknat av målvolym</div>
          </div>
          
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{projekt.analytics.teckning.total.toLocaleString('sv-SE')} SEK</div>
              <div className="stat-label">Totalt tecknat</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{målvolym.toLocaleString('sv-SE')} SEK</div>
              <div className="stat-label">Målvolym</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{projekt.analytics.teckning.antalTecknare}</div>
              <div className="stat-label">Antal tecknare</div>
            </div>
          </div>

          <div className="info-box">
            <p><strong>⚠️ Utmaning:</strong> Realtidsdata från förvaltare</p>
            <p>Förvaltare (Avanza, Nordnet, banker) lämnar vanligtvis bara slutgiltiga siffror.</p>
            <p><strong>Lösning:</strong> Manuell upload från emissionsinstitut</p>
          </div>

          <div className="manual-update-section">
            <h4>Manuell uppdatering av teckningsstatus</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Totalt tecknat (SEK)</label>
                <input 
                  type="number" 
                  value={manualTeckning.total}
                  onChange={(e) => setManualTeckning({...manualTeckning, total: parseInt(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>Antal tecknare</label>
                <input 
                  type="number" 
                  value={manualTeckning.antalTecknare}
                  onChange={(e) => setManualTeckning({...manualTeckning, antalTecknare: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <button className="btn-primary" onClick={async () => {
              setUpdating(true);
              try {
                const response = await apiPost('/api/analytics/update-teckning', {
                  projektId: projekt.id,
                  teckningData: manualTeckning
                });
                if (response.ok) {
                  await onUpdateProject(projekt.id, {
                    analytics: {
                      ...projekt.analytics,
                      teckning: {
                        ...projekt.analytics.teckning,
                        total: manualTeckning.total,
                        antalTecknare: manualTeckning.antalTecknare,
                        percent: (manualTeckning.total / projekt.emissionsvillkor.emissionsvolym * 100)
                      }
                    }
                  });
                  alert('Teckningsstatus uppdaterad!');
                }
              } catch (error) {
                console.error('Update error:', error);
                alert('Kunde inte uppdatera status');
              }
              setUpdating(false);
            }} disabled={updating}>
              {updating ? 'Uppdaterar...' : 'Uppdatera status'}
            </button>
          </div>
        </div>

        {/* Emissionssida Stats */}
        <div className="analytics-section">
          <h3>🌐 Emissionssida</h3>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{projekt.analytics.emissionssida.visits}</div>
              <div className="stat-label">Besök</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{projekt.analytics.emissionssida.uniqueVisitors}</div>
              <div className="stat-label">Unika besökare</div>
            </div>
          </div>
        </div>

        {/* Email Stats */}
        <div className="analytics-section">
          <h3>📧 Email-kampanjer</h3>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{projekt.analytics.email.sent}</div>
              <div className="stat-label">Skickade</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{projekt.analytics.email.opens}</div>
              <div className="stat-label">Öppningar</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{projekt.analytics.email.clicks}</div>
              <div className="stat-label">Klick</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{((projekt.analytics.email.opens / projekt.analytics.email.sent) * 100).toFixed(1)}%</div>
              <div className="stat-label">Öppningsgrad</div>
            </div>
          </div>
        </div>

        {/* Ads Stats */}
        <div className="analytics-section">
          <h3>🎯 Annonsering</h3>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-value">{projekt.analytics.ads.impressions.toLocaleString('sv-SE')}</div>
              <div className="stat-label">Impressions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{projekt.analytics.ads.clicks}</div>
              <div className="stat-label">Klick</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{projekt.analytics.ads.conversions}</div>
              <div className="stat-label">Konverteringar</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{((projekt.analytics.ads.clicks / projekt.analytics.ads.impressions) * 100).toFixed(2)}%</div>
              <div className="stat-label">CTR</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;
