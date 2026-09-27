/**
 * Son dosyalar / otomatik kurtarma kaydı (IndexedDB).
 *
 * Her değişiklikte dosyanın anlık görüntüsü tarayıcıda saklanır; böylece
 * kaydetmeden geri çıkılırsa iş kaybolmaz. Açılış ekranı bu listeyi okur.
 *
 * Güvenlik:
 *   - Dosyaya parola konmuşsa anlık görüntü AES-256-GCM ile ŞİFRELİ saklanır
 *     (entry.envelope). Listede dosya adı bile görünmez.
 *   - Parola yoksa görüntü düz metin saklanır (orijinal davranış) ve arayüz
 *     bunu "ŞİFRESİZ" olarak işaretler.
 *   - Otomatik kurtarma kaydı ayarlardan tamamen kapatılabilir.
 *
 * Eski sürüm localStorage kullanıyordu; ilk açılışta oradaki kayıtlar
 * IndexedDB'ye taşınır ve localStorage'dan silinir.
 *
 * Kayıt şekli:
 *   {
 *     id, name, encrypted: bool,
 *     snapshot?: object,        // şifresizse tam dosya
 *     envelope?: object,        // şifreliyse zarf
 *     classification?: string,
 *     snapshotAt: ISO, updatedAt: ISO, lastSavedAt: ISO|null
 *   }
 */
import { encryptWithSession } from './crypto.js';

const DB_NAME = 'osint-tool';
const STORE = 'recents';
const LEGACY_KEY = 'osint-tool:recent-projects';
const AUTOSNAPSHOT_KEY = 'osint-tool:autosnapshot';
export const MAX_RECENTS = 6;

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB yok'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).then(async (db) => {
    await migrateLegacy(db);
    return db;
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    Promise.resolve(fn(store)).then((r) => {
      result = r;
    });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function migrateLegacy(db) {
  let raw = null;
  try {
    raw = localStorage.getItem(LEGACY_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      await tx(db, 'readwrite', (store) => {
        for (const r of list) {
          if (!r?.id || !r.snapshot) continue;
          store.put({
            id: r.id,
            name: r.name ?? r.snapshot?.name ?? 'Adsız dosya',
            encrypted: false,
            snapshot: r.snapshot,
            classification: r.snapshot?.classification ?? null,
            snapshotAt: r.snapshotAt ?? new Date().toISOString(),
            updatedAt: r.snapshot?.updatedAt ?? r.snapshotAt ?? null,
            lastSavedAt: r.lastSavedAt ?? null,
          });
        }
      });
    }
  } catch {
    /* bozuk eski kayıt — yok say */
  }
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

export function isAutoSnapshotEnabled() {
  try {
    return localStorage.getItem(AUTOSNAPSHOT_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setAutoSnapshotEnabled(on) {
  try {
    localStorage.setItem(AUTOSNAPSHOT_KEY, on ? 'on' : 'off');
  } catch {}
}

export async function loadRecents() {
  try {
    const db = await openDb();
    const all = await tx(db, 'readonly', (store) =>
      reqToPromise(store.getAll()),
    );
    return (all ?? [])
      .filter((r) => r && (r.snapshot || r.envelope))
      .sort((a, b) => (b.snapshotAt ?? '').localeCompare(a.snapshotAt ?? ''));
  } catch {
    return [];
  }
}

async function getRecent(db, id) {
  return tx(db, 'readonly', (store) => reqToPromise(store.get(id)));
}

async function prune(db) {
  const all = await tx(db, 'readonly', (store) => reqToPromise(store.getAll()));
  const sorted = (all ?? []).sort((a, b) =>
    (b.snapshotAt ?? '').localeCompare(a.snapshotAt ?? ''),
  );
  const extra = sorted.slice(MAX_RECENTS);
  if (extra.length === 0) return;
  await tx(db, 'readwrite', (store) => {
    for (const e of extra) store.delete(e.id);
  });
}

/**
 * Dosyanın anlık görüntüsünü yazar. `session` verilirse şifreli yazar.
 * `lastSavedAt` verilmezse önceki değer korunur.
 */
export async function saveRecent(project, { lastSavedAt, session } = {}) {
  if (!project || !project.id) return;
  if (!isAutoSnapshotEnabled()) {
    await removeRecent(project.id);
    return;
  }
  try {
    const db = await openDb();
    const previous = await getRecent(db, project.id);
    const base = {
      id: project.id,
      classification: project.classification ?? null,
      snapshotAt: new Date().toISOString(),
      updatedAt: project.updatedAt ?? null,
      lastSavedAt:
        lastSavedAt !== undefined ? lastSavedAt : previous?.lastSavedAt ?? null,
    };
    let entry;
    if (session) {
      entry = {
        ...base,
        name: 'Şifreli dosya',
        encrypted: true,
        envelope: await encryptWithSession(session, project),
      };
    } else {
      entry = {
        ...base,
        name: project.name ?? 'Adsız dosya',
        caseNumber: project.caseInfo?.caseNumber ?? '',
        encrypted: false,
        snapshot: project,
      };
    }
    await tx(db, 'readwrite', (store) => store.put(entry));
    await prune(db);
  } catch (err) {
    console.warn('Otomatik kurtarma kaydı yazılamadı:', err);
  }
}

export async function markRecentSaved(projectId, savedAt = new Date().toISOString()) {
  if (!projectId) return;
  try {
    const db = await openDb();
    const cur = await getRecent(db, projectId);
    if (!cur) return;
    await tx(db, 'readwrite', (store) =>
      store.put({ ...cur, lastSavedAt: savedAt }),
    );
  } catch {}
}

export async function removeRecent(projectId) {
  try {
    const db = await openDb();
    await tx(db, 'readwrite', (store) => store.delete(projectId));
  } catch {}
  return loadRecents();
}

export async function clearAllRecents() {
  try {
    const db = await openDb();
    await tx(db, 'readwrite', (store) => store.clear());
  } catch {}
}

export function hasUnsavedChanges(entry) {
  if (!entry) return false;
  if (!entry.lastSavedAt) return true;
  const projectUpdated = entry.updatedAt ?? entry.snapshotAt ?? null;
  if (!projectUpdated) return false;
  return (
    new Date(projectUpdated).getTime() > new Date(entry.lastSavedAt).getTime()
  );
}
