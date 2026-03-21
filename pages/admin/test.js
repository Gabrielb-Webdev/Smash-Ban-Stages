import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getStoredUser, logout, verifySession } from '../../src/utils/auth';
import dynamic from 'next/dynamic';

const TournamentBracket = dynamic(
  () => import('../../src/components/TournamentBracket'),
  { ssr: false }
);

const TEST_SETUPS = [
  { id: 'test-stream', label: 'Stream',  icon: '📡', color: '#DC2626' },
  { id: 'test-1',     label: 'Setup 1', icon: '🎮', color: '#7C3AED' },
  { id: 'test-2',     label: 'Setup 2', icon: '🎮', color: '#2563EB' },
  { id: 'test-3',     label: 'Setup 3', icon: '🎮', color: '#059669' },
  { id: 'test-4',     label: 'Setup 4', icon: '🎮', color: '#D97706' },
  { id: 'test-5',     label: 'Setup 5', icon: '🎮', color: '#DB2777' },
];

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
  const [user, setUser]               = useState(null);
  const [checking, setChecking]       = useState(true);
  const [tournament, setTournament]   = useState(null);
  const [bracketSets, setBracketSets] = useState([]);
  const [phaseName, setPhaseName]     = useState('');
  const [bracketLoading, setBracketLoading] = useState(false);
  const [assignedSets, setAssignedSets] = useState(() => {
    try {
      if (typeof window === 'undefined') return {};
      const saved = localStorage.getItem('afk_assignedSets');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [draggedSet, setDraggedSet]   = useState(null);
  const [dragOverSetup, setDragOverSetup] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Selección dinámica de torneo
  const [selectedSlug, setSelectedSlug]                     = useState(() => { try { return (typeof window !== 'undefined' && localStorage.getItem('afk_selectedSlug')) || 'tournament/asd3'; } catch { return 'tournament/asd3'; } });
  const [selectedPhaseGroupId, setSelectedPhaseGroupId]     = useState(() => { try { return (typeof window !== 'undefined' && localStorage.getItem('afk_selectedPhaseGroupId')) || '3244687'; } catch { return '3244687'; } });
  const [selectedBracketUrl, setSelectedBracketUrl]         = useState(() => { try { return (typeof window !== 'undefined' && localStorage.getItem('afk_selectedBracketUrl')) || ''; } catch { return ''; } });
  const [selectedEventId, setSelectedEventId]               = useState(() => { try { return (typeof window !== 'undefined' && localStorage.getItem('afk_selectedEventId')) || null; } catch { return null; } });

  // Tournament picker
  const [tourPickerOpen, setTourPickerOpen]         = useState(false);
  const [pickTournaments, setPickTournaments]       = useState([]);
  const [loadingPickTours, setLoadingPickTours]     = useState(false);
  const [pickTour, setPickTour]                     = useState(null);
  const [pickPhases, setPickPhases]                 = useState(null);
  const [loadingPickPhases, setLoadingPickPhases]   = useState(false);
  const [slugInput, setSlugInput]                   = useState('');

  // Inscriptos & refresh
  const [entrants, setEntrants]               = useState([]);
  const [entrantsOpen, setEntrantsOpen]       = useState(true);
  const [loadingEntrants, setLoadingEntrants] = useState(false);
  const [lastRefresh, setLastRefresh]         = useState(null);

  // Notificaciones
  const [notifyState, setNotifyState] = useState(null); // null | 'loading' | 'ok' | 'error'

  // Iniciar torneo
  const [startState, setStartState] = useState(null); // null | 'loading' | 'ok' | 'error'
  const [phaseStarted, setPhaseStarted] = useState(() => {
    try { return typeof window !== 'undefined' && localStorage.getItem('afk_phaseStarted') === '1'; } catch { return false; }
  });

  // Match call timers: { [setupId]: { secondsLeft, intervalId } }
  const [matchTimers, setMatchTimers] = useState({});
  const matchTimersRef = useRef({});

  // Elapsed timers tras check-in completo: { [setupId]: secondsElapsed }
  const [elapsedTimers, setElapsedTimers] = useState({});
  const elapsedTimersRef = useRef({});
  const checkedInSetups = useRef(new Set());
  const autoReleasedSetups = useRef(new Set());

  // Formato por setup (BO3 o BO5): { [setupId]: 'BO3'|'BO5' }
  const [setupFormats, setSetupFormats] = useState(() => {
    try { const s = localStorage.getItem('afk_setupFormats'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  // Check-in status: { [setupId]: { phase, checkIns: [], player1, player2 } }
  const [sessionStatuses, setSessionStatuses] = useState({});

  // Log de reportes Start.gg: [{ time, setId, players, type }]
  const [reportLog, setReportLog] = useState([]);
  const prevCompletedIdsRef = useRef(new Set());

  // --- Persistencia localStorage ---
  useEffect(() => {
    try { localStorage.setItem('afk_assignedSets', JSON.stringify(assignedSets)); } catch {}
  }, [assignedSets]);
  useEffect(() => {
    try { localStorage.setItem('afk_phaseStarted', phaseStarted ? '1' : ''); } catch {}
  }, [phaseStarted]);
  useEffect(() => { try { localStorage.setItem('afk_selectedSlug', selectedSlug); } catch {} }, [selectedSlug]);
  useEffect(() => { try { localStorage.setItem('afk_selectedPhaseGroupId', selectedPhaseGroupId); } catch {} }, [selectedPhaseGroupId]);
  useEffect(() => { try { if (selectedEventId) localStorage.setItem('afk_selectedEventId', selectedEventId); } catch {} }, [selectedEventId]);
  useEffect(() => { try { localStorage.setItem('afk_selectedBracketUrl', selectedBracketUrl); } catch {} }, [selectedBracketUrl]);
  useEffect(() => { try { localStorage.setItem('afk_setupFormats', JSON.stringify(setupFormats)); } catch {} }, [setupFormats]);

  // Restaurar timers activos tras F5
  useEffect(() => {
    Object.entries(assignedSets).forEach(([setupId, set]) => {
      if (!set?.timerStartedAt) return;
      const elapsed = Math.floor((Date.now() - set.timerStartedAt) / 1000);
      const remaining = 300 - elapsed;
      if (remaining <= 0) {
        setAssignedSets(prev => { const n = { ...prev }; delete n[setupId]; return n; });
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
          setAssignedSets(prev => { const n = { ...prev }; delete n[setupId]; return n; });
        }
      }, 1000);
      matchTimersRef.current[setupId].intervalId = iv;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Polling check-in de sesiones activas ---
  useEffect(() => {
    const active = Object.entries(assignedSets).filter(([, set]) => set?.sessionId);
    if (active.length === 0) { setSessionStatuses({}); return; }
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const poll = async () => {
      const updates = {};
      for (const [setupId, set] of active) {
        if (!set?.sessionId) continue;
        try {
          const r = await fetch(`${socketUrl}/session/${encodeURIComponent(set.sessionId)}`);
          if (r.ok) { const d = await r.json(); if (d.ok) updates[setupId] = d; }
        } catch {}
      }
      setSessionStatuses(prev => ({ ...prev, ...updates }));
      // Auto-liberar setup cuando la sesión termina (phase FINISHED)
      for (const [setupId, st] of Object.entries(updates)) {
        if (st.phase === 'FINISHED' && !autoReleasedSetups.current.has(setupId)) {
          autoReleasedSetups.current.add(setupId);
          setTimeout(() => {
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
      const hasAccess = data.isAdmin || data.adminCommunities?.includes('test');
      if (!hasAccess) { router.replace('/home'); return; }
      setUser(data.user);
      setChecking(false);
      // Re-registrar sesiones activas en el servidor WS (en caso de restart del servidor)
      try {
        const saved = localStorage.getItem('afk_assignedSets');
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

  useEffect(() => {
    if (checking || !selectedPhaseGroupId) return;
    setBracketLoading(true);
    setBracketSets([]);
    fetch(`/api/tournaments/bracket?phaseGroupId=${selectedPhaseGroupId}`)
      .then(r => r.json())
      .then(d => { if (d.sets) { setBracketSets(d.sets); setPhaseName(d.phaseName || ''); if (d.phaseGroupState >= 2) setPhaseStarted(true); } })
      .finally(() => setBracketLoading(false));
    // Polling automático del bracket cada 10 segundos
    const iv = setInterval(() => {
      fetch(`/api/tournaments/bracket?phaseGroupId=${selectedPhaseGroupId}`)
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
          }
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(iv);
  }, [checking, selectedPhaseGroupId]);

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

    // Notificar a todos los inscriptos
    const names = entrants.map(e => e.tag || e.name).filter(Boolean);
    if (names.length > 0) {
      fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserNames: names,
          title: '🏆 Torneo iniciado',
          body: `¡El torneo ${tournament?.name || ''} ha comenzado!`,
          setup: 'Torneo iniciado',
          sentBy: 'Admin',
          data: {},
        }),
      }).catch(() => {});
    }
  }

  function openTourPicker() {
    setTourPickerOpen(true);
    setPickTour(null);
    setPickPhases(null);
    setSlugInput('');
    setLoadingPickTours(true);
    fetch('/api/tournaments/sync-startgg')
      .then(r => r.json())
      .then(d => setPickTournaments(d.tournaments || []))
      .catch(() => {})
      .finally(() => setLoadingPickTours(false));
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
    setSelectedSlug(slug);
    setSelectedPhaseGroupId(pgIdStr);
    setSelectedEventId(evIdStr);
    setSelectedBracketUrl(`https://www.start.gg/${slug}`);
    setTournament(null);
    setBracketSets([]);
    setBracketLoading(true);   // mostrar spinner inmediatamente
    setAssignedSets({});
    setEntrants([]);
    setTourPickerOpen(false);
    setPickTour(null);
    setPickPhases(null);
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
  }

  const tournamentStarted = tournament?.state === 2 || phaseStarted;

  function onDragStart(set, e) {
    if (!tournamentStarted) { e.preventDefault(); return; }
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
    setAssignedSets(prev => {
      const next = { ...prev };
      for (const k of Object.keys(next)) { if (next[k]?.id === draggedSet.id) delete next[k]; }
      next[setupId] = draggedSet;
      return next;
    });
    setDraggedSet(null); setDragOverSetup(null);
  }
  function removeAssignment(setupId) {
    stopMatchTimer(setupId);
    setAssignedSets(prev => { const n = { ...prev }; delete n[setupId]; return n; });
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
    const sessionId = assignedSets[setupId]?.sessionId;
    const startggSetId = assignedSets[setupId]?.startggSetId;
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

  async function callMatch(setupId) {
    const set = assignedSets[setupId];
    if (!set) return;
    const players = (set.slots || []).map(s => s?.entrant?.name).filter(Boolean);
    const format = setupFormats[setupId] || 'BO3';
    const sessionId = `ban-${setupId.replace('test-', '')}-${Date.now().toString(36)}`;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://smash-ban-stages.vercel.app';
    const banUrl  = `${origin}/tablet/${sessionId}`;
    const banUrl1 = `${banUrl}?p=player1`;
    const banUrl2 = `${banUrl}?p=player2`;

    // Limpiar timers anteriores del mismo setup (si había un retry)
    stopMatchTimer(setupId);

    // IDs de start.gg del set seleccionado (para reportar resultados automáticamente)
    const startggSetId      = set.id;
    const startggEntrant1Id = set.slots?.[0]?.entrant?.id || null;
    const startggEntrant2Id = set.slots?.[1]?.entrant?.id || null;

    // Marcar el set como "en progreso" en start.gg
    if (startggSetId) {
      fetch('/api/tournaments/mark-set-called', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: startggSetId }),
      }).catch(() => {});
    }

    // Log local: match llamado
    setReportLog(prev => [{
      time: new Date(),
      setId: startggSetId,
      players: players.join(' vs '),
      round: set.fullRoundText || '',
      score: '— llamado',
      called: true,
    }, ...prev].slice(0, 20));

    // Pre-crear la sesión de baneos con los jugadores y datos start.gg
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
    try {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
      fetch(`${socketUrl}/session-meta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, startggSetId, startggEntrant1Id, startggEntrant2Id,
          player1: players[0] || 'Jugador 1',
          player2: players[1] || 'Jugador 2',
          format,
        }),
      });
    } catch {}

    // Guardar sessionId + datos startgg + timestamp en el state
    setAssignedSets(prev => ({ ...prev, [setupId]: { ...prev[setupId], sessionId, banUrl, banUrl1, banUrl2, startggSetId, startggEntrant1Id, startggEntrant2Id, timerStartedAt: Date.now() } }));

    // Notificar a cada jugador con su URL específica (para identificación automática sin login)
    const notifTitle = `📢 Match llamado — ${setupId.replace('test-', '').replace('stream', 'Stream')}`;
    const notifBody  = `${players.join(' vs ')} — ¡Tienen 5 min para hacer check-in!`;
    try {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
        body: JSON.stringify({ title: notifTitle, body: notifBody, targetUserNames: [players[0]].filter(Boolean), data: { url: banUrl1 } }),
      });
    } catch {}
    if (players[1]) {
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
          body: JSON.stringify({ title: notifTitle, body: notifBody, targetUserNames: [players[1]], data: { url: banUrl2 } }),
        });
      } catch {}
    }
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
        // Liberar setup automáticamente
        setAssignedSets(prev => { const n = { ...prev }; delete n[setupId]; return n; });
      }
    }, 1000);
    matchTimersRef.current[setupId].intervalId = iv;
  }

  const assignedSetIds = new Set(Object.values(assignedSets).filter(Boolean).map(s => s.id));
  const pendingSets    = bracketSets.filter(s => !assignedSetIds.has(s.id) && s.stateLabel !== 'COMPLETED' && s.stateLabel !== 'BYE');
  const completedSets  = bracketSets.filter(s => s.stateLabel === 'COMPLETED');

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

  function renderBracketCol(roundName, roundSets, ac) {
    const allDone  = roundSets.every(s => s.stateLabel === 'COMPLETED' || s.stateLabel === 'BYE');
    const anyActive = roundSets.some(s => s.stateLabel === 'ACTIVE' || s.stateLabel === 'CALLED');
    const pending  = roundSets.filter(s => s.stateLabel !== 'COMPLETED' && s.stateLabel !== 'BYE').length;
    const dotColor = allDone ? '#4B5563' : anyActive ? '#22C55E' : ac;
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '6px 10px', background: ac + '12', border: `1px solid ${ac}28`, borderRadius: 9 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: anyActive ? `0 0 7px ${dotColor}` : 'none' }} />
          <p style={{ margin: 0, flex: 1, fontSize: 10, fontWeight: 900, color: allDone ? 'rgba(255,255,255,0.25)' : ac, textTransform: 'uppercase', letterSpacing: '0.07em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roundName}</p>
          {pending > 0 && <span style={{ fontSize: 9, fontWeight: 800, color: ac, background: ac + '18', border: `1px solid ${ac}30`, borderRadius: 99, padding: '1px 6px', flexShrink: 0 }}>{pending}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {roundSets.map(set => {
            const sc = SET_STATE_STYLE[set.stateLabel] || SET_STATE_STYLE.CREATED;
            const isDone  = set.stateLabel === 'COMPLETED';
            const isBye   = set.stateLabel === 'BYE';
            const aSetup  = TEST_SETUPS.find(s => assignedSets[s.id]?.id === set.id);
            return (
              <div
                key={set.id}
                className={`bset${draggedSet?.id === set.id ? ' dragging' : ''}`}
                draggable={!isDone && !isBye}
                onDragStart={!isDone && !isBye ? e => onDragStart(set, e) : undefined}
                onDragEnd={!isDone && !isBye ? onDragEnd : undefined}
                style={{ background: isDone ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.045)', border: `1px solid ${aSetup ? aSetup.color + '55' : isDone ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.09)'}`, borderRadius: 12, overflow: 'hidden', opacity: isDone ? 0.55 : 1, cursor: isDone || isBye ? 'default' : 'grab' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 9px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text, borderRadius: 99, padding: '2px 7px', letterSpacing: '0.04em' }}>{set.stateLabel}</span>
                  {aSetup && <span style={{ fontSize: 9, fontWeight: 800, color: aSetup.color, background: aSetup.color + '18', border: `1px solid ${aSetup.color}44`, borderRadius: 99, padding: '2px 7px' }}>{aSetup.icon} {aSetup.label}</span>}
                </div>
                <div style={{ padding: '7px 9px' }}>
                  {(set.slots || []).map((slot, i) => {
                    const isWinner = isDone && slot?.placement === 1;
                    const isLoser  = isDone && slot?.placement === 2;
                    return (
                      <div key={i}>
                        {i === 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '5px 0' }}>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                            <span style={{ fontSize: 8, fontWeight: 900, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.14em' }}>VS</span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 15, height: 15, borderRadius: 4, background: isWinner ? ac + '25' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: isWinner ? ac : 'rgba(255,255,255,0.28)', flexShrink: 0 }}>{i + 1}</div>
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: isWinner ? '#fff' : isLoser ? 'rgba(255,255,255,0.28)' : (slot?.entrant ? '#E5E7EB' : 'rgba(255,255,255,0.22)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isLoser ? 'line-through' : 'none' }}>
                            {slot?.entrant?.name || 'TBD'}
                          </span>
                          {slot?.score != null && <span style={{ fontSize: 13, fontWeight: 900, color: isWinner ? '#4ADE80' : 'rgba(255,255,255,0.28)', flexShrink: 0, minWidth: 14, textAlign: 'right' }}>{slot.score}</span>}
                          {isWinner && <span style={{ fontSize: 10, flexShrink: 0 }}>🏆</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

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
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0B0B12', color: '#fff', fontFamily: "'Outfit', sans-serif", display: 'flex', flexDirection: 'column' }}>

        {/* ── HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, background: 'rgba(11,11,18,0.96)', backdropFilter: 'blur(14px)', zIndex: 40, gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17 }}>🏆</span>
            <div>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 15, letterSpacing: '-0.3px', lineHeight: 1.2, color: '#fff' }}>{tournament?.name || 'Panel Torneo'}</p>
              <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{TEST_SETUPS.length} setups · {phaseName || 'Bracket'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={openTourPicker} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', border: 'none', color: '#fff', borderRadius: 9, padding: '8px 16px', fontWeight: 800, fontSize: 12, fontFamily: "'Outfit',sans-serif", cursor: 'pointer', boxShadow: '0 2px 12px rgba(255,140,0,0.35)' }}>🔄 Cambiar torneo</button>
            <button
              onClick={startPhase}
              disabled={startState === 'loading' || !selectedPhaseGroupId || phaseStarted}
              title="Iniciá el torneo desde start.gg primero, luego click aquí para habilitar el drag en la app"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: phaseStarted || startState === 'ok' ? 'rgba(34,197,94,0.14)' : startState === 'error' ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.12)',
                border: `1px solid ${phaseStarted || startState === 'ok' ? 'rgba(34,197,94,0.45)' : startState === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.35)'}`,
                color: phaseStarted || startState === 'ok' ? '#22C55E' : startState === 'error' ? '#F87171' : '#22C55E',
                borderRadius: 9, padding: '6px 12px', fontWeight: 700, fontSize: 11,
                fontFamily: "'Outfit',sans-serif",
                cursor: phaseStarted || startState === 'loading' ? 'default' : 'pointer',
                opacity: phaseStarted ? 0.7 : 1,
              }}
            >
              {startState === 'loading' && <span style={{ width: 11, height: 11, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block', flexShrink: 0 }} />}
              {phaseStarted ? '✅ Iniciado' : startState === 'error' ? '❌ Error' : startState === 'loading' ? 'Iniciando...' : '🚀 Iniciar'}
            </button>
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
                  <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, color: '#D1D5DB', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }} onClick={() => setDropdownOpen(false)}>🎮 Panel Admin</Link>
                  <Link href="/home" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, color: '#D1D5DB', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }} onClick={() => setDropdownOpen(false)}>🏠 Home</Link>
                  <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', fontSize: 12, color: '#F87171', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: "'Outfit',sans-serif" }}>🚪 Salir</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── MAIN BODY: izquierda setups + derecha bracket ── */}
        <div style={{ display: 'flex', gap: 16, padding: '16px 20px 24px', alignItems: 'stretch', flex: 1 }}>

          {/* ◀ COLUMNA IZQUIERDA: Setups + Info torneo */}
          <div style={{ flex: '0 0 55%', maxWidth: '55%', display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ── SETUPS GRID ── */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <p style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.22)', textTransform: 'uppercase', letterSpacing: '0.16em', margin: 0 }}>Setups · arrastrá un match del bracket</p>
            {!tournamentStarted && bracketSets.length > 0 && (
              <span style={{ fontSize: 9, fontWeight: 800, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 99, padding: '2px 8px' }}>⚠ Iniciá el torneo para poder arrastrar matches</span>
            )}
          </div>
          <div className="setups-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {TEST_SETUPS.map(setup => {
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
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#fff' }}>{setup.label}</p>
                        {setup.id === 'test-stream' && <span style={{ fontSize: 8, fontWeight: 900, color: setup.color, background: setup.color + '1E', border: `1px solid ${setup.color}44`, borderRadius: 4, padding: '1px 6px', letterSpacing: '0.12em' }}>STREAM</span>}
                      </div>
                      {assigned && <button onClick={() => removeAssignment(setup.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 2px', flexShrink: 0 }}>×</button>}
                    </div>
                    {assigned ? (
                      <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${setup.color}20`, borderRadius: 11, padding: '9px 11px' }}>
                        <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 900, color: setup.color, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{assigned.round}</p>
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
                              {assigned.sessionId && status && !checked && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>⏳</span>}
                            </div>
                          );
                        })}
                        {/* Botón Iniciar match / countdown / ban link */}
                        {(matchTimers[setup.id] != null || elapsedTimers[setup.id] != null) ? (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: elapsedTimers[setup.id] != null ? 'rgba(34,197,94,0.08)' : 'rgba(255,140,0,0.08)', border: `1px solid ${elapsedTimers[setup.id] != null ? 'rgba(34,197,94,0.3)' : 'rgba(255,140,0,0.3)'}`, borderRadius: 8, padding: '7px 10px', marginBottom: 6 }}>
                              {elapsedTimers[setup.id] != null ? (
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#4ADE80', flex: 1 }}>⏱️ Jugando: {Math.floor(elapsedTimers[setup.id] / 60)}:{String(elapsedTimers[setup.id] % 60).padStart(2, '0')}</span>
                              ) : (
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#FF8C00', flex: 1 }}>⏳ Check-in: {Math.floor(matchTimers[setup.id] / 60)}:{String(matchTimers[setup.id] % 60).padStart(2, '0')}</span>
                              )}
                              <button onClick={() => stopMatchTimer(setup.id)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', borderRadius: 6, padding: '3px 8px', fontSize: 9, fontWeight: 800, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}>Cancelar</button>
                            </div>
                            {/* Live game info */}
                            {(() => {
                              const st = sessionStatuses[setup.id];
                              if (!st || !st.currentGame) return null;
                              const PHASE_LABEL = { CHECKIN:'Check-in', RPS:'RPS', CHARACTER_SELECT:'Eligiendo personaje', STAGE_BAN:'Baneando stage', STAGE_SELECT:'Eligiendo stage', PLAYING:'Jugando', FINISHED:'Finalizado' };
                              return (
                                <div style={{ marginBottom: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '7px 9px' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontSize: 9, fontWeight: 800, color: setup.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Game {st.currentGame} · {st.format || 'BO3'} · {PHASE_LABEL[st.phase] || st.phase}</span>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: '#fff' }}>{st.score1 ?? 0} – {st.score2 ?? 0}</span>
                                  </div>
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
                            {assigned?.banUrl && (
                              <div style={{ marginTop: 8 }}>
                                <a href={assigned.banUrl} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', fontSize: 10, fontWeight: 800, color: setup.color, background: setup.color + '15', border: `1px solid ${setup.color}35`, borderRadius: 7, padding: '5px 8px', textDecoration: 'none', marginBottom: 8 }}>
                                  🎯 Abrir sistema de ban →
                                </a>
                                {/* Dos QR codes: J1 y J2 con URL específica por jugador */}
                                {(() => {
                                  const q1 = assigned.banUrl1 || (assigned.banUrl + '?p=player1');
                                  const q2 = assigned.banUrl2 || (assigned.banUrl + '?p=player2');
                                  const p1name = assigned.slots?.[0]?.entrant?.name || 'J1';
                                  const p2name = assigned.slots?.[1]?.entrant?.name || 'J2';
                                  return (
                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
                                        <span style={{ fontSize: 8, color: setup.color, fontWeight: 800 }}>🔴 J1</span>
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&color=ffffff&bgcolor=0B0B12&data=${encodeURIComponent(q1)}`} alt="QR J1" style={{ width: 90, height: 90, borderRadius: 6, border: `1px solid ${setup.color}40` }} />
                                        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', textAlign: 'center', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p1name}</span>
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
                                        <span style={{ fontSize: 8, color: '#818CF8', fontWeight: 800 }}>🔵 J2</span>
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&color=ffffff&bgcolor=0B0B12&data=${encodeURIComponent(q2)}`} alt="QR J2" style={{ width: 90, height: 90, borderRadius: 6, border: '1px solid rgba(129,140,248,0.4)' }} />
                                        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', textAlign: 'center', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p2name}</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                                <p style={{ margin: '5px 0 0', textAlign: 'center', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>📱 Cada jugador escanea su QR</p>
                              </div>
                            )}
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
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.18)' }}>Sin match activo</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.1)' }}>↓ Arrastrá un match</p>
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

          </div>{/* /columna izquierda */}

          {/* ▶ COLUMNA DERECHA: Bracket */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* ── BRACKET POR RONDAS ── */}
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', flex: 1 }}>
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
            <a href={selectedBracketUrl || `https://www.start.gg/${selectedSlug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#FF8C00', textDecoration: 'none', fontWeight: 700, flexShrink: 0 }}>Ver en start.gg →</a>
          </div>

          <div style={{ flex: 1, minHeight: 400, overflowY: 'auto', overflowX: 'hidden', borderRadius: 16, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', padding: '12px' }}>
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
                TEST_SETUPS={TEST_SETUPS}
                SET_STATE_STYLE={SET_STATE_STYLE}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
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
                      <input value={slugInput} onChange={e => setSlugInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && slugInput.trim()) selectPickTournament({ slug: slugInput.trim(), name: slugInput.trim() }); }} placeholder="tournament/mi-torneo" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 13, fontFamily: "'Outfit', sans-serif", outline: 'none' }} />
                      <button onClick={() => { if (slugInput.trim()) selectPickTournament({ slug: slugInput.trim(), name: slugInput.trim() }); }} style={{ background: '#FF8C00', border: 'none', borderRadius: 10, padding: '9px 16px', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', flexShrink: 0 }}>→</button>
                    </div>
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
                              <button key={t.id} onClick={() => selectPickTournament(t)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: selectedSlug === t.slug ? 'rgba(255,140,0,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedSlug === t.slug ? 'rgba(255,140,0,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: "'Outfit', sans-serif" }}>
                                {t.image && <img src={t.image} alt="" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>👥 {t.attendees} inscriptos · {t.slug}</p>
                                </div>
                                <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>›</span>
                              </button>
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
