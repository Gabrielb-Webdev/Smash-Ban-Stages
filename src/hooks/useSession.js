import { useEffect, useState, useCallback } from 'react';

export const useSession = (sessionId) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Función para obtener el estado de la sesión
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        setError(null);
      } else if (response.status === 404) {
        setError('Sesión no encontrada');
      }
    } catch (err) {
      console.error('Error fetching session:', err);
      setError('Error de conexión');
    }
  }, [sessionId]);

  // Polling cada 2 segundos para sincronización
  useEffect(() => {
    if (!sessionId) return;

    fetchSession();
    const interval = setInterval(fetchSession, 2000);

    return () => clearInterval(interval);
  }, [sessionId, fetchSession]);

  // Crear nueva sesión
  const createSession = async (player1, player2, format, newSessionId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/session/${newSessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player1, player2, format })
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        return data.session;
      } else {
        throw new Error('Error al crear sesión');
      }
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Actualizar sesión
  const updateSession = async (updates) => {
    if (!sessionId) return;

    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        return data.session;
      }
    } catch (err) {
      console.error('Error updating session:', err);
      setError('Error al actualizar');
    }
  };

  // Funciones específicas del juego
  const selectRPSWinner = (winner) => {
    const updates = {
      rpsWinner: winner,
      currentTurn: winner,
      phase: 'STAGE_BAN'
    };

    if (session.currentGame === 1) {
      updates.availableStages = ['battlefield', 'small-battlefield', 'pokemon-stadium-2', 'smashville', 'town-and-city'];
      updates.totalBansNeeded = 4;
      updates.bansRemaining = 1;
    } else {
      updates.availableStages = [
        'battlefield', 'small-battlefield', 'pokemon-stadium-2',
        'smashville', 'town-and-city', 'hollow-bastion',
        'final-destination', 'kalos'
      ];
      
      if (session.lastGameWinner) {
        const winnerStages = session[session.lastGameWinner].wonStages;
        updates.availableStages = updates.availableStages.filter(
          stage => !winnerStages.includes(stage)
        );
      }
      
      updates.currentTurn = session.lastGameWinner;
      updates.totalBansNeeded = 3;
      updates.bansRemaining = 3;
    }
    
    updates.bannedStages = [];
    return updateSession(updates);
  };

  const banStage = (stage, player) => {
    const newBannedStages = [...session.bannedStages, stage];
    const newAvailableStages = session.availableStages.filter(s => s !== stage);
    const newBansRemaining = session.bansRemaining - 1;

    const updates = {
      bannedStages: newBannedStages,
      availableStages: newAvailableStages,
      bansRemaining: newBansRemaining,
      banHistory: [...session.banHistory, {
        game: session.currentGame,
        player: player,
        stage: stage,
        timestamp: new Date().toISOString()
      }]
    };

    // Lógica de turnos para Game 1
    if (session.currentGame === 1) {
      if (newBannedStages.length === 1) {
        updates.currentTurn = session.rpsWinner === 'player1' ? 'player2' : 'player1';
        updates.bansRemaining = 2;
      } else if (newBannedStages.length === 3) {
        updates.currentTurn = session.rpsWinner;
        updates.bansRemaining = 1;
      } else if (newBannedStages.length === 4) {
        updates.phase = 'STAGE_SELECT';
        updates.currentTurn = session.rpsWinner === 'player1' ? 'player2' : 'player1';
      }
    } else {
      if (newBansRemaining === 0) {
        updates.phase = 'STAGE_SELECT';
        updates.currentTurn = session.lastGameWinner === 'player1' ? 'player2' : 'player1';
      }
    }

    return updateSession(updates);
  };

  const selectStage = (stage) => {
    const updates = {
      selectedStage: stage,
      phase: 'CHARACTER_SELECT',
      currentTurn: session.currentGame === 1 ? session.rpsWinner : session.lastGameWinner
    };
    return updateSession(updates);
  };

  const selectCharacter = (character, player) => {
    const updates = {
      [player]: { ...session[player], character }
    };

    const otherPlayer = player === 'player1' ? 'player2' : 'player1';
    if (!session[otherPlayer].character) {
      updates.currentTurn = otherPlayer;
    } else {
      updates.phase = 'PLAYING';
      updates.currentTurn = null;
    }

    return updateSession(updates);
  };

  const setGameWinner = (winner) => {
    const newScore = session[winner].score + 1;
    const newWonStages = [...session[winner].wonStages, session.selectedStage];

    const updates = {
      [winner]: { ...session[winner], score: newScore, wonStages: newWonStages },
      lastGameWinner: winner
    };

    const maxScore = session.format === 'BO3' ? 2 : 3;
    if (newScore >= maxScore) {
      updates.phase = 'FINISHED';
    } else {
      updates.currentGame = session.currentGame + 1;
      updates.phase = 'STAGE_BAN';
      updates.selectedStage = null;
      updates.bannedStages = [];
      updates.player1 = { ...session.player1, character: null };
      updates.player2 = { ...session.player2, character: null };
      
      updates.availableStages = [
        'battlefield', 'small-battlefield', 'pokemon-stadium-2',
        'smashville', 'town-and-city', 'hollow-bastion',
        'final-destination', 'kalos'
      ].filter(stage => !newWonStages.includes(stage));
      
      updates.currentTurn = winner;
      updates.totalBansNeeded = 3;
      updates.bansRemaining = 3;
    }

    return updateSession(updates);
  };

  const resetSession = () => {
    const updates = {
      player1: { ...session.player1, score: 0, character: null, wonStages: [] },
      player2: { ...session.player2, score: 0, character: null, wonStages: [] },
      currentGame: 1,
      phase: 'RPS',
      rpsWinner: null,
      lastGameWinner: null,
      currentTurn: null,
      availableStages: [],
      bannedStages: [],
      selectedStage: null,
      banHistory: []
    };
    return updateSession(updates);
  };

  return {
    session,
    loading,
    error,
    createSession,
    updateSession,
    selectRPSWinner,
    banStage,
    selectStage,
    selectCharacter,
    setGameWinner,
    resetSession,
    refresh: fetchSession
  };
};
