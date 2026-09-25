import { useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import { useNavigation } from '../context/NavigationContext.jsx';
import { getDisplayLabel } from '../identifierTypes.js';
import { KIND_LABELS, buildTimeline, fmtShortDate, monthKey } from '../utils/timeline.js';
import { AdmiraltyTag } from './IdentifierNode.jsx';
import IdentifierBadge from './IdentifierBadge.jsx';
import EventModal from './EventModal.jsx';
import './TimelineTab.css';
import { t } from '../i18n/index.jsx';

const KINDS = ['event', 'pin', 'sighting', 'evidence'];

export default function TimelineTab() {
  const { project, addEvent, updateEvent, deleteEvent } = useProject();
  const { navigateToIdentifier, navigateToPin, setTab } = useNavigation();
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [kinds, setKinds] = useState(() => new Set(KINDS));
  const [focusIdent, setFocusIdent] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const identById = useMemo(
    () => new Map((project.identifiers ?? []).map((i) => [i.id, i])),
    [project.identifiers],
  );
  const pinById = useMemo(
    () => new Map((project.locations ?? []).map((p, i) => [p.id, { p, i }])),
    [project.locations],
  );
  const evById = useMemo(
    () => new Map((project.evidence ?? []).map((e) => [e.id, e])),
    [project.evidence],
  );

  const all = useMemo(() => buildTimeline(project), [project]);

  const items = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    return all.filter((it) => {
      if (!kinds.has(it.kind)) return false;
      if (focusIdent && !it.identifierIds.includes(focusIdent)) return false;
      if (from && it.date && it.date < from) return false;
      if (to && it.date && it.date > to) return false;
      if (q) {
        const hay = `${it.title} ${it.description ?? ''} ${it.category}`.toLocaleLowerCase('tr');
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, kinds, focusIdent, from, to, query]);

  const groups = useMemo(() => {
    const out = [];
    let cur = null;
    for (const it of items) {
      const k = monthKey(it.date);
      if (!cur || cur.key !== k) {
        cur = { key: k, items: [] };
        out.push(cur);
      }
      cur.items.push(it);
    }
    return out;
  }, [items]);

  const toggleKind = (k) =>
    setKinds((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const span = useMemo(() => {
    const dated = all.filter((i) => i.date);
    if (dated.length === 0) return null;
    return { first: dated[0].date, last: dated[dated.length - 1].date };
  }, [all]);

  const openItem = (it) => {
    if (it.kind === 'event') setModal({ initial: it.ref });
    else if (it.kind === 'evidence') setTab('evidence');
    else navigateToPin(it.ref.id);
  };

  return (
    <div className="timeline-tab">
      <aside className="timeline-side">
        <div className="sidebar-header">
          <h3>{t('Kronoloji')}</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setModal({ initial: null })}>{t('+ Olay')}</button>
        </div>
        <div className="timeline-filters">
          <input
            type="search"
            placeholder={t('Ara…')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="filter-label">{t('Kaynak')}</div>
          <div className="kind-toggles">
            {KINDS.map((k) => (
              <label key={k} className="check-row compact">
                <input type="checkbox" checked={kinds.has(k)} onChange={() => toggleKind(k)} />
                <span>{t(KIND_LABELS[k])}</span>
                <span className="count-pill">{all.filter((i) => i.kind === k).length}</span>
              </label>
            ))}
          </div>
          <div className="filter-label">{t('Tarih aralığı')}</div>
          <div className="field-row tight">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t('Başlangıç')} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t('Bitiş')} />
          </div>
          <div className="filter-label">{t('Kişi / tanımlayıcı')}</div>
          <select value={focusIdent} onChange={(e) => setFocusIdent(e.target.value)}>
            <option value="">{t('Tümü')}</option>
            {(project.identifiers ?? []).map((i) => (
              <option key={i.id} value={i.id}>{getDisplayLabel(i)}</option>
            ))}
          </select>
          {span && (
            <div className="timeline-span mono">
              {fmtShortDate(span.first)}→ {fmtShortDate(span.last)}
              <br />
              {items.length}/ {all.length}{' '}{t('kayıt')}</div>
          )}
        </div>
      </aside>

      <div className="timeline-main">
        {all.length === 0 ? (
          <div className="timeline-empty">
            <h3>{t('Kronoloji boş')}</h3>
            <p>{t(
              'Olay ekleyin ya da Harita sekmesinde konumlara ziyaret tarihi / görülme kaydı girin. Deliller de elde edilme tarihleriyle burada görünür.'
            )}</p>
            <button className="btn btn-primary" onClick={() => setModal({ initial: null })}>{t('İlk olayı ekle')}</button>
          </div>
        ) : items.length === 0 ? (
          <div className="timeline-empty">
            <p>{t('Filtreyle eşleşen kayıt yok.')}</p>
          </div>
        ) : (
          <div className="timeline">
            {groups.map((g) => (
              <section key={g.key} className="tl-group">
                <h4 className="tl-month">{g.key}</h4>
                <ol className="tl-list">
                  {g.items.map((it) => (
                    <li key={it.id} className={`tl-item kind-${it.kind}`}>
                      <div className="tl-when mono">
                        <div>{fmtShortDate(it.date)}</div>
                        {it.time && <div className="tl-time">{it.time}</div>}
                      </div>
                      <div className="tl-rail">
                        <span className="tl-dot" style={{ background: it.color }} />
                      </div>
                      <button type="button" className="tl-card" onClick={() => openItem(it)}>
                        <div className="tl-card-head">
                          <span className="tl-cat" style={{ color: it.color }}>
                            {it.category}
                          </span>
                          {it.kind !== 'event' && t(KIND_LABELS[it.kind]) !== it.category && (
                            <span className="tl-kind">{t(KIND_LABELS[it.kind])}</span>
                          )}
                          <AdmiraltyTag reliability={it.reliability} />
                        </div>
                        <div className="tl-title">{it.title}</div>
                        {it.description && <div className="tl-desc">{it.description}</div>}
                        {(it.identifierIds.length > 0 || it.pinIds.length > 0 || (it.kind === 'event' && it.evidenceIds.length > 0)) && (
                          <div className="tl-links" onClick={(e) => e.stopPropagation()}>
                            {it.identifierIds.map((id) => {
                              const i = identById.get(id);
                              if (!i) return null;
                              return (
                                <span
                                  key={id}
                                  role="button"
                                  tabIndex={0}
                                  className="tl-link"
                                  onClick={() => navigateToIdentifier(id)}
                                  onKeyDown={(e) => e.key === 'Enter' && navigateToIdentifier(id)}
                                >
                                  <IdentifierBadge typeKey={i.type} customIconId={i.customIconId} size="sm" />
                                  {getDisplayLabel(i)}
                                </span>
                              );
                            })}
                            {it.kind === 'event' &&
                              it.pinIds.map((id) => {
                                const entry = pinById.get(id);
                                if (!entry) return null;
                                return (
                                  <span
                                    key={id}
                                    role="button"
                                    tabIndex={0}
                                    className="tl-link"
                                    onClick={() => navigateToPin(id)}
                                    onKeyDown={(e) => e.key === 'Enter' && navigateToPin(id)}
                                  >
                                    <span className="tl-pin-no mono">{entry.i + 1}</span>
                                    {entry.p.label || entry.p.address || t('Konum')}
                                  </span>
                                );
                              })}
                            {it.kind === 'event' &&
                              it.evidenceIds.map((id) => {
                                const ev = evById.get(id);
                                if (!ev) return null;
                                return (
                                  <span
                                    key={id}
                                    role="button"
                                    tabIndex={0}
                                    className="tl-link"
                                    onClick={() => setTab('evidence')}
                                    onKeyDown={(e) => e.key === 'Enter' && setTab('evidence')}
                                  >
                                    <span className="mono">{ev.number}</span>
                                  </span>
                                );
                              })}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <EventModal
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSave={(data) => {
            if (modal.initial?.id) updateEvent(modal.initial.id, data);
            else addEvent(data);
            setModal(null);
          }}
          onDelete={
            modal.initial?.id
              ? () => {
                  if (!confirm('Bu olay silinsin mi?')) return;
                  deleteEvent(modal.initial.id);
                  setModal(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
