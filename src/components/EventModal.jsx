import { useEffect, useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import {
  EVENT_CATEGORIES,
  INFO_CREDIBILITY,
  SOURCE_RELIABILITY,
} from '../caseModel.js';
import {
  CATEGORIES,
  getDisplayLabel,
  getTypeDef,
} from '../identifierTypes.js';
import { getPinColor } from '../pinColors.js';
import IdentifierBadge from './IdentifierBadge.jsx';
import LinkPicker from './LinkPicker.jsx';

/** Kronolojiye olay ekleme / düzenleme. */
export default function EventModal({ initial, onClose, onSave, onDelete }) {
  const { project } = useProject();
  const identifiers = project.identifiers ?? [];
  const pins = project.locations ?? [];
  const evidence = project.evidence ?? [];
  const [draft, setDraft] = useState(() => ({
    date: new Date().toISOString().slice(0, 10),
    time: '',
    category: 'olay',
    title: '',
    description: '',
    identifierIds: [],
    pinIds: [],
    evidenceIds: [],
    reliability: null,
    ...(initial ?? {}),
  }));
  const [picker, setPicker] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !picker && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, picker]);

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const toggleIn = (k, id) =>
    setDraft((d) => {
      const cur = new Set(d[k] ?? []);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      return { ...d, [k]: Array.from(cur) };
    });

  const identItems = useMemo(
    () =>
      identifiers.map((i) => ({
        id: i.id,
        badge: <IdentifierBadge typeKey={i.type} customIconId={i.customIconId} size="sm" />,
        label: getDisplayLabel(i),
        secondary: getTypeDef(i.type).label,
        group: CATEGORIES[getTypeDef(i.type).category]?.label ?? 'Diğer',
      })),
    [identifiers],
  );
  const pinItems = useMemo(
    () =>
      pins.map((p, idx) => {
        const c = getPinColor(p.color);
        return {
          id: p.id,
          badge: (
            <span className="pin-mini-badge" style={{ background: c.bg, color: c.glyph, borderColor: c.border }}>
              {idx + 1}
            </span>
          ),
          label: p.label?.trim() || p.address?.trim() || `Konum ${idx + 1}`,
          secondary: `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`,
        };
      }),
    [pins],
  );
  const evItems = useMemo(
    () =>
      evidence.map((e) => ({
        id: e.id,
        badge: <span className="ev-mini mono">{e.number}</span>,
        label: e.title || e.fileName,
        secondary: `SHA-256 ${e.sha256.slice(0, 12)}…`,
      })),
    [evidence],
  );

  const rel = draft.reliability ?? { source: '', info: '' };

  const submit = (e) => {
    e.preventDefault();
    if (!draft.title.trim()) {
      setError('Başlık zorunlu.');
      return;
    }
    onSave({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      reliability: rel.source || rel.info ? rel : null,
    });
  };

  const chip = (label, onRemove, key) => (
    <span key={key} className="link-chip">
      <span className="link-chip-body static">
        <span className="link-chip-text">{label}</span>
      </span>
      <button type="button" className="link-chip-remove" onClick={onRemove} aria-label="Kaldır">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </span>
  );

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal modal-wide" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header">
          <div>
            <div className="modal-kicker">Kronoloji</div>
            <h2>{initial?.id ? 'Olayı düzenle' : 'Yeni olay'}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="form-scroll">
          {error && <div className="form-error">{error}</div>}
          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-date">Tarih</label>
              <input id="ev-date" type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ev-time">Saat</label>
              <input id="ev-time" type="time" value={draft.time} onChange={(e) => set('time', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ev-cat">Tür</label>
              <select id="ev-cat" value={draft.category} onChange={(e) => set('category', e.target.value)}>
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="ev-title">Başlık</label>
            <input id="ev-title" autoFocus value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="ör. Şüpheli X ile Y kafede buluştu" />
          </div>
          <div className="field">
            <label htmlFor="ev-desc">Açıklama</label>
            <textarea id="ev-desc" rows={3} value={draft.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ev-rel-s">Kaynak güvenilirliği</label>
              <select id="ev-rel-s" value={rel.source ?? ''} onChange={(e) => set('reliability', { ...rel, source: e.target.value })}>
                <option value="">—</option>
                {SOURCE_RELIABILITY.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ev-rel-i">Bilgi doğruluğu</label>
              <select id="ev-rel-i" value={rel.info ?? ''} onChange={(e) => set('reliability', { ...rel, info: e.target.value })}>
                <option value="">—</option>
                {INFO_CREDIBILITY.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>İlişkili tanımlayıcılar</label>
            <div className="link-chips">
              {draft.identifierIds.map((id) => {
                const i = identifiers.find((x) => x.id === id);
                return i ? chip(getDisplayLabel(i), () => toggleIn('identifierIds', id), id) : null;
              })}
              <button type="button" className="link-chip-add" onClick={() => setPicker('ident')}>+ Tanımlayıcı</button>
            </div>
          </div>
          <div className="field">
            <label>İlişkili konumlar</label>
            <div className="link-chips">
              {draft.pinIds.map((id) => {
                const p = pins.find((x) => x.id === id);
                return p ? chip(p.label || p.address || 'Konum', () => toggleIn('pinIds', id), id) : null;
              })}
              <button type="button" className="link-chip-add" onClick={() => setPicker('pin')}>+ Konum</button>
            </div>
          </div>
          <div className="field">
            <label>İlişkili deliller</label>
            <div className="link-chips">
              {draft.evidenceIds.map((id) => {
                const ev = evidence.find((x) => x.id === id);
                return ev ? chip(`${ev.number} ${ev.title || ev.fileName}`, () => toggleIn('evidenceIds', id), id) : null;
              })}
              <button type="button" className="link-chip-add" onClick={() => setPicker('ev')}>+ Delil</button>
            </div>
          </div>
        </div>

        <div className="modal-actions modal-actions-spread">
          {initial?.id && onDelete ? (
            <button type="button" className="btn btn-ghost danger" onClick={onDelete}>
              Olayı sil
            </button>
          ) : (
            <span />
          )}
          <div className="modal-actions-right">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Vazgeç</button>
            <button type="submit" className="btn btn-primary">Kaydet</button>
          </div>
        </div>
      </form>

      {picker === 'ident' && (
        <LinkPicker
          title="Tanımlayıcı ilişkilendir"
          items={identItems}
          selectedIds={new Set(draft.identifierIds)}
          onToggle={(id) => toggleIn('identifierIds', id)}
          onClose={() => setPicker(null)}
          emptyText="Henüz tanımlayıcı yok."
        />
      )}
      {picker === 'pin' && (
        <LinkPicker
          title="Konum ilişkilendir"
          items={pinItems}
          selectedIds={new Set(draft.pinIds)}
          onToggle={(id) => toggleIn('pinIds', id)}
          onClose={() => setPicker(null)}
          emptyText="Henüz konum yok."
        />
      )}
      {picker === 'ev' && (
        <LinkPicker
          title="Delil ilişkilendir"
          items={evItems}
          selectedIds={new Set(draft.evidenceIds)}
          onToggle={(id) => toggleIn('evidenceIds', id)}
          onClose={() => setPicker(null)}
          emptyText="Henüz delil yok."
        />
      )}
    </div>
  );
}
