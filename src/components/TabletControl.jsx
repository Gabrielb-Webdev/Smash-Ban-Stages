import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { CHARACTERS, getStageData, getCharacterData, getStagesForTournament } from '../utils/constants';
import { getTournamentTheme, shouldUseOriginalStyles } from '../utils/themes';

// Cache invalidation for Mendoza background - v1.1 - 2024-12-12T19:20:00

export default function TabletControl({ sessionId }) {
  const { session, selectRPSWinner, banStage, selectStage, selectCharacter, setGameWinner } = useWebSocket(sessionId);
  const error = session ? null : 'Conectando...';
  
  // Obtener tema del torneo
  const theme = getTournamentTheme(sessionId);
  const useOriginalStyles = shouldUseOriginalStyles(sessionId);
  
  // Función para detectar si es Mendoza
  const isMendoza = () => {
    if (!sessionId) return false;
    return sessionId === 'mendoza' || sessionId.includes('mendoza');
  };
  
  // Debug para tablets
  useEffect(() => {
    console.log('🎨 TabletControl Theme Debug:', {
      sessionId,
      theme: theme?.name,
      customBackground: theme?.customBackground,
      useOriginalStyles,
      viewport: { width: window.innerWidth, height: window.innerHeight }
    });
  }, [sessionId, theme, useOriginalStyles]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [showRepeatModal, setShowRepeatModal] = useState({ player1: false, player2: false });
  const [previousCharacters, setPreviousCharacters] = useState({ player1: null, player2: null });
  const [hasAskedRepeat, setHasAskedRepeat] = useState({ player1: false, player2: false });
  const [lastGameSaved, setLastGameSaved] = useState(0);

  // Guardar personajes cuando ambos han seleccionado (se ejecuta al terminar CHARACTER_SELECT)
  useEffect(() => {
    if (!session) return;

    // Guardar cuando ambos tienen personajes seleccionados y el game no ha sido guardado
    if (session.player1.character && 
        session.player2.character && 
        lastGameSaved !== session.currentGame) {
      
      console.log('✅ Guardando personajes del Game', session.currentGame, ':', {
        player1: session.player1.character,
        player2: session.player2.character
      });
      
      setPreviousCharacters({
        player1: session.player1.character,
        player2: session.player2.character
      });
      
      setLastGameSaved(session.currentGame);
    }
  }, [session?.player1?.character, session?.player2?.character, session?.currentGame, lastGameSaved]);

  // Detectar cuando comienza nuevo game y resetear estados
  useEffect(() => {
    if (!session) return;

    // Reset cuando comienza nuevo game (ambos jugadores sin personaje en CHARACTER_SELECT)
    if (session.phase === 'CHARACTER_SELECT' && !session.player1.character && !session.player2.character) {
      console.log('🔄 Reset hasAskedRepeat para Game', session.currentGame);
      setHasAskedRepeat({ player1: false, player2: false });
      setShowRepeatModal({ player1: false, player2: false });
    }
  }, [session?.phase, session?.player1?.character, session?.player2?.character, session?.currentGame]);

  // Mostrar modales de repetir personaje
  useEffect(() => {
    if (!session) return;

    // Solo en game 2+ y en fase CHARACTER_SELECT
    if (session.currentGame >= 2 && session.phase === 'CHARACTER_SELECT') {
      
      console.log('📊 Estado actual:', {
        game: session.currentGame,
        turn: session.currentTurn,
        hasAskedP1: hasAskedRepeat.player1,
        hasAskedP2: hasAskedRepeat.player2,
        p1Character: session.player1.character,
        p2Character: session.player2.character,
        previousP1: previousCharacters.player1,
        previousP2: previousCharacters.player2
      });

      // Mostrar modal para player1
      if (session.currentTurn === 'player1' && 
          !hasAskedRepeat.player1 && 
          !session.player1.character && 
          previousCharacters.player1 &&
          !showRepeatModal.player1) {
        console.log('🎮 Mostrando modal para player1, personaje anterior:', previousCharacters.player1);
        setShowRepeatModal({ player1: true, player2: false });
        setHasAskedRepeat(prev => ({ ...prev, player1: true }));
      }
      
      // Mostrar modal para player2
      if (session.currentTurn === 'player2' && 
          !hasAskedRepeat.player2 && 
          !session.player2.character && 
          previousCharacters.player2 &&
          !showRepeatModal.player2) {
        console.log('🎮 Mostrando modal para player2, personaje anterior:', previousCharacters.player2);
        setShowRepeatModal({ player1: false, player2: true });
        setHasAskedRepeat(prev => ({ ...prev, player2: true }));
      }
    }
  }, [session?.currentGame, session?.phase, session?.currentTurn, session?.player1?.character, session?.player2?.character, hasAskedRepeat, previousCharacters, showRepeatModal]);

  const handleRepeatCharacter = (player, repeat) => {
    console.log(`Player ${player} ${repeat ? 'repitió' : 'no repitió'} personaje`);
    setShowRepeatModal({ player1: false, player2: false });
    
    if (repeat && previousCharacters[player]) {
      // Seleccionar automáticamente el personaje anterior
      selectCharacter(sessionId, previousCharacters[player], player);
    }
    // Si no repite, simplemente cierra el modal y permite selección manual
  };

  // Guard para evitar renders mientras sessionId no está disponible
  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{
             background: theme.customBackground ? 
               `url(${theme.customBackground}) center center / cover no-repeat fixed, rgb(26, 26, 26)` :
               useOriginalStyles ? 
               'url(/images/paperbg.jpg) center center / cover no-repeat fixed' : 
               `linear-gradient(${theme.colors.gradient}), url(/images/paperbg.jpg) center center / cover no-repeat`,
             fontFamily: 'Anton, sans-serif',
             minHeight: '100vh',
             minHeight: '100dvh' // Para tablets modernos
           }}>
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🎮</div>
          <p className="text-white text-xl font-bold drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>Inicializando...</p>
        </div>
      </div>
    );
  }

  if (error && error === 'Sesión no encontrada') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
           style={{
             background: theme.customBackground ? 
               `url(${theme.customBackground}) center center / cover no-repeat fixed, rgb(26, 26, 26)` :
               useOriginalStyles ? 
               'url(/images/paperbg.jpg) center center / cover no-repeat fixed' : 
               `linear-gradient(${theme.colors.gradient}), url(/images/paperbg.jpg) center center / cover no-repeat`,
             fontFamily: 'Anton, sans-serif',
             minHeight: '100vh',
             minHeight: '100dvh' // Para tablets modernos
           }}>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-3xl font-bold text-white mb-4" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>Sesión no encontrada</h2>
          <p className="text-white/70 text-lg mb-6" style={{ textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}>
            Esta sesión no existe o ha expirado. Por favor, crea una nueva sesión desde el panel de administración.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-smash-blue text-white font-bold rounded-lg hover:bg-blue-600 transition-all"
          >
            Ir al Panel de Administración
          </a>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{
             background: theme.customBackground ? 
               `url(${theme.customBackground}) center center / cover no-repeat fixed, rgb(26, 26, 26)` :
               useOriginalStyles ? 
               'url(/images/paperbg.jpg) center center / cover no-repeat fixed' : 
               `linear-gradient(${theme.colors.gradient}), url(/images/paperbg.jpg) center center / cover no-repeat`,
             fontFamily: 'Anton, sans-serif',
             minHeight: '100vh',
             minHeight: '100dvh' // Para tablets modernos
           }}>
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🎮</div>
          <p className="text-white text-xl font-bold drop-shadow-lg" style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>Cargando sesión...</p>
          {error && <p className="text-yellow-400 text-sm mt-2 font-semibold drop-shadow-lg">{error}</p>}
        </div>
      </div>
    );
  }

  const handleRPSWinner = (winner) => {
    const playerName = session[winner].name;
    setPendingAction({ type: 'rps', winner, playerName });
  };

  const handleBanStage = (stageId) => {
    if (session.currentTurn) {
      const stage = getAllStagesForBanning().find(s => s.id === stageId);
      setPendingAction({ type: 'ban', stageId, stageName: stage.name, player: session.currentTurn });
    }
  };

  const handleSelectStage = (stageId) => {
    if (session.currentTurn) {
      const stage = getAllStagesForBanning().find(s => s.id === stageId);
      setPendingAction({ type: 'select', stageId, stageName: stage.name });
    }
  };

  const handleSelectCharacter = (characterId) => {
    if (session.currentTurn) {
      const character = CHARACTERS.find(c => c.id === characterId);
      setPendingAction({ 
        type: 'character', 
        characterId, 
        characterName: character.name, 
        characterImage: character.image,
        player: session.currentTurn 
      });
    }
  };

  const confirmAction = () => {
    if (!pendingAction || !sessionId) return;

    switch (pendingAction.type) {
      case 'rps':
        selectRPSWinner(sessionId, pendingAction.winner);
        break;
      case 'ban':
        banStage(sessionId, pendingAction.stageId, pendingAction.player);
        break;
      case 'select':
        selectStage(sessionId, pendingAction.stageId, pendingAction.player);
        break;
      case 'character':
        selectCharacter(sessionId, pendingAction.characterId, pendingAction.player);
        break;
      default:
        break;
    }
    setPendingAction(null);
  };

  const cancelAction = () => {
    setPendingAction(null);
  };

  const getAvailableStages = () => {
    const stageList = getStagesForTournament(sessionId, session.currentGame);
    const filtered = stageList.filter(stage => session.availableStages.includes(stage.id));
    console.log('📊 Tournament:', sessionId, '| Game:', session.currentGame, '| Total stages en constants:', stageList.length, '| Disponibles en session:', session.availableStages.length, '| Filtrados:', filtered.length);
    console.log('Stages disponibles:', session.availableStages);
    console.log('Stages filtrados:', filtered.map(s => s.name));
    return filtered;
  };

  // Obtener todos los stages sin filtrar por baneados (para la fase de baneo)
  const getAllStagesForBanning = () => {
    const stageList = getStagesForTournament(sessionId, session.currentGame);
    return stageList;
  };

  const filteredCharacters = CHARACTERS.filter(char =>
    char.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-3 md:p-4 overflow-hidden"
         style={{
           background: theme.customBackground ? 
             `url(${theme.customBackground}) center center / cover no-repeat fixed, rgb(26, 26, 26)` :
             useOriginalStyles ? 
             'url(/images/paperbg.jpg) center center / cover no-repeat fixed' : 
             `linear-gradient(${theme.colors.gradient}), url(/images/paperbg.jpg) center center / cover no-repeat`,
           fontFamily: 'Anton, sans-serif',
           minHeight: '100vh',
           minHeight: '100dvh' // Para tablets modernos
         }}>
      <div className="w-full h-full max-w-7xl flex flex-col gap-3 md:gap-4">
        {/* Header optimizado para móvil */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl px-3 py-2 sm:px-4 sm:py-3 shadow-xl border border-white/20 flex-shrink-0">
          <div className="flex justify-between items-center gap-2">
            {/* Jugadores */}
            <div className="flex items-center gap-2 flex-1">
              <div className="bg-smash-red/30 rounded-lg px-2 py-1.5 flex-1 min-w-0">
                <p className="text-white/70 text-[10px] sm:text-xs leading-none">Jugador 1</p>
                <p className="text-white font-bold text-xs sm:text-sm truncate" 
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                  {session.player1.name}
                </p>
                <p className="text-smash-yellow text-base sm:text-lg font-bold leading-none"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                  {session.player1.score}
                </p>
              </div>
              <div className="text-white text-sm sm:text-lg font-bold px-1"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                VS
              </div>
              <div className="bg-smash-blue/30 rounded-lg px-2 py-1.5 flex-1 min-w-0">
                <p className="text-white/70 text-[10px] sm:text-xs leading-none">Jugador 2</p>
                <p className="text-white font-bold text-xs sm:text-sm truncate"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                  {session.player2.name}
                </p>
                <p className="text-smash-yellow text-base sm:text-lg font-bold leading-none"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                  {session.player2.score}
                </p>
              </div>
            </div>
            {/* Game y Formato */}
            <div className="flex gap-1.5 sm:gap-2">
              <div className="text-center bg-white/10 rounded-lg px-2 py-1 min-w-[45px]">
                <p className="text-white/70 text-[10px] leading-none">Game</p>
                <p className="text-smash-yellow text-lg sm:text-xl font-bold leading-tight"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                  {session.currentGame}
                </p>
              </div>
              <div className="text-center bg-white/10 rounded-lg px-2 py-1 min-w-[45px]">
                <p className="text-white/70 text-[10px] leading-none">Formato</p>
                <p className="text-smash-yellow text-sm sm:text-base font-bold leading-tight">{session.format}</p>
              </div>
            </div>
          </div>
          
          {/* Powered By Logo - Solo para Mendoza */}
          {isMendoza() && (
            <div className="mt-3 flex items-center justify-center gap-3 opacity-90">
              <span className="text-white/80 text-sm sm:text-lg font-bold tracking-wide">
                POWERED BY:
              </span>
              <img 
                src="/images/Logo_GSH.png" 
                alt="GSH Logo" 
                className="h-8 sm:h-12 object-contain filter drop-shadow-xl"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        {/* RPS Phase - Optimizado para móvil */}
        {session.phase === 'RPS' && (
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-2xl border-2 border-white/30 flex-1 flex flex-col justify-center relative overflow-hidden">
            {/* Decorative background elements - Ocultos en móvil */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5 sm:opacity-10 pointer-events-none">
              <div className="absolute top-2 sm:top-5 left-2 sm:left-5 text-3xl sm:text-6xl">✊</div>
              <div className="absolute top-2 sm:top-5 right-2 sm:right-5 text-3xl sm:text-6xl">✋</div>
              <div className="absolute bottom-2 sm:bottom-5 left-1/2 transform -translate-x-1/2 text-3xl sm:text-6xl">✌️</div>
            </div>

            {/* Content */}
            <div className="text-center mb-4 sm:mb-6 relative z-10">
              <div className="inline-block bg-gradient-to-r from-smash-yellow via-amber-400 to-smash-yellow text-transparent bg-clip-text mb-1 sm:mb-2">
                <h3 className="text-3xl sm:text-5xl font-black animate-pulse">✊ ✋ ✌️</h3>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-1 sm:mb-2 drop-shadow-lg">
                Piedra, Papel o Tijera
              </h3>
              <p className="text-base sm:text-lg text-white/80 font-semibold">
                ¿Quién ganó el RPS? 🏆
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-3xl mx-auto relative z-10 w-full px-2 sm:px-0">
              <button
                onClick={() => handleRPSWinner('player1')}
                className={useOriginalStyles ? 
                  "group py-12 sm:py-16 bg-gradient-to-br from-smash-red via-red-600 to-red-800 text-white font-black text-2xl sm:text-3xl rounded-2xl sm:rounded-3xl active:scale-95 transition-all duration-200 shadow-2xl border-4 border-white/30 relative overflow-hidden touch-manipulation" :
                  "group py-12 sm:py-16 text-white font-black text-2xl sm:text-3xl rounded-2xl sm:rounded-3xl active:scale-95 transition-all duration-200 shadow-2xl border-4 border-white/30 relative overflow-hidden touch-manipulation"
                }
                style={useOriginalStyles ? {} : {
                  background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl mb-2 sm:mb-3 group-active:scale-110 transition-transform">🔴</div>
                  <div className="text-xl sm:text-2xl px-2 leading-tight">{session.player1.name}</div>
                </div>
              </button>
              <button
                onClick={() => handleRPSWinner('player2')}
                className={useOriginalStyles ? 
                  "group py-12 sm:py-16 bg-gradient-to-br from-smash-blue via-blue-600 to-blue-800 text-white font-black text-2xl sm:text-3xl rounded-2xl sm:rounded-3xl active:scale-95 transition-all duration-200 shadow-2xl border-4 border-white/30 relative overflow-hidden touch-manipulation" :
                  "group py-12 sm:py-16 text-white font-black text-2xl sm:text-3xl rounded-2xl sm:rounded-3xl active:scale-95 transition-all duration-200 shadow-2xl border-4 border-white/30 relative overflow-hidden touch-manipulation"
                }
                style={useOriginalStyles ? {} : {
                  background: `linear-gradient(135deg, ${theme.colors.secondary}, ${theme.colors.primary})`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                <div className="relative z-10">
                  <div className="text-5xl sm:text-6xl mb-2 sm:mb-3 group-active:scale-110 transition-transform">🔵</div>
                  <div className="text-xl sm:text-2xl px-2 leading-tight">{session.player2.name}</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Stage Ban Phase - Optimizado para móvil */}
        {session.phase === 'STAGE_BAN' && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 shadow-xl border border-white/20 flex-1 flex flex-col overflow-hidden">
            <div className="text-center mb-2 sm:mb-3 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1"
                  style={{ textShadow: '3px 3px 6px rgba(0, 0, 0, 0.9), 1px 1px 3px rgba(0, 0, 0, 0.8)' }}>
                ❌ Banear Stage
              </h3>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                <p className="text-white text-sm sm:text-base font-semibold"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9), 1px 1px 2px rgba(0, 0, 0, 0.8)' }}>
                  Turno: {session[session.currentTurn]?.name}
                </p>
                <span className="hidden sm:inline text-white">|</span>
                <p className="text-smash-yellow text-sm sm:text-base font-bold"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9)' }}>
                  Baneos restantes: {session.bansRemaining}
                </p>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 overflow-y-auto pb-2">
              {/* Layout específico para Mendoza */}
              {isMendoza() ? (
                /* Mendoza: Layout hardcodeado solo para Game 1, dinámico para Games 2+ */
                session.currentGame === 1 ? (
                  /* Game 1 para Mendoza - Layout hardcodeado de 5 stages */
                  <>
                    {/* Primera fila: 3 stages */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      <button 
                        onClick={() => {
                          if (!session.bannedStages.includes('small-battlefield')) {
                            handleBanStage('small-battlefield');
                          }
                        }}
                        disabled={session.bannedStages.includes('small-battlefield')}
                        className={`relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                          session.bannedStages.includes('small-battlefield')
                            ? 'cursor-not-allowed border-white/20'
                            : 'active:scale-95 cursor-pointer border-white/20 active:border-red-500 shadow-lg'
                        }`}
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Small Battlefield.png" alt="Small Battlefield" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                            <span className="text-white text-xl sm:text-2xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg leading-tight">Small Battlefield</p>
                          </div>
                        </div>
                        {session.bannedStages.includes('small-battlefield') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={() => {
                          if (!session.bannedStages.includes('town-and-city')) {
                            handleBanStage('town-and-city');
                          }
                        }}
                        disabled={session.bannedStages.includes('town-and-city')}
                        className={`relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                          session.bannedStages.includes('town-and-city')
                            ? 'cursor-not-allowed border-white/20'
                            : 'active:scale-95 cursor-pointer border-white/20 active:border-red-500 shadow-lg'
                        }`}
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Town and City.png" alt="Town and City" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                            <span className="text-white text-xl sm:text-2xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg leading-tight">Town and City</p>
                          </div>
                        </div>
                        {session.bannedStages.includes('town-and-city') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={() => {
                          if (!session.bannedStages.includes('pokemon-stadium-2')) {
                            handleBanStage('pokemon-stadium-2');
                          }
                        }}
                        disabled={session.bannedStages.includes('pokemon-stadium-2')}
                        className={`relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                          session.bannedStages.includes('pokemon-stadium-2')
                            ? 'cursor-not-allowed border-white/20'
                            : 'active:scale-95 cursor-pointer border-white/20 active:border-red-500 shadow-lg'
                        }`}
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Pokemon Stadium 2.png" alt="Pokémon Stadium 2" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                            <span className="text-white text-xl sm:text-2xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg leading-tight">Pokémon Stadium 2</p>
                          </div>
                        </div>
                        {session.bannedStages.includes('pokemon-stadium-2') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                    </div>
                    
                    {/* Segunda fila: Smashville y Battlefield centrados */}
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                      <div className="hidden sm:block sm:col-span-1"></div>
                      <button 
                        onClick={() => {
                          if (!session.bannedStages.includes('smashville')) {
                            handleBanStage('smashville');
                          }
                        }}
                        disabled={session.bannedStages.includes('smashville')}
                        className={`sm:col-span-2 relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                          session.bannedStages.includes('smashville')
                            ? 'cursor-not-allowed border-white/20'
                            : 'cursor-pointer border-white/20 active:scale-95'
                        }`}
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Smashville.png" alt="Smashville" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg">Smashville</p>
                          </div>
                        </div>
                        {session.bannedStages.includes('smashville') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={() => {
                          if (!session.bannedStages.includes('battlefield')) {
                            handleBanStage('battlefield');
                          }
                        }}
                        disabled={session.bannedStages.includes('battlefield')}
                        className={`sm:col-span-2 relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                          session.bannedStages.includes('battlefield')
                            ? 'cursor-not-allowed border-white/20'
                            : 'cursor-pointer border-white/20 active:scale-95'
                        }`}
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Battlefield.png" alt="Battlefield" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg">Battlefield</p>
                          </div>
                        </div>
                        {session.bannedStages.includes('battlefield') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <div className="hidden sm:block sm:col-span-1"></div>
                    </div>
                  </>
                ) : (
                  /* Games 2-5 para Mendoza - Layout dinámico de 8 stages (3+3+2) */
                  <>
                    {/* Primera fila: 3 stages */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {getAllStagesForBanning().slice(0, 3).map((stage) => (
                        <button 
                          key={stage.id}
                          onClick={() => {
                            if (!session.bannedStages.includes(stage.id)) {
                              handleBanStage(stage.id);
                            }
                          }}
                          disabled={session.bannedStages.includes(stage.id)}
                          className={`relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                            session.bannedStages.includes(stage.id)
                              ? 'cursor-not-allowed border-white/20'
                              : 'active:scale-95 cursor-pointer border-white/20 active:border-red-500 shadow-lg'
                          }`}
                        >
                          <div className="aspect-video relative">
                            <img src={stage.image} alt={stage.name} className="w-full h-full object-cover" />
                            <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                              <span className="text-white text-xl sm:text-2xl">🎮</span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                              <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg leading-tight">{stage.name}</p>
                            </div>
                          </div>
                          {session.bannedStages.includes(stage.id) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                              <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {/* Segunda fila: 3 stages */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {getAllStagesForBanning().slice(3, 6).map((stage) => (
                        <button 
                          key={stage.id}
                          onClick={() => {
                            if (!session.bannedStages.includes(stage.id)) {
                              handleBanStage(stage.id);
                            }
                          }}
                          disabled={session.bannedStages.includes(stage.id)}
                          className={`relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                            session.bannedStages.includes(stage.id)
                              ? 'cursor-not-allowed border-white/20'
                              : 'active:scale-95 cursor-pointer border-white/20 active:border-red-500 shadow-lg'
                          }`}
                        >
                          <div className="aspect-video relative">
                            <img src={stage.image} alt={stage.name} className="w-full h-full object-cover" />
                            <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                              <span className="text-white text-xl sm:text-2xl">🎮</span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                              <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg leading-tight">{stage.name}</p>
                            </div>
                          </div>
                          {session.bannedStages.includes(stage.id) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                              <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {/* Tercera fila: 2 stages centrados */}
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                      <div className="hidden sm:block sm:col-span-1"></div>
                      {getAllStagesForBanning().slice(6, 8).map((stage) => (
                        <button 
                          key={stage.id}
                          onClick={() => {
                            if (!session.bannedStages.includes(stage.id)) {
                              handleBanStage(stage.id);
                            }
                          }}
                          disabled={session.bannedStages.includes(stage.id)}
                          className={`sm:col-span-2 relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                            session.bannedStages.includes(stage.id)
                              ? 'cursor-not-allowed border-white/20'
                              : 'cursor-pointer border-white/20 active:scale-95'
                          }`}
                        >
                          <div className="aspect-video relative">
                            <img src={stage.image} alt={stage.name} className="w-full h-full object-cover" />
                            <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                              <span className="text-white text-xl">🎮</span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                              <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg">{stage.name}</p>
                            </div>
                          </div>
                          {session.bannedStages.includes(stage.id) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                              <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                            </div>
                          )}
                        </button>
                      ))}
                      <div className="hidden sm:block sm:col-span-1"></div>
                    </div>
                  </>
                )
              ) : (
                /* Córdoba: Layout hardcodeado solo para Game 1, dinámico para Games 2+ */
                session.currentGame === 1 ? (
                  /* Game 1 para Córdoba - Layout hardcodeado de 5 stages */
                  <>
                    {/* Primera fila: 3 stages */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      <button 
                        onClick={() => {
                          const stage = getAvailableStages().find(s => s.id === 'small-battlefield');
                          if (stage && !session.bannedStages.includes('small-battlefield')) {
                            handleBanStage('small-battlefield');
                          }
                        }}
                        disabled={session.bannedStages.includes('small-battlefield')}
                        className={`relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                          session.bannedStages.includes('small-battlefield')
                            ? 'cursor-not-allowed border-white/20'
                            : 'active:scale-95 cursor-pointer border-white/20 active:border-red-500 shadow-lg'
                        }`}
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Small Battlefield.png" alt="Small Battlefield" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                            <span className="text-white text-xl sm:text-2xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg leading-tight">Small Battlefield</p>
                          </div>
                        </div>
                        {session.bannedStages.includes('small-battlefield') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={() => {
                          const stage = getAvailableStages().find(s => s.id === 'town-and-city');
                          if (stage && !session.bannedStages.includes('town-and-city')) {
                            handleBanStage('town-and-city');
                          }
                        }}
                        disabled={session.bannedStages.includes('town-and-city')}
                        className={`relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                          session.bannedStages.includes('town-and-city')
                            ? 'cursor-not-allowed border-white/20'
                            : 'active:scale-95 cursor-pointer border-white/20 active:border-red-500 shadow-lg'
                        }`}
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Town and City.png" alt="Town and City" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                            <span className="text-white text-xl sm:text-2xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg leading-tight">Town and City</p>
                          </div>
                        </div>
                        {session.bannedStages.includes('town-and-city') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={() => {
                          const stage = getAvailableStages().find(s => s.id === 'pokemon-stadium-2');
                          if (stage && !session.bannedStages.includes('pokemon-stadium-2')) {
                            handleBanStage('pokemon-stadium-2');
                          }
                        }}
                        disabled={session.bannedStages.includes('pokemon-stadium-2')}
                        className={`relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                          session.bannedStages.includes('pokemon-stadium-2')
                            ? 'cursor-not-allowed border-white/20'
                            : 'active:scale-95 cursor-pointer border-white/20 active:border-red-500 shadow-lg'
                        }`}
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Pokemon Stadium 2.png" alt="Pokémon Stadium 2" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                            <span className="text-white text-xl sm:text-2xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg leading-tight">Pokémon Stadium 2</p>
                          </div>
                        </div>
                        {session.bannedStages.includes('pokemon-stadium-2') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                    </div>
                    
                    {/* Segunda fila: Hollow Bastion y Battlefield centrados */}
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                      <div className="hidden sm:block sm:col-span-1"></div>
                      <button 
                        onClick={() => {
                          if (!session.bannedStages.includes('hollow-bastion')) {
                            handleBanStage('hollow-bastion');
                          }
                        }}
                        disabled={session.bannedStages.includes('hollow-bastion')}
                        className={`sm:col-span-2 relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                          session.bannedStages.includes('hollow-bastion')
                            ? 'cursor-not-allowed border-white/20'
                            : 'cursor-pointer border-white/20 active:scale-95'
                        }`}
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Hollow Bastion.png" alt="Hollow Bastion" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg">Hollow Bastion</p>
                          </div>
                        </div>
                        {session.bannedStages.includes('hollow-bastion') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={() => {
                          if (!session.bannedStages.includes('battlefield')) {
                            handleBanStage('battlefield');
                          }
                        }}
                        disabled={session.bannedStages.includes('battlefield')}
                        className={`sm:col-span-2 relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                          session.bannedStages.includes('battlefield')
                            ? 'cursor-not-allowed border-white/20'
                            : 'cursor-pointer border-white/20 active:scale-95'
                        }`}
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Battlefield.png" alt="Battlefield" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg">Battlefield</p>
                          </div>
                        </div>
                        {session.bannedStages.includes('battlefield') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <div className="hidden sm:block sm:col-span-1"></div>
                    </div>
                  </>
                ) : (
                  /* Games 2+ para Córdoba - Layout dinámico de 8 stages */
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {getAllStagesForBanning().slice(0, 3).map((stage) => {
                        const isBanned = session.bannedStages.includes(stage.id);
                        return (
                          <button
                            key={stage.id}
                            onClick={() => !isBanned && handleBanStage(stage.id)}
                            disabled={isBanned}
                            className={`relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                              isBanned
                                ? 'cursor-not-allowed border-white/20'
                                : 'active:scale-95 cursor-pointer border-white/20 active:border-red-500 shadow-lg'
                            }`}
                          >
                            <div className="aspect-video relative">
                              <img 
                                src={stage.image} 
                                alt={stage.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { 
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                                <span className="text-white text-xl sm:text-2xl">🎮</span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                                <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg leading-tight">{stage.name}</p>
                              </div>
                            </div>
                            {isBanned && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                                <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {getAllStagesForBanning().slice(3, 6).map((stage) => {
                        const isBanned = session.bannedStages.includes(stage.id);
                        return (
                          <button
                            key={stage.id}
                            onClick={() => !isBanned && handleBanStage(stage.id)}
                            disabled={isBanned}
                            className={`relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                              isBanned
                                ? 'cursor-not-allowed border-white/20'
                                : 'cursor-pointer border-white/20 active:scale-95'
                            }`}
                          >
                            <div className="aspect-video relative">
                              <img 
                                src={stage.image} 
                                alt={stage.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { 
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                                <span className="text-white text-xl">🎮</span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                                <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg">{stage.name}</p>
                              </div>
                            </div>
                            {isBanned && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                                <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                      <div className="hidden sm:block sm:col-span-1"></div>
                      {getAllStagesForBanning().slice(6, 8).map((stage) => {
                        const isBanned = session.bannedStages.includes(stage.id);
                        return (
                          <button
                            key={stage.id}
                            onClick={() => !isBanned && handleBanStage(stage.id)}
                            disabled={isBanned}
                            className={`sm:col-span-2 relative overflow-hidden rounded-lg sm:rounded-xl transition-all border-2 touch-manipulation ${
                              isBanned
                                ? 'cursor-not-allowed border-white/20'
                                : 'cursor-pointer border-white/20 active:scale-95'
                            }`}
                          >
                            <div className="aspect-video relative">
                              <img 
                                src={stage.image} 
                                alt={stage.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { 
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="hidden absolute inset-0 bg-gradient-to-r from-smash-purple to-smash-blue items-center justify-center">
                                <span className="text-white text-xl">🎮</span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                                <p className="text-white font-bold text-[10px] sm:text-xs text-center drop-shadow-lg">{stage.name}</p>
                              </div>
                            </div>
                            {isBanned && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                                <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                      <div className="hidden sm:block sm:col-span-1"></div>
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        )}

        {/* Stage Select Phase */}
        {session.phase === 'STAGE_SELECT' && (
          <div className="bg-white/10 rounded-xl p-2 sm:p-4 border border-white/20 flex-1 flex flex-col overflow-hidden">
            <div className="text-center mb-1.5 sm:mb-2 flex-shrink-0">
              <h3 className="text-lg sm:text-2xl font-bold text-white mb-0.5 sm:mb-1">
                🎯 Seleccionar Stage
              </h3>
              <p className="text-white text-sm sm:text-lg font-semibold truncate">
                Turno: {session[session.currentTurn]?.name}
              </p>
            </div>

            <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 overflow-y-auto pb-2">
              {/* Layout específico para Mendoza */}
              {isMendoza() ? (
                /* Mendoza: Layout hardcodeado solo para Game 1, dinámico para Games 2+ */
                session.currentGame === 1 ? (
                  /* Game 1 para Mendoza - Layout hardcodeado de 5 stages */
                  <>
                    {/* Primera fila: 3 stages */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      <button 
                        onClick={() => handleSelectStage('small-battlefield')}
                        className="relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Small Battlefield.png" alt="Small Battlefield" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center">Small Battlefield</p>
                          </div>
                        </div>
                        {session.bannedStages?.includes('small-battlefield') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={() => handleSelectStage('town-and-city')}
                        className="relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Town and City.png" alt="Town and City" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center">Town and City</p>
                          </div>
                        </div>
                        {session.bannedStages?.includes('town-and-city') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={() => handleSelectStage('pokemon-stadium-2')}
                        className="relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Pokemon Stadium 2.png" alt="Pokémon Stadium 2" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center">Pokémon Stadium 2</p>
                          </div>
                        </div>
                        {session.bannedStages?.includes('pokemon-stadium-2') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                    </div>
                    
                    {/* Segunda fila: Smashville y Battlefield centrados */}
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                      <div className="hidden sm:block sm:col-span-1"></div>
                      <button 
                        onClick={() => handleSelectStage('smashville')}
                        className="sm:col-span-2 relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Smashville.png" alt="Smashville" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center">Smashville</p>
                          </div>
                        </div>
                        {session.bannedStages?.includes('smashville') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={() => handleSelectStage('battlefield')}
                        className="sm:col-span-2 relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Battlefield.png" alt="Battlefield" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center">Battlefield</p>
                          </div>
                        </div>
                        {session.bannedStages?.includes('battlefield') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <div className="hidden sm:block sm:col-span-1"></div>
                    </div>
                  </>
                ) : (
                  /* Games 2-5 para Mendoza - Layout dinámico de 8 stages (3+3+2) */
                  <>
                    {/* Primera fila: 3 stages */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {getAllStagesForBanning().slice(0, 3).map((stage) => (
                        <button 
                          key={stage.id}
                          onClick={() => handleSelectStage(stage.id)}
                          className="relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                        >
                          <div className="aspect-video relative">
                            <img src={stage.image} alt={stage.name} className="w-full h-full object-cover" />
                            <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                              <span className="text-white text-xl">🎮</span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                              <p className="text-white font-bold text-[10px] sm:text-xs text-center">{stage.name}</p>
                            </div>
                          </div>
                          {session.bannedStages?.includes(stage.id) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                              <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {/* Segunda fila: 3 stages */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {getAllStagesForBanning().slice(3, 6).map((stage) => (
                        <button 
                          key={stage.id}
                          onClick={() => handleSelectStage(stage.id)}
                          className="relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                        >
                          <div className="aspect-video relative">
                            <img src={stage.image} alt={stage.name} className="w-full h-full object-cover" />
                            <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                              <span className="text-white text-xl">🎮</span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                              <p className="text-white font-bold text-[10px] sm:text-xs text-center">{stage.name}</p>
                            </div>
                          </div>
                          {session.bannedStages?.includes(stage.id) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                              <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    
                    {/* Tercera fila: 2 stages centrados */}
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                      <div className="hidden sm:block sm:col-span-1"></div>
                      {getAllStagesForBanning().slice(6, 8).map((stage) => (
                        <button 
                          key={stage.id}
                          onClick={() => handleSelectStage(stage.id)}
                          className="sm:col-span-2 relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                        >
                          <div className="aspect-video relative">
                            <img src={stage.image} alt={stage.name} className="w-full h-full object-cover" />
                            <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                              <span className="text-white text-xl">🎮</span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                              <p className="text-white font-bold text-[10px] sm:text-xs text-center">{stage.name}</p>
                            </div>
                          </div>
                          {session.bannedStages?.includes(stage.id) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                              <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                            </div>
                          )}
                        </button>
                      ))}
                      <div className="hidden sm:block sm:col-span-1"></div>
                    </div>
                  </>
                )
              ) : (
                /* Córdoba: Layout hardcodeado solo para Game 1, dinámico para Games 2+ */
                session.currentGame === 1 ? (
                  /* Game 1 para Córdoba - Layout hardcodeado de 5 stages */
                  <>
                    {/* Primera fila: 3 stages */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      <button 
                        onClick={() => {
                          const stage = getAvailableStages().find(s => s.id === 'small-battlefield');
                          if (stage) handleSelectStage('small-battlefield');
                        }}
                        className="relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Small Battlefield.png" alt="Small Battlefield" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center">Small Battlefield</p>
                          </div>
                        </div>
                        {session.bannedStages?.includes('small-battlefield') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={() => {
                          const stage = getAvailableStages().find(s => s.id === 'town-and-city');
                          if (stage) handleSelectStage('town-and-city');
                        }}
                        className="relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Town and City.png" alt="Town and City" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center">Town and City</p>
                          </div>
                        </div>
                        {session.bannedStages?.includes('town-and-city') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={() => {
                          const stage = getAvailableStages().find(s => s.id === 'pokemon-stadium-2');
                          if (stage) handleSelectStage('pokemon-stadium-2');
                        }}
                        className="relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Pokemon Stadium 2.png" alt="Pokémon Stadium 2" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center">Pokémon Stadium 2</p>
                          </div>
                        </div>
                        {session.bannedStages?.includes('pokemon-stadium-2') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                    </div>
                    
                    {/* Segunda fila: Hollow Bastion y Battlefield centrados */}
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                      <div className="hidden sm:block sm:col-span-1"></div>
                      <button 
                        onClick={() => {
                          handleSelectStage('hollow-bastion');
                        }}
                        className="sm:col-span-2 relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Hollow Bastion.png" alt="Hollow Bastion" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center">Hollow Bastion</p>
                          </div>
                        </div>
                        {session.bannedStages?.includes('hollow-bastion') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <button 
                        onClick={() => {
                          handleSelectStage('battlefield');
                        }}
                        className="sm:col-span-2 relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                      >
                        <div className="aspect-video relative">
                          <img src="/images/stages/Battlefield.png" alt="Battlefield" className="w-full h-full object-cover" />
                          <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                            <p className="text-white font-bold text-[10px] sm:text-xs text-center">Battlefield</p>
                          </div>
                        </div>
                        {session.bannedStages?.includes('battlefield') && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                            <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                          </div>
                        )}
                      </button>
                      <div className="hidden sm:block sm:col-span-1"></div>
                    </div>
                  </>
                ) : (
                  /* Games 2+ para Córdoba - Layout dinámico de 8 stages */
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {getAllStagesForBanning().slice(0, 3).map((stage) => {
                        const isBanned = session.bannedStages?.includes(stage.id);
                        return (
                          <button
                            key={stage.id}
                            onClick={() => handleSelectStage(stage.id)}
                            className="relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                          >
                            <div className="aspect-video relative">
                              <img 
                                src={stage.image} 
                                alt={stage.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { 
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                                <span className="text-white text-xl">🎮</span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                                <p className="text-white font-bold text-[10px] sm:text-xs text-center">{stage.name}</p>
                              </div>
                            </div>
                            {isBanned && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                                <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                      {getAllStagesForBanning().slice(3, 6).map((stage) => {
                        const isBanned = session.bannedStages?.includes(stage.id);
                        return (
                          <button
                            key={stage.id}
                            onClick={() => handleSelectStage(stage.id)}
                            className="relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                          >
                            <div className="aspect-video relative">
                              <img 
                                src={stage.image} 
                                alt={stage.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { 
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                                <span className="text-white text-xl">🎮</span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                                <p className="text-white font-bold text-[10px] sm:text-xs text-center">{stage.name}</p>
                              </div>
                            </div>
                            {isBanned && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                                <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-1.5 sm:gap-2">
                      <div className="hidden sm:block sm:col-span-1"></div>
                      {getAllStagesForBanning().slice(6, 8).map((stage) => {
                        const isBanned = session.bannedStages?.includes(stage.id);
                        return (
                          <button
                            key={stage.id}
                            onClick={() => handleSelectStage(stage.id)}
                            className="sm:col-span-2 relative overflow-hidden rounded-lg sm:rounded-xl border-2 border-white/20 active:scale-95 touch-manipulation"
                          >
                            <div className="aspect-video relative">
                              <img 
                                src={stage.image} 
                                alt={stage.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { 
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="hidden absolute inset-0 bg-green-600 items-center justify-center">
                                <span className="text-white text-xl">🎮</span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-1 sm:p-1.5">
                                <p className="text-white font-bold text-[10px] sm:text-xs text-center">{stage.name}</p>
                              </div>
                            </div>
                            {isBanned && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                                <span className="text-red-500 text-3xl sm:text-4xl font-bold drop-shadow-2xl">✖</span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                      <div className="hidden sm:block sm:col-span-1"></div>
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        )}

        {/* Character Select Phase */}
        {session.phase === 'CHARACTER_SELECT' && (
          <div className="bg-white/10 rounded-xl p-2 sm:p-4 border border-white/20 flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 mb-2 sm:mb-3">
              <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                <div>
                  <h3 className="text-lg sm:text-2xl font-bold text-white">
                    👤 Seleccionar Personaje
                  </h3>
                  <p className="text-white text-xs sm:text-base font-semibold truncate">
                    Turno: {session[session.currentTurn]?.name} | Stage: {getStageData(session.selectedStage)?.name}
                  </p>
                </div>
              </div>
              <input
                type="text"
                placeholder="Buscar personaje..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-smash-blue text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-3 flex-1 overflow-y-scroll pr-1 pb-2">
              {filteredCharacters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => handleSelectCharacter(character.id)}
                  className="aspect-square bg-white/5 rounded-lg sm:rounded-xl p-1 flex flex-col items-center justify-center overflow-hidden active:scale-95 border-2 border-white/20 touch-manipulation"
                  title={character.name}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <img 
                      src={character.image} 
                      alt={character.name}
                      className="w-full h-full object-contain"
                      onError={(e) => { e.target.src = '/images/characters/placeholder.png'; }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Playing Phase */}
        {session.phase === 'PLAYING' && (
          <div className="bg-white/10 rounded-xl p-2 sm:p-4 border-2 border-white/30 flex-1 flex flex-col justify-center">
            {/* Contenido principal */}
            <div>
              <div className="text-center mb-2 sm:mb-4">
                <h3 className="text-xl sm:text-3xl font-black text-white mb-1 sm:mb-2"
                    style={{ fontFamily: 'Anton' }}>
                  ¡EN COMBATE!
                </h3>
                <p className="text-white/80 text-sm sm:text-lg font-semibold">
                  Game {session.currentGame}
                </p>
              </div>

              {/* Matchup Display */}
              <div className={useOriginalStyles ? 
                "bg-white/10 rounded-xl sm:rounded-2xl p-2 sm:p-4 border-2 border-white/30" :
                "rounded-xl sm:rounded-2xl p-2 sm:p-4 border-2 border-white/30"
              }
                   style={useOriginalStyles ? {} : {
                     background: 'rgba(255,255,255,0.1)'
                   }}>
                <div className="grid grid-cols-3 gap-2 sm:gap-3 items-center">
                  {/* Player 1 */}
                  <div className="text-center space-y-1 sm:space-y-2">
                    <div className={useOriginalStyles ?
                      "bg-gradient-to-br from-smash-red/40 to-red-700/40 rounded-lg sm:rounded-xl p-1.5 sm:p-3 border-2 border-red-400/50 shadow-lg" :
                      "rounded-lg sm:rounded-xl p-1.5 sm:p-3 border-2 shadow-lg"
                    }
                         style={useOriginalStyles ? {} : {
                           background: `linear-gradient(135deg, ${theme.colors.primary}40, ${theme.colors.primary}60)`,
                           borderColor: `${theme.colors.primary}80`
                         }}>
                      <p className="text-white/70 text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-semibold">Jugador 1</p>
                      <p className="text-white font-black text-sm sm:text-xl mb-1 sm:mb-2 truncate"
                         style={{ fontFamily: 'Anton' }}>
                        {session.player1.name}
                      </p>
                      <div className="bg-black/30 rounded-md sm:rounded-lg p-1 sm:p-2 border border-white/20">
                        <p className={useOriginalStyles ?
                          "text-smash-yellow text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1" :
                          "text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1"
                        }
                           style={useOriginalStyles ? {} : { color: theme.colors.accent }}>Personaje</p>
                        <p className="text-white text-xs sm:text-sm font-bold truncate">
                          {getCharacterData(session.player1.character)?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className={useOriginalStyles ?
                      "bg-smash-yellow/20 rounded-md sm:rounded-lg p-1 sm:p-2 border-2 border-smash-yellow/50" :
                      "rounded-md sm:rounded-lg p-1 sm:p-2 border-2"
                    }
                         style={useOriginalStyles ? {} : {
                           backgroundColor: `${theme.colors.accent}20`,
                           borderColor: `${theme.colors.accent}50`
                         }}>
                      <p className="text-white/70 text-[10px] sm:text-xs font-semibold">Score</p>
                      <p className={useOriginalStyles ?
                        "text-smash-yellow text-xl sm:text-2xl font-black" :
                        "text-xl sm:text-2xl font-black"
                      }
                         style={useOriginalStyles ? 
                           {} : 
                           { color: theme.colors.accent }
                         }>
                        {session.player1.score}
                      </p>
                    </div>
                  </div>

                  {/* VS */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-white/20 rounded-full p-2 sm:p-3 border-2 sm:border-4 border-white/30">
                      <p className="text-white text-lg sm:text-2xl font-black"
                         style={{ fontFamily: 'Anton' }}>
                        VS
                      </p>
                    </div>
                    <div className="mt-1 sm:mt-2 bg-white/10 rounded-md sm:rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 border border-white/20">
                      <p className="text-white text-[10px] sm:text-sm font-semibold truncate">
                        {getStageData(session.selectedStage)?.name || 'Stage'}
                      </p>
                    </div>
                  </div>

                  {/* Player 2 */}
                  <div className="text-center space-y-1 sm:space-y-2">
                    <div className={useOriginalStyles ?
                      "bg-gradient-to-br from-smash-blue/40 to-blue-700/40 rounded-lg sm:rounded-xl p-1.5 sm:p-3 border-2 border-blue-400/50 shadow-lg" :
                      "rounded-lg sm:rounded-xl p-1.5 sm:p-3 border-2 shadow-lg"
                    }
                         style={useOriginalStyles ? {} : {
                           background: `linear-gradient(135deg, ${theme.colors.secondary}40, ${theme.colors.secondary}60)`,
                           borderColor: `${theme.colors.secondary}80`
                         }}>
                      <p className="text-white/70 text-[10px] sm:text-xs mb-0.5 sm:mb-1 font-semibold">Jugador 2</p>
                      <p className="text-white font-black text-sm sm:text-xl mb-1 sm:mb-2 truncate"
                         style={{ fontFamily: 'Anton' }}>
                        {session.player2.name}
                      </p>
                      <div className="bg-black/30 rounded-md sm:rounded-lg p-1 sm:p-2 border border-white/20">
                        <p className={useOriginalStyles ?
                          "text-smash-yellow text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1" :
                          "text-[10px] sm:text-xs font-semibold mb-0.5 sm:mb-1"
                        }
                           style={useOriginalStyles ? {} : { color: theme.colors.accent }}>Personaje</p>
                        <p className="text-white text-xs sm:text-sm font-bold truncate">
                          {getCharacterData(session.player2.character)?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className={useOriginalStyles ?
                      "bg-smash-yellow/20 rounded-md sm:rounded-lg p-1 sm:p-2 border-2 border-smash-yellow/50" :
                      "rounded-md sm:rounded-lg p-1 sm:p-2 border-2"
                    }
                         style={useOriginalStyles ? {} : {
                           backgroundColor: `${theme.colors.accent}20`,
                           borderColor: `${theme.colors.accent}50`
                         }}>
                      <p className="text-white/70 text-[10px] sm:text-xs font-semibold">Score</p>
                      <p className={useOriginalStyles ?
                        "text-smash-yellow text-xl sm:text-2xl font-black" :
                        "text-xl sm:text-2xl font-black"
                      }
                         style={useOriginalStyles ? 
                           {} : 
                           { color: theme.colors.accent }
                         }>
                        {session.player2.score}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mensaje informativo */}
              <div className="mt-3 text-center">
                <div className="inline-block bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                  <p className="text-white/90 text-sm font-semibold">
                    💡 El administrador marcará al ganador desde el panel
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Finished Phase */}
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
              <p className="text-white/90 text-base">
                ✨ El administrador configurará la próxima serie
              </p>
            </div>
          </div>
        )}

        {/* Modal de Repetir Personaje - Player 1 */}
        {showRepeatModal.player1 && previousCharacters.player1 && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-smash-red/90 to-red-700/90 rounded-2xl p-8 shadow-2xl border-4 border-white max-w-lg w-full animate-scale-in">
              <div className="text-center mb-6">
                <div className="text-7xl mb-4">🔄</div>
                <h3 className="text-3xl font-bold text-white mb-4"
                    style={{ fontFamily: 'Anton', textShadow: '3px 3px 0px rgba(0, 0, 0, 0.8)' }}>
                  {session.player1.name}
                </h3>
                <p className="text-white text-xl mb-4">
                  ¿Quieres repetir tu personaje anterior?
                </p>
                <div className="bg-black/40 rounded-xl p-6 border-2 border-white/30">
                  <img 
                    src={getCharacterData(previousCharacters.player1)?.image} 
                    alt={getCharacterData(previousCharacters.player1)?.name}
                    className="w-32 h-32 mx-auto mb-3 rounded-full border-4 border-white shadow-2xl"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="text-6xl mb-3 hidden">🎮</div>
                  <p className="text-white text-2xl font-bold"
                     style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                    {getCharacterData(previousCharacters.player1)?.name}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleRepeatCharacter('player1', false)}
                  className="py-5 bg-gray-700 hover:bg-gray-800 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white/30"
                  style={{ fontFamily: 'Anton' }}
                >
                  ❌ NO
                </button>
                <button
                  onClick={() => handleRepeatCharacter('player1', true)}
                  className="py-5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white"
                  style={{ fontFamily: 'Anton' }}
                >
                  ✓ SÍ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Repetir Personaje - Player 2 */}
        {showRepeatModal.player2 && previousCharacters.player2 && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-smash-blue/90 to-blue-700/90 rounded-2xl p-8 shadow-2xl border-4 border-white max-w-lg w-full animate-scale-in">
              <div className="text-center mb-6">
                <div className="text-7xl mb-4">🔄</div>
                <h3 className="text-3xl font-bold text-white mb-4"
                    style={{ fontFamily: 'Anton', textShadow: '3px 3px 0px rgba(0, 0, 0, 0.8)' }}>
                  {session.player2.name}
                </h3>
                <p className="text-white text-xl mb-4">
                  ¿Quieres repetir tu personaje anterior?
                </p>
                <div className="bg-black/40 rounded-xl p-6 border-2 border-white/30">
                  <img 
                    src={getCharacterData(previousCharacters.player2)?.image} 
                    alt={getCharacterData(previousCharacters.player2)?.name}
                    className="w-32 h-32 mx-auto mb-3 rounded-full border-4 border-white shadow-2xl"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div className="text-6xl mb-3 hidden">🎮</div>
                  <p className="text-white text-2xl font-bold"
                     style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                    {getCharacterData(previousCharacters.player2)?.name}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleRepeatCharacter('player2', false)}
                  className="py-5 bg-gray-700 hover:bg-gray-800 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white/30"
                  style={{ fontFamily: 'Anton' }}
                >
                  ❌ NO
                </button>
                <button
                  onClick={() => handleRepeatCharacter('player2', true)}
                  className="py-5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold text-xl rounded-xl transition-all active:scale-95 border-2 border-white"
                  style={{ fontFamily: 'Anton' }}
                >
                  ✓ SÍ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmación */}
        {pendingAction && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-smash-darker to-smash-purple rounded-2xl p-4 shadow-2xl border-4 border-smash-yellow max-w-sm w-full animate-scale-in">
              <div className="text-center mb-6">
                {/* Mostrar ícono del personaje o emoji genérico */}
                <div className="mb-4 flex justify-center">
                  {pendingAction.type === 'character' && pendingAction.characterImage ? (
                    <div className="w-16 h-16 bg-white/10 rounded-full border-4 border-smash-yellow p-1 flex items-center justify-center">
                      <img 
                        src={pendingAction.characterImage} 
                        alt={pendingAction.characterName}
                        className="w-full h-full object-contain rounded-full"
                      />
                    </div>
                  ) : (
                    <div className="text-4xl">
                      {pendingAction.type === 'rps' && '✊✋✌️'}
                      {pendingAction.type === 'ban' && '❌'}
                      {pendingAction.type === 'select' && '🎯'}
                      {pendingAction.type === 'character' && '👤'}
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  ¿Confirmar selección?
                </h3>
                <div className="bg-white/10 rounded-xl p-2 mt-2">
                  {pendingAction.type === 'rps' && (
                    <p className="text-white text-base">
                      <span className="text-smash-yellow font-bold">{pendingAction.playerName}</span> ganó el RPS
                    </p>
                  )}
                  {pendingAction.type === 'ban' && (
                    <p className="text-white text-base">
                      Banear <span className="text-red-400 font-bold">{pendingAction.stageName}</span>
                    </p>
                  )}
                  {pendingAction.type === 'select' && (
                    <p className="text-white text-base">
                      Seleccionar <span className="text-green-400 font-bold">{pendingAction.stageName}</span>
                    </p>
                  )}
                  {pendingAction.type === 'character' && (
                    <p className="text-white text-base">
                      Seleccionar <span className="text-smash-blue font-bold">{pendingAction.characterName}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={cancelAction}
                  className="py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold text-sm rounded-lg transition-all active:scale-95"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={confirmAction}
                  className="py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-sm rounded-lg transition-all active:scale-95"
                >
                  ✓ Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
