import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './auth/Login';
import Dashboard from './components/Dashboard';
import ProspektGenerator from './components/ProspektGenerator';
import MarketingModule from './components/MarketingModule';
import CapitalAdvisor from './components/CapitalAdvisor';
import { getAuthToken, getUser, clearAuthToken } from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [activeProject, setActiveProject] = useState(null);

  // Restore session on mount
  useEffect(() => {
    const token = getAuthToken();
    const savedUser = getUser();
    if (token && savedUser) {
      setUser(savedUser);
    }
  }, []);

  // Login receives user object from Login.js (already authenticated)
  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    clearAuthToken();
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
