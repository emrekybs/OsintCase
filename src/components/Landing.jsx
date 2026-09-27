import { useCallback, useEffect, useRef, useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import {
  loadRecents,
  removeRecent,
  hasUnsavedChanges,
} from '../utils/recentProjects.js';
import { getAnalyst, setAnalyst } from '../utils/analyst.js';
import {
  CLASSIFICATIONS,
  DEFAULT_CLASSIFICATION,
  PRIORITIES,
  getClassification,
  suggestCaseNumber,
  fmtDate,
} from '../caseModel.js';
import { t } from '../i18n/index.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import BrandMark from './BrandMark.jsx';
import LangSwitch from './LangSwitch.jsx';
import SettingsModal from './SettingsModal.jsx';
import PasswordPrompt from './PasswordPrompt.jsx';
import './Landing.css';

function relativeTime(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 45) return t('az önce');
  const m = Math.floor(s / 60);
  if (m < 60) return t('{0} dk önce', { 0: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('{0} sa önce', { 0: h });
  const d = Math.floor(h / 24);
  if (d < 7) return t('{0} gün önce', { 0: d });
  return fmtDate(iso);
}

const EMPTY_FORM = () => ({
  name: '',
  caseNumber: suggestCaseNumber(),
  targetName: '',
  investigator: getAnalyst(),
  unit: '',
  classification: DEFAULT_CLASSIFICATION,
  priority: 'orta',
});

export default function Landing() {
  const {
    newProject,
    openProjectFromFile,
    openEncryptedFile,
    openProjectFromSnapshot,
  } = useProject();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [recents, setRecents] = useState([]);
  const [pwRequest, setPwRequest] = useState(null);
  const [analyst, setAnalystState] = useState(getAnalyst());
  const [editingAnalyst, setEditingAnalyst] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef(null);

  const refresh = useCallback(() => {
    loadRecents().then(setRecents);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleResume = async (entry) => {
    setError('');
    if (entry.encrypted) {
      setPwRequest({
        title: t('Şifreli kurtarma kaydı'),
        subtitle: t('Bu kurtarma kaydı dosya parolasıyla şifrelenmiş. Devam etmek için parolayı girin.'),
        submit: (pw) => openProjectFromSnapshot(entry, pw),
      });
      return;
    }
    try {
      await openProjectFromSnapshot(entry);
    } catch (err) {
      setError(t('Kayıt açılamadı: {0}', { 0: err.message }));
    }
  };

  const handleRemoveRecent = async (e, id) => {
    e.stopPropagation();
    if (!confirm(t('Bu kurtarma kaydı bu tarayıcıdan silinsin mi? Diskteki dosyalar etkilenmez.')))
      return;
    setRecents(await removeRecent(id));
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(t('Dosya adı zorunlu.'));
      return;
    }
    if (form.investigator.trim() && !getAnalyst()) setAnalyst(form.investigator);
    newProject(form);
  };

  const handleOpenClick = () => {
    setError('');
    fileInputRef.current?.click();
  };

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const res = await openProjectFromFile(file);
      if (res?.needsPassword) {
        setPwRequest({
          title: t('Şifreli dosya'),
          subtitle: t('{0} parolayla şifrelenmiş.', { 0: file.name }),
          submit: (pw) => openEncryptedFile(res.envelope, pw, file.name),
        });
      }
    } catch (err) {
      setError(t('Dosya açılamadı: {0}', { 0: err.message }));
    }
  };

  const openNew = () => {
    setForm(EMPTY_FORM());
    setError('');
    setShowNew(true);
  };

  return (
    <div className="landing">
      <aside className="landing-side">
        <BrandMark size="lg" showWord={false} />
        <p className="landing-side-tag">{t('Soruşturma ve istihbarat analiz masası')}</p>
        <ul className="side-facts">
          <li>{t('Sunucusuz, veriler bu cihazdan çıkmaz')}</li>
          <li>{t('AES-256-GCM dosya şifreleme')}</li>
          <li>{t('SHA-256 delil bütünlüğü')}</li>
        </ul>
      </aside>

      <section className="landing-main">
        <header className="landing-topbar">
          <div className="landing-analyst">
            <span className="landing-analyst-label">{t('Analist')}</span>
            {editingAnalyst ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setAnalyst(analyst);
                  setEditingAnalyst(false);
                }}
              >
                <input
                  autoFocus
                  value={analyst}
                  onChange={(e) => setAnalystState(e.target.value)}
                  onBlur={() => {
                    setAnalyst(analyst);
                    setEditingAnalyst(false);
                  }}
                  placeholder={t('Ad soyad / sicil no')}
                />
              </form>
            ) : (
              <button type="button" className="landing-analyst-name" onClick={() => setEditingAnalyst(true)}>
                {analyst || t('Tanımlanmadı (düzenlemek için tıklayın)')}
              </button>
            )}
          </div>
          <div className="landing-top-right">
            <LangSwitch />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowSettings(true)}>
              {t('Ayarlar')}
            </button>
            <ThemeToggle />
          </div>
        </header>

        <div className="landing-body">
          <h1 className="landing-title">{t('Soruşturma dosyaları')}</h1>

          <div className="landing-tiles">
            <button className="landing-tile primary" onClick={openNew}>
              <span className="tile-text">
                <b>{t('Yeni dosya')}</b>
                <span>{t('Künye, gizlilik derecesi ve hedefle yeni soruşturma aç')}</span>
              </span>
            </button>
            <button className="landing-tile" onClick={handleOpenClick}>
              <span className="tile-text">
                <b>{t('Dosya aç')}</b>
                <span>{t('.case.json ya da şifreli .case.enc.json')}</span>
              </span>
            </button>
          </div>

          <div className="landing-recents">
            <div className="landing-recents-header">
              <span>{t('Kaldığın yerden devam et')}</span>
              <span className="count-pill">{recents.length}</span>
            </div>
            {recents.length === 0 ? (
              <div className="landing-recents-empty">
                {t('Henüz kayıt yok. Açtığınız dosyalar kaydetmeseniz bile burada görünür.')}
              </div>
            ) : (
              <ul className="landing-recents-list">
                {recents.map((r) => {
                  const unsaved = hasUnsavedChanges(r);
                  const cls = r.classification ? getClassification(r.classification) : null;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="landing-recent-item"
                        onClick={() => handleResume(r)}
                        title={r.encrypted ? t('Şifreli kayıt, parola gerekir') : r.name}
                      >
                        <div className="landing-recent-body">
                          <div className="landing-recent-name">
                            {r.caseNumber && <span className="mono landing-recent-no">{r.caseNumber}</span>}
                            {r.encrypted ? t('Şifreli dosya') : r.name}
                          </div>
                          <div className="landing-recent-meta">
                            {r.encrypted && <span className="enc-tag">{t('Şifreli')}</span>}
                            {t('Düzenleme')} {relativeTime(r.snapshotAt)}
                            {unsaved && <span className="landing-recent-unsaved">· {t('kaydedilmedi')}</span>}
                            {!r.encrypted && <span className="landing-recent-plain">· {t('şifresiz')}</span>}
                          </div>
                        </div>
                        {cls && (
                          <span className="mini-class" style={{ background: cls.color, color: cls.text }}>
                            {cls.label}
                          </span>
                        )}
                        <span
                          className="landing-recent-remove"
                          role="button"
                          tabIndex={0}
                          aria-label={t('Kurtarma kaydını sil')}
                          title={t('Kurtarma kaydını sil')}
                          onClick={(e) => handleRemoveRecent(e, r.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') handleRemoveRecent(e, r.id);
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {error && !showNew && <div className="landing-error">{error}</div>}

          {/* display:none kullanılmıyor: Firefox görünmeyen input için dosya
              seçiciyi açmıyor. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChosen}
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
              overflow: 'hidden',
            }}
          />
        </div>

        <footer className="landing-footer">
          {t('Yalnızca yerel · Veriler bu cihazdan çıkmaz')}
        </footer>
      </section>

      {showNew && (
        <div className="modal-backdrop" onMouseDown={() => setShowNew(false)}>
          <form
            className="modal modal-wide"
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
          >
            <h2>{t('Soruşturma dosyası aç')}</h2>
            <p className="modal-sub">{t('Künye bilgileri sonradan da düzenlenebilir.')}</p>

            <div className="field-row">
              <div className="field grow2">
                <label htmlFor="project-name">{t('Dosya adı')}</label>
                <input
                  id="project-name"
                  autoFocus
                  value={form.name}
                  onChange={set('name')}
                  placeholder={t('ör. Kuzey Hattı Operasyonu')}
                />
              </div>
              <div className="field">
                <label htmlFor="case-no">{t('Dosya no')}</label>
                <input id="case-no" className="mono" value={form.caseNumber} onChange={set('caseNumber')} />
              </div>
            </div>

            <div className="field">
              <label>{t('Gizlilik derecesi')}</label>
              <div className="seg-picker">
                {CLASSIFICATIONS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`seg-option ${form.classification === c.key ? 'selected' : ''}`}
                    style={
                      form.classification === c.key
                        ? { background: c.color, color: c.text, borderColor: c.color }
                        : undefined
                    }
                    onClick={() => setForm((f) => ({ ...f, classification: c.key }))}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="target-name">
                  {t('Ana hedef')} <span className="label-optional">({t('isteğe bağlı')})</span>
                </label>
                <input id="target-name" value={form.targetName} onChange={set('targetName')} placeholder={t('ör. Ad Soyad / kod adı')} />
              </div>
              <div className="field">
                <label htmlFor="new-prio">{t('Öncelik')}</label>
                <select id="new-prio" value={form.priority} onChange={set('priority')}>
                  {PRIORITIES.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="new-inv">{t('Soruşturmacı')}</label>
                <input id="new-inv" value={form.investigator} onChange={set('investigator')} />
              </div>
              <div className="field">
                <label htmlFor="new-unit">{t('Birim')}</label>
                <input id="new-unit" value={form.unit} onChange={set('unit')} />
              </div>
            </div>

            {error && <div className="landing-error">{error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowNew(false)}>
                {t('Vazgeç')}
              </button>
              <button type="submit" className="btn btn-primary">
                {t('Dosyayı aç')}
              </button>
            </div>
          </form>
        </div>
      )}

      {pwRequest && (
        <PasswordPrompt
          title={pwRequest.title}
          subtitle={pwRequest.subtitle}
          onClose={() => setPwRequest(null)}
          onSubmit={async (pw) => {
            await pwRequest.submit(pw);
          }}
        />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
