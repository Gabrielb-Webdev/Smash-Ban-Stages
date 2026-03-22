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

// Mapeo de character slugs internos → IDs de Start.gg para SSBU (videogame 1386)
const STARTGG_CHARACTER_IDS = {
  'banjo-kazooie': 1747, 'bayonetta': 1279, 'bowser': 1272, 'bowser-jr': 1283,
  'byleth': 1749, 'captain-falcon': 1281, 'chrom': 1741, 'cloud': 1285,
  'corrin': 1287, 'daisy': 1739, 'dark-pit': 1289, 'dark-samus': 1740,
  'diddy-kong': 1291, 'donkey-kong': 1275, 'dr-mario': 1293, 'duck-hunt': 1295,
  'falco': 1297, 'fox': 1299, 'ganondorf': 1301, 'greninja': 1303,
  'hero': 1748, 'ice-climbers': 1305, 'ike': 1307, 'incineroar': 1743,
  'inkling': 1738, 'isabelle': 1742, 'jigglypuff': 1309, 'joker': 1746,
  'kazuya': 1753, 'ken': 1744, 'king-dedede': 1311, 'king-k-rool': 1745,
  'kirby': 1313, 'link': 1315, 'little-mac': 1317, 'lucario': 1319,
  'lucas': 1321, 'lucina': 1323, 'luigi': 1325, 'mario': 1273,
  'marth': 1327, 'mega-man': 1329, 'meta-knight': 1331, 'mewtwo': 1333,
  'mii-brawler': 1335, 'mii-gunner': 1337, 'mii-swordfighter': 1339,
  'min-min': 1750, 'mr-game-watch': 1341, 'ness': 1343, 'olimar': 1345,
  'pac-man': 1347, 'palutena': 1349, 'peach': 1351, 'pichu': 1353,
  'pikachu': 1355, 'piranha-plant': 1756, 'pit': 1357,
  'pokemon-trainer': 1359, 'pyra-mythra': 1752, 'rob': 1361, 'richter': 1736,
  'ridley': 1737, 'robin': 1363, 'rosalina-luma': 1365, 'roy': 1367,
  'ryu': 1369, 'samus': 1371, 'sephiroth': 1751, 'sheik': 1373,
  'shulk': 1375, 'simon': 1735, 'snake': 1377, 'sonic': 1379,
  'sora': 1755, 'steve': 1754, 'terry': 1758, 'toon-link': 1381,
  'villager': 1383, 'wario': 1385, 'wii-fit-trainer': 1387, 'wolf': 1389,
  'yoshi': 1391, 'young-link': 1393, 'zelda': 1395, 'zero-suit-samus': 1397,
};

// Mapeo de stage slugs internos → IDs de Start.gg para SSBU (solo stages validados)
const STARTGG_STAGE_IDS = {
  'battlefield': 317, 'small-battlefield': 467, 'final-destination': 318,
  'pokemon-stadium-2': 316, 'smashville': 327, 'town-and-city': 336,
  'kalos': 340, 'hollow-bastion': 468,
};

// Datos de start.gg pendientes de ser asociados a una sesión (llegan antes que el create-session)
const pendingStartggData = new Map();

async function reportToStartGG(setId, winnerId, gameData) {
  // Delegar al API de Next.js (Vercel) que tiene el token configurado
  const vercelUrl = process.env.NEXTJS_URL || 'https://smash-ban-stages.vercel.app';
  const filteredGameData = (gameData || []).filter(g => g.winnerId != null).map(g => {
    const gd = { gameNum: g.gameNum, winnerId: String(g.winnerId) };
    const selections = [];
    if (g.p1EntrantId && g.p1CharacterId) {
      const charId = STARTGG_CHARACTER_IDS[g.p1CharacterId];
      if (charId) selections.push({ entrantId: String(g.p1EntrantId), characterId: charId });
    }
    if (g.p2EntrantId && g.p2CharacterId) {
      const charId = STARTGG_CHARACTER_IDS[g.p2CharacterId];
      if (charId) selections.push({ entrantId: String(g.p2EntrantId), characterId: charId });
    }
    if (selections.length > 0) gd.selections = selections;
    if (g.stageId) {
      const stageId = STARTGG_STAGE_IDS[g.stageId];
      if (stageId) gd.stageId = stageId;
    }
    return gd;
  });
  const res = await fetch(`${vercelUrl}/api/tournaments/report-set`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setId: String(setId), winnerId: winnerId ? String(winnerId) : null, gameData: filteredGameData }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Error reportando a start.gg');
  console.log(`✅ start.gg set ${setId} reportado (winner: ${winnerId || 'en curso'}):`, data.set);
  return data.set;
}

async function markSetCalled(setId) {
  // Delegamos a Vercel (que tiene el token) igual que reportToStartGG
  const vercelUrl = process.env.NEXTJS_URL || 'https://smash-ban-stages.vercel.app';
  try {
    const res = await fetch(`${vercelUrl}/api/tournaments/mark-set-called`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setId: String(setId) }),
    });
    const data = await res.json();
    if (data.ok) console.log(`✅ start.gg set ${setId} marcado como llamado`);
    else console.warn('⚠️ markSetCalled error:', data.error);
  } catch (e) {
    console.warn('⚠️ Error en markSetCalled:', e.message);
  }
}

async function markSetInProgress(setId) {
  const vercelUrl = process.env.NEXTJS_URL || 'https://smash-ban-stages.vercel.app';
  try {
    const res = await fetch(`${vercelUrl}/api/tournaments/mark-set-in-progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setId: String(setId) }),
    });
    const data = await res.json();
    if (data.ok) console.log(`✅ start.gg set ${setId} → ACTIVE (verde)`);
    else console.warn('⚠️ markSetInProgress error:', data.error);
  } catch (e) {
    console.warn('⚠️ Error en markSetInProgress:', e.message);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  // Health check endpoint para Railway y otros servicios
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
            phase: 'CHECKIN',
            checkIns: [],
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
          console.log('📝 Sesión pre-creada (CHECKIN) desde /session-meta:', sessionId);
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
  } else if (req.method === 'DELETE' && req.url.startsWith('/session/')) {
    // DELETE /session/:sessionId — cancela una sesión (admin la cancela desde el panel)
    const sessionId = decodeURIComponent(req.url.slice('/session/'.length));
    const session = sessions.get(sessionId);
    if (session) {
      session.phase = 'FINISHED';
      sessions.set(sessionId, session);
      // Notificar a los jugadores conectados que el match fue cancelado
      io.to(sessionId).emit('match-cancelled', { sessionId });
      io.to(sessionId).emit('session-updated', { session });
      console.log(`❌ Sesión cancelada por admin: ${sessionId}`);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  } else if (req.method === 'GET' && req.url.startsWith('/session/')) {
    // GET /session/:sessionId — devuelve estado de check-in de una sesión
    const sessionId = decodeURIComponent(req.url.slice('/session/'.length));
    const session = sessions.get(sessionId);
    if (session) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        phase: session.phase,
        checkIns: session.checkIns || [],
        player1: session.player1?.name,
        player2: session.player2?.name,
        score1: session.player1?.score || 0,
        score2: session.player2?.score || 0,
        char1: session.player1?.character || null,
        char2: session.player2?.character || null,
        selectedStage: session.selectedStage || null,
        currentGame: session.currentGame || 1,
        format: session.format || 'BO3',
        games: (session.games || []).map(g => ({
          gameNum:        g.gameNum,
          winnerName:     g.winnerName    || null,
          winnerEntrantId: g.winnerId     || null,  // entrant ID del ganador
          p1Name:         g.p1Name        || session.player1?.name,
          p2Name:         g.p2Name        || session.player2?.name,
          p1EntrantId:    g.p1EntrantId   || session.startggEntrant1Id || null,
          p2EntrantId:    g.p2EntrantId   || session.startggEntrant2Id || null,
          char1: g.p1CharacterId,
          char2: g.p2CharacterId,
          stage: g.stageId,
        })),
        currentTurn: session.currentTurn || null,
      }));
    } else {
      // Devolver 200 con ok:false para evitar errores en consola del navegador
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, reason: 'session_not_found' }));
    }
  } else if (req.method === 'GET' && req.url.startsWith('/sessions/player')) {
    // GET /sessions/player?name=... — busca sesiones activas de un jugador por nombre
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      const name = (urlObj.searchParams.get('name') || '').toLowerCase().trim();
      if (!name) { res.writeHead(400); res.end(JSON.stringify({ error: 'name requerido' })); return; }
      const found = [];
      sessions.forEach((session, sessionId) => {
        if (session.phase === 'FINISHED') return;
        const p1 = (session.player1?.name || '').toLowerCase().trim();
        const p2 = (session.player2?.name || '').toLowerCase().trim();
        if (p1.includes(name) || p2.includes(name) || (name.length > 2 && (p1.startsWith(name) || p2.startsWith(name)))) {
          found.push({ sessionId, player1: session.player1?.name, player2: session.player2?.name, phase: session.phase, checkIns: session.checkIns || [] });
        }
      });
      // Ordenar por sessionId descendente (los IDs contienen timestamp base-36 al final → más nuevo primero)
      found.sort((a, b) => b.sessionId.localeCompare(a.sessionId));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(found));
    } catch (e) {
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
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
      session.rpsProposal = null;
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
        rpsProposal: null,
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
      session.checkIns = session.checkIns || [];
    
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

  // Check-in de jugador para match de torneo
  socket.on('player-checkin', ({ sessionId, playerName }) => {
    const session = sessions.get(sessionId);
    if (!session) { socket.emit('session-error', { message: 'Sesión no encontrada' }); return; }
    if (!session.checkIns) session.checkIns = [];
    if (!session.checkIns.includes(playerName)) {
      session.checkIns.push(playerName);
      console.log(`✅ Check-in: ${playerName} en sesión ${sessionId} (${session.checkIns.length}/2)`);
    }
    // Cuando ambos hicieron check-in → iniciar la fase RPS
    if (session.checkIns.length >= 2 && session.phase === 'CHECKIN') {
      session.phase = 'RPS';
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
      io.to(sessionId).emit('both-checked-in', { session });
      console.log(`🚀 Ambos check-in en ${sessionId} → iniciando match`);
      // Marcar el set como en progreso en start.gg
      if (session.startggSetId) {
        markSetCalled(session.startggSetId).catch(e => console.warn('⚠️ markSetCalled error:', e.message));
      }
    } else {
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
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

  // Seleccionar ganador de RPS (con confirmación bidireccional)
  socket.on('select-rps-winner', ({ sessionId, winner, proposedBy }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'RPS') {
      // Sistema de confirmación bidireccional
      if (!session.rpsProposal) {
        // Primera propuesta: guardar y esperar confirmación del otro jugador
        session.rpsProposal = { winner, proposedBy };
        sessions.set(sessionId, session);
        io.to(sessionId).emit('session-updated', { session });
        console.log(`🤜 RPS propuesta: ${proposedBy} dice que ganó ${winner} en ${sessionId}`);
        return;
      }
      
      // Ya hay una propuesta, verificar si coincide
      if (session.rpsProposal.winner === winner && session.rpsProposal.proposedBy !== proposedBy) {
        // ¡Confirmado! Ambos dicen lo mismo → aplicar resultado
        console.log(`✅ RPS confirmada: ambos coinciden en ${winner} para ${sessionId}`);
        session.rpsProposal = null;
      } else if (session.rpsProposal.proposedBy === proposedBy) {
        // El mismo jugador cambió su respuesta
        session.rpsProposal = { winner, proposedBy };
        sessions.set(sessionId, session);
        io.to(sessionId).emit('session-updated', { session });
        return;
      } else {
        // No coinciden → reiniciar propuesta (conflicto)
        console.log(`❌ RPS conflicto: ${proposedBy} dice ${winner} pero propuesta era ${session.rpsProposal.winner}`);
        session.rpsProposal = null;
        sessions.set(sessionId, session);
        io.to(sessionId).emit('rps-conflict', { message: 'No coinciden las respuestas. Volvé a seleccionar.' });
        io.to(sessionId).emit('session-updated', { session });
        return;
      }

      // Aplicar el resultado de RPS (solo cuando ambos confirmaron)
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
      if (session.currentTurn !== player) return; // solo el jugador con turno puede banear
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
      if (session.currentTurn !== player) return; // solo el jugador con turno puede seleccionar
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
      if (session.currentTurn !== player) return; // solo el jugador con turno puede seleccionar
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

  // Proponer ganador del game (requiere confirmación del otro jugador)
  socket.on('propose-game-winner', ({ sessionId, winner, proposedBy }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'PLAYING') {
      session.winnerProposal = { winner, proposedBy: proposedBy || null };
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Rechazar propuesta de ganador
  socket.on('reject-game-winner', ({ sessionId }) => {
    const session = sessions.get(sessionId);
    if (session && session.winnerProposal) {
      session.winnerProposal = null;
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Registrar ganador del game (confirmado por el otro jugador)
  socket.on('game-winner', ({ sessionId, winner }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'PLAYING') {
      // Limpiar propuesta pendiente
      session.winnerProposal = null;
      // Incrementar score
      session[winner].score++;
      
      // Agregar stage a la lista de stages ganados (para DSR)
      session[winner].wonStages.push(session.selectedStage);
      
      session.lastGameWinner = winner;

      // Registrar resultado de este game para start.gg (con personajes y stage)
      if (!session.games) session.games = [];
      const winnerEntrantId = winner === 'player1' ? session.startggEntrant1Id : session.startggEntrant2Id;
      session.games.push({
        gameNum: session.currentGame,
        winnerId: winnerEntrantId,
        winnerName: session[winner].name,
        p1Name: session.player1.name,
        p2Name: session.player2.name,
        p1EntrantId: session.startggEntrant1Id,
        p2EntrantId: session.startggEntrant2Id,
        p1CharacterId: session.player1.character,
        p2CharacterId: session.player2.character,
        stageId: session.selectedStage,
      });
      
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

      // Reportar cada game a start.gg con personajes, stage y ganador
      if (session.startggSetId) {
        const gameData = session.games.map(g => ({
          gameNum: g.gameNum,
          winnerId: g.winnerId,
          p1EntrantId: g.p1EntrantId,
          p2EntrantId: g.p2EntrantId,
          p1CharacterId: g.p1CharacterId,
          p2CharacterId: g.p2CharacterId,
          stageId: g.stageId,
        }));

        if (seriesFinished) {
          // Serie terminó → reportar con winnerId → COMPLETED
          reportToStartGG(session.startggSetId, winnerEntrantId, gameData)
            .catch(e => console.error('⚠️ Error reportando resultado final a start.gg:', e.message));
        } else {
          // Mid-series → reportar progreso (winnerId=null) + volver a ACTIVE
          // reportBracketSet con winnerId=null siempre deja en CALLED (amarillo)
          // Así que después lo forzamos a ACTIVE (verde) con markSetInProgress
          reportToStartGG(session.startggSetId, null, gameData)
            .then(() => markSetInProgress(session.startggSetId))
            .catch(e => console.error('⚠️ Error reportando mid-series a start.gg:', e.message));
        }
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
      session.rpsProposal = null;
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
