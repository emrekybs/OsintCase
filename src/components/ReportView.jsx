import { useEffect, useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import {
  ASSESSMENT_CONFIDENCE,
  CASE_STATUSES,
  INFO_CREDIBILITY,
  LINK_CONFIDENCE,
  PRIORITIES,
  SOURCE_RELIABILITY,
  SUBJECT_ROLES,
  THREAT_LEVELS,
  admiraltyTone,
  findOption,
  fmtBytes,
  fmtDate,
  fmtDateTime,
  getClassification,
} from '../caseModel.js';
import {
  CATEGORIES,
  formatFieldValue,
  getDisplayLabel,
  getPrimaryFieldKey,
  getSecondaryLabel,
  getTypeDef,
} from '../identifierTypes.js';
import { glyphSvgInner } from '../typeGlyphs.js';
import { pickTextColor } from './IdentifierBadge.jsx';
import { buildGraphSvg } from '../utils/graphExport.js';
import { buildTimeline, fmtShortDate } from '../utils/timeline.js';
import { sha256Hex } from '../utils/crypto.js';
import { getAnalyst } from '../utils/analyst.js';
import { getAvatarPhoto, sortedPhotos } from '../utils/photos.js';
import { triggerDownload } from '../utils/projectIO.js';
import { getPinColor } from '../pinColors.js';
import logoSrc from '../images/brand/logo-160.png?inline';
import reportCss from './ReportView.css?inline';
import './ReportView.css';
import { getLang, t } from '../i18n/index.jsx';

const SECTIONS = [
  { key: 'summary', label: 'Yönetici özeti' },
  { key: 'profiles', label: 'Şahıs profilleri' },
  { key: 'identifiers', label: 'Tanımlayıcılar' },
  { key: 'graph', label: 'Bağlantı ağı şeması' },
  { key: 'links', label: 'Bağlantı listesi' },
  { key: 'locations', label: 'Konumlar ve kroki' },
  { key: 'timeline', label: 'Kronoloji' },
  { key: 'evidence', label: 'Deliller' },
  { key: 'audit', label: 'İşlem kaydı' },
  { key: 'legend', label: 'Değerlendirme cetveli' },
];

const PREF_KEY = 'osint-tool:report-prefs';

function readPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

function writePrefs(p) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {}
}

function relCode(r) {
  if (!r || (!r.source && !r.info)) return null;
  return `${r.source || '?'}${r.info || '?'}`;
}

function cssStr(s) {
  return `"${String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}

const safeName = (s) => String(s || 'rapor').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_');

/* ---- Küçük parçalar --------------------------------------------------------- */

/** Rapor rozeti: tek tip SVG glif (ya da fotoğraf). Uygulama bağlamına ihtiyaç duymaz. */
function RBadge({ typeKey, photo, size = 22 }) {
  const def = getTypeDef(typeKey);
  if (photo?.dataUrl) {
    return (
      <span className="rb rb-photo" style={{ width: size, height: size }}>
        <img src={photo.dataUrl} alt="" />
      </span>
    );
  }
  const fg = pickTextColor(def.color);
  const inner = glyphSvgInner(typeKey, fg);
  const g = Math.round(size * 0.62);
  return (
    <span className="rb" style={{ width: size, height: size, background: def.color }}>
      {inner ? (
        <svg viewBox="0 0 24 24" width={g} height={g} dangerouslySetInnerHTML={{ __html: inner }} />
      ) : (
        <b style={{ color: fg, fontSize: Math.round(size * 0.42) }}>{def.glyph}</b>
      )}
    </span>
  );
}

function RelTag({ r }) {
  const code = relCode(r);
  if (!code) return <span className="rp-muted">—</span>;
  const tone = admiraltyTone(r.source, r.info);
  return <span className={`rp-rel tone-${tone}`}>{code}</span>;
}

function Chip({ color, solid, children }) {
  return (
    <span
      className={`rp-chip ${solid ? 'solid' : ''}`}
      style={solid ? { background: color, borderColor: color } : { color, borderColor: color }}
    >
      {children}
    </span>
  );
}

function Redacted({ len = 10 }) {
  return (
    <span className="rp-redact" title={t('Karartıldı')}>
      {' '.repeat(Math.min(28, Math.max(6, len)))}
    </span>
  );
}

function SilhouetteSvg() {
  return (
    <svg viewBox="0 0 24 24" width="46" height="46" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
      <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
    </svg>
  );
}

/** Konumların kuşbakışı krokisi (harita karosu kullanmaz, çevrimdışı çalışır). */
function LocationSketch({ pins, connect }) {
  if (pins.length === 0) return null;
  const W = 680;
  const H = 360;
  const pad = 40;
  const lat0 = pins.reduce((s, p) => s + p.lat, 0) / pins.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const xs = pins.map((p) => p.lng * k);
  const ys = pins.map((p) => -p.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
  const ox = (W - spanX * scale) / 2;
  const oy = (H - spanY * scale) / 2;
  const pt = (p) => ({ x: ox + (p.lng * k - minX) * scale, y: oy + (-p.lat - minY) * scale });
  const kmPerUnit = 111.32;
  const km = (120 / scale) * kmPerUnit;
  const nice = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((n) => n >= km) ?? km;
  const barPx = (nice / kmPerUnit) * scale;
  const pts = pins.map(pt);
  const line = { stroke: 'var(--rp-line)' };
  const ink = { fill: 'var(--rp-text-2)' };
  return (
    <svg className="rp-sketch" viewBox={`0 0 ${W} ${H}`} width="100%">
      <rect width={W} height={H} style={{ fill: 'var(--rp-surface)', stroke: 'var(--rp-line-2)' }} />
      {Array.from({ length: 7 }, (_, i) => (
        <line key={`v${i}`} x1={(W / 8) * (i + 1)} y1="0" x2={(W / 8) * (i + 1)} y2={H} style={line} />
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <line key={`h${i}`} x1="0" y1={(H / 4) * (i + 1)} x2={W} y2={(H / 4) * (i + 1)} style={line} />
      ))}
      {connect && pts.length > 1 && (
        <polyline
          points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          style={{ stroke: 'var(--rp-accent)' }}
          strokeWidth="1.5"
          strokeDasharray="6 4"
        />
      )}
      {pins.map((p, i) => {
        const c = getPinColor(p.color);
        const q = pts[i];
        return (
          <g key={p.id}>
            <circle cx={q.x} cy={q.y} r="16" fill="none" style={{ stroke: c.bg }} strokeOpacity="0.35" />
            <circle cx={q.x} cy={q.y} r="10" fill={c.bg} stroke={c.border} strokeWidth="1.5" />
            <text x={q.x} y={q.y + 4} fontSize="10" fontWeight="700" textAnchor="middle" fill={c.glyph}>
              {i + 1}
            </text>
          </g>
        );
      })}
      <g transform={`translate(${pad}, ${H - 20})`}>
        <line x1="0" y1="0" x2={barPx} y2="0" style={{ stroke: 'var(--rp-text-2)' }} strokeWidth="2" />
        <line x1="0" y1="-4" x2="0" y2="4" style={{ stroke: 'var(--rp-text-2)' }} />
        <line x1={barPx} y1="-4" x2={barPx} y2="4" style={{ stroke: 'var(--rp-text-2)' }} />
        <text x={barPx + 6} y="4" fontSize="10" style={ink}>
          {nice < 1 ? `${Math.round(nice * 1000)} m` : `${nice} km`}
        </text>
      </g>
      <g transform={`translate(${W - 26}, 30)`}>
        <path d="M0 -14 L6 4 L0 0 L-6 4 Z" style={{ fill: 'var(--rp-text-2)' }} />
        <text x="0" y="17" fontSize="10" textAnchor="middle" style={ink}>{t('K')}</text>
      </g>
    </svg>
  );
}

/* ---- Rapor ------------------------------------------------------------------ */

export default function ReportView({ onClose }) {
  const { project, logAction, updateCaseMeta } = useProject();
  const prefs0 = useMemo(readPrefs, []);
  const [enabled, setEnabled] = useState(
    () => new Set(prefs0.sections ?? SECTIONS.map((s) => s.key).filter((k) => k !== 'audit')),
  );
  const [theme, setTheme] = useState(prefs0.theme === 'light' ? 'light' : 'dark');
  const [watermark, setWatermark] = useState(Boolean(prefs0.watermark));
  const [redact, setRedact] = useState(false);
  const [assessment, setAssessment] = useState(project.caseInfo?.assessment ?? '');
  const [confidence, setConfidence] = useState(project.caseInfo?.assessmentConfidence ?? '');
  const [fingerprint, setFingerprint] = useState('');
  const [generatedAt] = useState(() => new Date().toISOString());
  const [busy, setBusy] = useState(false);
  const analyst = getAnalyst() || project.caseInfo?.investigator || '—';

  useEffect(() => {
    writePrefs({ sections: [...enabled], theme, watermark });
  }, [enabled, theme, watermark]);

  useEffect(() => {
    sha256Hex(JSON.stringify(project)).then(setFingerprint);
  }, [project]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.classList.add('report-open');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('report-open');
    };
  }, [onClose]);

  const cls = getClassification(project.classification);
  const ci = project.caseInfo ?? {};
  const idents = project.identifiers ?? [];
  const subjects = idents.filter((i) => i.type === 'subject');
  const others = idents.filter((i) => i.type !== 'subject');
  const conns = project.connections ?? [];
  const pins = project.locations ?? [];
  const evidence = project.evidence ?? [];
  const log = project.auditLog ?? [];
  const timeline = useMemo(() => buildTimeline(project), [project]);
  const identById = useMemo(() => new Map(idents.map((i) => [i.id, i])), [idents]);
  const caseNo = ci.caseNumber || project.name;

  /* -- karartma --------------------------------------------------------------- */
  const primarySensitive = (i) => {
    const def = getTypeDef(i?.type);
    const pk = getPrimaryFieldKey(i?.type);
    return Boolean(def.fields.find((f) => f.key === pk)?.sensitive);
  };
  const labelText = (i) => {
    if (!i) return '—';
    return redact && primarySensitive(i) ? '████████' : getDisplayLabel(i);
  };
  const Label = ({ i }) => {
    if (!i) return '—';
    if (redact && primarySensitive(i)) return <Redacted len={getDisplayLabel(i).length} />;
    return getDisplayLabel(i);
  };
  const secondaryText = (i) => {
    const def = getTypeDef(i.type);
    const pk = getPrimaryFieldKey(i.type);
    for (const f of def.fields) {
      if (f.key === pk) continue;
      if (i.type === 'subject' && f.type === 'select') continue;
      const v = i.fields?.[f.key];
      if (v && String(v).trim()) return redact && f.sensitive ? '████' : formatFieldValue(f, v);
    }
    return '';
  };
  const FieldVal = ({ field, value }) => {
    if (value == null || value === '') return '—';
    if (redact && field?.sensitive) return <Redacted len={String(value).length} />;
    if (field?.type === 'date') return fmtDate(value);
    return formatFieldValue(field, value);
  };

  const graph = useMemo(
    () =>
      buildGraphSvg(project, {
        theme,
        banner: false,
        labelFn: labelText,
        secondaryFn: secondaryText,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [project, theme, redact],
  );

  // Ana hedefin kaydı: künyedeki hedef adıyla eşleşen şahıs, yoksa ilk şüpheli.
  const targetSubject = useMemo(() => {
    const tn = (project.target?.name ?? '').toLowerCase();
    return (
      subjects.find((s) => {
        const n = (s.fields?.fullName ?? '').toLowerCase();
        return n && tn && (tn.includes(n) || n.includes(tn));
      }) ??
      subjects.find((s) => s.fields?.role === 'supheli') ??
      subjects[0] ??
      null
    );
  }, [subjects, project.target?.name]);
  const targetPhoto = targetSubject ? getAvatarPhoto(targetSubject) : null;

  const on = (k) => enabled.has(k);
  const toggle = (k) =>
    setEnabled((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const persistMeta = () => {
    const patch = {};
    if ((ci.assessment ?? '') !== assessment) patch.assessment = assessment;
    if ((ci.assessmentConfidence ?? '') !== confidence) patch.assessmentConfidence = confidence;
    if (Object.keys(patch).length) updateCaseMeta({ caseInfo: patch });
  };

  const optionsText = () =>
    [
      theme === 'dark' ? t('koyu tema') : t('açık tema'),
      redact && t('karartmalı'),
      watermark && t('filigranlı'),
    ]
      .filter(Boolean)
      .join(', ');

  const handlePrint = () => {
    persistMeta();
    logAction(
      'Rapor oluşturuldu',
      `PDF · ${optionsText()} · ${SECTIONS.filter((s) => on(s.key)).map((s) => t(s.label)).join(', ')} · ${t('parmak izi')} ${fingerprint.slice(0, 16)}…`,
    );
    const prevTitle = document.title;
    document.title = `${safeName(caseNo)}_${t('rapor')}`;
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(() => window.print(), 60);
  };

  const handleHtml = () => {
    persistMeta();
    setBusy(true);
    try {
      const root = document.getElementById('report-print-root');
      const paper = root.cloneNode(true);
      paper.querySelectorAll('.no-print').forEach((n) => n.remove());
      paper.querySelectorAll('.print-only').forEach((n) => n.classList.remove('print-only'));
      // Aynı fotoğraf raporda birçok yerde geçer (profil, tablo, bağlantılar,
      // kronoloji). Dosyaya her görseli bir kez göm, <img>'lere açılışta dağıt.
      const pool = [];
      const index = new Map();
      paper.querySelectorAll('img[src^="data:"]').forEach((img) => {
        const src = img.getAttribute('src');
        if (!index.has(src)) {
          index.set(src, pool.length);
          pool.push(src);
        }
        img.setAttribute('data-img', String(index.get(src)));
        img.removeAttribute('src');
      });
      const imgScript = pool.length
        ? `<script>(function(){var I=${JSON.stringify(pool)};var n=document.querySelectorAll('img[data-img]');for(var i=0;i<n.length;i++){n[i].src=I[+n[i].getAttribute('data-img')];}})();</script>`
        : '';
      const tocItems = SECTIONS.filter((s) => on(s.key) && paper.querySelector(`#rp-${s.key}`))
        .map((s) => `<a href="#rp-${s.key}">${escapeHtml(t(s.label))}</a>`)
        .join('');
      const title = `${project.name} · ${caseNo}`;
      const html = `<!doctype html>
<html lang="${getLang()}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="OSINT Case">
<title>${escapeHtml(title)}</title>
<style>${reportCss}</style>
</head>
<body class="rp-standalone rp-standalone-${theme}">
<nav class="rp-sa-bar">
  <span class="rp-sa-cls" style="background:${cls.color};color:${cls.text}">${escapeHtml(cls.label)}</span>
  <strong>${escapeHtml(project.name)}</strong>
  <span class="rp-sa-no">${escapeHtml(caseNo)}</span>
  <span class="rp-sa-toc">${tocItems}</span>
  <button type="button" onclick="window.print()">${escapeHtml(t('Yazdır / PDF'))}</button>
</nav>
<main class="rp-sa-main">${paper.outerHTML}</main>
${imgScript}
</body>
</html>`;
      triggerDownload(new Blob([html], { type: 'text/html;charset=utf-8' }), `${safeName(caseNo)}_${t('rapor')}.html`);
      logAction(
        'Rapor oluşturuldu',
        `HTML · ${optionsText()} · ${SECTIONS.filter((s) => on(s.key)).map((s) => t(s.label)).join(', ')} · ${t('parmak izi')} ${fingerprint.slice(0, 16)}…`,
      );
    } finally {
      setBusy(false);
    }
  };

  /* -- sayfa kuralları (yazdırma) ------------------------------------------------ */
  const pal = theme === 'dark'
    ? { bg: '#0b0b0b', muted: '#8a8a8a' }
    : { bg: '#ffffff', muted: '#6a6a6a' };
  const bandBox = `background:${cls.color};color:${cls.text};height:7mm;vertical-align:middle;`;
  const pageCss = `
@page {
  size: A4;
  margin: 17mm 14mm 16mm;
  background: ${pal.bg};
  @top-left-corner { content: ""; ${bandBox} }
  @top-left { content: ""; ${bandBox} }
  @top-center { content: ${cssStr(cls.label)}; ${bandBox} font: 700 8pt ui-monospace, 'DejaVu Sans Mono', monospace; letter-spacing: 3px; text-align: center; }
  @top-right { content: ""; ${bandBox} }
  @top-right-corner { content: ""; ${bandBox} }
  @bottom-left { content: ${cssStr(`${caseNo} · ${project.name}`)}; color: ${pal.muted}; font: 7.5pt ui-monospace, 'DejaVu Sans Mono', monospace; vertical-align: middle; }
  @bottom-center { content: ${cssStr(cls.label)}; color: ${cls.color}; font: 700 7.5pt ui-monospace, 'DejaVu Sans Mono', monospace; letter-spacing: 2px; vertical-align: middle; }
  @bottom-right { content: ${cssStr(t('Sayfa'))} " " counter(page) " / " counter(pages); color: ${pal.muted}; font: 7.5pt ui-monospace, 'DejaVu Sans Mono', monospace; vertical-align: middle; }
}
@page rpcover {
  margin: 0;
  @top-left-corner { content: none; } @top-left { content: none; } @top-center { content: none; }
  @top-right { content: none; } @top-right-corner { content: none; }
  @bottom-left { content: none; } @bottom-center { content: none; } @bottom-right { content: none; }
}
@media print { html, body { background: ${pal.bg} !important; } }`;

  const wmText = `${analyst} · ${fmtDate(generatedAt)} · ${caseNo}`;
  const wmSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='240'><text x='180' y='130' text-anchor='middle' font-family='monospace' font-size='13' font-weight='700' fill='${theme === 'dark' ? '#ffffff' : '#000000'}' fill-opacity='${theme === 'dark' ? 0.06 : 0.07}' transform='rotate(-30 180 120)'>${escapeHtml(wmText)}</text></svg>`;
  const wmUrl = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(wmSvg)}")`;

  /* -- bölüm başlığı ------------------------------------------------------------ */
  let sectionNo = 0;
  const H = (key, title, sub) => {
    sectionNo += 1;
    return (
      <header className="rp-h2" id={`rp-${key}`}>
        <span className="rp-no">{String(sectionNo).padStart(2, '0')}</span>
        <span className="rp-h2-text">
          <span className="rp-h2-title">{t(title)}</span>
          {sub && <span className="rp-h2-sub">{sub}</span>}
        </span>
      </header>
    );
  };

  const neighborsOf = (id) =>
    conns
      .filter((c) => c.source === id || c.target === id)
      .map((c) => ({ c, other: identById.get(c.source === id ? c.target : c.source) }))
      .filter((x) => x.other);

  const catOrder = (typeKey) => CATEGORIES[getTypeDef(typeKey).category]?.order ?? 99;

  const identFields = (i) => {
    const def = getTypeDef(i.type);
    const pk = getPrimaryFieldKey(i.type);
    return def.fields.filter((f) => f.key !== pk && i.fields?.[f.key] !== undefined && i.fields?.[f.key] !== '');
  };

  const status = findOption(CASE_STATUSES, ci.status);
  const priority = findOption(PRIORITIES, ci.priority);
  const conf = findOption(ASSESSMENT_CONFIDENCE, confidence);

  const othersByCat = useMemo(() => {
    const m = new Map();
    for (const i of [...others].sort((a, b) => catOrder(a.type) - catOrder(b.type))) {
      const c = getTypeDef(i.type).category;
      if (!m.has(c)) m.set(c, []);
      m.get(c).push(i);
    }
    return [...m.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [others]);

  const photoCount = idents.reduce((n, i) => n + (i.photos?.length ?? 0), 0);

  return (
    <div className="report-overlay">
      <aside className="report-side no-print">
        <div className="report-side-head">
          <strong>{t('Rapor')}</strong>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('Kapat')} title={t('Kapat')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="report-side-group">
          <div className="report-side-label">{t('Tema')}</div>
          <div className="report-seg">
            <button type="button" className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}>{t('Koyu tema')}</button>
            <button type="button" className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>{t('Açık tema')}</button>
          </div>
          <p className="report-side-note">{t('Koyu tema ekranda okumak, açık tema yazıcıdan basmak içindir.')}</p>
        </div>

        <div className="report-side-group">
          <div className="report-side-label">{t('Bölümler')}</div>
          {SECTIONS.map((s) => (
            <label key={s.key} className="check-row compact">
              <input type="checkbox" checked={on(s.key)} onChange={() => toggle(s.key)} />
              <span>{t(s.label)}</span>
            </label>
          ))}
        </div>

        <div className="report-side-group">
          <div className="report-side-label">{t('Paylaşım')}</div>
          <label className="check-row compact">
            <input type="checkbox" checked={redact} onChange={(e) => setRedact(e.target.checked)} />
            <span>{t('Karartma')}</span>
          </label>
          <p className="report-side-note">{t('Kimlik no, IBAN, IMEI gibi hassas alanlar siyah bantla gizlenir; değerler dosyaya hiç yazılmaz.')}</p>
          <label className="check-row compact">
            <input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} />
            <span>{t('Filigran')}</span>
          </label>
          <p className="report-side-note">{t('Her sayfaya analist adı, tarih ve dosya no silik olarak basılır.')}</p>
        </div>

        <div className="report-side-actions">
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><path d="M12 11v6M9.5 14.5l2.5 2.5l2.5 -2.5"/></svg>
            {t('PDF olarak kaydet')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleHtml} disabled={busy}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 8l-4 4l4 4M17 8l4 4l-4 4M14 4l-4 16"/></svg>
            {t('HTML indir')}
          </button>
          <p className="report-side-note">{t('PDF: açılan yazdırma penceresinde hedef olarak “PDF olarak kaydet”i seçin. Arka plan grafikleri otomatik açılır.')}</p>
        </div>
      </aside>

      <div className="report-scroll">
        <article
          className="report-paper"
          id="report-print-root"
          data-rp-theme={theme}
        >
          <style>{pageCss}</style>
          {watermark && <div className="rp-watermark" style={{ backgroundImage: wmUrl }} aria-hidden="true" />}

          {/* ---- KAPAK ---------------------------------------------------- */}
          <section className="rp-cover">
            <div className="rp-cover-band" style={{ background: cls.color, color: cls.text }}>{cls.label}</div>
            <div className="rp-cover-head">
              <img src={logoSrc} alt="" className="rp-cover-logo" />
              <div className="rp-cover-brand">
                <b>OSINT <span>Case</span></b>
                <span>{t('Soruşturma ve istihbarat analiz masası')}</span>
              </div>
              <div className="rp-cover-no">
                <span>{t('Dosya no')}</span>
                <b className="mono">{ci.caseNumber || '—'}</b>
              </div>
            </div>

            <div className="rp-cover-main">
              <div className="rp-cover-title">
                <div className="rp-kicker">{t('İSTİHBARAT / SORUŞTURMA RAPORU')}</div>
                <h1>{project.name}</h1>
                {project.target?.name && (
                  <div className="rp-cover-target">
                    <span>{t('Ana hedef')}</span>
                    <b>{project.target.name}</b>
                  </div>
                )}
                <div className="rp-cover-chips">
                  {status && <Chip color={status.color}>{status.label}</Chip>}
                  {priority && <Chip color={priority.color}>{t('Öncelik')}: {priority.label}</Chip>}
                  <Chip color={cls.color} solid>{cls.label}</Chip>
                </div>
              </div>
              {targetSubject && (
                <figure className="rp-cover-photo">
                  <div className="rp-frame-corners">
                    {targetPhoto ? <img src={targetPhoto.dataUrl} alt="" /> : <div className="rp-photo-none"><SilhouetteSvg /></div>}
                  </div>
                  <figcaption className="mono">{getDisplayLabel(targetSubject)}</figcaption>
                </figure>
              )}
            </div>

            <dl className="rp-cover-kv">
              <div><dt>{t('Soruşturmacı')}</dt><dd>{ci.investigator || '—'}</dd></div>
              <div><dt>{t('Birim')}</dt><dd>{ci.unit || '—'}</dd></div>
              <div><dt>{t('Açılış')}</dt><dd className="mono">{ci.openedAt ? fmtDate(ci.openedAt) : fmtDate(project.createdAt)}</dd></div>
              <div><dt>{t('Rapor tarihi')}</dt><dd className="mono">{fmtDateTime(generatedAt)}</dd></div>
              <div className="wide"><dt>{t('Hukuki dayanak')}</dt><dd>{ci.legalBasis || '—'}</dd></div>
            </dl>

            <div className="rp-cover-stats">
              {[
                [subjects.length, t('şahıs')],
                [idents.length, t('tanımlayıcı')],
                [conns.length, t('bağlantı')],
                [pins.length, t('konum')],
                [timeline.length, t('kronoloji kaydı')],
                [evidence.length, t('delil')],
              ].map(([n, l]) => (
                <div key={l}>
                  <b>{n}</b>
                  <span>{l}</span>
                </div>
              ))}
            </div>

            <div className="rp-cover-foot">
              <div>
                <span>{t('Hazırlayan')}</span>
                <b>{analyst}</b>
              </div>
              <div className="grow">
                <span>{t('Dosya parmak izi (SHA-256)')}</span>
                <b className="mono small">{fingerprint || '…'}</b>
              </div>
            </div>
            <p className="rp-cover-notice">
              {t('Bu belge {0} gizlilik derecesindedir. Yetkisiz kişilerle paylaşılamaz, çoğaltılamaz. Parmak izi, raporun üretildiği dosya sürümünü doğrular.', { 0: cls.label })}
              {redact && <b> {t('Hassas alanlar karartılmıştır.')}</b>}
            </p>
            <div className="rp-cover-band bottom" style={{ background: cls.color, color: cls.text }}>
              {cls.label} · {caseNo}
            </div>
          </section>

          <div className="rp-body">
            {/* ---- ÖZET ------------------------------------------------------ */}
            {on('summary') && (
              <section className="rp-section">
                {H('summary', 'Yönetici özeti')}
                <div className="rp-bluf">
                  <div className="rp-bluf-label">{t('Analist değerlendirmesi')}</div>
                  <textarea
                    className="rp-assessment no-print"
                    rows={5}
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    placeholder={t('Sonuç, değerlendirme ve öneriler (rapora basılır)…')}
                  />
                  <p className="rp-bluf-text print-only">{assessment || '—'}</p>
                  <div className="rp-bluf-conf">
                    <span>{t('Güven düzeyi')}</span>
                    <select className="no-print" value={confidence} onChange={(e) => setConfidence(e.target.value)}>
                      <option value="">{t('Belirtilmedi')}</option>
                      {ASSESSMENT_CONFIDENCE.map((o) => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                    <span className="print-only">
                      {conf ? <Chip color={conf.color} solid>{conf.label}</Chip> : <span className="rp-muted">{t('Belirtilmedi')}</span>}
                    </span>
                  </div>
                </div>

                <div className="rp-two">
                  <div>
                    <h3 className="rp-h3">{t('Dosya özeti')}</h3>
                    <p className="rp-text">{ci.summary || <i className="rp-muted">{t('Özet girilmemiş.')}</i>}</p>
                    {project.target?.notes && (
                      <>
                        <h3 className="rp-h3">{t('Hedef notları')}</h3>
                        <p className="rp-text">{project.target.notes}</p>
                      </>
                    )}
                  </div>
                  {subjects.length > 0 && (
                    <div>
                      <h3 className="rp-h3">{t('Şahıslar')}</h3>
                      <ul className="rp-mini-list">
                        {subjects.map((s) => {
                          const role = findOption(SUBJECT_ROLES, s.fields?.role);
                          const threat = findOption(THREAT_LEVELS, s.fields?.threat);
                          return (
                            <li key={s.id}>
                              <RBadge typeKey="subject" photo={getAvatarPhoto(s)} size={30} />
                              <div>
                                <b>{getDisplayLabel(s)}</b>
                                <div className="rp-mini-chips">
                                  {role && <Chip color={role.color}>{role.label}</Chip>}
                                  {threat && threat.key !== 'yok' && <Chip color={threat.color} solid>{t('Tehdit:')} {threat.label}</Chip>}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* ---- PROFİLLER --------------------------------------------------- */}
            {on('profiles') && subjects.length > 0 && (
              <section className="rp-section rp-page-start">
                {H('profiles', 'Şahıs profilleri', t('{0} şahıs · {1} fotoğraf', { 0: subjects.length, 1: subjects.reduce((n, s) => n + (s.photos?.length ?? 0), 0) }))}
                {subjects.map((s, idx) => {
                  const def = getTypeDef('subject');
                  const role = findOption(SUBJECT_ROLES, s.fields?.role);
                  const threat = findOption(THREAT_LEVELS, s.fields?.threat);
                  const photos = sortedPhotos(s);
                  const primaries = photos.filter((p) => p.primary);
                  const main = primaries[0] ?? null;
                  const morePrimary = primaries.slice(1);
                  const rest = photos.filter((p) => !p.primary);
                  const nb = neighborsOf(s.id).sort((a, b) => catOrder(a.other.type) - catOrder(b.other.type));
                  const kvKeys = ['aliases', 'dob', 'birthPlace', 'nationality', 'idNumber', 'occupation'];
                  return (
                    <article className="rp-profile" key={s.id} style={role ? { '--role': role.color } : undefined}>
                      <div className="rp-profile-top">
                        <div className="rp-profile-photos">
                          <div className="rp-frame-corners big">
                            {main ? <img src={main.dataUrl} alt="" /> : <div className="rp-photo-none"><SilhouetteSvg /><span>{t('Fotoğraf yok')}</span></div>}
                          </div>
                          {main?.caption && <div className="rp-cap">{main.caption}</div>}
                          {morePrimary.length > 0 && (
                            <div className="rp-profile-more">
                              {morePrimary.map((p) => (
                                <img key={p.id} src={p.dataUrl} alt="" title={p.caption || ''} />
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="rp-profile-info">
                          <div className="rp-profile-kicker">
                            <span>{t('ŞAHIS')} {String(idx + 1).padStart(2, '0')}</span>
                            <RelTag r={s.reliability} />
                          </div>
                          <h3 className="rp-profile-name">{getDisplayLabel(s)}</h3>
                          <div className="rp-profile-chips">
                            {role && <Chip color={role.color}>{role.label}</Chip>}
                            {threat && <Chip color={threat.color} solid>{t('Tehdit:')} {threat.label}</Chip>}
                          </div>
                          <dl className="rp-kv">
                            {kvKeys.map((k) => {
                              const f = def.fields.find((x) => x.key === k);
                              return (
                                <div key={k}>
                                  <dt>{f.label}</dt>
                                  <dd className={f.type === 'date' ? 'mono' : ''}><FieldVal field={f} value={s.fields?.[k]} /></dd>
                                </div>
                              );
                            })}
                          </dl>
                          {s.fields?.description && (
                            <div className="rp-profile-desc">
                              <span>{def.fields.find((x) => x.key === 'description').label}</span>
                              <p>{s.fields.description}</p>
                            </div>
                          )}
                          {s.reliability?.sourceNote && (
                            <div className="rp-profile-src">{t('Kaynak:')} {s.reliability.sourceNote}</div>
                          )}
                          {s.notes && (
                            <div className="rp-profile-desc">
                              <span>{t('Notlar')}</span>
                              <p>{s.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {nb.length > 0 && (
                        <div className="rp-profile-block">
                          <h4>{t('Bağlı tanımlayıcılar')} <span>{nb.length}</span></h4>
                          <div className="rp-links-grid">
                            {nb.map(({ c, other }) => {
                              const cf = findOption(LINK_CONFIDENCE, c.confidence) ?? LINK_CONFIDENCE[0];
                              return (
                                <div className={`rp-link conf-${cf.key}`} key={c.id}>
                                  <RBadge typeKey={other.type} photo={getAvatarPhoto(other)} size={26} />
                                  <div className="rp-link-body">
                                    <span className="rp-link-type">{getTypeDef(other.type).label}{c.label && <span className="rp-link-rel"> · {c.label}</span>}</span>
                                    <b><Label i={other} /></b>
                                    {secondaryText(other) && <span className="rp-link-sec">{secondaryText(other)}</span>}
                                  </div>
                                  <RelTag r={other.reliability} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {rest.length > 0 && (
                        <div className="rp-profile-block">
                          <h4>{t('Diğer fotoğraflar')} <span>{rest.length}</span></h4>
                          <div className="rp-gallery">
                            {rest.map((p) => (
                              <figure key={p.id}>
                                <img src={p.dataUrl} alt="" />
                                <figcaption>
                                  {p.caption && <b>{p.caption}</b>}
                                  <span className="mono">
                                    {[p.takenAt && fmtDate(p.takenAt), p.source].filter(Boolean).join(' · ') || p.fileName}
                                  </span>
                                </figcaption>
                              </figure>
                            ))}
                          </div>
                        </div>
                      )}

                    </article>
                  );
                })}
              </section>
            )}

            {/* ---- TANIMLAYICILAR ----------------------------------------------------- */}
            {on('identifiers') && others.length > 0 && (
              <section className="rp-section rp-page-start">
                {H('identifiers', 'Tanımlayıcılar', t('{0} kayıt · {1} kategori', { 0: others.length, 1: othersByCat.length }))}
                {othersByCat.map(([cat, list]) => (
                  <div key={cat} className="rp-cat">
                    <h3 className="rp-h3 rp-cat-title">{CATEGORIES[cat]?.label ?? cat} <span>{list.length}</span></h3>
                    <table className="rp-table">
                      <thead>
                        <tr>
                          <th style={{ width: '24%' }}>{t('Değer')}</th>
                          <th>{t('Ayrıntı')}</th>
                          <th style={{ width: '17%' }}>{t('Kaynak')}</th>
                          <th style={{ width: '7%' }}>{t('Değ.')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((i) => {
                          const fs = identFields(i);
                          const ph = i.photos ?? [];
                          return (
                            <tr key={i.id}>
                              <td>
                                <div className="rp-id-cell">
                                  <RBadge typeKey={i.type} photo={getAvatarPhoto(i)} size={24} />
                                  <div>
                                    <span className="rp-id-type">{getTypeDef(i.type).label}</span>
                                    <b className="rp-id-val"><Label i={i} /></b>
                                  </div>
                                </div>
                              </td>
                              <td className="small">
                                {fs.length > 0 && (
                                  <div className="rp-fields">
                                    {fs.map((f) => (
                                      <span key={f.key}>
                                        <em>{f.label}</em> <FieldVal field={f} value={i.fields[f.key]} />
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {i.notes && <div className="rp-muted rp-note">{i.notes}</div>}
                                {ph.length > 0 && (
                                  <div className="rp-thumbs">
                                    {ph.slice(0, 6).map((p) => <img key={p.id} src={p.dataUrl} alt="" />)}
                                    {ph.length > 6 && <span>+{ph.length - 6}</span>}
                                  </div>
                                )}
                              </td>
                              <td className="small rp-break">{i.reliability?.sourceNote || '—'}</td>
                              <td><RelTag r={i.reliability} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </section>
            )}

            {/* ---- AĞ ------------------------------------------------------------------ */}
            {on('graph') && graph.svg && (
              <section className="rp-section rp-page-start rp-break-avoid">
                {H('graph', 'Bağlantı ağı şeması', t('{0} düğüm · {1} bağlantı', { 0: idents.length, 1: conns.length }))}
                <div className="rp-graph" dangerouslySetInnerHTML={{ __html: graph.svg }} />
                <div className="rp-legend-line">
                  <span><i className="ln solid" /> {t('kesin')}</span>
                  <span><i className="ln dash" /> {t('muhtemel')}</span>
                  <span><i className="ln dot" /> {t('şüpheli / teyitsiz')}</span>
                  <span className="rp-muted">{t('Köşeli parantezdeki kod kaynak değerlendirmesidir (Admiralty).')}</span>
                </div>
              </section>
            )}

            {/* ---- BAĞLANTILAR ------------------------------------------------------------- */}
            {on('links') && conns.length > 0 && (
              <section className="rp-section">
                {H('links', 'Bağlantı listesi')}
                <table className="rp-table">
                  <thead><tr><th style={{ width: '5%' }}>#</th><th>{t('Taraf A')}</th><th>{t('İlişki')}</th><th>{t('Taraf B')}</th><th style={{ width: '16%' }}>{t('Teyit')}</th></tr></thead>
                  <tbody>
                    {conns.map((c, n) => {
                      const a = identById.get(c.source);
                      const b = identById.get(c.target);
                      const cf = findOption(LINK_CONFIDENCE, c.confidence) ?? LINK_CONFIDENCE[0];
                      return (
                        <tr key={c.id}>
                          <td className="mono rp-muted">{n + 1}</td>
                          <td><div className="rp-id-cell tight">{a && <RBadge typeKey={a.type} photo={getAvatarPhoto(a)} size={18} />}<span><Label i={a} /></span></div></td>
                          <td>{c.label || '—'}{c.note && <div className="small rp-muted">{c.note}</div>}</td>
                          <td><div className="rp-id-cell tight">{b && <RBadge typeKey={b.type} photo={getAvatarPhoto(b)} size={18} />}<span><Label i={b} /></span></div></td>
                          <td><span className={`rp-conf conf-${cf.key}`}><i />{cf.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}

            {/* ---- KONUMLAR ------------------------------------------------------------------ */}
            {on('locations') && pins.length > 0 && (
              <section className="rp-section">
                {H('locations', 'Konumlar ve kroki')}
                <div className="rp-break-avoid">
                  <LocationSketch pins={pins} connect={project.mapDisplay?.showPinConnections} />
                </div>
                <table className="rp-table">
                  <thead><tr><th style={{ width: '5%' }}>#</th><th>{t('Ad / adres')}</th><th style={{ width: '17%' }}>{t('Koordinat')}</th><th style={{ width: '16%' }}>{t('Ziyaret')}</th><th>{t('İlişkili')}</th></tr></thead>
                  <tbody>
                    {pins.map((p, idx) => {
                      const c = getPinColor(p.color);
                      const linked = (project.pinLinks ?? [])
                        .filter((l) => l.pinId === p.id)
                        .map((l) => {
                          const i = identById.get(l.identifierId);
                          return i ? `${labelText(i)}${l.context ? ` (${l.context})` : ''}` : null;
                        })
                        .filter(Boolean);
                      return (
                        <tr key={p.id}>
                          <td><span className="rp-pin" style={{ background: c.bg, color: c.glyph, borderColor: c.border }}>{idx + 1}</span></td>
                          <td><b>{p.label || '—'}</b>{p.address && <div className="small rp-muted">{p.address}</div>}{p.notes && <div className="small">{p.notes}</div>}</td>
                          <td className="mono small nowrap">{p.lat.toFixed(6)}<br />{p.lng.toFixed(6)}{p.radius > 0 && <div className="rp-muted">r = {p.radius} m</div>}</td>
                          <td className="small">{p.visitedAt || '—'}{(p.sightings?.length ?? 0) > 0 && <div className="rp-muted">{p.sightings.length} {t('görülme kaydı')}</div>}</td>
                          <td className="small">{linked.join(', ') || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}

            {/* ---- KRONOLOJİ ------------------------------------------------------------------ */}
            {on('timeline') && timeline.length > 0 && (
              <section className="rp-section">
                {H('timeline', 'Kronoloji', t('{0} kayıt', { 0: timeline.length }))}
                <ol className="rp-tl">
                  {timeline.map((it) => {
                    const related = it.identifierIds.map((id) => identById.get(id)).filter(Boolean);
                    return (
                      <li key={it.id} style={{ '--c': it.color }}>
                        <div className="rp-tl-date mono">
                          <b>{fmtShortDate(it.date)}</b>
                          {it.time && <span>{it.time}</span>}
                        </div>
                        <div className="rp-tl-dot" />
                        <div className="rp-tl-card">
                          <div className="rp-tl-head">
                            <span className="rp-tl-cat">{it.category}</span>
                            <RelTag r={it.reliability} />
                          </div>
                          <b className="rp-tl-title">{it.title}</b>
                          {it.description && <p>{it.description}</p>}
                          {related.length > 0 && (
                            <div className="rp-tl-rel">
                              {related.map((r) => (
                                <span key={r.id}><RBadge typeKey={r.type} photo={getAvatarPhoto(r)} size={14} /> <Label i={r} /></span>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {/* ---- DELİLLER ------------------------------------------------------------------- */}
            {on('evidence') && evidence.length > 0 && (
              <section className="rp-section">
                {H('evidence', 'Deliller', t('{0} delil', { 0: evidence.length }))}
                <table className="rp-table">
                  <thead><tr><th style={{ width: '10%' }}>{t('No')}</th><th>{t('Delil')}</th><th style={{ width: '30%' }}>{t('SHA-256')}</th><th style={{ width: '16%' }}>{t('Kayıt')}</th><th style={{ width: '12%' }}>{t('Doğrulama')}</th></tr></thead>
                  <tbody>
                    {evidence.map((e) => {
                      const v = (e.verifications ?? []).slice(-1)[0];
                      const img = e.dataUrl && e.mimeType?.startsWith('image/');
                      return (
                        <tr key={e.id}>
                          <td className="mono nowrap"><b>{e.number}</b></td>
                          <td>
                            <div className="rp-ev">
                              {img && <img src={e.dataUrl} alt="" />}
                              <div>
                                <b>{e.title || e.fileName}</b>
                                <div className="small rp-muted">{e.fileName} · {fmtBytes(e.size)}</div>
                                {e.source && <div className="small">{t('Kaynak:')} {e.source}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="mono hash">{e.sha256}</td>
                          <td className="small">{fmtDateTime(e.addedAt)}<div className="rp-muted">{e.addedBy}</div></td>
                          <td className="small">{v ? <span className={v.ok ? 'rp-ok' : 'rp-bad'}>{v.ok ? t('Eşleşti') : t('EŞLEŞMEDİ')}</span> : '—'}{v && <div className="rp-muted mono">{fmtDateTime(v.ts)}</div>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {evidence.some((e) => (e.custody?.length ?? 0) > 1) && (
                  <>
                    <h3 className="rp-h3">{t('Teslim zinciri')}</h3>
                    <table className="rp-table">
                      <thead><tr><th style={{ width: '10%' }}>{t('No')}</th><th style={{ width: '20%' }}>{t('Zaman')}</th><th>{t('İşlem')}</th><th>{t('Kişi')}</th><th>{t('Not')}</th></tr></thead>
                      <tbody>
                        {evidence.flatMap((e) =>
                          (e.custody ?? []).map((c) => (
                            <tr key={c.id}>
                              <td className="mono">{e.number}</td>
                              <td className="mono small nowrap">{fmtDateTime(c.ts)}</td>
                              <td>{t(c.action)}</td>
                              <td>{c.person}</td>
                              <td className="small">{c.note}</td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </>
                )}
              </section>
            )}

            {/* ---- İŞLEM KAYDI ---------------------------------------------------------------- */}
            {on('audit') && log.length > 0 && (
              <section className="rp-section">
                {H('audit', 'İşlem kaydı', t('{0} kayıt', { 0: log.length }))}
                <table className="rp-table dense">
                  <thead><tr><th style={{ width: '5%' }}>#</th><th style={{ width: '19%' }}>{t('Zaman')}</th><th style={{ width: '14%' }}>{t('Analist')}</th><th style={{ width: '20%' }}>{t('İşlem')}</th><th>{t('Ayrıntı')}</th></tr></thead>
                  <tbody>
                    {log.map((l, n) => (
                      <tr key={l.id}>
                        <td className="mono rp-muted">{n + 1}</td>
                        <td className="mono small nowrap">{fmtDateTime(l.ts)}</td>
                        <td className="small">{l.analyst}</td>
                        <td className="small">{t(l.action)}</td>
                        <td className="small rp-break">{l.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* ---- CETVEL --------------------------------------------------------------------- */}
            {on('legend') && (
              <section className="rp-section rp-break-avoid">
                {H('legend', 'Değerlendirme cetveli (NATO Admiralty)')}
                <div className="rp-legend">
                  <table className="rp-table">
                    <thead><tr><th colSpan={2}>{t('Kaynak güvenilirliği')}</th></tr></thead>
                    <tbody>
                      {SOURCE_RELIABILITY.map((o) => {
                        const [code, ...rest] = o.label.split(': ');
                        return <tr key={o.key}><td className="mono" style={{ width: '12%' }}><b>{code}</b></td><td>{rest.join(': ')}</td></tr>;
                      })}
                    </tbody>
                  </table>
                  <table className="rp-table">
                    <thead><tr><th colSpan={2}>{t('Bilgi doğruluğu')}</th></tr></thead>
                    <tbody>
                      {INFO_CREDIBILITY.map((o) => {
                        const [code, ...rest] = o.label.split(': ');
                        return <tr key={o.key}><td className="mono" style={{ width: '12%' }}><b>{code}</b></td><td>{rest.join(': ')}</td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <footer className="rp-end">
              <div className="rp-end-mark">{t('Rapor sonu')}</div>
              <div className="rp-sign">
                <div>
                  <span>{t('Hazırlayan')}</span>
                  <b>{analyst}</b>
                </div>
                <div>
                  <span>{t('Tarih')}</span>
                  <b className="mono">{fmtDate(generatedAt)}</b>
                </div>
                <div>
                  <span>{t('İmza')}</span>
                  <b>&nbsp;</b>
                </div>
              </div>
              <div className="rp-end-meta mono">
                {t('OSINT Case')} · {caseNo} · SHA-256 {fingerprint.slice(0, 32)}… · {idents.length} {t('tanımlayıcı')} · {photoCount} {t('fotoğraf')}
              </div>
            </footer>
          </div>
        </article>
      </div>
    </div>
  );
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
