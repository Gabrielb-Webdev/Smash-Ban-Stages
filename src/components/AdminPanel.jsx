import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';

let adminSocket = null;

export default function AdminPanel() {
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [format, setFormat] = useState('BO3');
  const [selectedTournament, setSelectedTournament] = useState('cordoba');
  const [activeSessions, setActiveSessions] = useState({}); // Múltiples sesiones activas
  const [currentSession, setCurrentSession] = useState(null); // Sesión actualmente visualizada
  const [isEditing, setIsEditing] = useState(false);
  const [editPlayer1, setEditPlayer1] = useState('');
  const [editPlayer2, setEditPlayer2] = useState('');
  const [editFormat, setEditFormat] = useState('BO3');
  const [lastJsonUpdate, setLastJsonUpdate] = useState('');

  // Configuración de torneos con temas
  const tournaments = {
    'cordoba': { 
      name: 'Smash Córdoba', 
      emoji: '🔵',
      color: 'blue-600',
      theme: {
        primary: '#2563EB',
        secondary: '#1D4ED8',
        accent: '#F59E0B',
        bg: 'from-blue-900 via-blue-700 to-blue-800'
      }
    },
    'mendoza': { 
      name: 'Smash Mendoza', 
      emoji: '🟢',
      color: 'green-600',
      theme: {
        primary: '#059669',
        secondary: '#047857',
        accent: '#FBBF24',
        bg: 'from-green-900 via-green-700 to-emerald-800'
      }
    },
    'afk': { 
      name: 'Smash AFK (Buenos Aires)', 
      emoji: '🟡',
      color: 'yellow-600',
      theme: {
        primary: '#DC2626',
        secondary: '#B91C1C',
        accent: '#FBBF24',
        bg: 'from-red-900 via-red-700 to-orange-800'
      }
    }
  };

  // Función para traducir formato
  const translateFormat = (externalFormat) => {
    if (typeof externalFormat !== 'string') return 'BO3';
    
    const format = externalFormat.toUpperCase();
    if (format.includes('BEST OF 3') || format.includes('BO3') || format === 'BEST OF 3') return 'BO3';
    if (format.includes('BEST OF 5') || format.includes('BO5') || format === 'BEST OF 5') return 'BO5';
    return 'BO3'; // Default
  };

  // Función para verificar y aplicar configuración externa
  const checkExternalConfig = async () => {
    try {
      const response = await fetch('/api/external-config');
      if (!response.ok) return;
      
      const config = await response.json();
      
      // Solo actualizar si hay cambios
      if (config.lastUpdate && config.lastUpdate !== lastJsonUpdate) {
        console.log('📥 Configuración externa detectada:', config);
        
        // Actualizar nombres
        if (config.player1?.name && config.player1.name !== player1Name) {
          setPlayer1Name(config.player1.name);
          console.log('👤 Player 1 actualizado:', config.player1.name);
        }
        
        if (config.player2?.name && config.player2.name !== player2Name) {
          setPlayer2Name(config.player2.name);
          console.log('👤 Player 2 actualizado:', config.player2.name);
        }
        
        // Actualizar formato
        if (config.format) {
          const translatedFormat = translateFormat(config.format);
          if (translatedFormat !== format) {
            setFormat(translatedFormat);
            console.log('🎯 Formato actualizado:', config.format, '→', translatedFormat);
          }
        }
        
        // Ejecutar acciones
        if (config.actions?.createSession && player1Name && player2Name) {
          console.log('🚀 Auto-creando sesión desde configuración externa');
          setTimeout(() => handleCreateSession(), 500);
          // Reset action flag vía API
          await updateExternalConfig({ ...config, actions: { ...config.actions, createSession: false } });
        }
        
        if (config.actions?.resetSeries && session) {
          console.log('🔄 Auto-reiniciando serie desde configuración externa');
          setTimeout(() => handleResetSession(), 500);
          // Reset action flag vía API
          await updateExternalConfig({ ...config, actions: { ...config.actions, resetSeries: false } });
        }
        
        setLastJsonUpdate(config.lastUpdate);
      }
    } catch (error) {
      console.log('⚠️ Error leyendo configuración externa:', error);
    }
  };

  // Función para actualizar configuración externa
  const updateExternalConfig = async (newConfig) => {
    try {
      const response = await fetch('/api/external-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newConfig,
          lastUpdate: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        console.log('📤 Configuración externa actualizada:', newConfig);
      } else {
        console.log('⚠️ Error actualizando configuración externa');
      }
    } catch (error) {
      console.log('⚠️ Error actualizando configuración externa:', error);
    }
  };

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
      // NO auto-unirse a ninguna sesión, dejar que el usuario elija
    });

    adminSocket.on('session-created', (data) => {
      console.log('Sesión creada:', data);
      const sessionId = data.session.sessionId;
      setActiveSessions(prev => ({
        ...prev,
        [sessionId]: data.session
      }));
      // Mostrar la sesión recién creada
      setCurrentSession(data.session);
    });

    adminSocket.on('session-joined', (data) => {
      console.log('Sesión unida:', data);
      const sessionId = data.session.sessionId;
      setActiveSessions(prev => ({
        ...prev,
        [sessionId]: data.session
      }));
      setCurrentSession(data.session);
    });

    adminSocket.on('session-updated', (data) => {
      console.log('Sesión actualizada:', data);
      const sessionId = data.session.sessionId;
      setActiveSessions(prev => ({
        ...prev,
        [sessionId]: data.session
      }));
      // Si es la sesión actualmente mostrada, actualizarla
      if (currentSession?.sessionId === sessionId) {
        setCurrentSession(data.session);
      }
    });

    adminSocket.on('session-error', (data) => {
      console.log('Error de sesión:', data.message);
      // No hacer nada, mantener el estado actual
    });

    adminSocket.on('series-finished', (data) => {
      console.log('Serie finalizada:', data);
      const sessionId = data.session.sessionId;
      setActiveSessions(prev => ({
        ...prev,
        [sessionId]: data.session
      }));
      if (currentSession?.sessionId === sessionId) {
        setCurrentSession(data.session);
      }
    });

    return () => {
      // NO desconectar el socket aquí para evitar múltiples desconexiones
      console.log('🧹 Limpieza del hook AdminPanel');
    };
  }, []); // Sin dependencias para evitar reconexiones

  // Función para unirse a una sesión específica
  const joinSession = (tournamentId) => {
    if (adminSocket && adminSocket.connected) {
      console.log('🔍 Intentando unirse a sesión:', tournamentId);
      adminSocket.emit('join-session', tournamentId);
    }
  };

  // Función para crear sesión en el torneo seleccionado
  const createSessionForTournament = (tournamentId, player1, player2, selectedFormat) => {
    if (adminSocket && adminSocket.connected) {
      adminSocket.emit('create-session', {
        player1,
        player2,
        format: selectedFormat,
        sessionId: tournamentId
      });
    }
  };

  // Efecto para cambio de torneo seleccionado
  useEffect(() => {
    // Actualizar la sesión mostrada cuando cambie la selección
    if (activeSessions[selectedTournament]) {
      setCurrentSession(activeSessions[selectedTournament]);
    } else {
      setCurrentSession(null);
    }
  }, [selectedTournament, activeSessions]);

  // Polling para configuración externa
  useEffect(() => {
    const interval = setInterval(checkExternalConfig, 2000); // Cada 2 segundos
    return () => clearInterval(interval);
  }, [player1Name, player2Name, format, lastJsonUpdate, currentSession]);

  const handleCreateSession = () => {
    if (player1Name && player2Name) {
      createSessionForTournament(selectedTournament, player1Name, player2Name, format);
      // Limpiar formulario después de crear
      setPlayer1Name('');
      setPlayer2Name('');
    } else {
      alert('Por favor ingresa los nombres de ambos jugadores');
    }
  };

  const handleJoinSession = (tournamentId) => {
    joinSession(tournamentId);
  };

  const handleGameWinner = (winner) => {
    if (currentSession && adminSocket && window.confirm(`¿Confirmar que ${currentSession[winner].name} ganó este game?`)) {
      adminSocket.emit('game-winner', { sessionId: currentSession.sessionId, winner });
    }
  };

  const handleResetSession = () => {
    if (currentSession && adminSocket && window.confirm('¿Reiniciar la serie? Esto borrará todo el progreso.')) {
      adminSocket.emit('reset-session', { sessionId: currentSession.sessionId });
    }
  };

  const handleEndMatch = () => {
    if (currentSession && adminSocket && window.confirm('¿Terminar el match y declarar ganador?')) {
      // Determinar ganador basado en el score actual
      const winner = currentSession.player1.score > currentSession.player2.score ? 'player1' : 
                     currentSession.player2.score > currentSession.player1.score ? 'player2' : null;
      
      if (winner) {
        adminSocket.emit('end-match', { sessionId: currentSession.sessionId, winner });
      } else {
        alert('No se puede terminar el match con empate. Debe haber un ganador con más puntos.');
      }
    }
  };

  const handleStartEditing = () => {
    setEditPlayer1(currentSession.player1.name);
    setEditPlayer2(currentSession.player2.name);
    setEditFormat(currentSession.format);
    setIsEditing(true);
  };

  const handleSaveNames = () => {
    if (editPlayer1 && editPlayer2 && adminSocket) {
      adminSocket.emit('update-players', { 
        sessionId: selectedTournament, 
        player1: editPlayer1, 
        player2: editPlayer2,
        format: editFormat
      });
      setIsEditing(false);
    } else {
      alert('Por favor ingresa ambos nombres');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const getControlLink = (type) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/${type}/${selectedTournament}`;
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
          <div className="mt-3 inline-flex items-center gap-2 bg-smash-orange/20 border border-smash-orange/50 rounded-lg px-4 py-2">
            <span className="text-smash-orange text-lg">{tournaments[selectedTournament].emoji}</span>
            <span className="text-white text-sm font-medium">
              {tournaments[selectedTournament].name}
            </span>
          </div>
          {lastJsonUpdate && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-600/20 border border-green-500/50 rounded-lg px-4 py-2">
              <span className="text-green-400 text-lg">🔗</span>
              <span className="text-green-300 text-sm font-medium">
                Sincronizado con panel externo
              </span>
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            </div>
          )}
        </div>

        {!currentSession || currentSession.phase === 'FINISHED' ? (
          <div className="space-y-6">
            {/* Panel de estado de sesiones activas */}
            {Object.keys(activeSessions).length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-4">🎯 Sesiones Activas</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(tournaments).map(([key, tournament]) => {
                    const sessionExists = activeSessions[key];
                    return (
                      <div key={key} className={`p-4 rounded-lg border-2 transition-all ${
                        sessionExists 
                          ? `bg-green-600/20 border-green-500/50` 
                          : `bg-gray-600/20 border-gray-500/30`
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white flex items-center gap-2">
                              <span>{tournament.emoji}</span>
                              {tournament.name}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {sessionExists ? 
                                `${sessionExists.player1.name} vs ${sessionExists.player2.name}` : 
                                'Sin sesión activa'
                              }
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {sessionExists ? (
                              <button
                                onClick={() => {
                                  setSelectedTournament(key);
                                  setCurrentSession(sessionExists);
                                }}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                              >
                                Ver
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedTournament(key);
                                  handleJoinSession(key);
                                }}
                                className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
                              >
                                Buscar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-2xl border border-white/20">
              <h2 className="text-3xl font-bold text-white mb-6">
                {currentSession?.phase === 'FINISHED' ? 'Nueva Serie' : 'Crear Nueva Sesión'}
              </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">
                  🏆 Seleccionar Torneo
                </label>
                
                {/* Mostrar información de sesión activa si existe */}
                {activeSessions[selectedTournament] && (
                  <div className="mb-4 p-4 bg-green-600/20 border border-green-500/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-green-300 font-semibold">
                          ✅ {tournaments[selectedTournament].name} tiene una sesión activa
                        </div>
                        <div className="text-green-200 text-sm mt-1">
                          {activeSessions[selectedTournament].player1.name} vs {activeSessions[selectedTournament].player2.name}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setCurrentSession(activeSessions[selectedTournament]);
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        Volver a la sesión
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(tournaments).map(([key, tournament]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedTournament(key)}
                      className={`p-4 rounded-lg font-bold transition-all border-2 ${
                        selectedTournament === key
                          ? `bg-${tournament.color} border-${tournament.color} text-white shadow-lg scale-105`
                          : 'bg-white/10 border-white/30 text-white/70 hover:bg-white/20 hover:border-white/50'
                      }`}
                    >
                      <div className="text-lg">{tournament.name}</div>
                      <div className="text-xs opacity-75 mt-1">
                        ID: {key}
                        {activeSessions[key] && (
                          <span className="ml-2 inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
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
        ) : (
          <div className="space-y-6">
            {/* Información de la Serie */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
              <div className="flex justify-between items-center mb-4">
                {!isEditing ? (
                  <>
                    <h2 className="text-3xl font-bold text-white">
                      {currentSession.player1.name} vs {currentSession.player2.name}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-smash-yellow">
                        {currentSession.format}
                      </span>
                      <button
                        onClick={handleStartEditing}
                        className="px-4 py-2 bg-smash-blue text-white rounded-lg hover:bg-smash-blue/80 transition-all"
                      >
                        ✏️ Editar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={editPlayer1}
                        onChange={(e) => setEditPlayer1(e.target.value)}
                        placeholder="Jugador 1"
                        className="px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30"
                      />
                      <input
                        type="text"
                        value={editPlayer2}
                        onChange={(e) => setEditPlayer2(e.target.value)}
                        placeholder="Jugador 2"
                        className="px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={editFormat}
                        onChange={(e) => setEditFormat(e.target.value)}
                        className="px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30"
                      >
                        <option value="BO3">BO3</option>
                        <option value="BO5">BO5</option>
                      </select>
                      <button
                        onClick={handleSaveNames}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                      >
                        💾 Guardar
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                      >
                        ❌ Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-smash-red/20 rounded-lg p-4">
                  <p className="text-white/70 text-sm">Jugador 1</p>
                  <p className="text-white font-bold text-2xl">
                    {currentSession.player1.name}
                  </p>
                  <p className="text-smash-yellow text-4xl font-bold">
                    {currentSession.player1.score}
                  </p>
                </div>

                <div className="bg-white/10 rounded-lg p-4 flex flex-col justify-center">
                  <p className="text-white/70 text-sm">Game Actual</p>
                  <p className="text-white font-bold text-3xl">
                    {currentSession.currentGame} / {currentSession.format === 'BO3' ? '3' : '5'}
                  </p>
                </div>

                <div className="bg-smash-blue/20 rounded-lg p-4">
                  <p className="text-white/70 text-sm">Jugador 2</p>
                  <p className="text-white font-bold text-2xl">
                    {currentSession.player2.name}
                  </p>
                  <p className="text-smash-yellow text-4xl font-bold">
                    {currentSession.player2.score}
                  </p>
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-white/70 text-sm mb-1">Estado Actual</p>
                <p className="text-white font-bold text-xl">
                  {currentSession.phase === 'RPS' && '⏳ Esperando Ganador de RPS'}
                  {currentSession.phase === 'STAGE_BAN' && '😫 Baneo de Stages'}
                  {currentSession.phase === 'STAGE_SELECT' && '🎯 Selección de Stage'}
                  {currentSession.phase === 'CHARACTER_SELECT' && '👤 Selección de Personajes'}
                  {currentSession.phase === 'PLAYING' && '⚔️ Jugando'}
                  {currentSession.phase === 'FINISHED' && '🏆 Serie Finalizada'}
                </p>
                {currentSession.currentTurn && currentSession.phase !== 'FINISHED' && (
                  <p className="text-smash-yellow font-semibold mt-2">
                    Turno de: {currentSession[currentSession.currentTurn].name}
                  </p>
                )}
              </div>
            </div>

            {/* Links de Control */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-4">
                📱 Links de Control - {tournaments[selectedTournament].name}
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tablet con QR */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-semibold text-lg">🎮 Tablet</span>
                  </div>
                  
                  {/* QR Code */}
                  <div className="bg-white p-4 rounded-lg flex justify-center">
                    <QRCodeSVG
                      value={getControlLink('tablet')}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  
                  {/* Link y botón */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={getControlLink('tablet')}
                      readOnly
                      className="flex-1 px-4 py-2 rounded-lg bg-white/20 text-white text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(getControlLink('tablet'))}
                      className="px-6 py-2 bg-smash-blue text-white font-semibold rounded-lg hover:bg-smash-blue/80 transition-all"
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                {/* Stream con ícono de apertura */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-white font-semibold text-lg">📺 Stream</span>
                  </div>
                  
                  {/* Botón grande de apertura */}
                  <a
                    href={getControlLink('stream')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gradient-to-br from-smash-purple to-purple-800 rounded-lg p-8 text-center hover:scale-105 transition-all shadow-lg group"
                  >
                    <div className="text-6xl mb-3 group-hover:scale-110 transition-transform">
                      🎥
                    </div>
                    <p className="text-white font-bold text-xl mb-1">Abrir Stream</p>
                    <p className="text-white/70 text-sm">Click para abrir en nueva pestaña</p>
                    <div className="mt-3 flex items-center justify-center gap-2 text-white/50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span className="text-xs">Nueva pestaña</span>
                    </div>
                  </a>
                  
                  {/* Link y botón */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={getControlLink('stream')}
                      readOnly
                      className="flex-1 px-4 py-2 rounded-lg bg-white/20 text-white text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(getControlLink('stream'))}
                      className="px-6 py-2 bg-smash-purple text-white font-semibold rounded-lg hover:bg-smash-purple/80 transition-all"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Controles del Game */}
            {currentSession.phase === 'PLAYING' && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-4">
                  ⚔️ Controles del Game
                </h3>
                
                <p className="text-white/70 text-center mb-4">
                  Presiona para dar 1 punto al ganador del game
                </p>
                
                <div className="grid grid-cols-2 gap-6">
                  <button
                    onClick={() => handleGameWinner('player1')}
                    className="group relative py-8 bg-gradient-to-br from-smash-red via-red-600 to-red-700 text-white font-bold text-xl rounded-xl hover:shadow-2xl hover:scale-105 transition-all border-4 border-red-400/50 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <span className="text-6xl group-hover:scale-110 transition-transform">+1</span>
                      <div className="text-center">
                        <div className="text-2xl font-black mb-1">{currentSession.player1.name}</div>
                        <div className="text-sm opacity-80">Dar punto</div>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleGameWinner('player2')}
                    className="group relative py-8 bg-gradient-to-br from-smash-blue via-blue-600 to-blue-700 text-white font-bold text-xl rounded-xl hover:shadow-2xl hover:scale-105 transition-all border-4 border-blue-400/50 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <span className="text-6xl group-hover:scale-110 transition-transform">+1</span>
                      <div className="text-center">
                        <div className="text-2xl font-black mb-1">{currentSession.player2.name}</div>
                        <div className="text-sm opacity-80">Dar punto</div>
                      </div>
                    </div>
                  </button>
                </div>
                
                <div className="mt-4 text-center text-sm text-white/60">
                  {currentSession.format === 'BO3' ? '🏆 Primero en llegar a 2 puntos gana' : '🏆 Primero en llegar a 3 puntos gana'}
                </div>
              </div>
            )}

            {/* Botones de Control */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleEndMatch}
                className="px-8 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold rounded-lg hover:from-yellow-500 hover:to-orange-500 hover:scale-105 transition-all shadow-lg"
              >
                🏁 Terminar Match
              </button>
              <button
                onClick={handleResetSession}
                className="px-8 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/30"
              >
                🔄 Reiniciar Serie
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
