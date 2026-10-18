import { useState } from 'react';
import { useAppConfig } from '../context/AppConfigContext.jsx';
import { APP_CONFIG_PATH_HINT } from '../utils/appConfig.js';
import './MapsKeySetup.css';
import { t } from '../i18n/index.jsx';

export default function MapsKeySetup({ compact = false, onSaved }) {
  const { setGoogleMapsApiKey, googleMapsApiKeySource, setMapProvider } =
    useAppConfig();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleUseOSM = async () => {
    await setMapProvider('osm');
    onSaved?.();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError(t('Önce Google Maps API anahtarını yapıştırın.'));
      return;
    }
    setGoogleMapsApiKey(trimmed);
    setValue('');
    setError('');
    onSaved?.();
  };

  return (
    <div className={`maps-setup ${compact ? 'compact' : ''}`}>
      <div className="maps-setup-card">
        <div className="maps-setup-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <h2>{t('Google Maps bağla')}</h2>
        <p className="maps-setup-sub">{t(
          'Harita için Google Maps JavaScript API anahtarı gerekir. Anahtar bu cihazda kalır; hiçbir yere gönderilmez, dosyalara yazılmaz.'
        )}</p>

        <form onSubmit={handleSubmit} className="maps-setup-form">
          <label htmlFor="gmaps-key">{t('Google Maps API anahtarı')}</label>
          <input
            id="gmaps-key"
            type="text"
            autoComplete="off"
            spellCheck="false"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('AIza...')}
          />
          {error && <div className="maps-setup-error">{error}</div>}
          <div className="maps-setup-actions">
            <button type="submit" className="btn btn-primary">{t('Anahtarı kaydet')}</button>
          </div>
        </form>

        <div className="maps-setup-divider"><span>{t('ya da')}</span></div>

        {/* Escape hatch for users who don't want to deal with Google Cloud
            at all — one click switches the provider to OpenStreetMap. */}
        <button
          type="button"
          className="btn btn-secondary maps-setup-osm"
          onClick={handleUseOSM}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
          </svg>{t('OpenStreetMap kullan (anahtar gerekmez)')}</button>

        <div className="maps-setup-alt">
          <p>{t('Dosyadan ayarlamak için')}{' '}<code>{t('public/app.config.example.json')}</code>{' '}{t('dosyasını')}{' '}
            <code>{APP_CONFIG_PATH_HINT}</code>{' '}{t('olarak kopyalayıp anahtarı')}{' '}
            <code>{t('googleMaps.apiKey')}</code>{' '}{t('altına yazın. Uygulama bir sonraki açılışta okur.')}</p>
        </div>

        {googleMapsApiKeySource && (
          <div className="maps-setup-status">{t('Anahtarın kaynağı:')}{' '}<strong>{googleMapsApiKeySource}</strong>
          </div>
        )}

        <details className="maps-setup-help">
          <summary>{t('API anahtarı nasıl alınır?')}</summary>
          <ol>
            <li><strong>{t('Google Cloud Console')}</strong>{t('\'da bir proje oluşturun ya da seçin.')}</li>
            <li><strong>{t('Maps JavaScript API')}</strong>{t('\'yi (yer bilgisi otomatik dolsun isterseniz')}{' '}<strong>{t('Places API')}</strong>{t('\'yi de) etkinleştirin.')}</li>
            <li><strong>{t('APIs & Services → Credentials')}</strong>{' '}{t('altında API anahtarı oluşturun.')}</li>
            <li>{t('Güvenlik için anahtarı')}{' '}<code>{t('http://localhost')}</code>{' '}{t('ve kullandığınız diğer adreslerle sınırlandırın.')}</li>
          </ol>
          <p className="maps-setup-warning">{t(
            'Kullanım Google hesabınızın ücretsiz kotası ve fiyatlandırmasına göre faturalanır. Anahtarı mutlaka kısıtlayın.'
          )}</p>
        </details>
      </div>
    </div>
  );
}
