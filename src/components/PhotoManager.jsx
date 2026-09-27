import { useEffect, useRef, useState } from 'react';
import { photoFromFile } from '../utils/photos.js';
import { fmtBytes, fmtDateTime } from '../caseModel.js';
import { t } from '../i18n/index.jsx';
import './PhotoManager.css';

const I = {
  star: (filled) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/></svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12M9 7V4a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/></svg>
  ),
  plus: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
  ),
  photo: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 8h.01M3 6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v12a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z"/><path d="M3 16l5 -5c.928 -.893 2.072 -.893 3 0l5 5"/><path d="M14 14l1 -1c.928 -.893 2.072 -.893 3 0l3 3"/></svg>
  ),
  left: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6l6 6"/></svg>
  ),
  right: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6l-6 6"/></svg>
  ),
};

/**
 * Fotoğraf yöneticisi: ana fotoğraflar + diğer fotoğraflar.
 * Ekleme: dosya seç, sürükle-bırak ya da panodan yapıştır (Ctrl+V).
 */
export default function PhotoManager({ photos = [], onChange, personMode = false }) {
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const primary = photos.filter((p) => p.primary);
  const others = photos.filter((p) => !p.primary);
  const selected = photos.find((p) => p.id === selectedId) ?? null;

  const addFiles = async (fileList) => {
    const files = Array.from(fileList ?? []).filter((f) => f.type?.startsWith('image/'));
    if (files.length === 0) return;
    setError('');
    setBusy((n) => n + files.length);
    const added = [];
    for (const f of files) {
      try {
        added.push(await photoFromFile(f));
      } catch (e) {
        setError(t(e.message) || t('Görsel okunamadı'));
      } finally {
        setBusy((n) => n - 1);
      }
    }
    if (added.length === 0) return;
    const cur = photosRef.current;
    // Hiç ana fotoğraf yoksa ilk eklenen ana olur.
    if (!cur.some((p) => p.primary)) added[0].primary = true;
    onChange([...cur, ...added]);
    setSelectedId(added[0].id);
  };

  // Panodan yapıştırma: yalnızca görsel varsa yakala, metin yapıştırmayı bozma.
  useEffect(() => {
    const onPaste = (e) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const files = items
        .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
        .map((it) => it.getAsFile())
        .filter(Boolean);
      if (files.length === 0) return;
      e.preventDefault();
      addFiles(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (id, p) =>
    onChange(photosRef.current.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const remove = (id) => {
    const target = photosRef.current.find((x) => x.id === id);
    if (!target) return;
    if (!confirm(t('Bu fotoğraf kaldırılsın mı?'))) return;
    let next = photosRef.current.filter((x) => x.id !== id);
    if (target.primary && next.length > 0 && !next.some((x) => x.primary)) {
      next = next.map((x, i) => (i === 0 ? { ...x, primary: true } : x));
    }
    onChange(next);
    if (selectedId === id) setSelectedId(null);
  };

  const move = (id, dir) => {
    const arr = [...photosRef.current];
    const i = arr.findIndex((x) => x.id === id);
    if (i < 0) return;
    // Aynı gruptaki bir sonraki / önceki fotoğrafla yer değiştir.
    const group = arr[i].primary;
    let j = i + dir;
    while (j >= 0 && j < arr.length && arr[j].primary !== group) j += dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  };

  const Tile = ({ p, big }) => (
    <div
      className={`pm-tile ${big ? 'big' : ''} ${p.id === selectedId ? 'selected' : ''}`}
      onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
      title={p.caption || p.fileName}
    >
      <img src={p.dataUrl} alt={p.caption || ''} draggable={false} />
      <div className="pm-tile-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={`pm-icon ${p.primary ? 'on' : ''}`}
          onClick={() => patch(p.id, { primary: !p.primary })}
          title={p.primary ? t('Ana fotoğraftan çıkar') : t('Ana fotoğraf yap')}
          aria-label={p.primary ? t('Ana fotoğraftan çıkar') : t('Ana fotoğraf yap')}
        >
          {I.star(p.primary)}
        </button>
        <button
          type="button"
          className="pm-icon danger"
          onClick={() => remove(p.id)}
          title={t('Kaldır')}
          aria-label={t('Kaldır')}
        >
          {I.trash}
        </button>
      </div>
      {p.caption && <div className="pm-tile-caption">{p.caption}</div>}
    </div>
  );

  return (
    <div
      className={`pm ${dragOver ? 'drag' : ''}`}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer?.types ?? []).includes('Files')) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        addFiles(e.dataTransfer?.files);
      }}
    >
      <div className="pm-head">
        <span className="pm-title">
          {t('Fotoğraflar')}
          {photos.length > 0 && <span className="pm-count">{photos.length}</span>}
        </span>
        <span className="pm-hint">{t('Sürükle-bırak ya da Ctrl+V ile yapıştır')}</span>
        <button type="button" className="btn btn-ghost btn-sm pm-add" onClick={() => inputRef.current?.click()}>
          {I.plus} {t('Fotoğraf ekle')}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      {photos.length === 0 && busy === 0 ? (
        <button type="button" className="pm-empty" onClick={() => inputRef.current?.click()}>
          {I.photo}
          <span>
            {personMode
              ? t('Kişinin fotoğraflarını ekleyin. İlk eklenen ana fotoğraf olur; istediğiniz kadar ana ve diğer fotoğraf ekleyebilirsiniz.')
              : t('Profil fotoğrafı, ekran görüntüsü ya da ilgili görselleri ekleyin.')}
          </span>
        </button>
      ) : (
        <>
          <div className="pm-group">
            <div className="pm-group-label">
              {I.star(true)} {t('Ana fotoğraflar')}
              <span className="dim">{t('düğümde ve raporda öne çıkar')}</span>
            </div>
            <div className="pm-grid">
              {primary.map((p) => <Tile key={p.id} p={p} big />)}
              {primary.length === 0 && (
                <div className="pm-none">{t('Yıldızla işaretlenen fotoğraflar burada görünür.')}</div>
              )}
            </div>
          </div>
          <div className="pm-group">
            <div className="pm-group-label">{t('Diğer fotoğraflar')}</div>
            <div className="pm-grid">
              {others.map((p) => <Tile key={p.id} p={p} />)}
              {Array.from({ length: busy }).map((_, i) => (
                <div key={`b${i}`} className="pm-tile pm-busy"><span /></div>
              ))}
              <button type="button" className="pm-tile pm-tile-add" onClick={() => inputRef.current?.click()} aria-label={t('Fotoğraf ekle')}>
                {I.plus}
              </button>
            </div>
          </div>
        </>
      )}

      {selected && (
        <div className="pm-detail">
          <img src={selected.dataUrl} alt="" className="pm-detail-img" />
          <div className="pm-detail-body">
            <div className="field">
              <label htmlFor="pm-caption">{t('Açıklama')}</label>
              <input
                id="pm-caption"
                value={selected.caption ?? ''}
                onChange={(e) => patch(selected.id, { caption: e.target.value })}
                placeholder={t('ör. 2024 düğün fotoğrafı, profil resmi…')}
              />
            </div>
            <div className="field">
              <label htmlFor="pm-source">{t('Kaynak')}</label>
              <input
                id="pm-source"
                value={selected.source ?? ''}
                onChange={(e) => patch(selected.id, { source: e.target.value })}
                placeholder={t('URL ya da elde edildiği yer')}
              />
            </div>
            <div className="field">
              <label htmlFor="pm-date">{t('Çekim / paylaşım tarihi')}</label>
              <input
                id="pm-date"
                type="date"
                value={selected.takenAt ?? ''}
                onChange={(e) => patch(selected.id, { takenAt: e.target.value })}
              />
            </div>
            <div className="pm-meta mono">
              <div>{selected.fileName} · {selected.width}×{selected.height} · {fmtBytes(selected.size)}</div>
              <div>{t('Eklendi')}: {fmtDateTime(selected.addedAt)}{selected.addedBy ? ` · ${selected.addedBy}` : ''}</div>
              <div className="pm-hash">SHA-256 {selected.sha256}</div>
            </div>
            <div className="pm-detail-actions">
              <button type="button" className={`btn btn-sm ${selected.primary ? 'btn-primary' : 'btn-ghost'}`} onClick={() => patch(selected.id, { primary: !selected.primary })}>
                {I.star(selected.primary)} {selected.primary ? t('Ana fotoğraf') : t('Ana fotoğraf yap')}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(selected.id, -1)} title={t('Öne al')} aria-label={t('Öne al')}>{I.left}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(selected.id, 1)} title={t('Geriye al')} aria-label={t('Geriye al')}>{I.right}</button>
              <span style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost btn-sm pm-danger" onClick={() => remove(selected.id)}>
                {I.trash} {t('Kaldır')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
