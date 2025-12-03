import { useState } from 'react';
import { useSession } from '../hooks/useSession';
import { STAGES_GAME1, STAGES_GAME2_PLUS, CHARACTERS, getStageData } from '../utils/constants';

export default function TabletControl({ sessionId }) {
  const { session, error, selectRPSWinner, banStage, selectStage, selectCharacter, setGameWinner } = useSession(sessionId);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingAction, setPendingAction] = useState(null);

  // Guard para evitar renders mientras sessionId no está disponible
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">🎮</div>
          <p className="text-white text-xl">Inicializando...</p>
        </div>
      </div>
    );
  }

  if (error && error === 'Sesión no encontrada') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple flex items-center justify-center">
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
      setPendingAction({ type: 'character', characterId, characterName: character.name, player: session.currentTurn });
    }
  };

  const confirmAction = () => {
    if (!pendingAction) return;

    switch (pendingAction.type) {
      case 'rps':
        selectRPSWinner(pendingAction.winner);
        break;
      case 'ban':
        banStage(pendingAction.stageId, pendingAction.player);
        break;
      case 'select':
        selectStage(pendingAction.stageId);
        break;
      case 'character':
        selectCharacter(pendingAction.characterId, pendingAction.player);
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
    return stageList.filter(stage => session.availableStages.includes(stage.id));
  };

  const filteredCharacters = CHARACTERS.filter(char =>
    char.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple flex items-center justify-center p-3 overflow-hidden">
      <div className="w-full h-full max-w-6xl flex flex-col">
        {/* Header compacto con información de la partida */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl px-6 py-3 mb-3 shadow-xl border border-white/20 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-smash-red/30 rounded-lg px-3 py-2">
                <p className="text-white/70 text-xs">Jugador 1</p>
                <p className="text-white font-bold text-lg">{session.player1.name}</p>
                <p className="text-smash-yellow text-xl font-bold">{session.player1.score}</p>
              </div>
              <div className="text-white text-2xl font-bold">VS</div>
              <div className="bg-smash-blue/30 rounded-lg px-3 py-2">
                <p className="text-white/70 text-xs">Jugador 2</p>
                <p className="text-white font-bold text-lg">{session.player2.name}</p>
                <p className="text-smash-yellow text-xl font-bold">{session.player2.score}</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-center bg-white/10 rounded-lg px-4 py-2">
                <p className="text-white/70 text-xs">Game</p>
                <p className="text-smash-yellow text-xl font-bold">{session.currentGame}</p>
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

            <div className="text-center mt-6 relative z-10">
              <p className="text-white/60 text-sm italic">
                El ganador tendrá ventaja en el baneo de stages
              </p>
            </div>
          </div>
        )}

        {/* Stage Ban Phase */}
        {session.phase === 'STAGE_BAN' && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-xl border border-white/20 flex-1 flex flex-col overflow-hidden">
            <div className="text-center mb-3 flex-shrink-0">
              <h3 className="text-2xl font-bold text-white mb-1">❌ Banear Stage</h3>
              <p className="text-smash-yellow text-lg font-semibold">
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
              {/* Segunda fila: 2 stages centrados para Game 1 (5 stages total) */}
              {getAvailableStages().length === 5 && (
                <div className="flex justify-center gap-2">
                  <div className="w-1/3"></div>
                  {getAvailableStages().slice(3, 5).map((stage) => {
                    const isBanned = session.bannedStages.includes(stage.id);
                    return (
                      <div key={stage.id} className="w-1/3">
                        <button
                          onClick={() => !isBanned && handleBanStage(stage.id)}
                          disabled={isBanned}
                          className={`relative overflow-hidden rounded-xl transition-all border-2 w-full ${
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
                      </div>
                    );
                  })}
                  <div className="w-1/3"></div>
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
                  <div className="flex justify-center gap-2">
                    <div className="w-1/3"></div>
                    {getAvailableStages().slice(6, 8).map((stage) => {
                      const isBanned = session.bannedStages.includes(stage.id);
                      return (
                        <div key={stage.id} className="w-1/3">
                          <button
                            onClick={() => !isBanned && handleBanStage(stage.id)}
                            disabled={isBanned}
                            className={`relative overflow-hidden rounded-xl transition-all border-2 w-full ${
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
                        </div>
                      );
                    })}
                    <div className="w-1/3"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Stage Select Phase */}
        {session.phase === 'STAGE_SELECT' && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 shadow-xl border border-white/20 flex-1 flex flex-col overflow-hidden">
            <div className="text-center mb-3 flex-shrink-0">
              <h3 className="text-2xl font-bold text-white mb-1">🎯 Seleccionar Stage</h3>
              <p className="text-smash-yellow text-lg font-semibold">
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
              {/* Segunda fila: 2 stages centrados para Game 1 (5 stages total) */}
              {getAvailableStages().length === 5 && (
                <div className="flex justify-center gap-2">
                  <div className="w-1/3"></div>
                  {getAvailableStages().slice(3, 5).map((stage) => (
                    <div key={stage.id} className="w-1/3">
                      <button
                        onClick={() => handleSelectStage(stage.id)}
                        className="relative overflow-hidden rounded-xl hover:scale-105 hover:shadow-xl transition-all border-2 border-white/20 hover:border-green-500 group active:scale-95 w-full"
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
                    </div>
                  ))}
                  <div className="w-1/3"></div>
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
                  <div className="flex justify-center gap-2">
                    <div className="w-1/3"></div>
                    {getAvailableStages().slice(6, 8).map((stage) => (
                      <div key={stage.id} className="w-1/3">
                        <button
                          onClick={() => handleSelectStage(stage.id)}
                          className="relative overflow-hidden rounded-xl hover:scale-105 hover:shadow-xl transition-all border-2 border-white/20 hover:border-green-500 group active:scale-95 w-full"
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
                      </div>
                    ))}
                    <div className="w-1/3"></div>
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
                  <h3 className="text-2xl font-bold text-white">👤 Seleccionar Personaje</h3>
                  <p className="text-smash-yellow text-base font-semibold">
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

            <div className="grid grid-cols-8 gap-2 flex-1 overflow-y-auto pr-2">
              {filteredCharacters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => handleSelectCharacter(character.id)}
                  className="aspect-square bg-gradient-to-br from-smash-purple to-smash-blue rounded-lg hover:scale-110 hover:shadow-lg transition-all p-1 flex flex-col items-center justify-center overflow-hidden group active:scale-95"
                  title={character.name}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <img 
                      src={character.image} 
                      alt={character.name}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform"
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
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20 flex-1 flex flex-col justify-center">
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">⚔️</div>
              <h3 className="text-3xl font-bold text-white mb-1">¡En Combate!</h3>
              <p className="text-white/70 text-base">Marca al ganador de este game</p>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-smash-red/20 rounded-lg p-3 text-center">
                <p className="text-white/70 text-xs mb-1">Jugador 1</p>
                <p className="text-white font-bold text-lg">{session.player1.name}</p>
                <p className="text-smash-yellow text-sm">{session.player1.character || 'N/A'}</p>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-white text-3xl font-bold">VS</div>
              </div>
              <div className="bg-smash-blue/20 rounded-lg p-3 text-center">
                <p className="text-white/70 text-xs mb-1">Jugador 2</p>
                <p className="text-white font-bold text-lg">{session.player2.name}</p>
                <p className="text-smash-yellow text-sm">{session.player2.character || 'N/A'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setGameWinner('player1')}
                className="py-10 bg-gradient-to-br from-smash-red via-red-600 to-red-700 text-white font-bold text-xl rounded-xl hover:shadow-2xl hover:scale-105 transition-all active:scale-95 border-4 border-red-400/50"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-5xl">🏆</span>
                  <span>{session.player1.name} Ganó</span>
                </div>
              </button>
              <button
                onClick={() => setGameWinner('player2')}
                className="py-10 bg-gradient-to-br from-smash-blue via-blue-600 to-blue-700 text-white font-bold text-xl rounded-xl hover:shadow-2xl hover:scale-105 transition-all active:scale-95 border-4 border-blue-400/50"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-5xl">🏆</span>
                  <span>{session.player2.name} Ganó</span>
                </div>
              </button>
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

        {/* Modal de Confirmación */}
        {pendingAction && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-smash-darker to-smash-purple rounded-2xl p-8 shadow-2xl border-4 border-smash-yellow max-w-md w-full animate-scale-in">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">
                  {pendingAction.type === 'rps' && '✊✋✌️'}
                  {pendingAction.type === 'ban' && '❌'}
                  {pendingAction.type === 'select' && '🎯'}
                  {pendingAction.type === 'character' && '👤'}
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
