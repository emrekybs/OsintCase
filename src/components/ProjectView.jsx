import { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import { NavigationProvider, useNavigation } from '../context/NavigationContext.jsx';
import { NodeHistoryProvider } from '../context/NodeHistoryContext.jsx';
import {
  CASE_STATUSES,
  PRIORITIES,
  findOption,
  getClassification,
} from '../caseModel.js';
import { getLocale, t } from '../i18n/index.jsx';
import { getAnalyst } from '../utils/analyst.js';
import ThemeToggle from './ThemeToggle.jsx';
import LangSwitch from './LangSwitch.jsx';
import BrandMark from './BrandMark.jsx';
import InfoTab from './InfoTab.jsx';
import MapTab from './MapTab.jsx';
import TimelineTab from './TimelineTab.jsx';
import EvidenceTab from './EvidenceTab.jsx';
import AuditTab from './AuditTab.jsx';
import ClassificationBanner from './ClassificationBanner.jsx';
import CaseInfoModal from './CaseInfoModal.jsx';
import SecurityModal from './SecurityModal.jsx';
import SettingsModal from './SettingsModal.jsx';
import ReportView from './ReportView.jsx';
import './ProjectView.css';

const ICONS = {
  info: (
    <>
      <circle cx="6" cy="7" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8.3 7.9 10.8 16M15.9 7.6 13 15.8M8.5 7h7" />
    </>
  ),
  map: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  timeline: (
    <>
      <path d="M4 12h16" />
      <circle cx="7" cy="12" r="2" />
      <circle cx="13" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
      <path d="M7 6v4M13 14v4M19 6v4" />
    </>
  ),
  evidence: (
    <>
      <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  audit: (
    <>
      <path d="M8 4h11v16H5V7z" />
      <path d="M8 4v3H5M9 11h7M9 15h7" />
    </>
  ),
  report: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4M9 12h7M9 16h5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  back: <path d="M15 18 9 12l6-6" />,
};

const TABS = [
  { key: 'info', label: 'Ağ' },
  { key: 'map', label: 'Harita' },
  { key: 'timeline', label: 'Kronoloji' },
  { key: 'evidence', label: 'Deliller' },
  { key: 'audit', label: 'Kayıt' },
];

// Bu derece ve üstü şifresiz kaydedilirken uyarı verilir.
const SENSITIVE = new Set(['ozel', 'gizli', 'cok-gizli']);

function Icon({ name }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const off = -now.getTimezoneOffset() / 60;
  return (
    <span className="mono">
      {now.toLocaleTimeString(getLocale(), { hour12: false })} UTC{off >= 0 ? '+' : ''}
      {off}
    </span>
  );
}

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
  const [showSettings, setShowSettings] = useState(false);
  const [saveState, setSaveState] = useState('');
  const [lastSaved, setLastSaved] = useState(null);

  const ci = project.caseInfo ?? {};
  const status = findOption(CASE_STATUSES, ci.status);
  const priority = findOption(PRIORITIES, ci.priority);
  const cls = getClassification(project.classification);
  const analyst = getAnalyst() || ci.investigator || t('Belirtilmedi');

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
        t(
          'Bu dosya "{0}" derecesinde ama ŞİFRESİZ kaydedilecek.\n\nŞifrelemek için İptal deyip kilit simgesinden parola belirleyin. Yine de şifresiz kaydedilsin mi?',
          { 0: cls.label },
        ),
      );
      if (!ok) return;
    }
    setSaveState('saving');
    try {
      await saveProject();
      setSaveState('saved');
      setLastSaved(new Date());
      setTimeout(() => setSaveState(''), 1800);
    } catch (err) {
      setSaveState('');
      alert(t('Kaydedilemedi: {0}', { 0: err.message }));
    }
  };

  const bannerExtra = [ci.caseNumber, isEncrypted ? t('ŞİFRELİ') : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="project-view">
      <ClassificationBanner classification={project.classification} extra={bannerExtra} />
      <div className="pv-body">
        <nav className="rail" aria-label={t('Bölümler')}>
          <button type="button" className="rail-brand" onClick={closeProject} title={t('Dosyalara dön')}>
            <BrandMark size="rail" showWord={false} />
          </button>
          <div className="rail-group" role="tablist">
            {TABS.map((tb) => (
              <button
                key={tb.key}
                role="tab"
                aria-selected={tab === tb.key}
                className={`rail-btn ${tab === tb.key ? 'active' : ''}`}
                onClick={() => setTab(tb.key)}
              >
                <Icon name={tb.key} />
                <span className="rail-label">{t(tb.label)}</span>
                {counts[tb.key] > 0 && <span className="rail-count mono">{counts[tb.key]}</span>}
              </button>
            ))}
          </div>
          <div className="rail-spacer" />
          <div className="rail-group">
            <button type="button" className="rail-btn" onClick={() => setShowReport(true)}>
              <Icon name="report" />
              <span className="rail-label">{t('Rapor')}</span>
            </button>
            <button type="button" className="rail-btn" onClick={() => setShowSettings(true)}>
              <Icon name="settings" />
              <span className="rail-label">{t('Ayarlar')}</span>
            </button>
            <button
              type="button"
              className="rail-btn"
              onClick={closeProject}
              title={t('Dosyalara dön')}
              aria-label={t('Dosyalara dön')}
            >
              <Icon name="back" />
              <span className="rail-label">{t('Dosyalar')}</span>
            </button>
          </div>
        </nav>

        <div className="pv-content">
          <header className="pv-header">
            <button
              type="button"
              className="pv-case"
              onClick={() => setShowCase(true)}
              title={t('Künyeyi düzenle')}
            >
              <span className="pv-case-no mono">{ci.caseNumber || '—'}</span>
              <span className="pv-case-main">
                <span className="pv-case-name">{project.name}</span>
                <span className="pv-case-meta">
                  {status && (
                    <span className="meta-chip">
                      <span className="dot" style={{ background: status.color }} />
                      {status.label}
                    </span>
                  )}
                  {priority && (
                    <span className="meta-chip">
                      <span className="dot" style={{ background: priority.color }} />
                      {t('Öncelik')}: {priority.label}
                    </span>
                  )}
                  {project.target?.name && (
                    <span className="meta-chip">
                      {t('Hedef')}: {project.target.name}
                    </span>
                  )}
                </span>
              </span>
            </button>

            <div className="pv-actions">
              <button
                type="button"
                className={`lock-btn ${isEncrypted ? 'on' : 'off'}`}
                onClick={() => setShowSecurity(true)}
                title={isEncrypted ? t('Şifreli — güvenlik ayarları') : t('Şifresiz — parola belirle')}
              >
                {isEncrypted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></svg>
                )}
                {isEncrypted ? t('Şifreli') : t('Şifresiz')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCase(true)}>
                {t('Künye')}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saveState === 'saving'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <path d="M17 21v-8H7v8M7 3v5h8" />
                </svg>
                {saveState === 'saving' ? t('Kaydediliyor…') : saveState === 'saved' ? t('Kaydedildi') : t('Kaydet')}
              </button>
              <span className="pv-sep" />
              <LangSwitch compact />
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

          <footer className="statusbar mono">
            <span className="sb-item">
              <span className="sb-key">{t('ANALİST')}</span> {analyst}
            </span>
            <span className={`sb-item ${isEncrypted ? 'ok' : 'warn'}`}>
              <span className="sb-dot" /> {isEncrypted ? 'AES-256-GCM' : t('ŞİFRESİZ')}
            </span>
            <span className="sb-item">
              {counts.info} {t('tanımlayıcı')} · {project.connections?.length ?? 0} {t('bağlantı')} ·{' '}
              {counts.map} {t('konum')} · {counts.evidence} {t('delil')}
            </span>
            <span className="sb-spacer" />
            {lastSaved && (
              <span className="sb-item">
                {t('Son kayıt')} {lastSaved.toLocaleTimeString(getLocale(), { hour12: false })}
              </span>
            )}
            <span className="sb-item">
              <Clock />
            </span>
          </footer>
        </div>
      </div>
      <ClassificationBanner classification={project.classification} className="bottom" />

      {showCase && <CaseInfoModal onClose={() => setShowCase(false)} />}
      {showSecurity && <SecurityModal onClose={() => setShowSecurity(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showReport && <ReportView onClose={() => setShowReport(false)} />}
    </div>
  );
}
