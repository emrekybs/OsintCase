import { useState } from 'react';
import { useAppConfig } from '../context/AppConfigContext.jsx';
import { APP_CONFIG_PATH_HINT } from '../utils/appConfig.js';
import './MapsKeySetup.css';

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
      setError('Önce Google Maps API anahtarını yapıştırın.');
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
        <h2>Google Maps bağla</h2>
        <p className="maps-setup-sub">
          Harita için Google Maps JavaScript API anahtarı gerekir. Anahtar bu
          cihazda kalır; hiçbir yere gönderilmez, dosyalara yazılmaz.
        </p>

        <form onSubmit={handleSubmit} className="maps-setup-form">
          <label htmlFor="gmaps-key">Google Maps API anahtarı</label>
          <input
            id="gmaps-key"
            type="text"
            autoComplete="off"
            spellCheck="false"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="AIza..."
          />
          {error && <div className="maps-setup-error">{error}</div>}
          <div className="maps-setup-actions">
            <button type="submit" className="btn btn-primary">
              Anahtarı kaydet
            </button>
          </div>
        </form>

        <div className="maps-setup-divider"><span>ya da</span></div>

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
          </svg>
          OpenStreetMap kullan (anahtar gerekmez)
        </button>

        <div className="maps-setup-alt">
          <p>
            Dosyadan ayarlamak için <code>public/app.config.example.json</code> dosyasını{' '}
            <code>{APP_CONFIG_PATH_HINT}</code> olarak kopyalayıp anahtarı{' '}
            <code>googleMaps.apiKey</code> altına yazın. Uygulama bir sonraki açılışta okur.
          </p>
        </div>

        {googleMapsApiKeySource && (
          <div className="maps-setup-status">
            Anahtarın kaynağı: <strong>{googleMapsApiKeySource}</strong>
          </div>
        )}

        <details className="maps-setup-help">
          <summary>API anahtarı nasıl alınır?</summary>
          <ol>
            <li><strong>Google Cloud Console</strong>'da bir proje oluşturun ya da seçin.</li>
            <li><strong>Maps JavaScript API</strong>'yi (yer bilgisi otomatik dolsun isterseniz <strong>Places API</strong>'yi de) etkinleştirin.</li>
            <li><strong>APIs &amp; Services → Credentials</strong> altında API anahtarı oluşturun.</li>
            <li>Güvenlik için anahtarı <code>http://localhost</code> ve kullandığınız diğer adreslerle sınırlandırın.</li>
          </ol>
          <p className="maps-setup-warning">
            Kullanım Google hesabınızın ücretsiz kotası ve fiyatlandırmasına göre faturalanır. Anahtarı mutlaka kısıtlayın.
          </p>
        </details>
      </div>
    </div>
  );
}
