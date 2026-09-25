import { BRAND } from '../brand.js';
import { t } from '../i18n/index.jsx';

/** Logo + yazı. size: 'rail' | 'sm' | 'lg' */
export default function BrandMark({ size = 'sm', showWord = true, showTagline = false }) {
  return (
    <div className={`brandmark brandmark-${size}`}>
      <img
        className="brandmark-logo"
        src={size === 'lg' ? BRAND.logoLarge : BRAND.logoSmall}
        alt={BRAND.name}
        draggable={false}
      />
      {showWord && (
        <div className="brandmark-text">
          <div className="brandmark-word">
            <span className="w1">{BRAND.word1}</span>
            <span className="w2">{BRAND.word2}</span>
          </div>
          {showTagline && <div className="brandmark-tagline">{t(BRAND.tagline)}</div>}
        </div>
      )}
    </div>
  );
}
