import React from 'react';
import { Folder, Handshake, Newspaper, ClipboardList, BarChart2, Home, HelpCircle, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = [
  { icon: Folder, label: 'Tidigare Emissionsprojekt', view: 'tidigare-emissionsprojekt' },
  { icon: Handshake, label: 'Kapitalrådgivaren', view: 'kapitalrådgivaren' },
  { icon: Newspaper, label: 'Emissionsnyheter', view: 'emissionsnyheter' },
  { icon: ClipboardList, label: 'Aktiebok', view: 'aktiebok' },
  { icon: BarChart2, label: 'Analytics', view: 'analytics' },
  { icon: Home, label: 'Översikt', view: 'dashboard' },
];

const BOTTOM_ITEMS = [
  { icon: HelpCircle, label: 'Support', view: null },
  { icon: Settings, label: 'Inställningar', view: 'inställningar' },
];

function Sidebar({ currentView, onNavigate, expanded, onToggle }) {
  return (
    <aside className={`sidebar ${expanded ? 'sidebar--expanded' : ''}`}>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={`sidebar-item ${currentView === item.view ? 'sidebar-item--active' : ''}`}
              onClick={() => item.view && onNavigate(item.view)}
              title={item.label}
            >
              <span className="sidebar-item-icon"><Icon size={18} strokeWidth={1.5} /></span>
              <span className="sidebar-item-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={`sidebar-item ${item.view && currentView === item.view ? 'sidebar-item--active' : ''} ${!item.view ? 'sidebar-item--disabled' : ''}`}
              onClick={() => item.view && onNavigate(item.view)}
              title={item.label}
            >
              <span className="sidebar-item-icon"><Icon size={18} strokeWidth={1.5} /></span>
              <span className="sidebar-item-label">{item.label}</span>
            </button>
          );
        })}
        <button
          className="sidebar-item sidebar-toggle-btn"
          onClick={onToggle}
          title={expanded ? 'Kollapsa sidebar' : 'Expandera sidebar'}
        >
          <span className="sidebar-item-icon">
            {expanded
              ? <ChevronLeft size={18} strokeWidth={1.5} />
              : <ChevronRight size={18} strokeWidth={1.5} />}
          </span>
          <span className="sidebar-item-label">Kollapsa</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
