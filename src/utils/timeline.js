/**
 * Kronoloji öğelerini dosyadaki tüm kaynaklardan toplar:
 *   - elle girilen olaylar (project.events)
 *   - konumlardaki ziyaret tarihi ve görülme kayıtları
 *   - delillerin elde edilme / kayda alınma tarihleri
 */
import { EVENT_CATEGORIES, findOption, parseLooseDate } from '../caseModel.js';

export const KIND_LABELS = {
  event: 'Olay',
  pin: 'Konum',
  sighting: 'Görülme',
  evidence: 'Delil',
};

function pinName(p, idx) {
  return p.label?.trim() || p.address?.trim() || `Konum ${idx + 1}`;
}

export function buildTimeline(project) {
  const items = [];
  for (const e of project.events ?? []) {
    const cat = findOption(EVENT_CATEGORIES, e.category) ?? EVENT_CATEGORIES[0];
    items.push({
      id: `ev:${e.id}`,
      kind: 'event',
      ref: e,
      date: e.date || '',
      time: e.time || '',
      title: e.title,
      description: e.description,
      category: cat.label,
      color: cat.color,
      identifierIds: e.identifierIds ?? [],
      pinIds: e.pinIds ?? [],
      evidenceIds: e.evidenceIds ?? [],
      reliability: e.reliability,
    });
  }
  (project.locations ?? []).forEach((p, idx) => {
    const linked = (project.pinLinks ?? [])
      .filter((l) => l.pinId === p.id)
      .map((l) => l.identifierId);
    const parsed = parseLooseDate(p.visitedAt);
    if (parsed) {
      items.push({
        id: `pin:${p.id}`,
        kind: 'pin',
        ref: p,
        date: parsed.date,
        time: parsed.time,
        title: `${pinName(p, idx)} ziyareti`,
        description: [p.withWho && `Birlikte: ${p.withWho}`, p.notes]
          .filter(Boolean)
          .join(' · '),
        category: 'Konum',
        color: '#2b8a9e',
        identifierIds: linked,
        pinIds: [p.id],
        evidenceIds: [],
      });
    }
    for (const s of p.sightings ?? []) {
      items.push({
        id: `sg:${p.id}:${s.id}`,
        kind: 'sighting',
        ref: p,
        date: s.date || '',
        time: s.time || '',
        title: `${pinName(p, idx)} — görülme`,
        description: s.note ?? '',
        category: 'Görülme',
        color: '#2b8a9e',
        identifierIds: linked,
        pinIds: [p.id],
        evidenceIds: [],
      });
    }
  });
  for (const ev of project.evidence ?? []) {
    const date = ev.acquiredAt || (ev.addedAt ?? '').slice(0, 10);
    items.push({
      id: `evd:${ev.id}`,
      kind: 'evidence',
      ref: ev,
      date,
      time: ev.acquiredAt ? '' : (ev.addedAt ?? '').slice(11, 16),
      title: `${ev.number} ${ev.title || ev.fileName}`,
      description: ev.acquiredAt
        ? `Elde edildi${ev.source ? ` · Kaynak: ${ev.source}` : ''}`
        : 'Kayda alındı',
      category: 'Delil',
      color: '#8c9a4f',
      identifierIds: ev.identifierIds ?? [],
      pinIds: ev.pinIds ?? [],
      evidenceIds: [ev.id],
    });
  }
  items.sort((a, b) => {
    if (!a.date && b.date) return 1;
    if (a.date && !b.date) return -1;
    const k = `${a.date} ${a.time || '99:99'}`.localeCompare(`${b.date} ${b.time || '99:99'}`);
    return k;
  });
  return items;
}

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

export function monthKey(date) {
  if (!date) return 'Tarihsiz';
  const [y, m] = date.split('-');
  const mi = parseInt(m, 10) - 1;
  return `${MONTHS[mi] ?? ''} ${y}`.trim();
}

export function fmtShortDate(date) {
  if (!date) return '—';
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}
