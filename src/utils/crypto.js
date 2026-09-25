/**
 * Tarayıcı içi kriptografi yardımcıları (WebCrypto).
 *
 *  - SHA-256 özet (delil bütünlüğü)
 *  - PBKDF2-SHA256 ile paroladan anahtar türetme
 *  - AES-256-GCM ile şifreleme / çözme
 *
 * Hiçbir veri cihaz dışına çıkmaz; tüm işlemler tarayıcının kendi kripto
 * motorunda yapılır.
 */

export const ENVELOPE_FORMAT = 'osint-case-encrypted';
export const ENVELOPE_VERSION = 1;
export const PBKDF2_ITERATIONS = 600000;

const enc = new TextEncoder();
const dec = new TextDecoder();

export function bufToHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function b64ToBuf(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** SHA-256 özetini onaltılık (hex) metin olarak döndürür. */
export async function sha256Hex(data) {
  const buf =
    typeof data === 'string'
      ? enc.encode(data)
      : data instanceof ArrayBuffer
      ? data
      : data.buffer
      ? data
      : await data.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return bufToHex(digest);
}

export function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** Paroladan AES-GCM anahtarı türetir. */
export async function deriveKey(password, salt, iterations = PBKDF2_ITERATIONS) {
  const base = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Bir oturum anahtarı oluşturur: { key, salt, iterations }.
 * Aynı anahtar hem dosya kaydında hem otomatik kurtarma kaydında kullanılır;
 * her şifrelemede yeni bir IV üretilir.
 */
export async function createSessionKey(password) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return { key, salt, iterations: PBKDF2_ITERATIONS };
}

export async function encryptWithSession(session, obj) {
  const iv = randomBytes(12);
  const plaintext = enc.encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    session.key,
    plaintext,
  );
  return {
    format: ENVELOPE_FORMAT,
    version: ENVELOPE_VERSION,
    kdf: 'PBKDF2-SHA256',
    iterations: session.iterations,
    cipher: 'AES-256-GCM',
    salt: bufToB64(session.salt),
    iv: bufToB64(iv),
    data: bufToB64(ct),
  };
}

export function isEncryptedEnvelope(obj) {
  return !!obj && typeof obj === 'object' && obj.format === ENVELOPE_FORMAT;
}

/**
 * Zarfı parolayla çözer. Başarılıysa { data, session } döner; session aynı
 * tuz ile türetilmiş anahtardır, böylece sonraki kayıtlar parolayı tekrar
 * sormadan şifrelenebilir.
 * Yanlış parolada 'WRONG_PASSWORD' kodlu hata fırlatır.
 */
export async function decryptEnvelope(envelope, password) {
  const salt = b64ToBuf(envelope.salt);
  const iterations = envelope.iterations || PBKDF2_ITERATIONS;
  const key = await deriveKey(password, salt, iterations);
  const session = { key, salt, iterations };
  const data = await decryptWithSession(session, envelope);
  return { data, session };
}

export async function decryptWithSession(session, envelope) {
  try {
    const pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64ToBuf(envelope.iv) },
      session.key,
      b64ToBuf(envelope.data),
    );
    return JSON.parse(dec.decode(pt));
  } catch {
    const err = new Error('Parola hatalı ya da dosya bozulmuş.');
    err.code = 'WRONG_PASSWORD';
    throw err;
  }
}

/** Basit parola gücü değerlendirmesi (0-4). */
export function passwordStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 10) score++;
  if (pw.length >= 14) score++;
  if (/[a-zçğıöşü]/.test(pw) && /[A-ZÇĞİÖŞÜ]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9çğıöşüÇĞİÖŞÜ]/.test(pw)) score++;
  return Math.min(score, 4);
}
