import React, { useState } from 'react';
import { Target, ClipboardList, FileText, PenLine, Megaphone, BarChart2, Wallet, Newspaper, BarChart3, Info, RefreshCw, ChevronLeft, ChevronRight, Folder } from 'lucide-react';
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
      'kapitalrådgivaren': { name: 'Kapitalrådgivaren', icon: Target, color: 'blue' },
      'projektvy': { name: 'Projektvy', icon: ClipboardList, color: 'blue' },
      'prospekt': { name: 'Prospekt/IM', icon: FileText, color: 'green' },
      'teckning': { name: 'Teckning', icon: PenLine, color: 'purple' },
      'marknadsföring': { name: 'Marknadsföring', icon: Megaphone, color: 'orange' },
      'analytics': { name: 'Analytics', icon: BarChart2, color: 'teal' }
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
          const ModuleIcon = moduleInfo.icon;
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
                      <ModuleIcon size={13} strokeWidth={1.5} /> {moduleInfo.name}
                    </span>
                  </div>
                )}
              </div>

              {!readonly && (
                <div className="projekt-actions">
                  <button className="btn-action" onClick={() => onNavigate('projektvy', projekt)}>
                    <Target size={14} strokeWidth={1.5} /> Kapitalrådgivaren
                  </button>
                  <button className="btn-action" onClick={() => onNavigate('prospekt', projekt)}>
                    <FileText size={14} strokeWidth={1.5} /> Prospekt/IM
                  </button>
                  <button className="btn-action" onClick={() => onNavigate('teckning', projekt)}>
                    <PenLine size={14} strokeWidth={1.5} /> Teckning
                  </button>
                  <button className="btn-action" onClick={() => onNavigate('marknadsföring', projekt)}>
                    <Megaphone size={14} strokeWidth={1.5} /> Marknadsföring
                  </button>
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
          <button className="back-button" onClick={() => setActiveSection(null)}>
            <ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka
          </button>
          <h2><BarChart3 size={20} strokeWidth={1.5} /> Pågående Emissionsprojekt</h2>
          <button className="btn-secondary" onClick={onRefresh}>
            <RefreshCw size={14} strokeWidth={1.5} /> Uppdatera
          </button>
        </div>
        {renderProjektList(pagaendeProjekt)}
      </div>
    );
  }

  if (activeSection === 'tidigare') {
    return (
      <div className="dashboard-v5">
        <div className="section-detail-header">
          <button className="back-button" onClick={() => setActiveSection(null)}>
            <ChevronLeft size={16} strokeWidth={1.5} /> Tillbaka
          </button>
          <h2><Folder size={20} strokeWidth={1.5} /> Tidigare Emissionsprojekt</h2>
        </div>
        {renderProjektList(tidigareProjekt, false)}
      </div>
    );
  }

  return (
    <div className="dashboard-v5">
      <div className="dashboard-hero">
        <h1>Välkommen till Kapitalplattformen</h1>
        <p className="hero-subtitle">Hantera er kapitalanskaffning från beslut till genomförande</p>
        <button className="btn-hero" onClick={() => onNavigate('kapitalrådgivaren')}>
          <Target size={18} strokeWidth={1.5} /> Öppna Kapitalrådgivaren
        </button>
      </div>

      <div className="dashboard-tiles">
        <div className="dashboard-tile" onClick={() => setActiveSection('emissionsprojekt')}>
          <div className="tile-icon"><BarChart2 size={24} strokeWidth={1.5} /></div>
          <div className="tile-body">
            <h3>Pågående Emissionsprojekt</h3>
            <p>{pagaendeProjekt.length > 0 ? `${pagaendeProjekt.length} aktivt projekt` : 'Inga aktiva projekt'}</p>
          </div>
          <span className="tile-arrow"><ChevronRight size={18} strokeWidth={1.5} /></span>
        </div>

        <div className="dashboard-tile" onClick={() => onNavigate('kassaflode')}>
          <div className="tile-icon"><Wallet size={24} strokeWidth={1.5} /></div>
          <div className="tile-body">
            <h3>Ditt Kassaflöde</h3>
            <p>Prognos & kapitalbehov</p>
          </div>
          <span className="tile-arrow"><ChevronRight size={18} strokeWidth={1.5} /></span>
        </div>

        <div className="dashboard-tile" onClick={() => onNavigate('emissionsnyheter')}>
          <div className="tile-icon"><Newspaper size={24} strokeWidth={1.5} /></div>
          <div className="tile-body">
            <h3>Emissionsnyheter</h3>
            <p>Marknadsöversikt & nyheter</p>
          </div>
          <span className="tile-arrow"><ChevronRight size={18} strokeWidth={1.5} /></span>
        </div>
      </div>

      <div className="info-banner">
        <div className="info-banner-icon"><Info size={18} strokeWidth={1.5} /></div>
        <div className="info-banner-content">
          <strong>PROTOTYP – Kapitalplattformen v5</strong>
          <p>Vissa funktioner visas enbart som placeholders och använder sig av testdata.</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
