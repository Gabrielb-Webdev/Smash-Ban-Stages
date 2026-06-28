// ============================================================
// ADMIN PANEL - v2.3.0
// v2.3.0 - Agregar tablet AFK a getCommunitySetups, actualizar link de stream dinámico
// ============================================================
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import io from 'socket.io-client';
import { getStoredUser, logout, verifySession } from '../../src/utils/auth';
import { getStockIconPath, CHARACTERS, getSkinCount } from '../../src/utils/constants';
import dynamic from 'next/dynamic';

const TournamentBracket = dynamic(
  () => import('../../src/components/TournamentBracket'),
  { ssr: false }
);

// Genera los setups para una comunidad dada (prefija los IDs con el nombre)
const COMMUNITY_META = {
  'test':      { name: 'Test',           logo: null },
  'cordoba':   { name: 'Smash Córdoba',  logo: '/images/SCC.webp' },
  'afk-multi': { name: 'Smash AFK',      logo: '/images/AFK.webp' },
  'mendoza':   { name: 'Smash Mendoza',  logo: '/images/Team_Anexo/team_anexo_logo_nwe.png' },
  'inc':       { name: 'INC',            logo: '/images/inc.png' },
  'warui':     { name: 'Warui Team',     logo: '/images/warui/logo.png' },
  'santafe':   { name: 'Smash Santa Fe', logo: '/images/Smash_Santa_Fe.png' },
};

function getCommunitySetups(comunidad) {
  const p = comunidad || 'test';
  const base = [
    { id: `${p}-stream`, label: 'Stream',  icon: '📡', color: '#DC2626' },
    { id: `${p}-1`,     label: 'Setup 1', icon: '🎮', color: '#7C3AED' },
    { id: `${p}-2`,     label: 'Setup 2', icon: '🎮', color: '#2563EB' },
    { id: `${p}-3`,     label: 'Setup 3', icon: '🎮', color: '#059669' },
    { id: `${p}-4`,     label: 'Setup 4', icon: '🎮', color: '#D97706' },
    { id: `${p}-5`,     label: 'Setup 5', icon: '🎮', color: '#DB2777' },
    { id: `${p}-6`,     label: 'Setup 6', icon: '🎮', color: '#0891B2' },
    { id: `${p}-7`,     label: 'Setup 7', icon: '🎮', color: '#65A30D' },
    { id: `${p}-8`,     label: 'Setup 8', icon: '🎮', color: '#9333EA' },
  ];
  // Setup tablet exclusivo para Mendoza y AFK (envía datos al overlay igual que stream)
  if (p === 'mendoza' || p === 'afk-multi') {
    const color = p === 'mendoza' ? '#8B5CF6' : '#6366F1';
    const tabletId = p === 'afk-multi' ? 'afk-tablet' : `${p}-tablet`;
    base.splice(1, 0, { id: tabletId, label: 'Tablet', icon: '📱', color });
  }
  return base;
}
// Clave localStorage con namespace de comunidad (backward-compat: 'test' usa claves legacy)
function lsk(base, c) { return c === 'test' ? `afk_${base}` : `${c}_${base}`; }
// Obtiene la comunidad del query string de forma sincrónica (para useState initializers)
function _communitySync() {
  if (typeof window === 'undefined') return 'test';
  const fromQS = new URLSearchParams(window.location.search).get('community');
  if (fromQS) return fromQS;
  const m = window.location.pathname.match(/^\/admin\/([a-z][a-z0-9-]*)$/);
  if (m && m[1] !== 'test') return m[1];
  return 'test';
}

const SET_STATE_STYLE = {
  CREATED:   { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.35)',  text: '#60A5FA' },
  ACTIVE:    { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)',   text: '#22C55E' },
  COMPLETED: { bg: 'rgba(107,114,128,0.1)',  border: 'rgba(107,114,128,0.2)',  text: '#6B7280' },
  BYE:       { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)', text: '#6B7280' },
  CALLED:    { bg: 'rgba(255,140,0,0.12)',   border: 'rgba(255,140,0,0.3)',    text: '#FF8C00' },
};

function timeAgo(date) {
  if (!date) return '';
  const s = Math.round((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `hace ${s}s`;
  return `hace ${Math.floor(s / 60)}m`;
}

export default function TestAdminPage() {
  const router = useRouter();
  // Comunidad dinámica: soporta ?community=cordoba|mendoza|afk|test (default: 'test')
  const community = router.query.community || _communitySync();
  const SETUPS = getCommunitySetups(community);
  const [user, setUser]               = useState(null);
  const [checking, setChecking]       = useState(true);
  const [tournament, setTournament]   = useState(null);
  const [bracketSets, setBracketSets] = useState([]);
  const [phaseName, setPhaseName]     = useState('');
  const [bracketLoading, setBracketLoading] = useState(false);
  const [assignedSets, setAssignedSets] = useState(() => {
    try {
      if (typeof window === 'undefined') return {};
      const saved = localStorage.getItem(lsk('assignedSets', _communitySync()));
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [draggedSet, setDraggedSet]   = useState(null);
  const [dragOverSetup, setDragOverSetup] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Candados del bracket: { [setId]: expiresAt (timestamp) }
  const [lockedSets, setLockedSets] = useState({});
  const [lockTick, setLockTick] = useState(0); // ticker para forzar re-render del countdown

  // Colas de matches: { [setupId]: { items: [], count: 0, nextItem: {} } }
  const [setupQueues, setSetupQueues] = useState({});

  // Track de matches encolados: { [setId]: setupId } para mostrar en bracket
  const [queuedMatches, setQueuedMatches] = useState({});

  // Toast de notificaciones de auto-activación y encolamiento
  const [queueNotification, setQueueNotification] = useState(null);
  const [queuedNotification, setQueuedNotification] = useState(null);

  // Evita pedir activate-queued-match repetidamente para el mismo setup mientras esperamos la respuesta del server
  const autoPromoteRequestedRef = useRef({});

  // Selección dinámica de torneo
  const [selectedSlug, setSelectedSlug]                     = useState(() => { try { const c = _communitySync(); return (typeof window !== 'undefined' && localStorage.getItem(lsk('selectedSlug', c))) || ''; } catch { return ''; } });
  const [selectedPhaseGroupId, setSelectedPhaseGroupId]     = useState(() => { try { const c = _communitySync(); return (typeof window !== 'undefined' && localStorage.getItem(lsk('selectedPhaseGroupId', c))) || ''; } catch { return ''; } });
  const [selectedBracketUrl, setSelectedBracketUrl]         = useState(() => { try { const c = _communitySync(); return (typeof window !== 'undefined' && localStorage.getItem(lsk('selectedBracketUrl', c))) || ''; } catch { return ''; } });
  const [selectedEventId, setSelectedEventId]               = useState(() => { try { const c = _communitySync(); return (typeof window !== 'undefined' && localStorage.getItem(lsk('selectedEventId', c))) || null; } catch { return null; } });

  // Tournament picker
  const [tourPickerOpen, setTourPickerOpen]         = useState(false);
  const [pickTournaments, setPickTournaments]       = useState([]);
  const [loadingPickTours, setLoadingPickTours]     = useState(false);
  const [pickTour, setPickTour]                     = useState(null);
  const [pickPhases, setPickPhases]                 = useState(null);
  const [loadingPickPhases, setLoadingPickPhases]   = useState(false);
  const [slugInput, setSlugInput]                   = useState('');
  const [pickTourPreview, setPickTourPreview]           = useState(null);
  const [loadingPickTourPreview, setLoadingPickTourPreview] = useState(false);
  const [savedSlugs, setSavedSlugs]                 = useState([]);
  const [savingSlug, setSavingSlug]                 = useState(false);
  const [allPhaseGroups, setAllPhaseGroups] = useState(() => {
    try {
      const c = _communitySync();
      const saved = typeof window !== 'undefined' && localStorage.getItem(lsk('allPhaseGroups', c));
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Inscriptos & refresh
  const [entrants, setEntrants]               = useState([]);
  const [entrantsOpen, setEntrantsOpen]       = useState(true);
  const [loadingEntrants, setLoadingEntrants] = useState(false);
  const [lastRefresh, setLastRefresh]         = useState(null);

  // Notificaciones
  const [notifyState, setNotifyState] = useState(null); // null | 'loading' | 'ok' | 'error'
  const [finishTourState, setFinishTourState] = useState(null); // null | 'loading' | 'ok' | 'error'

  // Iniciar torneo
  const [startState, setStartState] = useState(null); // null | 'loading' | 'ok' | 'error'
  const [phaseStarted, setPhaseStarted] = useState(() => {
    try { const c = _communitySync(); return typeof window !== 'undefined' && localStorage.getItem(lsk('phaseStarted', c)) === '1'; } catch { return false; }
  });

  // Sync phaseStarted desde localStorage al montar (fix hidratación SSR)
  useEffect(() => {
    try {
      const c = _communitySync();
      if (localStorage.getItem(lsk('phaseStarted', c)) === '1') setPhaseStarted(true);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Match call timers: { [setupId]: { secondsLeft, intervalId } }
  const [matchTimers, setMatchTimers] = useState({});
  const matchTimersRef = useRef({});
  const assignedSetsRef = useRef(assignedSets); // acceso síncrono en timeouts asincrónicos

  // Elapsed timers tras check-in completo: { [setupId]: secondsElapsed }
  const [elapsedTimers, setElapsedTimers] = useState({});
  const elapsedTimersRef = useRef({});
  const checkedInSetups = useRef(new Set());
  const autoReleasedSetups = useRef(new Set());
  const delayReleasedSetups = useRef(new Set());
  const prevGamesRef      = useRef({});  // { [setupId]: número de games reportados }
  const prevDelayCountRef  = useRef({});  // { [setupId]: nro de delay requests ya procesados }

  // Sync panel en tiempo real (socket)
  const panelSocketRef    = useRef(null);
  const isRemoteAssignRef  = useRef(false); // true cuando el cambio viene de otro cliente
  const isRemoteStateRef   = useRef(false); // true cuando el cambio de estado viene de otro cliente
  const hasReceivedInitialPanelState = useRef(false); // true una vez recibido el estado inicial del servidor

  // Formato por setup (BO3 o BO5): { [setupId]: 'BO3'|'BO5' }
  const [setupFormats, setSetupFormats] = useState(() => {
    try { const c = _communitySync(); const s = localStorage.getItem(lsk('setupFormats', c)); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  // Check-in status: { [setupId]: { phase, checkIns: [], player1, player2 } }
  const [sessionStatuses, setSessionStatuses] = useState({});

  // Log de reportes Start.gg: [{ time, setId, players, type }]
  const [reportLog, setReportLog] = useState([]);

  // ── Scoreboard Mendoza ────────────────────────────────────────────────────
  const [mendozaSB, setMendozaSB] = useState({
    player1: { tag: '', name: '', score: 0, character: 'mario', skin: 1 },
    player2: { tag: '', name: '', score: 0, character: 'mario', skin: 1 },
    round: 'Winners Finals',
    format: '',
  });
  const [mendozaSBStatus, setMendozaSBStatus] = useState('idle'); // 'idle'|'saving'|'ok'|'error'
  const [mendozaSBOpen, setMendozaSBOpen] = useState(true);
  const mendozaSBDebounceRef = useRef(null);

  // DQ: setupId en proceso de DQ
  const [dqingSetup, setDqingSetup] = useState(null);

  // Tab activa en móvil: 'setups' | 'bracket'
  const [mobileTab, setMobileTab] = useState('setups');

  // Torneos destacados (gestión manual)
  const [featuredTours, setFeaturedTours]     = useState([]);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const [featuredInput, setFeaturedInput]     = useState('');
  const [featuredAdding, setFeaturedAdding]   = useState(false);
  const [featuredOpen, setFeaturedOpen]       = useState(false);
  const prevCompletedIdsRef = useRef(new Set());
  const autoCompletedTournamentsRef = useRef(new Set());
  const refreshBracketRef = useRef(null); // referencia estable para acceder desde props

  const refreshBracket = (silent = false) => {
    if (!refreshBracketRef.current) return;
    refreshBracketRef.current(silent);
  };

  // --- Persistencia localStorage (con namespace de comunidad) ---
  useEffect(() => {
    assignedSetsRef.current = assignedSets;
    try { localStorage.setItem(lsk('assignedSets', community), JSON.stringify(assignedSets)); } catch {}
    // Broadcast a otros admins conectados, salvo que el cambio viniera de ellos
    // Esperar a recibir el estado inicial del servidor antes de emitir (evita sobrescribir datos válidos al recargar)
    if (!isRemoteAssignRef.current && hasReceivedInitialPanelState.current && panelSocketRef.current?.connected) {
      panelSocketRef.current.emit('panel:assign-update', { community, assignedSets });
    }
    isRemoteAssignRef.current = false;
  }, [assignedSets, community]);
  useEffect(() => {
    try { localStorage.setItem(lsk('phaseStarted', community), phaseStarted ? '1' : ''); } catch {}
  }, [phaseStarted, community]);
  useEffect(() => { try { localStorage.setItem(lsk('selectedSlug', community), selectedSlug); } catch {} }, [selectedSlug, community]);
  // Restaurar estado 'Finalizado' consultando la API (Redis) al cambiar de torneo
  useEffect(() => {
    if (!selectedSlug) { setFinishTourState(null); return; }
    fetch('/api/tournaments/mark-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: selectedSlug, checkOnly: true }),
    }).then(r => r.json()).then(d => {
      setFinishTourState(d.alreadyDone ? 'ok' : null);
    }).catch(() => setFinishTourState(null));
  }, [selectedSlug]);
  useEffect(() => { try { localStorage.setItem(lsk('selectedPhaseGroupId', community), selectedPhaseGroupId); } catch {} }, [selectedPhaseGroupId, community]);
  useEffect(() => { try { if (selectedEventId) localStorage.setItem(lsk('selectedEventId', community), selectedEventId); } catch {} }, [selectedEventId, community]);
  useEffect(() => { try { localStorage.setItem(lsk('selectedBracketUrl', community), selectedBracketUrl); } catch {} }, [selectedBracketUrl, community]);
  useEffect(() => { try { localStorage.setItem(lsk('setupFormats', community), JSON.stringify(setupFormats)); } catch {} }, [setupFormats, community]);
  useEffect(() => { try { localStorage.setItem(lsk('allPhaseGroups', community), JSON.stringify(allPhaseGroups)); } catch {} }, [allPhaseGroups, community]);

  // Restaurar timers activos tras F5
  useEffect(() => {
    Object.entries(assignedSets).forEach(([setupId, set]) => {
      if (!set?.timerStartedAt) return;
      const elapsed = Math.floor((Date.now() - set.timerStartedAt) / 1000);
      const remaining = 300 - elapsed;
      if (remaining <= 0) {
        // Tiempo agotado al restaurar: cancelar match completo (session + start.gg + estado)
        // Usar setTimeout para que stopMatchTimer tenga acceso al estado ya hidratado
        setTimeout(() => stopMatchTimer(setupId), 0);
        return;
      }
      matchTimersRef.current[setupId] = { secondsLeft: remaining };
      setMatchTimers(prev => ({ ...prev, [setupId]: remaining }));
      const iv = setInterval(() => {
        const cur = matchTimersRef.current[setupId];
        if (!cur) { clearInterval(iv); return; }
        const next = cur.secondsLeft - 1;
        matchTimersRef.current[setupId] = { secondsLeft: next, intervalId: iv };
        setMatchTimers(prev => ({ ...prev, [setupId]: next }));
        if (next <= 0) {
          clearInterval(iv);
          delete matchTimersRef.current[setupId];
          setMatchTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
          // Cancelar match completo: session WS + reset start.gg + liberar setup
          stopMatchTimer(setupId);
        }
      }, 1000);
      matchTimersRef.current[setupId].intervalId = iv;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ticker 1s para animar countdowns de candados y auto-desbloquear
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setLockedSets(prev => {
        const expired = Object.keys(prev).filter(k => prev[k] <= now);
        if (!expired.length) return prev;
        const next = { ...prev };
        expired.forEach(k => delete next[k]);
        return next;
      });
      setLockTick(t => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleLock(setId, e) {
    e.stopPropagation();
    setLockedSets(prev => {
      if (prev[setId]) { const n = { ...prev }; delete n[setId]; return n; }
      return { ...prev, [setId]: Date.now() + 60000 };
    });
  }

  // --- Polling check-in de sesiones activas ---
  useEffect(() => {
    const active = Object.entries(assignedSets).filter(([, set]) => set?.sessionId);
    if (active.length === 0) { setSessionStatuses({}); return; }
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const poll = async () => {
      const updates = {};
      // Mapa setupId→sessionId del ciclo actual; permite detectar si se inició un nuevo match antes del auto-release
      const activeSessionIds = Object.fromEntries(active.map(([id, set]) => [id, set.sessionId]));
      for (const [setupId, set] of active) {
        if (!set?.sessionId) continue;
        try {
          const r = await fetch(`${socketUrl}/session/${encodeURIComponent(set.sessionId)}`);
          if (r.ok) { const d = await r.json(); if (d.ok) updates[setupId] = d; }
        } catch {}
      }
      setSessionStatuses(prev => ({ ...prev, ...updates }));
      // Actualizar scores y personajes en overlay Warui Team en tiempo real
      if (community === 'warui' && updates['warui-stream']) {
        const wSt = updates['warui-stream'];
        const patchData = {};
        if (wSt.score1 != null || wSt.score2 != null) {
          patchData.score1 = wSt.score1 ?? 0;
          patchData.score2 = wSt.score2 ?? 0;
        }
        // Convertir charId+skin a ruta Stock Icons V2 para controls.html
        if (wSt.char1) {
          const p = getStockIconPath(wSt.char1, wSt.skin1 || 1);
          patchData.char1 = p ? decodeURIComponent(p.replace('/images/Stock%20Icons%20V2/', 'Stock Icons V2/')) : wSt.char1;
        }
        if (wSt.char2) {
          const p = getStockIconPath(wSt.char2, wSt.skin2 || 1);
          patchData.char2 = p ? decodeURIComponent(p.replace('/images/Stock%20Icons%20V2/', 'Stock Icons V2/')) : wSt.char2;
        }
        if (Object.keys(patchData).length > 0) {
          fetch('/api/warui/stream-state', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
            body: JSON.stringify(patchData),
          }).catch(() => {});
        }
      }
      // Actualizar scores en overlay INC en tiempo real
      if (community === 'inc' && updates['inc-stream']) {
        const iSt = updates['inc-stream'];
        if (iSt.score1 != null || iSt.score2 != null) {
          fetch('/api/inc/stream-state', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
            body: JSON.stringify({ score1: iSt.score1 ?? 0, score2: iSt.score2 ?? 0 }),
          }).catch(() => {});
        }
      }
      // Auto-liberar setup cuando la sesión termina (phase FINISHED)
      for (const [setupId, st] of Object.entries(updates)) {
        if (st.phase === 'FINISHED' && !autoReleasedSetups.current.has(setupId)) {
          autoReleasedSetups.current.add(setupId);

          // Reporte de respaldo: enviar resultado final a Start.gg desde el admin panel.
          // El servidor también intenta reportar, pero si falla (deploy viejo, IDs faltantes)
          // este respaldo asegura que el resultado se suba.
          const aSet = assignedSets[setupId];
          if (aSet?.startggSetId) {
            const winnerEntrantId = (st.score1 || 0) > (st.score2 || 0)
              ? aSet.startggEntrant1Id
              : aSet.startggEntrant2Id;

            // Armar gameData completa desde los games que reportó el servidor.
            // Enviamos slugs de personajes/stages — report-set.js los mapea a IDs.
            const gameData = (st.games || []).map(g => ({
              gameNum: g.gameNum,
              winnerId: String(g.winnerEntrantId || ''),
              char1Slug: g.char1 || null,
              char2Slug: g.char2 || null,
              p1EntrantId: g.p1EntrantId || aSet.startggEntrant1Id || null,
              p2EntrantId: g.p2EntrantId || aSet.startggEntrant2Id || null,
              stageSlug: g.stage || null,
            })).filter(g => g.winnerId);

            // No reportar si no hay games jugados (0-0 sin partidas = cancelación, no resultado real)
            // Tampoco reportar si el servidor Railway ya lo reportó exitosamente
            if (!gameData || gameData.length === 0) {
              console.warn(`[start.gg] ⚠️ RECHAZADO: No hay games registrados para ${setupId} (score ${st.score1}-${st.score2}) — no se reporta resultado vacío`);
            } else if (st.startggReported) {
              console.log(`[start.gg] ✅ Servidor ya reportó ${setupId} a start.gg — respaldo omitido`);
            } else if (winnerEntrantId) {
              console.log(`[start.gg] Admin respaldo: reportando resultado final → setId=${aSet.startggSetId} winner=${winnerEntrantId} games=${gameData.length}`);
              fetch('/api/tournaments/report-set', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  setId: String(aSet.startggSetId),
                  winnerId: String(winnerEntrantId),
                  gameData: gameData.length > 0 ? gameData : undefined,
                }),
              })
                .then(async r => {
                  if (!r.ok) {
                    // El servidor (Railway) ya reportó el set exitosamente — ignorar
                    console.log('[start.gg] ℹ️ Set ya reportado por el servidor, respaldo innecesario');
                    return null;
                  }
                  return r.json();
                })
                .then(d => {
                  if (!d) return;
                  if (d.ok) {
                    console.log('[start.gg] ✅ Resultado final enviado (admin respaldo):', d);
                    setReportLog(prev => [{
                      time: new Date(),
                      setId: aSet.startggSetId,
                      players: `${st.player1 || '?'} vs ${st.player2 || '?'}`,
                      round: aSet.fullRoundText || '',
                      score: `${st.score1}-${st.score2} ✅ COMPLETED`,
                    }, ...prev].slice(0, 20));
                  } else {
                    console.error('[start.gg] ❌ Error en respaldo:', d);
                  }
                })
                .catch(e => console.error('[start.gg] ❌ fetch error respaldo:', e));
            }
          }

          setTimeout(() => {
            // Si se inició un nuevo match en este setup durante los 5s, no liberar
            if (activeSessionIds[setupId] && assignedSetsRef.current[setupId]?.sessionId !== activeSessionIds[setupId]) return;
            const t = matchTimersRef.current[setupId];
            if (t?.intervalId) clearInterval(t.intervalId);
            delete matchTimersRef.current[setupId];
            setMatchTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
            const et = elapsedTimersRef.current[setupId];
            if (et?.intervalId) clearInterval(et.intervalId);
            delete elapsedTimersRef.current[setupId];
            setElapsedTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
            checkedInSetups.current.delete(setupId);
            setAssignedSets(prev => { const n = { ...prev }; delete n[setupId]; return n; });
          }, 5000);
        }

        // Auto-liberar + auto-lock cuando un jugador usa "No disponible" (phase POSTPONED)
        if ((st.phase === 'POSTPONED' || st.phase === 'CANCELLED') && !autoReleasedSetups.current.has(setupId)) {
          autoReleasedSetups.current.add(setupId);
          const aSet = assignedSets[setupId];
          const setId = aSet?.id;
          // Bloquear el set en el bracket
          if (setId) {
            setLockedSets(prev => ({ ...prev, [setId]: Date.now() + 60000 }));
          }
          // Reset en start.gg
          if (aSet?.startggSetId) {
            fetch('/api/tournaments/reset-set', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ setId: aSet.startggSetId }),
            }).catch(() => {});
          }
          // Liberar timers y setup
          setTimeout(() => {
            // Si se inició un nuevo match en este setup durante el 1s de delay, no liberar
            if (activeSessionIds[setupId] && assignedSetsRef.current[setupId]?.sessionId !== activeSessionIds[setupId]) return;
            const t = matchTimersRef.current[setupId];
            if (t?.intervalId) clearInterval(t.intervalId);
            delete matchTimersRef.current[setupId];
            setMatchTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
            const et = elapsedTimersRef.current[setupId];
            if (et?.intervalId) clearInterval(et.intervalId);
            delete elapsedTimersRef.current[setupId];
            setElapsedTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
            checkedInSetups.current.delete(setupId);
            setAssignedSets(prev => { const n = { ...prev }; delete n[setupId]; return n; });
          }, 1000);
          // Refrescar bracket
          if (selectedPhaseGroupId) {
            setTimeout(() => {
              fetch(`/api/tournaments/bracket?phaseGroupId=${selectedPhaseGroupId}`)
                .then(r => r.json())
                .then(d => { if (d.sets) setBracketSets(d.sets); })
                .catch(() => {});
            }, 2000);
          }
        }
      }
      // (Mid-series reporting desactivado: el servidor reporta automáticamente
      //  al finalizar la serie con toda la data de games/personajes/stages)

      // Auto-extensión de timer cuando un jugador pide más tiempo (+5 min por pedido)
      for (const [setupId, st] of Object.entries(updates)) {
        const prevCount = prevDelayCountRef.current[setupId] || 0;
        const newCount = (st.delayRequests || []).length;
        if (newCount > prevCount) {
          prevDelayCountRef.current[setupId] = newCount;
          const cur = matchTimersRef.current[setupId];
          if (cur) {
            const extended = (cur.secondsLeft || 0) + 300;
            matchTimersRef.current[setupId] = { ...cur, secondsLeft: extended };
            setMatchTimers(prev => ({ ...prev, [setupId]: extended }));
          }
        }
      }

      // Cuando ambos jugadores hacen check-in, pasar de cuenta regresiva a cuenta progresiva
      for (const [setupId, st] of Object.entries(updates)) {
        if ((st.checkIns || []).length >= 2 && !checkedInSetups.current.has(setupId)) {
          checkedInSetups.current.add(setupId);
          // Detener countdown
          const tm = matchTimersRef.current[setupId];
          if (tm?.intervalId) clearInterval(tm.intervalId);
          delete matchTimersRef.current[setupId];
          setMatchTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
          // Iniciar elapsed timer
          elapsedTimersRef.current[setupId] = { secondsElapsed: 0 };
          setElapsedTimers(prev => ({ ...prev, [setupId]: 0 }));
          const iv = setInterval(() => {
            if (!elapsedTimersRef.current[setupId]) { clearInterval(iv); return; }
            const next = (elapsedTimersRef.current[setupId].secondsElapsed || 0) + 1;
            elapsedTimersRef.current[setupId].secondsElapsed = next;
            setElapsedTimers(prev => ({ ...prev, [setupId]: next }));
          }, 1000);
          elapsedTimersRef.current[setupId].intervalId = iv;
        }
      }
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [assignedSets]);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.access_token) { router.replace('/login'); return; }
    verifySession().then(data => {
      if (!data) { router.replace('/login'); return; }
      const comm = _communitySync();
      // Las comunidades en Redis usan claves cortas (ej: 'afk'), pero la URL puede
      // usar nombres distintos (ej: 'afk-multi'). Mapear para la verificación de acceso.
      const COMMUNITY_KEY_MAP = { 'afk-multi': 'afk' };
      const authComm = COMMUNITY_KEY_MAP[comm] || comm;
      const hasAccess = data.isAdmin || data.adminCommunities?.includes(authComm);
      if (!hasAccess) { router.replace('/'); return; }
      setUser(data.user);
      setChecking(false);
      // Re-registrar sesiones activas en el servidor WS (en caso de restart del servidor)
      try {
        const saved = localStorage.getItem(lsk('assignedSets', comm));
        if (saved) {
          const parsed = JSON.parse(saved);
          const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
          Object.values(parsed).forEach(set => {
            if (!set?.sessionId) return;
            const players = (set.slots || []).map(s => s?.entrant?.name).filter(Boolean);
            fetch(`${socketUrl}/session-meta`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: set.sessionId,
                player1: players[0] || 'Jugador 1',
                player2: players[1] || 'Jugador 2',
                format: 'BO3',
                startggSetId: set.startggSetId || set.id || null,
                startggEntrant1Id: set.slots?.[0]?.entrant?.id || null,
                startggEntrant2Id: set.slots?.[1]?.entrant?.id || null,
              }),
            }).catch(() => {});
          });
        }
      } catch {}
    });
  }, []);

  // ── Conexión socket para sincronización en tiempo real entre admins ──────────
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const comm = _communitySync();
    // Wake-up: ping HTTP al servidor para despertarlo si está en cold start (Render free tier)
    fetch(`${socketUrl}/health`).catch(() => {});

    const socket = io(socketUrl, {
      transports: ['polling', 'websocket'], // polling primero: más robusto durante cold start
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      timeout: 30000, // más tiempo para cold start de Render (~30s)
    });
    panelSocketRef.current = socket;

    socket.on('connect', () => {
      console.log('🎮 Panel admin conectado al WS');
      socket.emit('panel:join', { community: comm });
      // Hidratar el estado real de la cola de cada setup (evita que se "pierda" visualmente al recargar/reconectar)
      getCommunitySetups(comm).forEach(s => {
        socket.emit('get-queue-status', { setupId: s.id, community: comm });
      });
      // Si el servidor no tiene estado guardado, habilitar broadcast después de 5s como fallback
      setTimeout(() => { hasReceivedInitialPanelState.current = true; }, 5000);
    });

    // Reconstruye/sincroniza los timers locales cuando llegan assignedSets por WS.
    // Arranca countdown para sets con timerStartedAt que no tengan timer local,
    // y limpia timers de sets que ya no están asignados.
    function syncTimersFromRemote(remote, isPartial = false) {
      // Arrancar timers para matches recién iniciados en otro cliente
      Object.entries(remote).forEach(([setupId, set]) => {
        if (!set?.timerStartedAt) return;
        if (matchTimersRef.current[setupId]) return; // ya está corriendo
        if (checkedInSetups.current.has(setupId)) return; // ya pasó al elapsed phase
        const elapsed = Math.floor((Date.now() - set.timerStartedAt) / 1000);
        const remaining = 300 - elapsed;
        if (remaining <= 0) return; // expiró
        matchTimersRef.current[setupId] = { secondsLeft: remaining };
        setMatchTimers(prev => ({ ...prev, [setupId]: remaining }));
        const iv = setInterval(() => {
          const cur = matchTimersRef.current[setupId];
          if (!cur) { clearInterval(iv); return; }
          const next = cur.secondsLeft - 1;
          matchTimersRef.current[setupId] = { secondsLeft: next, intervalId: iv };
          setMatchTimers(prev => ({ ...prev, [setupId]: next }));
          if (next <= 0) {
            clearInterval(iv);
            delete matchTimersRef.current[setupId];
            setMatchTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
            setAssignedSets(prev => { const n = { ...prev }; delete n[setupId]; return n; });
          }
        }, 1000);
        matchTimersRef.current[setupId].intervalId = iv;
      });
      // En updates PARCIALES (un solo setup, ej: auto-activación) NO limpiar timers de otros setups,
      // porque `remote` solo trae ese setup → borraría los timers de todos los demás por error.
      if (isPartial) return;
      // Limpiar timers de setups que ya no están asignados (ej: Admin A canceló)
      Object.keys(matchTimersRef.current).forEach(setupId => {
        if (!remote[setupId]) {
          const t = matchTimersRef.current[setupId];
          if (t?.intervalId) clearInterval(t.intervalId);
          delete matchTimersRef.current[setupId];
          setMatchTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
        }
      });
      Object.keys(elapsedTimersRef.current).forEach(setupId => {
        if (!remote[setupId]) {
          const et = elapsedTimersRef.current[setupId];
          if (et?.intervalId) clearInterval(et.intervalId);
          delete elapsedTimersRef.current[setupId];
          setElapsedTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
          checkedInSetups.current.delete(setupId);
        }
      });
    }

    socket.on('panel:assign-update', ({ assignedSets: remote, partial }) => {
      if (!remote) return;
      isRemoteAssignRef.current = true;
      setAssignedSets(prev => (partial ? { ...prev, ...remote } : remote));
      syncTimersFromRemote(remote, partial);
    });

    socket.on('panel:state-update', ({ state }) => {
      if (!state) return;
      hasReceivedInitialPanelState.current = true;
      isRemoteStateRef.current = true;
      if (state.selectedSlug         !== undefined) {
        setSelectedSlug(state.selectedSlug);
        // Si recibimos un torneo válido por WS, cerrar el picker (sync cross-device)
        if (state.selectedSlug) setTourPickerOpen(false);
      }
      if (state.selectedPhaseGroupId !== undefined) setSelectedPhaseGroupId(state.selectedPhaseGroupId);
      if (state.selectedEventId      !== undefined) setSelectedEventId(state.selectedEventId);
      if (state.selectedBracketUrl   !== undefined) setSelectedBracketUrl(state.selectedBracketUrl);
      if (state.phaseStarted         !== undefined) setPhaseStarted(state.phaseStarted);
      if (state.allPhaseGroups       !== undefined && Array.isArray(state.allPhaseGroups) && state.allPhaseGroups.length > 0) setAllPhaseGroups(state.allPhaseGroups);
      if (state.setupFormats         !== undefined) setSetupFormats(state.setupFormats);
      if (state.assignedSets         !== undefined) {
        isRemoteAssignRef.current = true;
        setAssignedSets(state.assignedSets);
        syncTimersFromRemote(state.assignedSets);
      }
    });

    // Reconstruye setupQueues + queuedMatches para un setup a partir de la cola real (server/Redis)
    function applyQueueState(setupId, queue, queueLength) {
      setSetupQueues(prev => ({
        ...prev,
        [setupId]: { items: queue || [], count: queueLength || 0, nextItem: queue?.[0] || null }
      }));
      setQueuedMatches(prev => {
        const next = { ...prev };
        // Remover matches que ya no están en la cola de este setup
        Object.keys(next).forEach(queueKey => {
          if (next[queueKey] === setupId) {
            const stillQueued = queue?.some(item => `${item.player1?.name || 'P1'}_vs_${item.player2?.name || 'P2'}` === queueKey);
            if (!stillQueued) delete next[queueKey];
          }
        });
        // Agregar/actualizar matches que sí están en la cola (cubre hydration al reconectar/recargar)
        (queue || []).forEach(item => {
          const queueKey = `${item.player1?.name || 'P1'}_vs_${item.player2?.name || 'P2'}`;
          next[queueKey] = setupId;
        });
        return next;
      });
    }

    // Escuchar actualizaciones de cola de matches
    socket.on('queue:updated', ({ setupId, community, queue, queueLength, message }) => {
      console.log(`📋 Cola actualizada para ${setupId}:`, queue);
      applyQueueState(setupId, queue, queueLength);
      // (Se quitó el cartel "Match activado": aparecía en todos los paneles por el broadcast
      //  → molesto con dos dispositivos. La cola ya se refleja en el setup correspondiente.)
    });

    // Respuesta a get-queue-status: hidrata la cola real al conectar/reconectar (evita que se "pierda" visualmente al recargar)
    socket.on('queue:status', ({ setupId, queue, queueLength }) => {
      applyQueueState(setupId, queue, queueLength);
    });

    return () => {
      socket.disconnect();
      panelSocketRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Si no hay torneo seleccionado, esperar sync del WS antes de abrir el picker
  // (otro dispositivo puede haber cargado un torneo — damos 3s para que llegue el estado)
  const [waitingForSync, setWaitingForSync] = useState(() => {
    // Si ya tenemos slug de localStorage, no hay que esperar
    try { const c = _communitySync(); return !(typeof window !== 'undefined' && localStorage.getItem(lsk('selectedSlug', c))); } catch { return true; }
  });
  useEffect(() => {
    if (!waitingForSync) return;
    // Si llega estado del WS con slug, dejar de esperar
    if (selectedSlug) { setWaitingForSync(false); return; }
    // Timeout: si después de 3s no llegó nada, abrir picker
    const t = setTimeout(() => setWaitingForSync(false), 3000);
    return () => clearTimeout(t);
  }, [waitingForSync, selectedSlug]);
  useEffect(() => {
    if (!checking && !selectedSlug && !waitingForSync) openTourPicker();
  }, [checking, selectedSlug, waitingForSync]);

  // Cargar torneos destacados al montar
  useEffect(() => {
    setFeaturedLoading(true);
    fetch('/api/tournaments/featured')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.featured)) setFeaturedTours(d.featured); })
      .catch(() => {})
      .finally(() => setFeaturedLoading(false));
  }, []);

  // Cargar estado del scoreboard de Mendoza al montar
  useEffect(() => {
    if (community !== 'mendoza') return;
    fetch('/api/mendoza/scoreboard-state')
      .then(r => r.json())
      .then(d => {
        if (!d.empty) setMendozaSB(d);
      })
      .catch(() => {});
  }, [community]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (checking || !selectedSlug) return;
    function loadInfo() {
      fetch(`/api/tournaments/info?slug=${encodeURIComponent(selectedSlug)}`)
        .then(r => r.json())
        .then(d => {
          if (!d.error) {
            setTournament(d);
            setLastRefresh(new Date());
            if (d.events?.[0]?.id) setSelectedEventId(prev => prev || String(d.events[0].id));
          }
        });
    }
    loadInfo();
    const iv = setInterval(loadInfo, 30000);
    return () => clearInterval(iv);
  }, [checking, selectedSlug]);

  function checkAutoComplete(sets, slug) {
    if (!slug || autoCompletedTournamentsRef.current.has(slug)) return;
    const nonBye = sets.filter(s => s.stateLabel !== 'BYE');
    if (nonBye.length > 0 && nonBye.every(s => s.stateLabel === 'COMPLETED')) {
      autoCompletedTournamentsRef.current.add(slug);
      fetch('/api/tournaments/mark-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      }).catch(() => {});
    }
  }

  useEffect(() => {
    if (checking || !selectedPhaseGroupId || !selectedSlug) return;
    setBracketLoading(true);
    setBracketSets([]);

    const doRefresh = (silent = false) => {
      if (!silent) setBracketLoading(true);
      return fetch(`/api/tournaments/bracket?phaseGroupId=${selectedPhaseGroupId}`)
        .then(r => r.json())
        .then(d => {
          if (d.sets) {
            setBracketSets(d.sets);
            setPhaseName(d.phaseName || '');
            if (d.phaseGroupState >= 2) setPhaseStarted(true);
            // Detectar sets recién completados para el log
            d.sets.forEach(s => {
              if (s.stateLabel === 'COMPLETED' && !prevCompletedIdsRef.current.has(s.id)) {
                const names = (s.slots || []).map(sl => sl?.entrant?.name).filter(Boolean);
                setReportLog(prev => [{
                  time: new Date(),
                  setId: s.id,
                  players: names.join(' vs '),
                  round: s.fullRoundText || '',
                  score: names.map((n, i) => `${n} ${s.slots?.[i]?.standing?.stats?.score?.value ?? ''}`).join(' · '),
                }, ...prev].slice(0, 20));
              }
            });
            prevCompletedIdsRef.current = new Set(d.sets.filter(s => s.stateLabel === 'COMPLETED').map(s => s.id));
            checkAutoComplete(d.sets, selectedSlug);
          }
        })
        .finally(() => { if (!silent) setBracketLoading(false); });
    };

    // Guardar referencia estable para que onResultSaved pueda llamarla
    refreshBracketRef.current = doRefresh;

    doRefresh();

    // Polling automático del bracket cada 10 segundos
    const iv = setInterval(() => doRefresh(true), 10000);
    return () => clearInterval(iv);
  }, [checking, selectedPhaseGroupId]);

  // Cargar pools disponibles al montar si hay torneo seleccionado pero allPhaseGroups está vacío
  useEffect(() => {
    if (checking || !selectedSlug || allPhaseGroups.length > 0) return;
    fetch(`/api/tournaments/phases?slug=${encodeURIComponent(selectedSlug)}`)
      .then(r => r.json())
      .then(d => {
        if (d?.events?.length) {
          const groups = [];
          d.events.forEach(ev => {
            (ev.phases || []).forEach(ph => {
              (ph.phaseGroups || []).forEach(pg => {
                groups.push({ id: String(pg.id), label: pg.label, phaseName: ph.name, phaseLabel: `${ph.name} · ${ph.bracketType || ''}`, eventId: String(ev.id), eventName: ev.name, slug: selectedSlug });
              });
            });
          });
          if (groups.length > 0) setAllPhaseGroups(groups);
        }
      })
      .catch(() => {});
  }, [checking, selectedSlug]);

  useEffect(() => {
    if (!selectedEventId) return;
    function loadEntrants() {
      setLoadingEntrants(true);
      fetch(`/api/tournaments/entrants?eventId=${selectedEventId}`)
        .then(r => r.json())
        .then(d => { if (d.entrants) setEntrants(d.entrants); })
        .finally(() => setLoadingEntrants(false));
    }
    loadEntrants();
    const iv = setInterval(loadEntrants, 30000);
    return () => clearInterval(iv);
  }, [selectedEventId]);

  useEffect(() => {
    function handleOut(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleOut);
    return () => document.removeEventListener('mousedown', handleOut);
  }, []);

  function handleLogout() { logout(); router.replace('/login'); }

  function emitPanelState(stateData) {
    const comm = _communitySync();
    if (panelSocketRef.current?.connected) {
      panelSocketRef.current.emit('panel:state-update', { community: comm, state: stateData });
    }
  }

  function closeTournament() {
    setSelectedSlug('');
    setSelectedPhaseGroupId('');
    setSelectedBracketUrl('');
    setSelectedEventId(null);
    setTournament(null);
    setBracketSets([]);
    setPhaseStarted(false);
    setAssignedSets({});
    try {
      localStorage.removeItem(lsk('selectedSlug', community));
      localStorage.removeItem(lsk('selectedPhaseGroupId', community));
      localStorage.removeItem(lsk('selectedBracketUrl', community));
      localStorage.removeItem(lsk('selectedEventId', community));
      localStorage.removeItem(lsk('phaseStarted', community));
    } catch {}
    emitPanelState({ selectedSlug: '', selectedPhaseGroupId: '', selectedBracketUrl: '', selectedEventId: null, phaseStarted: false, assignedSets: {}, forceResetAssigned: true });
  }

  async function finishTournament() {
    if (!selectedSlug || finishTourState === 'loading' || finishTourState === 'ok') return;
    if (!window.confirm('¿Marcar el torneo como TERMINADO en la página de torneos?')) return;
    setFinishTourState('loading');
    try {
      const r = await fetch('/api/tournaments/mark-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: selectedSlug }),
      });
      if (r.ok) {
        setFinishTourState('ok');
      } else {
        setFinishTourState('error');
        setTimeout(() => setFinishTourState(null), 4000);
      }
    } catch {
      setFinishTourState('error');
      setTimeout(() => setFinishTourState(null), 4000);
    }
  }

  async function notifyTournament() {
    setNotifyState('loading');
    try {
      const r = await fetch('/api/tournaments/sync-startgg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer afk-admin-2025',
        },
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Error');
      setNotifyState(d.newTournaments?.length > 0 ? 'ok' : 'ok_no_new');
    } catch {
      setNotifyState('error');
    } finally {
      setTimeout(() => setNotifyState(null), 5000);
    }
  }

  function startPhase() {
    if (!selectedPhaseGroupId) return;
    // La API pública de start.gg no permite iniciar phase groups.
    // El drag se habilita localmente. El torneo en start.gg hay que iniciarlo desde allá.
    setPhaseStarted(true);
    setStartState('ok');
    setTimeout(() => setStartState(null), 5000);
    emitPanelState({ phaseStarted: true });

    const tourName = tournament?.name || '';
    const tourUrl  = tournament?.url || selectedBracketUrl || `https://www.start.gg/${selectedSlug}`;

    // Push broadcast a TODOS los usuarios de la app
    fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
      body: JSON.stringify({
        broadcast: true,
        title: `🏆 ¡Torneo iniciado!`,
        body: tourName ? `${tourName} ha comenzado. ¡A jugar!` : '¡El torneo ha comenzado!',
        data: { url: '/home?open=torneos', type: 'tournament_started' },
      }),
    }).catch(() => {});

    // Notificar individualmente a cada inscripto (inbox + push individual)
    const names = entrants.map(e => e.tag || e.name).filter(Boolean);
    if (names.length > 0) {
      fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
        body: JSON.stringify({
          targetUserNames: names,
          title: '🏆 Torneo iniciado',
          body: `¡${tourName || 'El torneo'} ha comenzado! Revisá el bracket.`,
          setup: 'Torneo iniciado',
          sentBy: 'Admin',
          data: { url: '/home?open=torneos', type: 'tournament_started' },
        }),
      }).catch(() => {});
    }
  }

  function openTourPicker() {
    setTourPickerOpen(true);
    setPickTour(null);
    setPickPhases(null);
    setSlugInput('');
    setPickTourPreview(null);
    setLoadingPickTourPreview(false);
    setLoadingPickTours(true);

    const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'afk-admin-2025';
    const authHeaders = { 'Authorization': `Bearer ${ADMIN_SECRET}` };

    Promise.all([
      fetch(`/api/tournaments/sync-startgg?community=${encodeURIComponent(community)}&refresh=true`).then(r => r.json()),
      fetch(`/api/tournaments/saved-slugs?community=${encodeURIComponent(community)}`, { headers: authHeaders }).then(r => r.json()),
    ])
      .then(async ([syncData, savedData]) => {
        const slugsList = savedData.slugs || [];
        setSavedSlugs(slugsList);

        // Mostrar todos los torneos excepto cancelados (incluyendo terminados)
        const available = (syncData.tournaments || []).filter(t => t.state !== 4 && t.state !== 'CANCELLED');

        // Incluir el torneo actualmente gestionado aunque no esté en sync-startgg
        const activeTournament = tournament;
        if (activeTournament?.slug && !available.some(t => t.slug === activeTournament.slug)) {
          available.unshift({ ...activeTournament, _current: true });
        }

        // Cargar info de slugs guardados manualmente que no estén ya en la lista
        const missing = slugsList.filter(s => !available.some(t => t.slug === s));
        if (missing.length > 0) {
          const fetched = await Promise.all(
            missing.map(s =>
              fetch(`/api/tournaments/info?slug=${encodeURIComponent(s)}`)
                .then(r => r.json())
                .then(d => d.error ? null : { ...d, slug: s, attendees: d.attendees ?? 0, _saved: true })
                .catch(() => null)
            )
          );
          const validFetched = fetched.filter(Boolean);
          setPickTournaments([...available, ...validFetched]);
        } else {
          setPickTournaments(available);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPickTours(false));
  }

  async function addFeaturedTournament() {
    if (!featuredInput.trim() || featuredAdding) return;
    setFeaturedAdding(true);
    try {
      const r = await fetch('/api/tournaments/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET || 'afk-admin-2025'}` },
        body: JSON.stringify({ url: featuredInput.trim(), notify: true }),
      });
      const d = await r.json();
      if (d.success) {
        setFeaturedTours(prev => [d.tournament, ...prev.filter(t => t.slug !== d.tournament.slug)]);
        setFeaturedInput('');
      } else {
        alert(d.error || 'Error al agregar torneo');
      }
    } catch { alert('Error de conexión'); }
    finally { setFeaturedAdding(false); }
  }

  async function removeFeaturedTournament(slug) {
    try {
      const r = await fetch(`/api/tournaments/featured?slug=${encodeURIComponent(slug)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET || 'afk-admin-2025'}` },
      });
      const d = await r.json();
      if (d.success) setFeaturedTours(prev => prev.filter(t => t.slug !== slug));
    } catch {}
  }

  async function changeTournamentState(slug, state) {
    try {
      const r = await fetch('/api/tournaments/featured', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET || 'afk-admin-2025'}` },
        body: JSON.stringify({ slug, state }),
      });
      const d = await r.json();
      if (d.success) setFeaturedTours(prev => prev.map(t => t.slug === slug ? { ...t, state: d.tournament.state, stateLabel: d.tournament.stateLabel, registrationOpen: d.tournament.registrationOpen } : t));
    } catch {}
  }

  async function notifyFeaturedTournament(slug) {
    const t = featuredTours.find(x => x.slug === slug);
    if (!t) return;
    if (!window.confirm(`¿Enviar notificación push a todos los usuarios sobre "${t.name}"?`)) return;
    try {
      const r = await fetch('/api/tournaments/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET || 'afk-admin-2025'}` },
        body: JSON.stringify({ url: slug, notify: true }),
      });
      const d = await r.json();
      if (d.success) { alert('✅ Notificación enviada correctamente'); }
      else { alert(d.error || 'Error al enviar notificación'); }
    } catch { alert('Error de conexión'); }
  }

  function parseStartGgSlug(raw) {
    let s = raw.trim();
    // Acepta URL completa: https://www.start.gg/tournament/mi-torneo/details/...
    s = s.replace(/^https?:\/\/(www\.)?start\.gg\//, '');
    // Quita /details, /brackets, /events etc. al final
    s = s.replace(/\/(details|brackets|events|registration|standings|results)(\/.*)?$/, '');
    s = s.replace(/\/$/, '');
    return s;
  }

  function parseSetupId(setupId) {
    // Extrae la comunidad del setupId: 'warui-1' → 'warui', 'afk-tablet' → 'afk-multi', etc.
    if (!setupId) return { community: '', setupId: '' };
    const COMMUNITIES = ['santafe', 'santa-fe', 'cordoba', 'mendoza', 'afk-multi', 'afk', 'warui', 'inc', 'test'];
    for (const c of COMMUNITIES) {
      if (setupId.startsWith(c + '-') || setupId === c) {
        return { community: c, setupId };
      }
    }
    return { community: setupId.split('-')[0], setupId };
  }

  function previewSlugTournament(rawInput) {
    const slug = parseStartGgSlug(rawInput);
    if (!slug) return;
    setLoadingPickTourPreview(true);
    setPickTourPreview(null);
    fetch(`/api/tournaments/info?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) setPickTourPreview({ ...d, _slug: slug });
        else setPickTourPreview({ _error: d.error || 'Torneo no encontrado', _slug: slug });
      })
      .catch(() => setPickTourPreview({ _error: 'Error al conectar con start.gg', _slug: slug }))
      .finally(() => setLoadingPickTourPreview(false));
  }

  function selectPickTournament(t) {
    setPickTour(t);
    setPickPhases(null);
    setLoadingPickPhases(true);
    fetch(`/api/tournaments/phases?slug=${encodeURIComponent(t.slug)}`)
      .then(r => r.json())
      .then(d => setPickPhases(d))
      .catch(() => {})
      .finally(() => setLoadingPickPhases(false));
  }

  function confirmPhaseGroup(slug, pgId, eventId) {
    const pgIdStr = String(pgId);
    const evIdStr = String(eventId);
    // Preservar matches activos al cambiar de torneo/pool desde el picker
    const activeMatches = Object.fromEntries(
      Object.entries(assignedSets).filter(([, set]) => set?.sessionId)
    );
    setSelectedSlug(slug);
    setSelectedPhaseGroupId(pgIdStr);
    setSelectedEventId(evIdStr);
    setSelectedBracketUrl(`https://www.start.gg/${slug}`);
    setTournament(null);
    setBracketSets([]);
    setBracketLoading(true);   // mostrar spinner inmediatamente
    setAssignedSets(activeMatches);
    setEntrants([]);
    setTourPickerOpen(false);
    // Extraer todos los phase groups disponibles para el dropdown de pools
    let computedGroups = [];
    if (pickPhases?.events?.length) {
      pickPhases.events.forEach(ev => {
        (ev.phases || []).forEach(ph => {
          (ph.phaseGroups || []).forEach(pg => {
            computedGroups.push({ id: String(pg.id), label: pg.label, phaseName: ph.name, phaseLabel: `${ph.name} · ${ph.bracketType || ''}`, eventId: String(ev.id), eventName: ev.name, slug });
          });
        });
      });
      setAllPhaseGroups(computedGroups);
    }
    setPickTour(null);
    setPickPhases(null);
    // Auto-guardar slug para que el torneo siga apareciendo en el picker aunque termine
    if (slug && !savedSlugs.includes(slug)) {
      const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'afk-admin-2025';
      fetch('/api/tournaments/saved-slugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_SECRET}` },
        body: JSON.stringify({ community, slug }),
      }).then(r => r.json()).then(d => { if (d.slugs) setSavedSlugs(d.slugs); }).catch(() => {});
    }
    // Fetch en paralelo sin esperar re-render + effects
    fetch(`/api/tournaments/bracket?phaseGroupId=${pgIdStr}`)
      .then(r => r.json())
      .then(d => { if (d.sets) { setBracketSets(d.sets); setPhaseName(d.phaseName || ''); if (d.phaseGroupState >= 2) setPhaseStarted(true); } })
      .finally(() => setBracketLoading(false));
    fetch(`/api/tournaments/info?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => { if (!d.error) { setTournament(d); setLastRefresh(new Date()); } });
    fetch(`/api/tournaments/entrants?eventId=${evIdStr}`)
      .then(r => r.json())
      .then(d => { if (d.entrants) setEntrants(d.entrants); });
    // Sincronizar torneo seleccionado con otros admins (incluye allPhaseGroups y setupFormats)
    emitPanelState({
      selectedSlug: slug,
      selectedPhaseGroupId: pgIdStr,
      selectedEventId: evIdStr,
      selectedBracketUrl: `https://www.start.gg/${slug}`,
      phaseStarted: false,
      assignedSets: activeMatches,
      allPhaseGroups: computedGroups,
      setupFormats,
    });
  }

  function switchPool(newPgId) {
    const pg = allPhaseGroups.find(p => p.id === newPgId);
    if (!pg || newPgId === selectedPhaseGroupId) return;
    // Preservar TODOS los matches asignados al cambiar de pool (mismo torneo, distintas pools)
    // No limpiar setups — los matches de otra pool siguen siendo válidos
    setSelectedPhaseGroupId(newPgId);
    setBracketSets([]);
    setBracketLoading(true);
    if (pg.eventId && pg.eventId !== selectedEventId) setSelectedEventId(pg.eventId);
    fetch(`/api/tournaments/bracket?phaseGroupId=${newPgId}`)
      .then(r => r.json())
      .then(d => { if (d.sets) { setBracketSets(d.sets); setPhaseName(d.phaseName || ''); if (d.phaseGroupState >= 2) setPhaseStarted(true); } })
      .finally(() => setBracketLoading(false));
    if (pg.eventId && pg.eventId !== selectedEventId) {
      fetch(`/api/tournaments/entrants?eventId=${pg.eventId}`)
        .then(r => r.json())
        .then(d => { if (d.entrants) setEntrants(d.entrants); });
    }
    emitPanelState({ selectedPhaseGroupId: newPgId, selectedEventId: pg.eventId || selectedEventId });
  }

  const tournamentStarted = tournament?.state === 2 || phaseStarted;

  // Activación MANUAL del siguiente match en cola de un setup (el admin decide cuándo).
  // Antes esto se auto-disparaba al liberarse el setup; ahora se hace solo con el botón "Activar".
  function activateNextQueued(setupId) {
    const { community: comm } = parseSetupId(setupId);
    if (!panelSocketRef.current?.connected) { alert('No conectado al servidor. Refrescá la página.'); return; }
    console.log(`[QUEUE] ▶ Activación manual del siguiente en ${setupId}`);
    panelSocketRef.current.emit('activate-queued-match', { setupId, community: comm });
  }

  function getQueueKey(set) {
    return `${set?.slots?.[0]?.entrant?.name || 'P1'}_vs_${set?.slots?.[1]?.entrant?.name || 'P2'}`;
  }
  function onDragStart(set, e) {
    if (!tournamentStarted || lockedSets[set.id]) { e.preventDefault(); return; }
    // Bloquear si ya está asignado a un setup
    if (Object.values(assignedSets).some(s => s?.id === set.id)) { e.preventDefault(); return; }
    // Bloquear si ya está encolado en otro setup
    if (queuedMatches[getQueueKey(set)]) { e.preventDefault(); return; }
    setDraggedSet(set); e.dataTransfer.effectAllowed = 'move';
  }
  function onDragEnd() { setDraggedSet(null); setDragOverSetup(null); }
  function onDragOver(e, setupId) {
    if (!tournamentStarted) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverSetup(setupId);
  }
  function onDragLeave(e) { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverSetup(null); }
  function onDrop(e, setupId) {
    e.preventDefault();
    if (!draggedSet || !tournamentStarted) return;
    // Bloquear si el match ya está asignado a otro setup
    if (Object.values(assignedSets).some(s => s?.id === draggedSet.id)) { setDraggedSet(null); setDragOverSetup(null); return; }
    // Bloquear si el match ya está encolado en algún setup
    if (queuedMatches[getQueueKey(draggedSet)]) { setDraggedSet(null); setDragOverSetup(null); return; }

    const cleanSet = { ...draggedSet };
    const setupAlreadyHasMatch = assignedSets[setupId];

    if (setupAlreadyHasMatch) {
      // Si el setup ya tiene un match, ENCOLAR en lugar de reemplazar
      const { community } = parseSetupId(setupId);
      console.log(`[QUEUE] Intentando encolar match en ${setupId}, socket connected:`, panelSocketRef.current?.connected);

      if (panelSocketRef.current?.connected) {
        const p1Name = cleanSet.slots[0]?.entrant?.name || '?';
        const p2Name = cleanSet.slots[1]?.entrant?.name || '?';

        panelSocketRef.current.emit('queue-match', {
          setupId,
          community,
          player1: cleanSet.slots[0]?.entrant || {},
          player2: cleanSet.slots[1]?.entrant || {},
          format: 'BO3',
          round: cleanSet.fullRoundText || '',
          tournamentName: tournament?.name || '',
          startggSetId: cleanSet.id,
          startggEntrant1Id: cleanSet.slots[0]?.id,
          startggEntrant2Id: cleanSet.slots[1]?.id,
        });

        console.log(`✅ Match encolado: ${p1Name} vs ${p2Name}`);

        // Mostrar notificación con setup identificado
        const setupLabel = SETUPS.find(s => s.id === setupId)?.label || setupId;
        setQueuedNotification({
          message: `${p1Name} vs ${p2Name}`,
          setupLabel,
          setupId,
          timestamp: Date.now()
        });

        // Marcar el match como encolado (para mostrarlo en bracket)
        setQueuedMatches(prev => ({
          ...prev,
          [getQueueKey(cleanSet)]: setupId
        }));

        setTimeout(() => setQueuedNotification(null), 4000);
      } else {
        console.error('❌ Socket no conectado, no se puede encolar');
        alert('Error: No está conectado al servidor. Intenta refrescar la página.');
      }
    } else {
      // Si el setup está vacío, asignar normalmente
      setAssignedSets(prev => {
        const next = { ...prev };
        for (const k of Object.keys(next)) { if (next[k]?.id === cleanSet.id) delete next[k]; }
        next[setupId] = cleanSet;
        return next;
      });
    }

    setDraggedSet(null); setDragOverSetup(null);
  }
  function removeAssignment(setupId) {
    stopMatchTimer(setupId);
    setAssignedSets(prev => { const n = { ...prev }; delete n[setupId]; return n; });
  }

  function assignToSetupDirectly(set, setupId) {
    if (!tournamentStarted || lockedSets[set.id]) return;
    // Bloquear si ya está asignado a un setup
    if (Object.values(assignedSets).some(s => s?.id === set.id)) return;
    const cleanSet = { ...set };
    setAssignedSets(prev => {
      const next = { ...prev };
      // Quitar el set de cualquier setup previo
      for (const k of Object.keys(next)) { if (next[k]?.id === cleanSet.id) delete next[k]; }
      next[setupId] = cleanSet;
      return next;
    });
  }

  function stopMatchTimer(setupId) {
    const t = matchTimersRef.current[setupId];
    if (t?.intervalId) clearInterval(t.intervalId);
    delete matchTimersRef.current[setupId];
    setMatchTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
    // También detener elapsed timer
    const et = elapsedTimersRef.current[setupId];
    if (et?.intervalId) clearInterval(et.intervalId);
    delete elapsedTimersRef.current[setupId];
    setElapsedTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
    checkedInSetups.current.delete(setupId);
    // Cancelar la sesión en el servidor WS para que los jugadores dejen de verla como activa
    // Usar el ref para evitar leer una closure obsoleta del state
    const sessionId = assignedSetsRef.current[setupId]?.sessionId;
    const startggSetId = assignedSetsRef.current[setupId]?.startggSetId;
    if (sessionId) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
      fetch(`${socketUrl}/session/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }).catch(() => {});
    }
    // Reset del set en start.gg para que vuelva a estado CREATED
    if (startggSetId) {
      fetch('/api/tournaments/reset-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: startggSetId }),
      }).catch(() => {});
    }
    // Liberar el setup del panel admin
    setAssignedSets(prev => { const n = { ...prev }; delete n[setupId]; return n; });
    autoReleasedSetups.current.delete(setupId);
    // Refrescar el bracket para reflejar el cambio
    if (selectedPhaseGroupId) {
      setTimeout(() => {
        fetch(`/api/tournaments/bracket?phaseGroupId=${selectedPhaseGroupId}`)
          .then(r => r.json())
          .then(d => { if (d.sets) setBracketSets(d.sets); })
          .catch(() => {});
      }, 1500);
    }
  }

  async function dqPlayer(setupId, loserSlotIndex) {
    const set = assignedSetsRef.current[setupId];
    if (!set) return;
    const loserSlot = set.slots?.[loserSlotIndex];
    const winnerSlot = set.slots?.[loserSlotIndex === 0 ? 1 : 0];
    const loserName = loserSlot?.entrant?.name || `Jugador ${loserSlotIndex + 1}`;
    const winnerName = winnerSlot?.entrant?.name || `Jugador ${loserSlotIndex === 0 ? 2 : 1}`;
    const winnerId = winnerSlot?.entrant?.id;
    const setId = set.startggSetId || set.id;
    if (!winnerId || !setId) {
      alert('No hay IDs de start.gg para este set. Asegurate de tener un torneo seleccionado.');
      return;
    }
    if (!confirm(`¿DQ a ${loserName}?\nSe reportará como ganador a ${winnerName}.`)) return;
    setDqingSetup(setupId);
    try {
      const res = await fetch('/api/tournaments/dq-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: String(setId), winnerId: String(winnerId) }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert('Error al aplicar DQ: ' + (data.error || 'Error desconocido'));
        return;
      }
      setReportLog(prev => [{
        time: new Date(),
        setId: setId,
        players: `DQ ${loserName}`,
        round: set.fullRoundText || set.round || '',
        score: `🚫 DQ → ${winnerName} avanza`,
      }, ...prev].slice(0, 20));
      // Cancelar sesión WS y liberar el setup (sin reset-set porque ya está completado)
      const sessionId = assignedSetsRef.current[setupId]?.sessionId;
      if (sessionId) {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
        fetch(`${socketUrl}/session/${encodeURIComponent(sessionId)}`, { method: 'DELETE' }).catch(() => {});
      }
      const t = matchTimersRef.current[setupId];
      if (t?.intervalId) clearInterval(t.intervalId);
      delete matchTimersRef.current[setupId];
      setMatchTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
      const et = elapsedTimersRef.current[setupId];
      if (et?.intervalId) clearInterval(et.intervalId);
      delete elapsedTimersRef.current[setupId];
      setElapsedTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
      checkedInSetups.current.delete(setupId);
      autoReleasedSetups.current.delete(setupId);
      setAssignedSets(prev => { const n = { ...prev }; delete n[setupId]; return n; });
      if (selectedPhaseGroupId) {
        setTimeout(() => {
          fetch(`/api/tournaments/bracket?phaseGroupId=${selectedPhaseGroupId}`)
            .then(r => r.json())
            .then(d => { if (d.sets) setBracketSets(d.sets); })
            .catch(() => {});
        }, 1500);
      }
    } catch (e) {
      alert('Error de red: ' + e.message);
    } finally {
      setDqingSetup(null);
    }
  }

  async function callMatch(setupId, overrideSet) {
    const set = overrideSet || assignedSets[setupId];
    if (!set) return;
    const players = (set.slots || []).map(s => s?.entrant?.name).filter(Boolean);
    const p1Entrant = set.slots?.[0]?.entrant || {};
    const p2Entrant = set.slots?.[1]?.entrant || {};
    const player1Country  = p1Entrant.country   || 'Argentina';
    const player1FlagCode = p1Entrant.flagCode   || 'ar';
    const player1Seed     = p1Entrant.seed       || null;
    const player1Prefix   = p1Entrant.prefix     || null;
    const player1Pronouns = p1Entrant.pronouns   || null;
    const player2Country  = p2Entrant.country   || 'Argentina';
    const player2FlagCode = p2Entrant.flagCode   || 'ar';
    const player2Seed     = p2Entrant.seed       || null;
    const player2Prefix   = p2Entrant.prefix     || null;
    const player2Pronouns = p2Entrant.pronouns   || null;
    const format = setupFormats[setupId] || 'BO3';
    // Para el setup de stream/tablet se usa el ID canónico fijo (el overlay de OBS se suscribe a ese ID siempre).
    // Mapeo comunidad → sessionId de stream (afk-multi usa 'afk-stream' para que coincida con /stream/afk-stream)
    const COMMUNITY_STREAM_IDS = { 'afk-multi': 'afk-stream', 'cordoba': 'cordoba-stream', 'mendoza': 'mendoza-stream', 'warui': 'warui-stream', 'inc': 'inc-stream', 'santafe': 'santafe-stream' };
    const COMMUNITY_TABLET_IDS = { 'mendoza': 'mendoza-tablet', 'afk-multi': 'afk-tablet' };
    const isStreamSetup = setupId.endsWith('-stream');
    const isTabletSetup = setupId.endsWith('-tablet');
    const sessionId = isStreamSetup
      ? (COMMUNITY_STREAM_IDS[community] || setupId)
      : isTabletSetup
        ? (COMMUNITY_TABLET_IDS[community] || setupId)
        : `${community}-${setupId.replace(`${community}-`, '')}-${Date.now().toString(36)}`;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://smash-ban-stages.vercel.app';
    // Setup tablet Mendoza usa /tablet/mendoza/[sessionId] (URL pública, sin login)
    const tabletBase = isTabletSetup && community === 'mendoza'
      ? `${origin}/tablet/mendoza/${sessionId}`
      : `${origin}/tablet/${sessionId}`;
    const banUrl  = tabletBase;
    const banUrl1 = `${banUrl}?p=player1`;
    const banUrl2 = `${banUrl}?p=player2`;

    // Limpiar timers anteriores del mismo setup (si había un retry)
    // Solo limpiar timers — NO borrar asignación ni cancelar sesión
    const prevTimer = matchTimersRef.current[setupId];
    if (prevTimer?.intervalId) clearInterval(prevTimer.intervalId);
    delete matchTimersRef.current[setupId];
    setMatchTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
    const prevElapsed = elapsedTimersRef.current[setupId];
    if (prevElapsed?.intervalId) clearInterval(prevElapsed.intervalId);
    delete elapsedTimersRef.current[setupId];
    setElapsedTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
    checkedInSetups.current.delete(setupId);
    autoReleasedSetups.current.delete(setupId); // Reset para que el nuevo match pueda auto-liberarse

    // IDs de start.gg del set seleccionado (para reportar resultados automáticamente)
    const startggSetId      = set.id;
    const startggEntrant1Id = set.slots?.[0]?.entrant?.id || null;
    const startggEntrant2Id = set.slots?.[1]?.entrant?.id || null;

    // Reiniciar contador de games para este setup
    prevGamesRef.current[setupId] = 0;

    // --- Todas las llamadas de red se paralelizan para reducir latencia ---
    // Start.gg corre en paralelo (no bloquea las notificaciones ni la sesión).
    const STATE_NAMES = { 1: 'CREATED', 2: 'ACTIVE ✅', 3: 'COMPLETED', 6: 'BYE', 7: 'CALLED' };
    const startggPromise = startggSetId
      ? (async () => {
          try {
            console.log(`[start.gg] markSetInProgress → setId=${startggSetId}`);
            const res = await fetch('/api/tournaments/mark-set-in-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ setId: String(startggSetId) }),
            });
            const data = await res.json();
            const st = data.set?.state || data.stateLabel;
            console.log(`[start.gg] → state=${st}`, data);
            return st;
          } catch (e) {
            console.error('[start.gg] ❌ error activando set:', e);
            return null;
          }
        })()
      : Promise.resolve(null);

    // Pre-crear la sesión + registrar en WS server en paralelo con Start.gg
    try {
      await fetch(`/api/session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1: players[0] || 'Jugador 1',
          player2: players[1] || 'Jugador 2',
          format,
          startggSetId,
          startggEntrant1Id,
          startggEntrant2Id,
        }),
      });
    } catch {}

    // Enviar datos de start.gg al servidor WebSocket
    // await garantiza que la sesión esté en CHECKIN antes de que el primer poll se ejecute.
    // Esto evita una race condition en setups de stream (mismo sessionId fijo) donde el
    // poll inmediato podría ver el estado CANCELLED de la sesión anterior.
    let matchToken = '';
    try {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
      const metaRes = await fetch(`${socketUrl}/session-meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, setupId, community, startggSetId, startggEntrant1Id, startggEntrant2Id,
          player1: players[0] || 'Jugador 1',
          player2: players[1] || 'Jugador 2',
          format,
          round: set.fullRoundText || set.round || '',
          tournamentName: tournament?.name || '',
          forceReset: true,
          player1Country, player1FlagCode, player1Seed, player1Prefix, player1Pronouns,
          player2Country, player2FlagCode, player2Seed, player2Prefix, player2Pronouns,
        }),
      });
      const metaData = await metaRes.json().catch(() => ({}));
      matchToken = metaData.matchToken || '';
    } catch {}

    // Guardar metadata de jugadores (seed, país, bandera, prefix) en Redis vía Vercel
    // para que control.html pueda leerla independientemente del socket server
    if (isStreamSetup && community === 'santafe') {
      fetch('/api/santa-fe/player-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1Seed, player1Country, player1FlagCode, player1Prefix, player1Pronouns,
          player2Seed, player2Country, player2FlagCode, player2Prefix, player2Pronouns,
        }),
      }).catch(() => {});

      // Poblar overlay2-state para que overlay2.html se actualice automáticamente
      // con jugadores, ronda y formato al llamar un nuevo match de stream
      const formatLabel = format === 'BO5' ? 'BO5' : 'BO3';
      fetch('/api/santa-fe/overlay2-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'p1-name':      players[0] || '',
          'p2-name':      players[1] || '',
          'p1-score':     0,
          'p2-score':     0,
          'p1-char':      '',
          'p2-char':      '',
          'event-round':   set.fullRoundText || set.round || '',
          'event-bracket': formatLabel,
          'p1-flag':      player1FlagCode || 'ar',
          'p1-country':   player1Country || '',
          'p1-seed':      player1Seed ? `SEED ${player1Seed}` : '',
          'p1-pronouns':  player1Pronouns || '',
          'p2-flag':      player2FlagCode || 'ar',
          'p2-country':   player2Country || '',
          'p2-seed':      player2Seed ? `SEED ${player2Seed}` : '',
          'p2-pronouns':  player2Pronouns || '',
        }),
      }).catch(() => {});
    }

    // Agregar matchToken a las URLs para validación de identidad
    const tokenParam = matchToken ? `&mt=${matchToken}` : '';
    const banUrl1WithToken = `${banUrl1}${tokenParam}`;
    const banUrl2WithToken = `${banUrl2}${tokenParam}`;

    // Notificar a cada jugador con su URL específica (para identificación automática sin login)
    // Ambas notificaciones se envían en paralelo para máxima velocidad
    // El setup tablet de Mendoza no envía notificaciones push (los jugadores están presentes físicamente)
    const setupLabel = SETUPS.find(s => s.id === setupId)?.label || setupId.replace(`${community}-`, '').replace('stream', 'Stream');
    const notifTitle = `📢 ¡Te toca match!`;
    const notifBody  = `${players.join(' vs ')} — ${setupLabel} — ¡Tienen 5 min para hacer check-in!`;
    const notifPromises = [];
    if (!isTabletSetup) {
      if (players[0]) {
        notifPromises.push(
          fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
            body: JSON.stringify({ title: notifTitle, body: notifBody, targetUserNames: [players[0]], data: { url: banUrl1WithToken } }),
          }).catch(() => {})
        );
      }
      if (players[1]) {
        notifPromises.push(
          fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
            body: JSON.stringify({ title: notifTitle, body: notifBody, targetUserNames: [players[1]], data: { url: banUrl2WithToken } }),
          }).catch(() => {})
        );
      }
    }

    await Promise.allSettled(notifPromises);

    // Esperar Start.gg solo para el log (no bloquea notificaciones ni sesión)
    const finalState = await startggPromise;
    const stateDisplay = STATE_NAMES[finalState] || finalState || '?';

    // Log local: match llamado
    setReportLog(prev => [{
      time: new Date(),
      setId: startggSetId,
      players: players.join(' vs '),
      round: set.fullRoundText || '',
      score: startggSetId ? `— start.gg: ${stateDisplay}` : '— iniciado (sin ID)',
      called: true,
    }, ...prev].slice(0, 20));

    // Para torneos Warui Team: sincronizar con overlay de stream (controls.html)
    if (community === 'warui' && isStreamSetup) {
      fetch('/api/warui/stream-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
        body: JSON.stringify({
          player1: players[0] || 'Jugador 1',
          player2: players[1] || 'Jugador 2',
          format,
          round: set.fullRoundText || set.round || '',
          sessionId,
          char1: '',
          char2: '',
        }),
      }).catch(() => {});
    }
    // Para torneos INC: sincronizar con overlay de stream
    if (community === 'inc' && isStreamSetup) {
      fetch('/api/inc/stream-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
        body: JSON.stringify({
          player1: players[0] || 'Jugador 1',
          player2: players[1] || 'Jugador 2',
          format,
          round: set.fullRoundText || set.round || '',
          sessionId,
        }),
      }).catch(() => {});
    }
    // Para torneos Mendoza: auto-populate scoreboard con jugadores y ronda (stream Y tablet)
    if (community === 'mendoza' && (isStreamSetup || isTabletSetup)) {
      fetch('/api/mendoza/scoreboard-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
        body: JSON.stringify({
          autoPopulate: true,
          player1: players[0] || 'Jugador 1',
          player2: players[1] || 'Jugador 2',
          round: set.fullRoundText || set.round || '',
          format,
        }),
      })
        .then(r => r.json())
        .then(d => { if (d.state) setMendozaSB(d.state); })
        .catch(() => {});
    }
    // Para torneos AFk Multi: sincronizar con overlay control
    if (community === 'afk-multi' && isStreamSetup) {
      fetch('/api/afk/score-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p1tag: players[0] || 'Jugador 1',
          p2tag: players[1] || 'Jugador 2',
          p1score: 0,
          p2score: 0,
          p1char: '',
          p2char: '',
          p1charIcon: '',
          p2charIcon: '',
          round: set.fullRoundText || set.round || '',
          format: parseInt(format) || 3,
          needed: Math.ceil((parseInt(format) || 3) / 2),
          tournamentName: tournament?.name || '',
        }),
      }).catch(() => {});
    }

    // Guardar sessionId + datos startgg + timestamp en el state
    setAssignedSets(prev => ({ ...prev, [setupId]: { ...prev[setupId], sessionId, banUrl, banUrl1, banUrl2, startggSetId, startggEntrant1Id, startggEntrant2Id, timerStartedAt: Date.now() } }));

    // Iniciar countdown 5min
    const SECONDS = 5 * 60;
    matchTimersRef.current[setupId] = { secondsLeft: SECONDS };
    setMatchTimers(prev => ({ ...prev, [setupId]: SECONDS }));
    const iv = setInterval(() => {
      const cur = matchTimersRef.current[setupId];
      if (!cur) { clearInterval(iv); return; }
      const next = cur.secondsLeft - 1;
      matchTimersRef.current[setupId] = { secondsLeft: next, intervalId: iv };
      setMatchTimers(prev => ({ ...prev, [setupId]: next }));
      if (next <= 0) {
        clearInterval(iv);
        delete matchTimersRef.current[setupId];
        setMatchTimers(prev => { const n = { ...prev }; delete n[setupId]; return n; });
        // Cancelar match completo: sesión WS + reset start.gg + liberar setup
        stopMatchTimer(setupId);
      }
    }, 1000);
    matchTimersRef.current[setupId].intervalId = iv;
  }

  const assignedSetIds = new Set(Object.values(assignedSets).filter(Boolean).map(s => s.id));
  const pendingSets    = bracketSets.filter(s => !assignedSetIds.has(s.id) && s.stateLabel !== 'COMPLETED' && s.stateLabel !== 'BYE');
  const completedSets  = bracketSets.filter(s => s.stateLabel === 'COMPLETED');

  // Setups con match asignado pero sin sesión activa todavía (no llamados)
  const setupsPendingCall = SETUPS.filter(s => assignedSets[s.id] && !assignedSets[s.id]?.sessionId);

  async function callAllAssigned() {
    await Promise.all(setupsPendingCall.map(setup => callMatch(setup.id)));
  }

  // ── Scoreboard Mendoza: send/update ──────────────────────────────────────
  async function sendMendozaScoreboard(state) {
    setMendozaSBStatus('saving');
    try {
      const r = await fetch('/api/mendoza/scoreboard-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
        body: JSON.stringify(state),
      });
      if (r.ok) {
        setMendozaSBStatus('ok');
        setTimeout(() => setMendozaSBStatus('idle'), 1800);
      } else {
        setMendozaSBStatus('error');
        setTimeout(() => setMendozaSBStatus('idle'), 3000);
      }
    } catch {
      setMendozaSBStatus('error');
      setTimeout(() => setMendozaSBStatus('idle'), 3000);
    }
  }

  function updateMendozaSBField(patch, debounce = false) {
    setMendozaSB(prev => {
      const next = { ...prev, ...patch };
      if (patch.player1) next.player1 = { ...prev.player1, ...patch.player1 };
      if (patch.player2) next.player2 = { ...prev.player2, ...patch.player2 };
      if (!debounce) sendMendozaScoreboard(next);
      else {
        clearTimeout(mendozaSBDebounceRef.current);
        mendozaSBDebounceRef.current = setTimeout(() => sendMendozaScoreboard(next), 450);
      }
      return next;
    });
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#0B0B12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const startDate = tournament?.startAt
    ? new Date(tournament.startAt).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    : null;

  function getRoundPriority(name) {
    const n = (name || '').toLowerCase();
    if (n === 'grand final reset') return 99;
    if (n === 'grand final') return 98;
    if (n.includes('losers') && n.includes('final') && !n.includes('semi') && !n.includes('quarter')) return 80;
    if (n.includes('losers') && n.includes('semi')) return 75;
    if (n.includes('losers') && n.includes('quarter')) return 72;
    const lm = n.match(/losers.*?(\d+)/); if (lm) return 50 + parseInt(lm[1]);
    if (n.includes('winners') && n.includes('final') && !n.includes('semi') && !n.includes('quarter')) return 40;
    if (n.includes('winners') && n.includes('semi')) return 35;
    if (n.includes('winners') && n.includes('quarter')) return 30;
    const wm = n.match(/winners.*?(\d+)/); if (wm) return 10 + parseInt(wm[1]);
    return 60;
  }
  const roundGroups = (() => {
    const map = {};
    for (const s of bracketSets) {
      const r = s.round || 'Sin ronda';
      if (!map[r]) map[r] = [];
      map[r].push(s);
    }
    return Object.entries(map).sort((a, b) => getRoundPriority(a[0]) - getRoundPriority(b[0]));
  })();
  const winnersGroups = roundGroups.filter(([n]) => { const nl = n.toLowerCase(); return nl.includes('winners') && !nl.includes('grand'); });
  const losersGroups  = roundGroups.filter(([n]) => { const nl = n.toLowerCase(); return nl.includes('losers'); });
  const finalGroups   = roundGroups.filter(([n]) => { const nl = n.toLowerCase(); return nl.includes('grand'); });
  const otherGroups   = roundGroups.filter(([n]) => { const nl = n.toLowerCase(); return !nl.includes('winners') && !nl.includes('losers') && !nl.includes('grand'); });
  const allFinals = [...finalGroups, ...otherGroups];
  const maxWL = Math.max(winnersGroups.length, losersGroups.length, 1);
  const totalBracketCols = maxWL + allFinals.length;

  return (
    <>
      <Head><title>Panel Torneo — Admin</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0B0B12;font-family:'Outfit',sans-serif}
        @keyframes spin{to{transform:rotate(360deg)}}
        .bset{transition:transform .14s,box-shadow .14s,opacity .14s;cursor:grab;user-select:none}
        .bset:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.45)}
        .bset.dragging{opacity:.3;transform:scale(.95);cursor:grabbing}
        .sdrop{transition:border-color .14s,background .14s,transform .12s}
        .sdrop.hovered{border-color:rgba(255,140,0,0.55)!important;background:rgba(255,140,0,0.06)!important;transform:scale(1.01)}
        .btn-disabled{opacity:.35;cursor:not-allowed}
        @media(max-width:900px){.setups-grid{grid-template-columns:1fr 1fr!important}}
        @media(max-width:560px){.setups-grid{grid-template-columns:1fr!important}}
        /* === Mobile layout === */
        .mobile-tabs{display:none}
        @media(max-width:768px){
          .mobile-tabs{display:flex!important;position:fixed;bottom:0;left:0;right:0;z-index:50;background:rgba(11,11,18,0.97);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid rgba(255,255,255,0.09);padding:10px 14px;gap:10px;padding-bottom:max(10px,env(safe-area-inset-bottom))}
          .panel-body{flex-direction:column!important;padding:8px 10px 80px!important;gap:10px!important;align-items:stretch!important}
          .panel-left{max-width:100%!important;flex:none!important;width:100%!important}
          .panel-right{width:100%!important}
          .panel-left.mobile-hidden,.panel-right.mobile-hidden{display:none!important}
          .header-inner{padding:8px 12px!important;gap:5px!important}
          .header-actions{gap:4px!important;flex-wrap:nowrap!important;overflow-x:auto}
          .header-actions>*{flex-shrink:0!important}
          .panel-subtitle{display:none!important}
          .btn-text-collapse{display:none!important}
          .assign-dropdown-wrap{display:block!important}
        }
        @media(min-width:769px){
          .assign-dropdown-wrap{display:none!important}
          .panel-outer{height:100vh!important;overflow:hidden!important}
          .panel-body{min-height:0!important;overflow:hidden!important}
          .panel-right{min-height:0!important;overflow:hidden!important}
          .panel-left{min-height:0!important;overflow-y:auto!important}
        }
      `}</style>

      <div className="panel-outer" style={{ minHeight: '100vh', background: '#0B0B12', color: '#fff', fontFamily: "'Outfit', sans-serif", display: 'flex', flexDirection: 'column' }}>

        {/* ── HEADER ── */}
        <div className="header-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: 'rgba(11,11,18,0.96)', backdropFilter: 'blur(14px)', zIndex: 40, gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Flecha volver */}
            <a href="/?panel=1" title="Volver al panel de comunidades" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: 16, textDecoration: 'none', flexShrink: 0, lineHeight: 1 }}>←</a>
            {/* Logo comunidad */}
            {COMMUNITY_META[community]?.logo && (
              <img src={COMMUNITY_META[community].logo} alt={COMMUNITY_META[community].name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'contain', flexShrink: 0, background: 'rgba(255,255,255,0.04)' }} />
            )}
            <div>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 15, letterSpacing: '-0.3px', lineHeight: 1.2, color: '#fff' }}>{tournament?.name || (selectedSlug ? 'Cargando...' : 'Sin torneo')}</p>
              <p className="panel-subtitle" style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{COMMUNITY_META[community]?.name || community} · {SETUPS.length} setups · {phaseName || 'Bracket'}</p>
            </div>
          </div>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={openTourPicker} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', border: 'none', color: '#fff', borderRadius: 9, padding: '8px 16px', fontWeight: 800, fontSize: 12, fontFamily: "'Outfit',sans-serif", cursor: 'pointer', boxShadow: '0 2px 12px rgba(255,140,0,0.35)' }}>🔄 <span className="btn-text-collapse">Cambiar torneo</span></button>
            {selectedSlug && (
              <button onClick={closeTournament} title="Cerrar torneo seleccionado" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 9, cursor: 'pointer', fontSize: 16, fontWeight: 900, lineHeight: 1, flexShrink: 0 }}>✕</button>
            )}
            <button
              onClick={phaseStarted ? () => { setPhaseStarted(false); emitPanelState({ phaseStarted: false }); } : startPhase}
              disabled={startState === 'loading' || (!phaseStarted && !selectedPhaseGroupId)}
              title={phaseStarted ? 'Click para marcar como no iniciado' : 'Iniciá el torneo desde start.gg primero, luego click aquí para habilitar el drag en la app'}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: phaseStarted || startState === 'ok' ? 'rgba(34,197,94,0.14)' : startState === 'error' ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.12)',
                border: `1px solid ${phaseStarted || startState === 'ok' ? 'rgba(34,197,94,0.45)' : startState === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.35)'}`,
                color: phaseStarted || startState === 'ok' ? '#22C55E' : startState === 'error' ? '#F87171' : '#22C55E',
                borderRadius: 9, padding: '6px 12px', fontWeight: 700, fontSize: 11,
                fontFamily: "'Outfit',sans-serif",
                cursor: startState === 'loading' ? 'default' : 'pointer',
                opacity: 1,
              }}
            >
              {startState === 'loading' && <span style={{ width: 11, height: 11, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block', flexShrink: 0 }} />}
              {phaseStarted ? '✅ Iniciado' : startState === 'error' ? '❌ Error' : startState === 'loading' ? 'Iniciando...' : '🚀 Iniciar'}
            </button>
            {setupsPendingCall.length > 0 && (
              <button
                onClick={callAllAssigned}
                title={`Iniciar ${setupsPendingCall.length} match${setupsPendingCall.length > 1 ? 's' : ''} asignado${setupsPendingCall.length > 1 ? 's' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.45)', color: '#A5B4FC', borderRadius: 9, padding: '6px 12px', fontWeight: 700, fontSize: 11, fontFamily: "'Outfit',sans-serif", cursor: 'pointer' }}
              >
                🎮 <span className="btn-text-collapse">Iniciar matchs ({setupsPendingCall.length})</span>
              </button>
            )}
            {selectedSlug && (
              <button
                onClick={finishTournament}
                disabled={finishTourState === 'loading' || finishTourState === 'ok'}
                title="Marcar torneo como terminado en la página de torneos"
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: finishTourState === 'ok' ? 'rgba(107,114,128,0.18)' : finishTourState === 'error' ? 'rgba(239,68,68,0.14)' : 'rgba(107,114,128,0.12)', border: `1px solid ${finishTourState === 'ok' ? 'rgba(107,114,128,0.45)' : finishTourState === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(107,114,128,0.35)'}`, color: finishTourState === 'ok' ? '#9CA3AF' : finishTourState === 'error' ? '#F87171' : '#9CA3AF', borderRadius: 9, padding: '6px 12px', fontWeight: 700, fontSize: 11, fontFamily: "'Outfit',sans-serif", cursor: finishTourState === 'loading' || finishTourState === 'ok' ? 'default' : 'pointer' }}
              >
                {finishTourState === 'loading' && <span style={{ width: 11, height: 11, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block', flexShrink: 0 }} />}
                {finishTourState === 'ok' ? '✅ Finalizado' : finishTourState === 'error' ? '❌ Error' : finishTourState === 'loading' ? 'Guardando...' : '🏁 Finalizar'}
              </button>
            )}
            <button onClick={notifyTournament} disabled={notifyState === 'loading'} style={{ display: 'flex', alignItems: 'center', gap: 5, background: notifyState === 'ok' || notifyState === 'ok_no_new' ? 'rgba(34,197,94,0.14)' : notifyState === 'error' ? 'rgba(239,68,68,0.14)' : 'rgba(255,140,0,0.14)', border: `1px solid ${notifyState === 'ok' || notifyState === 'ok_no_new' ? 'rgba(34,197,94,0.35)' : notifyState === 'error' ? 'rgba(239,68,68,0.35)' : 'rgba(255,140,0,0.35)'}`, color: notifyState === 'ok' || notifyState === 'ok_no_new' ? '#22C55E' : notifyState === 'error' ? '#F87171' : '#FF8C00', borderRadius: 9, padding: '6px 12px', fontWeight: 700, fontSize: 11, fontFamily: "'Outfit',sans-serif", cursor: notifyState === 'loading' ? 'wait' : 'pointer' }}>
              {notifyState === 'loading' && <span style={{ width: 11, height: 11, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block', flexShrink: 0 }} />}
              {notifyState === 'ok' || notifyState === 'ok_no_new' ? '✅ Enviado' : notifyState === 'error' ? '❌ Error' : notifyState === 'loading' ? 'Enviando...' : '🔔 Notificar'}
            </button>
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button onClick={() => setDropdownOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '6px 11px', cursor: 'pointer', color: '#fff', fontFamily: "'Outfit',sans-serif" }}>
                {user?.avatar ? <img src={user.avatar} alt={user.name} style={{ width: 24, height: 24, borderRadius: '50%' }} /> : <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#374151' }} />}
                <span style={{ fontSize: 12, color: '#D1D5DB' }}>{user?.name}</span>
                <svg width={9} height={9} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {dropdownOpen && (
                <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 178, background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
                  <Link href="/?panel=1" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, color: '#D1D5DB', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }} onClick={() => setDropdownOpen(false)}>🎮 Panel Admin</Link>
                  <Link href="/admin/ghost-players" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, color: '#D1D5DB', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }} onClick={() => setDropdownOpen(false)}>👻 Ghost Players</Link>
                  <Link href="/home" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, color: '#D1D5DB', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }} onClick={() => setDropdownOpen(false)}>🏠 Home</Link>
                  <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, color: '#F87171', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'Outfit',sans-serif" }}>🚪 Salir</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 📋 TOAST DE AUTO-ACTIVACIÓN */}
        {queueNotification && (
          <div style={{
            position: 'fixed',
            top: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999,
            animation: 'slideDown 0.3s ease-out',
            background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(22,163,74,0.15))',
            border: '2px solid rgba(34,197,94,0.6)',
            borderRadius: 14,
            padding: '12px 20px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px rgba(52,211,153,0.25)'
          }}>
            <style>{`
              @keyframes slideDown {
                from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
              }
            `}</style>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff', fontSize: 13, fontWeight: 700 }}>
              <span style={{ fontSize: 18 }}>🎮</span>
              <span>Match activado: {queueNotification.message}</span>
            </div>
          </div>
        )}

        {/* 📋 TOAST DE ENCOLAMIENTO */}
        {queuedNotification && (
          <div style={{
            position: 'fixed',
            top: 120,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 999,
            animation: 'slideDown 0.3s ease-out',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.15))',
            border: '2px solid rgba(59,130,246,0.6)',
            borderRadius: 14,
            padding: '12px 20px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px rgba(96,165,250,0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#fff', fontSize: 13, fontWeight: 700 }}>
              <span style={{ fontSize: 18 }}>📋</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span>✅ Encolado en <span style={{ color: '#60A5FA', fontWeight: 900 }}>{queuedNotification.setupLabel}</span></span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{queuedNotification.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN BODY: izquierda setups + derecha bracket ── */}
        <div className="panel-body" style={{ display: 'flex', gap: 16, padding: '16px 20px 24px', alignItems: 'stretch', flex: 1, minHeight: 0 }}>

          {/* ◀ COLUMNA IZQUIERDA: Setups + Info torneo */}
          <div className={`panel-left${mobileTab !== 'setups' ? ' mobile-hidden' : ''}`} style={{ flex: '0 0 55%', maxWidth: '55%', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ── SETUPS GRID ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.16em', margin: 0 }}>Setups · arrastrá un match del bracket</p>
            {!tournamentStarted && bracketSets.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 800, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 99, padding: '2px 8px' }}>⚠ Iniciá el torneo para poder arrastrar matches</span>
            )}
          </div>
          <div className="setups-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {SETUPS.map(setup => {
              const assigned = assignedSets[setup.id];
              const isOver   = dragOverSetup === setup.id;
              return (
                <div
                  key={setup.id}
                  className={`sdrop${isOver ? ' hovered' : ''}`}
                  onDragOver={e => onDragOver(e, setup.id)}
                  onDragLeave={onDragLeave}
                  onDrop={e => onDrop(e, setup.id)}
                  style={{ background: '#0F0F1A', border: `1px solid ${assigned ? setup.color + '55' : 'rgba(255,255,255,0.06)'}`, borderRadius: 18, overflow: 'hidden', minHeight: 200 }}
                >
                  <div style={{ height: 3, background: `linear-gradient(90deg,${setup.color},${setup.color}55)` }} />
                  <div style={{ padding: '13px 15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: setup.color + '1E', border: `1px solid ${setup.color}3A`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{setup.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#fff' }}>{setup.label}</p>
                          {setupQueues[setup.id]?.count > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', background: '#EF4444', border: '1px solid #DC2626', borderRadius: 99, padding: '2px 8px', minWidth: 20, textAlign: 'center' }}>
                              📋 {setupQueues[setup.id].count}
                            </span>
                          )}
                        </div>
                        {(() => { const st = sessionStatuses[setup.id]; if (!st || !st.currentGame) return null; return <span style={{ fontSize: 8, fontWeight: 900, color: setup.color, background: setup.color + '1E', border: `1px solid ${setup.color}44`, borderRadius: 4, padding: '1px 6px', letterSpacing: '0.08em' }}>Game {st.currentGame} · {st.format || 'BO3'}</span>; })()}
                      </div>
                      {assigned && <button onClick={() => removeAssignment(setup.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>}
                    </div>
                    {assigned ? (
                      <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${setup.color}20`, borderRadius: 11, padding: '9px 11px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 8px' }}>
                          <p style={{ margin: 0, fontSize: 9, fontWeight: 900, color: setup.color, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{assigned.round}</p>
                        </div>
                        {(assigned.slots || []).map((slot, i) => {
                          const slotName = slot?.entrant?.name;
                          const status = sessionStatuses[setup.id];
                          const checked = assigned.sessionId && status
                            ? (status.checkIns || []).includes(slotName)
                            : false;
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: i < assigned.slots.length - 1 ? 5 : 0, background: checked ? 'rgba(34,197,94,0.08)' : 'transparent', borderRadius: 6, padding: checked ? '2px 5px' : 0, transition: 'all 0.2s' }}>
                              <div style={{ width: 17, height: 17, borderRadius: 5, background: checked ? 'rgba(34,197,94,0.25)' : setup.color + '20', border: `1px solid ${checked ? 'rgba(34,197,94,0.5)' : setup.color + '33'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: checked ? '#4ADE80' : setup.color, flexShrink: 0 }}>{checked ? '✓' : i + 1}</div>
                              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: checked ? '#4ADE80' : slotName ? '#fff' : 'rgba(255,255,255,0.28)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slotName || 'TBD'}</span>
                              {status && (status.score1 != null || status.score2 != null) && <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', flexShrink: 0, fontFamily: "'Outfit',sans-serif" }}>{i === 0 ? (status.score1 ?? 0) : (status.score2 ?? 0)}</span>}
                              {assigned.sessionId && status && !checked && !(status.score1 != null || status.score2 != null) && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>⏳</span>}
                              {slot?.entrant?.id && assigned.slots?.[i === 0 ? 1 : 0]?.entrant?.id && (
                                <button
                                  onClick={e => { e.stopPropagation(); dqPlayer(setup.id, i); }}
                                  disabled={dqingSetup === setup.id}
                                  title={`DQ a ${slotName}`}
                                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, padding: '1px 5px', fontSize: 8, fontWeight: 900, color: '#F87171', cursor: dqingSetup === setup.id ? 'wait' : 'pointer', flexShrink: 0, fontFamily: "'Outfit',sans-serif", lineHeight: 1.6 }}
                                >DQ</button>
                              )}
                            </div>
                          );
                        })}
                        {/* Zona inferior: BO3/BO5 + Iniciar  ó  Fase + Timer + Cancelar */}
                        {(matchTimers[setup.id] != null || elapsedTimers[setup.id] != null) ? (
                          <div style={{ marginTop: 10 }}>
                            {/* Fila estado + timer (misma posición que BO3/BO5) */}
                            <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                              {(() => {
                                const st = sessionStatuses[setup.id];
                                const PHASE_COLORS = { CHECKIN:'#FF8C00', RPS:'#A78BFA', CHARACTER_SELECT:'#818CF8', STAGE_BAN:'#EF4444', STAGE_SELECT:'#60A5FA', PLAYING:'#4ADE80', FINISHED:'#9CA3AF' };
                                const PHASE_LABEL  = { CHECKIN:'CHECK-IN', RPS:'RPS', CHARACTER_SELECT:'PERSONAJES', STAGE_BAN:'BANEANDO', STAGE_SELECT:'ELIGIENDO', PLAYING:'JUGANDO', FINISHED:'FINALIZADO' };
                                const phase = st?.phase || 'CHECKIN';
                                const col = PHASE_COLORS[phase] || setup.color;
                                const timerText = elapsedTimers[setup.id] != null
                                  ? `${Math.floor(elapsedTimers[setup.id]/60)}:${String(elapsedTimers[setup.id]%60).padStart(2,'0')}`
                                  : matchTimers[setup.id] != null
                                    ? `${Math.floor(matchTimers[setup.id]/60)}:${String(matchTimers[setup.id]%60).padStart(2,'0')}`
                                    : null;
                                const timerCol = elapsedTimers[setup.id] != null ? '#4ADE80' : '#FF8C00';
                                return (
                                  <>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px 0', fontSize: 10, fontWeight: 900, borderRadius: 7, border: `1px solid ${col}44`, background: col + '22', color: col, letterSpacing: '0.08em', fontFamily: "'Outfit',sans-serif" }}>
                                      {PHASE_LABEL[phase] || phase}
                                    </div>
                                    {timerText && (
                                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '5px 0', fontSize: 10, fontWeight: 900, borderRadius: 7, border: `1px solid ${timerCol}44`, background: timerCol + '18', color: timerCol, fontFamily: "'Outfit',sans-serif" }}>
                                        {elapsedTimers[setup.id] != null ? '⏱️' : '⏳'} {timerText}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            {/* Botón Cancelar (misma posición que Iniciar match) */}
                            <button
                              onClick={() => stopMatchTimer(setup.id)}
                              style={{ width: '100%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171', borderRadius: 8, padding: '8px 0', fontSize: 11, fontWeight: 900, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", letterSpacing: '0.04em' }}
                            >
                              ✕ Cancelar
                            </button>
                            {/* Links públicos del setup tablet (Mendoza, AFK) */}
                            {setup.id.endsWith('-tablet') && assigned?.banUrl1 && (
                              <div style={{ marginTop: 7, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <a href={assigned.banUrl1} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#A78BFA', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 7, padding: '5px 0', textDecoration: 'none' }}>
                                  📱 Player 1 →
                                </a>
                                <a href={assigned.banUrl2} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#A78BFA', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 7, padding: '5px 0', textDecoration: 'none' }}>
                                  📱 Player 2 →
                                </a>
                                <a href={community === 'mendoza' ? `/stream/mendoza/${assigned.sessionId}` : `/stream/${assigned.sessionId}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textAlign: 'center', fontSize: 10, fontWeight: 800, color: '#60A5FA', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 7, padding: '5px 0', textDecoration: 'none' }}>
                                  📺 Overlay OBS →
                                </a>
                              </div>
                            )}
                            {/* Live game info compacto */}
                            {(() => {
                              const st = sessionStatuses[setup.id];
                              if (!st || !st.currentGame) return null;
                              const hasDetails = st.char1 || st.char2 || st.selectedStage || (st.games||[]).length > 0;
                              if (!hasDetails) return null;
                              return (
                                <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '7px 9px' }}>
                                  {(st.char1 || st.char2) && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
                                      <span>P1: {st.char1 || '—'}</span>
                                      <span>P2: {st.char2 || '—'}</span>
                                    </div>
                                  )}
                                  {st.selectedStage && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>🗺️ {st.selectedStage}</div>}
                                  {(st.games || []).length > 0 && (
                                    <div style={{ marginTop: 5, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                      {st.games.map(g => (
                                        <div key={g.gameNum} style={{ display: 'flex', gap: 4, fontSize: 9, color: 'rgba(255,255,255,0.45)', alignItems: 'center' }}>
                                          <span style={{ color: setup.color, fontWeight: 800, flexShrink: 0 }}>G{g.gameNum}</span>
                                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.char1 || '?'} vs {g.char2 || '?'} · {g.stage || '—'}</span>
                                          <span style={{ color: '#4ADE80', fontWeight: 700, flexShrink: 0 }}>✓ {g.winnerName || '?'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div style={{ marginTop: 10 }}>
                            {/* Selector BO3 / BO5 */}
                            <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                              {['BO3','BO5'].map(fmt => (
                                <button
                                  key={fmt}
                                  onClick={() => setSetupFormats(prev => ({ ...prev, [setup.id]: fmt }))}
                                  style={{ flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 900, borderRadius: 7, border: `1px solid ${(setupFormats[setup.id]||'BO3') === fmt ? setup.color : 'rgba(255,255,255,0.1)'}`, background: (setupFormats[setup.id]||'BO3') === fmt ? setup.color + '22' : 'transparent', color: (setupFormats[setup.id]||'BO3') === fmt ? setup.color : 'rgba(255,255,255,0.35)', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}
                                >{fmt}</button>
                              ))}
                            </div>
                            <button
                              onClick={() => callMatch(setup.id)}
                              style={{ width: '100%', background: `linear-gradient(135deg,${setup.color},${setup.color}AA)`, border: 'none', color: '#fff', borderRadius: 8, padding: '8px 0', fontSize: 11, fontWeight: 900, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", letterSpacing: '0.04em', boxShadow: `0 2px 10px ${setup.color}44` }}
                            >
                              🎮 Iniciar match ({setupFormats[setup.id] || 'BO3'})
                            </button>

                            {/* 📋 COLA DEBAJO DEL BOTÓN (sin match activo) */}
                            {setupQueues[setup.id]?.items && setupQueues[setup.id].items.length > 0 && (
                              <div style={{ marginTop: 10 }}>
                                <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 900, color: setup.color, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                                  📋 EN ESPERA ({setupQueues[setup.id].count})
                                </p>
                                {setupQueues[setup.id].items.slice(0, 2).map((item, idx) => (
                                  <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, background: 'rgba(255,255,255,0.02)', border: `1px solid ${setup.color}18`, borderRadius: 8, padding: 8, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                                    <span style={{ fontWeight: 800, color: setup.color, background: setup.color + '22', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>#{idx + 1}</span>
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 9 }}>
                                      {item.player1?.name || '?'} vs {item.player2?.name || '?'}
                                    </span>
                                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{item.format}</span>
                                    <button
                                      onClick={() => {
                                        const { community } = parseSetupId(setup.id);
                                        if (panelSocketRef.current?.connected) {
                                          panelSocketRef.current.emit('dequeue-match', { setupId: setup.id, community, queueItemId: item.id });
                                        }
                                      }}
                                      style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', borderRadius: 4, padding: '1px 4px', fontSize: 8, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                                    >✕</button>
                                  </div>
                                ))}
                                {setupQueues[setup.id].count > 2 && (
                                  <p style={{ margin: '4px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>+{setupQueues[setup.id].count - 2} más...</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 📋 COLA CUANDO HAY MATCH ACTIVO - DEBAJO DEL MATCH INFO */}
                        {assigned && (matchTimers[setup.id] != null || elapsedTimers[setup.id] != null) && setupQueues[setup.id]?.items && setupQueues[setup.id].items.length > 0 && (
                          <div style={{ marginTop: 10 }}>
                            <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 900, color: setup.color, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                              📋 EN COLA ({setupQueues[setup.id].count})
                            </p>
                            {setupQueues[setup.id].items.slice(0, 2).map((item, idx) => (
                              <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, background: 'rgba(255,255,255,0.02)', border: `1px solid ${setup.color}18`, borderRadius: 8, padding: 8, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                                <span style={{ fontWeight: 800, color: setup.color, background: setup.color + '22', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>#{idx + 1}</span>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 9 }}>
                                  {item.player1?.name || '?'} vs {item.player2?.name || '?'}
                                </span>
                                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{item.format}</span>
                                <button
                                  onClick={() => {
                                    const { community } = parseSetupId(setup.id);
                                    if (panelSocketRef.current?.connected) {
                                      panelSocketRef.current.emit('dequeue-match', { setupId: setup.id, community, queueItemId: item.id });
                                    }
                                  }}
                                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', borderRadius: 4, padding: '1px 4px', fontSize: 8, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                                >✕</button>
                              </div>
                            ))}
                            {setupQueues[setup.id].count > 2 && (
                              <p style={{ margin: '4px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>+{setupQueues[setup.id].count - 2} más...</p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '12px 0' }}>
                        {setupQueues[setup.id]?.items && setupQueues[setup.id].items.length > 0 ? (
                          <div>
                            <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 900, color: setup.color, textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'center' }}>
                              📋 En cola ({setupQueues[setup.id].count})
                            </p>
                            {setupQueues[setup.id].items.slice(0, 2).map((item, idx) => (
                              <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, background: 'rgba(255,255,255,0.02)', border: `1px solid ${setup.color}18`, borderRadius: 8, padding: 8, fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>
                                <span style={{ fontWeight: 800, color: setup.color, background: setup.color + '22', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>#{idx + 1}</span>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.player1?.name || '?'} vs {item.player2?.name || '?'}</span>
                                <button
                                  onClick={() => { const { community } = parseSetupId(setup.id); if (panelSocketRef.current?.connected) panelSocketRef.current.emit('dequeue-match', { setupId: setup.id, community, queueItemId: item.id }); }}
                                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', borderRadius: 4, padding: '1px 4px', fontSize: 8, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                                >✕</button>
                              </div>
                            ))}
                            <button
                              onClick={() => activateNextQueued(setup.id)}
                              style={{ width: '100%', marginTop: 4, background: setup.color + '22', border: `1px solid ${setup.color}66`, color: setup.color, borderRadius: 8, padding: '9px 0', fontSize: 11, fontWeight: 900, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", letterSpacing: '0.04em' }}
                            >
                              ▶ Activar siguiente
                            </button>
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', padding: '8px 0' }}>
                            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.18)' }}>Sin match activo</p>
                            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.1)' }}>↓ Arrastrá un match</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
            </div>{/* /setups grid */}

            {/* ── TORNEO INFO STRIP ── */}
            <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '12px 18px', flexWrap: 'wrap' }}>
            {tournament?.image && <img src={tournament.image} alt="" style={{ width: 50, height: 50, borderRadius: 11, objectFit: 'cover', flexShrink: 0 }} />}
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontWeight: 900, fontSize: 15, color: '#fff' }}>{tournament?.name || 'Cargando...'}</p>
                <span style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.28)', color: '#22C55E', borderRadius: 99, padding: '2px 8px', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>{tournament?.stateLabel || '...'}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {startDate && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>📅 {startDate}</span>}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>👥 {(tournament?.attendees ?? entrants.length) || '—'} inscriptos{lastRefresh && <span style={{ marginLeft: 5, fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>⟳ {timeAgo(lastRefresh)}</span>}</span>
                {tournament?.owner && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>🏷️ {tournament.owner}</span>}
              </div>
            </div>
            <button onClick={() => setEntrantsOpen(v => !v)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 9, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", flexShrink: 0 }}>
              {entrantsOpen ? '▲ Lista' : `▼ ${entrants.length || tournament?.attendees || 0} inscriptos`}
            </button>
          </div>

          {/* Inscriptos grid (collapsible) */}
          {entrantsOpen && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 13, padding: '12px 16px', marginTop: 8 }}>
              {loadingEntrants && entrants.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>Cargando inscriptos...</p>
              ) : entrants.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>Sin inscriptos aún</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '5px 14px' }}>
                  {entrants.map((e, i) => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }}>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', fontWeight: 700, width: 18, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                      {e.avatar ? <img src={e.avatar} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} onError={ev => { ev.target.style.display = 'none'; }} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />}
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#D1D5DB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.tag || e.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
            </div>{/* /torneo info strip */}

          {/* ── SCOREBOARD MENDOZA (solo en /overlays/mendoza/control.html) ── */}
          {false && community === 'mendoza' && (() => {
            const sbStatusColor = mendozaSBStatus === 'ok' ? '#22C55E' : mendozaSBStatus === 'error' ? '#F87171' : mendozaSBStatus === 'saving' ? '#FBBF24' : 'rgba(255,255,255,0.25)';
            const sbStatusText  = mendozaSBStatus === 'ok' ? '✅ Overlay actualizado' : mendozaSBStatus === 'error' ? '❌ Error al actualizar' : mendozaSBStatus === 'saving' ? '⏳ Actualizando...' : '';
            const roundOptions = [
              { group: 'Winners', opts: ['Winners Round 1','Winners Round 2','Winners Round 3','Winners Quarters','Winners Semis','Winners Finals'] },
              { group: 'Losers',  opts: ['Losers Round 1','Losers Round 2','Losers Round 3','Losers Round 4','Losers Quarters','Losers Semis','Losers Finals'] },
              { group: 'Finals',  opts: ['Grand Finals','Grand Finals Reset'] },
              { group: 'Otros',   opts: ['Pools','Money Match','Friendlies'] },
            ];
            const isCustomRound = !roundOptions.flatMap(g => g.opts).includes(mendozaSB.round);

            function PlayerPanel({ pKey, borderColor }) {
              const p = mendozaSB[pKey];
              const skinCount = getSkinCount(p.character);
              return (
                <div style={{ flex: 1, background: '#1a1a2e', borderRadius: 12, padding: '14px', border: `2px solid ${borderColor}` }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <div style={{ flex: '0 0 90px' }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Tag</p>
                      <input
                        value={p.tag}
                        onChange={e => updateMendozaSBField({ [pKey]: { tag: e.target.value } }, true)}
                        placeholder="ANX"
                        style={{ width: '100%', background: '#12121f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '7px 9px', color: '#fff', fontSize: 12, fontFamily: "'Outfit',sans-serif", outline: 'none' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Nombre</p>
                      <input
                        value={p.name}
                        onChange={e => updateMendozaSBField({ [pKey]: { name: e.target.value } }, true)}
                        placeholder="Jugador"
                        style={{ width: '100%', background: '#12121f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '7px 9px', color: '#fff', fontSize: 12, fontFamily: "'Outfit',sans-serif", outline: 'none' }}
                      />
                    </div>
                  </div>
                  {/* Score */}
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Score</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
                    <button
                      onClick={() => updateMendozaSBField({ [pKey]: { score: Math.max(0, p.score - 1) } })}
                      style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', background: '#1e1e35', color: '#fff', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit',sans-serif" }}
                    >−</button>
                    <span style={{ fontSize: 44, fontWeight: 900, color: borderColor, fontFamily: "'Impact','Arial Black',sans-serif", minWidth: 50, textAlign: 'center', lineHeight: 1 }}>{p.score}</span>
                    <button
                      onClick={() => updateMendozaSBField({ [pKey]: { score: p.score + 1 } })}
                      style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', background: '#1e1e35', color: '#fff', fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit',sans-serif" }}
                    >+</button>
                  </div>
                  {/* Personaje */}
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Personaje</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#12121f', border: '2px solid rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={getStockIconPath(p.character, p.skin) || ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <select
                      value={p.character}
                      onChange={e => updateMendozaSBField({ [pKey]: { character: e.target.value, skin: 1 } })}
                      style={{ flex: 1, background: '#12121f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '7px 9px', color: '#fff', fontSize: 12, fontFamily: "'Outfit',sans-serif", outline: 'none', cursor: 'pointer' }}
                    >
                      {CHARACTERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  {/* Skin grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 3 }}>
                    {Array.from({ length: skinCount }, (_, i) => i + 1).map(skinNum => (
                      <button
                        key={skinNum}
                        onClick={() => updateMendozaSBField({ [pKey]: { skin: skinNum } })}
                        style={{ aspectRatio: '1', borderRadius: 6, border: `2px solid ${p.skin === skinNum ? '#ffd700' : 'rgba(255,255,255,0.1)'}`, background: '#12121f', cursor: 'pointer', overflow: 'hidden', padding: 2, boxShadow: p.skin === skinNum ? '0 0 6px rgba(255,215,0,0.35)' : 'none' }}
                      >
                        <img src={getStockIconPath(p.character, skinNum) || ''} alt={`Skin ${skinNum}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div style={{ marginTop: 12, background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 16, overflow: 'hidden' }}>
                {/* Header colapsable */}
                <button
                  onClick={() => setMendozaSBOpen(v => !v)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15 }}>🎮</span>
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#A78BFA' }}>Scoreboard Stream</span>
                    <a
                      href="/stream/mendoza/scoreboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: 9, fontWeight: 700, color: '#8B5CF6', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 6, padding: '2px 7px', textDecoration: 'none' }}
                    >
                      Ver overlay →
                    </a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {sbStatusText && <span style={{ fontSize: 11, color: sbStatusColor, fontWeight: 600 }}>{sbStatusText}</span>}
                    <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.3)' }}>{mendozaSBOpen ? '▾' : '▸'}</span>
                  </div>
                </button>

                {mendozaSBOpen && (
                  <div style={{ padding: '0 16px 16px' }}>
                    {/* Ronda */}
                    <div style={{ background: '#1a1a2e', borderRadius: 12, padding: '12px 14px', marginBottom: 12, border: '2px solid rgba(255,215,0,0.2)' }}>
                      <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,215,0,0.7)', textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 8 }}>⚡ Ronda</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end' }}>
                        <div>
                          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Tipo</p>
                          <select
                            value={isCustomRound ? '__custom__' : mendozaSB.round}
                            onChange={e => {
                              if (e.target.value !== '__custom__') updateMendozaSBField({ round: e.target.value });
                              else updateMendozaSBField({ round: '' });
                            }}
                            style={{ width: '100%', background: '#12121f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '7px 9px', color: '#fff', fontSize: 12, fontFamily: "'Outfit',sans-serif", outline: 'none', cursor: 'pointer' }}
                          >
                            {roundOptions.map(g => (
                              <optgroup key={g.group} label={g.group}>
                                {g.opts.map(o => <option key={o} value={o}>{o}</option>)}
                              </optgroup>
                            ))}
                            <option value="__custom__">✏️ Personalizado...</option>
                          </select>
                        </div>
                        <div>
                          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Formato</p>
                          <select
                            value={mendozaSB.format}
                            onChange={e => updateMendozaSBField({ format: e.target.value })}
                            style={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '7px 9px', color: '#fff', fontSize: 12, fontFamily: "'Outfit',sans-serif", outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="">Sin formato</option>
                            <option value="BO3">BO3</option>
                            <option value="BO5">BO5</option>
                            <option value="BO7">BO7</option>
                          </select>
                        </div>
                        <div>
                          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Personalizado</p>
                          <input
                            value={isCustomRound ? mendozaSB.round : ''}
                            disabled={!isCustomRound}
                            onChange={e => updateMendozaSBField({ round: e.target.value }, true)}
                            placeholder="Nombre de ronda..."
                            style={{ width: '100%', background: isCustomRound ? '#12121f' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '7px 9px', color: isCustomRound ? '#fff' : 'rgba(255,255,255,0.2)', fontSize: 12, fontFamily: "'Outfit',sans-serif", outline: 'none' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Players */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'start' }}>
                      <PlayerPanel pKey="player1" borderColor="#c93545" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16 }}>
                        <button
                          onClick={() => updateMendozaSBField({ player1: mendozaSB.player2, player2: mendozaSB.player1 })}
                          title="Intercambiar jugadores"
                          style={{ background: '#2a2a50', color: '#ffd700', border: '2px solid #ffd700', borderRadius: 9, padding: '8px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", whiteSpace: 'nowrap' }}
                        >⇄ Swap</button>
                        <button
                          onClick={() => updateMendozaSBField({ player1: { ...mendozaSB.player1, score: 0 }, player2: { ...mendozaSB.player2, score: 0 } })}
                          title="Resetear scores a 0"
                          style={{ background: '#2a2a50', color: '#ff6b6b', border: '2px solid #ff6b6b', borderRadius: 9, padding: '8px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", whiteSpace: 'nowrap' }}
                        >↺ Reset</button>
                      </div>
                      <PlayerPanel pKey="player2" borderColor="#2a6dd4" />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          </div>{/* /columna izquierda */}

          {/* ▶ COLUMNA DERECHA: Bracket */}
          <div className={`panel-right${mobileTab !== 'bracket' ? ' mobile-hidden' : ''}`} style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {/* ── BRACKET POR RONDAS ── */}
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{ fontWeight: 900, fontSize: 18, color: '#fff', marginBottom: 3 }}>🎯 Bracket{phaseName ? ` — ${phaseName}` : ''}</h2>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                Arrastrá matches a los setups de arriba ·{' '}
                <span style={{ color: '#60A5FA' }}>{pendingSets.length} pendientes</span> ·{' '}
                <span style={{ color: '#22C55E' }}>{bracketSets.filter(s => s.stateLabel === 'ACTIVE').length} activos</span> ·{' '}
                <span style={{ color: '#6B7280' }}>{completedSets.length} completados</span>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {allPhaseGroups.length > 1 && (
                <select
                  value={selectedPhaseGroupId}
                  onChange={e => switchPool(e.target.value)}
                  style={{ background: '#12131f', border: '1px solid rgba(255,140,0,0.45)', borderRadius: 9, padding: '6px 10px', color: '#FF8C00', fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none', fontFamily: "'Outfit',sans-serif", maxWidth: 200 }}
                >
                  {allPhaseGroups.map(pg => (
                    <option key={pg.id} value={pg.id}>{pg.phaseName && pg.phaseName !== pg.label ? `${pg.phaseName} ` : ''}{pg.label}</option>
                  ))}
                </select>
              )}
              <a href={selectedBracketUrl || `https://www.start.gg/${selectedSlug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#FF8C00', textDecoration: 'none', fontWeight: 700, flexShrink: 0 }}>Ver en start.gg →</a>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', borderRadius: 16, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px' }}>
            {bracketLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '40px 0' }}>
                <div style={{ width: 22, height: 22, border: '2px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                Cargando bracket desde start.gg...
              </div>
            ) : bracketSets.length === 0 ? (
              <div style={{ padding: '44px 24px', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>No se encontraron sets en este bracket.</p>
              </div>
            ) : (
              <TournamentBracket
                bracketSets={bracketSets}
                assignedSets={assignedSets}
                draggedSet={draggedSet}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                TEST_SETUPS={SETUPS}
                SET_STATE_STYLE={SET_STATE_STYLE}
                lockedSets={lockedSets}
                toggleLock={toggleLock}
                onAssignToSetup={assignToSetupDirectly}
                tournamentStarted={tournamentStarted}
                onResultSaved={() => refreshBracket(true)}
                queuedMatches={queuedMatches}
                getQueueKey={getQueueKey}
              />
            )}
          </div>{/* bracket content */}

          {/* ── LOG DE REPORTES START.GG ── */}
          {reportLog.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 16px', marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Actividad Start.gg
                </h3>
                <button onClick={() => setReportLog([])} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: "'Outfit', sans-serif" }}>
                  limpiar
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 140, overflowY: 'auto' }}>
                {reportLog.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 12 }}>
                    <span style={{ color: entry.called ? '#FBBF24' : '#22C55E', flexShrink: 0 }}>
                      {entry.called ? '📢' : '✅'}
                    </span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>{entry.players}</span>
                    {entry.round && <span style={{ color: 'rgba(255,255,255,0.35)', marginLeft: 2 }}>{entry.round}</span>}
                    {entry.score && !entry.called && <span style={{ color: '#22C55E', marginLeft: 4, fontWeight: 700 }}>{entry.score}</span>}
                    <span style={{ color: 'rgba(255,255,255,0.18)', marginLeft: 'auto', fontSize: 10, flexShrink: 0 }}>
                      {entry.time?.toLocaleTimeString?.() || ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>{/* bracket outer */}
          </div>{/* /columna derecha */}
        </div>{/* /main body */}

        {/* ── TORNEOS EN LA APP (solo panel principal) ── */}
        {community === 'test' && <div style={{ margin: '20px 0 8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
          <button
            onClick={() => setFeaturedOpen(p => !p)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
          >
            <span style={{ fontWeight: 800, fontSize: 13, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>📌 Torneos en la app{featuredTours.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,140,0,0.2)', color: '#FF8C00', padding: '2px 7px', borderRadius: 6 }}>{featuredTours.length}</span>}</span>
            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)' }}>{featuredOpen ? '▾' : '▸'}</span>
          </button>
          {featuredOpen && (
            <div style={{ padding: '0 18px 18px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                Agregá torneos manualmente para que aparezcan en la app de los jugadores. Al agregar uno se envía una notificación push a todos los usuarios.
              </p>
              {/* Input agregar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  value={featuredInput}
                  onChange={e => setFeaturedInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addFeaturedTournament(); }}
                  placeholder="start.gg/tournament/mi-torneo"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 13, fontFamily: "'Outfit', sans-serif", outline: 'none' }}
                />
                <button
                  onClick={addFeaturedTournament}
                  disabled={featuredAdding || !featuredInput.trim()}
                  style={{ background: '#FF8C00', border: 'none', borderRadius: 10, padding: '9px 16px', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0, opacity: featuredAdding || !featuredInput.trim() ? 0.5 : 1, fontFamily: "'Outfit', sans-serif" }}
                >
                  {featuredAdding ? '...' : '+ Agregar'}
                </button>
              </div>
              {/* Lista */}
              {featuredLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                  <div style={{ width: 16, height: 16, border: '2px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Cargando...
                </div>
              ) : featuredTours.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '12px 0' }}>No hay torneos destacados todavía.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {featuredTours.map(t => (
                    <div key={t.slug} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {t.image && <img src={t.image} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                            {t.startAt ? new Date(t.startAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha'}
                            {t.attendees > 0 ? ` · 👥 ${t.attendees}` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => notifyFeaturedTournament(t.slug)}
                          title="Enviar notificación push"
                          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '5px 9px', color: '#a5b4fc', cursor: 'pointer', fontSize: 13, fontWeight: 700, flexShrink: 0, fontFamily: "'Outfit', sans-serif" }}
                        >🔔</button>
                        <button
                          onClick={() => removeFeaturedTournament(t.slug)}
                          title="Quitar de la app"
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '5px 10px', color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0, fontFamily: "'Outfit', sans-serif" }}
                        >✕</button>
                      </div>
                      {/* Estado del torneo */}
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {[{s:1,l:'Creado',c:'#9CA3AF'},{s:2,l:'En curso',c:'#FF8C00'},{s:3,l:'Finalizado',c:'#22C55E'}].map(o => {
                          const active = t.state === o.s;
                          return (
                            <button key={o.s} onClick={() => { if (!active) changeTournamentState(t.slug, o.s); }}
                              style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6, cursor: active ? 'default' : 'pointer', border: `1px solid ${active ? o.c : 'rgba(255,255,255,0.1)'}`, background: active ? o.c + '22' : 'rgba(255,255,255,0.03)', color: active ? o.c : 'rgba(255,255,255,0.35)', fontFamily: "'Outfit',sans-serif" }}
                            >{o.l}</button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>}

        {/* ── Mobile Tab Bar ── */}
        <div className="mobile-tabs">
          <button
            onClick={() => setMobileTab('setups')}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: mobileTab === 'setups' ? 'rgba(255,140,0,0.1)' : 'transparent', border: `1px solid ${mobileTab === 'setups' ? 'rgba(255,140,0,0.45)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '8px 0', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all .15s' }}
          >
            <span style={{ fontSize: 22 }}>🎮</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: mobileTab === 'setups' ? '#FF8C00' : 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>SETUPS</span>
          </button>
          <button
            onClick={() => setMobileTab('bracket')}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: mobileTab === 'bracket' ? 'rgba(96,165,250,0.1)' : 'transparent', border: `1px solid ${mobileTab === 'bracket' ? 'rgba(96,165,250,0.45)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 14, padding: '8px 0', cursor: 'pointer', fontFamily: "'Outfit',sans-serif", transition: 'all .15s' }}
          >
            <span style={{ fontSize: 22 }}>🏆</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: mobileTab === 'bracket' ? '#60A5FA' : 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>BRACKET</span>
          </button>
        </div>

        {/* ── MODAL SELECTOR DE TORNEO ── */}
        {tourPickerOpen && (
          <div onClick={() => setTourPickerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, width: '100%', maxWidth: 460, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                {pickTour ? (
                  <button onClick={() => { setPickTour(null); setPickPhases(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>← Volver</button>
                ) : (
                  <h3 style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#fff' }}>🔄 Elegir torneo</h3>
                )}
                <button onClick={() => setTourPickerOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {!pickTour ? (
                  <>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Slug manual</p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                      <input value={slugInput} onChange={e => { setSlugInput(e.target.value); setPickTourPreview(null); }} onKeyDown={e => { if (e.key === 'Enter' && slugInput.trim()) previewSlugTournament(slugInput); }} placeholder="start.gg/tournament/mi-torneo" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 13, fontFamily: "'Outfit', sans-serif", outline: 'none' }} />
                      <button onClick={() => { if (slugInput.trim()) previewSlugTournament(slugInput); }} disabled={loadingPickTourPreview} style={{ background: '#FF8C00', border: 'none', borderRadius: 10, padding: '9px 16px', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', flexShrink: 0, opacity: loadingPickTourPreview ? 0.6 : 1 }}>→</button>
                    </div>

                    {/* ── Preview del torneo ingresado manualmente ── */}
                    {loadingPickTourPreview && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: '10px 0', marginBottom: 16 }}>
                        <div style={{ width: 18, height: 18, border: '2px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                        Buscando torneo...
                      </div>
                    )}
                    {!loadingPickTourPreview && pickTourPreview && (
                      pickTourPreview._error ? (
                        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: 'rgba(255,120,120,0.9)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          ⚠️ {pickTourPreview._error}
                        </div>
                      ) : (
                        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,140,0,0.3)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
                          {pickTourPreview.image && (
                            <img src={pickTourPreview.image} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                          )}
                          <div style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', flex: 1 }}>{pickTourPreview.name}</p>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6, background: pickTourPreview.registrationOpen ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)', color: pickTourPreview.registrationOpen ? '#4ade80' : 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                                {pickTourPreview.registrationOpen ? '🟢 inscripciones abiertas' : pickTourPreview.stateLabel}
                              </span>
                            </div>
                            {pickTourPreview.startAt && (
                              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                                📅 {new Date(pickTourPreview.startAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {pickTourPreview.attendees > 0 ? ` · 👥 ${pickTourPreview.attendees} inscriptos` : ''}
                              </p>
                            )}
                            {(pickTourPreview.events || []).length > 0 && (
                              <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                                {pickTourPreview.events.map(e => `${e.name}${e.entrants > 0 ? ` (${e.entrants})` : ''}`).join(' · ')}
                              </p>
                            )}
                            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                              <button
                                onClick={() => selectPickTournament({ slug: pickTourPreview._slug, name: pickTourPreview.name })}
                                style={{ flex: 1, background: '#FF8C00', border: 'none', borderRadius: 10, padding: '10px 0', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                              >
                                Ver fases →
                              </button>
                              {!savedSlugs.includes(pickTourPreview._slug) && (
                                <button
                                  disabled={savingSlug}
                                  onClick={async () => {
                                    if (savingSlug) return;
                                    setSavingSlug(true);
                                    try {
                                      const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'afk-admin-2025';
                                      const r = await fetch('/api/tournaments/saved-slugs', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_SECRET}` },
                                        body: JSON.stringify({ community, slug: pickTourPreview._slug }),
                                      });
                                      const d = await r.json();
                                      if (d.slugs) {
                                        setSavedSlugs(d.slugs);
                                        setPickTournaments(prev => {
                                          if (prev.some(t => t.slug === pickTourPreview._slug)) return prev;
                                          return [...prev, { ...pickTourPreview, slug: pickTourPreview._slug, attendees: pickTourPreview.attendees ?? 0, _saved: true }];
                                        });
                                      }
                                    } catch {}
                                    finally { setSavingSlug(false); }
                                  }}
                                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 10, padding: '10px 14px', color: '#4ade80', fontWeight: 700, fontSize: 13, cursor: savingSlug ? 'default' : 'pointer', fontFamily: "'Outfit', sans-serif", opacity: savingSlug ? 0.6 : 1, flexShrink: 0 }}
                                >
                                  💾
                                </button>
                              )}
                              {savedSlugs.includes(pickTourPreview._slug) && (
                                <span style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', fontSize: 12, color: '#4ade80', fontWeight: 700 }}>✓ Guardado</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )}

                    {loadingPickTours ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '20px 0' }}>
                        <div style={{ width: 18, height: 18, border: '2px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                        Buscando torneos...
                      </div>
                    ) : (
                      <>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Tus torneos</p>
                        {pickTournaments.length === 0 ? (
                          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '20px 0' }}>No se encontraron torneos</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {pickTournaments.map(t => (
                              <div key={t.id || t.slug} style={{ display: 'flex', alignItems: 'stretch', gap: 0, borderRadius: 14, overflow: 'hidden', border: `1px solid ${selectedSlug === t.slug ? 'rgba(255,140,0,0.3)' : t._saved ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                                <button onClick={() => selectPickTournament(t)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: selectedSlug === t.slug ? 'rgba(255,140,0,0.1)' : t._saved ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.03)', border: 'none', padding: '12px 14px', cursor: 'pointer', textAlign: 'left', flex: 1, fontFamily: "'Outfit', sans-serif" }}>
                                  {t.image && <img src={t.image} alt="" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                                      {t._current && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 5, flexShrink: 0 }}>activo</span>}
                                      {t._saved && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', background: 'rgba(34,197,94,0.1)', color: 'rgba(74,222,128,0.7)', borderRadius: 5, flexShrink: 0 }}>guardado</span>}
                                      {(t.state === 3 || t.state === 'COMPLETED') && !t._current && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', background: 'rgba(107,114,128,0.15)', color: '#9CA3AF', border: '1px solid rgba(107,114,128,0.3)', borderRadius: 5, flexShrink: 0 }}>terminado</span>}
                                    </div>
                                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>👥 {t.attendees || 0} inscriptos · {t.slug}</p>
                                  </div>
                                  <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>›</span>
                                </button>
                                {t._saved && (
                                  <button
                                    title="Quitar de Mis torneos"
                                    onClick={async () => {
                                      const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || 'afk-admin-2025';
                                      try {
                                        const r = await fetch('/api/tournaments/saved-slugs', {
                                          method: 'DELETE',
                                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ADMIN_SECRET}` },
                                          body: JSON.stringify({ community, slug: t.slug }),
                                        });
                                        const d = await r.json();
                                        if (d.slugs) {
                                          setSavedSlugs(d.slugs);
                                          setPickTournaments(prev => prev.filter(p => !(p.slug === t.slug && p._saved)));
                                        }
                                      } catch {}
                                    }}
                                    style={{ background: 'rgba(239,68,68,0.08)', border: 'none', borderLeft: '1px solid rgba(239,68,68,0.15)', padding: '0 14px', cursor: 'pointer', color: 'rgba(239,68,68,0.7)', fontSize: 16, fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: '#fff' }}>{pickPhases?.name || pickTour.name}</p>
                    {loadingPickPhases ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '20px 0' }}>
                        <div style={{ width: 18, height: 18, border: '2px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                        Cargando fases...
                      </div>
                    ) : !pickPhases?.events?.length ? (
                      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '20px 0' }}>No se encontraron eventos</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {pickPhases.events.map(ev => (
                          <div key={ev.id}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>{ev.name} · {ev.entrants} jugadores</p>
                            {(ev.phases || []).map(ph => (
                              <div key={ph.id} style={{ marginBottom: 10 }}>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 6, paddingLeft: 4 }}>{ph.name} · {ph.bracketType}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 8 }}>
                                  {(ph.phaseGroups || []).map(pg => (
                                    <button key={pg.id} onClick={() => confirmPhaseGroup(pickTour.slug, pg.id, ev.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: selectedPhaseGroupId === String(pg.id) ? 'rgba(255,140,0,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${selectedPhaseGroupId === String(pg.id) ? 'rgba(255,140,0,0.45)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 11, padding: '10px 14px', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: "'Outfit', sans-serif" }}>
                                      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Pool {pg.label}</span>
                                      <span style={{ fontSize: 11, color: selectedPhaseGroupId === String(pg.id) ? '#FF8C00' : 'rgba(255,255,255,0.3)' }}>{selectedPhaseGroupId === String(pg.id) ? '✓ activo' : `ID: ${pg.id}`}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
