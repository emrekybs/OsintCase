import { useState } from 'react';
import { t, useI18n, LANGUAGES } from '../i18n/index.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  useUiPrefs,
  FONT_MIN,
  FONT_MAX,
  FONT_STEP,
  GRAPH_SIZES,
} from '../context/UiPrefsContext.jsx';
import { useNodeHistory } from '../context/NodeHistoryContext.jsx';
import { runAction } from '../utils/actions.js';
import BrandMark from './BrandMark.jsx';
import LangSwitch from './LangSwitch.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import './Ribbon.css';

const RIBBON_TABS = [
  { key: 'file', label: 'Dosya' },
  { key: 'graph', label: 'Ağ' },
  { key: 'view', label: 'Görünüm' },
  { key: 'report', label: 'Rapor' },
  { key: 'settings', label: 'Ayarlar' },
];

const VIEWS = [
  { key: 'info', label: 'Ağ' },
  { key: 'map', label: 'Harita' },
  { key: 'timeline', label: 'Kronoloji' },
  { key: 'evidence', label: 'Deliller' },
  { key: 'audit', label: 'Kayıt' },
];

function Group({ title, children }) {
  return (
    <div className="rb-group">
      <div className="rb-group-body">{children}</div>
      <div className="rb-group-title">{t(title)}</div>
    </div>
  );
}

function Big({ label, sub, onClick, disabled, primary, active, title }) {
  return (
    <button
      type="button"
      className={`rb-btn big ${primary ? 'primary' : ''} ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      <span className="rb-label">{t(label)}</span>
      {sub && <span className="rb-sub">{sub}</span>}
    </button>
  );
}

function Small({ label, onClick, disabled, title }) {
  return (
    <button type="button" className="rb-btn small" onClick={onClick} disabled={disabled} title={title}>
      {t(label)}
    </button>
  );
}

function FontControl() {
  const { fontScale, setFontScale, bumpFont, resetFont } = useUiPrefs();
  return (
    <div className="rb-font">
      <div className="rb-font-row">
        <button
          type="button"
          className="rb-btn small sq"
          onClick={() => bumpFont(-FONT_STEP)}
          disabled={fontScale <= FONT_MIN + 0.001}
          title={t('Yazıyı küçült')}
          aria-label={t('Yazıyı küçült')}
        >
          A−
        </button>
        <input
          type="range"
          min={FONT_MIN}
          max={FONT_MAX}
          step={FONT_STEP}
          value={fontScale}
          onChange={(e) => setFontScale(parseFloat(e.target.value))}
          aria-label={t('Yazı boyutu')}
        />
        <button
          type="button"
          className="rb-btn small sq"
          onClick={() => bumpFont(FONT_STEP)}
          disabled={fontScale >= FONT_MAX - 0.001}
          title={t('Yazıyı büyüt')}
          aria-label={t('Yazıyı büyüt')}
        >
          A+
        </button>
        <button type="button" className="rb-btn small pct mono" onClick={resetFont} title={t('Varsayılana dön')}>
          {Math.round(fontScale * 100)}%
        </button>
      </div>
    </div>
  );
}

/**
 * Maltego tarzı sekmeli üst bar. Komutlar sekmelere göre gruplanır;
 * altındaki şerit açık dosyanın bölümleri (ağ, harita, kronoloji…) arasında geçer.
 */
export default function Ribbon({
  project,
  caseInfo,
  tab,
  setTab,
  counts,
  isEncrypted,
  saveState,
  onSave,
  onCase,
  onSecurity,
  onReport,
  onSettings,
  onClose,
}) {
  const [rtab, setRtab] = useState('graph');
  const { undo, redo, canUndo, canRedo } = useNodeHistory();
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useI18n();
  const { graphLabel, setGraphLabel } = useUiPrefs();

  // Ağ komutları: önce ağ görünümüne geç, sonra komutu gönder.
  const graph = (name) => () => {
    if (tab !== 'info') {
      setTab('info');
      setTimeout(() => runAction(name), 80);
    } else {
      runAction(name);
    }
  };

  const saveLabel =
    saveState === 'saving' ? 'Kaydediliyor…' : saveState === 'saved' ? 'Kaydedildi' : 'Kaydet';

  return (
    <div className="ribbon">
      <div className="rb-top">
        <button type="button" className="rb-brand" onClick={onClose} title={t('Dosyalara dön')}>
          <BrandMark size="rail" showWord={false} />
        </button>
        <button type="button" className="rb-case" onClick={onCase} title={t('Künyeyi düzenle')}>
          {caseInfo.caseNumber && <span className="rb-case-no mono">{caseInfo.caseNumber}</span>}
          <span className="rb-case-name">{project.name}</span>
        </button>
        <div className="rb-tabs" role="tablist">
          {RIBBON_TABS.map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={rtab === r.key}
              className={`rb-tab ${rtab === r.key ? 'on' : ''}`}
              onClick={() => setRtab(r.key)}
            >
              {t(r.label)}
            </button>
          ))}
        </div>
        <div className="rb-top-right">
          <button
            type="button"
            className={`lock-btn ${isEncrypted ? 'on' : 'off'}`}
            onClick={onSecurity}
            title={isEncrypted ? t('Şifreli: güvenlik ayarları') : t('Şifresiz: parola belirle')}
          >
            {isEncrypted ? t('Şifreli') : t('Şifresiz')}
          </button>
          <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saveState === 'saving'}>
            {t(saveLabel)}
          </button>
          <span className="pv-sep" />
          <LangSwitch compact />
          <ThemeToggle />
        </div>
      </div>

      <div className="rb-panel" role="tabpanel">
        {rtab === 'file' && (
          <>
            <Group title="Dosya">
              <Big label={saveLabel} primary onClick={onSave} disabled={saveState === 'saving'} />
              <Big label="Dosyalara dön" onClick={onClose} />
            </Group>
            <Group title="Künye">
              <Big label="Künyeyi düzenle" onClick={onCase} />
              <Big
                label="Güvenlik"
                sub={isEncrypted ? t('Şifreli') : t('Şifresiz')}
                onClick={onSecurity}
              />
            </Group>
            <Group title="Çıktı">
              <Big label="Rapor oluştur" onClick={onReport} />
            </Group>
          </>
        )}

        {rtab === 'graph' && (
          <>
            <Group title="Düğüm">
              <Big label="Ekle" primary onClick={graph('add')} />
              <div className="rb-stack">
                <Small label="Kopyala" onClick={graph('copy')} />
                <Small label="Yapıştır" onClick={graph('paste')} />
                <Small label="Çoğalt" onClick={graph('duplicate')} />
              </div>
              <Big label="Sil" onClick={graph('delete')} />
            </Group>
            <Group title="Geçmiş">
              <Big label="Geri al" onClick={undo} disabled={!canUndo} />
              <Big label="Yinele" onClick={redo} disabled={!canRedo} />
            </Group>
            <Group title="Seçim">
              <div className="rb-stack">
                <Small label="Tümünü seç" onClick={graph('selectAll')} />
                <Small label="Seçimi kaldır" onClick={graph('selectNone')} />
                <Small label="Ters çevir" onClick={graph('invert')} />
              </div>
              <Big label="Komşuları seç" onClick={graph('neighbors')} />
            </Group>
            <Group title="Analiz">
              <Big label="Yerleşim" onClick={graph('layout')} />
              <Big label="En kısa yol" onClick={graph('path')} />
              <Big label="Merkezilik" onClick={graph('degree')} />
            </Group>
            <Group title="Yakınlık">
              <div className="rb-stack">
                <Small label="Yakınlaştır" onClick={graph('zoomIn')} />
                <Small label="Uzaklaştır" onClick={graph('zoomOut')} />
                <Small label="%100" onClick={graph('zoom100')} />
              </div>
              <Big label="Sığdır" onClick={graph('fit')} />
            </Group>
            <Group title="Dışa aktar">
              <Big label="PNG" onClick={graph('png')} />
              <Big label="SVG" onClick={graph('svg')} />
            </Group>
          </>
        )}

        {rtab === 'view' && (
          <>
            <Group title="Bölümler">
              {VIEWS.map((v) => (
                <Big
                  key={v.key}
                  label={v.label}
                  sub={counts[v.key] > 0 ? String(counts[v.key]) : ''}
                  active={tab === v.key}
                  onClick={() => setTab(v.key)}
                />
              ))}
            </Group>
            <Group title="Yazı boyutu">
              <FontControl />
            </Group>
          </>
        )}

        {rtab === 'report' && (
          <>
            <Group title="Rapor">
              <Big label="Rapor oluştur" primary onClick={onReport} />
            </Group>
            <Group title="İçerik">
              <div className="rb-note">
                {t('Kapak, özet, profiller, ağ, konum, kronoloji ve deliller. PDF ya da tek dosya HTML olarak alınır.')}
              </div>
            </Group>
          </>
        )}

        {rtab === 'settings' && (
          <>
            <Group title="Yazı boyutu">
              <FontControl />
            </Group>
            <Group title="Ağ etiketi">
              {GRAPH_SIZES.map((g) => (
                <Big
                  key={g.key}
                  label={g.label}
                  active={graphLabel === g.key}
                  onClick={() => setGraphLabel(g.key)}
                />
              ))}
            </Group>
            <Group title="Tema">
              <Big label="Açık tema" active={theme === 'light'} onClick={() => setTheme('light')} />
              <Big label="Koyu tema" active={theme === 'dark'} onClick={() => setTheme('dark')} />
            </Group>
            <Group title="Dil">
              {LANGUAGES.map((l) => (
                <Big key={l.key} label={l.label} active={lang === l.key} onClick={() => setLang(l.key)} />
              ))}
            </Group>
            <Group title="Uygulama">
              <Big label="Tüm ayarlar" sub={t('Harita, API, veri')} onClick={onSettings} />
            </Group>
          </>
        )}
      </div>

      <div className="rb-views" role="tablist" aria-label={t('Bölümler')}>
        {VIEWS.map((v) => (
          <button
            key={v.key}
            role="tab"
            aria-selected={tab === v.key}
            className={`rb-view ${tab === v.key ? 'on' : ''}`}
            onClick={() => setTab(v.key)}
          >
            {t(v.label)}
            {counts[v.key] > 0 && <span className="rb-view-count mono">{counts[v.key]}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
