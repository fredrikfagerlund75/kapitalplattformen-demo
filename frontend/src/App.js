import React, { useState, useEffect, useRef } from 'react';
import logoNav from './assets/logo-nav.svg';
import './App.css';
import Login from './auth/Login';
import Dashboard from './components/Dashboard';
import Kapitalrådgivaren from './components/Kapitalrådgivaren';
import ProjektVy from './components/ProjektVy';
import ProspektGenerator from './components/ProspektGenerator';
import Teckning from './components/Teckning';
import Marknadsföring from './components/Marknadsföring';
import Analytics from './components/Analytics';
import Aktiebok from './components/Aktiebok';
import Inställningar from './components/Inställningar';
import Kassaflode from './components/Kassaflode';
import Emissionsnyheter from './components/Emissionsnyheter';
import Sidebar from './components/Sidebar';
import { apiGet, apiPost, apiPut, getAuthToken, getUser, clearAuthToken } from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [emissionsprojekt, setEmissionsprojekt] = useState([]);
  const [aktivtProjekt, setAktivtProjekt] = useState(null);
  // loading state available for future use
  const [loading, setLoading] = useState(false); // eslint-disable-line no-unused-vars
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const keepAliveRef = useRef(null);
  const [companySettings, setCompanySettings] = useState(() => {
    try {
      const saved = sessionStorage.getItem('companySettings');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Restore session on mount
  useEffect(() => {
    const token = getAuthToken();
    const savedUser = getUser();
    if (token && savedUser) {
      setUser(savedUser);
      keepAliveRef.current = setInterval(() => {
        fetch('/api/health').catch(() => {});
      }, 4 * 60 * 1000);
    }
    return () => clearInterval(keepAliveRef.current);
  }, []);

  // Load emission projects when user is set
  useEffect(() => {
    if (user) {
      loadEmissionsprojekt();
    }
  }, [user]);

  const loadEmissionsprojekt = async () => {
    try {
      const response = await apiGet('/api/emissionsprojekt');
      if (response.ok) {
        const data = await response.json();
        setEmissionsprojekt(data);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleLogin = (userObj) => {
    setUser(userObj);
    keepAliveRef.current = setInterval(() => {
      fetch('/api/health').catch(() => {});
    }, 4 * 60 * 1000);
  };

  const handleLogout = () => {
    clearInterval(keepAliveRef.current);
    clearAuthToken();
    setUser(null);
    setCurrentView('dashboard');
    setAktivtProjekt(null);
    setEmissionsprojekt([]);
    setCompanySettings(null);
    sessionStorage.removeItem('companySettings');
  };

  const navigateTo = (view, projekt = null) => {
    setCurrentView(view);
    if (projekt) setAktivtProjekt(projekt);
  };

  const createNewProjekt = async (projektData) => {
    setLoading(true);
    try {
      const response = await apiPost('/api/emissionsprojekt', projektData);
      const newProjekt = await response.json();
      setEmissionsprojekt([...emissionsprojekt, newProjekt]);
      setAktivtProjekt(newProjekt);
      setLoading(false);
      return newProjekt;
    } catch (error) {
      console.error('Failed to create project:', error);
      setLoading(false);
      throw error;
    }
  };

  const updateProjekt = async (projektId, updates) => {
    try {
      const response = await apiPut(`/api/emissionsprojekt/${projektId}`, updates);
      const updatedProjekt = await response.json();
      
      setEmissionsprojekt(emissionsprojekt.map(p => 
        p.id === projektId ? updatedProjekt : p
      ));
      
      if (aktivtProjekt?.id === projektId) {
        setAktivtProjekt(updatedProjekt);
      }
      
      return updatedProjekt;
    } catch (error) {
      console.error('Failed to update project:', error);
      throw error;
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {/* Global Navigation Bar */}
      <nav className="global-nav">
        <div className="nav-brand">
          <img src={logoNav} alt="Kapitalplattformen" className="nav-logo" />
          <span className="company-name">{companySettings?.companyName || user.company}</span>
        </div>
        <div className="nav-actions">
          {currentView !== 'dashboard' && (
            <button 
              className="nav-button"
              onClick={() => navigateTo('dashboard')}
            >
              ← Tillbaka till Dashboard
            </button>
          )}
          {aktivtProjekt && currentView !== 'dashboard' && (
            <span className="active-project-indicator">
              📊 {aktivtProjekt.name}
            </span>
          )}
          <button className="nav-button" onClick={() => navigateTo('inställningar')}>
            ⚙️ Inställningar
          </button>
          <button className="nav-button-secondary" onClick={handleLogout}>
            Logga ut
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="app-body">
      <Sidebar
        currentView={currentView}
        onNavigate={navigateTo}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
      <main className="main-content">
        {currentView === 'dashboard' && (
          <Dashboard
            user={user}
            emissionsprojekt={emissionsprojekt}
            onNavigate={navigateTo}
            onCreateProject={createNewProjekt}
            onRefresh={loadEmissionsprojekt}
          />
        )}

        {currentView === 'tidigare-emissionsprojekt' && (
          <Dashboard
            user={user}
            emissionsprojekt={emissionsprojekt}
            onNavigate={navigateTo}
            onCreateProject={createNewProjekt}
            onRefresh={loadEmissionsprojekt}
            defaultSection="tidigare"
          />
        )}
        
        {currentView === 'kapitalrådgivaren' && (
          <Kapitalrådgivaren 
            user={user}
            projekt={aktivtProjekt}
            companySettings={companySettings}
            onBack={() => navigateTo('dashboard')}
            onCreateProject={createNewProjekt}
            onUpdateProject={updateProjekt}
            onNavigate={navigateTo}
          />
        )}
        
        {currentView === 'projektvy' && (
          <ProjektVy 
            user={user}
            projekt={aktivtProjekt}
            onBack={() => navigateTo('dashboard')}
            onUpdateProject={updateProjekt}
            onNavigate={navigateTo}
          />
        )}
        
        {currentView === 'prospekt' && (
          <ProspektGenerator 
            user={user}
            projekt={aktivtProjekt}
            companySettings={companySettings}
            onBack={() => navigateTo('dashboard')}
            onUpdateProject={updateProjekt}
            onNavigate={navigateTo}
          />
        )}
        
        {currentView === 'teckning' && (
          <Teckning 
            user={user}
            projekt={aktivtProjekt}
            onBack={() => navigateTo('dashboard')}
            onUpdateProject={updateProjekt}
            onNavigate={navigateTo}
          />
        )}
        
        {currentView === 'marknadsföring' && (
          <Marknadsföring 
            user={user}
            projekt={aktivtProjekt}
            onBack={() => navigateTo('dashboard')}
            onUpdateProject={updateProjekt}
          />
        )}
        
        {currentView === 'analytics' && (
          <Analytics 
            user={user}
            projekt={aktivtProjekt}
            onBack={() => navigateTo('dashboard')}
            onUpdateProject={updateProjekt}
          />
        )}
        
        {currentView === 'aktiebok' && (
          <Aktiebok 
            user={user}
            onBack={() => navigateTo('dashboard')}
          />
        )}

        {currentView === 'inställningar' && (
          <Inställningar
            user={user}
            companySettings={companySettings}
            onSave={(settings) => {
              setCompanySettings(settings);
              sessionStorage.setItem('companySettings', JSON.stringify(settings));
            }}
            onBack={() => navigateTo('dashboard')}
          />
        )}

        {currentView === 'kassaflode' && (
          <Kassaflode
            companyId="1485df45-910c-43cc-8197-ead8282e357d"
            user={user}
            onBack={() => navigateTo('dashboard')}
          />
        )}

        {currentView === 'emissionsnyheter' && (
          <Emissionsnyheter
            user={user}
            onBack={() => navigateTo('dashboard')}
          />
        )}
      </main>
      </div>

      {/* Footer */}
      <footer className="global-footer">
        <p>Kapitalplattformen v5.0 • Emissionsprojekt-driven arkitektur</p>
      </footer>
    </div>
  );
}

export default App;
