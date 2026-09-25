/**
 * Soruşturma dosyası sabitleri: gizlilik dereceleri, dosya durumları,
 * öncelikler, kaynak güvenilirlik kodu (NATO Admiralty), şahıs rolleri,
 * tehdit seviyeleri ve delil teslim işlemleri.
 */

export const CLASSIFICATIONS = [
  { key: 'tasnif-disi', label: 'TASNİF DIŞI', color: '#2f7d46', text: '#ffffff' },
  { key: 'hizmete-ozel', label: 'HİZMETE ÖZEL', color: '#2b5f9e', text: '#ffffff' },
  { key: 'ozel', label: 'ÖZEL', color: '#6b3fa0', text: '#ffffff' },
  { key: 'gizli', label: 'GİZLİ', color: '#b3261e', text: '#ffffff' },
  { key: 'cok-gizli', label: 'ÇOK GİZLİ', color: '#d96b00', text: '#111111' },
];
export const DEFAULT_CLASSIFICATION = 'hizmete-ozel';

export function getClassification(key) {
  return (
    CLASSIFICATIONS.find((c) => c.key === key) ??
    CLASSIFICATIONS.find((c) => c.key === DEFAULT_CLASSIFICATION)
  );
}

export const CASE_STATUSES = [
  { key: 'acik', label: 'Açık', color: '#4f9d69' },
  { key: 'aktif', label: 'Aktif takip', color: '#c9a227' },
  { key: 'beklemede', label: 'Beklemede', color: '#8a8f86' },
  { key: 'kapali', label: 'Kapalı', color: '#5a6272' },
  { key: 'arsiv', label: 'Arşiv', color: '#4a4f58' },
];

export const PRIORITIES = [
  { key: 'dusuk', label: 'Düşük', color: '#6f7a6c' },
  { key: 'orta', label: 'Orta', color: '#c9a227' },
  { key: 'yuksek', label: 'Yüksek', color: '#d9772b' },
  { key: 'kritik', label: 'Kritik', color: '#d0493f' },
];

export function findOption(list, key) {
  return list.find((o) => o.key === key) ?? null;
}

// NATO Admiralty sistemi — kaynak güvenilirliği (harf) + bilgi doğruluğu (rakam)
export const SOURCE_RELIABILITY = [
  { key: 'A', label: 'A — Tamamen güvenilir' },
  { key: 'B', label: 'B — Genellikle güvenilir' },
  { key: 'C', label: 'C — Oldukça güvenilir' },
  { key: 'D', label: 'D — Genellikle güvenilmez' },
  { key: 'E', label: 'E — Güvenilmez' },
  { key: 'F', label: 'F — Değerlendirilemiyor' },
];

export const INFO_CREDIBILITY = [
  { key: '1', label: '1 — Başka kaynaklarca doğrulandı' },
  { key: '2', label: '2 — Muhtemelen doğru' },
  { key: '3', label: '3 — Olasılıkla doğru' },
  { key: '4', label: '4 — Şüpheli' },
  { key: '5', label: '5 — Olasılık dışı' },
  { key: '6', label: '6 — Değerlendirilemiyor' },
];

/** Admiralty kodu için renk: iyi (yeşil) → zayıf (kırmızı), bilinmiyor gri. */
export function admiraltyTone(source, info) {
  if (!source && !info) return null;
  const s = 'ABCDEF'.indexOf(source ?? 'F');
  const i = '123456'.indexOf(info ?? '6');
  if (source === 'F' || info === '6') return 'unknown';
  const score = (s < 0 ? 5 : s) + (i < 0 ? 5 : i);
  if (score <= 2) return 'high';
  if (score <= 5) return 'medium';
  return 'low';
}

export const SUBJECT_ROLES = [
  { key: 'supheli', label: 'Şüpheli', color: '#d0493f' },
  { key: 'sanik', label: 'Sanık', color: '#b3261e' },
  { key: 'tanik', label: 'Tanık', color: '#2b8a9e' },
  { key: 'magdur', label: 'Mağdur', color: '#6b8f3a' },
  { key: 'irtibat', label: 'İrtibatlı kişi', color: '#c9a227' },
  { key: 'muhbir', label: 'Muhbir', color: '#6b3fa0' },
  { key: 'diger', label: 'Diğer', color: '#6f7a6c' },
];

export const THREAT_LEVELS = [
  { key: 'yok', label: 'Yok', color: '#5a6272' },
  { key: 'dusuk', label: 'Düşük', color: '#4f9d69' },
  { key: 'orta', label: 'Orta', color: '#c9a227' },
  { key: 'yuksek', label: 'Yüksek', color: '#d9772b' },
  { key: 'kritik', label: 'Kritik', color: '#d0493f' },
];

export const LINK_CONFIDENCE = [
  { key: 'kesin', label: 'Kesin (doğrulandı)', dash: null },
  { key: 'muhtemel', label: 'Muhtemel', dash: '8 5' },
  { key: 'supheli', label: 'Şüpheli / teyitsiz', dash: '2 5' },
];

export const CUSTODY_ACTIONS = [
  'Teslim alındı',
  'Teslim edildi',
  'İncelendi',
  'Kopyalandı',
  'Muhafazaya alındı',
  'İade edildi',
  'Diğer',
];

export const EVENT_CATEGORIES = [
  { key: 'olay', label: 'Olay', color: '#c9a227' },
  { key: 'gorulme', label: 'Görülme', color: '#2b8a9e' },
  { key: 'iletisim', label: 'İletişim', color: '#6b3fa0' },
  { key: 'finans', label: 'Finansal', color: '#4f9d69' },
  { key: 'dijital', label: 'Dijital iz', color: '#2b5f9e' },
  { key: 'operasyon', label: 'Operasyon', color: '#d0493f' },
];

export function suggestCaseNumber(date = new Date()) {
  const y = date.getFullYear();
  const n = String(Math.floor(Math.random() * 900) + 100);
  return `${y}/SOR-${n}`;
}

const TR_DATE = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const TR_DATETIME = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return TR_DATE.format(d);
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return TR_DATETIME.format(d);
}

export function fmtBytes(n) {
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Serbest metin tarihten (ör. "2025-03-14", "14.03.2025", "2025-03-14 18:30")
 * sıralanabilir bir değer çıkarır. Çıkaramazsa null.
 */
export function parseLooseDate(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (m) {
    return {
      date: `${m[1]}-${m[2]}-${m[3]}`,
      time: m[4] ? `${m[4]}:${m[5]}` : '',
    };
  }
  m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    return {
      date: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`,
      time: m[4] ? `${m[4].padStart(2, '0')}:${m[5]}` : '',
    };
  }
  return null;
}
