import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import io from 'socket.io-client';

// Fix: Force rebuild to clear cache
let adminSocket = null;

export default function AdminPanel({ defaultCommunity = 'cordoba' }) {
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [format, setFormat] = useState('BO3');
  const [selectedTournament, setSelectedTournament] = useState(
    ['cordoba', 'afk', 'mendoza'].includes(defaultCommunity) ? defaultCommunity : 'cordoba'
  );
  const [activeSessions, setActiveSessions] = useState({});
  const [currentSession, setCurrentSession] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editPlayer1, setEditPlayer1] = useState('');
  const [editPlayer2, setEditPlayer2] = useState('');
  const [editFormat, setEditFormat] = useState('BO3');
  const [lastJsonUpdate, setLastJsonUpdate] = useState('');

  // Notificaciones de setup
  const [notifPlayer, setNotifPlayer] = useState('');
  const [notifSetup, setNotifSetup] = useState('Setup 1');
  const [notifSending, setNotifSending] = useState(false);
  const [notifSent, setNotifSent] = useState(null); // null | 'ok' | 'error'

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
        
        if (config.actions?.resetSeries && currentSession) {
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

  // Efecto para sincronizar la comunidad seleccionada con el prop defaultCommunity
  useEffect(() => {
    if (defaultCommunity && defaultCommunity !== selectedTournament) {
      setSelectedTournament(defaultCommunity);
    }
  }, [defaultCommunity]);

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
    });

    adminSocket.on('session-created', (data) => {
      console.log('Sesión creada:', data);
      const sessionId = data.session.sessionId;
      
      setActiveSessions(prev => ({
        ...prev,
        [sessionId]: data.session
      }));
      
      setCurrentSession(data.session);
    });

    adminSocket.on('session-joined', (data) => {
      console.log('🔗 Sesión unida:', data);
      const sessionId = data.session.sessionId;
      
      setActiveSessions(prev => ({
        ...prev,
        [sessionId]: data.session
      }));
      
      // Siempre actualizar currentSession cuando nos unimos
      console.log('📌 Estableciendo currentSession desde join');
      setCurrentSession(data.session);
    });

    adminSocket.on('session-updated', (data) => {
      console.log('✅ Sesión actualizada:', data);
      const sessionId = data.session.sessionId;
      
      setActiveSessions(prev => ({
        ...prev,
        [sessionId]: data.session
      }));
      
      // Actualizar siempre si es la sesión del torneo seleccionado o la sesión actual
      if (currentSession?.sessionId === sessionId || sessionId === selectedTournament) {
        console.log('🔄 Actualizando currentSession con nueva data');
        setCurrentSession(data.session);
      }
    });

    // Escuchar también 'session-update' por compatibilidad
    adminSocket.on('session-update', (data) => {
      console.log('✅ Sesión actualizada (session-update):', data);
      const sessionData = data.session || data;
      const sessionId = sessionData.sessionId;
      
      setActiveSessions(prev => ({
        ...prev,
        [sessionId]: sessionData
      }));
      
      // Actualizar siempre si es la sesión del torneo seleccionado o la sesión actual
      if (currentSession?.sessionId === sessionId || sessionId === selectedTournament) {
        console.log('🔄 Actualizando currentSession con nueva data');
        setCurrentSession(sessionData);
      }
    });

    adminSocket.on('session-error', (data) => {
      console.log('Error de sesión:', data.message);
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
      if (adminSocket) {
        adminSocket.disconnect();
      }
    };
  }, [selectedTournament]); // Agregar selectedTournament como dependencia

  // Unirse a la sesión de la comunidad al conectar
  useEffect(() => {
    if (adminSocket && adminSocket.connected && selectedTournament) {
      console.log('🔗 Uniéndose a sesión:', selectedTournament);
      adminSocket.emit('join-session', selectedTournament);
      
      // Dar un pequeño delay y volver a solicitar por si acaso
      setTimeout(() => {
        if (adminSocket && adminSocket.connected) {
          console.log('🔄 Re-solicitando sesión para asegurar sincronización');
          adminSocket.emit('join-session', selectedTournament);
        }
      }, 500);
    }
  }, [adminSocket?.connected, selectedTournament]);

  // Polling para configuración externa
  useEffect(() => {
    const interval = setInterval(checkExternalConfig, 2000); // Cada 2 segundos
    return () => clearInterval(interval);
  }, [player1Name, player2Name, format, lastJsonUpdate, currentSession]);

  const handleCreateSession = () => {
    if (player1Name && player2Name) {
      if (adminSocket && adminSocket.connected) {
        // Usar el nombre de la comunidad como sessionId (estático y reutilizable)
        adminSocket.emit('create-session', { 
          player1: player1Name, 
          player2: player2Name, 
          format,
          sessionId: selectedTournament, // Usar comunidad como ID
          community: selectedTournament
        });
        
        console.log('🎮 Creando sesión:', {
          sessionId: selectedTournament,
          community: selectedTournament,
          players: `${player1Name} vs ${player2Name}`
        });
      } else {
        alert('No hay conexión con el servidor. Por favor, recarga la página.');
      }
    } else {
      alert('Por favor ingresa los nombres de ambos jugadores');
    }
  };

  const handleGameWinner = (winner) => {
    console.log('🎯 handleGameWinner called:', { winner, currentSession: currentSession?.sessionId, socketConnected: adminSocket?.connected });
    
    if (!currentSession) {
      alert('Error: No hay sesión activa');
      return;
    }
    
    if (!adminSocket || !adminSocket.connected) {
      alert('Error: No hay conexión con el servidor. Intenta recargar la página.');
      return;
    }
    
    const playerName = currentSession[winner]?.name || `Jugador ${winner}`;
    
    if (window.confirm(`¿Confirmar que ${playerName} ganó este game?`)) {
      console.log('🚀 Emitiendo game-winner:', { sessionId: currentSession.sessionId, winner });
      adminSocket.emit('game-winner', { sessionId: currentSession.sessionId, winner });
      
      // También emitir con 'set-game-winner' por compatibilidad
      adminSocket.emit('set-game-winner', { sessionId: currentSession.sessionId, winner });
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
    setEditPlayer1(currentSession?.player1?.name || '');
    setEditPlayer2(currentSession?.player2?.name || '');
    setEditFormat(currentSession?.format || 'BO3');
    setIsEditing(true);
  };

  const handleSaveNames = () => {
    if (editPlayer1 && editPlayer2 && adminSocket && currentSession) {
      // Verificar si hubo cambios
      const namesChanged = editPlayer1 !== currentSession.player1.name || 
                          editPlayer2 !== currentSession.player2.name;
      const formatChanged = editFormat !== currentSession.format;
      
      if (namesChanged || formatChanged) {
        const confirmMessage = 'Has cambiado ' + 
          (namesChanged && formatChanged ? 'los nombres y el formato' : 
           namesChanged ? 'los nombres' : 'el formato') + 
          '. Esto reiniciará la partida. ¿Continuar?';
        
        if (window.confirm(confirmMessage)) {
          // Actualizar nombres/formato
          adminSocket.emit('update-players', { 
            sessionId: selectedTournament,
            player1: editPlayer1, 
            player2: editPlayer2,
            format: editFormat
          });
          
          // Reiniciar la sesión
          setTimeout(() => {
            adminSocket.emit('reset-session', { sessionId: currentSession.sessionId });
          }, 300);
          
          setIsEditing(false);
        }
      } else {
        // No hubo cambios, solo cerrar edición
        setIsEditing(false);
      }
    } else {
      alert('Por favor ingresa ambos nombres');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSendNotif = async () => {
    if (!notifPlayer.trim()) return;
    setNotifSending(true);
    setNotifSent(null);
    try {
      const r = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetName: notifPlayer.trim(),
          setup: notifSetup,
          sentBy: 'Admin',
          tournamentId: selectedTournament,
        }),
      });
      if (r.ok) {
        setNotifSent('ok');
        setNotifPlayer('');
        setTimeout(() => setNotifSent(null), 3000);
      } else {
        setNotifSent('error');
      }
    } catch {
      setNotifSent('error');
    } finally {
      setNotifSending(false);
    }
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
        {/* Botón de volver */}
        <div className="mb-6">
          <a 
            href="/"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white font-medium transition-all"
          >
            <span>←</span>
            <span>Volver a Comunidades</span>
          </a>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            🎮 Panel de Administración
          </h1>
          <p className="text-smash-light text-lg">
            Sistema de Baneos - Super Smash Bros Ultimate
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-smash-orange/20 border border-smash-orange/50 rounded-lg px-4 py-2">
            <span className="text-smash-orange text-lg">{tournaments[selectedTournament]?.emoji}</span>
            <span className="text-white text-sm font-medium">
              {tournaments[selectedTournament]?.name}
            </span>
          </div>
          
          {/* Indicador de conexión */}
          <div className="mt-2 inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/50 rounded-lg px-4 py-2">
            <span className={`w-2 h-2 rounded-full ${adminSocket?.connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
            <span className="text-blue-300 text-sm font-medium">
              {adminSocket?.connected ? 'WebSocket Conectado' : 'WebSocket Desconectado'}
            </span>
            {currentSession && (
              <span className="text-blue-200 text-xs">
                • Sesión: {currentSession.sessionId}
              </span>
            )}
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
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 shadow-2xl border border-white/20">
            <h2 className="text-3xl font-bold text-white mb-6">
              {currentSession?.phase === 'FINISHED' ? 'Nueva Serie (mismo link)' : 'Crear Nueva Sesión'}
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
        ) : currentSession ? (
          <div className="space-y-6">
            {/* Información de la Serie */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
              <div className="flex justify-between items-center mb-4">
                {!isEditing ? (
                  <>
                    <h2 className="text-3xl font-bold text-white">
                      {currentSession?.player1?.name} vs {currentSession?.player2?.name}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-smash-yellow">
                        {currentSession?.format}
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
                {/* Jugador 1 - Con botón de +1 si está PLAYING */}
                <div className="bg-smash-red/20 rounded-lg p-4">
                  <p className="text-white/70 text-sm mb-2">Jugador 1</p>
                  <p className="text-white font-bold text-2xl mb-3">
                    {currentSession?.player1?.name}
                  </p>
                  
                  {currentSession?.phase === 'PLAYING' ? (
                    <button
                      onClick={() => handleGameWinner('player1')}
                      className="group w-full py-4 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-xl transition-all hover:scale-105 border-2 border-red-400/50"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-smash-yellow text-5xl font-black">
                          {currentSession?.player1?.score}
                        </span>
                        <span className="text-white text-3xl font-bold group-hover:scale-125 transition-transform">
                          +1
                        </span>
                      </div>
                      <p className="text-white/70 text-xs mt-2">Click para dar punto</p>
                    </button>
                  ) : (
                    <div className="py-4">
                      <p className="text-smash-yellow text-5xl font-black">
                        {currentSession?.player1?.score}
                      </p>
                    </div>
                  )}
                </div>

                {/* Game Actual - Calculado automáticamente */}
                <div className="bg-white/10 rounded-lg p-4 flex flex-col justify-center">
                  <p className="text-white/70 text-sm mb-2">Game Actual</p>
                  <p className="text-white font-bold text-4xl">
                    {(currentSession?.player1?.score || 0) + (currentSession?.player2?.score || 0) + 1}
                  </p>
                  <p className="text-white/50 text-sm mt-1">
                    de {currentSession?.format === 'BO3' ? '3' : '5'}
                  </p>
                  {currentSession?.phase === 'PLAYING' && (
                    <p className="text-green-400 text-xs mt-2 animate-pulse">
                      ⚡ En Combate
                    </p>
                  )}
                </div>

                {/* Jugador 2 - Con botón de +1 si está PLAYING */}
                <div className="bg-smash-blue/20 rounded-lg p-4">
                  <p className="text-white/70 text-sm mb-2">Jugador 2</p>
                  <p className="text-white font-bold text-2xl mb-3">
                    {currentSession?.player2?.name}
                  </p>
                  
                  {currentSession?.phase === 'PLAYING' ? (
                    <button
                      onClick={() => handleGameWinner('player2')}
                      className="group w-full py-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl transition-all hover:scale-105 border-2 border-blue-400/50"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-smash-yellow text-5xl font-black">
                          {currentSession?.player2?.score}
                        </span>
                        <span className="text-white text-3xl font-bold group-hover:scale-125 transition-transform">
                          +1
                        </span>
                      </div>
                      <p className="text-white/70 text-xs mt-2">Click para dar punto</p>
                    </button>
                  ) : (
                    <div className="py-4">
                      <p className="text-smash-yellow text-5xl font-black">
                        {currentSession?.player2?.score}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-white/70 text-sm mb-1">Estado Actual</p>
                <p className="text-white font-bold text-xl">
                  {currentSession?.phase === 'RPS' && '⏳ Esperando Ganador de RPS'}
                  {currentSession?.phase === 'STAGE_BAN' && '🚫 Baneo de Stages'}
                  {currentSession?.phase === 'STAGE_SELECT' && '🎯 Selección de Stage'}
                  {currentSession?.phase === 'CHARACTER_SELECT' && '👤 Selección de Personajes'}
                  {currentSession?.phase === 'PLAYING' && '⚔️ Jugando'}
                  {currentSession?.phase === 'FINISHED' && '🏆 Serie Finalizada'}
                </p>
                {currentSession?.currentTurn && currentSession?.phase !== 'FINISHED' && (
                  <p className="text-smash-yellow font-semibold mt-2">
                    Turno de: {currentSession?.[currentSession?.currentTurn]?.name}
                  </p>
                )}
              </div>
            </div>

            {/* Links de Control */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-4">
                📱 Links de Control - {tournaments[selectedTournament]?.name}
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

            {/* ── Llamar Jugadores ── */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-2xl border border-white/20">
              <h3 className="text-2xl font-bold text-white mb-2">📢 Llamar Jugador</h3>
              <p className="text-white/50 text-sm mb-4">Notificá al jugador que es su turno y en qué setup debe presentarse</p>

              {/* Quick fill desde sesión activa */}
              {currentSession && (
                <div className="flex flex-wrap gap-2 mb-4 items-center">
                  <span className="text-white/40 text-xs mr-1">Jugadores activos:</span>
                  {[currentSession.player1?.name, currentSession.player2?.name].filter(Boolean).map(name => (
                    <button key={name} onClick={() => setNotifPlayer(name)}
                      className="px-3 py-1 bg-orange-600/20 border border-orange-500/40 text-orange-400 text-sm font-semibold rounded-lg hover:bg-orange-600/30 transition-all">
                      {name}
                    </button>
                  ))}
                </div>
              )}

              {/* Input nombre del jugador */}
              <div className="mb-4">
                <label className="block text-white/70 text-sm font-semibold mb-2">Nombre del jugador</label>
                <input
                  type="text"
                  value={notifPlayer}
                  onChange={e => setNotifPlayer(e.target.value.slice(0, 100))}
                  placeholder="Ej: Gabi"
                  className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Setup selector */}
              <div className="mb-5">
                <label className="block text-white/70 text-sm font-semibold mb-2">Setup</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Setup 1', 'Setup 2', 'Setup 3', 'Setup 4', 'Stream', 'Setup libre'].map(s => (
                    <button key={s} onClick={() => setNotifSetup(s)}
                      className={`py-2 px-3 rounded-lg text-sm font-semibold transition-all border ${
                        notifSetup === s
                          ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg border-orange-500'
                          : 'bg-white/10 text-white/60 hover:bg-white/20 border-white/10'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón enviar */}
              <button
                onClick={handleSendNotif}
                disabled={notifSending || !notifPlayer.trim()}
                className={`w-full py-3 font-bold text-lg rounded-lg transition-all ${
                  notifSending || !notifPlayer.trim()
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:shadow-xl hover:scale-105'
                }`}
              >
                {notifSending ? '⏳ Enviando...' : notifSent === 'ok' ? '✅ ¡Llamado enviado!' : '📢 Llamar al setup'}
              </button>
              {notifSent === 'error' && (
                <p className="text-red-400 text-sm mt-2 text-center">Error al enviar. Intentá de nuevo.</p>
              )}
            </div>

            {/* Información de estado cuando NO está PLAYING */}
            {currentSession?.phase !== 'PLAYING' && currentSession?.phase !== 'FINISHED' && (
              <div className="bg-yellow-600/20 border border-yellow-500/50 rounded-xl p-4 text-center">
                <p className="text-yellow-300 font-semibold">
                  ⚠️ Los puntos solo se pueden asignar cuando están en combate (fase PLAYING)
                </p>
                <p className="text-yellow-200/70 text-sm mt-2">
                  Estado actual: {currentSession?.phase}
                </p>
              </div>
            )}

            {/* Botones de Control */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  if (adminSocket && adminSocket.connected) {
                    console.log('🔄 Forzando recarga de sesión:', selectedTournament);
                    adminSocket.emit('join-session', selectedTournament);
                    alert('✅ Sesión recargada. Si hay cambios, deberían aparecer ahora.');
                  } else {
                    alert('⚠️ No hay conexión con el servidor');
                  }
                }}
                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all border border-blue-500"
              >
                🔄 Refrescar Estado
              </button>
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
        ) : null}
      </div>
    </div>
  );
}
