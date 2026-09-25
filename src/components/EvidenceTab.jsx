import { useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import { useNavigation } from '../context/NavigationContext.jsx';
import { sha256Hex } from '../utils/crypto.js';
import { getAnalyst } from '../utils/analyst.js';
import { triggerDownload } from '../utils/projectIO.js';
import {
  CUSTODY_ACTIONS,
  fmtBytes,
  fmtDate,
  fmtDateTime,
} from '../caseModel.js';
import {
  CATEGORIES,
  getDisplayLabel,
  getTypeDef,
} from '../identifierTypes.js';
import { getPinColor } from '../pinColors.js';
import IdentifierBadge from './IdentifierBadge.jsx';
import LinkPicker from './LinkPicker.jsx';
import './EvidenceTab.css';

const MAX_EMBED = 10 * 1024 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',');
  const mime = head.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function lastVerification(ev) {
  const v = ev.verifications ?? [];
  return v.length ? v[v.length - 1] : null;
}

export default function EvidenceTab() {
  const {
    project,
    addEvidence,
    updateEvidence,
    addCustodyEntry,
    recordVerification,
    deleteEvidence,
  } = useProject();
  const evidence = project.evidence ?? [];
  const [selectedId, setSelectedId] = useState(evidence[0]?.id ?? null);
  const [embed, setEmbed] = useState(true);
  const [busy, setBusy] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState(null); // yeni delil formu
  const [editing, setEditing] = useState(null);
  const [custodyFor, setCustodyFor] = useState(null);
  const [verifyMsg, setVerifyMsg] = useState(null);
  const [query, setQuery] = useState('');
  const fileRef = useRef(null);
  const verifyRef = useRef(null);

  // Yeni delil eklenince otomatik seç.
  const prevCount = useRef(evidence.length);
  useEffect(() => {
    if (evidence.length > prevCount.current) {
      setSelectedId(evidence[evidence.length - 1].id);
    }
    prevCount.current = evidence.length;
  }, [evidence]);

  const selected = evidence.find((e) => e.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    if (!q) return evidence;
    return evidence.filter((e) =>
      `${e.number} ${e.title} ${e.fileName} ${e.sha256} ${e.description}`
        .toLocaleLowerCase('tr')
        .includes(q),
    );
  }, [evidence, query]);

  const ingest = async (file) => {
    if (!file) return;
    setBusy(`${file.name} özetleniyor…`);
    try {
      const buf = await file.arrayBuffer();
      const hash = await sha256Hex(buf);
      const dup = evidence.find((e) => e.sha256 === hash);
      if (dup && !confirm(`Bu dosya zaten ${dup.number} olarak kayıtlı (aynı SHA-256). Yine de eklensin mi?`)) {
        setSelectedId(dup.id);
        return;
      }
      let dataUrl = null;
      if (embed && file.size <= MAX_EMBED) dataUrl = await readAsDataUrl(file);
      setPending({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        sha256: hash,
        dataUrl,
        embedSkipped: embed && file.size > MAX_EMBED,
        title: file.name.replace(/\.[^.]+$/, ''),
        description: '',
        source: '',
        acquiredAt: '',
        identifierIds: [],
        pinIds: [],
      });
    } catch (err) {
      alert(`Dosya okunamadı: ${err.message}`);
    } finally {
      setBusy('');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files[0]) ingest(files[0]);
  };

  const handleVerify = async (file) => {
    if (!file || !selected) return;
    setBusy('Doğrulanıyor…');
    try {
      const hash = await sha256Hex(await file.arrayBuffer());
      const ok = hash === selected.sha256;
      recordVerification(selected.id, { ok, fileName: file.name, sha256: hash });
      setVerifyMsg({ ok, hash, fileName: file.name });
    } finally {
      setBusy('');
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    const reason = prompt(
      `${selected.number} kayıttan çıkarılacak. İşlem kaydına düşülecek gerekçeyi yazın:`,
    );
    if (reason === null) return;
    deleteEvidence(selected.id, reason.trim());
    setSelectedId(null);
  };

  return (
    <div className="evidence-tab">
      <aside className="evidence-side">
        <div className="sidebar-header">
          <h3>Deliller <span className="count-pill">{evidence.length}</span></h3>
          <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
            + Delil
          </button>
        </div>
        <div
          className={`drop-zone ${dragOver ? 'over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>
          <span>{busy || 'Dosyayı sürükleyin ya da tıklayın'}</span>
        </div>
        <label className="check-row compact embed-toggle">
          <input type="checkbox" checked={embed} onChange={(e) => setEmbed(e.target.checked)} />
          <span>İçeriği dosyaya göm (≤ 10 MB)</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            ingest(f);
          }}
        />
        {evidence.length > 3 && (
          <div className="sidebar-search">
            <input type="search" placeholder="No, ad ya da özet ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        )}
        <ul className="evidence-list">
          {filtered.map((e) => {
            const v = lastVerification(e);
            return (
              <li key={e.id}>
                <button
                  type="button"
                  className={`evidence-row ${selectedId === e.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedId(e.id);
                    setVerifyMsg(null);
                  }}
                >
                  <span className="ev-no mono">{e.number}</span>
                  <span className="ev-row-body">
                    <span className="ev-row-title">{e.title || e.fileName}</span>
                    <span className="ev-row-meta mono">
                      {e.sha256.slice(0, 12)}… · {fmtBytes(e.size)}
                    </span>
                  </span>
                  {v && (
                    <span className={`ev-verify-dot ${v.ok ? 'ok' : 'bad'}`} title={v.ok ? 'Son doğrulama başarılı' : 'Son doğrulama BAŞARISIZ'} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {evidence.length === 0 && (
          <div className="empty-state">
            <p>Henüz delil yok.</p>
            <p className="empty-hint">
              Eklenen her dosyanın SHA-256 özeti alınır, kimin ne zaman eklediği teslim zincirine yazılır.
            </p>
          </div>
        )}
      </aside>

      <div className="evidence-main">
        {!selected ? (
          <div className="timeline-empty">
            <h3>Delil kasası</h3>
            <p>
              Ekran görüntüsü, belge, ses, video… Dosya bu cihazdan çıkmaz. Özet (hash) daha sonra
              aynı dosyanın değişmediğini kanıtlamak için kullanılır.
            </p>
          </div>
        ) : (
          <EvidenceDetail
            ev={selected}
            project={project}
            onEdit={() => setEditing(selected)}
            onVerifyClick={() => verifyRef.current?.click()}
            onCustody={() => setCustodyFor(selected)}
            onDelete={handleDelete}
            verifyMsg={verifyMsg}
          />
        )}
        <input
          ref={verifyRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            handleVerify(f);
          }}
        />
      </div>

      {pending && (
        <EvidenceForm
          initial={pending}
          isNew
          onClose={() => setPending(null)}
          onSave={(data) => {
            addEvidence(data);
            setPending(null);
            setVerifyMsg(null);
          }}
        />
      )}
      {editing && (
        <EvidenceForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => {
            updateEvidence(editing.id, {
              title: data.title,
              description: data.description,
              source: data.source,
              acquiredAt: data.acquiredAt,
              identifierIds: data.identifierIds,
              pinIds: data.pinIds,
            });
            setEditing(null);
          }}
        />
      )}
      {custodyFor && (
        <CustodyForm
          ev={custodyFor}
          onClose={() => setCustodyFor(null)}
          onSave={(entry) => {
            addCustodyEntry(custodyFor.id, entry);
            setCustodyFor(null);
          }}
        />
      )}
    </div>
  );
}

function EvidenceDetail({ ev, project, onEdit, onVerifyClick, onCustody, onDelete, verifyMsg }) {
  const { navigateToIdentifier, navigateToPin } = useNavigation();
  const [copied, setCopied] = useState(false);
  const isImage = ev.dataUrl && ev.mimeType?.startsWith('image/');
  const v = lastVerification(ev);

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(ev.sha256);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <div className="ev-detail">
      <div className="ev-detail-head">
        <div>
          <div className="modal-kicker mono">{ev.number}</div>
          <h2>{ev.title || ev.fileName}</h2>
          <div className="ev-sub">
            {ev.fileName} · {ev.mimeType || 'bilinmeyen tür'} · {fmtBytes(ev.size)}
            {!ev.dataUrl && <span className="warn-text"> · içerik gömülü değil (yalnızca özet)</span>}
          </div>
        </div>
        <div className="ev-actions">
          <button className="btn btn-secondary btn-sm" onClick={onVerifyClick} title="Elinizdeki dosyanın bu kayıtla aynı olduğunu doğrulayın">
            Doğrula
          </button>
          {ev.dataUrl && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => triggerDownload(dataUrlToBlob(ev.dataUrl), ev.fileName || `${ev.number}`)}
            >
              İndir
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={onCustody}>
            Teslim kaydı
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>
            Düzenle
          </button>
          <button className="btn btn-ghost btn-sm danger" onClick={onDelete}>
            Kayıttan çıkar
          </button>
        </div>
      </div>

      {verifyMsg && (
        <div className={`verify-banner ${verifyMsg.ok ? 'ok' : 'bad'}`}>
          <strong>{verifyMsg.ok ? 'DOĞRULANDI' : 'EŞLEŞMEDİ'}</strong>
          <span>
            {verifyMsg.fileName} —{' '}
            {verifyMsg.ok
              ? 'SHA-256 özeti kayıttaki değerle birebir aynı. Dosya değiştirilmemiş.'
              : 'SHA-256 özeti kayıttakinden farklı. Dosya değiştirilmiş ya da farklı bir dosya.'}
          </span>
          {!verifyMsg.ok && <code className="mono">{verifyMsg.hash}</code>}
        </div>
      )}

      <div className="hash-box">
        <div className="hash-label">SHA-256</div>
        <code className="hash-value mono">{ev.sha256}</code>
        <button type="button" className="btn btn-ghost btn-sm" onClick={copyHash}>
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>

      <div className="ev-grid">
        <div className="kv">
          <span>Kayda alan</span>
          <b>{ev.addedBy}</b>
        </div>
        <div className="kv">
          <span>Kayıt zamanı</span>
          <b className="mono">{fmtDateTime(ev.addedAt)}</b>
        </div>
        <div className="kv">
          <span>Elde edilme</span>
          <b>{ev.acquiredAt ? fmtDate(ev.acquiredAt) : '—'}</b>
        </div>
        <div className="kv">
          <span>Kaynak</span>
          <b>{ev.source || '—'}</b>
        </div>
        <div className="kv">
          <span>Son doğrulama</span>
          <b className={v ? (v.ok ? 'ok-text' : 'bad-text') : ''}>
            {v ? `${v.ok ? 'Başarılı' : 'BAŞARISIZ'} · ${fmtDateTime(v.ts)}` : 'Yapılmadı'}
          </b>
        </div>
      </div>

      {ev.description && <p className="ev-desc">{ev.description}</p>}

      {((ev.identifierIds?.length ?? 0) > 0 || (ev.pinIds?.length ?? 0) > 0) && (
        <div className="ev-links">
          {(ev.identifierIds ?? []).map((id) => {
            const i = project.identifiers.find((x) => x.id === id);
            if (!i) return null;
            return (
              <button key={id} type="button" className="tl-link" onClick={() => navigateToIdentifier(id)}>
                <IdentifierBadge typeKey={i.type} customIconId={i.customIconId} size="sm" />
                {getDisplayLabel(i)}
              </button>
            );
          })}
          {(ev.pinIds ?? []).map((id) => {
            const idx = project.locations.findIndex((x) => x.id === id);
            if (idx < 0) return null;
            const p = project.locations[idx];
            return (
              <button key={id} type="button" className="tl-link" onClick={() => navigateToPin(id)}>
                <span className="tl-pin-no mono">{idx + 1}</span>
                {p.label || p.address || 'Konum'}
              </button>
            );
          })}
        </div>
      )}

      {isImage && (
        <div className="ev-preview">
          <img src={ev.dataUrl} alt={ev.title} />
        </div>
      )}

      <h4 className="section-title">Teslim zinciri</h4>
      <table className="data-table">
        <thead>
          <tr>
            <th>Zaman</th>
            <th>İşlem</th>
            <th>Kişi</th>
            <th>Not</th>
          </tr>
        </thead>
        <tbody>
          {(ev.custody ?? []).map((c) => (
            <tr key={c.id}>
              <td className="mono nowrap">{fmtDateTime(c.ts)}</td>
              <td>{c.action}</td>
              <td>{c.person}</td>
              <td className="wrap">{c.note}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {(ev.verifications?.length ?? 0) > 0 && (
        <>
          <h4 className="section-title">Doğrulama geçmişi</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Sonuç</th>
                <th>Dosya</th>
                <th>Analist</th>
              </tr>
            </thead>
            <tbody>
              {ev.verifications.map((vv) => (
                <tr key={vv.id}>
                  <td className="mono nowrap">{fmtDateTime(vv.ts)}</td>
                  <td className={vv.ok ? 'ok-text' : 'bad-text'}>{vv.ok ? 'Eşleşti' : 'EŞLEŞMEDİ'}</td>
                  <td className="wrap">{vv.fileName}</td>
                  <td>{vv.analyst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function EvidenceForm({ initial, isNew, onClose, onSave }) {
  const { project } = useProject();
  const [d, setD] = useState({ ...initial });
  const [picker, setPicker] = useState(null);
  const set = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }));
  const toggle = (k, id) =>
    setD((x) => {
      const s = new Set(x[k] ?? []);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return { ...x, [k]: Array.from(s) };
    });

  const identItems = (project.identifiers ?? []).map((i) => ({
    id: i.id,
    badge: <IdentifierBadge typeKey={i.type} customIconId={i.customIconId} size="sm" />,
    label: getDisplayLabel(i),
    secondary: getTypeDef(i.type).label,
    group: CATEGORIES[getTypeDef(i.type).category]?.label ?? 'Diğer',
  }));
  const pinItems = (project.locations ?? []).map((p, idx) => {
    const c = getPinColor(p.color);
    return {
      id: p.id,
      badge: (
        <span className="pin-mini-badge" style={{ background: c.bg, color: c.glyph, borderColor: c.border }}>
          {idx + 1}
        </span>
      ),
      label: p.label || p.address || `Konum ${idx + 1}`,
      secondary: `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`,
    };
  });

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal modal-wide"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...d, title: d.title.trim(), description: d.description.trim(), source: d.source.trim() });
        }}
      >
        <div className="modal-kicker">{isNew ? 'Yeni delil' : d.number}</div>
        <h2>{isNew ? 'Delili kayda al' : 'Delil bilgisi'}</h2>
        <div className="hash-box compact">
          <div className="hash-label">SHA-256</div>
          <code className="hash-value mono">{d.sha256}</code>
        </div>
        <p className="modal-sub">
          {d.fileName} · {fmtBytes(d.size)}
          {d.embedSkipped && ' · 10 MB üstü: içerik gömülmedi, yalnızca özet kaydedilecek'}
          {isNew && !d.dataUrl && !d.embedSkipped && ' · içerik gömülmeyecek, yalnızca özet'}
        </p>
        <div className="field">
          <label htmlFor="evf-title">Başlık</label>
          <input id="evf-title" autoFocus value={d.title} onChange={set('title')} />
        </div>
        <div className="field-row">
          <div className="field grow2">
            <label htmlFor="evf-src">Kaynak</label>
            <input id="evf-src" value={d.source} onChange={set('source')} placeholder="URL, cihaz, kişi, kurum…" />
          </div>
          <div className="field">
            <label htmlFor="evf-acq">Elde edilme tarihi</label>
            <input id="evf-acq" type="date" value={d.acquiredAt} onChange={set('acquiredAt')} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="evf-desc">Açıklama</label>
          <textarea id="evf-desc" rows={3} value={d.description} onChange={set('description')} />
        </div>
        <div className="field">
          <label>İlişkiler</label>
          <div className="link-chips">
            {(d.identifierIds ?? []).map((id) => {
              const i = project.identifiers.find((x) => x.id === id);
              return i ? (
                <span key={id} className="link-chip">
                  <span className="link-chip-body static"><span className="link-chip-text">{getDisplayLabel(i)}</span></span>
                  <button type="button" className="link-chip-remove" onClick={() => toggle('identifierIds', id)} aria-label="Kaldır">×</button>
                </span>
              ) : null;
            })}
            {(d.pinIds ?? []).map((id) => {
              const p = project.locations.find((x) => x.id === id);
              return p ? (
                <span key={id} className="link-chip">
                  <span className="link-chip-body static"><span className="link-chip-text">{p.label || p.address || 'Konum'}</span></span>
                  <button type="button" className="link-chip-remove" onClick={() => toggle('pinIds', id)} aria-label="Kaldır">×</button>
                </span>
              ) : null;
            })}
            <button type="button" className="link-chip-add" onClick={() => setPicker('ident')}>+ Tanımlayıcı</button>
            <button type="button" className="link-chip-add" onClick={() => setPicker('pin')}>+ Konum</button>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Vazgeç</button>
          <button type="submit" className="btn btn-primary">{isNew ? 'Kayda al' : 'Kaydet'}</button>
        </div>
      </form>
      {picker === 'ident' && (
        <LinkPicker
          title="Tanımlayıcı ilişkilendir"
          items={identItems}
          selectedIds={new Set(d.identifierIds ?? [])}
          onToggle={(id) => toggle('identifierIds', id)}
          onClose={() => setPicker(null)}
          emptyText="Henüz tanımlayıcı yok."
        />
      )}
      {picker === 'pin' && (
        <LinkPicker
          title="Konum ilişkilendir"
          items={pinItems}
          selectedIds={new Set(d.pinIds ?? [])}
          onToggle={(id) => toggle('pinIds', id)}
          onClose={() => setPicker(null)}
          emptyText="Henüz konum yok."
        />
      )}
    </div>
  );
}

function CustodyForm({ ev, onClose, onSave }) {
  const [action, setAction] = useState(CUSTODY_ACTIONS[0]);
  const [person, setPerson] = useState(getAnalyst());
  const [note, setNote] = useState('');
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ action, person: person.trim(), note: note.trim() });
        }}
      >
        <div className="modal-kicker mono">{ev.number}</div>
        <h2>Teslim zinciri kaydı</h2>
        <div className="field">
          <label htmlFor="cu-act">İşlem</label>
          <select id="cu-act" value={action} onChange={(e) => setAction(e.target.value)}>
            {CUSTODY_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="cu-person">Kişi</label>
          <input id="cu-person" value={person} onChange={(e) => setPerson(e.target.value)} placeholder="Teslim alan / eden" />
        </div>
        <div className="field">
          <label htmlFor="cu-note">Not</label>
          <textarea id="cu-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Muhafaza yeri, mühür no, tutanak no…" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Vazgeç</button>
          <button type="submit" className="btn btn-primary">Kaydet</button>
        </div>
      </form>
    </div>
  );
}
