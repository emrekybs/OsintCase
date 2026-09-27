import { DEFAULT_CLASSIFICATION, suggestCaseNumber } from '../caseModel.js';

// v1: orijinal şema. v2: künye, gizlilik derecesi, kronoloji, deliller,
// işlem kaydı eklendi. v1 dosyalar sorunsuz açılır (eksik alanlar boş gelir).
export const PROJECT_SCHEMA_VERSION = 2;

export function defaultCaseInfo() {
  return {
    caseNumber: '',
    investigator: '',
    unit: '',
    status: 'acik',
    priority: 'orta',
    openedAt: new Date().toISOString().slice(0, 10),
    legalBasis: '',
    summary: '',
  };
}

export function createProject({
  name,
  targetName = '',
  notes = '',
  caseNumber,
  investigator = '',
  unit = '',
  classification = DEFAULT_CLASSIFICATION,
  priority = 'orta',
}) {
  const now = new Date().toISOString();
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name: name.trim() || 'Adsız dosya',
    createdAt: now,
    updatedAt: now,
    classification,
    caseInfo: {
      ...defaultCaseInfo(),
      caseNumber: (caseNumber ?? suggestCaseNumber()).trim(),
      investigator: investigator.trim(),
      unit: unit.trim(),
      priority,
    },
    target: {
      name: targetName.trim(),
      notes: notes.trim(),
    },
    identifiers: [],
    connections: [],
    locations: [],
    pinLinks: [],
    events: [],
    evidence: [],
    auditLog: [],
    mapDisplay: {
      showPinConnections: false,
      pinConnectionColor: '#ef4444',
      showRadius: true,
      showDensity: false,
    },
  };
}
