import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useProject } from '../context/ProjectContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useNavigation } from '../context/NavigationContext.jsx';
import { useNodeHistory } from '../context/NodeHistoryContext.jsx';
import {
  getTypeDef,
  getDisplayLabel,
  getSecondaryLabel,
} from '../identifierTypes.js';
import IdentifierBadge from './IdentifierBadge.jsx';
import IdentifierModal from './IdentifierModal.jsx';
import IdentifierNode, { AdmiraltyTag } from './IdentifierNode.jsx';
import NodeCreationMenu from './NodeCreationMenu.jsx';
import EdgeModal from './EdgeModal.jsx';
import { LINK_CONFIDENCE, findOption } from '../caseModel.js';
import {
  componentCount,
  degreeMap,
  forceLayout,
  shortestPath,
} from '../utils/graph.js';
import { downloadGraphPng, downloadGraphSvg } from '../utils/graphExport.js';
import './InfoTab.css';
import { t } from '../i18n/index.jsx';

const NODE_TYPES = { identifier: IdentifierNode };

const DEFAULT_EDGE_OPTIONS = {
  type: 'default',
};

const OPPOSITE_HANDLE = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

export default function InfoTab() {
  return (
    <ReactFlowProvider>
      <InfoTabInner />
    </ReactFlowProvider>
  );
}

function InfoTabInner() {
  const {
    project,
    addIdentifier,
    bulkAddIdentifiers,
    updateIdentifier,
    deleteIdentifier,
    addConnection,
    updateConnection,
    deleteConnection,
    setIdentifierPositions,
    logAction,
  } = useProject();
  const { theme } = useTheme();
  const { setHoveredIdentifierId, focus, consumeFocus } = useNavigation();
  const {
    recordCreate,
    recordBatchCreate,
    recordDelete,
    recordBatchDelete,
    recordMove,
    recordBatchMove,
    recordCreateEdge,
    recordBatchDeleteEdges,
    recordCreateNodeWithEdge,
    undo,
    redo,
    setClipboard,
    getClipboard,
  } = useNodeHistory();
  const dragStartPositionsRef = useRef(new Map());
  const identifiers = useMemo(
    () => project?.identifiers ?? [],
    [project?.identifiers],
  );
  const connections = useMemo(
    () => project?.connections ?? [],
    [project?.connections],
  );

  const [modalState, setModalState] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [menuState, setMenuState] = useState(null);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [edgeModal, setEdgeModal] = useState(null);
  const [pathResult, setPathResult] = useState(null);
  const [showDegree, setShowDegree] = useState(false);
  const [toolMsg, setToolMsg] = useState('');
  const [sidebarQuery, setSidebarQuery] = useState('');

  const degrees = useMemo(
    () => degreeMap(identifiers, connections),
    [identifiers, connections],
  );
  const pathNodeSet = useMemo(
    () => (pathResult ? new Set(pathResult.nodes) : null),
    [pathResult],
  );
  const pathEdgeSet = useMemo(
    () => (pathResult ? new Set(pathResult.edges) : null),
    [pathResult],
  );
  const [focusedIdentifierId, setFocusedIdentifierId] = useState(null);
  const sidebarRowRefs = useRef(new Map());

  // React to NavigationContext focus requests targeted at an identifier.
  useEffect(() => {
    if (!focus || focus.kind !== 'identifier') return;
    const id = focus.id;
    const token = focus.token;
    setFocusedIdentifierId(id);
    // Scroll sidebar row into view if present.
    const row = sidebarRowRefs.current.get(id);
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const clearTimer = setTimeout(() => setFocusedIdentifierId(null), 2200);
    consumeFocus(token);
    return () => clearTimeout(clearTimer);
  }, [focus, consumeFocus]);

  // Reconcile nodes from identifiers.
  // Project position is authoritative — that way undo/redo (which updates the
  // project state) actually moves the node back on the canvas. Local state is
  // only a fallback (e.g. transient state during the React Flow drag itself,
  // when the project hasn't been written yet).
  useEffect(() => {
    setNodes((current) => {
      const currentMap = new Map(current.map((n) => [n.id, n]));
      return identifiers.map((id) => {
        const existing = currentMap.get(id.id);
        return {
          id: id.id,
          type: 'identifier',
          position:
            id.position ?? existing?.position ?? { x: 60, y: 60 },
          data: {
            identifier: id,
            degree: degrees.get(id.id) ?? 0,
            showDegree,
            highlight: pathNodeSet
              ? pathNodeSet.has(id.id)
                ? 'path'
                : 'dim'
              : null,
          },
          selected: existing?.selected ?? false,
        };
      });
    });
  }, [identifiers, degrees, showDegree, pathNodeSet]);

  // Edges mirror project connections exactly. Dedupe by id defensively in
  // case older project state ended up with duplicate connection records.
  useEffect(() => {
    const seen = new Set();
    const deduped = [];
    for (const c of connections) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      const conf = findOption(LINK_CONFIDENCE, c.confidence);
      const onPath = pathEdgeSet?.has(c.id);
      deduped.push({
        id: c.id,
        source: c.source,
        target: c.target,
        sourceHandle: c.sourceHandle ?? undefined,
        targetHandle: c.targetHandle ?? undefined,
        label: c.label || undefined,
        className: [
          `conf-${c.confidence ?? 'kesin'}`,
          onPath ? 'on-path' : '',
          pathEdgeSet && !onPath ? 'dimmed' : '',
        ]
          .filter(Boolean)
          .join(' '),
        style: conf?.dash ? { strokeDasharray: conf.dash } : undefined,
      });
    }
    setEdges(deduped);
  }, [connections, pathEdgeSet]);

  const onNodesChange = useCallback(
    (changes) => {
      setNodes((ns) => applyNodeChanges(changes, ns));

      // Multiple nodes can be removed in a single change-batch (e.g. delete-key
      // on a multi-select). Capture them all up front and record as a SINGLE
      // history entry so one Ctrl+Z restores the whole batch.
      const removes = changes.filter((c) => c.type === 'remove');
      if (removes.length === 0) return;
      const items = removes
        .map((c) => {
          const ident = (project?.identifiers ?? []).find(
            (i) => i.id === c.id,
          );
          if (!ident) return null;
          const connections = (project?.connections ?? []).filter(
            (co) => co.source === c.id || co.target === c.id,
          );
          const pinLinks = (project?.pinLinks ?? []).filter(
            (l) => l.identifierId === c.id,
          );
          return { identifier: ident, connections, pinLinks };
        })
        .filter(Boolean);
      // Commit deletions to project state.
      for (const c of removes) deleteIdentifier(c.id);
      // Record undo entry (single or batched).
      if (items.length === 1) {
        recordDelete(items[0].identifier, items[0].connections, items[0].pinLinks);
      } else if (items.length > 1) {
        recordBatchDelete(items);
      }
    },
    [
      deleteIdentifier,
      project?.identifiers,
      project?.connections,
      project?.pinLinks,
      recordDelete,
      recordBatchDelete,
    ],
  );

  const onEdgesChange = useCallback(
    (changes) => {
      setEdges((es) => applyEdgeChanges(changes, es));

      // Capture removed edge records BEFORE deletion so undo can restore them.
      const removes = changes.filter((c) => c.type === 'remove');
      if (removes.length === 0) return;
      const removed = removes
        .map((c) => (project?.connections ?? []).find((co) => co.id === c.id))
        .filter(Boolean);
      for (const c of removes) deleteConnection(c.id);
      if (removed.length === 1) recordBatchDeleteEdges([removed[0]]);
      else if (removed.length > 1) recordBatchDeleteEdges(removed);
    },
    [
      deleteConnection,
      project?.connections,
      recordBatchDeleteEdges,
    ],
  );

  const onConnect = useCallback(
    (params) => {
      const created = addConnection(
        params.source,
        params.target,
        params.sourceHandle,
        params.targetHandle,
      );
      if (created) recordCreateEdge(created);
    },
    [addConnection, recordCreateEdge],
  );

  // Blender-style: drag a wire to empty space → open a menu to create a new node.
  const onConnectEnd = useCallback(
    (event, connectionState) => {
      // Only fire when the drop wasn't on a valid handle.
      if (connectionState?.isValid) return;
      const sourceNodeId = connectionState?.fromNode?.id;
      if (!sourceNodeId) return;
      // Skip if the drop landed on an existing node body (toNode set, just no handle).
      if (connectionState?.toNode) return;
      const clientX =
        event.clientX ?? event.changedTouches?.[0]?.clientX;
      const clientY =
        event.clientY ?? event.changedTouches?.[0]?.clientY;
      if (clientX == null || clientY == null) return;
      const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
      setMenuState({
        sourceNodeId,
        sourceHandle: connectionState?.fromHandle?.id ?? null,
        screenX: clientX,
        screenY: clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition],
  );

  const handleMenuSelect = useCallback(
    (typeKey) => {
      if (!menuState) return;
      const { sourceNodeId, sourceHandle, flowX, flowY } = menuState;
      // Offset position so the node is roughly centered on the drop point.
      const created = addIdentifier({
        type: typeKey,
        position: { x: flowX - 110, y: flowY - 30 },
      });
      let createdConn = null;
      if (created && sourceNodeId) {
        // Target handle = opposite side of the source handle so the wire
        // routes naturally (e.g., dragging from the right handle lands on
        // the new node's left handle).
        const targetHandle = sourceHandle
          ? OPPOSITE_HANDLE[sourceHandle] ?? null
          : null;
        createdConn = addConnection(
          sourceNodeId,
          created.id,
          sourceHandle,
          targetHandle,
        );
      }
      // Record node + edge as a SINGLE undo entry so one Ctrl+Z removes both.
      if (created) recordCreateNodeWithEdge(created, createdConn);
      setMenuState(null);
    },
    [menuState, addIdentifier, addConnection, recordCreateNodeWithEdge],
  );

  // Right-click on the canvas pane → open the same menu (free-floating node,
  // no auto-connection).
  const onPaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      const clientX =
        event.clientX ?? event.changedTouches?.[0]?.clientX;
      const clientY =
        event.clientY ?? event.changedTouches?.[0]?.clientY;
      if (clientX == null || clientY == null) return;
      const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
      setMenuState({
        sourceNodeId: null,
        screenX: clientX,
        screenY: clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition],
  );

  const onNodeDragStart = useCallback((_event, node) => {
    // Stash the starting position so we can record the diff on dragStop.
    dragStartPositionsRef.current.set(node.id, { ...node.position });
  }, []);

  const onNodeDragStop = useCallback(
    (_event, node) => {
      const start = dragStartPositionsRef.current.get(node.id);
      dragStartPositionsRef.current.delete(node.id);
      updateIdentifier(node.id, { position: node.position });
      if (start) recordMove(node.id, start, { ...node.position });
    },
    [updateIdentifier, recordMove],
  );

  const onNodeDoubleClick = useCallback(
    (_event, node) => {
      const ident = identifiers.find((i) => i.id === node.id);
      if (ident) setModalState({ mode: 'edit', initial: ident });
    },
    [identifiers],
  );

  const openAdd = () => setModalState({ mode: 'add', initial: null });
  const openEdit = (identifier) =>
    setModalState({ mode: 'edit', initial: identifier });
  const closeModal = () => setModalState(null);

  const handleSubmit = (payload) => {
    if (modalState?.mode === 'edit' && payload.id) {
      updateIdentifier(payload.id, {
        type: payload.type,
        fields: payload.fields,
        notes: payload.notes,
        customIconId: payload.customIconId ?? null,
        reliability: payload.reliability ?? null,
      });
    } else {
      const created = addIdentifier(payload);
      if (created) recordCreate(created);
    }
    closeModal();
  };

  const handleDelete = (e, id, label) => {
    e.stopPropagation();
    if (!confirm(`"${label}" silinsin mi? Ctrl+Z ile geri alabilirsiniz.`)) return;
    const ident = (project?.identifiers ?? []).find((i) => i.id === id);
    const conns = (project?.connections ?? []).filter(
      (c) => c.source === id || c.target === id,
    );
    const links = (project?.pinLinks ?? []).filter(
      (l) => l.identifierId === id,
    );
    deleteIdentifier(id);
    if (ident) recordDelete(ident, conns, links);
  };

  // ---- Copy / Paste / Duplicate ---------------------------------------------
  const cloneRecordsWithOffset = useCallback((records, offset = { x: 30, y: 30 }) =>
    records.map((r) => ({
      ...r,
      id: undefined, // bulkAddIdentifiers generates fresh ids
      position: r.position
        ? { x: r.position.x + offset.x, y: r.position.y + offset.y }
        : undefined,
    })),
  []);

  const handleCopySelected = useCallback(() => {
    const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    if (selectedIds.size === 0) return false;
    const records = identifiers.filter((i) => selectedIds.has(i.id));
    setClipboard(records);
    return true;
  }, [nodes, identifiers, setClipboard]);

  const handlePaste = useCallback(() => {
    const records = getClipboard();
    if (!records || records.length === 0) return false;
    const created = bulkAddIdentifiers(cloneRecordsWithOffset(records));
    recordBatchCreate(created);
    return true;
  }, [getClipboard, bulkAddIdentifiers, cloneRecordsWithOffset, recordBatchCreate]);

  const handleDuplicateSelected = useCallback(() => {
    const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    if (selectedIds.size === 0) return false;
    const records = identifiers.filter((i) => selectedIds.has(i.id));
    if (records.length === 0) return false;
    const created = bulkAddIdentifiers(cloneRecordsWithOffset(records));
    recordBatchCreate(created);
    return true;
  }, [nodes, identifiers, bulkAddIdentifiers, cloneRecordsWithOffset, recordBatchCreate]);


  // ---- Analiz araçları -------------------------------------------------------
  const flash = useCallback((msg) => {
    setToolMsg(msg);
  }, []);

  const handleAutoLayout = useCallback(() => {
    if (identifiers.length < 2) return;
    const positions = forceLayout(identifiers, connections);
    const moves = identifiers.map((i) => ({
      id: i.id,
      from: i.position ? { ...i.position } : null,
      to: positions[i.id],
    }));
    setIdentifierPositions(positions);
    recordBatchMove(moves);
    setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 60);
    flash(t('Otomatik yerleşim uygulandı. Ctrl+Z ile geri alabilirsiniz.'));
  }, [identifiers, connections, setIdentifierPositions, recordBatchMove, fitView, flash]);

  const handleShortestPath = useCallback(() => {
    const sel = nodes.filter((n) => n.selected).map((n) => n.id);
    if (sel.length !== 2) {
      flash(t('En kısa yol için tam olarak iki düğüm seçin (Ctrl + tıklama).'));
      return;
    }
    const res = shortestPath(connections, sel[0], sel[1]);
    if (!res) {
      setPathResult(null);
      flash(t('Seçili iki düğüm arasında bağlantı yolu yok.'));
      return;
    }
    setPathResult(res);
    const names = res.nodes.map((id) =>
      getDisplayLabel(identifiers.find((i) => i.id === id)),
    );
    flash(t('Yol ({0} adım): {1}', {
      '0': res.edges.length,
      '1': names.join(' → ')
    }));
    logAction('En kısa yol analizi', names.join(' → '));
  }, [nodes, connections, identifiers, flash, logAction]);

  const clearPath = useCallback(() => {
    setPathResult(null);
    setToolMsg('');
  }, []);

  const handleExport = useCallback(
    async (kind) => {
      if (!project) return;
      const opts = { theme: 'light', highlight: pathResult };
      const ok =
        kind === 'png'
          ? await downloadGraphPng(project, opts)
          : downloadGraphSvg(project, opts);
      if (ok) logAction('Bağlantı ağı dışa aktarıldı', kind.toUpperCase());
    },
    [project, pathResult, logAction],
  );

  const onEdgeDoubleClick = useCallback(
    (_e, edge) => {
      const c = connections.find((x) => x.id === edge.id);
      if (c) setEdgeModal(c);
    },
    [connections],
  );

  const stats = useMemo(() => {
    if (identifiers.length === 0) return null;
    let top = null;
    for (const i of identifiers) {
      const d = degrees.get(i.id) ?? 0;
      if (!top || d > top.d) top = { i, d };
    }
    return {
      nodes: identifiers.length,
      edges: connections.length,
      clusters: componentCount(identifiers, connections),
      top,
    };
  }, [identifiers, connections, degrees]);

  const filteredIdentifiers = useMemo(() => {
    const q = sidebarQuery.trim().toLocaleLowerCase('tr');
    if (!q) return identifiers;
    return identifiers.filter((i) => {
      const hay = [
        getTypeDef(i.type).label,
        ...Object.values(i.fields ?? {}),
        i.notes,
      ]
        .join(' ')
        .toLocaleLowerCase('tr');
      return hay.includes(q);
    });
  }, [identifiers, sidebarQuery]);

  // ---- Keyboard shortcuts ----------------------------------------------------
  useEffect(() => {
    const handler = (e) => {
      // Skip when typing in inputs or while a modal is open.
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;
      if (modalState || menuState || edgeModal) return;
      if (e.key === 'Escape' && pathResult) { clearPath(); return; }
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      else if (k === 'z') { e.preventDefault(); undo(); }
      else if (k === 'y') { e.preventDefault(); redo(); }
      else if (k === 'c') {
        if (handleCopySelected()) e.preventDefault();
      } else if (k === 'v') {
        if (handlePaste()) e.preventDefault();
      } else if (k === 'd') {
        if (handleDuplicateSelected()) e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    undo, redo,
    handleCopySelected, handlePaste, handleDuplicateSelected,
    modalState, menuState, edgeModal, pathResult, clearPath,
  ]);

  return (
    <div className="info-tab">
      <aside className="info-sidebar">
        <div className="sidebar-header">
          <h3>{t('Tanımlayıcılar')}{' '}<span className="count-pill">{identifiers.length}</span></h3>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>{t('+ Ekle')}</button>
        </div>
        {identifiers.length > 0 && (
          <div className="sidebar-search">
            <input
              type="search"
              value={sidebarQuery}
              onChange={(e) => setSidebarQuery(e.target.value)}
              placeholder={t('Filtrele…')}
            />
          </div>
        )}
        {identifiers.length === 0 ? (
          <div className="empty-state">
            <p>{t('Henüz tanımlayıcı yok.')}</p>
            <p className="empty-hint">{t(
              'Şahıs, sosyal medya hesabı, telefon, e-posta, araç, IP, cüzdan gibi bilgileri buradan ekleyin.'
            )}</p>
          </div>
        ) : (
          <ul className="identifier-list">
            {filteredIdentifiers.map((id) => {
              const def = getTypeDef(id.type);
              const display = getDisplayLabel(id);
              const secondary = getSecondaryLabel(id);
              const isFocused = focusedIdentifierId === id.id;
              return (
                <li
                  key={id.id}
                  ref={(el) => {
                    if (el) sidebarRowRefs.current.set(id.id, el);
                    else sidebarRowRefs.current.delete(id.id);
                  }}
                  className={`identifier-item ${isFocused ? 'focused' : ''}`}
                  onClick={() => openEdit(id)}
                  onMouseEnter={() => setHoveredIdentifierId(id.id)}
                  onMouseLeave={() => setHoveredIdentifierId(null)}
                >
                  <IdentifierBadge
                    typeKey={id.type}
                    customIconId={id.customIconId}
                    size="md"
                  />
                  <div className="identifier-body">
                    <div className="identifier-type">
                      {def.label}
                      <AdmiraltyTag reliability={id.reliability} />
                    </div>
                    <div className="identifier-label">{display}</div>
                    {secondary && (
                      <div className="identifier-secondary">{secondary}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="identifier-delete"
                    onClick={(e) => handleDelete(e, id.id, display)}
                    aria-label={`${display} sil`}
                    title={t('Sil')}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <div className="info-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onNodeDoubleClick={onNodeDoubleClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onPaneClick={() => pathResult && clearPath()}
          onPaneContextMenu={onPaneContextMenu}
          connectionMode="loose"
          defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
          defaultViewport={{ x: 20, y: 20, zoom: 1 }}
          minZoom={0.2}
          maxZoom={2}
          deleteKeyCode={['Delete', 'Backspace']}
          multiSelectionKeyCode={['Control', 'Meta']}
          proOptions={{ hideAttribution: true }}
          colorMode={theme}
        >
          <Background gap={20} size={1} />
          <Controls position="bottom-left" showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>

        {identifiers.length > 0 && (
          <div className="graph-toolbar" role="toolbar" aria-label={t('Analiz araçları')}>
            <button type="button" className="tool-btn" onClick={handleAutoLayout} title={t('Kuvvet yönlendirmeli otomatik yerleşim')}>{t('Yerleşim')}</button>
            <button type="button" className={`tool-btn ${pathResult ? 'active' : ''}`} onClick={pathResult ? clearPath : handleShortestPath} title={t('Seçili iki düğüm arasındaki en kısa yolu bul')}>
              {pathResult ? 'Yolu temizle' : t('En kısa yol')}
            </button>
            <button type="button" className={`tool-btn ${showDegree ? 'active' : ''}`} onClick={() => setShowDegree((v) => !v)} title={t('Her düğümün bağlantı sayısını göster')}>{t('Merkezilik')}</button>
            <button type="button" className="tool-btn" onClick={() => fitView({ padding: 0.15, duration: 300 })} title={t('Tümünü ekrana sığdır')}>{t('Sığdır')}</button>
            <span className="tool-sep" />
            <button type="button" className="tool-btn" onClick={() => handleExport('png')} title={t('PNG olarak dışa aktar')}>{t('PNG')}</button>
            <button type="button" className="tool-btn" onClick={() => handleExport('svg')} title={t('SVG olarak dışa aktar')}>{t('SVG')}</button>
          </div>
        )}

        {stats && (
          <div className="graph-stats mono">
            <span>{stats.nodes}{' '}{t('düğüm')}</span>
            <span>{stats.edges}{' '}{t('bağlantı')}</span>
            <span>{stats.clusters}{' '}{t('küme')}</span>
            {stats.top && stats.top.d > 0 && (
              <span title={t('En çok bağlantısı olan düğüm')}>{t('merkez:')}{' '}{getDisplayLabel(stats.top.i)}({stats.top.d})
                              </span>
            )}
          </div>
        )}

        {toolMsg && (
          <div className="graph-toast" role="status">
            <span>{toolMsg}</span>
            <button type="button" className="icon-btn" onClick={() => setToolMsg('')} aria-label={t('Kapat')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}

        {identifiers.length === 0 && (
          <div className="canvas-hint">
            <h3>{t('Boş çalışma alanı')}</h3>
            <p>{t('Soldan tanımlayıcı ekleyin ya da tuvale')}{' '}<strong>{t('sağ tıklayın')}</strong>{t('. Eklenenler sürüklenip bağlanabilen düğümler olarak görünür.')}</p>
            <p className="canvas-hint-tips">
              <strong>{t('Tutamacı sürükleyin')}</strong>{t(
              ': başka düğüme bırakırsanız bağlanır, boşluğa bırakırsanız yeni düğüm açılır.'
            )}<br />
              <strong>{t('Çift tıklama')}</strong>{t(': düğümü ya da bağlantıyı düzenler.')}<br />
              <strong>{t('Seçip')}</strong> <kbd>{t('Delete')}</kbd> / <kbd>{t('Backspace')}</kbd>{t(': siler.')}</p>
          </div>
        )}

        {identifiers.length > 0 && (
          <div className="canvas-tips" aria-hidden="true">
            <span><kbd>{t('Tutamaç')}</kbd>{' '}{t('→ yeni düğüm')}</span>
            <span className="canvas-tips-sep">·</span>
            <span><kbd>{t('Sağ tık')}</kbd>{' '}{t('menü')}</span>
            <span className="canvas-tips-sep">·</span>
            <span><kbd>{t('Çift tık')}</kbd>{' '}{t('düzenle')}</span>
            <span className="canvas-tips-sep">·</span>
            <span><kbd>{t('Ctrl+D')}</kbd>{' '}{t('çoğalt')}</span>
            <span className="canvas-tips-sep">·</span>
            <span><kbd>{t('Ctrl+Z')}</kbd> / <kbd>{t('Ctrl+Y')}</kbd></span>
            <span className="canvas-tips-sep">·</span>
            <span><kbd>{t('Del')}</kbd>{' '}{t('sil')}</span>
          </div>
        )}
      </div>

      {modalState && (
        <IdentifierModal
          initial={modalState.initial}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}

      {edgeModal && (
        <EdgeModal
          connection={edgeModal}
          source={identifiers.find((i) => i.id === edgeModal.source)}
          target={identifiers.find((i) => i.id === edgeModal.target)}
          onClose={() => setEdgeModal(null)}
          onSave={(patch) => {
            updateConnection(edgeModal.id, patch);
            setEdgeModal(null);
          }}
          onDelete={() => {
            if (!confirm(t('Bu bağlantı silinsin mi? Ctrl+Z ile geri alabilirsiniz.'))) return;
            deleteConnection(edgeModal.id);
            recordBatchDeleteEdges([edgeModal]);
            setEdgeModal(null);
          }}
        />
      )}

      {menuState && (
        <NodeCreationMenu
          position={{ x: menuState.screenX, y: menuState.screenY }}
          onSelect={handleMenuSelect}
          onClose={() => setMenuState(null)}
        />
      )}
    </div>
  );
}
