import { useState } from 'react';
import { clearAllSavedData, CLEAR_ALL_SUMMARY } from '../utils/clearAllData.js';
import './ClearAllDataButton.css';
import { t } from '../i18n/index.jsx';

/**
 * Destructive "wipe everything in localStorage" action. Owns its own
 * confirm modal because the action is irreversible and the native
 * `confirm()` dialog can't show a formatted bullet list of what gets
 * removed. After the wipe we reload so all React state restarts cleanly
 * from the now-empty config (which kicks the user back to the welcome
 * screen, just like a true fresh install).
 *
 * Renders compactly so it slots into either the Map settings overlay or
 * the Landing footer.
 */
export default function ClearAllDataButton({ variant = 'block' }) {
  const [confirming, setConfirming] = useState(false);
  // Default off — clearing the API key is a more committed action than
  // wiping settings/recents (it forces re-setup or a switch to OSM), so
  // the user has to opt into it explicitly.
  const [alsoClearApiKey, setAlsoClearApiKey] = useState(false);

  const handleConfirm = async () => {
    await clearAllSavedData({ overrideFileGoogleConfig: alsoClearApiKey });
    // Hard reload so AppConfig / Theme / Project context all re-init from
    // an empty localStorage. React state-only resets won't cut it because
    // the welcome-screen gate is checked at mount.
    window.location.reload();
  };

  return (
    <>
      <div className={`clear-all ${variant}`}>
        {variant === 'block' && (
          <div className="clear-all-label">{t('Bu tarayıcıyı sıfırla')}</div>
        )}
        <button
          type="button"
          className={
            variant === 'inline'
              ? 'clear-all-link'
              : 'btn btn-danger clear-all-btn'
          }
          onClick={() => setConfirming(true)}
        >{t('Tüm yerel verileri sil')}</button>
        {variant === 'block' && (
          <p className="clear-all-hint">{t(
            'Ayarları, özel simgeleri ve kurtarma kayıtlarını bu tarayıcıdan siler. Diskteki dosyalar etkilenmez.'
          )}</p>
        )}
      </div>

      {confirming && (
        <div
          className="modal-backdrop"
          onClick={() => setConfirming(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('Tüm yerel veriler silinsin mi?')}</h2>
            <p className="modal-sub">{t('Bu tarayıcıda uygulamaya ait her şey silinir:')}</p>
            <ul className="clear-all-list">
              {CLEAR_ALL_SUMMARY.map((line) => (
                <li key={line}>{t(line)}</li>
              ))}
            </ul>

            <label className="clear-all-checkbox">
              <input
                type="checkbox"
                checked={alsoClearApiKey}
                onChange={(e) => setAlsoClearApiKey(e.target.checked)}
              />
              <span>
                <strong>{t('Google Maps API anahtarını da temizle')}</strong>
                <span className="clear-all-checkbox-hint">
                  <code>{t('public/app.config.json')}</code>{' '}{t(
                    'içindeki anahtarı gizler. Dosyanın kendisine dokunmaz; kalıcı silmek için dosyayı elle kaldırın.'
                  )}</span>
              </span>
            </label>

            <p className="modal-sub">{t('Diske kaydettiğiniz dosyalar (')}<code>{t('*.case.json')}</code>,{' '}
              <code>{t('*.case.enc.json')}</code>{t(') etkilenmez.')}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirming(false)}
              >{t('Vazgeç')}</button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirm}
              >{t('Evet, hepsini sil')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
