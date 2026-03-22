import { useEffect, useState } from 'react';
import io from 'socket.io-client';

let socket;
// Callbacks globales para presencia y notificaciones (registrados desde home.js)
let _onFriendStatusChanged = null;
let _onNewNotification = null;

export function setPresenceCallback(fn) { _onFriendStatusChanged = fn; }
export function setNotificationCallback(fn) { _onNewNotification = fn; }

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
    // Si ya hay un socket conectado, no crear uno nuevo
    if (socket && socket.connected) {
      console.log('🔄 Usando conexión WebSocket existente');
      if (sessionId) {
        socket.emit('join-session', sessionId);
      }
      return;
    }

    // Limpiar socket anterior si existe
    if (socket) {
      socket.disconnect();
    }

    const connectSocket = async () => {
      // Conectar al servidor WebSocket
      // IMPORTANTE: Actualiza NEXT_PUBLIC_SOCKET_URL en Vercel con tu URL de Render o Fly.io
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
      
      console.log('🔌 Conectando WebSocket a:', socketUrl);
        
      socket = io(socketUrl, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: 3,
        timeout: 15000,
        forceNew: false
      });

      socket.on('connect', () => {
        console.log('✅ Conectado al servidor WebSocket');
        setConnected(true);

        // Si hay un sessionId, unirse a la sesión
        if (sessionId) {
          socket.emit('join-session', sessionId);
        }        // Re-registrar presencia si ya estaba registrada (reconexiones)
        if (socket._pendingPresence) {
          socket.emit('register-presence', socket._pendingPresence);
        }      });

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

    socket.on('session-created', (data) => {
      setSession(data.session);
    });



    socket.on('session-updated', (data) => {
      setSession(data.session);
    });

    socket.on('session-error', (data) => {
      console.error('Error de sesión:', data.message);
      setSessionError(data.message);
      // En lugar de alert, reintentar join-session cada 5s
      if (sessionId && data.message === 'Sesión no encontrada') {
        clearTimeout(socket._retryTimer);
        socket._retryTimer = setTimeout(() => {
          if (socket && socket.connected) {
            console.log('🔄 Reintentando join-session:', sessionId);
            socket.emit('join-session', sessionId);
          }
        }, 5000);
      }
    });

    socket.on('session-joined', (data) => {
      setSession(data.session);
      setSessionError(null);
    });

    socket.on('series-finished', (data) => {
      console.log('Serie finalizada. Ganador:', data.winner);
      setSession(data.session);
    });

    socket.on('match-cancelled', () => {
      // El admin canceló el match: marcar la sesión como FINISHED localmente
      setSession(prev => prev ? { ...prev, phase: 'CANCELLED' } : prev);
    });

    socket.on('rps-conflict', (data) => {
      console.warn('⚠️ RPS conflicto:', data.message);
    });
    socket.on('friend-status-changed', (data) => {
      if (_onFriendStatusChanged) _onFriendStatusChanged(data);
    });

    socket.on('new-notification', (data) => {
      if (_onNewNotification) _onNewNotification(data);
    });
    socket.on('player-history', (data) => {
      // Dispatched to listeners registered via getPlayerHistory
      socket._playerHistoryHandler && socket._playerHistoryHandler(data);
    });

    return () => {
      // NO desconectar el socket aquí para evitar múltiples desconexiones
      console.log('🧹 Limpieza del hook useWebSocket');
    };
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

  const banStage = (sessionId, stage, player) => {
    if (socket) {
      socket.emit('ban-stage', { sessionId, stage, player });
    }
  };

  const selectStage = (sessionId, stage, player) => {
    if (socket) {
      socket.emit('select-stage', { sessionId, stage, player });
    }
  };

  const selectCharacter = (sessionId, character, player) => {
    if (socket) {
      socket.emit('select-character', { sessionId, character, player });
    }
  };

  const setGameWinner = (sessionId, winner) => {
    if (socket) {
      socket.emit('game-winner', { sessionId, winner });
    }
  };

  const proposeGameWinner = (sessionId, winner, proposedBy) => {
    if (socket) {
      socket.emit('propose-game-winner', { sessionId, winner, proposedBy });
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
    getPlayerHistory,
    resetSession,
    playerCheckin,
    requestMatchDelay,
    enableSingleDevice,
  };
};
