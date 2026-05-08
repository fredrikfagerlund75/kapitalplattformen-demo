import React from 'react';
import './EmissionProgress.css';

const STAGES = [
  { id: 'kapitalrådgivaren', label: 'Kapitalrådgivaren' },
  { id: 'projektvy',         label: 'Projektvy' },
  { id: 'prospekt',          label: 'IM / Prospekt' },
  { id: 'teckning',          label: 'Teckning' },
];
const STAGE_IDS = STAGES.map(s => s.id);

function CheckIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function EmissionProgress({ currentView, aktivtProjekt, onNavigate }) {
  const currentIndex = STAGE_IDS.indexOf(currentView);
  const projectModuleIndex = aktivtProjekt
    ? STAGE_IDS.indexOf(aktivtProjekt.currentModule)
    : -1;
  const highestReached = Math.max(currentIndex, projectModuleIndex);

  function getStatus(index) {
    if (index < currentIndex) return 'done';
    if (index === currentIndex) return 'current';
    if (index <= highestReached) return 'reachable';
    return 'upcoming';
  }

  function handleClick(index, status) {
    if (status === 'done' || status === 'reachable') {
      onNavigate(STAGE_IDS[index], aktivtProjekt);
    }
  }

  const currentStage = STAGES[currentIndex];

  return (
    <nav className="ep-wrap" aria-label="Projektsteg">
      {/* Desktop: Chevron pills */}
      <div className="ep-chev" role="list">
        {STAGES.map((stage, i) => {
          const status = getStatus(i);
          const isDone = status === 'done';
          const isCurrent = status === 'current';
          const isClickable = isDone || status === 'reachable';

          return (
            <div
              key={stage.id}
              role="listitem"
              className={`ep-step ep-${status}`}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={() => handleClick(i, status)}
              onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') handleClick(i, status); } : undefined}
              tabIndex={isClickable ? 0 : undefined}
            >
              {isDone ? (
                <span className="ep-check"><CheckIcon /></span>
              ) : (
                <span className="ep-num">{i + 1}</span>
              )}
              {stage.label}
            </div>
          );
        })}
      </div>

      {/* Mobile: compact chip */}
      {currentStage && (
        <span className="ep-mobile-chip" aria-current="step">
          Steg {currentIndex + 1}/{STAGES.length} · {currentStage.label}
        </span>
      )}
    </nav>
  );
}

export { STAGE_IDS };
