// ============================================================
// TABLET CONTROL - AFK CÓRDOBA
// Archivo exclusivo para AFK Córdoba. No tocar para Mendoza.
// Stages Game 1: Small Battlefield, Town and City, Pokemon Stadium 2, Hollow Bastion, Battlefield
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

// ── Stages hardcodeados para Game 1 de Córdoba ─────────────
const GAME1_STAGES_CORDOBA = [
  { id: 'small-battlefield', name: 'Small Battlefield', image: '/images/stages/Small Battlefield.png' },
  { id: 'town-and-city',     name: 'Town and City',     image: '/images/stages/Town and City.png' },
  { id: 'pokemon-stadium-2', name: 'Pokémon Stadium 2', image: '/images/stages/Pokemon Stadium 2.png' },
  { id: 'hollow-bastion',    name: 'Hollow Bastion',    image: '/images/stages/Hollow Bastion.png' },
  { id: 'battlefield',       name: 'Battlefield',       image: '/images/stages/Battlefield.png' },
];

// ── Pantalla de espera de turno ──
function WaitingTurnCard({ icon, turnPlayerName, action }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', borderRadius: 24, padding: '40px 24px', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 18, textAlign: 'center' }}>
      <div style={{ fontSize: 56, lineHeight: 1 }}>{icon || '⏳'}</div>
      <div>
        <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: '#fff', textShadow: '2px 2px 8px rgba(0,0,0,0.8)' }}>Esperando...</h3>
        <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}><span style={{ color: '#E8A000', fontWeight: 800 }}>{turnPlayerName}</span>{' está '}{action}</p>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
export default function TabletControlCordoba({ sessionId, playerName }) {
  const { session, selectRPSWinner, banStage, selectStage, selectCharacter, setGameWinner, getPlayerHistory } = useWebSocket(sessionId);
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

  // Reset al inicio de nuevo game
  useEffect(() => {
    if (!session) return;
    if (session.phase === 'CHARACTER_SELECT' && !session.player1.character && !session.player2.character) {
      setHasAskedRepeat({ player1: false, player2: false });
      setShowRepeatModal({ player1: false, player2: false });
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

  // Cargar historial del jugador cuyo turno es en CHARACTER_SELECT
  useEffect(() => {
    if (!session || session.phase !== 'CHARACTER_SELECT' || !session.currentTurn) return;
    const pName = session[session.currentTurn]?.name;
    if (!pName) return;
    setPlayerPickHistory([]);
    getPlayerHistory(pName, (data) => {
      setPlayerPickHistory(data.characters || []);
    });
  }, [session?.phase, session?.currentTurn]);

  // Detectar cambios de fase/turno para mostrar modal de anuncio
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
    if (prevPhase !== session.phase) {
      if (session.phase === 'STAGE_BAN' && turn) {
        setTurnModal({ icon: '🚫', subtitle: 'Le toca BANEAR stage a', playerName: name, gradient: 'linear-gradient(160deg,#1a0505 0%,#450a0a 50%,#7f1d1d 100%)', accent: '#ef4444' });
      } else if (session.phase === 'STAGE_SELECT' && turn) {
        setTurnModal({ icon: '🎯', subtitle: 'Le toca ELEGIR stage a', playerName: name, gradient: 'linear-gradient(160deg,#020d1a 0%,#0c2340 50%,#1d4ed8 100%)', accent: '#60a5fa' });
      } else if (session.phase === 'CHARACTER_SELECT' && turn) {
        setTurnModal({ icon: '🎮', subtitle: 'Elige tu personaje', playerName: name, gradient: 'linear-gradient(160deg,#0d0520 0%,#1e1040 50%,#4c1d95 100%)', accent: '#a78bfa' });
      }
    } else if (prevTurn !== turn && turn && session.phase !== 'RPS') {
      if (session.phase === 'STAGE_BAN') {
        setTurnModal({ icon: '🚫', subtitle: 'Ahora le toca BANEAR a', playerName: name, gradient: 'linear-gradient(160deg,#1a0505 0%,#450a0a 50%,#7f1d1d 100%)', accent: '#ef4444' });
      } else if (session.phase === 'CHARACTER_SELECT') {
        setTurnModal({ icon: '🎮', subtitle: 'Ahora te toca elegir a vos', playerName: name, gradient: 'linear-gradient(160deg,#0d0520 0%,#1e1040 50%,#4c1d95 100%)', accent: '#a78bfa' });
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

  // Identidad del jugador en este dispositivo (null = admin / espectador)
  const myPlayer = session && playerName
    ? (session.player1?.name?.toLowerCase().trim() === playerName.toLowerCase().trim() ? 'player1'
      : session.player2?.name?.toLowerCase().trim() === playerName.toLowerCase().trim() ? 'player2'
      : null)
    : null;

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000', fontFamily: 'Anton, sans-serif' }}>
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🎮</div>
          <p className="text-white text-xl font-bold drop-shadow-lg">Inicializando...</p>
        </div>
      </div>
    );
  }

  if (error && error === 'Sesión no encontrada') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#000000', fontFamily: 'Anton, sans-serif' }}>
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000', fontFamily: 'Anton, sans-serif', minHeight: '100dvh' }}>
        <div className="text-center">
          <img src="/images/AFK.webp" alt="AFK Logo" className="w-32 h-32 mx-auto mb-6 animate-pulse" style={{ filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))' }} />
          <p className="text-white text-xl font-bold drop-shadow-lg">Cargando sesión...</p>
          {error && <p className="text-yellow-400 text-sm mt-2 font-semibold">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Handlers ────────────────────────────────────────────────
  const handleRPSWinner = (winner) => {
    setPendingAction({ type: 'rps', winner, playerName: session[winner].name });
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

  const handleRandomCharacter = () => {
    const randomChar = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    if (session.currentTurn) {
      setPendingAction({ type: 'character', characterId: 'random', characterName: '?', characterImage: null, player: session.currentTurn, isRandom: true });
    }
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

  // Stages para Games 2+
  const getAllStages = () => getStagesForTournament(sessionId, session.currentGame);
  const getAvailableStages = () => {
    const stageList = getStagesForTournament(sessionId, session.currentGame);
    return stageList.filter(s => session.availableStages.includes(s.id));
  };

  const filteredCharacters = CHARACTERS.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{ background: '#000000', fontFamily: 'Anton, sans-serif', minHeight: '100dvh' }}>

      {/* ── Header sticky ── */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-md px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3 border-b border-white/20 shadow-xl">
          <div className="flex justify-between items-center gap-2">

            {/* Logo AFK */}
            <div className="flex-shrink-0">
              <img src="/images/AFK.webp" alt="AFK" className="h-12 w-12 sm:h-16 sm:w-16 object-contain" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.3))' }} />
            </div>

            {/* Jugadores */}            <div className="flex items-center gap-2 flex-1">
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
            <div className="flex gap-1.5 sm:gap-2">
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
      <div className="p-3 md:p-4 max-w-7xl mx-auto flex flex-col gap-3 md:gap-4 pb-24">

        {/* ── RPS Phase ── */}
        {session.phase === 'RPS' && (
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-2xl border-2 border-white/30 flex-1 flex flex-col justify-center relative overflow-hidden">
            <div className="text-center mb-4 sm:mb-6 relative z-10">
              <h3 className="text-3xl sm:text-5xl font-black animate-pulse">✊ ✋ ✌️</h3>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-1 sm:mb-2 drop-shadow-lg">Piedra, Papel o Tijera</h3>
              <p className="text-base sm:text-lg text-white/80 font-semibold">¿Quién ganó el RPS? 🏆</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-3xl mx-auto relative z-10 w-full px-2 sm:px-0">
              <button
                onClick={() => handleRPSWinner('player1')}
                className="group py-12 sm:py-16 bg-gradient-to-br from-smash-red via-red-600 to-red-800 text-white font-black text-2xl sm:text-3xl rounded-2xl sm:rounded-3xl active:scale-95 transition-all duration-200 shadow-2xl border-4 border-white/30 relative overflow-hidden touch-manipulation"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl mb-2 sm:mb-3">🔴</div>
                  <div className="text-xl sm:text-2xl px-2 leading-tight">{session.player1.name}</div>
                </div>
              </button>
              <button
                onClick={() => handleRPSWinner('player2')}
                className="group py-12 sm:py-16 bg-gradient-to-br from-smash-blue via-blue-600 to-blue-800 text-white font-black text-2xl sm:text-3xl rounded-2xl sm:rounded-3xl active:scale-95 transition-all duration-200 shadow-2xl border-4 border-white/30 relative overflow-hidden touch-manipulation"
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
        {session.phase === 'STAGE_BAN' && myPlayer && session.currentTurn !== myPlayer && (
          <WaitingTurnCard icon="❌" turnPlayerName={session[session.currentTurn]?.name}
            action={`baneando${session.bansRemaining > 0 ? ` (${session.bansRemaining} restante${session.bansRemaining !== 1 ? 's' : ''})` : ''}`} />
        )}
        {session.phase === 'STAGE_BAN' && (!myPlayer || session.currentTurn === myPlayer) && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-xl border border-white/20 flex-1 flex flex-col overflow-hidden">
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
                <p className={myPlayer && myPlayer === session.currentTurn ? 'text-yellow-400 text-sm sm:text-base font-black' : 'text-white text-sm sm:text-base font-semibold'} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>{myPlayer && myPlayer === session.currentTurn ? '⚡ ¡Es tu turno! Baneá' : `Turno: ${session[session.currentTurn]?.name}`}</p>
                <span className="hidden sm:inline text-white">|</span>
                <p className="text-smash-yellow text-sm sm:text-base font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>Baneos restantes: {session.bansRemaining}</p>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 overflow-y-auto pb-2">
              {session.currentGame === 1 ? (
                /* Game 1 - 5 stages fijos de Córdoba: 3+2 */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {GAME1_STAGES_CORDOBA.slice(0, 3).map(s => (
                      <StageButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages.includes(s.id)} onClick={handleBanStage} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                    <div className="hidden sm:block sm:col-span-1" />
                    {GAME1_STAGES_CORDOBA.slice(3, 5).map(s => (
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
        {session.phase === 'STAGE_SELECT' && myPlayer && session.currentTurn !== myPlayer && (
          <WaitingTurnCard icon="🎯" turnPlayerName={session[session.currentTurn]?.name} action="eligiendo el escenario" />
        )}
        {session.phase === 'STAGE_SELECT' && (!myPlayer || session.currentTurn === myPlayer) && (
          <div className="bg-white/10 rounded-xl p-2 sm:p-4 border border-white/20 flex-1 flex flex-col overflow-hidden">
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
              <p className={`text-sm sm:text-lg font-semibold truncate ${myPlayer && myPlayer === session.currentTurn ? 'text-yellow-400 font-black' : 'text-white'}`}>{myPlayer && myPlayer === session.currentTurn ? '⚡ ¡Elegí el escenario!' : `Turno: ${session[session.currentTurn]?.name}`}</p>
            </div>

            <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 overflow-y-auto pb-2">
              {session.currentGame === 1 ? (
                /* Game 1 - 5 stages fijos de Córdoba */
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {GAME1_STAGES_CORDOBA.slice(0, 3).map(s => (
                      <StageSelectButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages?.includes(s.id)} onClick={handleSelectStage} />
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                    <div className="hidden sm:block sm:col-span-1" />
                    {GAME1_STAGES_CORDOBA.slice(3, 5).map(s => (
                      <StageSelectButton key={s.id} stageId={s.id} stageName={s.name} stageImage={s.image} isBanned={session.bannedStages?.includes(s.id)} onClick={handleSelectStage} colSpan="sm:col-span-2" />
                    ))}
                    <div className="hidden sm:block sm:col-span-1" />
                  </div>
                </>
              ) : (
                /* Games 2+ - Layout dinámico */
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
        {session.phase === 'CHARACTER_SELECT' && myPlayer && session.currentTurn !== myPlayer && (
          <WaitingTurnCard icon="👤" turnPlayerName={session[session.currentTurn]?.name} action="eligiendo su personaje" />
        )}
        {session.phase === 'CHARACTER_SELECT' && (!myPlayer || session.currentTurn === myPlayer) && (
          <div className="rounded-xl border border-white/20">
            {/* Sub-header sticky */}
            <div className="sticky top-[72px] sm:top-[88px] z-30 bg-black/95 backdrop-blur-md px-2 sm:px-4 pt-2 sm:pt-3 pb-2 border-b border-white/20 rounded-t-xl">
              <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                <div>
                  <h3 className="text-lg sm:text-2xl font-bold text-white">👤 Seleccionar Personaje</h3>
                  <p className={`text-xs sm:text-base font-semibold truncate ${myPlayer && myPlayer === session.currentTurn ? 'text-yellow-400 font-black' : 'text-white'}`}>
                    {myPlayer && myPlayer === session.currentTurn ? `⚡ ¡Elegí tu personaje! | Stage: ${getStageData(session.selectedStage)?.name}` : `Turno: ${session[session.currentTurn]?.name} | Stage: ${getStageData(session.selectedStage)?.name}`}
                  </p>
                </div>
              </div>
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
                          className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-lg border-2 border-smash-yellow/60 active:scale-95 touch-manipulation overflow-hidden"
                        >
                          <img src={char.image} alt={char.name} className="w-full h-full object-contain" onError={(e) => { e.target.src = '/images/characters/placeholder.png'; }} />
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
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-smash-blue text-xs sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3 p-2 sm:p-4 pb-4 bg-white/10">
              {/* Botón aleatorio "?" */}
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
          <div className="bg-white/10 rounded-xl p-2 sm:p-4 border-2 border-white/30 flex-1 flex flex-col justify-center">
            <div className="text-center mb-2 sm:mb-4">
              <h3 className="text-xl sm:text-3xl font-black text-white mb-1 sm:mb-2" style={{ fontFamily: 'Anton' }}>¡EN COMBATE!</h3>
              <p className="text-white/80 text-sm sm:text-lg font-semibold">Game {session.currentGame}</p>
            </div>
            <div className="bg-white/10 rounded-xl sm:rounded-2xl p-2 sm:p-4 border-2 border-white/30">
              <div className="grid grid-cols-3 gap-2 sm:gap-3 items-center">
                <div className="text-center space-y-1 sm:space-y-2">
                  <div className="bg-gradient-to-br from-smash-red/40 to-red-700/40 rounded-lg sm:rounded-xl p-1.5 sm:p-3 border-2 border-red-400/50 shadow-lg">
                    <p className="text-white/70 text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-semibold">Jugador 1</p>
                    <p className="text-white font-black text-sm sm:text-xl mb-1 sm:mb-2 truncate" style={{ fontFamily: 'Anton' }}>{session.player1.name}</p>
                    <div className="bg-black/30 rounded-md sm:rounded-lg p-1 sm:p-2 border border-white/20">
                      <p className="text-smash-yellow text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1">Personaje</p>
                      <p className="text-white text-xs sm:text-sm font-bold truncate">{getCharacterData(session.player1.character)?.name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="bg-smash-yellow/20 rounded-md sm:rounded-lg p-1 sm:p-2 border-2 border-smash-yellow/50">
                    <p className="text-white/70 text-[10px] sm:text-xs font-semibold">Score</p>
                    <p className="text-smash-yellow text-xl sm:text-2xl font-black">{session.player1.score}</p>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-white/20 rounded-full p-2 sm:p-3 border-2 sm:border-4 border-white/30">
                    <p className="text-white text-lg sm:text-2xl font-black" style={{ fontFamily: 'Anton' }}>VS</p>
                  </div>
                  <div className="mt-1 sm:mt-2 bg-white/10 rounded-md sm:rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 border border-white/20">
                    <p className="text-white text-[10px] sm:text-sm font-semibold truncate">{getStageData(session.selectedStage)?.name || 'Stage'}</p>
                  </div>
                </div>
                <div className="text-center space-y-1 sm:space-y-2">
                  <div className="bg-gradient-to-br from-smash-blue/40 to-blue-700/40 rounded-lg sm:rounded-xl p-1.5 sm:p-3 border-2 border-blue-400/50 shadow-lg">
                    <p className="text-white/70 text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-semibold">Jugador 2</p>
                    <p className="text-white font-black text-sm sm:text-xl mb-1 sm:mb-2 truncate" style={{ fontFamily: 'Anton' }}>{session.player2.name}</p>
                    <div className="bg-black/30 rounded-md sm:rounded-lg p-1 sm:p-2 border border-white/20">
                      <p className="text-smash-yellow text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1">Personaje</p>
                      <p className="text-white text-xs sm:text-sm font-bold truncate">{getCharacterData(session.player2.character)?.name || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="bg-smash-yellow/20 rounded-md sm:rounded-lg p-1 sm:p-2 border-2 border-smash-yellow/50">
                    <p className="text-white/70 text-[10px] sm:text-xs font-semibold">Score</p>
                    <p className="text-smash-yellow text-xl sm:text-2xl font-black">{session.player2.score}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-white text-center font-bold text-sm mb-2" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.8)' }}>
                🏆 ¿Quién ganó el Game {session.currentGame}?
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setPendingAction({ type: 'winner', winner: 'player1', winnerName: session.player1.name })} className="py-4 rounded-xl border-2 border-red-400/50 font-black text-sm sm:text-base active:scale-95 touch-manipulation transition-all" style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.3), rgba(239,68,68,0.2))', color: '#fff', fontFamily: 'inherit', cursor: 'pointer' }}>
                  🔴 {session.player1.name}
                </button>
                <button onClick={() => setPendingAction({ type: 'winner', winner: 'player2', winnerName: session.player2.name })} className="py-4 rounded-xl border-2 border-blue-400/50 font-black text-sm sm:text-base active:scale-95 touch-manipulation transition-all" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(59,130,246,0.2))', color: '#fff', fontFamily: 'inherit', cursor: 'pointer' }}>
                  🔵 {session.player2.name}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Finished Phase ── */}
        {session.phase === 'FINISHED' && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-2xl border border-white/20 text-center flex-1 flex flex-col justify-center">
            <div className="text-7xl mb-4 animate-bounce">🏆</div>
            <h3 className="text-4xl font-bold text-white mb-4">¡Serie Finalizada!</h3>
            <div className="bg-gradient-to-r from-smash-yellow/20 via-yellow-500/20 to-smash-yellow/20 rounded-xl p-4 mb-4 border-2 border-smash-yellow/50">
              <p className="text-white/70 text-sm mb-1">Ganador</p>
              <p className="text-smash-yellow text-3xl font-bold">
                {session.player1.score > session.player2.score ? session.player1.name : session.player2.name}
              </p>
            </div>
            <p className="text-white text-2xl font-bold mb-6">
              Score Final: <span className="text-smash-yellow">{session.player1.score}</span> - <span className="text-smash-blue">{session.player2.score}</span>
            </p>
            <div className="bg-smash-purple/20 rounded-lg p-4 border border-smash-purple/50">
              <p className="text-white/90 text-base">✨ El administrador configurará la próxima serie</p>
            </div>
          </div>
        )}

        {/* ── Modal: Repetir personaje - Player 1 ── */}
        {showRepeatModal.player1 && previousCharacters.player1 && (!myPlayer || myPlayer === 'player1') && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-smash-red/90 to-red-700/90 rounded-2xl p-8 shadow-2xl border-4 border-white max-w-lg w-full">
              <div className="text-center mb-6">
                <div className="text-7xl mb-4">🔄</div>
                <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Anton', textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}>{session.player1.name}</h3>
                <p className="text-white text-xl mb-4">¿Quieres repetir tu personaje anterior?</p>
                <div className="bg-black/40 rounded-xl p-6 border-2 border-white/30">
                  <img src={getCharacterData(previousCharacters.player1)?.image} alt={getCharacterData(previousCharacters.player1)?.name} className="w-32 h-32 mx-auto mb-3 rounded-full border-4 border-white shadow-2xl" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                  <div className="text-6xl mb-3 hidden">🎮</div>
                  <p className="text-white text-2xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{getCharacterData(previousCharacters.player1)?.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleRepeatCharacter('player1', false)} className="py-5 bg-gray-700 hover:bg-gray-800 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white/30" style={{ fontFamily: 'Anton' }}>❌ NO</button>
                <button onClick={() => handleRepeatCharacter('player1', true)} className="py-5 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white" style={{ fontFamily: 'Anton' }}>✓ SÍ</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Repetir personaje - Player 2 ── */}
        {showRepeatModal.player2 && previousCharacters.player2 && (!myPlayer || myPlayer === 'player2') && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-smash-blue/90 to-blue-700/90 rounded-2xl p-8 shadow-2xl border-4 border-white max-w-lg w-full">
              <div className="text-center mb-6">
                <div className="text-7xl mb-4">🔄</div>
                <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Anton', textShadow: '3px 3px 0px rgba(0,0,0,0.8)' }}>{session.player2.name}</h3>
                <p className="text-white text-xl mb-4">¿Quieres repetir tu personaje anterior?</p>
                <div className="bg-black/40 rounded-xl p-6 border-2 border-white/30">
                  <img src={getCharacterData(previousCharacters.player2)?.image} alt={getCharacterData(previousCharacters.player2)?.name} className="w-32 h-32 mx-auto mb-3 rounded-full border-4 border-white shadow-2xl" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                  <div className="text-6xl mb-3 hidden">🎮</div>
                  <p className="text-white text-2xl font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{getCharacterData(previousCharacters.player2)?.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleRepeatCharacter('player2', false)} className="py-5 bg-gray-700 hover:bg-gray-800 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white/30" style={{ fontFamily: 'Anton' }}>❌ NO</button>
                <button onClick={() => handleRepeatCharacter('player2', true)} className="py-5 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white" style={{ fontFamily: 'Anton' }}>✓ SÍ</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal: Confirmación de acción ── */}
        {pendingAction && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-smash-darker to-smash-purple rounded-2xl p-4 shadow-2xl border-4 border-smash-yellow max-w-sm w-full">
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
                  {pendingAction.type === 'character' && <p className="text-white text-base">Seleccionar <span className="text-smash-blue font-bold">{pendingAction.characterName}</span></p>}
                  {pendingAction.type === 'winner' && <p className="text-white text-base"><span className="text-smash-yellow font-bold">{pendingAction.winnerName}</span> ganó el Game {session.currentGame}</p>}
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
        <>
          <style>{`
            @keyframes modalPopCba {
              0%   { opacity: 0; transform: scale(0.75) translateY(24px); }
              70%  { transform: scale(1.03) translateY(-4px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes accentPulseCba {
              0%, 100% { opacity: 0.7; }
              50%       { opacity: 1; }
            }
            @keyframes fadeSlideUpCba {
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
                animation: 'modalPopCba 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0" style={{ height: '3px', background: `linear-gradient(90deg, transparent, ${turnModal.accent}, transparent)`, animation: 'accentPulseCba 2s ease-in-out infinite' }} />
              <div className="px-8 pt-10 pb-8">
                <div className="mx-auto mb-5 flex items-center justify-center text-5xl" style={{ width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', border: `2px solid ${turnModal.accent}66`, boxShadow: `0 0 24px ${turnModal.accent}44`, animation: 'fadeSlideUpCba 0.35s ease both 0.05s' }}>
                  {turnModal.icon}
                </div>
                <p className="font-bold uppercase" style={{ color: turnModal.accent, fontSize: '0.7rem', letterSpacing: '0.22em', animation: 'fadeSlideUpCba 0.35s ease both 0.12s', opacity: 0, animationFillMode: 'forwards' }}>
                  {turnModal.subtitle}
                </p>
                <div className="mx-auto my-4" style={{ width: 48, height: '1px', background: `linear-gradient(90deg, transparent, ${turnModal.accent}88, transparent)` }} />
                <p className="text-white font-black leading-none mb-8" style={{ fontFamily: 'Anton', fontSize: 'clamp(2.5rem, 10vw, 3.5rem)', textShadow: `0 4px 20px rgba(0,0,0,0.6), 0 0 40px ${turnModal.accent}44`, animation: 'fadeSlideUpCba 0.35s ease both 0.18s', opacity: 0, animationFillMode: 'forwards' }}>
                  {turnModal.playerName}
                </p>
                <button onClick={() => setTurnModal(null)} className="w-full py-4 font-bold text-sm text-white active:scale-95 transition-transform touch-manipulation" style={{ borderRadius: '16px', background: `linear-gradient(135deg, ${turnModal.accent}33, ${turnModal.accent}18)`, border: `1px solid ${turnModal.accent}55`, boxShadow: `0 4px 16px ${turnModal.accent}22`, letterSpacing: '0.05em', animation: 'fadeSlideUpCba 0.35s ease both 0.25s', opacity: 0, animationFillMode: 'forwards' }}>
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
          style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', border: '1.5px solid rgba(255,255,255,0.2)', color: 'white', fontSize: 22, cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
        >
          🏠
        </button>
      </div>

    </div>
  );
}
