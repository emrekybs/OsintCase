import { localizeRegistry } from './i18n/index.jsx';
/**
 * Leaflet harita katmanları. Google Maps ayrı sağlayıcıdır (MapTab.jsx).
 *
 * Not: CARTO karoları 2026 itibarıyla API anahtarı istiyor (anahtarsız
 * isteklerde "API KEY REQUIRED" filigranı basıyor), bu yüzden listede yok.
 * OpenStreetMap geçerli bir Referer ister; index.html'de Referer'ı kapatan
 * bir ayar OLMAMALI (osm.wiki/Blocked hatasının sebebi budur).
 */
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const TILE_STYLES = {
  osm: {
    label: 'OpenStreetMap',
    desc: 'Ücretsiz, anahtarsız. Standart sokak haritası.',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: OSM_ATTR,
    recommended: true,
  },
  'osm-dark': {
    label: 'OpenStreetMap Koyu',
    desc: 'Ücretsiz, anahtarsız. Aynı harita, koyu temaya uygun renklerde.',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: OSM_ATTR,
    className: 'tiles-dark',
  },
  topo: {
    label: 'OpenTopoMap',
    desc: 'Ücretsiz, anahtarsız. Arazi ve yükselti.',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 17,
    attribution: `${OSM_ATTR}, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a>`,
  },
  'esri-sat': {
    label: 'Esri Uydu',
    desc: 'Ücretsiz uydu görüntüsü. Esri kullanım şartları geçerlidir.',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri — Esri, Vantor, Earthstar Geographics',
  },
  'maptiler-streets': {
    label: 'MapTiler Sokak',
    desc: 'MapTiler API anahtarı gerekir.',
    url: 'https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key={key}',
    maxZoom: 20,
    needsKey: 'maptiler',
    attribution: `&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> ${OSM_ATTR}`,
  },
  'maptiler-satellite': {
    label: 'MapTiler Uydu',
    desc: 'MapTiler API anahtarı gerekir. Yüksek çözünürlük.',
    url: 'https://api.maptiler.com/maps/satellite/256/{z}/{x}/{y}.jpg?key={key}',
    maxZoom: 20,
    needsKey: 'maptiler',
    attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>',
  },
  'maptiler-dark': {
    label: 'MapTiler Koyu',
    desc: 'MapTiler API anahtarı gerekir.',
    url: 'https://api.maptiler.com/maps/dataviz-dark/256/{z}/{x}/{y}.png?key={key}',
    maxZoom: 20,
    needsKey: 'maptiler',
    attribution: `&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> ${OSM_ATTR}`,
  },
};

export const DEFAULT_TILE_STYLE = 'osm';

/**
 * Seçili stili çözer. Bilinmeyen stil (ör. eskiden kaydedilmiş CARTO) ya da
 * anahtarı girilmemiş anahtarlı stil → OpenStreetMap.
 */
export function resolveTileStyle(styleKey, keys = {}) {
  const known = styleKey && Object.hasOwn(TILE_STYLES, styleKey);
  const key = known ? styleKey : DEFAULT_TILE_STYLE;
  const style = TILE_STYLES[key];
  if (style.needsKey && !keys[style.needsKey]) {
    return { key: DEFAULT_TILE_STYLE, ...TILE_STYLES[DEFAULT_TILE_STYLE], fallback: true };
  }
  const url = style.needsKey
    ? style.url.replace('{key}', encodeURIComponent(keys[style.needsKey]))
    : style.url;
  return { key, ...style, url, fallback: !known && !!styleKey };
}

localizeRegistry(TILE_STYLES);
