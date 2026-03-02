import React, { useState } from 'react';
import './App.css';
import Login from './auth/Login';
import Dashboard from './components/Dashboard';
import ProspektGenerator from './components/ProspektGenerator';
import MarketingModule from './components/MarketingModule';
import CapitalAdvisor from './components/CapitalAdvisor';

function App() {
  const [user, setUser] = useState(null);
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [activeProject, setActiveProject] = useState(null);

  // Mock login function - in production this would call backend API
  const handleLogin = (email, password) => {
    // Demo: Accept any login
    setUser({
      email: email,
      company: 'Demo Företag AB',
      role: 'admin'
    });
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentModule('dashboard');
    setActiveProject(null);
  };

  const navigateToModule = (module, project = null) => {
    setCurrentModule(module);
    if (project) setActiveProject(project);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {/* Global Navigation Bar */}
      <nav className="global-nav">
        <div className="nav-brand">
          <h1>💼 Kapitalplattformen</h1>
          <span className="company-name">{user.company}</span>
        </div>
        <div className="nav-actions">
          {currentModule !== 'dashboard' && (
            <button 
              className="nav-button"
              onClick={() => navigateToModule('dashboard')}
            >
              ← Tillbaka till Dashboard
            </button>
          )}
          <button className="nav-button-secondary" onClick={handleLogout}>
            Logga ut
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {currentModule === 'dashboard' && (
          <Dashboard 
            user={user}
            onNavigate={navigateToModule}
          />
        )}
        
        {currentModule === 'prospekt' && (
          <ProspektGenerator 
            user={user}
            project={activeProject}
            onBack={() => navigateToModule('dashboard')}
          />
        )}
        
        {currentModule === 'marketing' && (
          <MarketingModule 
            user={user}
            project={activeProject}
            onBack={() => navigateToModule('dashboard')}
          />
        )}
        
        {currentModule === 'advisor' && (
          <CapitalAdvisor 
            user={user}
            onBack={() => navigateToModule('dashboard')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="global-footer">
        <p>Kapitalplattformen v2.0 • Demo-version</p>
      </footer>
    </div>
  );
}

export default App;
