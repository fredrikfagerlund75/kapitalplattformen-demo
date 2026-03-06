import React, { useState } from 'react';
import './Dashboard.css';

function Dashboard({ user, emissionsprojekt, onNavigate, onCreateProject, onRefresh }) {
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false); // eslint-disable-line no-unused-vars

  const getModuleInfo = (currentModule) => {
    const modules = {
      'kapitalrådgivaren': { name: 'Kapitalrådgivaren', icon: '🎯', color: 'blue' },
      'projektvy': { name: 'Projektvy', icon: '📋', color: 'blue' },
      'prospekt': { name: 'Prospekt/IM', icon: '📄', color: 'green' },
      'teckning': { name: 'Teckning', icon: '✍️', color: 'purple' },
      'marknadsföring': { name: 'Marknadsföring', icon: '📢', color: 'orange' },
      'analytics': { name: 'Analytics', icon: '📊', color: 'teal' }
    };
    return modules[currentModule] || modules['kapitalrådgivaren'];
  };

  const getStatusColor = (status) => {
    return status === 'completed' ? 'green' : status === 'active' ? 'blue' : 'gray';
  };

  return (
    <div className="dashboard-v5">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <h1>Välkommen till Kapitalplattformen</h1>
        <p className="hero-subtitle">Hantera er kapitalanskaffning från beslut till genomförande</p>
        <button 
          className="btn-hero"
          onClick={() => onNavigate('kapitalrådgivaren')}
        >
          🎯 Öppna Kapitalrådgivaren
        </button>
      </div>

      {/* Emission Projects */}
      <div className="emissionsprojekt-section">
        <div className="section-header">
          <h2>📊 Emissionsprojekt</h2>
          <button className="btn-secondary" onClick={onRefresh}>
            🔄 Uppdatera
          </button>
        </div>

        {emissionsprojekt.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>Inga emissionsprojekt än</h3>
            <p>Starta ett nytt projekt genom Kapitalrådgivaren</p>
            <button 
              className="btn-primary"
              onClick={() => onNavigate('kapitalrådgivaren')}
            >
              Öppna Kapitalrådgivaren
            </button>
          </div>
        ) : (
          <div className="projekt-grid">
            {emissionsprojekt.map(projekt => {
              const moduleInfo = getModuleInfo(projekt.currentModule);
              
              return (
                <div key={projekt.id} className="projekt-card">
                  <div className="projekt-header">
                    <div>
                      <h3>{projekt.name}</h3>
                      <span className="projekt-id">{projekt.id}</span>
                    </div>
                    <span className={`status-badge status-${getStatusColor(projekt.status)}`}>
                      {projekt.status === 'completed' ? 'Slutförd' : 
                       projekt.status === 'active' ? 'Aktiv' : 'Utkast'}
                    </span>
                  </div>

                  <div className="projekt-info">
                    <div className="info-row">
                      <span className="info-label">Typ:</span>
                      <span>{projekt.emissionsvillkor.typ}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Volym:</span>
                      <span>{projekt.emissionsvillkor.emissionsvolym.toLocaleString('sv-SE')} SEK</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Aktuell fas:</span>
                      <span className={`module-badge module-${moduleInfo.color}`}>
                        {moduleInfo.icon} {moduleInfo.name}
                      </span>
                    </div>
                  </div>

                  {/* Progress Timeline */}
                  <div className="projekt-timeline">
                    <div className="timeline-step completed">
                      <div className="timeline-dot"></div>
                      <span>Kapitalrådgivaren</span>
                    </div>
                    <div className={`timeline-step ${projekt.prospekt?.fileUrl ? 'completed' : projekt.currentModule === 'prospekt' ? 'active' : ''}`}>
                      <div className="timeline-dot"></div>
                      <span>Prospekt/IM</span>
                    </div>
                    <div className={`timeline-step ${projekt.teckning?.emissionssidaUrl ? 'completed' : projekt.currentModule === 'teckning' ? 'active' : ''}`}>
                      <div className="timeline-dot"></div>
                      <span>Teckning</span>
                    </div>
                    <div className={`timeline-step ${projekt.marknadsföring?.emailCampaignId ? 'completed' : projekt.currentModule === 'marknadsföring' ? 'active' : ''}`}>
                      <div className="timeline-dot"></div>
                      <span>Marknadsföring</span>
                    </div>
                    <div className={`timeline-step ${projekt.status === 'completed' ? 'completed' : projekt.currentModule === 'analytics' ? 'active' : ''}`}>
                      <div className="timeline-dot"></div>
                      <span>Analytics</span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  {projekt.analytics && (
                    <div className="projekt-stats">
                      <div className="stat-mini">
                        <div className="stat-value">{projekt.analytics.teckning.percent.toFixed(1)}%</div>
                        <div className="stat-label">Tecknat</div>
                      </div>
                      <div className="stat-mini">
                        <div className="stat-value">{projekt.analytics.emissionssida.visits}</div>
                        <div className="stat-label">Besök</div>
                      </div>
                      <div className="stat-mini">
                        <div className="stat-value">{projekt.analytics.email.opens}</div>
                        <div className="stat-label">Email-öppningar</div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="projekt-actions">
                    <button 
                      className="btn-primary"
                      onClick={() => {
                        const view = (projekt.currentModule === 'kapitalrådgivaren') ? 'projektvy' : projekt.currentModule;
                        onNavigate(view, projekt);
                      }}
                    >
                      Öppna projekt
                    </button>
                    <button 
                      className="btn-secondary"
                      onClick={() => onNavigate('analytics', projekt)}
                    >
                      📊 Analytics
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Access Modules */}
      <div className="modules-section">
        <h2>Snabbåtkomst</h2>
        <div className="modules-grid">
          <div className="module-card" onClick={() => onNavigate('kapitalrådgivaren')}>
            <div className="module-icon">🎯</div>
            <h3>Kapitalrådgivaren</h3>
            <p>Emissionsanalys & skapa projekt</p>
          </div>

          <div className="module-card" onClick={() => onNavigate('aktiebok')}>
            <div className="module-icon">📊</div>
            <h3>Aktiebok</h3>
            <p>Hantera aktieägare</p>
          </div>

          <div className="module-card disabled">
            <div className="module-icon">📈</div>
            <h3>Översikt</h3>
            <p>Sammanställning alla projekt</p>
            <span className="coming-soon-badge">Kommer snart</span>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <div className="info-banner-icon">ℹ️</div>
        <div className="info-banner-content">
          <strong>Version 5.0 - Emissionsprojekt-arkitektur</strong>
          <p>All data och processer kopplas nu till specifika emissionsprojekt som flödar genom plattformen.</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
