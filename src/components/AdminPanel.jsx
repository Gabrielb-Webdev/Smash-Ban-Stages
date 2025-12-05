import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';

let adminSocket = null;

export default function AdminPanel() {
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [format, setFormat] = useState('BO3');
  const [currentSessionId] = useState('main-session'); // ID fijo
  const [session, setSession] = useState(null);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  
  // Estados para configuración desde JSON
  const [tournamentConfig, setTournamentConfig] = useState(null);
  const [showPresetPlayers, setShowPresetPlayers] = useState(false);

  // Cargar configuración desde JSON
  useEffect(() => {
    const loadTournamentConfig = async () => {
      try {
        const response = await fetch('/config/tournament-settings.json');
        if (response.ok) {
          const config = await response.json();
          setTournamentConfig(config);
          
          // Auto-llenar con valores por defecto si están habilitados
          if (config.quickSettings?.autoFillLastUsed) {
            setPlayer1Name(config.defaultPlayers?.player1 || '');
            setPlayer2Name(config.defaultPlayers?.player2 || '');
          }
          setFormat(config.defaultFormat || 'BO3');
        }
      } catch (error) {
        console.error('Error cargando configuración del torneo:', error);
      }
    };
    
    loadTournamentConfig();
  }, []);

  useEffect(() => {
    // Conectar al WebSocket cuando se monta el componente
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    adminSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000
    });

    adminSocket.on('connect', () => {
      console.log('Admin conectado al servidor WebSocket');
      // Siempre unirse a la sesión fija
      adminSocket.emit('join-session', 'main-session');
    });

    adminSocket.on('session-created', (data) => {
      console.log('Sesión creada:', data);
      setSession(data.session);
    });

    adminSocket.on('session-joined', (data) => {
      console.log('Sesión unida:', data);
      setSession(data.session);
    });

    adminSocket.on('session-updated', (data) => {
      console.log('Sesión actualizada:', data);
      setSession(data.session);
      // Actualizar los scores locales cuando la sesión se actualiza
      setPlayer1Score(data.session.player1.score);
      setPlayer2Score(data.session.player2.score);
    });

    adminSocket.on('series-finished', (data) => {
      console.log('Serie finalizada:', data);
      setSession(data.session);
    });

    return () => {
      if (adminSocket) {
        adminSocket.disconnect();
      }
    };
  }, []);

  // Calcular game actual basado en los puntos totales
  const getCurrentGame = () => {
    const totalPoints = player1Score + player2Score;
    return totalPoints + 1; // Game 1 si ambos tienen 0 puntos, Game 2 si hay 1 punto total, etc.
  };

  // Funciones para manejar presets de jugadores
  const handlePresetPlayer = (playerData, playerNumber) => {
    if (playerNumber === 1) {
      setPlayer1Name(playerData.name);
    } else {
      setPlayer2Name(playerData.name);
    }
    setShowPresetPlayers(false);
  };

  const handleQuickSwap = () => {
    const temp = player1Name;
    setPlayer1Name(player2Name);
    setPlayer2Name(temp);
  };

  // Generar y actualizar JSON automáticamente
  const generateTournamentConfig = () => {
    const config = {
      sessionId: currentSessionId,
      player1: {
        name: player1Name || session?.player1?.name || 'Jugador 1',
        score: player1Score
      },
      player2: {
        name: player2Name || session?.player2?.name || 'Jugador 2',
        score: player2Score
      },
      format: format,
      currentGame: getCurrentGame(),
      totalGames: format === 'BO3' ? 3 : 5,
      maxWins: format === 'BO3' ? 2 : 3,
      isFinished: (player1Score >= (format === 'BO3' ? 2 : 3)) || (player2Score >= (format === 'BO3' ? 2 : 3)),
      winner: player1Score >= (format === 'BO3' ? 2 : 3) ? 'player1' : 
              player2Score >= (format === 'BO3' ? 2 : 3) ? 'player2' : null
    };
    return config;
  };

  const handleCreateSession = () => {
    if (player1Name && player2Name) {
      if (adminSocket && adminSocket.connected) {
        adminSocket.emit('create-session', { 
          player1: player1Name, 
          player2: player2Name, 
          format 
        });
        // Resetear scores al crear nueva sesión
        setPlayer1Score(0);
        setPlayer2Score(0);
      } else {
        alert('No hay conexión con el servidor. Por favor, recarga la página.');
      }
    } else {
      alert('Por favor ingresa los nombres de ambos jugadores');
    }
  };

  const handleScoreChange = (player, increment) => {
    if (player === 'player1') {
      const newScore = Math.max(0, player1Score + increment);
      setPlayer1Score(newScore);
      
      // Si hay una sesión activa, actualizar también el servidor
      if (session && adminSocket) {
        if (increment > 0) {
          // Sumar punto = ganó el game
          adminSocket.emit('game-winner', { sessionId: session.sessionId, winner: 'player1' });
        }
      }
    } else {
      const newScore = Math.max(0, player2Score + increment);
      setPlayer2Score(newScore);
      
      // Si hay una sesión activa, actualizar también el servidor
      if (session && adminSocket) {
        if (increment > 0) {
          // Sumar punto = ganó el game
          adminSocket.emit('game-winner', { sessionId: session.sessionId, winner: 'player2' });
        }
      }
    }
  };

  const handleResetSession = () => {
    if (window.confirm('¿Reiniciar la serie? Esto borrará todo el progreso.')) {
      setPlayer1Score(0);
      setPlayer2Score(0);
      if (session && adminSocket) {
        adminSocket.emit('reset-session', { sessionId: currentSessionId });
      }
    }
  };

  const getControlLink = (type) => {
    if (!session) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/${type}/${session.sessionId}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado al portapapeles');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            🎮 Panel de Administración
          </h1>
          <p className="text-smash-light text-lg">
            Sistema de Baneos - Super Smash Bros Ultimate
          </p>
        </div>

        {!session || session.phase === 'FINISHED' ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-2xl border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-6">
              {session?.phase === 'FINISHED' ? 'Nueva Serie (mismo link)' : 'Crear Nueva Sesión'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">
                  Nombre del Jugador 1
                </label>
                <input
                  type="text"
                  value={player1Name}
                  onChange={(e) => setPlayer1Name(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-smash-blue"
                  placeholder="Ej: Nostra"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">
                  Nombre del Jugador 2
                </label>
                <input
                  type="text"
                  value={player2Name}
                  onChange={(e) => setPlayer2Name(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-smash-blue"
                  placeholder="Ej: Iori"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">
                  Formato del Torneo
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setFormat('BO3')}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      format === 'BO3'
                        ? 'bg-smash-blue text-white shadow-lg scale-105'
                        : 'bg-white/20 text-white/70 hover:bg-white/30'
                    }`}
                  >
                    Best of 3 (BO3)
                  </button>
                  <button
                    onClick={() => setFormat('BO5')}
                    className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                      format === 'BO5'
                        ? 'bg-smash-blue text-white shadow-lg scale-105'
                        : 'bg-white/20 text-white/70 hover:bg-white/30'
                    }`}
                  >
                    Best of 5 (BO5)
                  </button>
                </div>
              </div>

              <button
                onClick={handleCreateSession}
                className="w-full py-4 bg-gradient-to-r from-smash-red to-smash-yellow text-white font-bold text-xl rounded-lg hover:shadow-2xl hover:scale-105 transition-all"
              >
                🚀 Crear Sesión
              </button>
            </div>
          </div>
  const getControlLink = (type) => {
    if (!session) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/${type}/${session.sessionId}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado al portapapeles');
  };

  // Generar configuración JSON para mostrar
  const getCurrentConfig = () => {
    return generateTournamentConfig();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            🎮 Panel de Administración Simplificado
          </h1>
          <p className="text-smash-light text-lg">
            Configuración automática con JSON
          </p>
        </div>

        {!session || session.phase === 'FINISHED' ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-2xl border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-6">
              {session?.phase === 'FINISHED' ? '🎉 Serie Finalizada - Crear Nueva' : '📝 Configurar Nueva Serie'}
            </h2>
            
            <div className="space-y-6">
              {/* Configuración de jugadores con presets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white font-semibold">
                      🔴 Jugador 1 (Izquierda)
                    </label>
                    {tournamentConfig?.quickSettings?.enablePresetPlayers && (
                      <button
                        onClick={() => setShowPresetPlayers(prev => prev === 'player1' ? false : 'player1')}
                        className="text-xs bg-white/20 text-white px-2 py-1 rounded hover:bg-white/30 transition-all"
                      >
                        📋 Presets
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={player1Name}
                    onChange={(e) => setPlayer1Name(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-red-900/30 text-white placeholder-white/50 border border-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Nombre del jugador..."
                  />
                  
                  {/* Dropdown de presets para Player 1 */}
                  {showPresetPlayers === 'player1' && tournamentConfig?.presetPlayers && (
                    <div className="mt-2 bg-black/80 rounded-lg border border-white/30 max-h-40 overflow-y-auto">
                      {tournamentConfig.presetPlayers.map((player, index) => (
                        <button
                          key={index}
                          onClick={() => handlePresetPlayer(player, 1)}
                          className="w-full text-left px-3 py-2 text-white hover:bg-white/20 transition-all first:rounded-t-lg last:rounded-b-lg"
                        >
                          {player.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white font-semibold">
                      🔵 Jugador 2 (Derecha)
                    </label>
                    {tournamentConfig?.quickSettings?.enablePresetPlayers && (
                      <button
                        onClick={() => setShowPresetPlayers(prev => prev === 'player2' ? false : 'player2')}
                        className="text-xs bg-white/20 text-white px-2 py-1 rounded hover:bg-white/30 transition-all"
                      >
                        📋 Presets
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={player2Name}
                    onChange={(e) => setPlayer2Name(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-blue-900/30 text-white placeholder-white/50 border border-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre del jugador..."
                  />
                  
                  {/* Dropdown de presets para Player 2 */}
                  {showPresetPlayers === 'player2' && tournamentConfig?.presetPlayers && (
                    <div className="mt-2 bg-black/80 rounded-lg border border-white/30 max-h-40 overflow-y-auto">
                      {tournamentConfig.presetPlayers.map((player, index) => (
                        <button
                          key={index}
                          onClick={() => handlePresetPlayer(player, 2)}
                          className="w-full text-left px-3 py-2 text-white hover:bg-white/20 transition-all first:rounded-t-lg last:rounded-b-lg"
                        >
                          {player.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Controles rápidos */}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleQuickSwap}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all text-sm"
                >
                  🔄 Intercambiar
                </button>
                <button
                  onClick={() => {
                    setPlayer1Name('');
                    setPlayer2Name('');
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all text-sm"
                >
                  🗑️ Limpiar
                </button>
              </div>

              {/* Selección de formato */}
              <div>
                <label className="block text-white font-semibold mb-3">
                  🏆 Formato del Torneo
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tournamentConfig?.formats ? (
                    tournamentConfig.formats.map((formatOption) => (
                      <button
                        key={formatOption.id}
                        onClick={() => setFormat(formatOption.id)}
                        className={`p-4 rounded-lg font-bold transition-all text-center border-2 ${
                          format === formatOption.id
                            ? 'bg-smash-yellow text-black border-smash-yellow shadow-lg scale-105'
                            : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                        }`}
                      >
                        <div className="text-lg font-black">{formatOption.name}</div>
                        <div className="text-sm opacity-80">
                          Primero en {formatOption.maxWins} - Máximo {formatOption.totalGames} games
                        </div>
                      </button>
                    ))
                  ) : (
                    <>
                      <button
                        onClick={() => setFormat('BO3')}
                        className={`p-4 rounded-lg font-bold transition-all ${
                          format === 'BO3'
                            ? 'bg-smash-yellow text-black shadow-lg scale-105'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        Best of 3 (BO3)
                      </button>
                      <button
                        onClick={() => setFormat('BO5')}
                        className={`p-4 rounded-lg font-bold transition-all ${
                          format === 'BO5'
                            ? 'bg-smash-yellow text-black shadow-lg scale-105'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        Best of 5 (BO5)
                      </button>
                    </>
                  )}
                </div>
              </div>

              <button
                onClick={handleCreateSession}
                className="w-full py-4 bg-gradient-to-r from-smash-red to-smash-yellow text-white font-bold text-xl rounded-lg hover:shadow-2xl hover:scale-105 transition-all"
              >
                🚀 Crear Serie
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Panel Principal - Manejo de Puntos */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">
                📊 Panel de Control Principal
              </h2>
              
              <div className="grid grid-cols-3 gap-6 mb-6">
                {/* Jugador 1 */}
                <div className="bg-gradient-to-br from-red-900/50 to-red-700/30 rounded-xl p-6 border-2 border-red-500/30">
                  <div className="text-center mb-4">
                    <h3 className="text-white font-bold text-xl mb-1">{session.player1.name}</h3>
                    <div className="text-6xl font-black text-red-400 mb-2">{player1Score}</div>
                    <p className="text-white/70 text-sm">puntos</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleScoreChange('player1', 1)}
                      className="py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all text-lg"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => handleScoreChange('player1', -1)}
                      className="py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all text-lg"
                    >
                      -1
                    </button>
                  </div>
                </div>

                {/* Info Central */}
                <div className="bg-gradient-to-br from-purple-900/50 to-purple-700/30 rounded-xl p-6 border-2 border-purple-500/30 flex flex-col justify-center">
                  <div className="text-center">
                    <p className="text-white/70 text-sm mb-1">Game Actual</p>
                    <p className="text-white font-bold text-4xl mb-2">{getCurrentGame()}</p>
                    <p className="text-white/70 text-sm mb-3">de {format === 'BO3' ? '3' : '5'}</p>
                    
                    <div className="bg-black/30 rounded-lg p-3 mb-3">
                      <p className="text-white/70 text-xs">Estado</p>
                      <p className="text-white font-semibold">
                        {session.phase === 'RPS' && '🎯 RPS'}
                        {session.phase === 'STAGE_BAN' && '🚫 Baneos'}
                        {session.phase === 'STAGE_SELECT' && '🎯 Stage'}
                        {session.phase === 'CHARACTER_SELECT' && '👤 Personajes'}
                        {session.phase === 'PLAYING' && '⚔️ Combate'}
                      </p>
                    </div>

                    <p className="text-yellow-400 text-xs font-semibold">
                      {format === 'BO3' ? 'Primero en 2' : 'Primero en 3'} 🏆
                    </p>
                  </div>
                </div>

                {/* Jugador 2 */}
                <div className="bg-gradient-to-br from-blue-900/50 to-blue-700/30 rounded-xl p-6 border-2 border-blue-500/30">
                  <div className="text-center mb-4">
                    <h3 className="text-white font-bold text-xl mb-1">{session.player2.name}</h3>
                    <div className="text-6xl font-black text-blue-400 mb-2">{player2Score}</div>
                    <p className="text-white/70 text-sm">puntos</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleScoreChange('player2', 1)}
                      className="py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all text-lg"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => handleScoreChange('player2', -1)}
                      className="py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all text-lg"
                    >
                      -1
                    </button>
                  </div>
                </div>
              </div>

              {/* Controles adicionales */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleResetSession}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition-all"
                >
                  🔄 Reset Serie
                </button>
                {(player1Score >= (format === 'BO3' ? 2 : 3) || player2Score >= (format === 'BO3' ? 2 : 3)) && (
                  <div className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg text-center">
                    🏆 ¡Serie Finalizada!
                  </div>
                )}
              </div>
            </div>

            {/* JSON Config Display */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-4">
                📄 Información Actual del Torneo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">📊 Estado de la Serie</h4>
                  <div className="text-sm text-white/80 space-y-1">
                    <p><span className="text-smash-yellow">Game:</span> {getCurrentGame()} de {format === 'BO3' ? '3' : '5'}</p>
                    <p><span className="text-smash-yellow">Formato:</span> {format}</p>
                    <p><span className="text-smash-yellow">Para ganar:</span> {format === 'BO3' ? '2' : '3'} puntos</p>
                  </div>
                </div>
                
                <div className="bg-black/30 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-2">⚙️ Configuración Cargada</h4>
                  <div className="text-sm text-white/80 space-y-1">
                    <p><span className="text-green-400">✓</span> Presets: {tournamentConfig?.presetPlayers?.length || 0} jugadores</p>
                    <p><span className="text-green-400">✓</span> Formatos: {tournamentConfig?.formats?.length || 2} opciones</p>
                    <p><span className="text-green-400">✓</span> Auto-fill: {tournamentConfig?.quickSettings?.autoFillLastUsed ? 'Sí' : 'No'}</p>
                  </div>
                </div>
              </div>
              
              {tournamentConfig && (
                <div className="mt-4 text-xs text-white/60 text-center">
                  ✨ Configuración cargada desde /config/tournament-settings.json
                </div>
              )}
            </div>

            {/* Links de Control Compactos */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-4">📱 Links</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">🎮 Tablet:</span>
                  <input
                    type="text"
                    value={getControlLink('tablet')}
                    readOnly
                    className="flex-1 px-3 py-2 rounded-lg bg-white/20 text-white text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(getControlLink('tablet'))}
                    className="px-4 py-2 bg-smash-blue text-white font-semibold rounded-lg hover:bg-smash-blue/80 transition-all"
                  >
                    📋
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
