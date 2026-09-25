/**
 * Leaflet (anahtarsız / anahtarlı) harita karo sağlayıcıları.
 * Google Maps ayrı bir sağlayıcıdır (MapTab.jsx).
 */
export const TILE_STYLES = {
  'carto-dark': {
    label: 'CARTO Koyu',
    desc: 'Ücretsiz, anahtarsız. Koyu temaya en uygun.',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    recommended: true,
  },
  osm: {
    label: 'OpenStreetMap',
    desc: 'Ücretsiz, anahtarsız. Standart sokak haritası.',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  'carto-light': {
    label: 'CARTO Açık',
    desc: 'Ücretsiz, anahtarsız. Sade açık zemin.',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  'esri-sat': {
    label: 'Esri Uydu',
    desc: 'Ücretsiz, anahtarsız uydu görüntüsü.',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri — Esri, Maxar, Earthstar Geographics',
  },
  'maptiler-streets': {
    label: 'MapTiler Sokak',
    desc: 'MapTiler API anahtarı gerekir.',
    url: 'https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key={key}',
    maxZoom: 20,
    needsKey: 'maptiler',
    attribution:
      '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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
    attribution:
      '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
};

export const DEFAULT_TILE_STYLE = 'carto-dark';

/** Seçili stil anahtar istiyorsa ve anahtar yoksa ücretsiz stile düşer. */
export function resolveTileStyle(styleKey, keys = {}) {
  const style = TILE_STYLES[styleKey] ?? TILE_STYLES[DEFAULT_TILE_STYLE];
  if (style.needsKey && !keys[style.needsKey]) {
    return { key: DEFAULT_TILE_STYLE, ...TILE_STYLES[DEFAULT_TILE_STYLE], fallback: true };
  }
  const url = style.needsKey
    ? style.url.replace('{key}', encodeURIComponent(keys[style.needsKey]))
    : style.url;
  return { key: styleKey in TILE_STYLES ? styleKey : DEFAULT_TILE_STYLE, ...style, url };
}
