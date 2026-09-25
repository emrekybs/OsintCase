import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createProject } from '../utils/createProject.js';
import {
  downloadProject,
  readProjectFile,
  validateProject,
} from '../utils/projectIO.js';
import { saveRecent, markRecentSaved } from '../utils/recentProjects.js';
import { createSessionKey, decryptEnvelope } from '../utils/crypto.js';
import { getAnalyst } from '../utils/analyst.js';
import { getDisplayLabel, getTypeDef } from '../identifierTypes.js';
import { DEFAULT_PIN_COLOR } from '../pinColors.js';

const ProjectContext = createContext(null);

const AUTOSAVE_DELAY_MS = 500;

function analystName(project) {
  return getAnalyst() || project?.caseInfo?.investigator || 'Belirtilmedi';
}

/** Dosyaya işlem kaydı satırı ekler (saf fonksiyon). */
function withLog(p, action, detail = '') {
  const entry = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    analyst: analystName(p),
    action,
    detail,
  };
  return { ...p, auditLog: [...(p.auditLog ?? []), entry] };
}

function identLabel(i) {
  if (!i) return '';
  return `${getTypeDef(i.type).label}: ${getDisplayLabel(i)}`;
}

function pinLabel(pin) {
  if (!pin) return '';
  return (
    pin.label?.trim() ||
    pin.address?.trim() ||
    `${pin.lat?.toFixed?.(5)}, ${pin.lng?.toFixed?.(5)}`
  );
}

export function ProjectProvider({ children }) {
  const [project, setProject] = useState(null);
  const projectRef = useRef(null);
  // Şifreleme oturumu: { key, salt, iterations } ya da null.
  const sessionRef = useRef(null);
  const [isEncrypted, setIsEncrypted] = useState(false);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Her değişiklikte gecikmeli kurtarma kaydı. Parola varsa şifreli yazılır.
  useEffect(() => {
    if (!project) return;
    const t = setTimeout(
      () => saveRecent(project, { session: sessionRef.current }),
      AUTOSAVE_DELAY_MS,
    );
    return () => clearTimeout(t);
  }, [project, isEncrypted]);

  const setSession = (session) => {
    sessionRef.current = session;
    setIsEncrypted(!!session);
  };

  const updateProject = useCallback((updater) => {
    setProject((current) => {
      if (!current) return current;
      const next = typeof updater === 'function' ? updater(current) : updater;
      if (next === current) return current;
      return { ...next, updatedAt: new Date().toISOString() };
    });
  }, []);

  const logAction = useCallback(
    (action, detail = '') => updateProject((p) => withLog(p, action, detail)),
    [updateProject],
  );

  // ---- Dosya yaşam döngüsü ---------------------------------------------------

  const newProject = (init) => {
    const created = withLog(
      createProject(init),
      'Dosya oluşturuldu',
      init?.name ?? '',
    );
    setSession(null);
    setProject(created);
    saveRecent(created, { lastSavedAt: null });
  };

  const openLoaded = (loaded, session, how) => {
    const logged = withLog(loaded, 'Dosya açıldı', how);
    setSession(session);
    setProject(logged);
    saveRecent(logged, {
      lastSavedAt: new Date().toISOString(),
      session,
    });
    return logged;
  };

  /**
   * Dosya seçildiğinde çağrılır. Şifreliyse { needsPassword, envelope }
   * döner ve açma işini openEncryptedFile üstlenir.
   */
  const openProjectFromFile = async (file) => {
    const res = await readProjectFile(file);
    if (res.encrypted) return { needsPassword: true, envelope: res.envelope };
    const opened = openLoaded(res.project, null, `${file.name} (şifresiz)`);
    return { project: opened };
  };

  const openEncryptedFile = async (envelope, password, fileName = '') => {
    const { data, session } = await decryptEnvelope(envelope, password);
    const loaded = validateProject(data);
    return openLoaded(loaded, session, `${fileName} (şifreli)`.trim());
  };

  // Kurtarma kaydından devam. Şifreli kayıtlar parola ister.
  const openProjectFromSnapshot = async (entry, password) => {
    if (!entry) return null;
    if (entry.encrypted) {
      const { data, session } = await decryptEnvelope(entry.envelope, password);
      const loaded = validateProject(data);
      setSession(session);
      setProject(loaded);
      return loaded;
    }
    const loaded = validateProject(entry.snapshot);
    setSession(null);
    setProject(loaded);
    return loaded;
  };

  const closeProject = () => {
    const current = projectRef.current;
    if (current) saveRecent(current, { session: sessionRef.current });
    setProject(null);
    setSession(null);
  };

  const saveProject = async () => {
    const current = projectRef.current;
    if (!current) return;
    const logged = withLog(
      current,
      'Dosya kaydedildi',
      sessionRef.current ? 'Şifreli (AES-256-GCM)' : 'Şifresiz',
    );
    const stamped = await downloadProject(logged, {
      session: sessionRef.current,
    });
    setProject(stamped);
    const savedAt = new Date().toISOString();
    await saveRecent(stamped, {
      lastSavedAt: savedAt,
      session: sessionRef.current,
    });
    await markRecentSaved(stamped.id, savedAt);
  };

  const setPassword = async (password) => {
    const session = await createSessionKey(password);
    const wasEncrypted = !!sessionRef.current;
    setSession(session);
    logAction(
      wasEncrypted ? 'Dosya parolası değiştirildi' : 'Dosya şifrelendi',
      'AES-256-GCM, PBKDF2-SHA256',
    );
  };

  const removePassword = () => {
    setSession(null);
    logAction('Dosya şifrelemesi kaldırıldı');
  };

  // ---- Künye -----------------------------------------------------------------

  const updateCaseMeta = ({ name, classification, caseInfo, target }) => {
    updateProject((p) => {
      const next = {
        ...p,
        name: name != null ? name.trim() || p.name : p.name,
        classification: classification ?? p.classification,
        caseInfo: { ...(p.caseInfo ?? {}), ...(caseInfo ?? {}) },
        target: { ...(p.target ?? {}), ...(target ?? {}) },
      };
      const changes = [];
      if (next.classification !== p.classification)
        changes.push(`gizlilik: ${next.classification}`);
      if (next.caseInfo.status !== p.caseInfo?.status)
        changes.push(`durum: ${next.caseInfo.status}`);
      if (next.caseInfo.priority !== p.caseInfo?.priority)
        changes.push(`öncelik: ${next.caseInfo.priority}`);
      return withLog(next, 'Künye güncellendi', changes.join(', '));
    });
  };

  // ---- Tanımlayıcılar ----------------------------------------------------------

  const buildIdentifier = (identifier, idx, now) => ({
    id: identifier.id ?? crypto.randomUUID(),
    type: identifier.type,
    fields: identifier.fields ?? {},
    notes: identifier.notes ?? '',
    position: identifier.position ?? {
      x: 60 + (idx % 4) * 240,
      y: 60 + Math.floor(idx / 4) * 150,
    },
    customIconId: identifier.customIconId ?? null,
    reliability: identifier.reliability ?? null,
    createdAt: now,
    updatedAt: now,
  });

  const addIdentifier = (identifier) => {
    const now = new Date().toISOString();
    let created;
    updateProject((p) => {
      created = buildIdentifier(identifier, p.identifiers.length, now);
      return withLog(
        { ...p, identifiers: [...p.identifiers, created] },
        'Tanımlayıcı eklendi',
        identLabel(created),
      );
    });
    return created;
  };

  const bulkAddIdentifiers = (records) => {
    if (!records || records.length === 0) return [];
    const now = new Date().toISOString();
    const built = [];
    updateProject((p) => {
      const startIdx = p.identifiers.length;
      records.forEach((r, i) => built.push(buildIdentifier(r, startIdx + i, now)));
      return withLog(
        { ...p, identifiers: [...p.identifiers, ...built] },
        'Tanımlayıcılar çoğaltıldı',
        `${built.length} adet`,
      );
    });
    return built;
  };

  const updateIdentifier = (id, patch) => {
    const positionOnly =
      Object.keys(patch).length === 1 && 'position' in patch;
    updateProject((p) => {
      let updated = null;
      const next = {
        ...p,
        identifiers: p.identifiers.map((it) => {
          if (it.id !== id) return it;
          updated = {
            ...it,
            ...patch,
            id: it.id,
            updatedAt: new Date().toISOString(),
          };
          return updated;
        }),
      };
      if (positionOnly || !updated) return next;
      return withLog(next, 'Tanımlayıcı güncellendi', identLabel(updated));
    });
  };

  /** Toplu konum güncellemesi (otomatik yerleşim). Tek render. */
  const setIdentifierPositions = (positions) => {
    updateProject((p) => ({
      ...p,
      identifiers: p.identifiers.map((it) =>
        positions[it.id] ? { ...it, position: positions[it.id] } : it,
      ),
    }));
  };

  const deleteIdentifier = (id) => {
    updateProject((p) => {
      const victim = p.identifiers.find((it) => it.id === id);
      const next = {
        ...p,
        identifiers: p.identifiers.filter((it) => it.id !== id),
        connections: p.connections.filter(
          (c) => c.source !== id && c.target !== id,
        ),
        pinLinks: (p.pinLinks ?? []).filter((l) => l.identifierId !== id),
      };
      return victim
        ? withLog(next, 'Tanımlayıcı silindi', identLabel(victim))
        : next;
    });
  };

  // ---- Bağlantılar -------------------------------------------------------------

  const addConnection = (
    source,
    target,
    sourceHandle = null,
    targetHandle = null,
  ) => {
    if (!source || !target || source === target) return null;
    let created = null;
    updateProject((p) => {
      const exists = p.connections.some(
        (c) =>
          (c.source === source && c.target === target) ||
          (c.source === target && c.target === source),
      );
      if (exists) return p;
      created = {
        id: crypto.randomUUID(),
        source,
        target,
        sourceHandle: sourceHandle ?? null,
        targetHandle: targetHandle ?? null,
        label: '',
        confidence: 'kesin',
      };
      const a = p.identifiers.find((i) => i.id === source);
      const b = p.identifiers.find((i) => i.id === target);
      return withLog(
        { ...p, connections: [...p.connections, created] },
        'Bağlantı kuruldu',
        `${getDisplayLabel(a)} ↔ ${getDisplayLabel(b)}`,
      );
    });
    return created;
  };

  const updateConnection = (id, patch) => {
    updateProject((p) => {
      const next = {
        ...p,
        connections: p.connections.map((c) =>
          c.id === id ? { ...c, ...patch, id: c.id } : c,
        ),
      };
      const c = next.connections.find((x) => x.id === id);
      return withLog(
        next,
        'Bağlantı güncellendi',
        [c?.label, c?.confidence].filter(Boolean).join(' · '),
      );
    });
  };

  const deleteConnection = (id) => {
    updateProject((p) => {
      const c = p.connections.find((x) => x.id === id);
      const next = {
        ...p,
        connections: p.connections.filter((x) => x.id !== id),
      };
      if (!c) return next;
      const a = p.identifiers.find((i) => i.id === c.source);
      const b = p.identifiers.find((i) => i.id === c.target);
      return withLog(
        next,
        'Bağlantı silindi',
        `${getDisplayLabel(a)} ↔ ${getDisplayLabel(b)}`,
      );
    });
  };

  // ---- Konumlar ------------------------------------------------------------------

  const addPin = (pin) => {
    const now = new Date().toISOString();
    const record = {
      id: pin.id ?? crypto.randomUUID(),
      label: pin.label ?? '',
      address: pin.address ?? '',
      lat: pin.lat,
      lng: pin.lng,
      placeId: pin.placeId ?? null,
      visitedAt: pin.visitedAt ?? '',
      withWho: pin.withWho ?? '',
      notes: pin.notes ?? '',
      color: pin.color ?? DEFAULT_PIN_COLOR,
      iconId: pin.iconId ?? null,
      radius: pin.radius ?? 0,
      sightings: pin.sightings ?? [],
      createdAt: now,
      updatedAt: now,
    };
    updateProject((p) =>
      withLog(
        { ...p, locations: [...p.locations, record] },
        'Konum eklendi',
        `${record.lat.toFixed(5)}, ${record.lng.toFixed(5)}`,
      ),
    );
    return record;
  };

  const updatePin = (id, patch, { silent = false } = {}) => {
    updateProject((p) => {
      let updated = null;
      const next = {
        ...p,
        locations: p.locations.map((it) => {
          if (it.id !== id) return it;
          updated = {
            ...it,
            ...patch,
            id: it.id,
            updatedAt: new Date().toISOString(),
          };
          return updated;
        }),
      };
      if (silent || !updated) return next;
      return withLog(next, 'Konum güncellendi', pinLabel(updated));
    });
  };

  const deletePin = (id) => {
    updateProject((p) => {
      const victim = p.locations.find((it) => it.id === id);
      const next = {
        ...p,
        locations: p.locations.filter((it) => it.id !== id),
        pinLinks: (p.pinLinks ?? []).filter((l) => l.pinId !== id),
        events: (p.events ?? []).map((e) =>
          e.pinIds?.includes(id)
            ? { ...e, pinIds: e.pinIds.filter((x) => x !== id) }
            : e,
        ),
      };
      return victim ? withLog(next, 'Konum silindi', pinLabel(victim)) : next;
    });
  };

  const addPinLink = (pinId, identifierId, context = '') => {
    if (!pinId || !identifierId) return null;
    let created = null;
    updateProject((p) => {
      const existing = (p.pinLinks ?? []).find(
        (l) => l.pinId === pinId && l.identifierId === identifierId,
      );
      if (existing) {
        created = existing;
        return p;
      }
      created = {
        id: crypto.randomUUID(),
        pinId,
        identifierId,
        context,
        createdAt: new Date().toISOString(),
      };
      const pin = p.locations.find((x) => x.id === pinId);
      const ident = p.identifiers.find((x) => x.id === identifierId);
      return withLog(
        { ...p, pinLinks: [...(p.pinLinks ?? []), created] },
        'Konum-tanımlayıcı ilişkilendirildi',
        `${pinLabel(pin)} ↔ ${getDisplayLabel(ident)}`,
      );
    });
    return created;
  };

  const updateMapDisplay = (patch) => {
    updateProject((p) => ({
      ...p,
      mapDisplay: {
        showPinConnections: false,
        pinConnectionColor: '#ef4444',
        showRadius: true,
        showDensity: false,
        ...(p.mapDisplay ?? {}),
        ...patch,
      },
    }));
  };

  const setPinLinkContext = (pinId, identifierId, context) => {
    updateProject((p) => ({
      ...p,
      pinLinks: (p.pinLinks ?? []).map((l) =>
        l.pinId === pinId && l.identifierId === identifierId
          ? { ...l, context }
          : l,
      ),
    }));
  };

  const removePinLink = (linkId) => {
    if (!linkId) return;
    updateProject((p) => ({
      ...p,
      pinLinks: (p.pinLinks ?? []).filter((l) => l.id !== linkId),
    }));
  };

  const removePinLinkByPair = (pinId, identifierId) => {
    updateProject((p) =>
      withLog(
        {
          ...p,
          pinLinks: (p.pinLinks ?? []).filter(
            (l) => !(l.pinId === pinId && l.identifierId === identifierId),
          ),
        },
        'Konum-tanımlayıcı ilişkisi kaldırıldı',
        `${pinLabel(p.locations.find((x) => x.id === pinId))} ↔ ${getDisplayLabel(
          p.identifiers.find((x) => x.id === identifierId),
        )}`,
      ),
    );
  };

  // ---- Kronoloji -----------------------------------------------------------------

  const addEvent = (event) => {
    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      date: '',
      time: '',
      title: '',
      description: '',
      category: 'olay',
      identifierIds: [],
      pinIds: [],
      evidenceIds: [],
      reliability: null,
      ...event,
      createdAt: now,
      updatedAt: now,
    };
    updateProject((p) =>
      withLog(
        { ...p, events: [...(p.events ?? []), record] },
        'Olay eklendi',
        `${record.date} ${record.title}`.trim(),
      ),
    );
    return record;
  };

  const updateEvent = (id, patch) => {
    updateProject((p) => {
      const next = {
        ...p,
        events: (p.events ?? []).map((e) =>
          e.id === id
            ? { ...e, ...patch, id: e.id, updatedAt: new Date().toISOString() }
            : e,
        ),
      };
      const e = next.events.find((x) => x.id === id);
      return withLog(next, 'Olay güncellendi', `${e?.date ?? ''} ${e?.title ?? ''}`.trim());
    });
  };

  const deleteEvent = (id) => {
    updateProject((p) => {
      const e = (p.events ?? []).find((x) => x.id === id);
      return withLog(
        { ...p, events: (p.events ?? []).filter((x) => x.id !== id) },
        'Olay silindi',
        `${e?.date ?? ''} ${e?.title ?? ''}`.trim(),
      );
    });
  };

  // ---- Deliller ------------------------------------------------------------------

  const addEvidence = (item) => {
    const now = new Date().toISOString();
    const analyst = analystName(projectRef.current);
    let created;
    updateProject((p) => {
      const n = (p.evidence ?? []).length + 1;
      const usedNumbers = new Set((p.evidence ?? []).map((e) => e.number));
      let seq = n;
      let number = `D-${String(seq).padStart(3, '0')}`;
      while (usedNumbers.has(number)) {
        seq += 1;
        number = `D-${String(seq).padStart(3, '0')}`;
      }
      created = {
        id: crypto.randomUUID(),
        number,
        title: item.title ?? item.fileName ?? '',
        description: item.description ?? '',
        fileName: item.fileName ?? '',
        mimeType: item.mimeType ?? '',
        size: item.size ?? 0,
        sha256: item.sha256,
        dataUrl: item.dataUrl ?? null,
        source: item.source ?? '',
        acquiredAt: item.acquiredAt ?? '',
        identifierIds: item.identifierIds ?? [],
        pinIds: item.pinIds ?? [],
        addedAt: now,
        addedBy: analyst,
        custody: [
          {
            id: crypto.randomUUID(),
            ts: now,
            action: 'Kayda alındı',
            person: analyst,
            note: `SHA-256: ${item.sha256}`,
          },
        ],
        verifications: [],
      };
      return withLog(
        { ...p, evidence: [...(p.evidence ?? []), created] },
        'Delil kayda alındı',
        `${created.number} ${created.fileName} · SHA-256 ${created.sha256.slice(0, 16)}…`,
      );
    });
    return created;
  };

  const updateEvidence = (id, patch) => {
    updateProject((p) => {
      const next = {
        ...p,
        evidence: (p.evidence ?? []).map((e) =>
          e.id === id
            ? { ...e, ...patch, id: e.id, sha256: e.sha256, number: e.number }
            : e,
        ),
      };
      const e = next.evidence.find((x) => x.id === id);
      return withLog(next, 'Delil bilgisi güncellendi', e?.number ?? '');
    });
  };

  const addCustodyEntry = (id, { action, person, note }) => {
    updateProject((p) => {
      let number = '';
      const next = {
        ...p,
        evidence: (p.evidence ?? []).map((e) => {
          if (e.id !== id) return e;
          number = e.number;
          return {
            ...e,
            custody: [
              ...(e.custody ?? []),
              {
                id: crypto.randomUUID(),
                ts: new Date().toISOString(),
                action,
                person: person || analystName(p),
                note: note ?? '',
              },
            ],
          };
        }),
      };
      return withLog(next, 'Teslim zinciri kaydı', `${number} · ${action}`);
    });
  };

  const recordVerification = (id, { ok, fileName, sha256 }) => {
    updateProject((p) => {
      let number = '';
      const ts = new Date().toISOString();
      const analyst = analystName(p);
      const next = {
        ...p,
        evidence: (p.evidence ?? []).map((e) => {
          if (e.id !== id) return e;
          number = e.number;
          return {
            ...e,
            verifications: [
              ...(e.verifications ?? []),
              { id: crypto.randomUUID(), ts, ok, fileName, sha256, analyst },
            ],
          };
        }),
      };
      return withLog(
        next,
        ok ? 'Delil doğrulandı' : 'DELİL DOĞRULAMASI BAŞARISIZ',
        `${number} · ${fileName}`,
      );
    });
  };

  const deleteEvidence = (id, reason = '') => {
    updateProject((p) => {
      const e = (p.evidence ?? []).find((x) => x.id === id);
      return withLog(
        {
          ...p,
          evidence: (p.evidence ?? []).filter((x) => x.id !== id),
          events: (p.events ?? []).map((ev) =>
            ev.evidenceIds?.includes(id)
              ? { ...ev, evidenceIds: ev.evidenceIds.filter((x) => x !== id) }
              : ev,
          ),
        },
        'Delil kayıttan çıkarıldı',
        `${e?.number ?? ''} ${e?.fileName ?? ''} · SHA-256 ${e?.sha256 ?? ''}${reason ? ` · Gerekçe: ${reason}` : ''}`,
      );
    });
  };

  return (
    <ProjectContext.Provider
      value={{
        project,
        isEncrypted,
        newProject,
        openProjectFromFile,
        openEncryptedFile,
        openProjectFromSnapshot,
        closeProject,
        saveProject,
        setPassword,
        removePassword,
        updateProject,
        logAction,
        updateCaseMeta,
        addIdentifier,
        bulkAddIdentifiers,
        updateIdentifier,
        setIdentifierPositions,
        deleteIdentifier,
        addConnection,
        updateConnection,
        deleteConnection,
        addPin,
        updatePin,
        deletePin,
        addPinLink,
        removePinLink,
        removePinLinkByPair,
        setPinLinkContext,
        updateMapDisplay,
        addEvent,
        updateEvent,
        deleteEvent,
        addEvidence,
        updateEvidence,
        addCustodyEntry,
        recordVerification,
        deleteEvidence,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
