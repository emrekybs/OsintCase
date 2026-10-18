/**
 * Tanımlayıcı fotoğrafları (kişi resmi, profil fotoğrafı, araç / bina…).
 *
 * Kayıt şekli (identifier.photos[]):
 *   {
 *     id, dataUrl,            // küçültülmüş JPEG (en uzun kenar ≤ MAX_EDGE)
 *     primary: bool,          // "ana fotoğraf" — birden fazla olabilir
 *     caption, source,        // açıklama, kaynak (URL / not)
 *     fileName, mimeType, size, width, height,
 *     sha256,                 // ORİJİNAL dosyanın özeti (bütünlük için)
 *     addedAt, addedBy
 *   }
 *
 * Görseller dosyaya gömülür; sunucuya hiçbir şey gönderilmez.
 */
import { sha256Hex } from './crypto.js';
import { getAnalyst } from './analyst.js';

export const MAX_EDGE = 1600;
const QUALITY = 0.86;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Görsel okunamadı'));
    im.src = url;
  });
}

/** Dosyayı okuyup küçültür, özetini alır ve fotoğraf kaydı döndürür. */
export async function photoFromFile(file) {
  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('Yalnızca görsel dosyaları eklenebilir.');
  }
  const buf = await file.arrayBuffer();
  const sha256 = await sha256Hex(buf);
  const url = URL.createObjectURL(new Blob([buf], { type: file.type }));
  try {
    const img = await loadImage(url);
    const w0 = img.naturalWidth || img.width;
    const h0 = img.naturalHeight || img.height;
    const k = Math.min(1, MAX_EDGE / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * k));
    const h = Math.max(1, Math.round(h0 * k));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    // Şeffaf PNG'ler JPEG'e çevrilirken siyaha dönmesin.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
    return {
      id: crypto.randomUUID(),
      dataUrl,
      primary: false,
      caption: '',
      source: '',
      fileName: file.name || 'gorsel.jpg',
      mimeType: file.type,
      size: file.size,
      width: w0,
      height: h0,
      sha256,
      addedAt: new Date().toISOString(),
      addedBy: getAnalyst() || '',
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function getPhotos(identifier) {
  return Array.isArray(identifier?.photos) ? identifier.photos : [];
}

/** Ana fotoğraflar önce, sonra diğerleri (kendi sıralarında). */
export function sortedPhotos(identifier) {
  const all = getPhotos(identifier);
  return [...all.filter((p) => p.primary), ...all.filter((p) => !p.primary)];
}

/** Düğüm / liste avatarı: ilk ana fotoğraf; yoksa null. */
export function getAvatarPhoto(identifier) {
  const all = getPhotos(identifier);
  return all.find((p) => p.primary) ?? null;
}
