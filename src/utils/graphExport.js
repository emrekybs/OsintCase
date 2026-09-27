/**
 * Bağlantı ağını veriden SVG olarak çizer. Ekrandaki sekmeden bağımsızdır;
 * rapor ve PNG/SVG dışa aktarma bunu kullanır.
 */
import {
  getDisplayLabel,
  getSecondaryLabel,
  getTypeDef,
} from '../identifierTypes.js';
import {
  LINK_CONFIDENCE,
  SUBJECT_ROLES,
  findOption,
  getClassification,
} from '../caseModel.js';
import { NODE_H, NODE_W } from './graph.js';
import { glyphSvgInner } from '../typeGlyphs.js';
import { getAvatarPhoto } from './photos.js';
import { triggerDownload } from './projectIO.js';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const clip = (s, n) => {
  const t = String(s ?? '');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

const PALETTES = {
  light: {
    bg: '#ffffff',
    node: '#f6f6f6',
    border: '#bdbdbd',
    text: '#141414',
    muted: '#6a6a6a',
    edge: '#8a8a8a',
    edgeLabelBg: '#ffffff',
  },
  dark: {
    bg: '#0b0b0b',
    node: '#151515',
    border: '#343434',
    text: '#ececec',
    muted: '#8a8a8a',
    edge: '#6e6e6e',
    edgeLabelBg: '#0b0b0b',
  },
};

function readableOn(hex) {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(f.slice(0, 2), 16);
  const g = parseInt(f.slice(2, 4), 16);
  const b = parseInt(f.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111' : '#fff';
}

/** Düğüm rozeti: ana fotoğraf > SVG glif > harf. */
function badgeSvg(i, def, bx, by, size, pal) {
  const photo = getAvatarPhoto(i);
  if (photo?.dataUrl) {
    const cid = `c${String(i.id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
    return `<clipPath id="${cid}"><rect x="${bx}" y="${by}" width="${size}" height="${size}" rx="3"/></clipPath>
<image href="${photo.dataUrl}" x="${bx}" y="${by}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${cid})"/>
<rect x="${bx}" y="${by}" width="${size}" height="${size}" rx="3" fill="none" stroke="${pal.border}"/>`;
  }
  const fg = readableOn(def.color);
  const inner = glyphSvgInner(i.type, fg);
  if (inner) {
    const g = size * 0.62;
    const off = (size - g) / 2;
    return `<rect x="${bx}" y="${by}" width="${size}" height="${size}" rx="3" fill="${def.color}"/>
<svg x="${bx + off}" y="${by + off}" width="${g}" height="${g}" viewBox="0 0 24 24">${inner}</svg>`;
  }
  return `<rect x="${bx}" y="${by}" width="${size}" height="${size}" rx="3" fill="${def.color}"/>
<text x="${bx + size / 2}" y="${by + size / 2 + 4}" font-size="12" font-weight="700" text-anchor="middle" fill="${fg}">${esc(def.glyph)}</text>`;
}

export function buildGraphSvg(project, { theme = 'light', highlight = null, banner = true, labelFn = getDisplayLabel, secondaryFn = getSecondaryLabel } = {}) {
  const pal = PALETTES[theme] ?? PALETTES.light;
  const idents = project.identifiers ?? [];
  const conns = project.connections ?? [];
  const pad = 40;
  const bannerH = banner ? 26 : 0;

  if (idents.length === 0) {
    return { svg: '', width: 0, height: 0 };
  }
  const xs = idents.map((i) => i.position?.x ?? 0);
  const ys = idents.map((i) => i.position?.y ?? 0);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad - bannerH;
  const maxX = Math.max(...xs) + NODE_W + pad;
  const maxY = Math.max(...ys) + NODE_H + pad + bannerH;
  const width = Math.round(maxX - minX);
  const height = Math.round(maxY - minY);

  const byId = new Map(idents.map((i) => [i.id, i]));
  const center = (i) => ({
    x: (i.position?.x ?? 0) + NODE_W / 2 - minX,
    y: (i.position?.y ?? 0) + NODE_H / 2 - minY,
  });
  const hiNodes = highlight ? new Set(highlight.nodes) : null;
  const hiEdges = highlight ? new Set(highlight.edges) : null;

  const edgeSvg = conns
    .map((c) => {
      const a = byId.get(c.source);
      const b = byId.get(c.target);
      if (!a || !b) return '';
      const p1 = center(a);
      const p2 = center(b);
      const conf = findOption(LINK_CONFIDENCE, c.confidence) ?? LINK_CONFIDENCE[0];
      const on = hiEdges?.has(c.id);
      const stroke = on ? '#d32f2f' : pal.edge;
      const dash = conf.dash ? ` stroke-dasharray="${conf.dash}"` : '';
      let label = '';
      if (c.label) {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const w = Math.min(160, c.label.length * 6.4 + 12);
        label = `<rect x="${mx - w / 2}" y="${my - 9}" width="${w}" height="18" fill="${pal.edgeLabelBg}" stroke="${pal.border}" stroke-width="0.6"/>
<text x="${mx}" y="${my + 4}" font-size="10" text-anchor="middle" fill="${pal.muted}">${esc(clip(c.label, 26))}</text>`;
      }
      return `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${stroke}" stroke-width="${on ? 3 : 1.4}"${dash}/>${label}`;
    })
    .join('\n');

  const nodeSvg = idents
    .map((i) => {
      const def = getTypeDef(i.type);
      const x = (i.position?.x ?? 0) - minX;
      const y = (i.position?.y ?? 0) - minY;
      const role =
        i.type === 'subject' ? findOption(SUBJECT_ROLES, i.fields?.role) : null;
      const on = hiNodes?.has(i.id);
      const border = on ? '#d32f2f' : role ? role.color : pal.border;
      const rel = i.reliability;
      const code =
        rel && (rel.source || rel.info) ? `${rel.source || '?'}${rel.info || '?'}` : '';
      const secondary = secondaryFn(i);
      return `<g>
<rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="4" fill="${pal.node}" stroke="${border}" stroke-width="${on || role ? 2 : 1}"/>
${badgeSvg(i, def, x + 10, y + 16, 30, pal)}
<text x="${x + 50}" y="${y + 19}" font-size="9" letter-spacing="0.8" fill="${pal.muted}">${esc(def.label.toUpperCase())}${code ? `  [${code}]` : ''}</text>
<text x="${x + 50}" y="${y + 36}" font-size="13" font-weight="600" fill="${pal.text}">${esc(clip(labelFn(i), 24))}</text>
${secondary ? `<text x="${x + 50}" y="${y + 52}" font-size="10" fill="${pal.muted}">${esc(clip(secondary, 30))}</text>` : ''}
${role ? `<text x="${x + NODE_W - 8}" y="${y + 52}" font-size="9" font-weight="700" text-anchor="end" fill="${role.color}">${esc(role.label.toUpperCase())}</text>` : ''}
</g>`;
    })
    .join('\n');

  const cls = getClassification(project.classification);
  const bannerSvg = banner
    ? `<rect x="0" y="0" width="${width}" height="${bannerH}" fill="${cls.color}"/>
<text x="${width / 2}" y="${bannerH / 2 + 5}" font-size="12" font-weight="700" letter-spacing="2" text-anchor="middle" fill="${cls.text}">${esc(cls.label)}</text>
<rect x="0" y="${height - bannerH}" width="${width}" height="${bannerH}" fill="${cls.color}"/>
<text x="${width / 2}" y="${height - bannerH / 2 + 5}" font-size="12" font-weight="700" letter-spacing="2" text-anchor="middle" fill="${cls.text}">${esc(cls.label)}</text>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="IBM Plex Sans, Segoe UI, Arial, sans-serif">
<rect width="100%" height="100%" fill="${pal.bg}"/>
${bannerSvg}
${edgeSvg}
${nodeSvg}
</svg>`;
  return { svg, width, height };
}

function baseName(project) {
  return `${(project.caseInfo?.caseNumber || project.name || 'ag')
    .replace(/[^\w-]+/g, '_')}_baglanti_agi`;
}

export function downloadGraphSvg(project, opts) {
  const { svg } = buildGraphSvg(project, opts);
  if (!svg) return false;
  triggerDownload(new Blob([svg], { type: 'image/svg+xml' }), `${baseName(project)}.svg`);
  return true;
}

export async function downloadGraphPng(project, opts) {
  const { svg, width, height } = buildGraphSvg(project, opts);
  if (!svg) return false;
  const scale = 2;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
    triggerDownload(blob, `${baseName(project)}.png`);
    return true;
  } finally {
    URL.revokeObjectURL(url);
  }
}
