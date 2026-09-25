import { useState } from 'react';
import { useAppConfig } from '../context/AppConfigContext.jsx';
import { LANGUAGES, t, useI18n } from '../i18n/index.jsx';
import { setAnalyst, getAnalyst } from '../utils/analyst.js';
import { TILE_STYLES } from '../mapTiles.js';
import BrandMark from './BrandMark.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import './Welcome.css';

const STEPS = ['Dil', 'Harita', 'API', 'Analist'];

/**
 * İlk kurulum sihirbazı. Harita sağlayıcısı seçilene kadar gösterilir;
 * seçim yapıldığında bir daha çıkmaz (Ayarlar'dan değiştirilebilir).
 */
export default function Welcome() {
  const { lang, setLang } = useI18n();
  const {
    setMapProvider,
    setTileStyle,
    setTileKey,
    setGoogleMapsApiKey,
    googleMapsApiKey,
    tileKeys,
  } = useAppConfig();
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState('osm');
  const [gKey, setGKey] = useState('');
  const [mtKey, setMtKey] = useState(tileKeys?.maptiler ?? '');
  const [analyst, setAnalystDraft] = useState(getAnalyst());

  const needsKey =
    choice === 'google' ? 'google' : TILE_STYLES[choice]?.needsKey ?? null;

  const options = [
    ...['osm', 'osm-dark', 'esri-sat', 'maptiler-satellite'].map((key) => ({
      key,
      ...TILE_STYLES[key],
    })),
    {
      key: 'google',
      label: 'Google Maps',
      desc: t('Zengin yer bilgisi (puan, saat, telefon). API anahtarı gerekir.'),
      needsKey: 'google',
    },
  ];

  const finish = async () => {
    if (analyst.trim()) setAnalyst(analyst);
    if (gKey.trim()) setGoogleMapsApiKey(gKey);
    if (mtKey.trim()) setTileKey('maptiler', mtKey);
    if (choice === 'google') {
      await setMapProvider('google');
    } else {
      setTileStyle(choice);
      await setMapProvider('osm');
    }
  };

  const next = () => {
    if (step === 1 && !needsKey) setStep(3);
    else setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => {
    if (step === 3 && !needsKey) setStep(1);
    else setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div className="welcome">
      <aside className="welcome-side">
        <BrandMark size="lg" showWord={false} />
        <div className="welcome-side-text">
          <p>{t('Soruşturma ve istihbarat analiz masası')}</p>
        </div>
      </aside>

      <main className="welcome-main">
        <div className="welcome-top">
          <ol className="stepper">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={`${i === step ? 'current' : ''} ${i < step ? 'done' : ''} ${
                  i === 2 && !needsKey ? 'skipped' : ''
                }`}
              >
                {i + 1}. {t(s)}
              </li>
            ))}
          </ol>
          <ThemeToggle />
        </div>

        <div className="welcome-panel">
          {step === 0 && (
            <>
              <h1>{t('Dil seçin')}</h1>
              <p className="welcome-lead">{t('Arayüz ve raporlar bu dilde olur. Sonradan Ayarlar’dan değiştirilebilir.')}</p>
              <div className="choice-grid two">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    className={`choice-card ${lang === l.key ? 'active' : ''}`}
                    onClick={() => setLang(l.key)}
                  >
                    <b>{l.label}</b>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1>{t('Harita katmanı')}</h1>
              <p className="welcome-lead">{t('Konumlar bu harita üzerinde gösterilir. Anahtarsız seçenekler hemen çalışır.')}</p>
              <div className="choice-grid">
                {options.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    className={`choice-card ${choice === o.key ? 'active' : ''}`}
                    onClick={() => setChoice(o.key)}
                  >
                    <div className="choice-head">
                      <b>{o.label}</b>
                      {o.recommended && <span className="tag-rec">{t('Önerilen')}</span>}
                      {o.needsKey && <span className="tag-key">{t('API gerekir')}</span>}
                    </div>
                    <span className="choice-desc">{o.desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1>{t('API anahtarı')}</h1>
              <p className="welcome-lead">
                {t('İsterseniz şimdi girin, isterseniz atlayın. Anahtar yalnızca bu tarayıcıda saklanır.')}
              </p>
              {needsKey === 'google' && (
                <div className="field">
                  <label htmlFor="wz-g">{t('Google Maps JavaScript API anahtarı')}</label>
                  <input
                    id="wz-g"
                    type="password"
                    autoFocus
                    value={gKey}
                    onChange={(e) => setGKey(e.target.value)}
                    placeholder={googleMapsApiKey ? t('Anahtar zaten tanımlı') : 'AIza…'}
                  />
                </div>
              )}
              {needsKey === 'maptiler' && (
                <div className="field">
                  <label htmlFor="wz-mt">{t('MapTiler API anahtarı')}</label>
                  <input
                    id="wz-mt"
                    type="password"
                    autoFocus
                    value={mtKey}
                    onChange={(e) => setMtKey(e.target.value)}
                  />
                </div>
              )}
              <p className="set-hint">
                {t('Anahtar girilmezse harita ücretsiz OpenStreetMap ile açılır.')}
              </p>
            </>
          )}

          {step === 3 && (
            <>
              <h1>{t('Analist')}</h1>
              <p className="welcome-lead">
                {t('Bu cihazda çalışan analistin adı. İşlem kaydına ve delil teslim zincirine otomatik yazılır.')}
              </p>
              <div className="field">
                <label htmlFor="wz-an">{t('Ad soyad / sicil no')}</label>
                <input
                  id="wz-an"
                  autoFocus
                  value={analyst}
                  onChange={(e) => setAnalystDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && finish()}
                />
              </div>
            </>
          )}
        </div>

        <div className="welcome-actions">
          {step > 0 ? (
            <button type="button" className="btn btn-ghost" onClick={back}>
              {t('Geri')}
            </button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn btn-primary" onClick={next}>
              {step === 2 && !gKey.trim() && !mtKey.trim() ? t('Atla') : t('Devam')} →
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={finish}>
              {t('Başla')} →
            </button>
          )}
        </div>
        <div className="welcome-footer">{t('Yalnızca yerel · Veriler bu cihazdan çıkmaz')}</div>
      </main>
    </div>
  );
}
