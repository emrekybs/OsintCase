import { useEffect, useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import {
  CASE_STATUSES,
  INFO_CREDIBILITY,
  LINK_CONFIDENCE,
  PRIORITIES,
  SOURCE_RELIABILITY,
  SUBJECT_ROLES,
  THREAT_LEVELS,
  findOption,
  fmtBytes,
  fmtDate,
  fmtDateTime,
  getClassification,
} from '../caseModel.js';
import {
  formatFieldValue,
  getDisplayLabel,
  getPrimaryFieldKey,
  getTypeDef,
} from '../identifierTypes.js';
import { buildGraphSvg } from '../utils/graphExport.js';
import { buildTimeline, fmtShortDate } from '../utils/timeline.js';
import { sha256Hex } from '../utils/crypto.js';
import { getAnalyst } from '../utils/analyst.js';
import { getPinColor } from '../pinColors.js';
import './ReportView.css';

const SECTIONS = [
  { key: 'summary', label: 'Künye ve özet' },
  { key: 'subjects', label: 'Şahıslar' },
  { key: 'identifiers', label: 'Tanımlayıcılar' },
  { key: 'graph', label: 'Bağlantı ağı şeması' },
  { key: 'links', label: 'Bağlantı listesi' },
  { key: 'locations', label: 'Konumlar ve kroki' },
  { key: 'timeline', label: 'Kronoloji' },
  { key: 'evidence', label: 'Deliller' },
  { key: 'audit', label: 'İşlem kaydı' },
  { key: 'legend', label: 'Değerlendirme cetveli' },
];

function relCode(r) {
  if (!r || (!r.source && !r.info)) return '—';
  return `${r.source || '?'}${r.info || '?'}`;
}

/** Konumların basit kuşbakışı krokisi (harita karosu kullanmaz). */
function LocationSketch({ pins, connect }) {
  if (pins.length === 0) return null;
  const W = 640;
  const H = 360;
  const pad = 36;
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
  const pt = (p) => ({
    x: ox + (p.lng * k - minX) * scale,
    y: oy + (-p.lat - minY) * scale,
  });
  // Ölçek çubuğu: 1 derece enlem ≈ 111.32 km
  const kmPerUnit = 111.32;
  const targetPx = 120;
  const km = (targetPx / scale) * kmPerUnit;
  const nice = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find((n) => n >= km) ?? km;
  const barPx = (nice / kmPerUnit) * scale;
  const pts = pins.map(pt);
  return (
    <svg className="loc-sketch" viewBox={`0 0 ${W} ${H}`} width="100%">
      <rect width={W} height={H} fill="#fbfbf8" stroke="#bbb" />
      {[1, 2, 3].map((i) => (
        <g key={i} stroke="#e6e6df">
          <line x1={(W / 4) * i} y1="0" x2={(W / 4) * i} y2={H} />
          <line x1="0" y1={(H / 4) * i} x2={W} y2={(H / 4) * i} />
        </g>
      ))}
      {connect && pts.length > 1 && (
        <polyline
          points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#b3261e"
          strokeWidth="1.5"
          strokeDasharray="6 4"
        />
      )}
      {pins.map((p, i) => {
        const c = getPinColor(p.color);
        const q = pts[i];
        return (
          <g key={p.id}>
            <circle cx={q.x} cy={q.y} r="10" fill={c.bg} stroke={c.border} strokeWidth="1.5" />
            <text x={q.x} y={q.y + 4} fontSize="10" fontWeight="700" textAnchor="middle" fill={c.glyph}>
              {i + 1}
            </text>
          </g>
        );
      })}
      <g transform={`translate(${pad}, ${H - 18})`}>
        <line x1="0" y1="0" x2={barPx} y2="0" stroke="#333" strokeWidth="2" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="#333" />
        <line x1={barPx} y1="-4" x2={barPx} y2="4" stroke="#333" />
        <text x={barPx + 6} y="4" fontSize="10" fill="#333">
          {nice < 1 ? `${Math.round(nice * 1000)} m` : `${nice} km`}
        </text>
      </g>
      <g transform={`translate(${W - 24}, 28)`}>
        <path d="M0 -14 L6 4 L0 0 L-6 4 Z" fill="#333" />
        <text x="0" y="16" fontSize="10" textAnchor="middle" fill="#333">K</text>
      </g>
    </svg>
  );
}

export default function ReportView({ onClose }) {
  const { project, logAction, updateCaseMeta } = useProject();
  const [enabled, setEnabled] = useState(
    () => new Set(SECTIONS.map((s) => s.key).filter((k) => k !== 'audit')),
  );
  const [assessment, setAssessment] = useState(project.caseInfo?.assessment ?? '');
  const [fingerprint, setFingerprint] = useState('');
  const [generatedAt] = useState(() => new Date().toISOString());
  const analyst = getAnalyst() || project.caseInfo?.investigator || '—';

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
  const graph = useMemo(() => buildGraphSvg(project, { theme: 'light', banner: false }), [project]);
  const identById = useMemo(() => new Map(idents.map((i) => [i.id, i])), [idents]);

  const on = (k) => enabled.has(k);
  const toggle = (k) =>
    setEnabled((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const handlePrint = () => {
    if ((project.caseInfo?.assessment ?? '') !== assessment) {
      updateCaseMeta({ caseInfo: { assessment } });
    }
    logAction(
      'Rapor oluşturuldu',
      `${SECTIONS.filter((s) => on(s.key)).map((s) => s.label).join(', ')} · parmak izi ${fingerprint.slice(0, 16)}…`,
    );
    // Tarayıcı PDF dosya adını sayfa başlığından alır.
    const prevTitle = document.title;
    document.title = `${(ci.caseNumber || project.name).replace(/[\\/:*?"<>|]+/g, '_')}_rapor`;
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(() => window.print(), 50);
  };

  let sectionNo = 0;
  const H = (title) => {
    sectionNo += 1;
    return (
      <h2 className="rp-h2">
        <span className="rp-no">{sectionNo}.</span> {title}
      </h2>
    );
  };

  const identFieldsText = (i) => {
    const def = getTypeDef(i.type);
    const pk = getPrimaryFieldKey(i.type);
    return def.fields
      .filter((f) => f.key !== pk && i.fields?.[f.key])
      .map((f) => `${f.label}: ${formatFieldValue(f, i.fields[f.key])}`)
      .join(' · ');
  };

  return (
    <div className="report-overlay">
      <div className="report-toolbar no-print">
        <div className="report-toolbar-left">
          <strong>Rapor önizleme</strong>
          <span className="dim">Yazdır penceresinde “PDF olarak kaydet” seçin.</span>
        </div>
        <div className="report-sections">
          {SECTIONS.map((s) => (
            <label key={s.key} className="check-row compact">
              <input type="checkbox" checked={on(s.key)} onChange={() => toggle(s.key)} />
              <span>{s.label}</span>
            </label>
          ))}
        </div>
        <div className="report-toolbar-right">
          <button className="btn btn-ghost" onClick={onClose}>Kapat</button>
          <button className="btn btn-primary" onClick={handlePrint}>Yazdır / PDF</button>
        </div>
      </div>

      <div className="report-scroll">
        <article className="report-paper" id="report-print-root">
          {/* thead/tfoot yazdırmada her sayfada tekrarlanır: gizlilik bandı
              her sayfanın üstünde ve altında görünür. */}
          <table className="rp-frame">
            <thead>
              <tr>
                <td>
                  <div className="rp-band" style={{ background: cls.color, color: cls.text }}>
                    {cls.label}
                  </div>
                </td>
              </tr>
            </thead>
            <tfoot>
              <tr>
                <td>
                  <div className="rp-band" style={{ background: cls.color, color: cls.text }}>
                    {cls.label} · {ci.caseNumber || project.name}
                  </div>
                </td>
              </tr>
            </tfoot>
            <tbody>
              <tr>
                <td className="rp-body">

          <header className="rp-cover">
            <div className="rp-kicker">İSTİHBARAT / SORUŞTURMA RAPORU</div>
            <h1>{project.name}</h1>
            <table className="rp-kv">
              <tbody>
                <tr><th>Dosya no</th><td className="mono">{ci.caseNumber || '—'}</td><th>Gizlilik</th><td><b>{cls.label}</b></td></tr>
                <tr><th>Durum</th><td>{findOption(CASE_STATUSES, ci.status)?.label ?? '—'}</td><th>Öncelik</th><td>{findOption(PRIORITIES, ci.priority)?.label ?? '—'}</td></tr>
                <tr><th>Soruşturmacı</th><td>{ci.investigator || '—'}</td><th>Birim</th><td>{ci.unit || '—'}</td></tr>
                <tr><th>Açılış</th><td>{ci.openedAt ? fmtDate(ci.openedAt) : fmtDate(project.createdAt)}</td><th>Ana hedef</th><td>{project.target?.name || '—'}</td></tr>
                <tr><th>Hukuki dayanak</th><td colSpan={3}>{ci.legalBasis || '—'}</td></tr>
                <tr><th>Rapor tarihi</th><td className="mono">{fmtDateTime(generatedAt)}</td><th>Hazırlayan</th><td>{analyst}</td></tr>
                <tr><th>Dosya parmak izi</th><td colSpan={3} className="mono small">SHA-256 {fingerprint || '…'}</td></tr>
              </tbody>
            </table>
            <div className="rp-counts">
              <span><b>{subjects.length}</b> şahıs</span>
              <span><b>{idents.length}</b> tanımlayıcı</span>
              <span><b>{conns.length}</b> bağlantı</span>
              <span><b>{pins.length}</b> konum</span>
              <span><b>{timeline.length}</b> kronoloji kaydı</span>
              <span><b>{evidence.length}</b> delil</span>
            </div>
          </header>

          {on('summary') && (
            <section className="rp-section">
              {H('Dosya özeti')}
              <p className="rp-text">{ci.summary || <i className="dim">Özet girilmemiş.</i>}</p>
              {project.target?.notes && (
                <>
                  <h3 className="rp-h3">Hedef notları</h3>
                  <p className="rp-text">{project.target.notes}</p>
                </>
              )}
              <h3 className="rp-h3">Analist değerlendirmesi</h3>
              <textarea
                className="rp-assessment no-print"
                rows={5}
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                placeholder="Sonuç, değerlendirme ve öneriler (rapora basılır)…"
              />
              <p className="rp-text print-only">{assessment || '—'}</p>
            </section>
          )}

          {on('subjects') && subjects.length > 0 && (
            <section className="rp-section">
              {H('Şahıslar')}
              <table className="rp-table">
                <thead>
                  <tr><th>Ad soyad</th><th>Rol</th><th>Tehdit</th><th>Kod adı</th><th>Doğum</th><th>Uyruk</th><th>Değ.</th></tr>
                </thead>
                <tbody>
                  {subjects.map((s) => {
                    const role = findOption(SUBJECT_ROLES, s.fields?.role);
                    const threat = findOption(THREAT_LEVELS, s.fields?.threat);
                    return (
                      <tr key={s.id}>
                        <td><b>{getDisplayLabel(s)}</b>{s.fields?.occupation && <div className="small dim">{s.fields.occupation}</div>}</td>
                        <td>{role?.label ?? '—'}</td>
                        <td>{threat?.label ?? '—'}</td>
                        <td>{s.fields?.aliases || '—'}</td>
                        <td className="mono">{s.fields?.dob ? fmtDate(s.fields.dob) : '—'}</td>
                        <td>{s.fields?.nationality || '—'}</td>
                        <td className="mono">{relCode(s.reliability)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {on('identifiers') && others.length > 0 && (
            <section className="rp-section">
              {H('Tanımlayıcılar')}
              <table className="rp-table">
                <thead>
                  <tr><th>Tür</th><th>Değer</th><th>Ayrıntı</th><th>Kaynak</th><th>Değ.</th></tr>
                </thead>
                <tbody>
                  {others.map((i) => (
                    <tr key={i.id}>
                      <td className="nowrap">{getTypeDef(i.type).label}</td>
                      <td><b>{getDisplayLabel(i)}</b></td>
                      <td className="small">{identFieldsText(i)}{i.notes && <div className="dim">{i.notes}</div>}</td>
                      <td className="small">{i.reliability?.sourceNote || '—'}</td>
                      <td className="mono">{relCode(i.reliability)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {on('graph') && graph.svg && (
            <section className="rp-section rp-break-avoid">
              {H('Bağlantı ağı şeması')}
              <div className="rp-graph" dangerouslySetInnerHTML={{ __html: graph.svg }} />
              <p className="small dim">
                Düz çizgi: kesin · kesikli: muhtemel · noktalı: şüpheli/teyitsiz. Köşeli parantezdeki kod
                kaynak değerlendirmesidir.
              </p>
            </section>
          )}

          {on('links') && conns.length > 0 && (
            <section className="rp-section">
              {H('Bağlantı listesi')}
              <table className="rp-table">
                <thead><tr><th>#</th><th>Taraf A</th><th>İlişki</th><th>Taraf B</th><th>Teyit</th></tr></thead>
                <tbody>
                  {conns.map((c, n) => (
                    <tr key={c.id}>
                      <td className="mono dim">{n + 1}</td>
                      <td>{getDisplayLabel(identById.get(c.source))}</td>
                      <td>{c.label || '—'}{c.note && <div className="small dim">{c.note}</div>}</td>
                      <td>{getDisplayLabel(identById.get(c.target))}</td>
                      <td>{findOption(LINK_CONFIDENCE, c.confidence)?.label ?? 'Kesin (doğrulandı)'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {on('locations') && pins.length > 0 && (
            <section className="rp-section">
              {H('Konumlar')}
              <LocationSketch pins={pins} connect={project.mapDisplay?.showPinConnections} />
              <table className="rp-table">
                <thead><tr><th>#</th><th>Ad / adres</th><th>Koordinat</th><th>Ziyaret</th><th>İlişkili</th></tr></thead>
                <tbody>
                  {pins.map((p, idx) => {
                    const linked = (project.pinLinks ?? [])
                      .filter((l) => l.pinId === p.id)
                      .map((l) => {
                        const i = identById.get(l.identifierId);
                        return i ? `${getDisplayLabel(i)}${l.context ? ` (${l.context})` : ''}` : null;
                      })
                      .filter(Boolean);
                    return (
                      <tr key={p.id}>
                        <td className="mono">{idx + 1}</td>
                        <td><b>{p.label || '—'}</b>{p.address && <div className="small dim">{p.address}</div>}{p.notes && <div className="small">{p.notes}</div>}</td>
                        <td className="mono small nowrap">{p.lat.toFixed(6)}<br />{p.lng.toFixed(6)}{p.radius > 0 && <div className="dim">r = {p.radius} m</div>}</td>
                        <td className="small">{p.visitedAt || '—'}{(p.sightings?.length ?? 0) > 0 && <div className="dim">{p.sightings.length} görülme kaydı</div>}</td>
                        <td className="small">{linked.join(', ') || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {on('timeline') && timeline.length > 0 && (
            <section className="rp-section">
              {H('Kronoloji')}
              <table className="rp-table">
                <thead><tr><th>Tarih</th><th>Tür</th><th>Olay</th><th>İlgili</th><th>Değ.</th></tr></thead>
                <tbody>
                  {timeline.map((t) => (
                    <tr key={t.id}>
                      <td className="mono nowrap">{fmtShortDate(t.date)}{t.time && <div className="dim">{t.time}</div>}</td>
                      <td className="nowrap">{t.category}</td>
                      <td><b>{t.title}</b>{t.description && <div className="small">{t.description}</div>}</td>
                      <td className="small">{t.identifierIds.map((id) => getDisplayLabel(identById.get(id))).filter(Boolean).join(', ') || '—'}</td>
                      <td className="mono">{relCode(t.reliability)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {on('evidence') && evidence.length > 0 && (
            <section className="rp-section">
              {H('Deliller')}
              <table className="rp-table">
                <thead><tr><th>No</th><th>Delil</th><th>SHA-256</th><th>Kayıt</th><th>Doğrulama</th></tr></thead>
                <tbody>
                  {evidence.map((e) => {
                    const v = (e.verifications ?? []).slice(-1)[0];
                    return (
                      <tr key={e.id}>
                        <td className="mono nowrap">{e.number}</td>
                        <td><b>{e.title || e.fileName}</b><div className="small dim">{e.fileName} · {fmtBytes(e.size)}</div>{e.source && <div className="small">Kaynak: {e.source}</div>}</td>
                        <td className="mono hash">{e.sha256}</td>
                        <td className="small">{fmtDateTime(e.addedAt)}<div className="dim">{e.addedBy}</div></td>
                        <td className="small">{v ? `${v.ok ? 'Eşleşti' : 'EŞLEŞMEDİ'} · ${fmtDateTime(v.ts)}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {evidence.some((e) => (e.custody?.length ?? 0) > 1) && (
                <>
                  <h3 className="rp-h3">Teslim zinciri</h3>
                  <table className="rp-table">
                    <thead><tr><th>No</th><th>Zaman</th><th>İşlem</th><th>Kişi</th><th>Not</th></tr></thead>
                    <tbody>
                      {evidence.flatMap((e) =>
                        (e.custody ?? []).map((c) => (
                          <tr key={c.id}>
                            <td className="mono">{e.number}</td>
                            <td className="mono small nowrap">{fmtDateTime(c.ts)}</td>
                            <td>{c.action}</td>
                            <td>{c.person}</td>
                            <td className="small">{c.note}</td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </>
              )}
              {evidence.some((e) => e.dataUrl && e.mimeType?.startsWith('image/')) && (
                <div className="rp-images">
                  {evidence
                    .filter((e) => e.dataUrl && e.mimeType?.startsWith('image/'))
                    .map((e) => (
                      <figure key={e.id}>
                        <img src={e.dataUrl} alt={e.title} />
                        <figcaption className="mono small">{e.number} · {e.title || e.fileName}</figcaption>
                      </figure>
                    ))}
                </div>
              )}
            </section>
          )}

          {on('audit') && log.length > 0 && (
            <section className="rp-section">
              {H('İşlem kaydı')}
              <table className="rp-table">
                <thead><tr><th>#</th><th>Zaman</th><th>Analist</th><th>İşlem</th><th>Ayrıntı</th></tr></thead>
                <tbody>
                  {log.map((l, n) => (
                    <tr key={l.id}>
                      <td className="mono dim">{n + 1}</td>
                      <td className="mono small nowrap">{fmtDateTime(l.ts)}</td>
                      <td className="small">{l.analyst}</td>
                      <td className="small nowrap">{l.action}</td>
                      <td className="small">{l.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {on('legend') && (
            <section className="rp-section rp-break-avoid">
              {H('Değerlendirme cetveli (NATO Admiralty)')}
              <div className="rp-legend">
                <table className="rp-table">
                  <thead><tr><th colSpan={2}>Kaynak güvenilirliği</th></tr></thead>
                  <tbody>
                    {SOURCE_RELIABILITY.map((o) => {
                      const [code, ...rest] = o.label.split(' — ');
                      return <tr key={o.key}><td className="mono">{code}</td><td>{rest.join(' — ')}</td></tr>;
                    })}
                  </tbody>
                </table>
                <table className="rp-table">
                  <thead><tr><th colSpan={2}>Bilgi doğruluğu</th></tr></thead>
                  <tbody>
                    {INFO_CREDIBILITY.map((o) => {
                      const [code, ...rest] = o.label.split(' — ');
                      return <tr key={o.key}><td className="mono">{code}</td><td>{rest.join(' — ')}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <footer className="rp-end">
            <div>— Rapor sonu —</div>
            <div className="rp-sign">
              <div>
                <span>Hazırlayan</span>
                <b>{analyst}</b>
              </div>
              <div>
                <span>İmza</span>
                <b>&nbsp;</b>
              </div>
            </div>
          </footer>
                </td>
              </tr>
            </tbody>
          </table>
        </article>
      </div>
    </div>
  );
}
