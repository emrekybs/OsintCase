import { PROJECT_SCHEMA_VERSION, defaultCaseInfo } from './createProject.js';
import { DEFAULT_CLASSIFICATION } from '../caseModel.js';
import { t } from '../i18n/index.jsx';
import {
  encryptWithSession,
  isEncryptedEnvelope,
} from './crypto.js';

function safeFileName(name) {
  return (name || 'dosya')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9-_]+/gi, '_')
    .toLowerCase();
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Dosyayı indirir. `session` verilirse AES-256-GCM ile şifreli zarf olarak
 * (<ad>.case.enc.json) kaydeder; yoksa düz JSON (<ad>.case.json).
 */
export async function downloadProject(project, { session } = {}) {
  const stamped = { ...project, updatedAt: new Date().toISOString() };
  const base = safeFileName(stamped.name);
  if (session) {
    const envelope = await encryptWithSession(session, stamped);
    triggerDownload(
      new Blob([JSON.stringify(envelope)], { type: 'application/json' }),
      `${base}.case.enc.json`,
    );
  } else {
    triggerDownload(
      new Blob([JSON.stringify(stamped, null, 2)], {
        type: 'application/json',
      }),
      `${base}.case.json`,
    );
  }
  return stamped;
}

/**
 * Dosyayı okur. Şifreliyse { encrypted: true, envelope } döner (parola
 * sorulması çağıranın işi); değilse { encrypted: false, project }.
 */
export function readProjectFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (isEncryptedEnvelope(parsed)) {
          resolve({ encrypted: true, envelope: parsed });
          return;
        }
        resolve({ encrypted: false, project: validateProject(parsed) });
      } catch (err) {
        reject(
          err instanceof SyntaxError
            ? new Error(t('Dosya geçerli bir JSON değil.'))
            : err,
        );
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

const arr = (v) => (Array.isArray(v) ? v : []);

export function validateProject(obj) {
  if (!obj || typeof obj !== 'object') {
    throw new Error(t('Dosya geçerli bir JSON nesnesi değil.'));
  }
  if (typeof obj.name !== 'string') {
    throw new Error(t('Dosyada "name" alanı eksik.'));
  }
  if (
    obj.schemaVersion != null &&
    obj.schemaVersion > PROJECT_SCHEMA_VERSION
  ) {
    console.warn(
      `Dosya şema sürümü (${obj.schemaVersion}) bu uygulamadan (${PROJECT_SCHEMA_VERSION}) yeni.`,
    );
  }
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: obj.id || crypto.randomUUID(),
    name: obj.name,
    createdAt: obj.createdAt || new Date().toISOString(),
    updatedAt: obj.updatedAt || new Date().toISOString(),
    classification:
      typeof obj.classification === 'string'
        ? obj.classification
        : DEFAULT_CLASSIFICATION,
    caseInfo: { ...defaultCaseInfo(), openedAt: '', ...(obj.caseInfo ?? {}) },
    target: {
      name: obj.target?.name ?? '',
      notes: obj.target?.notes ?? '',
    },
    identifiers: arr(obj.identifiers),
    connections: arr(obj.connections),
    locations: arr(obj.locations),
    pinLinks: arr(obj.pinLinks),
    events: arr(obj.events),
    evidence: arr(obj.evidence),
    auditLog: arr(obj.auditLog),
    mapDisplay: {
      showPinConnections: !!obj.mapDisplay?.showPinConnections,
      pinConnectionColor:
        typeof obj.mapDisplay?.pinConnectionColor === 'string'
          ? obj.mapDisplay.pinConnectionColor
          : '#ef4444',
      showRadius: obj.mapDisplay?.showRadius !== false,
      showDensity: !!obj.mapDisplay?.showDensity,
    },
  };
}
