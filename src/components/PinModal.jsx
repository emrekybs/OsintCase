import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PIN_COLORS,
  DEFAULT_PIN_COLOR,
  getPinColor,
  isPresetColor,
} from '../pinColors.js';
import { BUILT_IN_MAP_ICONS, getMapIconSrc } from '../mapIcons.js';
import { useProject } from '../context/ProjectContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import {
  CATEGORIES,
  getDisplayLabel as getIdentifierDisplayLabel,
  getTypeDef,
} from '../identifierTypes.js';
import IdentifierBadge from './IdentifierBadge.jsx';
import LinkPicker from './LinkPicker.jsx';
import './PinModal.css';

const EMPTY = {
  label: '',
  address: '',
  visitedAt: '',
  withWho: '',
  notes: '',
  color: DEFAULT_PIN_COLOR,
  iconId: null,
  radius: 0,
  sightings: [],
};

const RADIUS_PRESETS = [0, 100, 250, 500, 1000, 2000, 5000];

export default function PinModal({ pin, onClose, onSave, onDelete }) {
  const { project, addPinLink, removePinLinkByPair, setPinLinkContext } =
    useProject();
  const { theme } = useTheme();
  const identifiers = project?.identifiers ?? [];
  const pinLinks = project?.pinLinks ?? [];

  const [draft, setDraft] = useState({ ...EMPTY, ...pin });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedChip, setExpandedChip] = useState(null);
  const pinColorInputRef = useRef(null);

  // Currently-linked identifier IDs → context (from project state).
  const currentLinkMap = useMemo(() => {
    const m = new Map();
    for (const l of pinLinks.filter((l) => l.pinId === pin?.id)) {
      m.set(l.identifierId, l.context ?? '');
    }
    return m;
  }, [pinLinks, pin?.id]);

  // Staged: Map<identifierId, context>. Committed on Save.
  const [staged, setStaged] = useState(() => new Map(currentLinkMap));

  useEffect(() => {
    setDraft({ ...EMPTY, ...pin });
    setStaged(new Map(currentLinkMap));
    setExpandedChip(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const change = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Diff staged vs currently-linked → commit link changes.
    if (pin?.id) {
      for (const [idtId, ctx] of staged) {
        if (!currentLinkMap.has(idtId)) {
          addPinLink(pin.id, idtId, ctx);
        } else if ((currentLinkMap.get(idtId) ?? '') !== (ctx ?? '')) {
          setPinLinkContext(pin.id, idtId, ctx);
        }
      }
      for (const idtId of currentLinkMap.keys()) {
        if (!staged.has(idtId)) removePinLinkByPair(pin.id, idtId);
      }
    }
    onSave({
      label: draft.label.trim(),
      address: draft.address.trim(),
      visitedAt: draft.visitedAt,
      withWho: draft.withWho.trim(),
      notes: draft.notes.trim(),
      color: draft.color ?? DEFAULT_PIN_COLOR,
      iconId: draft.iconId ?? null,
      radius: Number(draft.radius) || 0,
      sightings: (draft.sightings ?? []).filter((s) => s.date || s.note),
    });
  };

  const toggleStaged = (idtId) => {
    setStaged((s) => {
      const next = new Map(s);
      if (next.has(idtId)) next.delete(idtId);
      else next.set(idtId, '');
      return next;
    });
    setExpandedChip(null);
  };

  const setStagedContext = (idtId, ctx) => {
    setStaged((s) => {
      if (!s.has(idtId)) return s;
      const next = new Map(s);
      next.set(idtId, ctx);
      return next;
    });
  };

  const stagedIdentifiers = useMemo(
    () =>
      Array.from(staged.keys())
        .map((id) => identifiers.find((i) => i.id === id))
        .filter(Boolean),
    [staged, identifiers],
  );

  const stagedIdSet = useMemo(() => new Set(staged.keys()), [staged]);

  const pickerItems = useMemo(
    () =>
      identifiers.map((i) => {
        const def = getTypeDef(i.type);
        return {
          id: i.id,
          badge: (
            <IdentifierBadge
              typeKey={i.type}
              customIconId={i.customIconId}
              size="sm"
            />
          ),
          label: getIdentifierDisplayLabel(i),
          secondary: def.label,
          group: CATEGORIES[def.category]?.label ?? 'Diğer',
        };
      }),
    [identifiers],
  );

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal pin-modal"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="modal-header">
          <h2>{pin?.id ? 'Konumu düzenle' : 'Yeni konum'}</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Kapat"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="pin-coords">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {draft.lat?.toFixed?.(6) ?? '—'}, {draft.lng?.toFixed?.(6) ?? '—'}
        </div>

        <div className="field">
          <label>Renk</label>
          <div className="color-picker">
            {Object.entries(PIN_COLORS).map(([key, c]) => {
              const isSelected = (draft.color ?? DEFAULT_PIN_COLOR) === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`color-swatch ${isSelected ? 'selected' : ''}`}
                  style={{ background: c.bg, borderColor: c.border }}
                  onClick={() => change('color', key)}
                  aria-label={c.name}
                  title={c.name}
                >
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.glyph} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
            {(() => {
              const isCustom = !isPresetColor(draft.color) && !!draft.color;
              const resolved = getPinColor(draft.color);
              return (
                <>
                  <button
                    type="button"
                    className={`color-swatch color-swatch-custom ${isCustom ? 'selected' : ''}`}
                    style={
                      isCustom
                        ? { background: resolved.bg, borderColor: resolved.border }
                        : undefined
                    }
                    onClick={() => pinColorInputRef.current?.click()}
                    aria-label="Özel renk"
                    title="Özel renk"
                  >
                    {isCustom && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={resolved.glyph} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                  <input
                    ref={pinColorInputRef}
                    type="color"
                    className="color-input-hidden"
                    value={isCustom ? resolved.bg : '#ef4444'}
                    onChange={(e) => change('color', e.target.value)}
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                </>
              );
            })()}
          </div>
        </div>

        <div className="field">
          <label>Simge</label>
          <div className="pin-icon-picker">
            <button
              type="button"
              className={`pin-icon-tile pin-icon-default ${!draft.iconId ? 'selected' : ''}`}
              onClick={() => change('iconId', null)}
              title="Varsayılan renkli iğne"
            >
              <span
                className="pin-icon-default-dot"
                style={{
                  background: getPinColor(draft.color).bg,
                  borderColor: getPinColor(draft.color).border,
                }}
              />
            </button>
            {Object.entries(BUILT_IN_MAP_ICONS).map(([id, icon]) => {
              const isSelected = draft.iconId === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`pin-icon-tile ${isSelected ? 'selected' : ''}`}
                  onClick={() => change('iconId', id)}
                  title={icon.name}
                  aria-label={icon.name}
                >
                  <img
                    src={getMapIconSrc(id, theme)}
                    alt=""
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="field">
          <label htmlFor="pin-label">Ad</label>
          <input
            id="pin-label"
            autoFocus
            value={draft.label}
            onChange={(e) => change('label', e.target.value)}
            placeholder="ör. Kafe, iş yeri, buluşma noktası"
          />
        </div>

        <div className="field">
          <label htmlFor="pin-address">Adres</label>
          <input
            id="pin-address"
            value={draft.address}
            onChange={(e) => change('address', e.target.value)}
            placeholder="Mahalle, cadde, no…"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="pin-visited">Ziyaret</label>
            <input
              id="pin-visited"
              type="text"
              value={draft.visitedAt}
              onChange={(e) => change('visitedAt', e.target.value)}
              placeholder="ör. 2025-03-14 18:30 ya da her salı"
            />
          </div>
          <div className="field">
            <label htmlFor="pin-with">Kiminle</label>
            <input
              id="pin-with"
              value={draft.withWho}
              onChange={(e) => change('withWho', e.target.value)}
              placeholder="Birlikte olduğu kişiler"
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="pin-radius">Etki / arama yarıçapı</label>
            <select
              id="pin-radius"
              value={RADIUS_PRESETS.includes(Number(draft.radius)) ? Number(draft.radius) : 'custom'}
              onChange={(e) =>
                change('radius', e.target.value === 'custom' ? draft.radius || 750 : Number(e.target.value))
              }
            >
              {RADIUS_PRESETS.map((r) => (
                <option key={r} value={r}>
                  {r === 0 ? 'Yok' : r >= 1000 ? `${r / 1000} km` : `${r} m`}
                </option>
              ))}
              <option value="custom">Özel…</option>
            </select>
          </div>
          {!RADIUS_PRESETS.includes(Number(draft.radius)) && (
            <div className="field">
              <label htmlFor="pin-radius-custom">Metre</label>
              <input
                id="pin-radius-custom"
                type="number"
                min="0"
                step="50"
                value={draft.radius}
                onChange={(e) => change('radius', e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="field">
          <label>Görülme kayıtları</label>
          <div className="sightings">
            {(draft.sightings ?? []).map((s, i) => (
              <div className="sighting-row" key={s.id}>
                <input
                  type="date"
                  value={s.date}
                  onChange={(e) =>
                    change(
                      'sightings',
                      draft.sightings.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)),
                    )
                  }
                  aria-label="Tarih"
                />
                <input
                  type="time"
                  value={s.time}
                  onChange={(e) =>
                    change(
                      'sightings',
                      draft.sightings.map((x, j) => (j === i ? { ...x, time: e.target.value } : x)),
                    )
                  }
                  aria-label="Saat"
                />
                <input
                  value={s.note}
                  placeholder="Not / kaynak"
                  onChange={(e) =>
                    change(
                      'sightings',
                      draft.sightings.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)),
                    )
                  }
                  aria-label="Not"
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => change('sightings', draft.sightings.filter((_, j) => j !== i))}
                  aria-label="Kaydı sil"
                  title="Kaydı sil"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              className="link-chip-add"
              onClick={() =>
                change('sightings', [
                  ...(draft.sightings ?? []),
                  { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), time: '', note: '' },
                ])
              }
            >
              + Görülme ekle
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="pin-notes">Notlar</label>
          <textarea
            id="pin-notes"
            rows={4}
            value={draft.notes}
            onChange={(e) => change('notes', e.target.value)}
            placeholder="Kayda geçmesi gereken diğer bilgiler…"
          />
        </div>

        <div className="field">
          <label>İlişkili tanımlayıcılar</label>
          <div className="link-chips">
            {stagedIdentifiers.map((i) => {
              const context = staged.get(i.id) ?? '';
              const isExpanded = expandedChip === i.id;
              return (
                <span
                  key={i.id}
                  className={`link-chip ${isExpanded ? 'expanded' : ''} ${context ? 'has-context' : ''}`}
                >
                  <button
                    type="button"
                    className="link-chip-body"
                    onClick={() =>
                      setExpandedChip(isExpanded ? null : i.id)
                    }
                    title={
                      context
                        ? `Bağlam: ${context}`
                        : 'Bağlam eklemek için tıklayın'
                    }
                  >
                    <IdentifierBadge
                      typeKey={i.type}
                      customIconId={i.customIconId}
                      size="sm"
                    />
                    <span className="link-chip-textblock">
                      <span className="link-chip-text">
                        {getIdentifierDisplayLabel(i)}
                      </span>
                      {context && !isExpanded && (
                        <span className="link-chip-context">{context}</span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="link-chip-remove"
                    onClick={() => toggleStaged(i.id)}
                    aria-label="İlişkiyi kaldır"
                    title="İlişkiyi kaldır"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                  {isExpanded && (
                    <input
                      type="text"
                      autoFocus
                      className="link-chip-context-input"
                      placeholder="Bağlam, ör. IG gönderisinde etiketlenmiş"
                      value={context}
                      onChange={(e) => setStagedContext(i.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setExpandedChip(null);
                        } else if (e.key === 'Escape') {
                          setExpandedChip(null);
                        }
                      }}
                      onBlur={() => setExpandedChip(null)}
                    />
                  )}
                </span>
              );
            })}
            <button
              type="button"
              className="link-chip-add"
              onClick={() => setPickerOpen(true)}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Tanımlayıcı ilişkilendir
            </button>
          </div>
        </div>

        <div className="modal-actions modal-actions-spread">
          {pin?.id && onDelete && (
            <button
              type="button"
              className="btn btn-ghost danger"
              onClick={() => {
                if (confirm('Bu konum silinsin mi? Bu işlem geri alınamaz.')) {
                  onDelete(pin.id);
                }
              }}
            >
              Konumu sil
            </button>
          )}
          <div className="modal-actions-right">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary">
              {pin?.id ? 'Değişiklikleri kaydet' : 'Kaydet'}
            </button>
          </div>
        </div>
      </form>
      {pickerOpen && (
        <LinkPicker
          title="Tanımlayıcı ilişkilendir"
          items={pickerItems}
          selectedIds={stagedIdSet}
          onToggle={toggleStaged}
          onClose={() => setPickerOpen(false)}
          emptyText="Henüz tanımlayıcı yok. Ağ sekmesinden ekleyin."
        />
      )}
    </div>
  );
}
