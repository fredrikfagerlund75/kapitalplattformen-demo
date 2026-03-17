import React, { useState } from 'react';
import './Dashboard.css';

function Dashboard({ user, emissionsprojekt, onNavigate, onCreateProject, onRefresh, defaultSection }) {
  const [activeSection, setActiveSection] = useState(defaultSection || null);

  const pagaendeProjekt = emissionsprojekt.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
  const tidigareProjekt = emissionsprojekt.filter(p => p.status === 'completed' || p.status === 'cancelled');

  const getStatusColor = (status) => {
    return status === 'completed' ? 'green' : status === 'cancelled' ? 'red' : status === 'active' ? 'blue' : 'gray';
  };

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

  const renderProjektList = (projektLista, readonly = false) => {
    if (projektLista.length === 0) {
      return (
        <div className="empty-state">
          <h3>Inga projekt</h3>
          <p>Starta ett nytt projekt via Kapitalrådgivaren.</p>
        </div>
      );
    }
    return (
      <div className="projekt-grid">
        {projektLista.map(projekt => {
          const moduleInfo = getModuleInfo(projekt.currentModule);
          return (
            <div key={projekt.id} className={`projekt-card${readonly ? ' projekt-card--readonly' : ''}`}>
              <div className="projekt-header">
                <div>
                  <h3>{projekt.name}</h3>
                  <span className="projekt-id">{projekt.id}</span>
                </div>
                <span className={`status-badge status-${getStatusColor(projekt.status)}`}>
                  {projekt.status === 'completed' ? 'Slutförd' :
                   projekt.status === 'cancelled' ? 'Avbruten' :
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
                {!readonly && (
                  <div className="info-row">
                    <span className="info-label">Aktuell fas:</span>
                    <span className={`module-badge module-${moduleInfo.color}`}>
                      {moduleInfo.icon} {moduleInfo.name}
                    </span>
                  </div>
                )}
              </div>

              {!readonly && (
                <div className="projekt-actions">
                  <button className="btn-action" onClick={() => onNavigate('projektvy', projekt)}>🎯 Kapitalrådgivaren</button>
                  <button className="btn-action" onClick={() => onNavigate('prospekt', projekt)}>📄 Prospekt/IM</button>
                  <button className="btn-action" onClick={() => onNavigate('teckning', projekt)}>✍️ Teckning</button>
                  <button className="btn-action" onClick={() => onNavigate('marknadsföring', projekt)}>📢 Marknadsföring</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (activeSection === 'emissionsprojekt') {
    return (
      <div className="dashboard-v5">
        <div className="section-detail-header">
          <button className="back-button" onClick={() => setActiveSection(null)}>← Tillbaka</button>
          <h2>📊 Pågående Emissionsprojekt</h2>
          <button className="btn-secondary" onClick={onRefresh}>🔄 Uppdatera</button>
        </div>
        {renderProjektList(pagaendeProjekt)}
      </div>
    );
  }

  if (activeSection === 'tidigare') {
    return (
      <div className="dashboard-v5">
        <div className="section-detail-header">
          <button className="back-button" onClick={() => setActiveSection(null)}>← Tillbaka</button>
          <h2>📁 Tidigare Emissionsprojekt</h2>
        </div>
        {renderProjektList(tidigareProjekt, true)}
      </div>
    );
  }

  return (
    <div className="dashboard-v5">
      <div className="dashboard-hero">
        <h1>Välkommen till Kapitalplattformen</h1>
        <p className="hero-subtitle">Hantera er kapitalanskaffning från beslut till genomförande</p>
        <button className="btn-hero" onClick={() => onNavigate('kapitalrådgivaren')}>
          🎯 Öppna Kapitalrådgivaren
        </button>
      </div>

      <div className="dashboard-tiles">
        <div className="dashboard-tile" onClick={() => setActiveSection('emissionsprojekt')}>
          <div className="tile-icon">📊</div>
          <div className="tile-body">
            <h3>Pågående Emissionsprojekt</h3>
            <p>{pagaendeProjekt.length > 0 ? `${pagaendeProjekt.length} aktivt projekt` : 'Inga aktiva projekt'}</p>
          </div>
          <span className="tile-arrow">→</span>
        </div>

        <div className="dashboard-tile" onClick={() => onNavigate('kassaflode')}>
          <div className="tile-icon">💰</div>
          <div className="tile-body">
            <h3>Ditt Kassaflöde</h3>
            <p>Prognos & kapitalbehov</p>
          </div>
          <span className="tile-arrow">→</span>
        </div>

        <div className="dashboard-tile" onClick={() => onNavigate('emissionsnyheter')}>
          <div className="tile-icon">📰</div>
          <div className="tile-body">
            <h3>Emissionsnyheter</h3>
            <p>Marknadsöversikt & nyheter</p>
          </div>
          <span className="tile-arrow">→</span>
        </div>
      </div>

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
