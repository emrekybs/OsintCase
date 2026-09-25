/**
 * Harita yardımcıları: yaşam örüntüsü (yoğunluk) ağırlığı.
 * Ağırlık = 1 + görülme kaydı + ziyaret bilgisi + bu konuma bağlı olay sayısı.
 */
export function pinWeights(project) {
  const eventCount = new Map();
  for (const e of project?.events ?? []) {
    for (const pid of e.pinIds ?? []) {
      eventCount.set(pid, (eventCount.get(pid) ?? 0) + 1);
    }
  }
  const out = new Map();
  for (const p of project?.locations ?? []) {
    const w =
      1 +
      (p.sightings?.length ?? 0) +
      (p.visitedAt?.trim?.() ? 1 : 0) +
      (eventCount.get(p.id) ?? 0);
    out.set(p.id, w);
  }
  return out;
}

export function densityRadius(weight) {
  return Math.round(120 * Math.sqrt(weight));
}

export function densityOpacity(weight, maxWeight) {
  const t = maxWeight > 1 ? (weight - 1) / (maxWeight - 1) : 0;
  return 0.12 + t * 0.3;
}

export const DENSITY_COLOR = '#d0493f';
export const RADIUS_COLOR = '#c9a227';
