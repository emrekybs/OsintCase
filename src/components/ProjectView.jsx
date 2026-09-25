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

const TABS = [
  { key: 'info', label: 'Ağ' },
  { key: 'map', label: 'Harita' },
  { key: 'timeline', label: 'Kronoloji' },
  { key: 'evidence', label: 'Deliller' },
  { key: 'audit', label: 'Kayıt' },
];

// Bu derece ve üstü şifresiz kaydedilirken uyarı verilir.
const SENSITIVE = new Set(['ozel', 'gizli', 'cok-gizli']);

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
            <BrandMark size="rail" />
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
                <span className="rail-label">{t(tb.label)}</span>
                {counts[tb.key] > 0 && <span className="rail-count">{counts[tb.key]}</span>}
              </button>
            ))}
          </div>
          <div className="rail-spacer" />
          <div className="rail-group rail-bottom">
            <button type="button" className="rail-btn" onClick={() => setShowReport(true)}>
              <span className="rail-label">{t('Rapor')}</span>
            </button>
            <button type="button" className="rail-btn" onClick={() => setShowSettings(true)}>
              <span className="rail-label">{t('Ayarlar')}</span>
            </button>
            <button
              type="button"
              className="rail-btn"
              onClick={closeProject}
              title={t('Dosyalara dön')}
              aria-label={t('Dosyalara dön')}
            >
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
              {ci.caseNumber && <span className="pv-case-no mono">{ci.caseNumber}</span>}
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
                {isEncrypted ? t('Şifreli') : t('Şifresiz')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCase(true)}>
                {t('Künye')}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saveState === 'saving'}>
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

          <footer className="statusbar">
            <span className="sb-item">
              <span className="sb-key">{t('Analist')}:</span> {analyst}
            </span>
            <span className={`sb-item ${isEncrypted ? 'ok' : 'warn'}`}>
              <span className="sb-dot" /> {isEncrypted ? t('Şifreli (AES-256-GCM)') : t('Şifresiz')}
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
