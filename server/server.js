const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

// Constantes para stages - Mendoza (Team Anexo)
const MENDOZA_STAGES_GAME1 = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'hollow-bastion', 'battlefield'];
const MENDOZA_STAGES_GAME2_PLUS = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'hollow-bastion', 'battlefield', 'final-destination', 'kalos', 'smashville'];

// Constantes para stages - Córdoba (por defecto)
const CORDOBA_STAGES_GAME1 = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'hollow-bastion', 'battlefield'];
const CORDOBA_STAGES_GAME2_PLUS = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'hollow-bastion', 'battlefield', 'final-destination', 'kalos', 'smashville'];

// Función para detectar el torneo basado en sessionId
function detectTournament(sessionId) {
  if (!sessionId) return 'cordoba';
  
  // Caso 1: sessionId directo (ej: "mendoza" desde /tablet/mendoza)
  if (sessionId === 'mendoza') {
    return 'mendoza';
  }
  
  // Caso 2: sessionId con formato session-torneo (ej: "abc123-mendoza")
  if (sessionId.includes('-')) {
    const parts = sessionId.split('-');
    const lastPart = parts[parts.length - 1];
    if (lastPart === 'mendoza') {
      return 'mendoza';
    }
  }
  
  // Caso 3: sessionId con URL path (ej: "path/mendoza")
  if (sessionId.includes('/')) {
    const lastPart = sessionId.split('/').pop();
    if (lastPart === 'mendoza') {
      return 'mendoza';
    }
  }
  
  return 'cordoba'; // Por defecto
}

// Función para obtener stages según el torneo
function getStagesForTournament(sessionId, currentGame) {
  const tournament = detectTournament(sessionId);
  
  if (tournament === 'mendoza') {
    return currentGame === 1 ? MENDOZA_STAGES_GAME1 : MENDOZA_STAGES_GAME2_PLUS;
  }
  
  // Ruleset por defecto (Córdoba)
  return currentGame === 1 ? CORDOBA_STAGES_GAME1 : CORDOBA_STAGES_GAME2_PLUS;
}

const httpServer = createServer((req, res) => {
  // Health check endpoint para Railway y otros servicios
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.url === '/' || req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      service: 'Smash Ban Stages WebSocket Server',
      uptime: process.uptime(),
      sessions: sessions.size,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Almacenamiento en memoria de las sesiones activas
const sessions = new Map();

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Crear nueva sesión usando el sessionId proporcionado
  socket.on('create-session', (data) => {
    const sessionId = data.sessionId || 'main-session'; // Usar sessionId del cliente o fallback
    const community = data.community; // Guardar la comunidad
    
    console.log('📝 Creando sesión:', sessionId, 'para comunidad:', community);
    
    // Verificar si ya existe una sesión
    let session = sessions.get(sessionId);
    
    if (session) {
      // Si existe, actualizar nombres y reiniciar
      session.player1.name = data.player1;
      session.player2.name = data.player2;
      session.format = data.format;
      session.community = community; // Actualizar comunidad
      // Reiniciar todo lo demás
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
      session.bansRemaining = 0;
      session.totalBansNeeded = 0;
    } else {
      // Crear nueva sesión
      session = {
        sessionId,
        community, // Guardar la comunidad
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
    }

    sessions.set(sessionId, session);
    
    // Unir al cliente a la sala de la sesión
    socket.join(sessionId);
    
    console.log('Sesión creada/actualizada:', sessionId);
    socket.emit('session-created', { sessionId, session });
    // Notificar a todos en la sala
    io.to(sessionId).emit('session-updated', { session });
  });

  // Obtener todas las sesiones de una comunidad específica
  socket.on('get-community-sessions', (data) => {
    const { community } = data;
    console.log('🔍 Buscando sesiones para comunidad:', community);
    
    const communitySessions = [];
    sessions.forEach((session, sessionId) => {
      if (session.community === community) {
        communitySessions.push(session);
        // Unir al socket a cada sesión para recibir actualizaciones
        socket.join(sessionId);
      }
    });
    
    console.log(`📋 Encontradas ${communitySessions.length} sesiones para ${community}`);
    socket.emit('community-sessions', { 
      community, 
      sessions: communitySessions 
    });
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
      // Ir directo a selección de personajes
      session.phase = 'CHARACTER_SELECT';
      // El ganador RPS elige primero en Game 1, el ganador del game anterior en Games 2+
      session.currentTurn = session.currentGame === 1 ? winner : session.lastGameWinner || winner;
      
      // Configurar stages disponibles según el torneo y el game
      const availableStages = getStagesForTournament(sessionId, session.currentGame);
      session.availableStages = [...availableStages]; // Hacer copia para poder modificar después
      
      if (session.currentGame === 1) {
        // Game 1: Sistema 1-2 (Ganador banea 1, perdedor banea 2, ganador selecciona)
        session.totalBansNeeded = 3;
        session.bansRemaining = 1; // Ganador RPS banea 1 primero
      } else {
        // Game 2+: El ganador del game anterior banea 3
        
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
      
      // Lógica para Game 1 (Sistema 1-2)
      if (session.currentGame === 1) {
        if (session.bannedStages.length === 1) {
          // Después del primer baneo del ganador, el perdedor RPS banea 2
          session.currentTurn = session.rpsWinner === 'player1' ? 'player2' : 'player1';
          session.bansRemaining = 2;
        } else if (session.bannedStages.length === 3) {
          // Después de 3 baneos (1+2), el ganador RPS selecciona
          session.phase = 'STAGE_SELECT';
          session.currentTurn = session.rpsWinner;
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
      // Ir directo a PLAYING ya que los personajes ya están seleccionados
      session.phase = 'PLAYING';
      session.currentTurn = null;
      
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
        sessions.set(sessionId, session);
        io.to(sessionId).emit('session-updated', { session });
      } else {
        // Ambos han seleccionado, esperar 2 segundos antes de ir a STAGE_BAN
        sessions.set(sessionId, session);
        io.to(sessionId).emit('session-updated', { session });
        
        setTimeout(() => {
          const updatedSession = sessions.get(sessionId);
          if (updatedSession && updatedSession.phase === 'CHARACTER_SELECT') {
            // Cambiar a STAGE_BAN
            updatedSession.phase = 'STAGE_BAN';
            
            // Configurar stages disponibles según el game
            if (updatedSession.currentGame === 1) {
              // Game 1: 5 stages en orden específico
              updatedSession.availableStages = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'hollow-bastion', 'battlefield'];
              // Sistema 1-2: Ganador banea 1, perdedor banea 2, ganador selecciona
              updatedSession.totalBansNeeded = 3;
              updatedSession.bansRemaining = 1; // Ganador RPS banea 1 primero
              updatedSession.currentTurn = updatedSession.rpsWinner;
            } else {
              // Game 2+: 8 stages (DSR desactivado - todos los stages disponibles)
              updatedSession.availableStages = [
                'small-battlefield', 'town-and-city', 'pokemon-stadium-2', 
                'hollow-bastion', 'battlefield', 'final-destination', 
                'kalos', 'smashville'
              ];
              
              console.log('🎮 Game 2+ - Stages disponibles:', updatedSession.availableStages.length, updatedSession.availableStages);
              
              // DSR desactivado - todos los stages están disponibles
              // Si quieres reactivar DSR, descomenta las siguientes líneas:
              // if (updatedSession.lastGameWinner) {
              //   const winnerStages = updatedSession[updatedSession.lastGameWinner].wonStages;
              //   updatedSession.availableStages = updatedSession.availableStages.filter(
              //     stage => !winnerStages.includes(stage)
              //   );
              // }
              
              // El ganador del game anterior banea 3
              updatedSession.currentTurn = updatedSession.lastGameWinner;
              updatedSession.totalBansNeeded = 3;
              updatedSession.bansRemaining = 3;
            }
            
            updatedSession.bannedStages = [];
            sessions.set(sessionId, updatedSession);
            io.to(sessionId).emit('session-updated', { session: updatedSession });
          }
        }, 2000);
      }
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
        session.phase = 'CHARACTER_SELECT';
        session.selectedStage = null;
        session.bannedStages = [];
        
        // Resetear personajes para permitir counter-pick
        session.player1.character = null;
        session.player2.character = null;
        
        // El ganador del game anterior elige personaje primero
        session.currentTurn = winner;
      }
      
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Actualizar nombres de jugadores
  socket.on('update-players', ({ sessionId, player1, player2, format }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.player1.name = player1;
      session.player2.name = player2;
      if (format) {
        session.format = format;
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
      session.bansRemaining = 0;
      session.totalBansNeeded = 0;
      
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });
  
  // Terminar match (marcar como FINISHED)
  socket.on('end-match', ({ sessionId, winner }) => {
    const session = sessions.get(sessionId);
    if (session) {
      session.phase = 'FINISHED';
      session.lastGameWinner = winner;
      
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
      io.to(sessionId).emit('series-finished', { winner, session });
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces (necesario para Railway)

httpServer.listen(PORT, HOST, () => {
  console.log(`✅ Servidor WebSocket corriendo en ${HOST}:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check disponible en http://${HOST}:${PORT}/health`);
});

// Mantener el proceso vivo
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM recibido, cerrando servidor gracefully...');
  httpServer.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT recibido, cerrando servidor...');
  httpServer.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});
