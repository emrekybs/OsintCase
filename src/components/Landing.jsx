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
} from '../caseModel.js';
import { BRAND } from '../brand.js';
import ThemeToggle from './ThemeToggle.jsx';
import ClearAllDataButton from './ClearAllDataButton.jsx';
import PasswordPrompt from './PasswordPrompt.jsx';
import './Landing.css';

function relativeTime(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 45) return 'az önce';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} gün önce`;
  return new Date(iso).toLocaleDateString('tr-TR');
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
        title: 'Şifreli kurtarma kaydı',
        subtitle:
          'Bu kurtarma kaydı dosya parolasıyla şifrelenmiş. Devam etmek için parolayı girin.',
        submit: (pw) => openProjectFromSnapshot(entry, pw),
      });
      return;
    }
    try {
      await openProjectFromSnapshot(entry);
    } catch (err) {
      setError(`Kayıt açılamadı: ${err.message}`);
    }
  };

  const handleRemoveRecent = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Bu kurtarma kaydı bu tarayıcıdan silinsin mi? Diskteki dosyalar etkilenmez.'))
      return;
    setRecents(await removeRecent(id));
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Dosya adı zorunlu.');
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
          title: 'Şifreli dosya',
          subtitle: `${file.name} parolayla şifrelenmiş.`,
          submit: (pw) => openEncryptedFile(res.envelope, pw, file.name),
        });
      }
    } catch (err) {
      setError(`Dosya açılamadı: ${err.message}`);
    }
  };

  const openNew = () => {
    setForm(EMPTY_FORM());
    setError('');
    setShowNew(true);
  };

  return (
    <div className="landing">
      <div className="landing-topbar">
        <div className="landing-analyst">
          <span className="landing-analyst-label">Analist</span>
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
                placeholder="Ad soyad / sicil"
              />
            </form>
          ) : (
            <button type="button" className="landing-analyst-name" onClick={() => setEditingAnalyst(true)}>
              {analyst || 'tanımlanmadı — düzenle'}
            </button>
          )}
        </div>
        <ThemeToggle />
      </div>

      <div className="landing-content">
        <div className="landing-brand">
          <div className="landing-logo">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square">
              <rect x="3" y="3" width="18" height="18" />
              <path d="M3 9h18M9 9v12" />
              <circle cx="15" cy="15" r="2.2" />
            </svg>
          </div>
          <h1 className="landing-title">{BRAND.title}</h1>
          <p className="landing-tagline">{BRAND.tagline}</p>
        </div>

        <div className="landing-actions">
          <button className="btn btn-primary landing-cta" onClick={openNew}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Yeni dosya
          </button>
          <button className="btn btn-secondary landing-cta" onClick={handleOpenClick}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            Dosya aç
          </button>
        </div>

        {recents.length > 0 && (
          <div className="landing-recents">
            <div className="landing-recents-header">Kaldığın yerden devam et</div>
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
                      title={r.encrypted ? 'Şifreli kayıt — parola gerekir' : `${r.name} dosyasını aç`}
                    >
                      <div className={`landing-recent-icon ${r.encrypted ? 'locked' : ''}`}>
                        {r.encrypted ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
                        )}
                      </div>
                      <div className="landing-recent-body">
                        <div className="landing-recent-name">
                          {r.caseNumber && <span className="mono landing-recent-no">{r.caseNumber}</span>}
                          {r.name}
                        </div>
                        <div className="landing-recent-meta">
                          {cls && (
                            <span className="mini-class" style={{ background: cls.color, color: cls.text }}>
                              {cls.label}
                            </span>
                          )}
                          Düzenleme {relativeTime(r.snapshotAt)}
                          {unsaved && <span className="landing-recent-unsaved">· kaydedilmedi</span>}
                          {!r.encrypted && <span className="landing-recent-plain">· şifresiz</span>}
                        </div>
                      </div>
                      <span
                        className="landing-recent-remove"
                        role="button"
                        tabIndex={0}
                        aria-label="Kurtarma kaydını sil"
                        title="Kurtarma kaydını sil"
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
          </div>
        )}

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

      <div className="landing-footer">
        Yalnızca yerel · Veriler bu cihazdan çıkmaz · <ClearAllDataButton variant="inline" />
      </div>

      {showNew && (
        <div className="modal-backdrop" onMouseDown={() => setShowNew(false)}>
          <form
            className="modal modal-wide"
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
          >
            <div className="modal-kicker">Yeni kayıt</div>
            <h2>Soruşturma dosyası aç</h2>
            <p className="modal-sub">Künye bilgileri sonradan da düzenlenebilir.</p>

            <div className="field-row">
              <div className="field grow2">
                <label htmlFor="project-name">Dosya adı</label>
                <input
                  id="project-name"
                  autoFocus
                  value={form.name}
                  onChange={set('name')}
                  placeholder="ör. Kuzey Hattı Operasyonu"
                />
              </div>
              <div className="field">
                <label htmlFor="case-no">Dosya no</label>
                <input id="case-no" className="mono" value={form.caseNumber} onChange={set('caseNumber')} />
              </div>
            </div>

            <div className="field">
              <label>Gizlilik derecesi</label>
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
                  Ana hedef <span className="label-optional">(isteğe bağlı)</span>
                </label>
                <input id="target-name" value={form.targetName} onChange={set('targetName')} placeholder="ör. Ad Soyad / kod adı" />
              </div>
              <div className="field">
                <label htmlFor="new-prio">Öncelik</label>
                <select id="new-prio" value={form.priority} onChange={set('priority')}>
                  {PRIORITIES.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="new-inv">Soruşturmacı</label>
                <input id="new-inv" value={form.investigator} onChange={set('investigator')} />
              </div>
              <div className="field">
                <label htmlFor="new-unit">Birim</label>
                <input id="new-unit" value={form.unit} onChange={set('unit')} />
              </div>
            </div>

            {error && <div className="landing-error">{error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowNew(false)}>
                Vazgeç
              </button>
              <button type="submit" className="btn btn-primary">
                Dosyayı aç
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
    </div>
  );
}
