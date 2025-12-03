import { useEffect, useState } from 'react';
import io from 'socket.io-client';

let socket;

export const useWebSocket = (sessionId) => {
  const [session, setSession] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Conectar al servidor WebSocket
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    socket = io(socketUrl);

    socket.on('connect', () => {
      console.log('Conectado al servidor WebSocket');
      setConnected(true);

      // Si hay un sessionId, unirse a la sesión
      if (sessionId) {
        socket.emit('join-session', sessionId);
      }
    });

    socket.on('disconnect', () => {
      console.log('Desconectado del servidor WebSocket');
      setConnected(false);
    });

    socket.on('session-created', (data) => {
      setSession(data.session);
    });

    socket.on('session-joined', (data) => {
      setSession(data.session);
    });

    socket.on('session-updated', (data) => {
      setSession(data.session);
    });

    socket.on('session-error', (data) => {
      console.error('Error de sesión:', data.message);
      alert(data.message);
    });

    socket.on('series-finished', (data) => {
      console.log('Serie finalizada. Ganador:', data.winner);
      setSession(data.session);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [sessionId]);

  const createSession = (player1, player2, format) => {
    if (socket) {
      socket.emit('create-session', { player1, player2, format });
    }
  };

  const selectRPSWinner = (sessionId, winner) => {
    if (socket) {
      socket.emit('select-rps-winner', { sessionId, winner });
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

  const resetSession = (sessionId) => {
    if (socket) {
      socket.emit('reset-session', { sessionId });
    }
  };

  return {
    session,
    connected,
    createSession,
    selectRPSWinner,
    banStage,
    selectStage,
    selectCharacter,
    setGameWinner,
    resetSession,
  };
};
