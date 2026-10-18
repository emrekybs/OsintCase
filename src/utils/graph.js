/**
 * Bağlantı ağı analizi: derece, en kısa yol, bileşenler ve otomatik yerleşim.
 */
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force';

export const NODE_W = 230;
export const NODE_H = 64;

export function buildAdjacency(connections) {
  const adj = new Map();
  for (const c of connections) {
    if (!adj.has(c.source)) adj.set(c.source, []);
    if (!adj.has(c.target)) adj.set(c.target, []);
    adj.get(c.source).push({ node: c.target, edge: c.id });
    adj.get(c.target).push({ node: c.source, edge: c.id });
  }
  return adj;
}

export function degreeMap(identifiers, connections) {
  const m = new Map(identifiers.map((i) => [i.id, 0]));
  for (const c of connections) {
    if (m.has(c.source)) m.set(c.source, m.get(c.source) + 1);
    if (m.has(c.target)) m.set(c.target, m.get(c.target) + 1);
  }
  return m;
}

/** Yönsüz BFS ile en kısa yol. Yol yoksa null. */
export function shortestPath(connections, from, to) {
  if (from === to) return { nodes: [from], edges: [] };
  const adj = buildAdjacency(connections);
  const prev = new Map([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    for (const { node, edge } of adj.get(cur) ?? []) {
      if (prev.has(node)) continue;
      prev.set(node, { node: cur, edge });
      if (node === to) {
        const nodes = [to];
        const edges = [];
        let step = prev.get(to);
        while (step) {
          edges.unshift(step.edge);
          nodes.unshift(step.node);
          step = prev.get(step.node);
        }
        return { nodes, edges };
      }
      queue.push(node);
    }
  }
  return null;
}

/** Bağlı bileşen sayısı (kopuk kümeler). */
export function componentCount(identifiers, connections) {
  const adj = buildAdjacency(connections);
  const seen = new Set();
  let count = 0;
  for (const i of identifiers) {
    if (seen.has(i.id)) continue;
    count++;
    const stack = [i.id];
    while (stack.length) {
      const n = stack.pop();
      if (seen.has(n)) continue;
      seen.add(n);
      for (const { node } of adj.get(n) ?? []) stack.push(node);
    }
  }
  return count;
}

/**
 * Kuvvet yönlendirmeli yerleşim. Mevcut konumlardan başlar, böylece küçük
 * değişikliklerde yapı korunur. { [id]: {x, y} } döner (sol-üst köşe).
 */
export function forceLayout(identifiers, connections, { iterations = 400 } = {}) {
  if (identifiers.length === 0) return {};
  const nodes = identifiers.map((i, idx) => ({
    id: i.id,
    x: (i.position?.x ?? (idx % 5) * 260) + NODE_W / 2,
    y: (i.position?.y ?? Math.floor(idx / 5) * 160) + NODE_H / 2,
  }));
  const ids = new Set(nodes.map((n) => n.id));
  const links = connections
    .filter((c) => ids.has(c.source) && ids.has(c.target))
    .map((c) => ({ source: c.source, target: c.target }));
  const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
  const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;

  const sim = forceSimulation(nodes)
    .force('link', forceLink(links).id((d) => d.id).distance(260).strength(0.7))
    .force('charge', forceManyBody().strength(-1400))
    .force('collide', forceCollide().radius(NODE_W * 0.62).strength(1))
    .force('center', forceCenter(cx, cy))
    .force('x', forceX(cx).strength(0.03))
    .force('y', forceY(cy).strength(0.05))
    .stop();
  for (let i = 0; i < iterations; i++) sim.tick();

  const out = {};
  for (const n of nodes) {
    out[n.id] = {
      x: Math.round(n.x - NODE_W / 2),
      y: Math.round(n.y - NODE_H / 2),
    };
  }
  return out;
}
