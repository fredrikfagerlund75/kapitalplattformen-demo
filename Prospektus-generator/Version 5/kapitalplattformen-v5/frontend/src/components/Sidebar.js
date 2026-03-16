import React from 'react';
import './Sidebar.css';

const NAV_ITEMS = [
  { icon: '📁', label: 'Tidigare Emissionsprojekt', view: 'tidigare-emissionsprojekt' },
  { icon: '🤝', label: 'Kapitalrådgivaren', view: 'kapitalrådgivaren' },
  { icon: '📰', label: 'Emissionsnyheter', view: 'emissionsnyheter' },
  { icon: '📋', label: 'Aktiebok', view: 'aktiebok' },
  { icon: '📊', label: 'Analytics', view: 'analytics' },
  { icon: '🏠', label: 'Översikt', view: 'dashboard' },
];

const BOTTOM_ITEMS = [
  { icon: '❓', label: 'Support', view: null },
  { icon: '⚙️', label: 'Inställningar', view: 'inställningar' },
];

function Sidebar({ currentView, onNavigate, expanded, onToggle }) {
  return (
    <aside className={`sidebar ${expanded ? 'sidebar--expanded' : ''}`}>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            className={`sidebar-item ${currentView === item.view ? 'sidebar-item--active' : ''}`}
            onClick={() => item.view && onNavigate(item.view)}
            title={item.label}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span className="sidebar-item-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        {BOTTOM_ITEMS.map((item) => (
          <button
            key={item.label}
            className={`sidebar-item ${item.view && currentView === item.view ? 'sidebar-item--active' : ''} ${!item.view ? 'sidebar-item--disabled' : ''}`}
            onClick={() => item.view && onNavigate(item.view)}
            title={item.label}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span className="sidebar-item-label">{item.label}</span>
          </button>
        ))}
        <button
          className="sidebar-item sidebar-toggle-btn"
          onClick={onToggle}
          title={expanded ? 'Kollapsa sidebar' : 'Expandera sidebar'}
        >
          <span className="sidebar-item-icon">{expanded ? '◀' : '▶'}</span>
          <span className="sidebar-item-label">Kollapsa</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
