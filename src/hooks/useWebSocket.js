import { useEffect, useState } from 'react';
import io from 'socket.io-client';

let socket;
// Callbacks globales para presencia, notificaciones y reconexión (registrados desde home.js)
let _onFriendStatusChanged = null;
let _onNewNotification = null;
let _onSocketReconnect = null;

export function setPresenceCallback(fn) { _onFriendStatusChanged = fn; }
export function setNotificationCallback(fn) { _onNewNotification = fn; }
export function setReconnectCallback(fn) { _onSocketReconnect = fn; }

// Registrar presencia del usuario logueado
export function registerPresence(userId, friendIds) {
  const payload = { userId: String(userId), friendIds: (friendIds || []).map(String) };
  if (socket) {
    socket._pendingPresence = payload; // persiste para reconexiones
    if (socket.connected) socket.emit('register-presence', payload);
  }
}

// Actualizar lista de amigos en el servidor (cuando agrega/remueve uno)
export function updateFriendList(friendIds) {
  if (socket && socket.connected) {
    socket.emit('update-friend-list', { friendIds: (friendIds || []).map(String) });
  }
}

export const useWebSocket = (sessionId) => {
  const [session, setSession] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sessionError, setSessionError] = useState(null);

  useEffect(() => {
    // Handlers con referencia nombrada para poder removerlos en cleanup
    const handleSessionCreated  = (data) => setSession(data.session);
    const handleSessionUpdated  = (data) => setSession(data.session);
    const handleSessionJoined   = (data) => { setSession(data.session); setSessionError(null); };
    const handleSeriesFinished  = (data) => { console.log('Serie finalizada. Ganador:', data.winner); setSession(data.session); };
    const handleMatchCancelled  = ()     => setSession(prev => prev ? { ...prev, phase: 'CANCELLED' } : prev);
    const handleSessionError    = (data) => {
      console.error('Error de sesión:', data.message);
      setSessionError(data.message);
      if (sessionId && data.message === 'Sesión no encontrada') {
        clearTimeout(socket._retryTimer);
        socket._retryTimer = setTimeout(() => {
          if (socket && socket.connected) {
            console.log('🔄 Reintentando join-session:', sessionId);
            socket.emit('join-session', sessionId);
          }
        }, 5000);
      }
    };
    const handleRpsConflict     = (data) => console.warn('⚠️ RPS conflicto:', data.message);
    const handleFriendStatus    = (data) => { if (_onFriendStatusChanged) _onFriendStatusChanged(data); };
    const handleNewNotification = (data) => { if (_onNewNotification) _onNewNotification(data); };
    const handlePlayerHistory   = (data) => { socket._playerHistoryHandler && socket._playerHistoryHandler(data); };

    if (socket && socket.connected) {
      // Reusar socket existente — solo unirse a la sesión nueva
      console.log('🔄 Usando conexión WebSocket existente');
      if (sessionId) {
        socket.emit('join-session', sessionId);
      }
      // NO early return: registrar handlers abajo para que este componente reciba actualizaciones
    } else {
      // Limpiar socket anterior si existe
      if (socket) {
        socket.disconnect();
      }

      const connectSocket = async () => {
        // Conectar al servidor WebSocket
        // IMPORTANTE: Actualiza NEXT_PUBLIC_SOCKET_URL en Vercel con tu URL de Render o Fly.io
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

        console.log('🔌 Conectando WebSocket a:', socketUrl);

        // Wake-up: ping al servidor para despertarlo si está en cold start (Render free tier)
        fetch(`${socketUrl}/health`).catch(() => {});

        socket = io(socketUrl, {
          transports: ['polling', 'websocket'],
          reconnection: true,
          reconnectionDelay: 3000,
          reconnectionDelayMax: 30000,
          reconnectionAttempts: Infinity,  // nunca desistir
          randomizationFactor: 0.5,        // jitter para evitar thundering herd con varios dispositivos
          timeout: 30000,                  // más tiempo para cold start de Render (~30s)
          forceNew: false
        });

        socket.on('connect', () => {
          console.log('✅ Conectado al servidor WebSocket');
          setConnected(true);

          // Si hay un sessionId, unirse a la sesión
          if (sessionId) {
            socket.emit('join-session', sessionId);
          }
          // Re-registrar presencia si ya estaba registrada (reconexiones)
          if (socket._pendingPresence) {
            socket.emit('register-presence', socket._pendingPresence);
          }
          // Notificar a home.js para que re-sincronice estados de amigos
          if (_onSocketReconnect) _onSocketReconnect();
        });

        socket.on('connect_error', (error) => {
          console.error('❌ Error de conexión WebSocket:', error.message);
          setConnected(false);
        });

        socket.on('disconnect', (reason) => {
          console.log('🔌 Desconectado del servidor WebSocket:', reason);
          setConnected(false);
        });
      };

      connectSocket();
    }

    // Registrar handlers de sesión (siempre, para que este componente reciba updates)
    socket.on('session-created',      handleSessionCreated);
    socket.on('session-updated',      handleSessionUpdated);
    socket.on('session-joined',       handleSessionJoined);
    socket.on('series-finished',      handleSeriesFinished);
    socket.on('match-cancelled',      handleMatchCancelled);
    socket.on('session-error',        handleSessionError);
    socket.on('rps-conflict',         handleRpsConflict);
    socket.on('friend-status-changed',handleFriendStatus);
    socket.on('new-notification',     handleNewNotification);
    socket.on('player-history',       handlePlayerHistory);

    return () => {
      // Remover solo los handlers de este componente (evita memory leaks y closures obsoletas)
      socket.off('session-created',      handleSessionCreated);
      socket.off('session-updated',      handleSessionUpdated);
      socket.off('session-joined',       handleSessionJoined);
      socket.off('series-finished',      handleSeriesFinished);
      socket.off('match-cancelled',      handleMatchCancelled);
      socket.off('session-error',        handleSessionError);
      socket.off('rps-conflict',         handleRpsConflict);
      socket.off('friend-status-changed',handleFriendStatus);
      socket.off('new-notification',     handleNewNotification);
      socket.off('player-history',       handlePlayerHistory);
      console.log('🧹 Limpieza del hook useWebSocket');
    };
  }, [sessionId]);

  // Sync periódico de estado cada 10s — safety net para eventos session-updated perdidos
  // en móvil (cambio de transporte polling→websocket, conexión inestable, etc.)
  useEffect(() => {
    if (!sessionId) return;
    const periodicSync = setInterval(() => {
      if (socket && socket.connected) {
        socket.emit('join-session', sessionId);
      }
    }, 10000);
    return () => clearInterval(periodicSync);
  }, [sessionId]);

  const createSession = (player1, player2, format) => {
    if (socket) {
      socket.emit('create-session', { player1, player2, format });
    }
  };

  const selectRPSWinner = (sessionId, winner, proposedBy) => {
    if (socket) {
      socket.emit('select-rps-winner', { sessionId, winner, proposedBy });
    }
  };

  const rpsPick = (sessionId, pick, pickedBy, matchToken) => {
    if (socket) {
      socket.emit('rps-pick', { sessionId, pick, pickedBy, matchToken });
    }
  };

  const banStage = (sessionId, stage, player, matchToken) => {
    if (socket) {
      socket.emit('ban-stage', { sessionId, stage, player, matchToken });
    }
  };

  const selectStage = (sessionId, stage, player, matchToken) => {
    if (socket) {
      socket.emit('select-stage', { sessionId, stage, player, matchToken });
    }
  };

  const selectCharacter = (sessionId, character, player, skin, matchToken) => {
    if (socket) {
      socket.emit('select-character', { sessionId, character, player, ...(skin ? { skin } : {}), matchToken });
    }
  };

  const setGameWinner = (sessionId, winner, matchToken) => {
    if (socket) {
      socket.emit('game-winner', { sessionId, winner, matchToken });
    }
  };

  const proposeGameWinner = (sessionId, winner, proposedBy, matchToken) => {
    if (socket) {
      socket.emit('propose-game-winner', { sessionId, winner, proposedBy, matchToken });
    }
  };

  const rejectGameWinner = (sessionId) => {
    if (socket) {
      socket.emit('reject-game-winner', { sessionId });
    }
  };

  const repeatStage = (sessionId, bannedStages, selectedStage) => {
    if (socket) {
      socket.emit('repeat-stage', { sessionId, bannedStages, selectedStage });
    }
  };

  const proposeRepeatStage = (sessionId) => {
    if (socket) {
      socket.emit('propose-repeat-stage', { sessionId });
    }
  };

  const confirmRepeatStage = (sessionId) => {
    if (socket) {
      socket.emit('confirm-repeat-stage', { sessionId });
    }
  };

  const rejectRepeatStage = (sessionId) => {
    if (socket) {
      socket.emit('reject-repeat-stage', { sessionId });
    }
  };

  const getPlayerHistory = (playerName, callback) => {
    if (socket) {
      socket._playerHistoryHandler = callback;
      socket.emit('get-player-history', { playerName });
    }
  };

  const resetSession = (sessionId) => {
    if (socket) {
      socket.emit('reset-session', { sessionId });
    }
  };

  const playerCheckin = (sessionId, playerName) => {
    if (socket) {
      socket.emit('player-checkin', { sessionId, playerName });
    }
  };

  const requestMatchDelay = (sessionId, playerName) => {
    if (socket) {
      socket.emit('request-match-delay', { sessionId, playerName });
    }
  };

  const playerUnavailable = (sessionId, playerName) => {
    if (socket) {
      socket.emit('player-unavailable', { sessionId, playerName });
    }
  };

  const enableSingleDevice = (sessionId) => {
    if (socket) {
      socket.emit('enable-single-device', { sessionId });
    }
  };

  return {
    session,
    connected,
    sessionError,
    createSession,
    selectRPSWinner,
    banStage,
    selectStage,
    selectCharacter,
    setGameWinner,
    proposeGameWinner,
    rejectGameWinner,
    repeatStage,
    proposeRepeatStage,
    confirmRepeatStage,
    rejectRepeatStage,
    getPlayerHistory,
    resetSession,
    playerCheckin,
    requestMatchDelay,
    playerUnavailable,
    enableSingleDevice,
    rpsPick,
  };
};
