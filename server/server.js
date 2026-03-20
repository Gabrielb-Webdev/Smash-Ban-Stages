const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ── Historial de picks por jugador (persistido en disco) ──────────────
const HISTORY_FILE = path.join(__dirname, 'player-history.json');

function loadPlayerHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      // Convertir a Map<playerName, string[]>
      const map = new Map();
      for (const [name, chars] of Object.entries(parsed)) {
        map.set(name, Array.isArray(chars) ? chars : []);
      }
      return map;
    }
  } catch (e) {
    console.error('⚠️ Error cargando player-history.json:', e.message);
  }
  return new Map();
}

function savePlayerHistory() {
  try {
    const obj = {};
    for (const [name, chars] of playerHistory.entries()) {
      obj[name] = chars;
    }
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (e) {
    console.error('⚠️ Error guardando player-history.json:', e.message);
  }
}

function recordCharacterPick(playerName, characterId) {
  if (!playerName || !characterId) return;
  const key = playerName.trim().toLowerCase();
  const existing = playerHistory.get(key) || [];
  // Mover al frente si ya existe, si no agregar al frente (máx 20)
  const filtered = existing.filter(c => c !== characterId);
  const updated = [characterId, ...filtered].slice(0, 20);
  playerHistory.set(key, updated);
  savePlayerHistory();
}

const playerHistory = loadPlayerHistory();
console.log(`📚 Historial cargado: ${playerHistory.size} jugadores`);

// Constantes para stages - Mendoza (Team Anexo)
const MENDOZA_STAGES_GAME1 = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'smashville', 'battlefield'];
const MENDOZA_STAGES_GAME2_PLUS = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'hollow-bastion', 'battlefield', 'final-destination', 'kalos', 'smashville'];

// Constantes para stages - Córdoba (por defecto)
const CORDOBA_STAGES_GAME1 = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'hollow-bastion', 'battlefield'];
const CORDOBA_STAGES_GAME2_PLUS = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'hollow-bastion', 'battlefield', 'final-destination', 'kalos', 'smashville'];

// Función para detectar el torneo basado en sessionId
function detectTournament(sessionId) {
  console.log('🔍 SERVER detectTournament input:', sessionId);
  
  if (!sessionId) {
    console.log('❌ No sessionId provided, defaulting to cordoba');
    return 'cordoba';
  }
  
  // Caso 1: sessionId directo (ej: "mendoza" desde /tablet/mendoza)
  if (sessionId === 'mendoza') {
    console.log('✅ Direct match: mendoza detected');
    return 'mendoza';
  }
  
  // Caso 2: sessionId con formato session-torneo (ej: "abc123-mendoza")
  if (sessionId.includes('-')) {
    const parts = sessionId.split('-');
    const lastPart = parts[parts.length - 1];
    console.log('🔍 Checking hyphenated sessionId:', { parts, lastPart });
    if (lastPart === 'mendoza') {
      console.log('✅ Hyphenated match: mendoza detected');
      return 'mendoza';
    }
  }
  
  // Caso 3: sessionId con URL path (ej: "path/mendoza")
  if (sessionId.includes('/')) {
    const lastPart = sessionId.split('/').pop();
    console.log('🔍 Checking path sessionId:', { lastPart });
    if (lastPart === 'mendoza') {
      console.log('✅ Path match: mendoza detected');
      return 'mendoza';
    }
  }
  
  console.log('⚪ No match found, defaulting to cordoba');
  return 'cordoba'; // Por defecto
}

// Función para obtener stages según el torneo
function getStagesForTournament(sessionId, currentGame) {
  const tournament = detectTournament(sessionId);
  
  console.log('🎯 SERVER getStagesForTournament:', {
    sessionId,
    tournament,
    currentGame,
    isMendoza: tournament === 'mendoza'
  });
  
  if (tournament === 'mendoza') {
    const stages = currentGame === 1 ? MENDOZA_STAGES_GAME1 : MENDOZA_STAGES_GAME2_PLUS;
    console.log('✅ Mendoza ruleset selected:', stages);
    return stages;
  }
  
  // Ruleset por defecto (Córdoba)
  const stages = currentGame === 1 ? CORDOBA_STAGES_GAME1 : CORDOBA_STAGES_GAME2_PLUS;
  console.log('⚪ Córdoba ruleset selected:', stages);
  return stages;
}

// ── start.gg integration ─────────────────────────────────────────────────────
const START_GG_TOKEN = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET;

// Datos de start.gg pendientes de ser asociados a una sesión (llegan antes que el create-session)
const pendingStartggData = new Map();

async function reportToStartGG(setId, winnerId, gameData) {
  if (!START_GG_TOKEN) {
    console.warn('⚠️ START_GG_API_TOKEN no configurado, no se reportará a start.gg');
    return;
  }
  const mutation = `
    mutation ReportSet($setId: ID!, $winnerId: ID, $gameData: [BracketSetGameDataInput]) {
      reportBracketSet(setId: $setId, winnerId: $winnerId, isDQ: false, gameData: $gameData) {
        id
        state
      }
    }
  `;
  const res = await fetch('https://api.start.gg/gql/alpha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${START_GG_TOKEN}` },
    body: JSON.stringify({
      query: mutation,
      variables: {
        setId: String(setId),
        winnerId: winnerId ? String(winnerId) : null,
        gameData: (gameData || []).map(g => ({ gameNum: g.gameNum, winnerId: String(g.winnerId) })),
      },
    }),
  });
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  console.log(`✅ start.gg set ${setId} reportado (winner: ${winnerId || 'en curso'}):`, data.data?.reportBracketSet);
  return data.data?.reportBracketSet;
}
// ─────────────────────────────────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  // Health check endpoint para Railway y otros servicios
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Recibir datos de start.gg para una sesión (llamado desde el panel admin)
  if (req.url === '/session-meta' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { sessionId, startggSetId, startggEntrant1Id, startggEntrant2Id, player1, player2, format } = JSON.parse(body);
        if (!sessionId) { res.writeHead(400); res.end(JSON.stringify({ error: 'sessionId requerido' })); return; }

        // Guardar en pending (por si la sesión WebSocket todavía no se creó)
        pendingStartggData.set(sessionId, { startggSetId, startggEntrant1Id, startggEntrant2Id });

        // Crear la sesión completa en el Map para que join-session funcione inmediatamente
        let session = sessions.get(sessionId);
        if (!session && (player1 || player2)) {
          session = {
            sessionId,
            community: null,
            player1: { name: player1 || 'Jugador 1', score: 0, character: null, wonStages: [] },
            player2: { name: player2 || 'Jugador 2', score: 0, character: null, wonStages: [] },
            format: format || 'BO3',
            currentGame: 1,
            phase: 'RPS',
            rpsWinner: null,
            lastGameWinner: null,
            currentTurn: null,
            availableStages: [],
            bannedStages: [],
            selectedStage: null,
            banHistory: [],
            bansRemaining: 0,
            totalBansNeeded: 0,
            games: [],
            startggSetId: startggSetId || null,
            startggEntrant1Id: startggEntrant1Id || null,
            startggEntrant2Id: startggEntrant2Id || null,
          };
          sessions.set(sessionId, session);
          console.log('📝 Sesión pre-creada desde /session-meta:', sessionId);
        } else if (session) {
          // Actualizar datos start.gg en sesión existente
          session.startggSetId = startggSetId;
          session.startggEntrant1Id = startggEntrant1Id;
          session.startggEntrant2Id = startggEntrant2Id;
          sessions.set(sessionId, session);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Body inválido' }));
      }
    });
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
        totalBansNeeded: 0,
        // start.gg integration
        games: [],
        startggSetId: null,
        startggEntrant1Id: null,
        startggEntrant2Id: null,
      };
    }

    // Asignar datos de start.gg si estaban pendientes
    const pendingStgg = pendingStartggData.get(sessionId);
    if (pendingStgg) {
      session.startggSetId      = pendingStgg.startggSetId;
      session.startggEntrant1Id = pendingStgg.startggEntrant1Id;
      session.startggEntrant2Id = pendingStgg.startggEntrant2Id;
      pendingStartggData.delete(sessionId);
    }
    // También reiniciar games al crear/resetear sesión
    session.games = [];

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

  // Repetir stage anterior (aplica los mismos baneos y stage directamente)
  socket.on('repeat-stage', ({ sessionId, bannedStages, selectedStage }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'STAGE_BAN') {
      session.bannedStages = Array.isArray(bannedStages) ? bannedStages : [];
      session.selectedStage = selectedStage;
      session.phase = 'PLAYING';
      session.currentTurn = null;
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Obtener historial de picks de un jugador
  socket.on('get-player-history', ({ playerName }) => {
    const key = (playerName || '').trim().toLowerCase();
    const chars = playerHistory.get(key) || [];
    socket.emit('player-history', { playerName, characters: chars });
  });

  // Seleccionar personaje
  socket.on('select-character', ({ sessionId, character, player }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'CHARACTER_SELECT') {
      // Guardar en historial por nombre de jugador
      recordCharacterPick(session[player].name, character);
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

      // Registrar resultado de este game para start.gg
      if (!session.games) session.games = [];
      const winnerEntrantId = winner === 'player1' ? session.startggEntrant1Id : session.startggEntrant2Id;
      session.games.push({ gameNum: session.currentGame, winnerId: winnerEntrantId });
      
      // Verificar si la serie terminó
      const fmt = (session.format || '').toUpperCase();
      const maxScore = fmt === 'BO5' ? 3 : 2; // default BO3
      const seriesFinished = session[winner].score >= maxScore;

      if (seriesFinished) {
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

      // Reportar a start.gg si tenemos el setId
      if (session.startggSetId && winnerEntrantId) {
        const gameData = session.games.map(g => ({ gameNum: g.gameNum, winnerId: g.winnerId }));
        const setWinnerId = seriesFinished ? winnerEntrantId : null;
        reportToStartGG(session.startggSetId, setWinnerId, gameData)
          .catch(e => console.error('⚠️ Error reportando a start.gg:', e.message));
      }
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
