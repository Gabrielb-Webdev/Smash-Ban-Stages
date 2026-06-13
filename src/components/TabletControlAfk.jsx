// ============================================================
// TABLET CONTROL - AFK (Buenos Aires) - v2.3.0
// Archivo exclusivo para AFK. No tocar para Córdoba ni Mendoza.
// Stages Game 1: Battlefield, Smashville, Town and City, Small Battlefield, Pokemon Stadium 2
// v2.3.0 - Agregar check-in compartido para tablet, ocultar botones innecesarios en afk-tablet
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { CHARACTERS, getStageData, getCharacterData, getStagesForTournament, getSkinCount, getStockIconPath } from '../utils/constants';

// ── Card de espera cuando no es tu turno ───────────────────
function WaitingTurnCard({ icon, turnPlayerName, action }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(16px)',
      borderRadius: 24,
      padding: '40px 24px',
      border: '2px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      gap: 18,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, lineHeight: 1 }}>{icon || '⏳'}</div>
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: '#fff', textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>Esperando...</h3>
        <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>
          <span style={{ color: '#E8A000', fontWeight: 800 }}>{turnPlayerName}</span>{' está '}{action}
        </p>
      </div>
    </div>
  );
}

// ── Componente de botón de stage reutilizable ──────────────
function StageButton({ stageId, stageName, stageImage, isBanned, onClick, colSpan = '', isClicked }) {
  return (
    <button
      onClick={() => { if (!isBanned) onClick(stageId); }}
      disabled={isBanned}
      className={`${colSpan} relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
        isBanned
          ? 'cursor-not-allowed border-white/20'
          : isClicked
            ? 'cursor-pointer border-green-400 shadow-lg shadow-green-500/30 scale-95'
            : 'active:scale-95 cursor-pointer border-white/20 active:border-red-500 shadow-lg'
      }`}
    >
      <div className="aspect-video relative">
        <img src={stageImage} alt={stageName} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
          <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg leading-tight">{stageName}</p>
        </div>
      </div>
      {isBanned && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
        </div>
      )}
      {isClicked && !isBanned && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500/30 backdrop-blur-[1px]">
          <span className="text-green-400 text-4xl sm:text-5xl drop-shadow-2xl">✓</span>
        </div>
      )}
    </button>
  );
}

function StageSelectButton({ stageId, stageName, stageImage, isBanned, onClick, colSpan = '', isClicked }) {
  return (
    <button
      onClick={() => onClick(stageId)}
      className={`${colSpan} relative overflow-hidden rounded-lg sm:rounded-xl border-2 touch-manipulation ${
        isClicked ? 'border-green-400 shadow-lg shadow-green-500/30 scale-95' : 'border-white/20 active:scale-95'
      }`}
    >
      <div className="aspect-video relative">
        <img src={stageImage} alt={stageName} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
          <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg leading-tight">{stageName}</p>
        </div>
      </div>
      {isBanned && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
        </div>
      )}
      {isClicked && !isBanned && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500/30 backdrop-blur-[1px]">
          <span className="text-green-400 text-4xl sm:text-5xl drop-shadow-2xl">✓</span>
        </div>
      )}
    </button>
  );
}

// ── Stages hardcodeados para Game 1 de AFK ─────────────────
const GAME1_STAGES_AFK = [
  { id: 'small-battlefield', name: 'Small Battlefield', image: '/images/stages/Small Battlefield.png' },
  { id: 'town-and-city',     name: 'Town and City',     image: '/images/stages/Town and City.png' },
  { id: 'pokemon-stadium-2', name: 'Pokémon Stadium 2', image: '/images/stages/Pokemon Stadium 2.png' },
  { id: 'battlefield',       name: 'Battlefield',       image: '/images/stages/Battlefield.png' },
  { id: 'smashville',        name: 'Smashville',        image: '/images/stages/Smashville.png' },
];

// ─────────────────────────────────────────────────────────────
export default function TabletControlAfk({ sessionId, playerName, playerIndex, matchToken }) {
  const { session, selectRPSWinner, banStage, selectStage, selectCharacter, setGameWinner, proposeGameWinner, rejectGameWinner, repeatStage, proposeRepeatStage, confirmRepeatStage, rejectRepeatStage, getPlayerHistory, playerCheckin, playerUnavailable, enableSingleDevice, requestMatchDelay, rpsPick } = useWebSocket(sessionId);
  const error = session ? null : 'Conectando...';

  const [manualIdentity, setManualIdentity] = useState(null);
  const _rawIdentity = (() => {
    // 1. Identidad por parámetro de URL (?p=player1|player2)
    //    Verificar que el nombre del usuario logueado coincide con el jugador reclamado.
    //    Así evitamos que alguien con ?p=player2 de un match anterior actúe en el nuevo match.
    if (playerIndex && session) {
      const claimedName = (session[playerIndex]?.name || '').toLowerCase().trim();
      const uLow = (playerName || '').toLowerCase().trim();
      // Si hay sesión activa y nombre logueado y NO coincide → rechazar identidad por URL
      if (uLow && claimedName && !claimedName.includes(uLow) && !uLow.includes(claimedName)) {
        // nombre no coincide — no otorgar identidad por parámetro de URL
      } else {
        return playerIndex;
      }
    }
    // 2. Identidad manual (selección en pantalla)
    if (manualIdentity) return manualIdentity;
    // 3. Fuzzy match por nombre logueado
    if (session && playerName) {
      const uLow = playerName.toLowerCase().trim();
      const p1Low = (session.player1?.name || '').toLowerCase().trim();
      const p2Low = (session.player2?.name || '').toLowerCase().trim();
      if (p1Low && (p1Low === uLow || p1Low.includes(uLow) || uLow.includes(p1Low))) return 'player1';
      if (p2Low && (p2Low === uLow || p2Low.includes(uLow) || uLow.includes(p2Low))) return 'player2';
    }
    return null;
  })();
  const myPlayer = _rawIdentity;
  const effectivePlayer = session?.singleDeviceMode ? null : myPlayer;

  const [searchTerm, setSearchTerm] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [showRepeatModal, setShowRepeatModal] = useState({ player1: false, player2: false });
  const [previousCharacters, setPreviousCharacters] = useState({ player1: null, player2: null });
  const [hasAskedRepeat, setHasAskedRepeat] = useState({ player1: false, player2: false });
  const [lastGameSaved, setLastGameSaved] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [isActionBlocked, setIsActionBlocked] = useState(false);
  const [turnModal, setTurnModal] = useState(null);
  const [clickedItemId, setClickedItemId] = useState(null);
  const [showRepeatStageModal, setShowRepeatStageModal] = useState(false);
  const [hasAskedRepeatStage, setHasAskedRepeatStage] = useState(false);
  const [playerPickHistory, setPlayerPickHistory] = useState([]);
  const [finishedDismissed, setFinishedDismissed] = useState(false);
  const [skinModal, setSkinModal] = useState(null);
  const isFirstRender = useRef(true);
  const prevPhaseRef = useRef(null);
  const prevTurnRef = useRef(null);

  // Sincronizar scores y tournamentName con Redis cuando el WebSocket los actualiza
  // Solo el setup de stream (afk-stream) y tablet (afk-tablet) envían datos al overlay True Combo
  const prevScoreRef = useRef({ p1: null, p2: null, tournament: null });
  useEffect(() => {
    if (!session || session.phase === 'IDLE' || session.phase === 'CHECKIN') return;
    if (sessionId !== 'afk-stream' && sessionId !== 'afk-tablet') return;
    const p1s = session.player1?.score ?? 0;
    const p2s = session.player2?.score ?? 0;
    const tName = session.tournamentName || '';
    const prev = prevScoreRef.current;
    if (prev.p1 === p1s && prev.p2 === p2s && prev.tournament === tName) return;
    prevScoreRef.current = { p1: p1s, p2: p2s, tournament: tName };
    fetch('/api/afk/score-state', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p1score: p1s, p2score: p2s, tournamentName: tName }),
    }).catch(() => {});
  }, [session?.player1?.score, session?.player2?.score, session?.tournamentName, session?.phase]);

  // Sincronizar stage seleccionado con overlay player-intro (solo afk-stream y afk-tablet)
  useEffect(() => {
    if (!session || (sessionId !== 'afk-stream' && sessionId !== 'afk-tablet')) return;
    if (!session.selectedStage) return;
    const stageInfo = getStageData(session.selectedStage);
    if (!stageInfo?.name) return;
    fetch('/api/afk/score-state', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: stageInfo.name }),
    }).catch(() => {});
  }, [session?.selectedStage, sessionId]);

  // Guardar personajes cuando ambos seleccionaron
  useEffect(() => {
    if (!session) return;
    if (session.player1.character && session.player2.character && lastGameSaved !== session.currentGame) {
      setPreviousCharacters({ player1: session.player1.character, player2: session.player2.character });
      setLastGameSaved(session.currentGame);
    }
  }, [session?.player1?.character, session?.player2?.character, session?.currentGame, lastGameSaved]);

  // Mostrar modal de repetir stage al entrar a STAGE_BAN en game 2+
  useEffect(() => {
    if (!session) return;
    if (effectivePlayer && session.currentTurn !== effectivePlayer) return;
    if (
      session.phase === 'STAGE_BAN' &&
      session.currentGame >= 2 &&
      !hasAskedRepeatStage &&
      !session.repeatStageRejected &&
      session.previousStageData?.selectedStage
    ) {
      setShowRepeatStageModal(true);
      setHasAskedRepeatStage(true);
    }
  }, [session?.phase, session?.currentGame, session?.currentTurn, effectivePlayer, hasAskedRepeatStage, session?.previousStageData?.selectedStage, session?.repeatStageRejected]);

  // Cargar historial del jugador cuyo turno es en CHARACTER_SELECT
  useEffect(() => {
    if (!session || session.phase !== 'CHARACTER_SELECT' || !session.currentTurn) return;
    const playerName = session[session.currentTurn]?.name;
    if (!playerName) return;
    setPlayerPickHistory([]);
    getPlayerHistory(playerName, (data) => {
      setPlayerPickHistory(data.characters || []);
    });
  }, [session?.phase, session?.currentTurn]);

  // Reset al inicio de nuevo game
  useEffect(() => {
    if (!session) return;
    if (session.phase === 'CHARACTER_SELECT' && !session.player1.character && !session.player2.character) {
      setHasAskedRepeat({ player1: false, player2: false });
      setShowRepeatModal({ player1: false, player2: false });
      setHasAskedRepeatStage(false);
    }
  }, [session?.phase, session?.player1?.character, session?.player2?.character, session?.currentGame]);

  // Modales de repetir personaje (solo en tu propio turno)
  useEffect(() => {
    if (!session) return;
    if (effectivePlayer && session.currentTurn !== effectivePlayer) return;
    if (session.currentGame >= 2 && session.phase === 'CHARACTER_SELECT') {
      if (session.currentTurn === 'player1' && !hasAskedRepeat.player1 && !session.player1.character && (previousCharacters.player1 || session.lastCharacters?.player1) && !showRepeatModal.player1) {
        setShowRepeatModal({ player1: true, player2: false });
        setHasAskedRepeat(prev => ({ ...prev, player1: true }));
      }
      if (session.currentTurn === 'player2' && !hasAskedRepeat.player2 && !session.player2.character && (previousCharacters.player2 || session.lastCharacters?.player2) && !showRepeatModal.player2) {
        setShowRepeatModal({ player1: false, player2: true });
        setHasAskedRepeat(prev => ({ ...prev, player2: true }));
      }
    }
  }, [session?.currentGame, session?.phase, session?.currentTurn, effectivePlayer, session?.player1?.character, session?.player2?.character, hasAskedRepeat, previousCharacters, showRepeatModal]);

  // Detectar cambios de fase/turno para mostrar modal de anuncio (solo singleDeviceMode)
  useEffect(() => {
    if (!session || !session.singleDeviceMode) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevPhaseRef.current = session.phase;
      prevTurnRef.current = session.currentTurn;
      return;
    }
    const prevPhase = prevPhaseRef.current;
    const prevTurn = prevTurnRef.current;
    const turn = session.currentTurn;
    const name = turn ? session[turn]?.name : '';
    if (prevPhase !== session.phase) {
      if (session.phase === 'STAGE_BAN' && turn) {
        setTurnModal({ icon: '\u{1F6AB}', subtitle: 'Le toca BANEAR stage a', playerName: name, gradient: 'linear-gradient(160deg,#1a0505 0%,#450a0a 50%,#7f1d1d 100%)', accent: '#ef4444' });
      } else if (session.phase === 'STAGE_SELECT' && turn) {
        setTurnModal({ icon: '\u{1F3AF}', subtitle: 'Le toca ELEGIR stage a', playerName: name, gradient: 'linear-gradient(160deg,#020d1a 0%,#0c2340 50%,#1d4ed8 100%)', accent: '#60a5fa' });
      } else if (session.phase === 'CHARACTER_SELECT' && turn) {
        setTurnModal({ icon: '\u{1F3AE}', subtitle: 'Elige tu personaje', playerName: name, gradient: 'linear-gradient(160deg,#0d0520 0%,#1e1040 50%,#4c1d95 100%)', accent: '#a78bfa' });
      }
    } else if (prevTurn !== turn && turn && session.phase !== 'RPS') {
      if (session.phase === 'STAGE_BAN') {
        setTurnModal({ icon: '\u{1F6AB}', subtitle: 'Ahora le toca BANEAR a', playerName: name, gradient: 'linear-gradient(160deg,#1a0505 0%,#450a0a 50%,#7f1d1d 100%)', accent: '#ef4444' });
      } else if (session.phase === 'CHARACTER_SELECT') {
        setTurnModal({ icon: '\u{1F3AE}', subtitle: 'Ahora te toca elegir a vos', playerName: name, gradient: 'linear-gradient(160deg,#0d0520 0%,#1e1040 50%,#4c1d95 100%)', accent: '#a78bfa' });
      }
    }
    prevPhaseRef.current = session.phase;
    prevTurnRef.current = session.currentTurn;
  }, [session?.phase, session?.currentTurn, session?.singleDeviceMode]);

  // Auto-dismiss del modal de turno despu\u00e9s de 4s
  useEffect(() => {
    if (turnModal) {
      const t = setTimeout(() => setTurnModal(null), 4000);
      return () => clearTimeout(t);
    }
  }, [turnModal]);

  // Auto-cerrar pantalla FINISHED después de 5 segundos
  useEffect(() => {
    if (!session || session.phase !== 'FINISHED') { setFinishedDismissed(false); return; }
    const t = setTimeout(() => { if (typeof window !== 'undefined') window.location.href = '/home'; }, 5000);
    return () => clearTimeout(t);
  }, [session?.phase]);

  const handleRepeatCharacter = (player, repeat) => {
    setShowRepeatModal({ player1: false, player2: false });
    const charToRepeat = previousCharacters[player] || session?.lastCharacters?.[player];
    if (repeat && charToRepeat) {
      selectCharacter(sessionId, charToRepeat, player, null, session?.matchToken);
    }
  };

  const handleRepeatStage = (repeat) => {
    setShowRepeatStageModal(false);
    if (repeat) {
      proposeRepeatStage(sessionId);
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <img src="/images/AFK.webp" alt="AFK" className="w-24 h-24 mx-auto mb-4 animate-pulse" />
          <p className="text-white text-xl font-bold">Inicializando...</p>
        </div>
      </div>
    );
  }

  if (error && error === 'Sesión no encontrada') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-3xl font-bold text-white mb-4">Sesión no encontrada</h2>
          <p className="text-white/70 text-lg mb-6">Esta sesión no existe o ha expirado.</p>
          <a href="/" className="inline-block px-6 py-3 bg-smash-blue text-white font-bold rounded-lg hover:bg-blue-600 transition-all">
            Ir al Panel de Administración
          </a>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <img src="/images/AFK.webp" alt="AFK" className="w-24 h-24 mx-auto mb-4 animate-pulse" />
          <p className="text-white text-xl font-bold">Cargando sesión...</p>
          {error && <p className="text-yellow-400 text-sm mt-2 font-semibold">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Handlers ────────────────────────────────────────────────
  const handleRPSWinner = (winner) => {
    const proposedBy = myPlayer || 'admin';
    setPendingAction({ type: 'rps', winner, playerName: session[winner].name, proposedBy });
  };

  const handleRpsPick = (pick, playerKey) => {
    if (!playerKey) return;
    rpsPick(sessionId, pick, playerKey, session?.matchToken);
  };

  const isStreamSession = sessionId && sessionId.toLowerCase().includes('stream');

  const startCooldown = () => {
    if (!isStreamSession) return; // Sin cooldown para setups no-stream
    setIsActionBlocked(true);
    setCooldown(3);
    const interval = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); setIsActionBlocked(false); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleBanStage = (stageId) => {
    if (isActionBlocked) return;
    if (effectivePlayer && session.currentTurn !== effectivePlayer) return;
    if (session.currentTurn) {
      setClickedItemId(stageId);
      const stage = getAllStages().find(s => s.id === stageId);
      setPendingAction({ type: 'ban', stageId, stageName: stage?.name || stageId, player: session.currentTurn });
      startCooldown();
    }
  };

  const handleSelectStage = (stageId) => {
    if (isActionBlocked) return;
    if (effectivePlayer && session.currentTurn !== effectivePlayer) return;
    if (session.currentTurn) {
      setClickedItemId(stageId);
      const stage = getAllStages().find(s => s.id === stageId);
      setPendingAction({ type: 'select', stageId, stageName: stage?.name || stageId, player: effectivePlayer || session.currentTurn });
    }
  };

  const handleSelectCharacter = (characterId) => {
    if (effectivePlayer && session.currentTurn !== effectivePlayer) return;
    if (session.currentTurn) {
      setClickedItemId(characterId);
      const character = CHARACTERS.find(c => c.id === characterId);
      const skinCount = getSkinCount(characterId);
      if (skinCount <= 1) {
        setPendingAction({ type: 'character', characterId, characterName: character.name, characterImage: character.image, player: session.currentTurn, skin: 1 });
      } else {
        setSkinModal({ characterId, characterName: character.name, player: session.currentTurn });
      }
    }
  };

  const handleConfirmSkin = (skin) => {
    if (!skinModal) return;
    const { characterId, characterName, player } = skinModal;
    setSkinModal(null);
    setPendingAction({ type: 'character', characterId, characterName, characterImage: getStockIconPath(characterId, skin), player, skin });
  };

  const handleRandomCharacter = () => {
    if (effectivePlayer && session.currentTurn !== effectivePlayer) return;
    const randomChar = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    if (session.currentTurn) {
      setPendingAction({ type: 'character', characterId: 'random', characterName: '?', characterImage: null, player: session.currentTurn, isRandom: true });
    }
  };

  const handleSetGameWinner = (winner) => {
    setPendingAction({ type: 'winner', winner, playerName: session[winner].name });
  };

  const confirmAction = () => {
    if (!pendingAction || !sessionId) return;
    switch (pendingAction.type) {
      case 'rps':       selectRPSWinner(sessionId, pendingAction.winner, pendingAction.proposedBy); break;
      case 'ban':       banStage(sessionId, pendingAction.stageId, pendingAction.player, session?.matchToken); break;
      case 'select':    selectStage(sessionId, pendingAction.stageId, pendingAction.player, session?.matchToken); break;
      case 'character':
        selectCharacter(sessionId, pendingAction.characterId, pendingAction.player, pendingAction.skin || null, session?.matchToken);
        // Sincronizar con overlay control.html via Redis (solo setup de stream y tablet)
        if ((sessionId === 'afk-stream' || sessionId === 'afk-tablet') && pendingAction.characterId && pendingAction.characterId !== 'random' && !pendingAction.isRandom) {
          const pKey = pendingAction.player === 'player1' ? 'p1' : 'p2';
          const _charName = CHARACTERS.find(c => c.id === pendingAction.characterId)?.name || '';
          const _iconPath = getStockIconPath(pendingAction.characterId, pendingAction.skin || 1) || '';
          fetch('/api/afk/score-state', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [`${pKey}char`]: _charName, [`${pKey}charIcon`]: _iconPath }),
          }).catch(() => {});
        }
        break;
      case 'winner':    proposeGameWinner(sessionId, pendingAction.winner, myPlayer, session?.matchToken); break;
    }
    setPendingAction(null);
    setClickedItemId(null);
  };

  const cancelAction = () => { setPendingAction(null); setClickedItemId(null); };

  const getAllStages = () => getStagesForTournament(sessionId, session.currentGame);

  const filteredCharacters = CHARACTERS.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ background: '#000000', fontFamily: 'Anton, sans-serif', minHeight: '100dvh', overflowX: 'hidden' }}>

      {/* ── Header sticky ── */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-md px-3 pt-2 pb-2 sm:px-4 sm:pt-3 sm:pb-2 border-b border-white/20 shadow-xl overflow-hidden">
          <div className="flex flex-col gap-2">

            {/* Fila 1: Jugadores */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-gradient-to-br from-smash-red/50 to-red-900/30 rounded-xl px-2 py-1.5 flex-1 min-w-0 border border-smash-red/40">
                {session.player1.character && session.player1.character !== 'random' ? (
                  <img src={getStockIconPath(session.player1.character, session.player1.skin || 1)} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 border-2 border-white/20 shadow-lg" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 bg-white/10 border-2 border-white/20 flex items-center justify-center">
                    <span className="text-white/40 text-[10px] font-bold">P1</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-smash-red/80 text-[9px] sm:text-[10px] leading-none uppercase tracking-wide font-bold">Jugador 1</p>
                  <p className="text-white font-black text-xs sm:text-sm truncate">{session.player1.name}</p>
                  <p className="text-smash-yellow text-lg sm:text-2xl font-black leading-none">{session.player1.score}</p>
                </div>
              </div>
              <div className="flex items-center px-1">
                <span className="text-white text-sm sm:text-base font-black" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>VS</span>
              </div>
              <div className="flex items-center gap-1.5 bg-gradient-to-bl from-smash-blue/50 to-blue-900/30 rounded-xl px-2 py-1.5 flex-1 min-w-0 border border-smash-blue/40">
                {session.player2.character && session.player2.character !== 'random' ? (
                  <img src={getStockIconPath(session.player2.character, session.player2.skin || 1)} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 border-2 border-white/20 shadow-lg" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 bg-white/10 border-2 border-white/20 flex items-center justify-center">
                    <span className="text-white/40 text-[10px] font-bold">P2</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-smash-blue/80 text-[9px] sm:text-[10px] leading-none uppercase tracking-wide font-bold">Jugador 2</p>
                  <p className="text-white font-black text-xs sm:text-sm truncate">{session.player2.name}</p>
                  <p className="text-smash-yellow text-lg sm:text-2xl font-black leading-none">{session.player2.score}</p>
                </div>
              </div>
            </div>

            {/* Fila 2: Ronda + Game + Formato */}
            <div className="flex items-center justify-between gap-2">
              <img src="/images/AFK.webp" alt="AFK" className="h-7 sm:h-9 w-auto object-contain flex-shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
              {session.round ? (
                <span className="text-white/55 text-[11px] sm:text-xs uppercase tracking-wider font-bold truncate flex-1 text-center px-2">{session.round}</span>
              ) : (
                <span className="flex-1" />
              )}
              <div className="flex items-center gap-2">
                <div className="text-center bg-amber-400/15 border border-amber-400/35 rounded-lg px-3 py-1.5">
                  <p className="text-white/50 text-[9px] leading-none uppercase tracking-wide mb-0.5">Juego</p>
                  <p className="text-amber-300 text-2xl font-black leading-none" style={{ textShadow: '0 0 12px rgba(251,191,36,0.5)' }}>{session.currentGame}</p>
                </div>
                <div className="text-center bg-white/10 border border-white/20 rounded-lg px-3 py-1.5">
                  <p className="text-white/50 text-[9px] leading-none uppercase tracking-wide mb-0.5">Formato</p>
                  <p className="text-amber-300 text-lg font-black leading-none">{session.format}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* ── Contenido scrollable ── */}
      <div className="p-3 md:p-4 max-w-7xl mx-auto flex flex-col gap-3 md:gap-4">

        {/* ── CHECKIN Phase ── */}
        {session.phase === 'CHECKIN' && (
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            borderRadius: 24,
            padding: '32px 24px',
            border: '2px solid rgba(255,255,255,0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            minHeight: '70vh',
            justifyContent: 'center',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🎮</div>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff', textShadow: '2px 2px 8px rgba(0,0,0,0.8)', letterSpacing: '-0.5px' }}>¡Es tu match!</h2>
              <p style={{ margin: '8px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.6)', textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>Hacé check-in para confirmar</p>
            </div>

            {/* Tablet compartida AFK: botón único que hace check-in para ambos */}
            {sessionId === 'afk-tablet' ? (
              (() => {
                const p1Name = session.player1?.name;
                const p2Name = session.player2?.name;
                const p1Checked = (session.checkIns || []).includes(p1Name);
                const p2Checked = (session.checkIns || []).includes(p2Name);
                const bothChecked = p1Checked && p2Checked;
                const handleBothCheckin = () => {
                  if (!p1Checked) playerCheckin(sessionId, p1Name, matchToken || session?.matchToken);
                  if (!p2Checked) playerCheckin(sessionId, p2Name, matchToken || session?.matchToken);
                };
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 400, alignItems: 'center' }}>
                    <button
                      onClick={handleBothCheckin}
                      disabled={bothChecked}
                      style={{
                        width: '100%', padding: '32px 24px', borderRadius: 20,
                        border: bothChecked ? '2px solid rgba(34,197,94,0.6)' : '2px solid rgba(255,255,255,0.35)',
                        background: bothChecked ? 'rgba(34,197,94,0.18)' : 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))',
                        color: bothChecked ? '#4ADE80' : '#fff', fontSize: 28, fontWeight: 900,
                        cursor: bothChecked ? 'default' : 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 16, transition: 'all 0.3s',
                        boxShadow: bothChecked ? '0 0 32px rgba(34,197,94,0.4)' : '0 8px 32px rgba(0,0,0,0.5)',
                        fontFamily: 'inherit', textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                      }}
                    >
                      <span style={{ fontSize: 40 }}>{bothChecked ? '✅' : '👥'}</span>
                      <span>{bothChecked ? 'Listos' : 'CHECK-IN'}</span>
                    </button>
                    <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'space-around' }}>
                      <div style={{ flex: 1, padding: '16px 12px', borderRadius: 14, border: '1.5px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.08)', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>JUGADOR 1</p>
                        <p style={{ margin: 0, fontSize: 13, color: p1Checked ? '#4ADE80' : '#fff', fontWeight: 700 }}>{p1Name}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: p1Checked ? '#4ADE80' : 'rgba(255,255,255,0.4)' }}>{p1Checked ? '✅ Listo' : '⏳'}</p>
                      </div>
                      <div style={{ flex: 1, padding: '16px 12px', borderRadius: 14, border: '1.5px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.08)', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>JUGADOR 2</p>
                        <p style={{ margin: 0, fontSize: 13, color: p2Checked ? '#4ADE80' : '#fff', fontWeight: 700 }}>{p2Name}</p>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: p2Checked ? '#4ADE80' : 'rgba(255,255,255,0.4)' }}>{p2Checked ? '✅ Listo' : '⏳'}</p>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : myPlayer ? (
              (() => {
                const myName = session[myPlayer]?.name;
                const otherPlayer = myPlayer === 'player1' ? 'player2' : 'player1';
                const otherName = session[otherPlayer]?.name;
                const myChecked = (session.checkIns || []).includes(myName);
                const otherChecked = (session.checkIns || []).includes(otherName);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 360, alignItems: 'center' }}>
                    <button
                      onClick={() => !myChecked && playerCheckin(sessionId, myName, matchToken || session?.matchToken)}
                      disabled={myChecked}
                      style={{
                        width: '100%', padding: '22px 20px', borderRadius: 18,
                        border: myChecked ? '2px solid rgba(34,197,94,0.6)' : '2px solid rgba(255,255,255,0.35)',
                        background: myChecked ? 'rgba(34,197,94,0.18)' : 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(255,140,0,0.15))',
                        color: myChecked ? '#4ADE80' : '#fff', fontSize: 22, fontWeight: 900,
                        cursor: myChecked ? 'default' : 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 14, transition: 'all 0.2s',
                        boxShadow: myChecked ? '0 0 24px rgba(34,197,94,0.35)' : '0 6px 24px rgba(0,0,0,0.4)',
                        fontFamily: 'inherit', textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
                      }}
                    >
                      <span style={{ fontSize: 26 }}>{myChecked ? '✅' : '👤'}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.65 }}>Check-in</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{myName}</span>
                      </div>
                      {myChecked && <span style={{ fontSize: 13, fontWeight: 700, color: '#4ADE80', marginLeft: 'auto' }}>✅ Listo</span>}
                    </button>
                    <div style={{
                      width: '100%', padding: '14px 16px', borderRadius: 14,
                      border: otherChecked ? '1.5px solid rgba(34,197,94,0.4)' : '1.5px solid rgba(255,255,255,0.12)',
                      background: otherChecked ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{ fontSize: 18 }}>{otherChecked ? '✅' : '⏳'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>Rival</p>
                        <p style={{ margin: 0, fontSize: 14, color: otherChecked ? '#4ADE80' : 'rgba(255,255,255,0.65)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otherName}</p>
                      </div>
                      <span style={{ fontSize: 12, color: otherChecked ? '#4ADE80' : 'rgba(255,255,255,0.35)', fontWeight: 700 }}>
                        {otherChecked ? 'Listo' : 'Esperando...'}
                      </span>
                    </div>
                    {sessionId !== 'afk-tablet' && (
                      <>
                        {!session.singleDeviceMode ? (
                          <button
                            onClick={() => enableSingleDevice(sessionId)}
                            style={{
                              width: '100%', padding: '12px 16px', borderRadius: 14,
                              border: '1.5px solid rgba(96,165,250,0.4)', background: 'rgba(96,165,250,0.09)',
                              color: '#93C5FD', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              fontFamily: 'inherit',
                            }}
                          >
                            <span>📱</span> Mi rival no tiene dispositivo — usar este
                          </button>
                        ) : (
                          <div style={{
                            width: '100%', padding: '10px 14px', borderRadius: 12,
                            border: '1.5px solid rgba(96,165,250,0.35)', background: 'rgba(96,165,250,0.08)',
                            color: '#60A5FA', fontSize: 13, fontWeight: 700, textAlign: 'center',
                          }}>
                            📱 Modo 1 dispositivo activo
                          </div>
                        )}
                        {!myChecked && !(session.delayRequests || []).includes(myName) && (
                          <button
                            onClick={() => requestMatchDelay(sessionId, myName)}
                            style={{
                              width: '100%', padding: '12px 16px', borderRadius: 14,
                              border: '1.5px solid rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.09)',
                              color: '#FCD34D', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              fontFamily: 'inherit',
                            }}
                          >
                            <span>⏱️</span> Necesito más tiempo
                          </button>
                        )}
                        {!myChecked && !(session.unavailableUsedBy || []).includes(myName) && (
                          <button
                            onClick={() => playerUnavailable(sessionId, myName)}
                            style={{
                              width: '100%', padding: '12px 16px', borderRadius: 14,
                              border: '1.5px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.09)',
                              color: '#F87171', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              fontFamily: 'inherit',
                            }}
                          >
                            <span>🚫</span> No estoy disponible ahora
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })()
            ) : (
              /* El usuario no es ninguno de los dos jugadores → no puede hacer check-in */
              <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                <div style={{ fontSize: 56, marginBottom: 14, lineHeight: 1 }}>🚫</div>
                <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: '#fff', textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>Este match no es tuyo</p>
                <p style={{ margin: '0 0 28px', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  Solo <strong style={{ color: '#E8A000' }}>{session.player1?.name}</strong> y <strong style={{ color: '#E8A000' }}>{session.player2?.name}</strong> pueden hacer check-in aquí.
                </p>
                <a
                  href="/home"
                  style={{
                    display: 'inline-block', padding: '13px 28px', borderRadius: 14,
                    background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.2)',
                    color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none',
                    letterSpacing: '0.01em',
                  }}
                >
                  ← Ir al inicio
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── RPS Phase ── */}
        {session.phase === 'RPS' && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-2xl border-2 border-white/30 flex flex-col justify-center relative overflow-hidden min-h-[70vh]">
            {(() => {
              const rg = session.rpsGame;
              const myKey = effectivePlayer;
              const oppKey = myKey === 'player1' ? 'player2' : 'player1';
              const PICKS = [
                { id: 'rock',     emoji: '✊', label: 'Piedra', cls: 'from-orange-500 to-orange-700 border-orange-400/60' },
                { id: 'paper',    emoji: '✋', label: 'Papel',  cls: 'from-green-500 to-green-700 border-green-400/60' },
                { id: 'scissors', emoji: '✌️', label: 'Tijera', cls: 'from-blue-500 to-blue-700 border-blue-400/60' },
              ];
              const renderButtons = (forPlayer) => {
                const pickedId = rg?.picks?.[forPlayer];
                if (pickedId) return (
                  <div className="text-center py-2 px-3 bg-white/10 rounded-xl border border-white/20">
                    <div className="text-4xl sm:text-5xl mb-1">{PICKS.find(p => p.id === pickedId)?.emoji}</div>
                    <p className="text-white font-black text-sm">{PICKS.find(p => p.id === pickedId)?.label}</p>
                    <p className="text-white/50 text-xs mt-1">¡Listo!</p>
                  </div>
                );
                return (
                  <div className="grid grid-cols-3 gap-2 w-full">
                    {PICKS.map(({ id, emoji, label, cls }) => (
                      <button key={id} onClick={() => handleRpsPick(id, forPlayer)} disabled={rg?.revealed}
                        className={`group py-5 sm:py-7 bg-gradient-to-br ${cls} text-white font-black text-xs sm:text-sm rounded-xl sm:rounded-2xl active:scale-95 transition-all duration-200 shadow-xl border-2 relative overflow-hidden touch-manipulation`}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        <div className="relative z-10">
                          <div className="text-2xl sm:text-3xl mb-1 group-active:scale-110 transition-transform">{emoji}</div>
                          <div>{label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              };
              if (rg?.revealed) {
                const isDraw = rg.winner === null;
                return (
                  <div className="text-center relative z-10 py-2">
                    <h3 className="text-xl sm:text-2xl font-black text-white mb-4 drop-shadow-lg">
                      {isDraw ? '💥 ¡EMPATE!' : `🏆 ¡Ganó ${session[rg.winner]?.name}!`}
                    </h3>
                    <div className="flex justify-center gap-6 sm:gap-10 mb-4">
                      {['player1', 'player2'].map((pk, i) => (
                        <div key={pk} className="text-center">
                          <p className="text-white/60 text-xs mb-1">{i === 0 ? '🔴' : '🔵'} {session[pk]?.name}</p>
                          <div className="text-5xl sm:text-6xl">{PICKS.find(p => p.id === rg.picks?.[pk])?.emoji || '❓'}</div>
                          <p className="text-white font-bold text-sm mt-1">{PICKS.find(p => p.id === rg.picks?.[pk])?.label || '?'}</p>
                        </div>
                      ))}
                    </div>
                    {isDraw
                      ? <p className="text-sm text-white/50 animate-pulse">¡Empataron! Siguiente ronda...</p>
                      : <p className="text-sm text-white/50 animate-pulse">Comenzando torneo...</p>
                    }
                  </div>
                );
              }
              return (
                <>
                  <div className="text-center mb-4 sm:mb-5 relative z-10">
                    <div className="text-3xl sm:text-4xl mb-1">✊✋✌️</div>
                    <h3 className="text-xl sm:text-2xl font-black text-white mb-1 drop-shadow-lg">
                      Piedra, Papel o Tijera{rg?.round > 1 ? ` — Ronda ${rg.round}` : ''}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/60">Elegí sin que el rival vea tu elección</p>
                  </div>
                  {myKey ? (
                    <div className="relative z-10 w-full max-w-xs mx-auto">
                      {renderButtons(myKey)}
                      {rg?.picks?.[myKey] && !rg?.picks?.[oppKey] && (
                        <p className="text-center text-white/50 text-xs mt-3 animate-pulse">Esperando a {session[oppKey]?.name}...</p>
                      )}
                    </div>
                  ) : (
                    <div className="relative z-10 w-full flex flex-col gap-4">
                      <div>
                        <p className="text-white/60 text-xs text-center mb-2">🔴 {session.player1?.name}</p>
                        {renderButtons('player1')}
                      </div>
                      <div>
                        <p className="text-white/60 text-xs text-center mb-2">🔵 {session.player2?.name}</p>
                        {renderButtons('player2')}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* ── Stage Ban Phase ── */}
        {session.phase === 'STAGE_BAN' && effectivePlayer && session.currentTurn !== effectivePlayer && (
          <WaitingTurnCard icon="❌" turnPlayerName={session[session.currentTurn]?.name}
            action={`baneando${session.bansRemaining > 0 ? ` (${session.bansRemaining} restante${session.bansRemaining !== 1 ? 's' : ''})` : ''}`} />
        )}
        {session.phase === 'STAGE_BAN' && (!effectivePlayer || session.currentTurn === effectivePlayer) && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-xl border border-white/20 flex flex-col relative">
            {cooldown > 0 && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
                <div className="text-center">
                  <div className="text-8xl sm:text-9xl font-black text-white animate-pulse mb-4" style={{ textShadow: '0 0 40px rgba(255,255,255,0.8)' }}>{cooldown}</div>
                  <p className="text-xl sm:text-2xl text-white font-bold">Espera antes de la siguiente acción...</p>
                </div>
              </div>
            )}
            <div className="text-center mb-2 sm:mb-3 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1" style={{ textShadow: '3px 3px 6px rgba(0,0,0,0.9)' }}>❌ Banear Stage</h3>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                <p className={myPlayer && myPlayer === session.currentTurn ? 'text-yellow-400 text-sm sm:text-base font-black' : 'text-white text-sm sm:text-base font-semibold'} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>
                  {myPlayer && myPlayer === session.currentTurn ? '⚡ ¡Es tu turno! Baneá' : `Turno: ${session[session.currentTurn]?.name}`}
                </p>
                <span className="hidden sm:inline text-white">|</span>
                <p className="text-smash-yellow text-sm sm:text-base font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>Baneos restantes: {session.bansRemaining}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 sm:gap-2 pb-2">
              {session.currentGame === 1 ? (
                /* Game 1 - 5 stages fijos de AFK: 3+2 */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {GAME1_STAGES_AFK.slice(0, 3).map(s => (
                      <StageButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages.includes(s.id)} onClick={handleBanStage} isClicked={clickedItemId === s.id} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                    <div className="hidden sm:block sm:col-span-1" />
                    {GAME1_STAGES_AFK.slice(3, 5).map(s => (
                      <StageButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages.includes(s.id)} onClick={handleBanStage} isClicked={clickedItemId === s.id} colSpan="sm:col-span-2" />
                    ))}
                    <div className="hidden sm:block sm:col-span-1" />
                  </div>
                </>
              ) : (
                /* Games 2+ - Layout dinámico 3+3+2 */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {getAllStages().slice(0, 3).map(s => (
                      <StageButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages.includes(s.id)} onClick={handleBanStage} isClicked={clickedItemId === s.id} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {getAllStages().slice(3, 6).map(s => (
                      <StageButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages.includes(s.id)} onClick={handleBanStage} isClicked={clickedItemId === s.id} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                    <div className="hidden sm:block sm:col-span-1" />
                    {getAllStages().slice(6, 8).map(s => (
                      <StageButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages.includes(s.id)} onClick={handleBanStage} isClicked={clickedItemId === s.id} colSpan="sm:col-span-2" />
                    ))}
                    <div className="hidden sm:block sm:col-span-1" />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Stage Select Phase ── */}
        {session.phase === 'STAGE_SELECT' && effectivePlayer && session.currentTurn !== effectivePlayer && (
          <WaitingTurnCard icon="🎯" turnPlayerName={session[session.currentTurn]?.name} action="eligiendo el escenario" />
        )}
        {session.phase === 'STAGE_SELECT' && (!effectivePlayer || session.currentTurn === effectivePlayer) && (
          <div className="bg-white/10 rounded-xl p-2 sm:p-4 border border-white/20 flex flex-col relative">
            {cooldown > 0 && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
                <div className="text-center">
                  <div className="text-8xl sm:text-9xl font-black text-white animate-pulse mb-4" style={{ textShadow: '0 0 40px rgba(255,255,255,0.8)' }}>{cooldown}</div>
                  <p className="text-xl sm:text-2xl text-white font-bold">Espera antes de la siguiente acción...</p>
                </div>
              </div>
            )}
            <div className="text-center mb-1.5 sm:mb-2 flex-shrink-0">
              <h3 className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">🎯 Seleccionar Stage</h3>
              <p className={`text-sm sm:text-lg font-semibold truncate ${myPlayer && myPlayer === session.currentTurn ? 'text-yellow-400 font-black' : 'text-white'}`}>
                {myPlayer && myPlayer === session.currentTurn ? '⚡ ¡Elegí el escenario!' : `Turno: ${session[session.currentTurn]?.name}`}
              </p>
            </div>

            <div className="flex flex-col gap-1.5 sm:gap-2 pb-2">
              {session.currentGame === 1 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {GAME1_STAGES_AFK.slice(0, 3).map(s => (
                      <StageSelectButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages?.includes(s.id)} onClick={handleSelectStage} isClicked={clickedItemId === s.id} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                    <div className="hidden sm:block sm:col-span-1" />
                    {GAME1_STAGES_AFK.slice(3, 5).map(s => (
                      <StageSelectButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages?.includes(s.id)} onClick={handleSelectStage} isClicked={clickedItemId === s.id} colSpan="sm:col-span-2" />
                    ))}
                    <div className="hidden sm:block sm:col-span-1" />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {getAllStages().slice(0, 3).map(s => (
                      <StageSelectButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages?.includes(s.id)} onClick={handleSelectStage} isClicked={clickedItemId === s.id} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {getAllStages().slice(3, 6).map(s => (
                      <StageSelectButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages?.includes(s.id)} onClick={handleSelectStage} isClicked={clickedItemId === s.id} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                    <div className="hidden sm:block sm:col-span-1" />
                    {getAllStages().slice(6, 8).map(s => (
                      <StageSelectButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages?.includes(s.id)} onClick={handleSelectStage} isClicked={clickedItemId === s.id} colSpan="sm:col-span-2" />
                    ))}
                    <div className="hidden sm:block sm:col-span-1" />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Character Select Phase ── */}

        {/* Animación VS: ambos eligieron, esperando transición a STAGE_BAN */}
        {session.phase === 'CHARACTER_SELECT' && session.player1.character && session.player2.character && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4" style={{ background: 'rgba(0,0,0,0.97)' }}>
            <style>{`
              @keyframes vsSlideLeft { from{transform:translateX(-70px);opacity:0} to{transform:translateX(0);opacity:1} }
              @keyframes vsSlideRight { from{transform:translateX(70px);opacity:0} to{transform:translateX(0);opacity:1} }
              @keyframes vsPopIn { 0%{transform:scale(0.3) rotate(-8deg);opacity:0} 70%{transform:scale(1.12) rotate(2deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
            `}</style>
            <p className="text-white/50 text-xs uppercase tracking-widest font-semibold">¡Ambos eligieron!</p>
            <div className="flex items-center gap-6 sm:gap-14">
              <div className="text-center" style={{ animation: 'vsSlideLeft 0.45s cubic-bezier(.22,.68,0,1.2) forwards' }}>
                <div className="w-32 h-32 sm:w-44 sm:h-44 mx-auto rounded-full overflow-hidden border-4 border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <img src={getStockIconPath(session.player1.character, session.player1.skin || 1)} alt="" className="w-full h-full object-contain drop-shadow-2xl" style={{ imageRendering: 'crisp-edges' }} onError={(e) => { e.target.style.display='none'; }} />
                </div>
                <p className="text-white font-black text-sm mt-2 truncate max-w-[130px]" style={{ fontFamily: 'Anton' }}>{session.player1.name}</p>
                <p className="text-white/50 text-xs">{getCharacterData(session.player1.character)?.name}</p>
              </div>
              <div style={{ animation: 'vsPopIn 0.45s 0.3s cubic-bezier(.22,.68,0,1.2) both' }}>
                <span style={{ fontFamily: 'Anton', fontSize: 'clamp(3rem, 10vw, 5rem)', color: '#F59E0B', textShadow: '0 0 40px rgba(245,158,11,0.9), 3px 3px 0 #000' }}>VS</span>
              </div>
              <div className="text-center" style={{ animation: 'vsSlideRight 0.45s cubic-bezier(.22,.68,0,1.2) forwards' }}>
                <div className="w-32 h-32 sm:w-44 sm:h-44 mx-auto rounded-full overflow-hidden border-4 border-white/10" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <img src={getStockIconPath(session.player2.character, session.player2.skin || 1)} alt="" className="w-full h-full object-contain drop-shadow-2xl" style={{ imageRendering: 'crisp-edges' }} onError={(e) => { e.target.style.display='none'; }} />
                </div>
                <div>
                  <p className="text-white font-black text-sm mt-2 truncate max-w-[130px]" style={{ fontFamily: 'Anton' }}>{session.player2.name}</p>
                  <p className="text-white/50 text-xs">{getCharacterData(session.player2.character)?.name}</p>
                </div>
              </div>
            </div>
            <p className="text-white/30 text-xs mt-2">Preparando ban de escenarios...</p>
          </div>
        )}

        {session.phase === 'CHARACTER_SELECT' && effectivePlayer && session.currentTurn !== effectivePlayer && (
          <WaitingTurnCard icon="👤" turnPlayerName={session[session.currentTurn]?.name} action="eligiendo su personaje" />
        )}
        {session.phase === 'CHARACTER_SELECT' && (!effectivePlayer || session.currentTurn === effectivePlayer) && (
          <div className="rounded-xl border border-white/20">
            {/* Sub-header sticky (debajo del header principal) */}
            <div className="sticky top-[72px] sm:top-[88px] z-30 bg-black/95 backdrop-blur-md px-2 sm:px-4 pt-2 sm:pt-3 pb-2 border-b border-white/20 rounded-t-xl">
              <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                <div>
                  <h3 className="text-lg sm:text-2xl font-bold text-white">👤 Seleccionar Personaje</h3>
                  <p className={`text-xs sm:text-base font-semibold truncate ${myPlayer && myPlayer === session.currentTurn ? 'text-yellow-400 font-black' : 'text-white'}`}>
                    {myPlayer && myPlayer === session.currentTurn ? '⚡ ¡Es tu turno!' : `Turno: ${session[session.currentTurn]?.name}`} | Stage: {getStageData(session.selectedStage)?.name}
                  </p>
                </div>
              </div>
              {/* Banner: el rival ya eligió su personaje */}
              {effectivePlayer && (() => {
                const oppKey = effectivePlayer === 'player1' ? 'player2' : 'player1';
                const oppChar = session[oppKey]?.character;
                if (!oppChar) return null;
                const cd = getCharacterData(oppChar);
                return (
                  <div className="mb-2 flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-2 py-1.5">
                    <img src={cd?.image} alt={cd?.name} className="w-10 h-10 object-contain flex-shrink-0" onError={(e) => { e.target.style.display='none'; }} />
                    <div>
                      <p className="text-yellow-300 text-[10px] sm:text-xs font-bold uppercase tracking-wide">Tu rival ya eligió:</p>
                      <p className="text-white text-xs sm:text-sm font-black leading-tight">{cd?.name}</p>
                    </div>
                  </div>
                );
              })()}
              {/* Picks anteriores del jugador */}
              {playerPickHistory.length > 0 && (
                <div className="mb-2">
                  <p className="text-white/50 text-[10px] sm:text-xs uppercase tracking-wider mb-1.5 font-semibold">Personajes seleccionados anteriormente</p>
                  <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {playerPickHistory.map((charId) => {
                      const char = CHARACTERS.find(c => c.id === charId);
                      if (!char) return null;
                      return (
                        <button
                          key={charId}
                          onClick={() => handleSelectCharacter(charId)}
                          title={char.name}
                          className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-lg border-2 active:scale-95 touch-manipulation overflow-hidden relative ${
                            clickedItemId === charId ? 'border-green-400 shadow-green-500/30' : 'border-smash-yellow/60'
                          }`}
                        >
                          <img
                            src={char.image}
                            alt={char.name}
                            className="w-full h-full object-contain"
                            onError={(e) => { e.target.style.display='none'; }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <input
                type="text"
                placeholder="Buscar personaje..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none text-xs sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3 p-2 sm:p-4 pb-4 bg-white/10">
              {/* Botón aleatorio "?" - siempre visible */}
              <button
                onClick={handleRandomCharacter}
                className="aspect-square rounded-lg sm:rounded-xl flex flex-col items-center justify-center active:scale-95 border-2 border-smash-yellow/70 touch-manipulation"
                style={{ background: 'linear-gradient(135deg, #78350f, #b45309)' }}
                title="Aleatorio"
              >
                <span className="text-white font-black" style={{ fontFamily: 'Anton', fontSize: 'clamp(1.5rem, 5vw, 2.5rem)' }}>?</span>
              </button>
              {filteredCharacters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => handleSelectCharacter(character.id)}
                  className={`aspect-square bg-white/5 rounded-lg sm:rounded-xl p-1 flex flex-col items-center justify-center overflow-hidden active:scale-95 border-2 touch-manipulation relative ${
                    clickedItemId === character.id ? 'border-green-400 shadow-lg shadow-green-500/30 scale-95' : 'border-white/20'
                  }`}
                  title={character.name}
                >
                  <img
                    src={character.image}
                    alt={character.name}
                    className="w-full h-full object-contain"
                    onError={(e) => { e.target.style.display='none'; }}
                  />
                  {clickedItemId === character.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/30 backdrop-blur-[1px] rounded-lg">
                      <span className="text-green-400 text-3xl sm:text-4xl drop-shadow-2xl">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Playing Phase ── */}
        {session.phase === 'PLAYING' && (
          <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.5) 100%)' }}>
            {/* Header */}
            <div className="text-center py-3 bg-white/5 border-b border-white/10">
              <h3 className="text-2xl sm:text-3xl font-black text-white" style={{ textShadow: '0 0 30px rgba(255,255,255,0.3), 2px 2px 0 rgba(0,0,0,0.8)' }}>¡EN COMBATE!</h3>
              <p className="text-white/50 text-xs uppercase tracking-widest font-semibold">Game {session.currentGame}</p>
            </div>
            {/* 3 col: P1 | Stage | P2 */}
            <div className="grid grid-cols-3">
              {/* Player 1 */}
              <div className="flex flex-col items-center p-3 border-r border-white/10" style={{ background: 'linear-gradient(160deg, rgba(185,28,28,0.35) 0%, rgba(0,0,0,0) 100%)' }}>
                <div className="w-full flex items-center justify-between mb-1">
                  <span className="text-[9px] text-smash-red font-black uppercase tracking-widest">J1</span>
                  {session.player1.character && session.player1.character !== 'random' && (
                    <img src={getStockIconPath(session.player1.character, session.player1.skin || 1)} alt="" className="w-6 h-6 rounded-full border border-white/30 shadow-lg" onError={(e) => { e.target.style.display = 'none'; }} />
                  )}
                </div>
                <div className="w-full flex-1 flex items-center justify-center min-h-[80px] sm:min-h-[110px]">
                  {session.player1.character ? (
                    session.player1.character === 'random' ? (
                      <span className="text-5xl sm:text-6xl">❓</span>
                    ) : (
                      <img src={getCharacterData(session.player1.character)?.image} alt="" className="w-full max-h-[90px] sm:max-h-[120px] object-contain drop-shadow-2xl" onError={(e) => { e.target.style.display = 'none'; }} />
                    )
                  ) : <span className="text-white/20 text-4xl">?</span>}
                </div>
                <div className="text-center w-full mt-2">
                  <p className="text-white font-black text-xs sm:text-sm truncate">{session.player1.name}</p>
                  <p className="text-white/50 text-[10px] truncate mb-2">{getCharacterData(session.player1.character)?.name || '—'}</p>
                  <div className="bg-smash-yellow/20 border border-smash-yellow/40 rounded-lg py-1 px-1">
                    <p className="text-smash-yellow text-2xl sm:text-3xl font-black leading-none">{session.player1.score}</p>
                  </div>
                </div>
              </div>
              {/* Center: Stage */}
              <div className="flex flex-col items-center justify-center p-2 gap-2">
                {session.selectedStage ? (
                  <>
                    <div className="w-full rounded-xl overflow-hidden border-2 border-green-400/60 shadow-lg shadow-green-500/20">
                      <img src={getStageData(session.selectedStage)?.image} alt="" className="w-full object-cover" style={{ aspectRatio: '16/9' }} onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                    <p className="text-white/80 text-[10px] sm:text-xs font-black text-center uppercase tracking-wide leading-tight">{getStageData(session.selectedStage)?.name}</p>
                  </>
                ) : null}
                <div className="bg-white/20 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border-2 sm:border-4 border-white/30">
                  <span className="text-white font-black text-sm sm:text-lg">VS</span>
                </div>
              </div>
              {/* Player 2 */}
              <div className="flex flex-col items-center p-3 border-l border-white/10" style={{ background: 'linear-gradient(200deg, rgba(29,78,216,0.35) 0%, rgba(0,0,0,0) 100%)' }}>
                <div className="w-full flex items-center justify-between mb-1">
                  {session.player2.character && session.player2.character !== 'random' && (
                    <img src={getStockIconPath(session.player2.character, session.player2.skin || 1)} alt="" className="w-6 h-6 rounded-full border border-white/30 shadow-lg" onError={(e) => { e.target.style.display = 'none'; }} />
                  )}
                  <span className="text-[9px] text-smash-blue font-black uppercase tracking-widest ml-auto">J2</span>
                </div>
                <div className="w-full flex-1 flex items-center justify-center min-h-[80px] sm:min-h-[110px]" style={{ transform: 'scaleX(-1)' }}>
                  {session.player2.character ? (
                    session.player2.character === 'random' ? (
                      <span className="text-5xl sm:text-6xl" style={{ transform: 'scaleX(-1)' }}>❓</span>
                    ) : (
                      <img src={getCharacterData(session.player2.character)?.image} alt="" className="w-full max-h-[90px] sm:max-h-[120px] object-contain drop-shadow-2xl" onError={(e) => { e.target.style.display = 'none'; }} />
                    )
                  ) : <span className="text-white/20 text-4xl" style={{ transform: 'scaleX(-1)' }}>?</span>}
                </div>
                <div className="text-center w-full mt-2">
                  <p className="text-white font-black text-xs sm:text-sm truncate">{session.player2.name}</p>
                  <p className="text-white/50 text-[10px] truncate mb-2">{getCharacterData(session.player2.character)?.name || '—'}</p>
                  <div className="bg-smash-yellow/20 border border-smash-yellow/40 rounded-lg py-1 px-1">
                    <p className="text-smash-yellow text-2xl sm:text-3xl font-black leading-none">{session.player2.score}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 border-t border-white/10 bg-white/5">
              <p className="text-white/60 text-xs text-center mb-2 font-semibold uppercase tracking-wider">🏆 ¿Quién ganó el Game {session.currentGame}?</p>
              {/* Si hay propuesta pendiente y soy el otro jugador: confirmar/rechazar */
              session.winnerProposal && myPlayer && session.winnerProposal.proposedBy !== myPlayer ? (
                <div className="text-center">
                  <div className="text-4xl mb-2">🤔</div>
                  <p className="text-white/80 text-sm mb-3">
                    <span className="font-bold text-yellow-400">{session[session.winnerProposal.proposedBy]?.name}</span> dice que{' '}
                    <span className="font-bold text-white">{session[session.winnerProposal.winner]?.name}</span> ganó el Game {session.currentGame}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setGameWinner(sessionId, session.winnerProposal.winner, session?.matchToken)}
                      className="py-4 rounded-xl border-2 border-green-400/60 font-black text-sm active:scale-95 touch-manipulation transition-all"
                      style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.35), rgba(22,163,74,0.25))', color: '#fff', fontFamily: 'inherit', cursor: 'pointer' }}
                    >
                      ✅ Confirmar
                    </button>
                    <button
                      onClick={() => rejectGameWinner(sessionId)}
                      className="py-4 rounded-xl border-2 border-red-400/60 font-black text-sm active:scale-95 touch-manipulation transition-all"
                      style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.35), rgba(185,28,28,0.25))', color: '#fff', fontFamily: 'inherit', cursor: 'pointer' }}
                    >
                      ❌ Rechazar
                    </button>
                  </div>
                </div>
              ) : session.winnerProposal && myPlayer && session.winnerProposal.proposedBy === myPlayer ? (
                /* Ya propuse, esperando confirmación del otro */
                <div className="text-center py-2">
                  <div className="text-4xl mb-2 animate-pulse">⏳</div>
                  <p className="text-white/80 text-sm mb-1">
                    Propusiste que <span className="font-bold text-yellow-400">{session[session.winnerProposal.winner]?.name}</span> ganó
                  </p>
                  <p className="text-white/40 text-xs mb-3">Esperando confirmación del rival...</p>
                  <button
                    onClick={() => rejectGameWinner(sessionId)}
                    className="px-4 py-2 rounded-xl border border-white/20 text-white/50 text-xs font-bold active:scale-95 touch-manipulation"
                    style={{ background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}
                  >
                    Cancelar propuesta
                  </button>
                </div>
              ) : (
                /* Vista normal: proponer ganador */
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSetGameWinner('player1')}
                    className="py-4 sm:py-5 rounded-xl font-black text-base sm:text-lg text-white active:scale-95 transition-all shadow-2xl border-2 border-smash-red/60 touch-manipulation"
                    style={{ background: 'linear-gradient(135deg, #7f1d1d, #991b1b)' }}
                  >
                    🏆<br />
                    <span className="truncate block px-1 mt-1">{session.player1.name}</span>
                  </button>
                  <button
                    onClick={() => handleSetGameWinner('player2')}
                    className="py-4 sm:py-5 rounded-xl font-black text-base sm:text-lg text-white active:scale-95 transition-all shadow-2xl border-2 border-smash-blue/60 touch-manipulation"
                    style={{ background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)' }}
                  >
                    🏆<br />
                    <span className="truncate block px-1 mt-1">{session.player2.name}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Cancelled / Postponed Phase ── */}
        {(session.phase === 'CANCELLED' || session.phase === 'POSTPONED') && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-2xl border border-white/20 text-center flex-1 flex flex-col justify-center">
            <div className="text-7xl mb-4">⚠️</div>
            <h3 className="text-3xl font-bold text-white mb-3">Match cancelado</h3>
            <p className="text-white/60 text-base mb-6">El administrador canceló o pospuso este match.</p>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-white/70 text-sm">Esperá instrucciones del admin para continuar.</p>
            </div>
            <button
              onClick={() => { if (typeof window !== 'undefined') window.location.href = '/home'; }}
              className="mt-6 w-full py-4 rounded-2xl font-black text-white text-lg active:scale-95 touch-manipulation transition-all border-2 border-white/20"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              🏠 Volver al Home
            </button>
          </div>
        )}

        {/* ── Finished Phase ── */}
        {session.phase === 'FINISHED' && !finishedDismissed && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-2xl border border-white/20 text-center flex flex-col justify-center">
            <div className="text-7xl mb-4 animate-bounce">🏆</div>
            <h3 className="text-4xl font-bold text-white mb-4">¡Serie Finalizada!</h3>
            <div className="rounded-xl p-4 mb-4 border-2 bg-smash-yellow/20 border-smash-yellow/50">
              <p className="text-white/70 text-sm mb-1">Ganador</p>
              <p className="text-smash-yellow text-3xl font-bold">
                {session.player1.score > session.player2.score ? session.player1.name : session.player2.name}
              </p>
            </div>
            <p className="text-white text-2xl font-bold mb-6">
              Score Final: <span className="text-smash-red">{session.player1.score}</span> - <span className="text-smash-blue">{session.player2.score}</span>
            </p>
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <p className="text-white/90 text-base">⏳ Esta pantalla se cerrará en 5 segundos...</p>
            </div>
          </div>
        )}


        {/* ── Modal: Repetir personaje - Player 1 ── */}
        {showRepeatModal.player1 && (previousCharacters.player1 || session?.lastCharacters?.player1) && (!effectivePlayer || effectivePlayer === 'player1') && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-smash-red to-red-800 rounded-2xl p-8 shadow-2xl border-4 border-white max-w-lg w-full">
              <div className="text-center mb-6">
                <div className="text-7xl mb-4">🔄</div>
                <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Anton', textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}>{session.player1.name}</h3>
                <p className="text-white text-xl mb-4">¿Quieres repetir tu personaje anterior?</p>
                <div className="bg-black/40 rounded-xl p-6 border-2 border-white/30">
                  <img src={getCharacterData(previousCharacters.player1 || session?.lastCharacters?.player1)?.image} alt={getCharacterData(previousCharacters.player1 || session?.lastCharacters?.player1)?.name} className="w-32 h-32 mx-auto mb-3 rounded-full border-4 border-white shadow-2xl" onError={(e) => { e.target.style.display = 'none'; }} />
                  <p className="text-white text-2xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{getCharacterData(previousCharacters.player1 || session?.lastCharacters?.player1)?.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleRepeatCharacter('player1', false)} className="py-5 bg-gray-700 hover:bg-gray-800 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white/30">❌ NO</button>
                <button onClick={() => handleRepeatCharacter('player1', true)} className="py-5 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white">✓ SÍ</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Repetir personaje - Player 2 ── */}
        {showRepeatModal.player2 && (previousCharacters.player2 || session?.lastCharacters?.player2) && (!effectivePlayer || effectivePlayer === 'player2') && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-smash-blue to-blue-800 rounded-2xl p-8 shadow-2xl border-4 border-white max-w-lg w-full">
              <div className="text-center mb-6">
                <div className="text-7xl mb-4">🔄</div>
                <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Anton', textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}>{session.player2.name}</h3>
                <p className="text-white text-xl mb-4">¿Quieres repetir tu personaje anterior?</p>
                <div className="bg-black/40 rounded-xl p-6 border-2 border-white/30">
                  <img src={getCharacterData(previousCharacters.player2 || session?.lastCharacters?.player2)?.image} alt={getCharacterData(previousCharacters.player2 || session?.lastCharacters?.player2)?.name} className="w-32 h-32 mx-auto mb-3 rounded-full border-4 border-white shadow-2xl" onError={(e) => { e.target.style.display = 'none'; }} />
                  <p className="text-white text-2xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{getCharacterData(previousCharacters.player2 || session?.lastCharacters?.player2)?.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleRepeatCharacter('player2', false)} className="py-5 bg-gray-700 hover:bg-gray-800 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white/30">❌ NO</button>
                <button onClick={() => handleRepeatCharacter('player2', true)} className="py-5 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white">✓ SÍ</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Repetir stage (propuesta inicial del jugador con turno) ── */}
        {showRepeatStageModal && session.previousStageData?.selectedStage && (!effectivePlayer || session.currentTurn === effectivePlayer) && !session.repeatStageProposal && (() => {
          const stageInfo = getStageData(session.previousStageData.selectedStage);
          return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 sm:p-8 shadow-2xl border-4 border-smash-yellow max-w-lg w-full">
                <div className="text-center mb-5">
                  <div className="text-5xl mb-3">🗺️</div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Anton', textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}>¿Repetir stage?</h3>
                  <div className="bg-white/10 rounded-xl overflow-hidden border-2 border-white/30 mb-3">
                    {stageInfo?.image && (
                      <img
                        src={stageInfo.image}
                        alt={stageInfo?.name}
                        className="w-full h-32 object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <p className="text-white text-xl font-bold py-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{stageInfo?.name}</p>
                  </div>
                  <p className="text-white/60 text-sm">Tu rival deberá confirmar</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleRepeatStage(false)}
                    className="py-4 bg-gray-700 text-white font-bold text-lg rounded-xl transition-all active:scale-95 border-2 border-white/30 touch-manipulation"
                  >
                    ❌ NO
                  </button>
                  <button
                    onClick={() => handleRepeatStage(true)}
                    className="py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-lg rounded-xl transition-all active:scale-95 border-2 border-white touch-manipulation"
                  >
                    ✓ SÍ
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Modal: Repeat stage proposal - Rival confirma/rechaza ── */}
        {session.repeatStageProposal && myPlayer && session.repeatStageProposal.proposedBy !== myPlayer && session.previousStageData?.selectedStage && (() => {
          const stageInfo = getStageData(session.previousStageData.selectedStage);
          const proposerName = session[session.repeatStageProposal.proposedBy]?.name;
          return (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 sm:p-8 shadow-2xl border-4 border-smash-yellow max-w-lg w-full">
                <div className="text-center mb-5">
                  <div className="text-5xl mb-3">🤔</div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Anton', textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}>¿Repetir stage?</h3>
                  <p className="text-white/80 text-base mb-3">
                    <span className="font-bold text-yellow-400">{proposerName}</span> quiere repetir el stage anterior
                  </p>
                  <div className="bg-white/10 rounded-xl overflow-hidden border-2 border-white/30 mb-3">
                    {stageInfo?.image && (
                      <img
                        src={stageInfo.image}
                        alt={stageInfo?.name}
                        className="w-full h-32 object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <p className="text-white text-xl font-bold py-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{stageInfo?.name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => rejectRepeatStage(sessionId)}
                    className="py-4 rounded-xl border-2 border-red-400/60 font-black text-lg active:scale-95 touch-manipulation transition-all"
                    style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.35), rgba(185,28,28,0.25))', color: '#fff' }}
                  >
                    ❌ Rechazar
                  </button>
                  <button
                    onClick={() => confirmRepeatStage(sessionId)}
                    className="py-4 rounded-xl border-2 border-green-400/60 font-black text-lg active:scale-95 touch-manipulation transition-all"
                    style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.35), rgba(22,163,74,0.25))', color: '#fff' }}
                  >
                    ✅ Confirmar
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Modal: Repeat stage proposal - Esperando confirmación ── */}
        {session.repeatStageProposal && myPlayer && session.repeatStageProposal.proposedBy === myPlayer && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-6 sm:p-8 shadow-2xl border-4 border-smash-yellow max-w-lg w-full">
              <div className="text-center">
                <div className="text-5xl mb-4 animate-pulse">⏳</div>
                <h3 className="text-xl font-black text-white mb-2">Esperando confirmación</h3>
                <p className="text-white/70 text-sm mb-4">Tu rival debe confirmar si repite el stage...</p>
                <button
                  onClick={() => rejectRepeatStage(sessionId)}
                  className="px-4 py-2 rounded-xl border border-white/20 text-white/50 text-xs font-bold active:scale-95 touch-manipulation"
                  style={{ background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}
                >
                  Cancelar propuesta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Skin Picker Modal ── */}
        {skinModal && (
          <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border-4 border-smash-yellow max-w-xs w-full p-4">
              <div className="text-center mb-4">
                <img src={getStockIconPath(skinModal.characterId, 1)} alt="" className="w-16 h-16 mx-auto mb-2 rounded-full border-2 border-smash-yellow" onError={(e) => { e.target.style.display = 'none'; }} />
                <h3 className="text-white font-black text-xl">🎨 Elegir skin</h3>
                <p className="text-smash-yellow font-bold text-sm">{skinModal.characterName}</p>
              </div>
              <div className={`grid gap-2 mb-4 ${getSkinCount(skinModal.characterId) <= 4 ? 'grid-cols-2' : getSkinCount(skinModal.characterId) <= 6 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {Array.from({ length: getSkinCount(skinModal.characterId) }, (_, i) => i + 1).map(skin => {
                  const otherPlayer = skinModal.player === 'player1' ? 'player2' : 'player1';
                  const isTaken = session[otherPlayer]?.character === skinModal.characterId && parseInt(session[otherPlayer]?.skin) === skin;
                  return (
                    <button
                      key={skin}
                      onClick={() => !isTaken && handleConfirmSkin(skin)}
                      disabled={isTaken}
                      className={`relative rounded-xl p-1 border-2 touch-manipulation transition-all ${isTaken ? 'border-red-500/50 opacity-40 cursor-not-allowed' : 'border-white/30 active:scale-95 hover:border-smash-yellow'}`}
                    >
                      <img src={getStockIconPath(skinModal.characterId, skin)} alt={`Skin ${skin}`} className="w-full aspect-square object-cover rounded-lg" onError={(e) => { e.target.style.display = 'none'; }} />
                      {isTaken && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-red-900/60">
                          <span className="text-red-400 text-2xl">🚫</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => { setSkinModal(null); setClickedItemId(null); }} className="w-full py-3 rounded-xl border border-white/20 text-white/60 font-bold text-sm active:scale-95 touch-manipulation" style={{ background: 'rgba(255,255,255,0.05)', fontFamily: 'inherit' }}>❌ Cancelar</button>
            </div>
          </div>
        )}

        {/* ── Modal: Confirmación de acción ── */}
        {pendingAction && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-4 shadow-2xl border-4 border-smash-yellow max-w-sm w-full">
              <div className="text-center mb-6">
                <div className="mb-4 flex justify-center">
                  {pendingAction.type === 'character' && pendingAction.isRandom ? (
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-900 to-yellow-700 rounded-full border-4 border-smash-yellow flex items-center justify-center">
                      <span className="text-white font-black text-3xl" style={{ fontFamily: 'Anton' }}>?</span>
                    </div>
                  ) : pendingAction.type === 'character' && pendingAction.characterImage ? (
                    <div className="w-16 h-16 bg-white/10 rounded-full border-4 border-smash-yellow overflow-hidden flex items-center justify-center">
                      <img src={pendingAction.characterImage} alt={pendingAction.characterName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="text-4xl">
                      {pendingAction.type === 'rps' && '✊✋✌️'}
                      {pendingAction.type === 'ban' && '❌'}
                      {pendingAction.type === 'select' && '🎯'}
                      {pendingAction.type === 'character' && '👤'}
                      {pendingAction.type === 'winner' && '🏆'}
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">¿Confirmar selección?</h3>
                <div className="bg-white/10 rounded-xl p-2 mt-2">
                  {pendingAction.type === 'rps' && <p className="text-white text-base"><span className="text-smash-yellow font-bold">{pendingAction.playerName}</span> ganó el RPS</p>}
                  {pendingAction.type === 'ban' && <p className="text-white text-base">Banear <span className="text-red-400 font-bold">{pendingAction.stageName}</span></p>}
                  {pendingAction.type === 'select' && <p className="text-white text-base">Seleccionar <span className="text-green-400 font-bold">{pendingAction.stageName}</span></p>}
                  {pendingAction.type === 'character' && <p className="text-white text-base">Seleccionar <span className="text-smash-yellow font-bold">{pendingAction.characterName}</span></p>}
                  {pendingAction.type === 'winner' && <p className="text-white text-base"><span className="text-smash-yellow font-bold">{pendingAction.playerName}</span> ganó el game 🏆</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={cancelAction} className="py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold text-sm rounded-lg transition-all active:scale-95">❌ Cancelar</button>
                <button onClick={confirmAction} className="py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-sm rounded-lg transition-all active:scale-95">✓ Confirmar</button>
              </div>
            </div>
          </div>
        )}

      </div>{/* fin contenido scrollable */}

      {/* ── Modal de anuncio de turno (solo singleDeviceMode) ── */}
      {session?.singleDeviceMode && turnModal && (
        <>
          <style>{`
            @keyframes modalPop {
              0%   { opacity: 0; transform: scale(0.75) translateY(24px); }
              70%  { transform: scale(1.03) translateY(-4px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes accentPulse {
              0%, 100% { opacity: 0.7; }
              50%       { opacity: 1; }
            }
            @keyframes fadeSlideUp {
              from { opacity: 0; transform: translateY(12px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div
            className="fixed inset-0 flex items-center justify-center z-[60]"
            style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)' }}
            onClick={() => setTurnModal(null)}
          >
            <div
              className="relative max-w-sm w-full mx-5 text-center overflow-hidden"
              style={{
                background: turnModal.gradient,
                borderRadius: '28px',
                boxShadow: `0 0 0 1px rgba(255,255,255,0.1), 0 32px 64px rgba(0,0,0,0.7), 0 0 60px ${turnModal.accent}33`,
                animation: 'modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0" style={{ height: '3px', background: `linear-gradient(90deg, transparent, ${turnModal.accent}, transparent)`, animation: 'accentPulse 2s ease-in-out infinite' }} />
              <div className="px-8 pt-10 pb-8">
                <div className="mx-auto mb-5 flex items-center justify-center text-5xl" style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: `2px solid ${turnModal.accent}66`, boxShadow: `0 0 24px ${turnModal.accent}44`, animation: 'fadeSlideUp 0.35s ease both 0.05s' }}>
                  {turnModal.icon}
                </div>
                <p className="font-bold uppercase" style={{ color: turnModal.accent, fontSize: '0.7rem', letterSpacing: '0.22em', animation: 'fadeSlideUp 0.35s ease both 0.12s', opacity: 0, animationFillMode: 'forwards' }}>
                  {turnModal.subtitle}
                </p>
                <div className="mx-auto my-4" style={{ width: 48, height: '1px', background: `linear-gradient(90deg, transparent, ${turnModal.accent}88, transparent)` }} />
                <p className="text-white font-black leading-none mb-8" style={{ fontFamily: 'Anton', fontSize: 'clamp(2.5rem, 10vw, 3.5rem)', textShadow: `0 4px 20px rgba(0,0,0,0.6), 0 0 40px ${turnModal.accent}44`, animation: 'fadeSlideUp 0.35s ease both 0.18s', opacity: 0, animationFillMode: 'forwards' }}>
                  {turnModal.playerName}
                </p>
                <button onClick={() => setTurnModal(null)} className="w-full py-4 font-bold text-sm text-white active:scale-95 transition-transform touch-manipulation" style={{ borderRadius: '16px', background: `linear-gradient(135deg, ${turnModal.accent}33, ${turnModal.accent}18)`, border: `1px solid ${turnModal.accent}55`, boxShadow: `0 4px 16px ${turnModal.accent}22`, letterSpacing: '0.05em', animation: 'fadeSlideUp 0.35s ease both 0.25s', opacity: 0, animationFillMode: 'forwards' }}>
                  Entendido ✓
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0" style={{ height: '80px', background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)', pointerEvents: 'none' }} />
            </div>
          </div>
        </>
      )}

      {/* ── Botón Home flotante ── */}
      <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 70 }}>
        <button
          onClick={() => { window.location.href = '/home'; }}
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(255,255,255,0.2)',
            color: 'white',
            fontSize: 22,
            cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          🏠
        </button>
      </div>

    </div>
  );
}
