const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const httpServer = createServer((req, res) => {
  // Health check endpoint para Railway
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      message: 'Smash Ban Stages WebSocket Server',
      uptime: process.uptime(),
      sessions: sessions.size
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Almacenamiento en memoria de las sesiones activas
const sessions = new Map();

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Crear nueva sesión
  socket.on('create-session', (data) => {
    const sessionId = uuidv4();
    const session = {
      sessionId,
      player1: {
        name: data.player1,
        score: 0,
        character: null,
        wonStages: []
      },
      player2: {
        name: data.player2,
        score: 0,
        character: null,
        wonStages: []
      },
      format: data.format, // "BO3" o "BO5"
      currentGame: 1,
      phase: 'RPS', // "RPS", "STAGE_BAN", "STAGE_SELECT", "CHARACTER_SELECT", "PLAYING", "FINISHED"
      rpsWinner: null,
      lastGameWinner: null,
      currentTurn: null,
      availableStages: [],
      bannedStages: [],
      selectedStage: null,
      banHistory: [],
      bansRemaining: 0,
      totalBansNeeded: 0
    };

    sessions.set(sessionId, session);
    
    // Unir al cliente a la sala de la sesión
    socket.join(sessionId);
    
    console.log('Sesión creada:', sessionId);
    socket.emit('session-created', { sessionId, session });
  });

  // Unirse a una sesión existente
  socket.on('join-session', (sessionId) => {
    const session = sessions.get(sessionId);
    if (session) {
      socket.join(sessionId);
      socket.emit('session-joined', { session });
      console.log('Cliente unido a sesión:', sessionId);
    } else {
      socket.emit('session-error', { message: 'Sesión no encontrada' });
    }
  });

  // Actualizar estado de la sesión
  socket.on('update-session', ({ sessionId, updates }) => {
    const session = sessions.get(sessionId);
    if (session) {
      // Aplicar actualizaciones
      Object.assign(session, updates);
      sessions.set(sessionId, session);
      
      // Emitir a todos en la sala
      io.to(sessionId).emit('session-updated', { session });
      console.log('Sesión actualizada:', sessionId);
    }
  });

  // Seleccionar ganador de RPS
  socket.on('select-rps-winner', ({ sessionId, winner }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'RPS') {
      session.rpsWinner = winner;
      session.currentTurn = winner;
      session.phase = 'STAGE_BAN';
      
      // Configurar stages disponibles según el game
      if (session.currentGame === 1) {
        // Game 1: 5 stages
        session.availableStages = ['battlefield', 'small-battlefield', 'pokemon-stadium-2', 'smashville', 'town-and-city'];
        // Sistema 1-2-1: Total 4 baneos
        session.totalBansNeeded = 4;
        session.bansRemaining = 1; // Ganador RPS banea 1 primero
      } else {
        // Game 2+: 8 stages
        session.availableStages = [
          'battlefield', 'small-battlefield', 'pokemon-stadium-2', 
          'smashville', 'town-and-city', 'hollow-bastion', 
          'final-destination', 'kalos'
        ];
        
        // Aplicar DSR: Bloquear stages donde el ganador del game anterior ya ganó
        if (session.lastGameWinner) {
          const winnerStages = session[session.lastGameWinner].wonStages;
          session.availableStages = session.availableStages.filter(
            stage => !winnerStages.includes(stage)
          );
        }
        
        // El ganador del game anterior banea 3
        session.currentTurn = session.lastGameWinner;
        session.totalBansNeeded = 3;
        session.bansRemaining = 3;
      }
      
      session.bannedStages = [];
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Banear un stage
  socket.on('ban-stage', ({ sessionId, stage, player }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'STAGE_BAN') {
      // Agregar al historial
      session.banHistory.push({
        game: session.currentGame,
        player: player,
        stage: stage,
        timestamp: new Date()
      });
      
      session.bannedStages.push(stage);
      session.availableStages = session.availableStages.filter(s => s !== stage);
      session.bansRemaining--;
      
      // Lógica para Game 1 (Sistema 1-2-1)
      if (session.currentGame === 1) {
        if (session.bannedStages.length === 1) {
          // Después del primer baneo, el perdedor RPS banea 2
          session.currentTurn = session.rpsWinner === 'player1' ? 'player2' : 'player1';
          session.bansRemaining = 2;
        } else if (session.bannedStages.length === 3) {
          // Después de 3 baneos, el ganador RPS banea 1 más
          session.currentTurn = session.rpsWinner;
          session.bansRemaining = 1;
        } else if (session.bannedStages.length === 4) {
          // Todos los baneos completados, el perdedor RPS selecciona
          session.phase = 'STAGE_SELECT';
          session.currentTurn = session.rpsWinner === 'player1' ? 'player2' : 'player1';
        }
      } 
      // Lógica para Game 2+ (Sistema 3-ban)
      else {
        if (session.bansRemaining === 0) {
          // El perdedor del game anterior selecciona el stage
          session.phase = 'STAGE_SELECT';
          session.currentTurn = session.lastGameWinner === 'player1' ? 'player2' : 'player1';
        }
      }
      
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Seleccionar stage
  socket.on('select-stage', ({ sessionId, stage, player }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'STAGE_SELECT') {
      session.selectedStage = stage;
      session.phase = 'CHARACTER_SELECT';
      
      // En Game 1, el ganador RPS elige primero
      // En Games 2+, el ganador del game anterior elige primero
      if (session.currentGame === 1) {
        session.currentTurn = session.rpsWinner;
      } else {
        session.currentTurn = session.lastGameWinner;
      }
      
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Seleccionar personaje
  socket.on('select-character', ({ sessionId, character, player }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'CHARACTER_SELECT') {
      session[player].character = character;
      
      // Verificar si ambos jugadores han seleccionado
      const otherPlayer = player === 'player1' ? 'player2' : 'player1';
      
      if (!session[otherPlayer].character) {
        // El otro jugador debe seleccionar
        session.currentTurn = otherPlayer;
      } else {
        // Ambos han seleccionado, comenzar el game
        session.phase = 'PLAYING';
        session.currentTurn = null;
      }
      
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Registrar ganador del game
  socket.on('game-winner', ({ sessionId, winner }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'PLAYING') {
      // Incrementar score
      session[winner].score++;
      
      // Agregar stage a la lista de stages ganados (para DSR)
      session[winner].wonStages.push(session.selectedStage);
      
      session.lastGameWinner = winner;
      
      // Verificar si la serie terminó
      const maxScore = session.format === 'BO3' ? 2 : 3;
      if (session[winner].score >= maxScore) {
        session.phase = 'FINISHED';
        io.to(sessionId).emit('series-finished', { winner, session });
      } else {
        // Continuar a siguiente game
        session.currentGame++;
        session.phase = 'STAGE_BAN';
        session.selectedStage = null;
        session.bannedStages = [];
        
        // Resetear personajes para permitir counter-pick
        session.player1.character = null;
        session.player2.character = null;
        
        // Configurar para el siguiente game (8 stages disponibles)
        session.availableStages = [
          'battlefield', 'small-battlefield', 'pokemon-stadium-2',
          'smashville', 'town-and-city', 'hollow-bastion',
          'final-destination', 'kalos'
        ];
        
        // Aplicar DSR
        const winnerStages = session[winner].wonStages;
        session.availableStages = session.availableStages.filter(
          stage => !winnerStages.includes(stage)
        );
        
        // El ganador banea primero
        session.currentTurn = winner;
        session.totalBansNeeded = 3;
        session.bansRemaining = 3;
      }
      
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Reiniciar sesión
  socket.on('reset-session', ({ sessionId }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.player1.score = 0;
      session.player1.character = null;
      session.player1.wonStages = [];
      session.player2.score = 0;
      session.player2.character = null;
      session.player2.wonStages = [];
      session.currentGame = 1;
      session.phase = 'RPS';
      session.rpsWinner = null;
      session.lastGameWinner = null;
      session.currentTurn = null;
      session.availableStages = [];
      session.bannedStages = [];
      session.selectedStage = null;
      session.banHistory = [];
      
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Servidor WebSocket corriendo en puerto ${PORT}`);
});
