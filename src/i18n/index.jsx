/**
 * Basit TR/EN dil desteği.
 *
 * Kaynak dil Türkçe: metinler kodda Türkçe yazılır ve t('…') ile sarılır.
 * İngilizce seçiliyse en.js sözlüğünden karşılığı döner; karşılık yoksa
 * Türkçe metin gösterilir (hiçbir şey kırılmaz).
 *
 * Değişken: t('{n} gün önce', { n: 3 })
 *
 * Tür/seçenek tabloları (identifierTypes, caseModel…) modül seviyesinde
 * sabit dizilerdir; dil değişince localizeRegistry ile yerinde yeniden
 * etiketlenir ve uygulama yeniden çizilir.
 */
import { createContext, useCallback, useContext, useState } from 'react';
import EN from './en.js';

const STORAGE_KEY = 'osint-tool:lang';
export const LANGUAGES = [
  { key: 'tr', label: 'Türkçe', short: 'TR' },
  { key: 'en', label: 'English', short: 'EN' },
];

function readLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'tr' || v === 'en') return v;
  } catch {}
  return 'tr';
}

let currentLang = readLang();
const registries = [];

export function getLang() {
  return currentLang;
}

export function getLocale() {
  return currentLang === 'en' ? 'en-GB' : 'tr-TR';
}

export function t(text, vars) {
  if (text == null) return '';
  let out = currentLang === 'en' ? EN[text] ?? text : text;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(String(v ?? ''));
    }
  }
  return out;
}

const PROPS = ['label', 'name', 'placeholder', 'desc'];

function relabel(node, seen) {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    node.forEach((n) => relabel(n, seen));
    return;
  }
  for (const p of PROPS) {
    if (typeof node[p] === 'string') {
      const orig = `__tr_${p}`;
      if (!(orig in node)) {
        Object.defineProperty(node, orig, { value: node[p], enumerable: false });
      }
      node[p] = t(node[orig]);
    }
  }
  for (const v of Object.values(node)) {
    if (v && typeof v === 'object' && !(v instanceof Function)) relabel(v, seen);
  }
}

/** Modül seviyesindeki etiket tablolarını dil değişiminde yeniden etiketle. */
export function localizeRegistry(...objs) {
  registries.push(...objs);
  const seen = new WeakSet();
  objs.forEach((o) => relabel(o, seen));
}

function relabelAll() {
  const seen = new WeakSet();
  registries.forEach((o) => relabel(o, seen));
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(currentLang);

  const setLang = useCallback((next) => {
    if (next !== 'tr' && next !== 'en') return;
    currentLang = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    document.documentElement.setAttribute('lang', next);
    relabelAll();
    setLangState(next);
  }, []);

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', lang);
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
