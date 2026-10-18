import { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import { NavigationProvider, useNavigation } from '../context/NavigationContext.jsx';
import { NodeHistoryProvider } from '../context/NodeHistoryContext.jsx';
import { getClassification } from '../caseModel.js';
import { getLocale, t } from '../i18n/index.jsx';
import { getAnalyst } from '../utils/analyst.js';
import Ribbon from './Ribbon.jsx';
import InfoTab from './InfoTab.jsx';
import MapTab from './MapTab.jsx';
import TimelineTab from './TimelineTab.jsx';
import EvidenceTab from './EvidenceTab.jsx';
import AuditTab from './AuditTab.jsx';
import CaseInfoModal from './CaseInfoModal.jsx';
import SecurityModal from './SecurityModal.jsx';
import SettingsModal from './SettingsModal.jsx';
import ReportView from './ReportView.jsx';
import './ProjectView.css';

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

  return (
    <div className="project-view">
      <Ribbon
        project={project}
        caseInfo={ci}
        tab={tab}
        setTab={setTab}
        counts={counts}
        isEncrypted={isEncrypted}
        saveState={saveState}
        onSave={handleSave}
        onCase={() => setShowCase(true)}
        onSecurity={() => setShowSecurity(true)}
        onReport={() => setShowReport(true)}
        onSettings={() => setShowSettings(true)}
        onClose={closeProject}
      />
      <div className="pv-body">
        <div className="pv-content">
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

      {showCase && <CaseInfoModal onClose={() => setShowCase(false)} />}
      {showSecurity && <SecurityModal onClose={() => setShowSecurity(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showReport && <ReportView onClose={() => setShowReport(false)} />}
    </div>
  );
}
