import { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import { passwordStrength } from '../utils/crypto.js';
import { getAnalyst, setAnalyst } from '../utils/analyst.js';
import {
  isAutoSnapshotEnabled,
  setAutoSnapshotEnabled,
  removeRecent,
} from '../utils/recentProjects.js';
import { t } from '../i18n/index.jsx';

const STRENGTH = ['Çok zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü'];

export default function SecurityModal({ onClose }) {
  const { project, isEncrypted, setPassword, removePassword } = useProject();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [analyst, setAnalystDraft] = useState(getAnalyst());
  const [autoSnap, setAutoSnap] = useState(isAutoSnapshotEnabled());

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const strength = passwordStrength(pw);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setDone('');
    if (pw.length < 10) {
      setError(t('Parola en az 10 karakter olmalı.'));
      return;
    }
    if (pw !== pw2) {
      setError(t('Parolalar eşleşmiyor.'));
      return;
    }
    setBusy(true);
    try {
      await setPassword(pw);
      setPw('');
      setPw2('');
      setDone(
        isEncrypted
          ? t('Parola değiştirildi. Bir sonraki kayıtta yeni parola kullanılacak.')
          : t('Dosya şifrelendi. Kaydettiğinizde .case.enc.json olarak inecek.'),
      );
    } catch (err) {
      setError(err?.message ?? t('Parola ayarlanamadı.'));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = () => {
    if (
      !confirm(
        t(
          'Şifreleme kaldırılsın mı? Bundan sonraki kayıtlar ve otomatik kurtarma kaydı düz metin olarak yazılacak.'
        ),
      )
    )
      return;
    removePassword();
    setDone(t('Şifreleme kaldırıldı.'));
  };

  const saveDevice = () => {
    setAnalyst(analyst);
    setAutoSnapshotEnabled(autoSnap);
    if (!autoSnap && project?.id) removeRecent(project.id);
    setDone(t('Cihaz ayarları kaydedildi.'));
  };

  return (
    <div className="modal-backdrop" onMouseDown={() => !busy && onClose()}>
      <div className="modal modal-wide security-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{t('Şifreleme ve cihaz ayarları')}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Kapat')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <section className="sec-section">
          <div className="sec-status-row">
            <span className={`status-pill ${isEncrypted ? 'ok' : 'warn'}`}>
              {isEncrypted ? t('ŞİFRELİ') : t('ŞİFRESİZ')}
            </span>
            <span className="sec-status-text">
              {isEncrypted
                ? t('Dosya kaydı ve otomatik kurtarma kaydı AES-256-GCM ile şifreleniyor.')
                : t(
                'Dosya ve bu tarayıcıdaki kurtarma kaydı düz metin. Hassas dosyalarda parola koyun.'
              )}
            </span>
          </div>

          <form onSubmit={handleSetPassword} className="sec-form">
            <div className="field-row">
              <div className="field">
                <label htmlFor="sec-pw">{isEncrypted ? t('Yeni parola') : t('Dosya parolası')}</label>
                <input
                  id="sec-pw"
                  type="password"
                  autoComplete="new-password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="sec-pw2">{t('Parola (tekrar)')}</label>
                <input
                  id="sec-pw2"
                  type="password"
                  autoComplete="new-password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                />
              </div>
            </div>
            {pw && (
              <div className="strength">
                <div className="strength-bar">
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className={i < strength ? `on s${strength}` : ''} />
                  ))}
                </div>
                <span className="strength-label">{t(STRENGTH[strength])}</span>
              </div>
            )}
            <p className="settings-hint">{t(
                'Anahtar PBKDF2-SHA256 (600.000 tur) ile paroladan türetilir. Parola hiçbir yerde saklanmaz;'
              )}{' '}<strong>{t('unutulursa dosya kurtarılamaz.')}</strong>
            </p>
            <div className="sec-actions">
              {isEncrypted && (
                <button type="button" className="btn btn-ghost danger" onClick={handleRemove}>{t('Şifrelemeyi kaldır')}</button>
              )}
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? t('Anahtar türetiliyor…') : isEncrypted ? t('Parolayı değiştir') : t('Dosyayı şifrele')}
              </button>
            </div>
          </form>
        </section>

        <hr className="settings-divider" />

        <section className="sec-section">
          <div className="field">
            <label htmlFor="sec-analyst">{t('Bu cihazdaki analist')}</label>
            <input
              id="sec-analyst"
              value={analyst}
              onChange={(e) => setAnalystDraft(e.target.value)}
              placeholder={t('Ad soyad / sicil no')}
            />
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={autoSnap}
              onChange={(e) => setAutoSnap(e.target.checked)}
            />
            <span>
              <strong>{t('Otomatik kurtarma kaydı tut')}</strong>
              <span className="check-hint">{t(
                'Kaydetmeden çıkarsanız dosya bu tarayıcıdan geri açılabilir. Şifreli dosyalarda kayıt da şifreli tutulur. Kapatırsanız bu dosyanın kurtarma kaydı silinir.'
              )}</span>
            </span>
          </label>
          <div className="sec-actions">
            <button type="button" className="btn btn-secondary" onClick={saveDevice}>{t('Cihaz ayarlarını kaydet')}</button>
          </div>
        </section>

        {error && <div className="form-error">{error}</div>}
        {done && <div className="form-ok">{done}</div>}
      </div>
    </div>
  );
}
