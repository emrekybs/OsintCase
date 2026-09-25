import { getClassification } from '../caseModel.js';

/**
 * Üst/alt gizlilik bandı. Dosyanın gizlilik derecesini her ekranda (ve
 * yazdırılan raporda her sayfada) gösterir.
 */
export default function ClassificationBanner({ classification, extra, className = '' }) {
  const c = getClassification(classification);
  return (
    <div
      className={`classification-banner ${className}`}
      style={{ background: c.color, color: c.text }}
      role="note"
      aria-label={`Gizlilik derecesi: ${c.label}`}
    >
      <span className="classification-label">{c.label}</span>
      {extra && <span className="classification-extra">{extra}</span>}
    </div>
  );
}
