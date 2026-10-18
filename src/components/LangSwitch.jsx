import { LANGUAGES, useI18n } from '../i18n/index.jsx';

/** TR | EN anahtarı */
export default function LangSwitch({ compact = false }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`lang-switch ${compact ? 'compact' : ''}`} role="group" aria-label="Dil / Language">
      {LANGUAGES.map((l) => (
        <button
          key={l.key}
          type="button"
          className={lang === l.key ? 'active' : ''}
          onClick={() => setLang(l.key)}
          title={l.label}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
