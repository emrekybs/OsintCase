import { useEffect, useState } from 'react';
import { LINK_CONFIDENCE } from '../caseModel.js';
import { getDisplayLabel } from '../identifierTypes.js';

const PRESETS = [
  'Akraba',
  'Eş',
  'İş ortağı',
  'Aynı IP',
  'Aynı cihaz',
  'Kullanıyor',
  'Sahibi',
  'İletişim kurdu',
  'Para transferi',
  'Birlikte görüldü',
];

/** Bağlantı (kenar) düzenleme: ilişki türü ve teyit derecesi. */
export default function EdgeModal({ connection, source, target, onSave, onDelete, onClose }) {
  const [label, setLabel] = useState(connection.label ?? '');
  const [confidence, setConfidence] = useState(connection.confidence ?? 'kesin');
  const [note, setNote] = useState(connection.note ?? '');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ label: label.trim(), confidence, note: note.trim() });
        }}
      >
        <div className="modal-kicker">Bağlantı</div>
        <h2 className="edge-title">
          {getDisplayLabel(source)} <span className="edge-arrow">↔</span> {getDisplayLabel(target)}
        </h2>

        <div className="field">
          <label htmlFor="edge-label">İlişki türü</label>
          <input
            id="edge-label"
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ör. kardeşi, aynı IP, para transferi"
          />
          <div className="preset-chips">
            {PRESETS.map((p) => (
              <button type="button" key={p} className="preset-chip" onClick={() => setLabel(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Teyit derecesi</label>
          <div className="seg-picker">
            {LINK_CONFIDENCE.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`seg-option ${confidence === c.key ? 'selected accent' : ''}`}
                onClick={() => setConfidence(c.key)}
              >
                <svg width="26" height="6" aria-hidden="true">
                  <line x1="0" y1="3" x2="26" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray={c.dash ?? undefined} />
                </svg>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="edge-note">Not</label>
          <textarea id="edge-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="modal-actions modal-actions-spread">
          <button type="button" className="btn btn-ghost danger" onClick={onDelete}>
            Bağlantıyı sil
          </button>
          <div className="modal-actions-right">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Vazgeç
            </button>
            <button type="submit" className="btn btn-primary">
              Kaydet
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
