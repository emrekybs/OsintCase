import { useEffect, useMemo, useState } from 'react';
import { useProject } from '../context/ProjectContext.jsx';
import { fmtDateTime } from '../caseModel.js';
import { sha256Hex } from '../utils/crypto.js';
import { triggerDownload } from '../utils/projectIO.js';
import './AuditTab.css';

function csvCell(v) {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** İşlem kaydı: dosyada yapılan her anlamlı değişiklik, kim / ne zaman. */
export default function AuditTab() {
  const { project, logAction } = useProject();
  const log = project.auditLog ?? [];
  const [query, setQuery] = useState('');
  const [analyst, setAnalyst] = useState('');
  const [digest, setDigest] = useState('');

  useEffect(() => {
    let cancelled = false;
    sha256Hex(JSON.stringify(log)).then((h) => !cancelled && setDigest(h));
    return () => {
      cancelled = true;
    };
  }, [log]);

  const analysts = useMemo(
    () => Array.from(new Set(log.map((l) => l.analyst).filter(Boolean))),
    [log],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    return [...log]
      .reverse()
      .filter((l) => (!analyst || l.analyst === analyst))
      .filter((l) =>
        !q ? true : `${l.action} ${l.detail}`.toLocaleLowerCase('tr').includes(q),
      );
  }, [log, query, analyst]);

  const exportCsv = () => {
    const lines = [
      ['Sıra', 'Zaman (ISO)', 'Analist', 'İşlem', 'Ayrıntı'].join(';'),
      ...log.map((l, i) =>
        [i + 1, l.ts, l.analyst, l.action, l.detail].map(csvCell).join(';'),
      ),
    ];
    const name = (project.caseInfo?.caseNumber || project.name || 'dosya').replace(/[^\w-]+/g, '_');
    triggerDownload(
      new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
      `${name}_islem_kaydi.csv`,
    );
    logAction('İşlem kaydı dışa aktarıldı', 'CSV');
  };

  return (
    <div className="audit-tab">
      <div className="audit-head">
        <div>
          <div className="modal-kicker">İşlem kaydı</div>
          <h2>{log.length} kayıt</h2>
          <div className="audit-digest mono" title="Kaydın tamamının SHA-256 özeti. Rapora yazılır; sonradan değişiklik olup olmadığını karşılaştırmak için kullanılır.">
            Özet: {digest ? `${digest.slice(0, 32)}…` : '…'}
          </div>
        </div>
        <div className="audit-controls">
          <input type="search" placeholder="İşlem ya da ayrıntı ara…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={analyst} onChange={(e) => setAnalyst(e.target.value)}>
            <option value="">Tüm analistler</option>
            {analysts.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={exportCsv} disabled={log.length === 0}>
            CSV indir
          </button>
        </div>
      </div>

      {log.length === 0 ? (
        <div className="timeline-empty">
          <p>
            Bu dosyada henüz işlem kaydı yok. (Eski sürümle oluşturulmuş dosyalarda kayıt, açıldığı andan
            itibaren başlar.)
          </p>
        </div>
      ) : (
        <div className="audit-table-wrap">
          <table className="data-table audit-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Zaman</th>
                <th>Analist</th>
                <th>İşlem</th>
                <th>Ayrıntı</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const idx = log.indexOf(l) + 1;
                const alarm = /BAŞARISIZ|silindi|çıkarıldı|kaldırıldı/i.test(l.action);
                return (
                  <tr key={l.id} className={alarm ? 'alarm' : ''}>
                    <td className="mono dim">{idx}</td>
                    <td className="mono nowrap">{fmtDateTime(l.ts)}</td>
                    <td className="nowrap">{l.analyst}</td>
                    <td className="nowrap">{l.action}</td>
                    <td className="wrap">{l.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
