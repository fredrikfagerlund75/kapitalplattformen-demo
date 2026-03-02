import React from 'react';

function CapitalAdvisor({ user, onBack }) {
  return (
    <div className="module-container">
      <div className="module-header">
        <button className="back-button" onClick={onBack}>← Tillbaka</button>
        <h1>🎯 Kapitalrådgivaren</h1>
      </div>

      <div className="module-content">
        <div className="coming-soon-content">
          <div className="coming-soon-icon">🚧</div>
          <h2>Kommer snart</h2>
          <p>Kapitalrådgivaren är under utveckling och kommer att erbjuda:</p>
          
          <div className="feature-list">
            <div className="feature-item">
              <span className="feature-icon">💡</span>
              <div>
                <h4>AI-driven strategirådgivning</h4>
                <p>Få rekommendationer om rätt kapitalanskaffningsstrategi baserat på er situation</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <div>
                <h4>Värderingsanalys</h4>
                <p>Estimera rimlig värdering och emissionsstorlek för er bransch och fas</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <div>
                <h4>Investerarmatchning</h4>
                <p>Identifiera rätt typ av investerare (VC, PE, business angels, crowdfunding)</p>
              </div>
            </div>
            
            <div className="feature-item">
              <span className="feature-icon">📈</span>
              <div>
                <h4>Tidsplanering</h4>
                <p>Optimera timing för kapitalanskaffning baserat på marknadscykler</p>
              </div>
            </div>
          </div>
          
          <div className="notify-box">
            <p>Vill du bli notifierad när funktionen lanseras?</p>
            <button className="btn-primary">Anmäl intresse</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CapitalAdvisor;
