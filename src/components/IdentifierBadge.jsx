import { getTypeDef, resolveIconSrc, PERSON_TYPES } from '../identifierTypes.js';
import {
  BUILT_IN_ICONS,
  TYPE_DEFAULT_ICON,
  getBuiltInSrc,
} from '../identifierIcons.js';
import { TYPE_GLYPHS } from '../typeGlyphs.js';
import { useCustomIcons } from '../context/CustomIconsContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const SIZE_PRESETS = {
  sm: { box: 24, font: 10 },
  md: { box: 28, font: 11 },
  lg: { box: 36, font: 13 },
  node: { box: 46, font: 16 },
  xl: { box: 56, font: 22 },
};

export function pickTextColor(bgHex) {
  const hex = bgHex.replace('#', '');
  const full = hex.length === 3
    ? hex.split('').map((c) => c + c).join('')
    : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 165 ? '#1d1d1f' : '#ffffff';
}

function TypeMark({ typeKey, customIconId, box, font, theme, customIcons, label }) {
  const def = getTypeDef(typeKey);
  const iconSrc = resolveIconSrc(
    { typeKey, customIconId },
    customIcons,
    BUILT_IN_ICONS,
    TYPE_DEFAULT_ICON,
    getBuiltInSrc,
    theme,
  );

  if (iconSrc) {
    return (
      <img
        src={iconSrc}
        className="identifier-badge-image"
        style={{ width: box, height: box }}
        alt=""
        aria-label={label ?? def.label}
        draggable={false}
        decoding="sync"
      />
    );
  }

  const fg = pickTextColor(def.color);
  const glyph = TYPE_GLYPHS[typeKey];
  return (
    <span
      className="identifier-badge"
      style={{
        width: box,
        height: box,
        fontSize: font,
        background: def.color,
        color: fg,
      }}
      aria-label={label ?? def.label}
    >
      {glyph ? (
        <svg
          viewBox="0 0 24 24"
          width={Math.round(box * 0.62)}
          height={Math.round(box * 0.62)}
          fill={glyph.kind === 'fill' ? fg : 'none'}
          stroke={glyph.kind === 'stroke' ? fg : 'none'}
          strokeWidth={glyph.kind === 'stroke' ? 2 : undefined}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: glyph.body }}
        />
      ) : (
        def.glyph
      )}
    </span>
  );
}

/**
 * Tanımlayıcı rozeti. `photo` verilirse (ana fotoğraf) yuvarlatılmış kare
 * avatar çizilir; kişi dışı türlerde köşeye küçük tür işareti eklenir.
 */
export default function IdentifierBadge({ typeKey, customIconId, size = 'md', photo }) {
  const { icons: customIcons } = useCustomIcons();
  const { theme } = useTheme();
  const dim = SIZE_PRESETS[size] ?? SIZE_PRESETS.md;
  const def = getTypeDef(typeKey);

  if (photo?.dataUrl) {
    const showCorner = !PERSON_TYPES.has(typeKey);
    const mini = Math.max(12, Math.round(dim.box * 0.46));
    return (
      <span
        className="identifier-avatar"
        style={{ width: dim.box, height: dim.box, '--type-color': def.color }}
        aria-label={def.label}
      >
        <img src={photo.dataUrl} alt="" draggable={false} />
        {showCorner && (
          <span className="identifier-avatar-corner">
            <TypeMark
              typeKey={typeKey}
              customIconId={customIconId}
              box={mini}
              font={Math.round(mini * 0.45)}
              theme={theme}
              customIcons={customIcons}
            />
          </span>
        )}
      </span>
    );
  }

  return (
    <TypeMark
      typeKey={typeKey}
      customIconId={customIconId}
      box={dim.box}
      font={dim.font}
      theme={theme}
      customIcons={customIcons}
    />
  );
}
