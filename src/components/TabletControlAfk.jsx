// ============================================================
// TABLET CONTROL - AFK (Buenos Aires)
// Archivo exclusivo para AFK. No tocar para Córdoba ni Mendoza.
// Stages Game 1: Battlefield, Smashville, Town and City, Small Battlefield, Pokemon Stadium 2
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { CHARACTERS, getStageData, getCharacterData, getStagesForTournament } from '../utils/constants';

// ── Componente de botón de stage reutilizable ──────────────
function StageButton({ stageId, stageName, stageImage, isBanned, onClick, colSpan = '' }) {
  return (
    <button
      onClick={() => { if (!isBanned) onClick(stageId); }}
      disabled={isBanned}
      className={`${colSpan} relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
        isBanned
          ? 'cursor-not-allowed border-white/20'
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
    </button>
  );
}

function StageSelectButton({ stageId, stageName, stageImage, isBanned, onClick, colSpan = '' }) {
  return (
    <button
      onClick={() => onClick(stageId)}
      className={`${colSpan} relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation`}
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
    </button>
  );
}

// ── Stages hardcodeados para Game 1 de AFK ─────────────────
const GAME1_STAGES_AFK = [
  { id: 'battlefield',       name: 'Battlefield',       image: '/images/stages/Battlefield.png' },
  { id: 'smashville',        name: 'Smashville',        image: '/images/stages/Smashville.png' },
  { id: 'town-and-city',     name: 'Town and City',     image: '/images/stages/Town and City.png' },
  { id: 'small-battlefield', name: 'Small Battlefield', image: '/images/stages/Small Battlefield.png' },
  { id: 'pokemon-stadium-2', name: 'Pokémon Stadium 2', image: '/images/stages/Pokemon Stadium 2.png' },
];

// ─────────────────────────────────────────────────────────────
export default function TabletControlAfk({ sessionId }) {
  const { session, selectRPSWinner, banStage, selectStage, selectCharacter, setGameWinner, repeatStage, getPlayerHistory } = useWebSocket(sessionId);
  const error = session ? null : 'Conectando...';

  const [searchTerm, setSearchTerm] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [showRepeatModal, setShowRepeatModal] = useState({ player1: false, player2: false });
  const [previousCharacters, setPreviousCharacters] = useState({ player1: null, player2: null });
  const [hasAskedRepeat, setHasAskedRepeat] = useState({ player1: false, player2: false });
  const [lastGameSaved, setLastGameSaved] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [isActionBlocked, setIsActionBlocked] = useState(false);
  const [turnModal, setTurnModal] = useState(null);
  const [previousStageData, setPreviousStageData] = useState({ bannedStages: [], selectedStage: null });
  const [showRepeatStageModal, setShowRepeatStageModal] = useState(false);
  const [hasAskedRepeatStage, setHasAskedRepeatStage] = useState(false);
  const [playerPickHistory, setPlayerPickHistory] = useState([]);
  const isFirstRender = useRef(true);
  const prevPhaseRef = useRef(null);
  const prevTurnRef = useRef(null);

  // Guardar personajes cuando ambos seleccionaron
  useEffect(() => {
    if (!session) return;
    if (session.player1.character && session.player2.character && lastGameSaved !== session.currentGame) {
      setPreviousCharacters({ player1: session.player1.character, player2: session.player2.character });
      setLastGameSaved(session.currentGame);
    }
  }, [session?.player1?.character, session?.player2?.character, session?.currentGame, lastGameSaved]);

  // Guardar datos del stage cuando entra en PLAYING
  useEffect(() => {
    if (!session) return;
    if (session.phase === 'PLAYING' && session.selectedStage) {
      setPreviousStageData({
        bannedStages: [...(session.bannedStages || [])],
        selectedStage: session.selectedStage,
      });
    }
  }, [session?.phase, session?.selectedStage]);

  // Mostrar modal de repetir stage al entrar a STAGE_BAN en game 2+
  useEffect(() => {
    if (!session) return;
    if (
      session.phase === 'STAGE_BAN' &&
      session.currentGame >= 2 &&
      !hasAskedRepeatStage &&
      previousStageData.selectedStage
    ) {
      setShowRepeatStageModal(true);
      setHasAskedRepeatStage(true);
    }
  }, [session?.phase, session?.currentGame, hasAskedRepeatStage, previousStageData.selectedStage]);

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

  // Modales de repetir personaje
  useEffect(() => {
    if (!session) return;
    if (session.currentGame >= 2 && session.phase === 'CHARACTER_SELECT') {
      if (session.currentTurn === 'player1' && !hasAskedRepeat.player1 && !session.player1.character && previousCharacters.player1 && !showRepeatModal.player1) {
        setShowRepeatModal({ player1: true, player2: false });
        setHasAskedRepeat(prev => ({ ...prev, player1: true }));
      }
      if (session.currentTurn === 'player2' && !hasAskedRepeat.player2 && !session.player2.character && previousCharacters.player2 && !showRepeatModal.player2) {
        setShowRepeatModal({ player1: false, player2: true });
        setHasAskedRepeat(prev => ({ ...prev, player2: true }));
      }
    }
  }, [session?.currentGame, session?.phase, session?.currentTurn, session?.player1?.character, session?.player2?.character, hasAskedRepeat, previousCharacters, showRepeatModal]);

  // ── Detectar cambios de fase/turno para mostrar modal de anuncio ──────────
  useEffect(() => {
    if (!session) return;
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

    // Transición de fase
    if (prevPhase !== session.phase) {
      if (session.phase === 'STAGE_BAN' && turn) {
        setTurnModal({ icon: '❌', subtitle: 'Le toca BANEAR stage a:', playerName: name, gradient: 'linear-gradient(135deg,#7f1d1d,#991b1b)' });
      } else if (session.phase === 'STAGE_SELECT' && turn) {
        setTurnModal({ icon: '🎯', subtitle: 'Le toca ELEGIR stage a:', playerName: name, gradient: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' });
      } else if (session.phase === 'CHARACTER_SELECT' && turn) {
        setTurnModal({ icon: '👤', subtitle: '¡Elige personaje primero!', playerName: name, gradient: 'linear-gradient(135deg,#1a1a2e,#16213e)' });
      }
    } else if (prevTurn !== turn && turn && session.phase !== 'RPS') {
      // Cambio de turno dentro de la misma fase
      if (session.phase === 'STAGE_BAN') {
        setTurnModal({ icon: '❌', subtitle: 'Ahora le toca BANEAR a:', playerName: name, gradient: 'linear-gradient(135deg,#7f1d1d,#991b1b)' });
      } else if (session.phase === 'CHARACTER_SELECT') {
        setTurnModal({ icon: '👤', subtitle: '¡Ahora te toca elegir a vos!', playerName: name, gradient: 'linear-gradient(135deg,#1a1a2e,#16213e)' });
      }
    }
    prevPhaseRef.current = session.phase;
    prevTurnRef.current = session.currentTurn;
  }, [session?.phase, session?.currentTurn]);

  // Auto-dismiss del modal de turno después de 4s
  useEffect(() => {
    if (turnModal) {
      const t = setTimeout(() => setTurnModal(null), 4000);
      return () => clearTimeout(t);
    }
  }, [turnModal]);

  const handleRepeatCharacter = (player, repeat) => {
    setShowRepeatModal({ player1: false, player2: false });
    if (repeat && previousCharacters[player]) {
      selectCharacter(sessionId, previousCharacters[player], player);
    }
  };

  const handleRepeatStage = (repeat) => {
    setShowRepeatStageModal(false);
    if (repeat) {
      repeatStage(sessionId, previousStageData.bannedStages, previousStageData.selectedStage);
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
    setPendingAction({ type: 'rps', winner, playerName: session[winner].name });
  };

  const startCooldown = () => {
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
    if (session.currentTurn) {
      const stage = getAllStages().find(s => s.id === stageId);
      setPendingAction({ type: 'ban', stageId, stageName: stage?.name || stageId, player: session.currentTurn });
      startCooldown();
    }
  };

  const handleSelectStage = (stageId) => {
    if (isActionBlocked) return;
    if (session.currentTurn) {
      const stage = getAllStages().find(s => s.id === stageId);
      setPendingAction({ type: 'select', stageId, stageName: stage?.name || stageId });
    }
  };

  const handleSelectCharacter = (characterId) => {
    if (session.currentTurn) {
      const character = CHARACTERS.find(c => c.id === characterId);
      setPendingAction({ type: 'character', characterId, characterName: character.name, characterImage: character.image, player: session.currentTurn });
    }
  };

  const handleSetGameWinner = (winner) => {
    setPendingAction({ type: 'winner', winner, playerName: session[winner].name });
  };

  const confirmAction = () => {
    if (!pendingAction || !sessionId) return;
    switch (pendingAction.type) {
      case 'rps':       selectRPSWinner(sessionId, pendingAction.winner); break;
      case 'ban':       banStage(sessionId, pendingAction.stageId, pendingAction.player); break;
      case 'select':    selectStage(sessionId, pendingAction.stageId, pendingAction.player); break;
      case 'character': selectCharacter(sessionId, pendingAction.characterId, pendingAction.player); break;
      case 'winner':    setGameWinner(sessionId, pendingAction.winner); break;
    }
    setPendingAction(null);
  };

  const cancelAction = () => setPendingAction(null);

  const getAllStages = () => getStagesForTournament(sessionId, session.currentGame);

  const filteredCharacters = CHARACTERS.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{ background: '#000000', fontFamily: 'Anton, sans-serif', minHeight: '100dvh' }}>

      {/* ── Header sticky ── */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-md px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3 border-b border-white/20 shadow-xl">
          <div className="flex justify-between items-center gap-2">

            {/* Jugadores */}
            <div className="flex items-center gap-2 flex-1">
              <div className="bg-smash-red/30 rounded-lg px-2 py-1.5 flex-1 min-w-0">
                <p className="text-white/70 text-[10px] sm:text-xs leading-none">Jugador 1</p>
                <p className="text-white font-bold text-xs sm:text-sm truncate" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{session.player1.name}</p>
                <p className="text-smash-yellow text-base sm:text-lg font-bold leading-none" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{session.player1.score}</p>
              </div>
              <div className="text-white text-sm sm:text-lg font-bold px-1" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>VS</div>
              <div className="bg-smash-blue/30 rounded-lg px-2 py-1.5 flex-1 min-w-0">
                <p className="text-white/70 text-[10px] sm:text-xs leading-none">Jugador 2</p>
                <p className="text-white font-bold text-xs sm:text-sm truncate" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{session.player2.name}</p>
                <p className="text-smash-yellow text-base sm:text-lg font-bold leading-none" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{session.player2.score}</p>
              </div>
            </div>

            {/* Game y Formato */}
            <div className="flex gap-1.5 sm:gap-2 items-center">
              {/* Logo AFK */}
              <img src="/images/AFK.webp" alt="AFK" className="h-10 sm:h-14 w-auto object-contain flex-shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
              <div className="text-center bg-white/10 rounded-lg px-2 py-1 min-w-[45px]">
                <p className="text-white/70 text-[10px] leading-none">Game</p>
                <p className="text-smash-yellow text-lg sm:text-xl font-bold leading-tight" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{session.currentGame}</p>
              </div>
              <div className="text-center bg-white/10 rounded-lg px-2 py-1 min-w-[45px]">
                <p className="text-white/70 text-[10px] leading-none">Formato</p>
                <p className="text-smash-yellow text-sm sm:text-base font-bold leading-tight">{session.format}</p>
              </div>
            </div>
          </div>
        </div>

      {/* ── Contenido scrollable ── */}
      <div className="p-3 md:p-4 max-w-7xl mx-auto flex flex-col gap-3 md:gap-4">

        {/* ── RPS Phase ── */}
        {session.phase === 'RPS' && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-2xl border-2 border-white/30 flex flex-col justify-center relative overflow-hidden min-h-[70vh]">
            <div className="text-center mb-4 sm:mb-6 relative z-10">
              <h3 className="text-3xl sm:text-5xl font-black animate-pulse">✊ ✋ ✌️</h3>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-1 sm:mb-2 drop-shadow-lg">Piedra, Papel o Tijera</h3>
              <p className="text-base sm:text-lg text-white/80 font-semibold">¿Quién ganó el RPS? 🏆</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-3xl mx-auto relative z-10 w-full px-2 sm:px-0">
              <button
                onClick={() => handleRPSWinner('player1')}
                className="group py-12 sm:py-16 text-white font-black text-2xl sm:text-3xl rounded-2xl sm:rounded-3xl active:scale-95 transition-all duration-200 shadow-2xl border-4 border-white/30 relative overflow-hidden touch-manipulation bg-gradient-to-br from-smash-red via-red-600 to-red-800"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl mb-2 sm:mb-3">🔴</div>
                  <div className="text-xl sm:text-2xl px-2 leading-tight">{session.player1.name}</div>
                </div>
              </button>
              <button
                onClick={() => handleRPSWinner('player2')}
                className="group py-12 sm:py-16 text-white font-black text-2xl sm:text-3xl rounded-2xl sm:rounded-3xl active:scale-95 transition-all duration-200 shadow-2xl border-4 border-white/30 relative overflow-hidden touch-manipulation bg-gradient-to-br from-smash-blue via-blue-600 to-blue-800"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl mb-2 sm:mb-3">🔵</div>
                  <div className="text-xl sm:text-2xl px-2 leading-tight">{session.player2.name}</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Stage Ban Phase ── */}
        {session.phase === 'STAGE_BAN' && (
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
                <p className="text-white text-sm sm:text-base font-semibold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>Turno: {session[session.currentTurn]?.name}</p>
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
                      <StageButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages.includes(s.id)} onClick={handleBanStage} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                    <div className="hidden sm:block sm:col-span-1" />
                    {GAME1_STAGES_AFK.slice(3, 5).map(s => (
                      <StageButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages.includes(s.id)} onClick={handleBanStage} colSpan="sm:col-span-2" />
                    ))}
                    <div className="hidden sm:block sm:col-span-1" />
                  </div>
                </>
              ) : (
                /* Games 2+ - Layout dinámico 3+3+2 */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {getAllStages().slice(0, 3).map(s => (
                      <StageButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages.includes(s.id)} onClick={handleBanStage} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {getAllStages().slice(3, 6).map(s => (
                      <StageButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages.includes(s.id)} onClick={handleBanStage} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                    <div className="hidden sm:block sm:col-span-1" />
                    {getAllStages().slice(6, 8).map(s => (
                      <StageButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages.includes(s.id)} onClick={handleBanStage} colSpan="sm:col-span-2" />
                    ))}
                    <div className="hidden sm:block sm:col-span-1" />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Stage Select Phase ── */}
        {session.phase === 'STAGE_SELECT' && (
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
              <p className="text-white text-sm sm:text-lg font-semibold truncate">Turno: {session[session.currentTurn]?.name}</p>
            </div>

            <div className="flex flex-col gap-1.5 sm:gap-2 pb-2">
              {session.currentGame === 1 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {GAME1_STAGES_AFK.slice(0, 3).map(s => (
                      <StageSelectButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages?.includes(s.id)} onClick={handleSelectStage} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                    <div className="hidden sm:block sm:col-span-1" />
                    {GAME1_STAGES_AFK.slice(3, 5).map(s => (
                      <StageSelectButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages?.includes(s.id)} onClick={handleSelectStage} colSpan="sm:col-span-2" />
                    ))}
                    <div className="hidden sm:block sm:col-span-1" />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {getAllStages().slice(0, 3).map(s => (
                      <StageSelectButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages?.includes(s.id)} onClick={handleSelectStage} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {getAllStages().slice(3, 6).map(s => (
                      <StageSelectButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages?.includes(s.id)} onClick={handleSelectStage} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                    <div className="hidden sm:block sm:col-span-1" />
                    {getAllStages().slice(6, 8).map(s => (
                      <StageSelectButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages?.includes(s.id)} onClick={handleSelectStage} colSpan="sm:col-span-2" />
                    ))}
                    <div className="hidden sm:block sm:col-span-1" />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Character Select Phase ── */}
        {session.phase === 'CHARACTER_SELECT' && (
          <div className="rounded-xl border border-white/20">
            {/* Sub-header sticky (debajo del header principal) */}
            <div className="sticky top-[72px] sm:top-[88px] z-30 bg-black/95 backdrop-blur-md px-2 sm:px-4 pt-2 sm:pt-3 pb-2 border-b border-white/20 rounded-t-xl">
              <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                <div>
                  <h3 className="text-lg sm:text-2xl font-bold text-white">👤 Seleccionar Personaje</h3>
                  <p className="text-white text-xs sm:text-base font-semibold truncate">
                    Turno: {session[session.currentTurn]?.name} | Stage: {getStageData(session.selectedStage)?.name}
                  </p>
                </div>
              </div>
              {/* Picks anteriores del jugador */}
              {playerPickHistory.length > 0 && (
                <div className="mb-2">
                  <p className="text-white/50 text-[10px] sm:text-xs uppercase tracking-wider mb-1.5 font-semibold">Picks anteriores</p>
                  <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {playerPickHistory.map((charId) => {
                      const char = CHARACTERS.find(c => c.id === charId);
                      if (!char) return null;
                      return (
                        <button
                          key={charId}
                          onClick={() => handleSelectCharacter(charId)}
                          title={char.name}
                          className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-lg border-2 border-smash-yellow/60 active:scale-95 touch-manipulation overflow-hidden"
                        >
                          <img
                            src={char.image}
                            alt={char.name}
                            className="w-full h-full object-contain"
                            onError={(e) => { e.target.src = '/images/characters/placeholder.png'; }}
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
              {filteredCharacters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => handleSelectCharacter(character.id)}
                  className="aspect-square bg-white/5 rounded-lg sm:rounded-xl p-1 flex flex-col items-center justify-center overflow-hidden active:scale-95 border-2 border-white/20 touch-manipulation"
                  title={character.name}
                >
                  <img
                    src={character.image}
                    alt={character.name}
                    className="w-full h-full object-contain"
                    onError={(e) => { e.target.src = '/images/characters/placeholder.png'; }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Playing Phase ── */}
        {session.phase === 'PLAYING' && (
          <div className="bg-white/10 rounded-xl p-2 sm:p-4 border-2 border-white/30 flex flex-col justify-center">
            <div className="text-center mb-2 sm:mb-4">
              <h3 className="text-xl sm:text-3xl font-black text-white mb-1 sm:mb-2">¡EN COMBATE!</h3>
              <p className="text-white/80 text-sm sm:text-lg font-semibold">Game {session.currentGame}</p>
            </div>
            <div className="rounded-xl sm:rounded-2xl p-2 sm:p-4 border-2 border-white/30 bg-white/10">
              <div className="grid grid-cols-3 gap-2 sm:gap-3 items-center">
                <div className="text-center space-y-1 sm:space-y-2">
                  <div className="rounded-lg sm:rounded-xl p-1.5 sm:p-3 border-2 shadow-lg bg-smash-red/40 border-smash-red/80">
                    <p className="text-white/70 text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-semibold">Jugador 1</p>
                    <p className="text-white font-black text-sm sm:text-xl mb-1 sm:mb-2 truncate">{session.player1.name}</p>
                    <div className="bg-black/30 rounded-md sm:rounded-lg p-1 sm:p-2 border border-white/20">
                      <p className="text-smash-yellow text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1">Personaje</p>
                      <p className="text-white text-xs sm:text-sm font-bold truncate">{getCharacterData(session.player1.character)?.name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="rounded-md sm:rounded-lg p-1 sm:p-2 border-2 bg-smash-yellow/20 border-smash-yellow/50">
                    <p className="text-white/70 text-[10px] sm:text-xs font-semibold">Score</p>
                    <p className="text-smash-yellow text-xl sm:text-2xl font-black">{session.player1.score}</p>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-white/20 rounded-full p-2 sm:p-3 border-2 sm:border-4 border-white/30">
                    <p className="text-white text-lg sm:text-2xl font-black">VS</p>
                  </div>
                  <div className="mt-1 sm:mt-2 bg-white/10 rounded-md sm:rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 border border-white/20">
                    <p className="text-white text-[10px] sm:text-sm font-semibold truncate">{getStageData(session.selectedStage)?.name || 'Stage'}</p>
                  </div>
                </div>
                <div className="text-center space-y-1 sm:space-y-2">
                  <div className="rounded-lg sm:rounded-xl p-1.5 sm:p-3 border-2 shadow-lg bg-smash-blue/40 border-smash-blue/80">
                    <p className="text-white/70 text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-semibold">Jugador 2</p>
                    <p className="text-white font-black text-sm sm:text-xl mb-1 sm:mb-2 truncate">{session.player2.name}</p>
                    <div className="bg-black/30 rounded-md sm:rounded-lg p-1 sm:p-2 border border-white/20">
                      <p className="text-smash-yellow text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1">Personaje</p>
                      <p className="text-white text-xs sm:text-sm font-bold truncate">{getCharacterData(session.player2.character)?.name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="rounded-md sm:rounded-lg p-1 sm:p-2 border-2 bg-smash-yellow/20 border-smash-yellow/50">
                    <p className="text-white/70 text-[10px] sm:text-xs font-semibold">Score</p>
                    <p className="text-smash-yellow text-xl sm:text-2xl font-black">{session.player2.score}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-white/60 text-xs text-center mb-2 font-semibold uppercase tracking-wider">¿Quién ganó el game?</p>
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
            </div>
          </div>
        )}

        {/* ── Finished Phase ── */}
        {session.phase === 'FINISHED' && (
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
              <p className="text-white/90 text-base">✨ El administrador configurará la próxima serie</p>
            </div>
          </div>
        )}

        {/* ── Modal: Repetir personaje - Player 1 ── */}
        {showRepeatModal.player1 && previousCharacters.player1 && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-smash-red to-red-800 rounded-2xl p-8 shadow-2xl border-4 border-white max-w-lg w-full">
              <div className="text-center mb-6">
                <div className="text-7xl mb-4">🔄</div>
                <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Anton', textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}>{session.player1.name}</h3>
                <p className="text-white text-xl mb-4">¿Quieres repetir tu personaje anterior?</p>
                <div className="bg-black/40 rounded-xl p-6 border-2 border-white/30">
                  <img src={getCharacterData(previousCharacters.player1)?.image} alt={getCharacterData(previousCharacters.player1)?.name} className="w-32 h-32 mx-auto mb-3 rounded-full border-4 border-white shadow-2xl" onError={(e) => { e.target.style.display = 'none'; }} />
                  <p className="text-white text-2xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{getCharacterData(previousCharacters.player1)?.name}</p>
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
        {showRepeatModal.player2 && previousCharacters.player2 && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-smash-blue to-blue-800 rounded-2xl p-8 shadow-2xl border-4 border-white max-w-lg w-full">
              <div className="text-center mb-6">
                <div className="text-7xl mb-4">🔄</div>
                <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Anton', textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}>{session.player2.name}</h3>
                <p className="text-white text-xl mb-4">¿Quieres repetir tu personaje anterior?</p>
                <div className="bg-black/40 rounded-xl p-6 border-2 border-white/30">
                  <img src={getCharacterData(previousCharacters.player2)?.image} alt={getCharacterData(previousCharacters.player2)?.name} className="w-32 h-32 mx-auto mb-3 rounded-full border-4 border-white shadow-2xl" onError={(e) => { e.target.style.display = 'none'; }} />
                  <p className="text-white text-2xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{getCharacterData(previousCharacters.player2)?.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleRepeatCharacter('player2', false)} className="py-5 bg-gray-700 hover:bg-gray-800 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white/30">❌ NO</button>
                <button onClick={() => handleRepeatCharacter('player2', true)} className="py-5 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white">✓ SÍ</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Repetir stage ── */}
        {showRepeatStageModal && previousStageData.selectedStage && (() => {
          const stageInfo = getStageData(previousStageData.selectedStage);
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
                  <p className="text-white/60 text-sm">Se repetirán los mismos baneos y el mismo stage</p>
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

        {/* ── Modal: Confirmación de acción ── */}
        {pendingAction && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-4 shadow-2xl border-4 border-smash-yellow max-w-sm w-full">
              <div className="text-center mb-6">
                <div className="mb-4 flex justify-center">
                  {pendingAction.type === 'character' && pendingAction.characterImage ? (
                    <div className="w-16 h-16 bg-white/10 rounded-full border-4 border-smash-yellow p-1 flex items-center justify-center">
                      <img src={pendingAction.characterImage} alt={pendingAction.characterName} className="w-full h-full object-contain rounded-full" />
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

      {/* ── Modal de anuncio de turno ── */}
      {turnModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[60] p-6"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setTurnModal(null)}
        >
          <div
            className="rounded-3xl p-8 sm:p-12 shadow-2xl border-4 border-white/30 max-w-sm w-full text-center"
            style={{ background: turnModal.gradient }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-7xl sm:text-8xl mb-4">{turnModal.icon}</div>
            <p className="text-white/70 text-base sm:text-lg font-semibold mb-2 uppercase tracking-widest">{turnModal.subtitle}</p>
            <p
              className="text-white text-4xl sm:text-5xl font-black mb-6 leading-tight"
              style={{ fontFamily: 'Anton', textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}
            >
              {turnModal.playerName}
            </p>
            <button
              onClick={() => setTurnModal(null)}
              className="bg-white/20 hover:bg-white/30 active:scale-95 text-white font-bold text-sm px-6 py-3 rounded-xl border border-white/30 transition-all touch-manipulation"
            >
              Entendido ✓
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
