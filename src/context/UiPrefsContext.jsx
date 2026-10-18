import { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Arayüz tercihleri: yazı boyutu ve ağ etiket boyutu.
 * CSS tarafında tüm font-size değerleri `calc(Npx * var(--fs))` biçimindedir;
 * ağ düğüm yazıları ayrıca `--gfs` ile çarpılır. Tercih yerel olarak saklanır
 * (web ve masaüstünde aynı).
 */
const KEY = 'osint-tool:ui';
export const FONT_MIN = 0.8;
export const FONT_MAX = 1.5;
export const FONT_STEP = 0.05;
export const GRAPH_SIZES = [
  { key: 's', label: 'Küçük', value: 0.85 },
  { key: 'm', label: 'Orta', value: 1 },
  { key: 'l', label: 'Büyük', value: 1.25 },
];

const DEFAULTS = { fontScale: 1, graphLabel: 'm' };
const Ctx = createContext(null);

function load() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || '{}');
    const fs = Number(raw.fontScale);
    return {
      fontScale: fs >= FONT_MIN && fs <= FONT_MAX ? fs : DEFAULTS.fontScale,
      graphLabel: GRAPH_SIZES.some((g) => g.key === raw.graphLabel) ? raw.graphLabel : DEFAULTS.graphLabel,
    };
  } catch {
    return DEFAULTS;
  }
}

export function UiPrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(load);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--fs', String(prefs.fontScale));
    const g = GRAPH_SIZES.find((x) => x.key === prefs.graphLabel) ?? GRAPH_SIZES[1];
    root.style.setProperty('--gfs', String(g.value));
    try {
      window.localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* depolama kapalıysa sessizce geç */
    }
  }, [prefs]);

  const value = useMemo(() => {
    const clamp = (v) => Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(v * 100) / 100));
    return {
      ...prefs,
      setFontScale: (v) => setPrefs((p) => ({ ...p, fontScale: clamp(v) })),
      bumpFont: (d) => setPrefs((p) => ({ ...p, fontScale: clamp(p.fontScale + d) })),
      resetFont: () => setPrefs((p) => ({ ...p, fontScale: 1 })),
      setGraphLabel: (k) => setPrefs((p) => ({ ...p, graphLabel: k })),
    };
  }, [prefs]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUiPrefs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUiPrefs must be used within UiPrefsProvider');
  return ctx;
}
