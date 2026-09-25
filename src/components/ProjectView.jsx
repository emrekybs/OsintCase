import { useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import { NavigationProvider, useNavigation } from '../context/NavigationContext.jsx';
import { NodeHistoryProvider } from '../context/NodeHistoryContext.jsx';
import {
  CASE_STATUSES,
  PRIORITIES,
  findOption,
  getClassification,
} from '../caseModel.js';
import ThemeToggle from './ThemeToggle.jsx';
import InfoTab from './InfoTab.jsx';
import MapTab from './MapTab.jsx';
import TimelineTab from './TimelineTab.jsx';
import EvidenceTab from './EvidenceTab.jsx';
import AuditTab from './AuditTab.jsx';
import ClassificationBanner from './ClassificationBanner.jsx';
import CaseInfoModal from './CaseInfoModal.jsx';
import SecurityModal from './SecurityModal.jsx';
import ReportView from './ReportView.jsx';
import './ProjectView.css';

const TABS = [
  { key: 'info', label: 'Ağ' },
  { key: 'map', label: 'Harita' },
  { key: 'timeline', label: 'Kronoloji' },
  { key: 'evidence', label: 'Deliller' },
  { key: 'audit', label: 'Kayıt' },
];

// Bu derece ve üstü şifresiz kaydedilirken uyarı verilir.
const SENSITIVE = new Set(['ozel', 'gizli', 'cok-gizli']);

export default function ProjectView() {
  return (
    <NavigationProvider>
      <NodeHistoryProvider>
        <ProjectViewInner />
      </NodeHistoryProvider>
    </NavigationProvider>
  );
}

function ProjectViewInner() {
  const { project, saveProject, closeProject, isEncrypted } = useProject();
  const { tab, setTab } = useNavigation();
  const [showCase, setShowCase] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [saveState, setSaveState] = useState('');

  const ci = project.caseInfo ?? {};
  const status = findOption(CASE_STATUSES, ci.status);
  const priority = findOption(PRIORITIES, ci.priority);
  const cls = getClassification(project.classification);

  const counts = {
    info: project.identifiers?.length ?? 0,
    map: project.locations?.length ?? 0,
    timeline: project.events?.length ?? 0,
    evidence: project.evidence?.length ?? 0,
    audit: project.auditLog?.length ?? 0,
  };

  const handleSave = async () => {
    if (!isEncrypted && SENSITIVE.has(project.classification)) {
      const ok = confirm(
        `Bu dosya "${cls.label}" derecesinde ama ŞİFRESİZ kaydedilecek.\n\n` +
          'Şifrelemek için İptal deyip kilit simgesinden parola belirleyin. Yine de şifresiz kaydedilsin mi?',
      );
      if (!ok) return;
    }
    setSaveState('saving');
    try {
      await saveProject();
      setSaveState('saved');
      setTimeout(() => setSaveState(''), 1800);
    } catch (err) {
      setSaveState('');
      alert(`Kaydedilemedi: ${err.message}`);
    }
  };

  const bannerExtra = [ci.caseNumber, isEncrypted ? 'ŞİFRELİ' : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="project-view">
      <ClassificationBanner classification={project.classification} extra={bannerExtra} />
      <header className="project-topbar">
        <div className="topbar-left">
          <button
            className="icon-btn"
            onClick={closeProject}
            title="Dosyalara dön"
            aria-label="Dosyalara dön"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            className="project-title"
            onClick={() => setShowCase(true)}
            title="Künyeyi düzenle"
          >
            <div className="project-name">
              {ci.caseNumber && <span className="case-no mono">{ci.caseNumber}</span>}
              {project.name}
            </div>
            <div className="project-meta">
              {status && (
                <span className="meta-chip">
                  <span className="dot" style={{ background: status.color }} />
                  {status.label}
                </span>
              )}
              {priority && (
                <span className="meta-chip">
                  <span className="dot" style={{ background: priority.color }} />
                  Öncelik: {priority.label}
                </span>
              )}
              {project.target?.name && (
                <span className="meta-chip">Hedef: {project.target.name}</span>
              )}
            </div>
          </button>
        </div>

        <nav className="tab-switcher" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`tab-button ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {counts[t.key] > 0 && <span className="tab-count">{counts[t.key]}</span>}
            </button>
          ))}
        </nav>

        <div className="topbar-right">
          <button
            type="button"
            className={`lock-btn ${isEncrypted ? 'on' : 'off'}`}
            onClick={() => setShowSecurity(true)}
            title={isEncrypted ? 'Şifreli — güvenlik ayarları' : 'Şifresiz — parola belirle'}
          >
            {isEncrypted ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>
            )}
            {isEncrypted ? 'Şifreli' : 'Şifresiz'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCase(true)}>
            Künye
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowReport(true)}>
            Rapor
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleSave} disabled={saveState === 'saving'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
            {saveState === 'saving' ? 'Kaydediliyor…' : saveState === 'saved' ? 'Kaydedildi' : 'Kaydet'}
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="project-main">
        {/* Ağ ve Harita sekmeleri açık kalır (CSS ile gizlenir); böylece
            harita görünümü ve grafik durumu sekme değiştirince kaybolmaz. */}
        <div className="tab-pane" role="tabpanel" aria-hidden={tab !== 'info'} hidden={tab !== 'info'}>
          <InfoTab />
        </div>
        <div className="tab-pane" role="tabpanel" aria-hidden={tab !== 'map'} hidden={tab !== 'map'}>
          <MapTab visible={tab === 'map'} />
        </div>
        {tab === 'timeline' && (
          <div className="tab-pane" role="tabpanel">
            <TimelineTab />
          </div>
        )}
        {tab === 'evidence' && (
          <div className="tab-pane" role="tabpanel">
            <EvidenceTab />
          </div>
        )}
        {tab === 'audit' && (
          <div className="tab-pane" role="tabpanel">
            <AuditTab />
          </div>
        )}
      </main>
      <ClassificationBanner classification={project.classification} className="bottom" />

      {showCase && <CaseInfoModal onClose={() => setShowCase(false)} />}
      {showSecurity && <SecurityModal onClose={() => setShowSecurity(false)} />}
      {showReport && <ReportView onClose={() => setShowReport(false)} />}
    </div>
  );
}
