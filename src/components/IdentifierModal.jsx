import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getTypeDef,
  getPrimaryFieldKey,
  listTypesByCategory,
} from '../identifierTypes.js';
import { useProject } from '../context/ProjectContext.jsx';
import { getPinColor } from '../pinColors.js';
import { INFO_CREDIBILITY, SOURCE_RELIABILITY } from '../caseModel.js';
import IdentifierBadge from './IdentifierBadge.jsx';
import IconPicker from './IconPicker.jsx';
import LinkPicker from './LinkPicker.jsx';
import './IdentifierModal.css';
import { t } from '../i18n/index.jsx';

function buildEmptyFields(typeKey) {
  return Object.fromEntries(
    getTypeDef(typeKey).fields.map((f) => [f.key, '']),
  );
}

function FieldInput({ field, value, onChange, autoFocus }) {
  const common = {
    id: `field-${field.key}`,
    value: value ?? '',
    placeholder: field.placeholder,
    onChange: (e) => onChange(field.key, e.target.value),
    autoFocus,
  };
  if (field.type === 'textarea') {
    return <textarea rows={3} {...common} />;
  }
  if (field.type === 'select') {
    return (
      <select {...common}>
        <option value="">{t('Seçilmedi')}</option>
        {field.options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  return <input type={field.type} {...common} />;
}

export default function IdentifierModal({ initial, onClose, onSubmit }) {
  const editing = Boolean(initial?.id);
  const { project, addPinLink, removePinLinkByPair, setPinLinkContext } =
    useProject();
  const pins = project?.locations ?? [];
  const pinLinks = project?.pinLinks ?? [];

  const [stage, setStage] = useState(
    initial?.type ? 'form' : 'picker',
  );
  const [search, setSearch] = useState('');
  const [typeKey, setTypeKey] = useState(initial?.type ?? null);
  const [fields, setFields] = useState(
    initial?.fields ?? (initial?.type ? buildEmptyFields(initial.type) : {}),
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [reliability, setReliability] = useState(
    initial?.reliability ?? { source: '', info: '', sourceNote: '', collectedAt: '' },
  );
  const setRel = (k, v) => setReliability((r) => ({ ...r, [k]: v }));
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedChip, setExpandedChip] = useState(null);
  const [customIconId, setCustomIconId] = useState(
    initial?.customIconId ?? null,
  );
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const formScrollRef = useRef(null);

  // Currently-linked pins → context (only relevant when editing).
  const currentLinkMap = useMemo(() => {
    const m = new Map();
    if (editing) {
      for (const l of pinLinks.filter((l) => l.identifierId === initial.id)) {
        m.set(l.pinId, l.context ?? '');
      }
    }
    return m;
  }, [pinLinks, editing, initial?.id]);

  const [stagedLinks, setStagedLinks] = useState(() => new Map(currentLinkMap));

  useEffect(() => {
    setStagedLinks(new Map(currentLinkMap));
    setExpandedChip(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const categories = useMemo(() => listTypesByCategory(), []);
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        types: cat.types.filter(
          (t) =>
            t.label.toLowerCase().includes(q) ||
            t.key.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.types.length > 0);
  }, [categories, search]);

  const handleSelectType = (key) => {
    setTypeKey(key);
    setFields(buildEmptyFields(key));
    setStage('form');
    setError('');
  };

  const handleFieldChange = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!typeKey) return;
    const primaryKey = getPrimaryFieldKey(typeKey);
    const primaryValue = fields[primaryKey];
    if (!primaryValue || !String(primaryValue).trim()) {
      const def = getTypeDef(typeKey);
      const primaryField = def.fields.find((f) => f.primary);
      setError(`${primaryField?.label ?? 'Ana alan'} zorunlu.`);
      formScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const trimmedFields = Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [
        k,
        typeof v === 'string' ? v.trim() : v,
      ]),
    );
    // Commit link changes — only possible when editing existing identifier.
    if (editing && initial?.id) {
      for (const [pinId, ctx] of stagedLinks) {
        if (!currentLinkMap.has(pinId)) {
          addPinLink(pinId, initial.id, ctx);
        } else if ((currentLinkMap.get(pinId) ?? '') !== (ctx ?? '')) {
          setPinLinkContext(pinId, initial.id, ctx);
        }
      }
      for (const pinId of currentLinkMap.keys()) {
        if (!stagedLinks.has(pinId)) removePinLinkByPair(pinId, initial.id);
      }
    }
    onSubmit({
      id: initial?.id,
      type: typeKey,
      fields: trimmedFields,
      notes: notes.trim(),
      customIconId,
      reliability:
        reliability.source || reliability.info || reliability.sourceNote || reliability.collectedAt
          ? {
              source: reliability.source,
              info: reliability.info,
              sourceNote: (reliability.sourceNote ?? '').trim(),
              collectedAt: reliability.collectedAt ?? '',
            }
          : null,
    });
  };

  const toggleStagedPin = (pinId) => {
    setStagedLinks((s) => {
      const next = new Map(s);
      if (next.has(pinId)) next.delete(pinId);
      else next.set(pinId, '');
      return next;
    });
    setExpandedChip(null);
  };

  const setStagedPinContext = (pinId, ctx) => {
    setStagedLinks((s) => {
      if (!s.has(pinId)) return s;
      const next = new Map(s);
      next.set(pinId, ctx);
      return next;
    });
  };

  const stagedPins = useMemo(
    () =>
      Array.from(stagedLinks.keys())
        .map((id) => pins.find((p) => p.id === id))
        .filter(Boolean),
    [stagedLinks, pins],
  );

  const stagedPinIdSet = useMemo(
    () => new Set(stagedLinks.keys()),
    [stagedLinks],
  );

  const pinPickerItems = useMemo(
    () =>
      pins.map((p, idx) => {
        const c = getPinColor(p.color);
        return {
          id: p.id,
          badge: (
            <span
              className="pin-mini-badge"
              style={{
                background: c.bg,
                color: c.glyph,
                borderColor: c.border,
              }}
            >
              {idx + 1}
            </span>
          ),
          label:
            p.label?.trim() ||
            p.address?.trim() ||
            t('Konum {0}', {
              '0': idx + 1
            }),
          secondary:
            p.label && p.address
              ? p.address
              : `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`,
          group: 'Konumlar',
        };
      }),
    [pins],
  );

  const pinIndexById = useMemo(() => {
    const m = new Map();
    pins.forEach((p, i) => m.set(p.id, i + 1));
    return m;
  }, [pins]);

  const def = typeKey ? getTypeDef(typeKey) : null;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal modal-wide"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {stage === 'picker' ? (
          <>
            <div className="modal-header">
              <h2>{t('Tanımlayıcı ekle')}</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={onClose}
                aria-label={t('Kapat')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <p className="modal-sub">{t('Bu bilgi için kategori ve tür seçin.')}</p>

            <input
              type="text"
              autoFocus
              placeholder={t('Tür ara…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="type-search"
            />

            <div className="type-picker">
              {filteredCategories.length === 0 ? (
                <div className="empty-state">"{search}{t('" ile eşleşen tür yok.')}</div>
              ) : (
                filteredCategories.map((cat) => (
                  <section key={cat.key} className="type-category">
                    <h3>{cat.label}</h3>
                    <div className="type-grid">
                      {cat.types.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          className="type-card"
                          onClick={() => handleSelectType(t.key)}
                        >
                          <IdentifierBadge typeKey={t.key} size="md" />
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="identifier-form">
            <div className="modal-header">
              <div className="form-title">
                {!editing && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => {
                      setStage('picker');
                      setError('');
                    }}
                    aria-label={t('Tür seçimine dön')}
                    title={t('Geri')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18 9 12l6-6"/></svg>
                  </button>
                )}
                <button
                  type="button"
                  className="form-title-icon"
                  onClick={() => setIconPickerOpen(true)}
                  title={t('Simgeyi değiştir')}
                  aria-label={t('Simgeyi değiştir')}
                >
                  <IdentifierBadge
                    typeKey={typeKey}
                    customIconId={customIconId}
                    size="lg"
                  />
                  <span className="form-title-icon-edit">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"/></svg>
                  </span>
                </button>
                <h2>
                  {def.label} · {editing ? t('düzenle') : 'yeni'}
                </h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={onClose}
                aria-label={t('Kapat')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="form-scroll" ref={formScrollRef}>
              {error && <div className="form-error">{error}</div>}
              {def.fields.map((field, idx) => (
                <div className="field" key={field.key}>
                  <label htmlFor={`field-${field.key}`}>
                    {field.label}
                    {field.primary && <span className="required">*</span>}
                  </label>
                  <FieldInput
                    field={field}
                    value={fields[field.key]}
                    onChange={handleFieldChange}
                    autoFocus={idx === 0 && !editing}
                  />
                </div>
              ))}
              <fieldset className="reliability-box">
                <legend>{t('Kaynak değerlendirmesi (Admiralty)')}</legend>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="rel-source">{t('Kaynak güvenilirliği')}</label>
                    <select
                      id="rel-source"
                      value={reliability.source ?? ''}
                      onChange={(e) => setRel('source', e.target.value)}
                    >
                      <option value="">{t('Değerlendirilmedi')}</option>
                      {SOURCE_RELIABILITY.map((o) => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="rel-info">{t('Bilgi doğruluğu')}</label>
                    <select
                      id="rel-info"
                      value={reliability.info ?? ''}
                      onChange={(e) => setRel('info', e.target.value)}
                    >
                      <option value="">{t('Değerlendirilmedi')}</option>
                      {INFO_CREDIBILITY.map((o) => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field-row">
                  <div className="field grow2">
                    <label htmlFor="rel-note">{t('Kaynak')}</label>
                    <input
                      id="rel-note"
                      value={reliability.sourceNote ?? ''}
                      onChange={(e) => setRel('sourceNote', e.target.value)}
                      placeholder={t('URL, belge, görüşme, açık kaynak adı…')}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="rel-date">{t('Elde edilme tarihi')}</label>
                    <input
                      id="rel-date"
                      type="date"
                      value={reliability.collectedAt ?? ''}
                      onChange={(e) => setRel('collectedAt', e.target.value)}
                    />
                  </div>
                </div>
              </fieldset>

              <div className="field">
                <label htmlFor="field-notes">{t('Notlar')}</label>
                <textarea
                  id="field-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('Kayda geçmesi gereken diğer bilgiler…')}
                />
              </div>

              {editing && (
                <div className="field">
                  <label>{t('İlişkili konumlar')}</label>
                  <div className="link-chips">
                    {stagedPins.map((p) => {
                      const c = getPinColor(p.color);
                      const idx = pinIndexById.get(p.id);
                      const label =
                        p.label?.trim() ||
                        p.address?.trim() ||
                        t('Konum {0}', {
                          '0': idx ?? ''
                        });
                      const context = stagedLinks.get(p.id) ?? '';
                      const isExpanded = expandedChip === p.id;
                      return (
                        <span
                          key={p.id}
                          className={`link-chip ${isExpanded ? 'expanded' : ''} ${context ? 'has-context' : ''}`}
                        >
                          <button
                            type="button"
                            className="link-chip-body"
                            onClick={() =>
                              setExpandedChip(isExpanded ? null : p.id)
                            }
                            title={
                              context
                                ? t('Bağlam: {0}', {
                                '0': context
                              })
                                : t('Bağlam eklemek için tıklayın')
                            }
                          >
                            <span
                              className="pin-mini-badge"
                              style={{
                                background: c.bg,
                                color: c.glyph,
                                borderColor: c.border,
                              }}
                            >
                              {idx}
                            </span>
                            <span className="link-chip-textblock">
                              <span className="link-chip-text">{label}</span>
                              {context && !isExpanded && (
                                <span className="link-chip-context">{context}</span>
                              )}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="link-chip-remove"
                            onClick={() => toggleStagedPin(p.id)}
                            aria-label={t('İlişkiyi kaldır')}
                            title={t('İlişkiyi kaldır')}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                          </button>
                          {isExpanded && (
                            <input
                              type="text"
                              autoFocus
                              className="link-chip-context-input"
                              placeholder={t('Bağlam, ör. IG\'de konum bildirmiş')}
                              value={context}
                              onChange={(e) =>
                                setStagedPinContext(p.id, e.target.value)
                              }
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
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>{t('Konum ilişkilendir')}</button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose}>{t('Vazgeç')}</button>
              <button type="submit" className="btn btn-primary">
                {editing ? t('Değişiklikleri kaydet') : t('Ekle')}
              </button>
            </div>
          </form>
        )}
      </div>
      {pickerOpen && (
        <LinkPicker
          title={t('Konum ilişkilendir')}
          items={pinPickerItems}
          selectedIds={stagedPinIdSet}
          onToggle={toggleStagedPin}
          onClose={() => setPickerOpen(false)}
          emptyText={t('Henüz konum yok. Harita sekmesinden ekleyin.')}
        />
      )}
      {iconPickerOpen && typeKey && (
        <IconPicker
          typeKey={typeKey}
          currentIconId={customIconId}
          onSelect={(id) => {
            setCustomIconId(id);
            setIconPickerOpen(false);
          }}
          onClose={() => setIconPickerOpen(false)}
        />
      )}
    </div>
  );
}
