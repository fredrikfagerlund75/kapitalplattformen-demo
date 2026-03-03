import React, { useState } from 'react';
import './Dashboard.css';

function Dashboard({ user, onNavigate }) {
  const [projects] = useState([
    {
      id: 1,
      name: 'Serie A-runda Q2 2025',
      type: 'IM',
      status: 'draft',
      created: '2025-02-10',
      hasMarketing: false
    },
    {
      id: 2,
      name: 'Företrädesemission H1 2025',
      type: 'Prospekt',
      status: 'completed',
      created: '2025-01-15',
      hasMarketing: true,
      marketingStats: {
        reach: 45000,
        conversions: 127
      }
    }
  ]);

  const modules = [
    {
      id: 'advisor',
      name: 'Kapitalrådgivaren',
      icon: '🎯',
      description: 'Få AI-driven rådgivning om rätt kapitalanskaffningsstrategi',
      status: 'coming-soon',
      color: 'blue'
    },
    {
      id: 'prospekt',
      name: 'Prospekt/IM Generator',
      icon: '📄',
      description: 'Skapa professionella informationsmemorandum och prospekt med AI',
      status: 'active',
      color: 'green'
    },
    {
      id: 'marketing',
      name: 'Marknadsföring',
      icon: '📢',
      description: 'Lansera och marknadsför din emission med moderna digitala kanaler',
      status: 'active',
      color: 'purple'
    },
    {
      id: 'aktiebok',
      name: 'Aktiebok',
      icon: '📊',
      description: 'Hantera aktieägare, opt-ins och synkronisera till marknadsföringskanaler',
      status: 'active',
      color: 'orange'
    }
  ];

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <div className="dashboard-header">
        <h2>Välkommen tillbaka!</h2>
        <p className="dashboard-subtitle">Välj en modul nedan för att komma igång med din kapitalanskaffning</p>
      </div>

      {/* Module Cards */}
      <div className="modules-grid">
        {modules.map(module => (
          <div 
            key={module.id}
            className={`module-card module-${module.color} ${module.status === 'coming-soon' ? 'disabled' : ''}`}
            onClick={() => module.status === 'active' && onNavigate(module.id)}
          >
            <div className="module-icon">{module.icon}</div>
            <h3>{module.name}</h3>
            <p>{module.description}</p>
            {module.status === 'coming-soon' && (
              <div className="coming-soon-badge">Kommer snart</div>
            )}
            {module.status === 'active' && (
              <button className="module-launch-btn">Öppna modul →</button>
            )}
          </div>
        ))}
      </div>

      {/* Recent Projects Section */}
      <div className="recent-projects">
        <h3>Senaste projekt</h3>
        {projects.length === 0 ? (
          <div className="empty-state">
            <p>Du har inga projekt än. Skapa ditt första projekt genom att öppna Prospekt/IM Generator.</p>
          </div>
        ) : (
          <div className="projects-list">
            {projects.map(project => (
              <div key={project.id} className="project-card">
                <div className="project-header">
                  <div>
                    <h4>{project.name}</h4>
                    <span className={`project-type type-${project.type.toLowerCase()}`}>
                      {project.type}
                    </span>
                  </div>
                  <span className={`project-status status-${project.status}`}>
                    {project.status === 'draft' ? 'Utkast' : 'Slutförd'}
                  </span>
                </div>
                
                <div className="project-meta">
                  <span>📅 Skapad: {project.created}</span>
                </div>

                {project.hasMarketing && project.marketingStats && (
                  <div className="project-marketing-stats">
                    <span>📊 Reach: {project.marketingStats.reach.toLocaleString('sv-SE')}</span>
                    <span>✅ Konverteringar: {project.marketingStats.conversions}</span>
                  </div>
                )}

                <div className="project-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => onNavigate('prospekt', project)}
                  >
                    Öppna dokument
                  </button>
                  {project.status === 'completed' && (
                    <button 
                      className="btn-primary"
                      onClick={() => onNavigate('marketing', project)}
                    >
                      {project.hasMarketing ? 'Visa kampanj' : 'Skapa kampanj'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Snabbåtgärder</h3>
        <div className="actions-grid">
          <button 
            className="action-card"
            onClick={() => onNavigate('prospekt')}
          >
            <span className="action-icon">➕</span>
            <span>Nytt projekt</span>
          </button>
          <button 
            className="action-card"
            onClick={() => onNavigate('advisor')}
            disabled
          >
            <span className="action-icon">💡</span>
            <span>Få rådgivning</span>
          </button>
          <button className="action-card">
            <span className="action-icon">📊</span>
            <span>Se statistik</span>
          </button>
          <button className="action-card">
            <span className="action-icon">📚</span>
            <span>Dokumentation</span>
          </button>
          <button 
            className="action-card"
            onClick={() => onNavigate('aktiebok')}
          >
            <span className="action-icon">📊</span>
            <span>Aktiebok</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <div className="info-banner-icon">ℹ️</div>
        <div className="info-banner-content">
          <strong>Demo-version v2.1</strong>
          <p>Du använder en demo-version av Kapitalplattformen. Brevo-integration för email-kampanjer är aktiverad.</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
