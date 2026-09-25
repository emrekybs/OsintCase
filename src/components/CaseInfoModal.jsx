import { useEffect, useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import {
  CASE_STATUSES,
  CLASSIFICATIONS,
  PRIORITIES,
  fmtDateTime,
} from '../caseModel.js';

/** Dosya künyesi: ad, dosya no, gizlilik, durum, öncelik, soruşturmacı, özet. */
export default function CaseInfoModal({ onClose }) {
  const { project, updateCaseMeta } = useProject();
  const ci = project.caseInfo ?? {};
  const [draft, setDraft] = useState({
    name: project.name ?? '',
    classification: project.classification,
    caseNumber: ci.caseNumber ?? '',
    investigator: ci.investigator ?? '',
    unit: ci.unit ?? '',
    status: ci.status ?? 'acik',
    priority: ci.priority ?? 'orta',
    openedAt: ci.openedAt ?? '',
    legalBasis: ci.legalBasis ?? '',
    summary: ci.summary ?? '',
    targetName: project.target?.name ?? '',
    targetNotes: project.target?.notes ?? '',
  });

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    updateCaseMeta({
      name: draft.name,
      classification: draft.classification,
      caseInfo: {
        caseNumber: draft.caseNumber.trim(),
        investigator: draft.investigator.trim(),
        unit: draft.unit.trim(),
        status: draft.status,
        priority: draft.priority,
        openedAt: draft.openedAt,
        legalBasis: draft.legalBasis.trim(),
        summary: draft.summary.trim(),
      },
      target: { name: draft.targetName.trim(), notes: draft.targetNotes.trim() },
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal modal-wide case-modal"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="modal-header">
          <div>
            <div className="modal-kicker">Künye</div>
            <h2>Dosya bilgileri</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="form-scroll">
          <div className="field-row">
            <div className="field grow2">
              <label htmlFor="ci-name">Dosya adı</label>
              <input id="ci-name" value={draft.name} onChange={set('name')} />
            </div>
            <div className="field">
              <label htmlFor="ci-no">Dosya no</label>
              <input id="ci-no" className="mono" value={draft.caseNumber} onChange={set('caseNumber')} />
            </div>
          </div>

          <div className="field">
            <label>Gizlilik derecesi</label>
            <div className="seg-picker">
              {CLASSIFICATIONS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`seg-option ${draft.classification === c.key ? 'selected' : ''}`}
                  style={
                    draft.classification === c.key
                      ? { background: c.color, color: c.text, borderColor: c.color }
                      : undefined
                  }
                  onClick={() => setDraft((d) => ({ ...d, classification: c.key }))}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ci-status">Durum</label>
              <select id="ci-status" value={draft.status} onChange={set('status')}>
                {CASE_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ci-prio">Öncelik</label>
              <select id="ci-prio" value={draft.priority} onChange={set('priority')}>
                {PRIORITIES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ci-opened">Açılış tarihi</label>
              <input id="ci-opened" type="date" value={draft.openedAt} onChange={set('openedAt')} />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ci-inv">Soruşturmacı / sorumlu</label>
              <input id="ci-inv" value={draft.investigator} onChange={set('investigator')} />
            </div>
            <div className="field">
              <label htmlFor="ci-unit">Birim</label>
              <input id="ci-unit" value={draft.unit} onChange={set('unit')} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="ci-legal">Hukuki dayanak / yetki belgesi</label>
            <input
              id="ci-legal"
              value={draft.legalBasis}
              onChange={set('legalBasis')}
              placeholder="ör. Savcılık yazısı no, görev emri, sözleşme no"
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="ci-target">Ana hedef</label>
              <input id="ci-target" value={draft.targetName} onChange={set('targetName')} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="ci-target-notes">Hedef notları</label>
            <textarea id="ci-target-notes" rows={2} value={draft.targetNotes} onChange={set('targetNotes')} />
          </div>

          <div className="field">
            <label htmlFor="ci-summary">Dosya özeti</label>
            <textarea
              id="ci-summary"
              rows={4}
              value={draft.summary}
              onChange={set('summary')}
              placeholder="Soruşturmanın konusu, kapsamı ve mevcut değerlendirme…"
            />
          </div>

          <div className="meta-line mono">
            Oluşturma {fmtDateTime(project.createdAt)} · Son değişiklik {fmtDateTime(project.updatedAt)} · ID{' '}
            {project.id.slice(0, 8)}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Vazgeç
          </button>
          <button type="submit" className="btn btn-primary">
            Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
