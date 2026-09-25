import { useState } from 'react';
import { useAppConfig } from '../context/AppConfigContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import './Welcome.css';

/**
 * First-run chooser. Shown whenever the user has never picked a map provider,
 * regardless of whether an API key is already configured — a Docker user with
 * a key in .env still gets to choose OpenStreetMap vs Google Maps. Picking
 * either option writes `map.provider` to localStorage, so this screen won't
 * appear again. If Google is picked and a key already exists, the key-entry
 * step is skipped entirely.
 */
export default function Welcome() {
  const { setMapProvider, setGoogleMapsApiKey, googleMapsApiKey } =
    useAppConfig();
  // 'choose' = picking provider; 'google-key' = entering the optional key.
  const [step, setStep] = useState('choose');
  const [apiKey, setApiKey] = useState('');

  // A key can already be present before the user ever picks a provider —
  // e.g. a Docker run generates public/app.config.json from .env, or a power
  // user edited the config file by hand. In that case there's nothing to ask.
  const hasExistingKey = !!googleMapsApiKey;

  const pickOSM = async () => {
    await setMapProvider('osm');
  };

  const pickGoogle = async () => {
    if (hasExistingKey) {
      // Key already set up — skip the entry step and go straight into the app.
      await setMapProvider('google');
    } else {
      setStep('google-key');
    }
  };

  const continueWithGoogle = async () => {
    const trimmed = apiKey.trim();
    if (trimmed) setGoogleMapsApiKey(trimmed);
    await setMapProvider('google');
  };

  return (
    <div className="welcome">
      <div className="welcome-topbar">
        <ThemeToggle />
      </div>

      <div className="welcome-content">
        <div className="welcome-brand">
          <div className="welcome-logo">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <h1 className="welcome-title">Hoş geldiniz</h1>
          <p className="welcome-sub">
            Harita sağlayıcısını seçin. Sonradan Harita sekmesindeki dişli
            simgesinden değiştirebilirsiniz.
          </p>
        </div>

        {step === 'choose' && (
          <div className="welcome-cards">
            <button
              type="button"
              className="welcome-card"
              onClick={pickOSM}
            >
              <div className="welcome-card-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />
                </svg>
              </div>
              <div className="welcome-card-title">OpenStreetMap</div>
              <div className="welcome-card-desc">
                Ücretsiz, kayıt gerektirmez. Hemen çalışır.
              </div>
            </button>

            <button
              type="button"
              className="welcome-card"
              onClick={pickGoogle}
            >
              <div className="welcome-card-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="welcome-card-title">Google Maps</div>
              <div className="welcome-card-desc">
                Daha zengin yer bilgisi (puan, saat, telefon).{' '}
                {hasExistingKey ? 'Anahtar zaten tanımlı.' : 'API anahtarı gerekir.'}
              </div>
              <span className="welcome-card-tag">
                {hasExistingKey ? 'Anahtar bulundu' : 'Önerilen'}
              </span>
            </button>
          </div>
        )}

        {step === 'google-key' && (
          <form
            className="welcome-key-form"
            onSubmit={(e) => {
              e.preventDefault();
              continueWithGoogle();
            }}
          >
            <div className="field">
              <label htmlFor="welcome-api-key">
                Google Maps API anahtarı{' '}
                <span className="welcome-optional">(isteğe bağlı)</span>
              </label>
              <input
                id="welcome-api-key"
                type="password"
                autoFocus
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy…"
              />
              <p className="welcome-help">
                İsterseniz şimdilik atlayın; anahtarı daha sonra Harita
                sekmesine yapıştırabilirsiniz. Anahtar bu cihazda kalır.
              </p>
            </div>
            <div className="welcome-key-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep('choose')}
              >
                Geri
              </button>
              <button type="submit" className="btn btn-primary">
                {apiKey.trim() ? 'Kaydet ve devam et' : 'Şimdilik atla'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="welcome-footer">
        Yalnızca yerel · Veriler bu cihazdan çıkmaz
      </div>
    </div>
  );
}
