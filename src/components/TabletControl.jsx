import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { STAGES_GAME1, STAGES_GAME2_PLUS, CHARACTERS, getStageData, getCharacterData } from '../utils/constants';

export default function TabletControl({ sessionId }) {
  const { session, selectRPSWinner, banStage, selectStage, selectCharacter, setGameWinner } = useWebSocket(sessionId);
  const error = session ? null : 'Conectando...';
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
             backgroundImage: 'url(/images/paperbg.jpg)',
             backgroundSize: 'cover',
             backgroundPosition: 'center',
             backgroundRepeat: 'no-repeat'
           }}>
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🎮</div>
          <p className="text-white text-xl">Inicializando...</p>
        </div>
      </div>
    );
  }

  if (error && error === 'Sesión no encontrada') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
           style={{
             backgroundImage: 'url(/images/paperbg.jpg)',
             backgroundSize: 'cover',
             backgroundPosition: 'center',
             backgroundRepeat: 'no-repeat'
           }}>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-3xl font-bold text-white mb-4">Sesión no encontrada</h2>
          <p className="text-white/70 text-lg mb-6">
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
             backgroundImage: 'url(/images/paperbg.jpg)',
             backgroundSize: 'cover',
             backgroundPosition: 'center',
             backgroundRepeat: 'no-repeat'
           }}>
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🎮</div>
          <p className="text-white text-xl">Cargando sesión...</p>
          {error && <p className="text-yellow-400 text-sm mt-2">{error}</p>}
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
      const stage = getAvailableStages().find(s => s.id === stageId);
      setPendingAction({ type: 'ban', stageId, stageName: stage.name, player: session.currentTurn });
    }
  };

  const handleSelectStage = (stageId) => {
    if (session.currentTurn) {
      const stage = getAvailableStages().find(s => s.id === stageId);
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
    const stageList = session.currentGame === 1 ? STAGES_GAME1 : STAGES_GAME2_PLUS;
    const filtered = stageList.filter(stage => session.availableStages.includes(stage.id));
    console.log('📊 Game:', session.currentGame, '| Total stages en constants:', stageList.length, '| Disponibles en session:', session.availableStages.length, '| Filtrados:', filtered.length);
    console.log('Stages disponibles:', session.availableStages);
    console.log('Stages filtrados:', filtered.map(s => s.name));
    return filtered;
  };

  const filteredCharacters = CHARACTERS.filter(char =>
    char.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen flex items-center justify-center p-3 overflow-hidden"
         style={{
           backgroundImage: 'url(/images/paperbg.jpg)',
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           backgroundRepeat: 'no-repeat',
           fontFamily: 'Anton, sans-serif'
         }}>
      <div className="w-full h-full max-w-6xl flex flex-col">
        {/* Header compacto con información de la partida */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl px-6 py-3 mb-3 shadow-xl border border-white/20 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-smash-red/30 rounded-lg px-3 py-2">
                <p className="text-white/70 text-xs">Jugador 1</p>
                <p className="text-white font-bold text-lg" 
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                  {session.player1.name}
                </p>
                <p className="text-smash-yellow text-xl font-bold"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                  {session.player1.score}
                </p>
              </div>
              <div className="text-white text-2xl font-bold"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                VS
              </div>
              <div className="bg-smash-blue/30 rounded-lg px-3 py-2">
                <p className="text-white/70 text-xs">Jugador 2</p>
                <p className="text-white font-bold text-lg"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                  {session.player2.name}
                </p>
                <p className="text-smash-yellow text-xl font-bold"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                  {session.player2.score}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-center bg-white/10 rounded-lg px-4 py-2">
                <p className="text-white/70 text-xs">Game</p>
                <p className="text-smash-yellow text-xl font-bold"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                  {session.currentGame}
                </p>
              </div>
              <div className="text-center bg-white/10 rounded-lg px-4 py-2">
                <p className="text-white/70 text-xs">Formato</p>
                <p className="text-smash-yellow text-xl font-bold">{session.format}</p>
              </div>
            </div>
          </div>
        </div>

        {/* RPS Phase */}
        {session.phase === 'RPS' && (
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-xl p-8 shadow-2xl border-2 border-white/30 flex-1 flex flex-col justify-center relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-10 left-10 text-9xl">✊</div>
              <div className="absolute top-10 right-10 text-9xl">✋</div>
              <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-9xl">✌️</div>
            </div>

            {/* Content */}
            <div className="text-center mb-8 relative z-10">
              <div className="inline-block bg-gradient-to-r from-smash-yellow via-amber-400 to-smash-yellow text-transparent bg-clip-text mb-4">
                <h3 className="text-8xl font-black animate-pulse">✊ ✋ ✌️</h3>
              </div>
              <h3 className="text-4xl font-black text-white mb-3 drop-shadow-lg">
                Piedra, Papel o Tijera
              </h3>
              <p className="text-xl text-white/80 font-semibold">
                ¿Quién ganó el RPS? 🏆
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-8 max-w-3xl mx-auto relative z-10 w-full">
              <button
                onClick={() => handleRPSWinner('player1')}
                className="group py-20 bg-gradient-to-br from-smash-red via-red-600 to-red-800 text-white font-black text-4xl rounded-3xl hover:scale-105 transition-all duration-300 shadow-2xl active:scale-95 border-4 border-white/30 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                <div className="relative z-10">
                  <div className="text-7xl mb-3 group-hover:scale-110 transition-transform">🔴</div>
                  <div className="text-3xl">{session.player1.name}</div>
                </div>
              </button>
              <button
                onClick={() => handleRPSWinner('player2')}
                className="group py-20 bg-gradient-to-br from-smash-blue via-blue-600 to-blue-800 text-white font-black text-4xl rounded-3xl hover:scale-105 transition-all duration-300 shadow-2xl active:scale-95 border-4 border-white/30 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                <div className="relative z-10">
                  <div className="text-7xl mb-3 group-hover:scale-110 transition-transform">🔵</div>
                  <div className="text-3xl">{session.player2.name}</div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Stage Ban Phase */}
        {session.phase === 'STAGE_BAN' && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-xl border border-white/20 flex-1 flex flex-col overflow-hidden">
            <div className="text-center mb-3 flex-shrink-0">
              <h3 className="text-2xl font-bold text-white mb-1"
                  style={{ textShadow: '3px 3px 6px rgba(0, 0, 0, 0.9), 1px 1px 3px rgba(0, 0, 0, 0.8)' }}>
                ❌ Banear Stage
              </h3>
              <p className="text-white text-lg font-semibold"
                 style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9), 1px 1px 2px rgba(0, 0, 0, 0.8)' }}>
                Turno: {session[session.currentTurn]?.name} | Baneos restantes: {session.bansRemaining}
              </p>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
              {/* Primera fila: 3 stages */}
              <div className="grid grid-cols-3 gap-2">
                {getAvailableStages().slice(0, 3).map((stage) => {
                  const isBanned = session.bannedStages.includes(stage.id);
                  return (
                    <button
                      key={stage.id}
                      onClick={() => !isBanned && handleBanStage(stage.id)}
                      disabled={isBanned}
                      className={`relative overflow-hidden rounded-xl transition-all border-2 ${
                        isBanned
                          ? 'opacity-30 cursor-not-allowed border-red-500/50'
                          : 'hover:scale-105 hover:shadow-xl cursor-pointer border-white/20 hover:border-red-500 active:scale-95'
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
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-1.5">
                          <p className="text-white font-bold text-xs text-center drop-shadow-lg">{stage.name}</p>
                        </div>
                      </div>
                      {isBanned && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                          <span className="text-red-500 text-4xl font-bold drop-shadow-2xl">✖</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Segunda fila: 1 stage centrado para Game 1 (4 stages restantes) */}
              {getAvailableStages().length === 4 && (
                <div className="grid grid-cols-3 gap-2">
                  <div></div>
                  {getAvailableStages().slice(3, 4).map((stage) => {
                    const isBanned = session.bannedStages.includes(stage.id);
                    return (
                      <button
                        key={stage.id}
                        onClick={() => !isBanned && handleBanStage(stage.id)}
                        disabled={isBanned}
                        className={`relative overflow-hidden rounded-xl transition-all border-2 ${
                          isBanned
                            ? 'opacity-30 cursor-not-allowed border-red-500/50'
                            : 'hover:scale-105 hover:shadow-xl cursor-pointer border-white/20 hover:border-red-500 active:scale-95'
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
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-1.5">
                              <p className="text-white font-bold text-xs text-center drop-shadow-lg">{stage.name}</p>
                            </div>
                          </div>
                          {isBanned && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                              <span className="text-red-500 text-4xl font-bold drop-shadow-2xl">✖</span>
                            </div>
                          )}
                        </button>
                    );
                  })}
                  <div></div>
                </div>
              )}
              {/* Segunda fila: 2 stages centrados para Game 1 (5 stages total) */}
              {getAvailableStages().length === 5 && (
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-1"></div>
                  {getAvailableStages().slice(3, 5).map((stage, index) => {
                    const isBanned = session.bannedStages.includes(stage.id);
                    return (
                      <button
                        key={stage.id}
                        onClick={() => !isBanned && handleBanStage(stage.id)}
                        disabled={isBanned}
                        className={`col-span-2 relative overflow-hidden rounded-xl transition-all border-2 ${
                          isBanned
                            ? 'opacity-30 cursor-not-allowed border-red-500/50'
                            : 'hover:scale-105 hover:shadow-xl cursor-pointer border-white/20 hover:border-red-500 active:scale-95'
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
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-1.5">
                              <p className="text-white font-bold text-xs text-center drop-shadow-lg">{stage.name}</p>
                            </div>
                          </div>
                          {isBanned && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                              <span className="text-red-500 text-4xl font-bold drop-shadow-2xl">✖</span>
                            </div>
                          )}
                        </button>
                    );
                  })}
                  <div className="col-span-1"></div>
                </div>
              )}
              {/* Segunda y tercera fila: stages para Game 2+ (8 stages total) */}
              {getAvailableStages().length > 5 && (
                <>
                  {/* Segunda fila: stages 4, 5, 6 */}
                  <div className="grid grid-cols-3 gap-2">
                    {getAvailableStages().slice(3, 6).map((stage) => {
                      const isBanned = session.bannedStages.includes(stage.id);
                      return (
                        <button
                          key={stage.id}
                          onClick={() => !isBanned && handleBanStage(stage.id)}
                          disabled={isBanned}
                          className={`relative overflow-hidden rounded-xl transition-all border-2 ${
                            isBanned
                              ? 'opacity-30 cursor-not-allowed border-red-500/50'
                              : 'hover:scale-105 hover:shadow-xl cursor-pointer border-white/20 hover:border-red-500 active:scale-95'
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
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-1.5">
                              <p className="text-white font-bold text-xs text-center drop-shadow-lg">{stage.name}</p>
                            </div>
                          </div>
                          {isBanned && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                              <span className="text-red-500 text-4xl font-bold drop-shadow-2xl">✖</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Tercera fila: últimos 2 stages centrados (7 y 8) */}
                  <div className="grid grid-cols-6 gap-2">
                    <div className="col-span-1"></div>
                    {getAvailableStages().slice(6).map((stage) => {
                      const isBanned = session.bannedStages.includes(stage.id);
                      return (
                        <button
                          key={stage.id}
                          onClick={() => !isBanned && handleBanStage(stage.id)}
                          disabled={isBanned}
                          className={`col-span-2 relative overflow-hidden rounded-xl transition-all border-2 ${
                            isBanned
                              ? 'opacity-30 cursor-not-allowed border-red-500/50'
                              : 'hover:scale-105 hover:shadow-xl cursor-pointer border-white/20 hover:border-red-500 active:scale-95'
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
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-1.5">
                                <p className="text-white font-bold text-xs text-center drop-shadow-lg">{stage.name}</p>
                              </div>
                            </div>
                            {isBanned && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                                <span className="text-red-500 text-4xl font-bold drop-shadow-2xl">✖</span>
                              </div>
                            )}
                          </button>
                      );
                    })}
                    <div className="col-span-1"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Stage Select Phase */}
        {session.phase === 'STAGE_SELECT' && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-xl border border-white/20 flex-1 flex flex-col overflow-hidden">
            <div className="text-center mb-2 flex-shrink-0">
              <h3 className="text-2xl font-bold text-white mb-1"
                  style={{ textShadow: '3px 3px 6px rgba(0, 0, 0, 0.9), 1px 1px 3px rgba(0, 0, 0, 0.8)' }}>
                🎯 Seleccionar Stage
              </h3>
              <p className="text-white text-lg font-semibold"
                 style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9), 1px 1px 2px rgba(0, 0, 0, 0.8)' }}>
                Turno: {session[session.currentTurn]?.name}
              </p>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
              {/* Primera fila: 3 stages */}
              <div className="grid grid-cols-3 gap-2">
                {getAvailableStages().slice(0, 3).map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => handleSelectStage(stage.id)}
                    className="relative overflow-hidden rounded-xl hover:scale-105 hover:shadow-xl transition-all border-2 border-white/20 hover:border-green-500 group active:scale-95"
                  >
                    <div className="aspect-video relative">
                      <img 
                        src={stage.image} 
                        alt={stage.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={(e) => { 
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 items-center justify-center">
                        <span className="text-white text-xl">🎮</span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-1.5">
                        <p className="text-white font-bold text-xs text-center drop-shadow-lg">{stage.name}</p>
                      </div>
                      <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/20 transition-colors duration-300"></div>
                    </div>
                  </button>
                ))}
              </div>
              {/* Segunda fila: 1 stage centrado para Game 1 (4 stages restantes) */}
              {getAvailableStages().length === 4 && (
                <div className="grid grid-cols-3 gap-2">
                  <div></div>
                  {getAvailableStages().slice(3, 4).map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => handleSelectStage(stage.id)}
                      className="relative overflow-hidden rounded-xl hover:scale-105 hover:shadow-xl transition-all border-2 border-white/20 hover:border-green-500 group active:scale-95"
                    >
                        <div className="aspect-video relative">
                          <img 
                            src={stage.image} 
                            alt={stage.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => { 
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="hidden absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-1.5">
                            <p className="text-white font-bold text-xs text-center drop-shadow-lg">{stage.name}</p>
                          </div>
                          <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/20 transition-colors duration-300"></div>
                        </div>
                      </button>
                  ))}
                  <div></div>
                </div>
              )}
              {/* Segunda fila: 2 stages centrados para Game 1 (5 stages total) */}
              {getAvailableStages().length === 5 && (
                <div className="grid grid-cols-6 gap-2">
                  <div className="col-span-1"></div>
                  {getAvailableStages().slice(3, 5).map((stage) => (
                    <button
                      key={stage.id}
                      onClick={() => handleSelectStage(stage.id)}
                      className="col-span-2 relative overflow-hidden rounded-xl hover:scale-105 hover:shadow-xl transition-all border-2 border-white/20 hover:border-green-500 group active:scale-95"
                    >
                        <div className="aspect-video relative">
                          <img 
                            src={stage.image} 
                            alt={stage.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => { 
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="hidden absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-1.5">
                            <p className="text-white font-bold text-xs text-center drop-shadow-lg">{stage.name}</p>
                          </div>
                          <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/20 transition-colors duration-300"></div>
                        </div>
                      </button>
                  ))}
                  <div className="col-span-1"></div>
                </div>
              )}
              {/* Segunda y tercera fila: stages para Game 2+ (8 stages total) */}
              {getAvailableStages().length > 5 && (
                <>
                  {/* Segunda fila: stages 4, 5, 6 */}
                  <div className="grid grid-cols-3 gap-2">
                    {getAvailableStages().slice(3, 6).map((stage) => (
                      <button
                        key={stage.id}
                        onClick={() => handleSelectStage(stage.id)}
                        className="relative overflow-hidden rounded-xl hover:scale-105 hover:shadow-xl transition-all border-2 border-white/20 hover:border-green-500 group active:scale-95"
                      >
                        <div className="aspect-video relative">
                          <img 
                            src={stage.image} 
                            alt={stage.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => { 
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="hidden absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 items-center justify-center">
                            <span className="text-white text-xl">🎮</span>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-1.5">
                            <p className="text-white font-bold text-xs text-center drop-shadow-lg">{stage.name}</p>
                          </div>
                          <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/20 transition-colors duration-300"></div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {/* Tercera fila: últimos 2 stages centrados (7 y 8) */}
                  <div className="grid grid-cols-6 gap-2">
                    <div className="col-span-1"></div>
                    {getAvailableStages().slice(6, 8).map((stage) => (
                      <button
                        key={stage.id}
                        onClick={() => handleSelectStage(stage.id)}
                        className="col-span-2 relative overflow-hidden rounded-xl hover:scale-105 hover:shadow-xl transition-all border-2 border-white/20 hover:border-green-500 group active:scale-95"
                      >
                          <div className="aspect-video relative">
                            <img 
                              src={stage.image} 
                              alt={stage.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              onError={(e) => { 
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className="hidden absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 items-center justify-center">
                              <span className="text-white text-xl">🎮</span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 to-transparent p-1.5">
                              <p className="text-white font-bold text-xs text-center drop-shadow-lg">{stage.name}</p>
                            </div>
                            <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/20 transition-colors duration-300"></div>
                          </div>
                        </button>
                    ))}
                    <div className="col-span-1"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Character Select Phase */}
        {session.phase === 'CHARACTER_SELECT' && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-xl border border-white/20 flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 mb-3">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-2xl font-bold text-white"
                      style={{ textShadow: '3px 3px 6px rgba(0, 0, 0, 0.9), 1px 1px 3px rgba(0, 0, 0, 0.8)' }}>
                    👤 Seleccionar Personaje
                  </h3>
                  <p className="text-white text-base font-semibold"
                     style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9), 1px 1px 2px rgba(0, 0, 0, 0.8)' }}>
                    Turno: {session[session.currentTurn]?.name} | Stage: {getStageData(session.selectedStage)?.name}
                  </p>
                </div>
              </div>
              <input
                type="text"
                placeholder="Buscar personaje..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-smash-blue text-sm"
              />
            </div>

            <div className="grid grid-cols-6 gap-6 flex-1 overflow-y-scroll pr-2">
              {filteredCharacters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => handleSelectCharacter(character.id)}
                  className="aspect-square bg-white/5 hover:bg-white/20 rounded-xl hover:scale-110 hover:brightness-110 transition-all p-3 flex flex-col items-center justify-center overflow-hidden group active:scale-95 border-2 border-white/20 hover:border-smash-yellow shadow-lg hover:shadow-2xl"
                  title={character.name}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <img 
                      src={character.image} 
                      alt={character.name}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform drop-shadow-lg"
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
          <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md rounded-xl p-8 shadow-2xl border-2 border-white/30 flex-1 flex flex-col justify-center relative overflow-hidden">
            {/* Efecto de fondo animado */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 text-9xl animate-pulse">⚔️</div>
              <div className="absolute bottom-10 right-10 text-9xl animate-pulse" style={{ animationDelay: '1s' }}>⚔️</div>
            </div>

            {/* Contenido principal */}
            <div className="relative z-10">
              <div className="text-center mb-8">
                <div className="text-8xl mb-4 animate-bounce">⚔️</div>
                <h3 className="text-5xl font-black text-white mb-3"
                    style={{ fontFamily: 'Anton', textShadow: '4px 4px 8px rgba(0, 0, 0, 0.8)' }}>
                  ¡EN COMBATE!
                </h3>
                <p className="text-white/80 text-2xl font-semibold"
                   style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                  Game {session.currentGame}
                </p>
              </div>

              {/* Matchup Display */}
              <div className="bg-gradient-to-r from-smash-red/20 via-white/10 to-smash-blue/20 rounded-2xl p-8 border-2 border-white/30 shadow-2xl">
                <div className="grid grid-cols-3 gap-6 items-center">
                  {/* Player 1 */}
                  <div className="text-center space-y-3">
                    <div className="bg-gradient-to-br from-smash-red/40 to-red-700/40 rounded-xl p-6 border-2 border-red-400/50 shadow-lg">
                      <p className="text-white/70 text-sm mb-2 font-semibold">Jugador 1</p>
                      <p className="text-white font-black text-3xl mb-3"
                         style={{ fontFamily: 'Anton', textShadow: '3px 3px 6px rgba(0, 0, 0, 0.8)' }}>
                        {session.player1.name}
                      </p>
                      <div className="bg-black/30 rounded-lg p-3 border border-white/20">
                        <p className="text-smash-yellow text-sm font-semibold mb-1">Personaje</p>
                        <p className="text-white text-lg font-bold">
                          {getCharacterData(session.player1.character)?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="bg-smash-yellow/20 rounded-lg p-3 border-2 border-smash-yellow/50">
                      <p className="text-white/70 text-xs font-semibold">Score</p>
                      <p className="text-smash-yellow text-4xl font-black"
                         style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                        {session.player1.score}
                      </p>
                    </div>
                  </div>

                  {/* VS */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-gradient-to-br from-white/20 to-white/10 rounded-full p-6 border-4 border-white/30 shadow-2xl">
                      <p className="text-white text-5xl font-black"
                         style={{ fontFamily: 'Anton', textShadow: '4px 4px 8px rgba(0, 0, 0, 0.8)' }}>
                        VS
                      </p>
                    </div>
                    <div className="mt-4 bg-white/10 rounded-lg px-4 py-2 border border-white/20">
                      <p className="text-white text-lg font-semibold">
                        {getStageData(session.selectedStage)?.name || 'Stage'}
                      </p>
                    </div>
                  </div>

                  {/* Player 2 */}
                  <div className="text-center space-y-3">
                    <div className="bg-gradient-to-br from-smash-blue/40 to-blue-700/40 rounded-xl p-6 border-2 border-blue-400/50 shadow-lg">
                      <p className="text-white/70 text-sm mb-2 font-semibold">Jugador 2</p>
                      <p className="text-white font-black text-3xl mb-3"
                         style={{ fontFamily: 'Anton', textShadow: '3px 3px 6px rgba(0, 0, 0, 0.8)' }}>
                        {session.player2.name}
                      </p>
                      <div className="bg-black/30 rounded-lg p-3 border border-white/20">
                        <p className="text-smash-yellow text-sm font-semibold mb-1">Personaje</p>
                        <p className="text-white text-lg font-bold">
                          {getCharacterData(session.player2.character)?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="bg-smash-yellow/20 rounded-lg p-3 border-2 border-smash-yellow/50">
                      <p className="text-white/70 text-xs font-semibold">Score</p>
                      <p className="text-smash-yellow text-4xl font-black"
                         style={{ textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>
                        {session.player2.score}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mensaje informativo */}
              <div className="mt-6 text-center">
                <div className="inline-block bg-white/10 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/20">
                  <p className="text-white/90 text-lg font-semibold">
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
            <div className="bg-gradient-to-br from-smash-darker to-smash-purple rounded-2xl p-8 shadow-2xl border-4 border-smash-yellow max-w-md w-full animate-scale-in">
              <div className="text-center mb-6">
                {/* Mostrar ícono del personaje o emoji genérico */}
                <div className="mb-4 flex justify-center">
                  {pendingAction.type === 'character' && pendingAction.characterImage ? (
                    <div className="w-24 h-24 bg-white/10 rounded-full border-4 border-smash-yellow p-2 flex items-center justify-center">
                      <img 
                        src={pendingAction.characterImage} 
                        alt={pendingAction.characterName}
                        className="w-full h-full object-contain rounded-full"
                      />
                    </div>
                  ) : (
                    <div className="text-6xl">
                      {pendingAction.type === 'rps' && '✊✋✌️'}
                      {pendingAction.type === 'ban' && '❌'}
                      {pendingAction.type === 'select' && '🎯'}
                      {pendingAction.type === 'character' && '👤'}
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  ¿Confirmar selección?
                </h3>
                <div className="bg-white/10 rounded-xl p-4 mt-4">
                  {pendingAction.type === 'rps' && (
                    <p className="text-white text-xl">
                      <span className="text-smash-yellow font-bold">{pendingAction.playerName}</span> ganó el RPS
                    </p>
                  )}
                  {pendingAction.type === 'ban' && (
                    <p className="text-white text-xl">
                      Banear <span className="text-red-400 font-bold">{pendingAction.stageName}</span>
                    </p>
                  )}
                  {pendingAction.type === 'select' && (
                    <p className="text-white text-xl">
                      Seleccionar <span className="text-green-400 font-bold">{pendingAction.stageName}</span>
                    </p>
                  )}
                  {pendingAction.type === 'character' && (
                    <p className="text-white text-xl">
                      Seleccionar <span className="text-smash-blue font-bold">{pendingAction.characterName}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={cancelAction}
                  className="py-4 bg-gray-600 hover:bg-gray-700 text-white font-bold text-lg rounded-xl transition-all active:scale-95"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={confirmAction}
                  className="py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold text-lg rounded-xl transition-all active:scale-95"
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
