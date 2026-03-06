import React, { useState } from 'react';
import './Aktiebok.css';
import { apiPost } from '../utils/api';

// Mock database - aktieägare
const MOCK_SHAREHOLDERS = [
  {
    id: 1,
    name: "Erik Andersson",
    email: "erik.andersson@email.se",
    phone: "+46701234567",
    shares: 125000,
    ownershipPercent: 12.5,
    acquisitionDate: "2023-01-15",
    investorType: "Founder",
    optInEmail: true,
    optInSMS: true,
    optInLinkedIn: false,
    linkedInProfile: null,
    notes: "Grundare och VD"
  },
  {
    id: 2,
    name: "Maria Svensson",
    email: "maria.svensson@investment.se",
    phone: "+46709876543",
    shares: 85000,
    ownershipPercent: 8.5,
    acquisitionDate: "2023-06-20",
    investorType: "Institutional",
    optInEmail: true,
    optInSMS: false,
    optInLinkedIn: true,
    linkedInProfile: "https://linkedin.com/in/mariasvensson",
    notes: "Nordic Ventures Fund II"
  },
  {
    id: 3,
    name: "Johan Karlsson",
    email: "johan.k@gmail.com",
    phone: "+46731234567",
    shares: 45000,
    ownershipPercent: 4.5,
    acquisitionDate: "2024-01-10",
    investorType: "Business Angel",
    optInEmail: true,
    optInSMS: true,
    optInLinkedIn: true,
    linkedInProfile: "https://linkedin.com/in/johankarl",
    notes: "Ex-CEO Spotify"
  },
  {
    id: 4,
    name: "Anna Berg",
    email: "anna.berg@email.se",
    phone: "+46705555123",
    shares: 32000,
    ownershipPercent: 3.2,
    acquisitionDate: "2023-03-15",
    investorType: "Employee",
    optInEmail: true,
    optInSMS: false,
    optInLinkedIn: false,
    linkedInProfile: null,
    notes: "CFO - Optionsprogram 2023"
  },
  {
    id: 5,
    name: "Family Office Stockholm AB",
    email: "contact@familyoffice.se",
    phone: "+46812345678",
    shares: 150000,
    ownershipPercent: 15.0,
    acquisitionDate: "2024-02-01",
    investorType: "Institutional",
    optInEmail: true,
    optInSMS: false,
    optInLinkedIn: false,
    linkedInProfile: null,
    notes: "Pre-IPO round lead"
  },
  // Lägg till fler retail-investerare
  ...Array.from({ length: 15 }, (_, i) => ({
    id: 6 + i,
    name: `Retail Investerare ${i + 1}`,
    email: `retail${i + 1}@example.se`,
    phone: `+4670${String(i).padStart(7, '0')}`,
    shares: Math.floor(Math.random() * 5000) + 500,
    ownershipPercent: ((Math.random() * 0.5) + 0.05).toFixed(2),
    acquisitionDate: `2024-0${Math.floor(Math.random() * 9) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
    investorType: "Retail",
    optInEmail: Math.random() > 0.3,
    optInSMS: Math.random() > 0.7,
    optInLinkedIn: Math.random() > 0.8,
    linkedInProfile: Math.random() > 0.8 ? `https://linkedin.com/in/retail${i + 1}` : null,
    notes: ""
  }))
];

// Nyhetsbrev-prenumeranter (ej aktieägare)
const MOCK_NEWSLETTER_SUBSCRIBERS = [
  {
    id: 101,
    name: "Lisa Johansson",
    email: "lisa.j@gmail.com",
    phone: "+46731112233",
    investorType: "Potential Investor",
    optInEmail: true,
    optInSMS: false,
    source: "Website newsletter signup"
  },
  {
    id: 102,
    name: "Peter Nilsson",
    email: "peter.n@hotmail.com",
    phone: null,
    investorType: "Potential Investor",
    optInEmail: true,
    optInSMS: false,
    source: "LinkedIn ad campaign"
  }
];

function Aktiebok({ user, onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedShareholder, setSelectedShareholder] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const handleSyncToBrevo = async () => {
    setSyncing(true);
    try {
      const contacts = MOCK_SHAREHOLDERS.filter(s => s.optInEmail).map(s => ({
        email: s.email,
        firstName: s.name.split(' ')[0],
        lastName: s.name.split(' ').slice(1).join(' '),
        attributes: {
          SHARES: s.shares,
          INVESTOR_TYPE: s.investorType,
          OPT_IN_SMS: s.optInSMS
        }
      }));

      const response = await apiPost('/api/aktiebok/sync-to-brevo', { contacts });
      const data = await response.json();
      setLastSync(new Date().toLocaleString('sv-SE'));
      alert(`Synkronisering klar! ${data.synced || contacts.length} kontakter synkade till Brevo.`);
    } catch (error) {
      console.error('Brevo sync error:', error);
      alert('Kunde inte synkronisera till Brevo');
    }
    setSyncing(false);
  };

  // Calculate totals
  const totalShares = 1000000; // Total utestående aktier
  const totalShareholders = MOCK_SHAREHOLDERS.length;
  const optInEmailCount = MOCK_SHAREHOLDERS.filter(s => s.optInEmail).length;
  const optInSMSCount = MOCK_SHAREHOLDERS.filter(s => s.optInSMS).length;

  // Filter shareholders
  const filteredShareholders = MOCK_SHAREHOLDERS.filter(sh => {
    const matchesType = filterType === 'all' || sh.investorType === filterType;
    const matchesSearch = searchQuery === '' || 
      sh.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sh.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Group by investor type
  const byType = MOCK_SHAREHOLDERS.reduce((acc, sh) => {
    acc[sh.investorType] = (acc[sh.investorType] || 0) + 1;
    return acc;
  }, {});

  const renderOverview = () => (
    <div className="aktiebok-overview">
      <div className="overview-header">
        <h2>Aktiebok - Översikt</h2>
        <button className="btn-primary" onClick={() => setActiveTab('import')}>
          ➕ Importera data
        </button>
      </div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <h3>Totalt antal aktieägare</h3>
            <div className="metric-value">{totalShareholders}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <h3>Utestående aktier</h3>
            <div className="metric-value">{totalShares.toLocaleString('sv-SE')}</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">✉️</div>
          <div className="metric-content">
            <h3>Email opt-in</h3>
            <div className="metric-value">{optInEmailCount} ({Math.round((optInEmailCount/totalShareholders)*100)}%)</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📱</div>
          <div className="metric-content">
            <h3>SMS opt-in</h3>
            <div className="metric-value">{optInSMSCount} ({Math.round((optInSMSCount/totalShareholders)*100)}%)</div>
          </div>
        </div>
      </div>

      {/* Ownership Distribution */}
      <div className="ownership-distribution">
        <h3>Ägarfördelning per typ</h3>
        <div className="distribution-chart">
          {Object.entries(byType).map(([type, count]) => {
            const percent = (count / totalShareholders) * 100;
            return (
              <div key={type} className="distribution-bar">
                <div className="bar-label">
                  <span>{type}</span>
                  <span>{count} st ({percent.toFixed(1)}%)</span>
                </div>
                <div className="bar-container">
                  <div className="bar-fill" style={{ width: `${percent}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Shareholders */}
      <div className="top-shareholders">
        <h3>Största aktieägare (Top 10)</h3>
        <table className="shareholders-table">
          <thead>
            <tr>
              <th>Namn</th>
              <th>Aktier</th>
              <th>Ägarandel</th>
              <th>Typ</th>
              <th>Kontakt</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_SHAREHOLDERS
              .sort((a, b) => b.shares - a.shares)
              .slice(0, 10)
              .map(sh => (
                <tr key={sh.id} onClick={() => setSelectedShareholder(sh)} style={{ cursor: 'pointer' }}>
                  <td><strong>{sh.name}</strong></td>
                  <td>{sh.shares.toLocaleString('sv-SE')}</td>
                  <td>{sh.ownershipPercent}%</td>
                  <td><span className={`type-badge type-${sh.investorType.toLowerCase().replace(/\s/g, '-')}`}>{sh.investorType}</span></td>
                  <td>
                    {sh.optInEmail && <span className="contact-badge">✉️</span>}
                    {sh.optInSMS && <span className="contact-badge">📱</span>}
                    {sh.linkedInProfile && <span className="contact-badge">💼</span>}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAllShareholders = () => (
    <div className="all-shareholders">
      <div className="filters">
        <input 
          type="text"
          placeholder="Sök aktieägare..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="filter-select">
          <option value="all">Alla typer</option>
          <option value="Founder">Grundare</option>
          <option value="Institutional">Institutionell</option>
          <option value="Business Angel">Business Angel</option>
          <option value="Employee">Anställd</option>
          <option value="Retail">Retail</option>
        </select>
      </div>

      <table className="shareholders-table">
        <thead>
          <tr>
            <th>Namn</th>
            <th>Email</th>
            <th>Telefon</th>
            <th>Aktier</th>
            <th>Ägarandel</th>
            <th>Typ</th>
            <th>Förvärv</th>
            <th>Kontakt</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filteredShareholders.map(sh => (
            <tr key={sh.id}>
              <td><strong>{sh.name}</strong></td>
              <td>{sh.email}</td>
              <td>{sh.phone || '—'}</td>
              <td>{sh.shares.toLocaleString('sv-SE')}</td>
              <td>{sh.ownershipPercent}%</td>
              <td><span className={`type-badge type-${sh.investorType.toLowerCase().replace(/\s/g, '-')}`}>{sh.investorType}</span></td>
              <td>{sh.acquisitionDate}</td>
              <td>
                {sh.optInEmail && <span className="contact-badge" title="Email opt-in">✉️</span>}
                {sh.optInSMS && <span className="contact-badge" title="SMS opt-in">📱</span>}
                {sh.linkedInProfile && <span className="contact-badge" title="LinkedIn">💼</span>}
              </td>
              <td>
                <button className="btn-secondary btn-small" onClick={() => setSelectedShareholder(sh)}>
                  Visa detaljer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="table-footer">
        Visar {filteredShareholders.length} av {totalShareholders} aktieägare
      </div>
    </div>
  );

  const renderImport = () => (
    <div className="import-section">
      <h2>Importera aktieägare</h2>
      <p className="section-description">Importera aktieägare från olika källor. I produktionsversionen kommer detta att synkroniseras automatiskt med Euroclear och andra depåer.</p>

      <div className="import-methods">
        <div className="import-card">
          <div className="import-icon">📄</div>
          <h3>CSV/Excel-import</h3>
          <p>Ladda upp en fil med aktieägare från er bokföring eller depå.</p>
          <button className="btn-primary">Välj fil</button>
          <p className="import-note">Format: Namn, Email, Telefon, Aktier, Förvärvsdatum</p>
        </div>

        <div className="import-card">
          <div className="import-icon">🔗</div>
          <h3>Euroclear API (Coming soon)</h3>
          <p>Automatisk synkronisering med Euroclear Sverige för VP-konto.</p>
          <button className="btn-secondary" disabled>Konfigurera</button>
        </div>

        <div className="import-card">
          <div className="import-icon">📧</div>
          <h3>Nyhetsbrev-prenumeranter</h3>
          <p>Importera opt-in kontakter från er webbplats eller IR-system.</p>
          <button className="btn-primary">Välj fil</button>
          <p className="import-note">{MOCK_NEWSLETTER_SUBSCRIBERS.length} prenumeranter i systemet</p>
        </div>

        <div className="import-card">
          <div className="import-icon">🔄</div>
          <h3>Synkronisera till Brevo</h3>
          <p>Exportera kontakter till Brevo för email-kampanjer.</p>
          <button className="btn-primary" onClick={handleSyncToBrevo} disabled={syncing}>
            {syncing ? 'Synkroniserar...' : 'Synkronisera nu'}
          </button>
          <p className="import-note">Senaste synk: {lastSync || 'Aldrig'}</p>
        </div>
      </div>

      <div className="info-box">
        <strong>Demo-läge:</strong> I denna version arbetar vi med mock-data. I produktion kommer detta att integreras med:
        <ul>
          <li>Euroclear Sverige API för VP-konton</li>
          <li>Avstämningsregister från Bolagsverket</li>
          <li>Er befintliga aktiebok-system</li>
          <li>CRM-system (Brevo, HubSpot)</li>
        </ul>
      </div>
    </div>
  );

  const renderShareholderDetail = () => {
    if (!selectedShareholder) return null;

    return (
      <div className="shareholder-detail-modal" onClick={() => setSelectedShareholder(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{selectedShareholder.name}</h2>
            <button className="close-button" onClick={() => setSelectedShareholder(null)}>✕</button>
          </div>

          <div className="detail-section">
            <h3>Kontaktinformation</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <strong>Email:</strong> {selectedShareholder.email}
              </div>
              <div className="detail-item">
                <strong>Telefon:</strong> {selectedShareholder.phone || 'Ej angiven'}
              </div>
              <div className="detail-item">
                <strong>LinkedIn:</strong> 
                {selectedShareholder.linkedInProfile ? (
                  <a href={selectedShareholder.linkedInProfile} target="_blank" rel="noopener noreferrer">Visa profil</a>
                ) : ' Ej angiven'}
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Aktieinnehav</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <strong>Antal aktier:</strong> {selectedShareholder.shares.toLocaleString('sv-SE')}
              </div>
              <div className="detail-item">
                <strong>Ägarandel:</strong> {selectedShareholder.ownershipPercent}%
              </div>
              <div className="detail-item">
                <strong>Förvärvsdatum:</strong> {selectedShareholder.acquisitionDate}
              </div>
              <div className="detail-item">
                <strong>Investerartyp:</strong> <span className={`type-badge type-${selectedShareholder.investorType.toLowerCase().replace(/\s/g, '-')}`}>{selectedShareholder.investorType}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Kommunikationsinställningar</h3>
            <div className="opt-in-status">
              <div className={`opt-in-item ${selectedShareholder.optInEmail ? 'active' : 'inactive'}`}>
                <span className="opt-in-icon">✉️</span>
                <span>Email: {selectedShareholder.optInEmail ? 'Opt-in' : 'Opt-out'}</span>
              </div>
              <div className={`opt-in-item ${selectedShareholder.optInSMS ? 'active' : 'inactive'}`}>
                <span className="opt-in-icon">📱</span>
                <span>SMS: {selectedShareholder.optInSMS ? 'Opt-in' : 'Opt-out'}</span>
              </div>
              <div className={`opt-in-item ${selectedShareholder.linkedInProfile ? 'active' : 'inactive'}`}>
                <span className="opt-in-icon">💼</span>
                <span>LinkedIn: {selectedShareholder.linkedInProfile ? 'Tillgänglig' : 'Ej tillgänglig'}</span>
              </div>
            </div>
          </div>

          {selectedShareholder.notes && (
            <div className="detail-section">
              <h3>Anteckningar</h3>
              <p>{selectedShareholder.notes}</p>
            </div>
          )}

          <div className="modal-actions">
            <button className="btn-primary">Skicka meddelande</button>
            <button className="btn-secondary">Redigera</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="aktiebok-module">
      <div className="module-header">
        <button className="back-button" onClick={onBack}>← Tillbaka</button>
        <h1>📊 Aktiebok</h1>
      </div>

      <div className="module-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Översikt
        </button>
        <button 
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Alla aktieägare
        </button>
        <button 
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Import & Synk
        </button>
      </div>

      <div className="module-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'all' && renderAllShareholders()}
        {activeTab === 'import' && renderImport()}
      </div>

      {selectedShareholder && renderShareholderDetail()}
    </div>
  );
}

export default Aktiebok;
