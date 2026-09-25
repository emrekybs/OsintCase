import { useEffect, useState } from 'react';
import { useAppConfig } from '../context/AppConfigContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { LANGUAGES, t, useI18n } from '../i18n/index.jsx';
import { getAnalyst, setAnalyst } from '../utils/analyst.js';
import {
  isAutoSnapshotEnabled,
  setAutoSnapshotEnabled,
} from '../utils/recentProjects.js';
import { DEFAULT_TILE_STYLE, TILE_STYLES } from '../mapTiles.js';
import { APP_CONFIG_PATH_HINT } from '../utils/appConfig.js';
import ClearAllDataButton from './ClearAllDataButton.jsx';
import './SettingsModal.css';

const SECTIONS = [
  { key: 'general', label: 'Genel', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
  { key: 'map', label: 'Harita ve API', icon: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14' },
  { key: 'data', label: 'Veri', icon: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3' },
];

function maskKey(key) {
  if (!key) return '—';
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

/** Tek merkezli ayarlar: dil, tema, analist, harita sağlayıcısı, API anahtarları. */
export default function SettingsModal({ onClose, initialSection = 'general' }) {
  const [section, setSection] = useState(initialSection);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal settings-modal" onMouseDown={(e) => e.stopPropagation()}>
        <aside className="settings-nav">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`settings-nav-btn ${section === s.key ? 'active' : ''}`}
              onClick={() => setSection(s.key)}
            >
              {t(s.label)}
            </button>
          ))}
        </aside>
        <div className="settings-body">
          <button type="button" className="icon-btn settings-close" onClick={onClose} aria-label={t('Kapat')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          {section === 'general' && <GeneralSection />}
          {section === 'map' && <MapSection />}
          {section === 'data' && <DataSection />}
        </div>
      </div>
    </div>
  );
}

function GeneralSection() {
  const { lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const [analyst, setAnalystDraft] = useState(getAnalyst());
  const [autoSnap, setAutoSnap] = useState(isAutoSnapshotEnabled());
  const [saved, setSaved] = useState(false);

  return (
    <section>
      <h2>{t('Genel')}</h2>
      <div className="set-row">
        <div className="set-label">
          <b>{t('Dil')}</b>
          <span>{t('Arayüz ve rapor dili')}</span>
        </div>
        <div className="seg-picker">
          {LANGUAGES.map((l) => (
            <button
              key={l.key}
              type="button"
              className={`seg-option ${lang === l.key ? 'selected accent' : ''}`}
              onClick={() => setLang(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="set-row">
        <div className="set-label">
          <b>{t('Tema')}</b>
          <span>{t('Koyu tema sahada ve gece kullanımı için önerilir')}</span>
        </div>
        <div className="seg-picker">
          {['dark', 'light'].map((k) => (
            <button
              key={k}
              type="button"
              className={`seg-option ${theme === k ? 'selected accent' : ''}`}
              onClick={() => setTheme(k)}
            >
              {k === 'dark' ? t('Koyu tema') : t('Açık tema')}
            </button>
          ))}
        </div>
      </div>
      <div className="set-row col">
        <div className="set-label">
          <b>{t('Bu cihazdaki analist')}</b>
          <span>{t('İşlem kaydına ve teslim zincirine otomatik yazılır')}</span>
        </div>
        <div className="set-inline">
          <input
            value={analyst}
            onChange={(e) => {
              setAnalystDraft(e.target.value);
              setSaved(false);
            }}
            placeholder={t('Ad soyad / sicil no')}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setAnalyst(analyst);
              setSaved(true);
            }}
          >
            {saved ? t('Kaydedildi') : t('Kaydet')}
          </button>
        </div>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={autoSnap}
          onChange={(e) => {
            setAutoSnap(e.target.checked);
            setAutoSnapshotEnabled(e.target.checked);
          }}
        />
        <span>
          <strong>{t('Otomatik kurtarma kaydı tut')}</strong>
          <span className="check-hint">
            {t('Kaydetmeden çıkarsanız dosya bu tarayıcıdan geri açılabilir. Şifreli dosyalarda kayıt da şifreli tutulur.')}
          </span>
        </span>
      </label>
    </section>
  );
}

function MapSection() {
  const {
    mapProvider,
    setMapProvider,
    tileStyle,
    setTileStyle,
    tileKeys,
    setTileKey,
    googleMapsApiKey,
    googleMapsApiKeySource,
    setGoogleMapsApiKey,
    clearGoogleMapsApiKey,
    googleMapsMapId,
    setGoogleMapsMapId,
  } = useAppConfig();
  const current = mapProvider === 'google' ? 'google' : tileStyle ?? DEFAULT_TILE_STYLE;
  const [gKey, setGKey] = useState('');
  const [mapId, setMapId] = useState(googleMapsMapId ?? '');
  const [mtKey, setMtKey] = useState(tileKeys.maptiler ?? '');
  const [msg, setMsg] = useState('');

  const choose = async (key) => {
    setMsg('');
    if (key === 'google') {
      await setMapProvider('google');
      return;
    }
    const style = TILE_STYLES[key];
    if (style.needsKey && !tileKeys[style.needsKey]) {
      setMsg(t('Bu katman için önce aşağıya MapTiler API anahtarını girin.'));
    }
    setTileStyle(key);
    if (mapProvider !== 'osm') await setMapProvider('osm');
  };

  const options = [
    ...Object.entries(TILE_STYLES).map(([key, s]) => ({
      key,
      label: s.label,
      desc: s.desc,
      recommended: s.recommended,
      needsKey: !!s.needsKey,
      hasKey: s.needsKey ? !!tileKeys[s.needsKey] : true,
    })),
    {
      key: 'google',
      label: 'Google Maps',
      desc: t('Zengin yer bilgisi (puan, saat, telefon). API anahtarı gerekir.'),
      needsKey: true,
      hasKey: !!googleMapsApiKey,
    },
  ];

  return (
    <section>
      <h2>{t('Harita ve API')}</h2>
      <p className="set-hint">
        {t('Anahtarlar yalnızca bu tarayıcıda saklanır; dosyalara yazılmaz, hiçbir yere gönderilmez.')}
      </p>

      <div className="set-subtitle">{t('Harita katmanı')}</div>
      <div className="provider-grid">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            className={`provider-card ${current === o.key ? 'active' : ''}`}
            onClick={() => choose(o.key)}
          >
            <div className="provider-card-head">
              <b>{o.label}</b>
              {o.recommended && <span className="tag-rec">{t('Önerilen')}</span>}
              {o.needsKey && (
                <span className={`tag-key ${o.hasKey ? 'ok' : ''}`}>
                  {o.hasKey ? t('Anahtar var') : t('API gerekir')}
                </span>
              )}
            </div>
            <span className="provider-card-desc">{o.desc}</span>
          </button>
        ))}
      </div>
      {msg && <div className="form-error">{msg}</div>}

      <div className="set-subtitle">{t('API anahtarları')}</div>

      <div className="api-block">
        <div className="api-head">
          <b>MapTiler</b>
          <span className="mono dim">{maskKey(tileKeys.maptiler)}</span>
          <a href="https://cloud.maptiler.com/account/keys/" target="_blank" rel="noreferrer">
            {t('Anahtar al')} ↗
          </a>
        </div>
        <div className="set-inline">
          <input
            type="password"
            autoComplete="off"
            value={mtKey}
            onChange={(e) => setMtKey(e.target.value)}
            placeholder={t('MapTiler API anahtarı')}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setTileKey('maptiler', mtKey);
              setMsg('');
            }}
          >
            {t('Kaydet')}
          </button>
        </div>
      </div>

      <div className="api-block">
        <div className="api-head">
          <b>Google Maps</b>
          <span className="mono dim">
            {maskKey(googleMapsApiKey)}
            {googleMapsApiKeySource ? ` · ${googleMapsApiKeySource}` : ''}
          </span>
          <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noreferrer">
            {t('Anahtar al')} ↗
          </a>
        </div>
        <div className="set-inline">
          <input
            type="password"
            autoComplete="off"
            value={gKey}
            onChange={(e) => setGKey(e.target.value)}
            placeholder={t('Google Maps JavaScript API anahtarı')}
          />
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!gKey.trim()}
            onClick={() => {
              setGoogleMapsApiKey(gKey);
              setGKey('');
            }}
          >
            {t('Kaydet')}
          </button>
          {googleMapsApiKey && (
            <button
              type="button"
              className="btn btn-ghost danger"
              onClick={() => {
                if (confirm(t('Kayıtlı Google Maps API anahtarı bu tarayıcıdan silinsin mi?'))) clearGoogleMapsApiKey();
              }}
            >
              {t('Sil')}
            </button>
          )}
        </div>
        <div className="set-inline">
          <input
            value={mapId}
            onChange={(e) => setMapId(e.target.value)}
            placeholder={t('Map ID (isteğe bağlı, özel stil için)')}
          />
          <button type="button" className="btn btn-secondary" onClick={() => setGoogleMapsMapId(mapId)}>
            {t('Kaydet')}
          </button>
        </div>
        <p className="set-hint">
          {t('Maps JavaScript API, Places API ve Geocoding API etkin olmalı. Anahtarı HTTP referrer ile kısıtlayın.')}{' '}
          {t('Dosyadan ayarlamak için:')} <code>{APP_CONFIG_PATH_HINT}</code>
        </p>
      </div>
    </section>
  );
}

function DataSection() {
  return (
    <section>
      <h2>{t('Veri')}</h2>
      <p className="set-hint">
        {t('Sunucu yok, analitik yok. Dosyalar yalnızca sizin kaydettiğiniz yerde durur; tarayıcıda yalnızca ayarlar ve (isteğe bağlı) kurtarma kayıtları tutulur.')}
      </p>
      <div className="danger-zone">
        <ClearAllDataButton />
      </div>
    </section>
  );
}
