const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ── Persistencia de sesiones en Redis (Upstash REST) ─────────────────────────
const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const SESSION_TTL = 4 * 60 * 60; // 4 horas en segundos

async function redisSessionSet(sessionId, session) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', `tournament:session:${sessionId}`, JSON.stringify(session), 'EX', String(SESSION_TTL)]]),
    });
  } catch (e) {
    console.error('⚠️ Redis session save error:', e.message);
  }
}

async function redisSessionGet(sessionId) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(`tournament:session:${sessionId}`)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    const data = await r.json();
    if (!data.result) return null;
    return JSON.parse(data.result);
  } catch (e) {
    console.error('⚠️ Redis session fetch error:', e.message);
    return null;
  }
}

// Wrapper del Map que persiste automáticamente en Redis en cada set()
class PersistentSessionMap {
  constructor() { this._map = new Map(); }
  get(key) { return this._map.get(key); }
  set(key, value) { this._map.set(key, value); redisSessionSet(key, value); return this; }
  delete(key) { this._map.delete(key); return this; }
  has(key) { return this._map.has(key); }
  forEach(fn) { this._map.forEach(fn); }
  get size() { return this._map.size; }
}

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

// Constantes para stages - AFK (Buenos Aires)
const AFK_STAGES_GAME1      = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'battlefield', 'smashville'];
const AFK_STAGES_GAME2_PLUS = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'hollow-bastion', 'battlefield', 'final-destination', 'kalos', 'smashville'];

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

  const s = sessionId.toLowerCase();

  // Detectar AFK
  if (s === 'afk' || s.startsWith('afk-') || s.includes('/afk')) {
    console.log('✅ AFK detected');
    return 'afk';
  }

  // Caso 1: sessionId directo o con prefijo (ej: "mendoza", "mendoza-1-abc123")
  if (s === 'mendoza' || s.startsWith('mendoza-')) {
    console.log('✅ Direct/prefix match: mendoza detected');
    return 'mendoza';
  }
  
  // Caso 2: sessionId con formato session-torneo (ej: "abc123-mendoza")
  if (s.includes('-')) {
    const parts = s.split('-');
    const lastPart = parts[parts.length - 1];
    console.log('🔍 Checking hyphenated sessionId:', { parts, lastPart });
    if (lastPart === 'mendoza') {
      console.log('✅ Hyphenated match: mendoza detected');
      return 'mendoza';
    }
  }
  
  // Caso 3: sessionId con URL path (ej: "path/mendoza")
  if (s.includes('/')) {
    const lastPart = s.split('/').pop();
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
  
  if (tournament === 'afk') {
    const stages = currentGame === 1 ? AFK_STAGES_GAME1 : AFK_STAGES_GAME2_PLUS;
    console.log('✅ AFK ruleset selected:', stages);
    return stages;
  }

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
// IDs obtenidos de Start.gg API: videogame(id: 1386) → SSBU
// Keys = slugs usados en la app (lib/characters.js)
const STARTGG_CHARACTER_IDS = {
  'banjo-kazooie': 1530, 'bayonetta': 1271, 'bowser': 1273, 'bowser-jr': 1272,
  'byleth': 1539, 'captain-falcon': 1274, 'chrom': 1409, 'cloud': 1275,
  'corrin': 1276, 'daisy': 1277, 'dark-pit': 1278, 'dark-samus': 1408,
  'diddy-kong': 1279, 'donkey-kong': 1280, 'dr-mario': 1282, 'duck-hunt': 1283,
  'falco': 1285, 'fox': 1286, 'ganondorf': 1287, 'greninja': 1289,
  'hero': 1526, 'ice-climbers': 1290, 'ike': 1291, 'incineroar': 1406,
  'inkling': 1292, 'isabelle': 1413, 'jigglypuff': 1293, 'joker': 1453,
  'kazuya': 1846, 'ken': 1410, 'king-dedede': 1294, 'king-k-rool': 1407,
  'kirby': 1295, 'link': 1296, 'little-mac': 1297, 'lucario': 1298,
  'lucas': 1299, 'lucina': 1300, 'luigi': 1301, 'mario': 1302,
  'marth': 1304, 'mega-man': 1305, 'meta-knight': 1307, 'mewtwo': 1310,
  'mii-brawler': 1311, 'mii-gunner': 1415, 'mii-swordfighter': 1414,
  'min-min': 1747, 'mr-game-watch': 1405, 'ness': 1313, 'olimar': 1314,
  'pac-man': 1315, 'palutena': 1316, 'peach': 1317, 'pichu': 1318,
  'pikachu': 1319, 'piranha-plant': 1441, 'pit': 1320,
  'pokemon-trainer': 1321, 'pyra-mythra': 1795, 'rob': 1323, 'richter': 1412,
  'ridley': 1322, 'robin': 1324, 'rosalina-luma': 1325, 'roy': 1326,
  'ryu': 1327, 'samus': 1328, 'sephiroth': 1777, 'sheik': 1329,
  'shulk': 1330, 'simon': 1411, 'snake': 1331, 'sonic': 1332,
  'sora': 1897, 'steve': 1766, 'terry': 1532, 'toon-link': 1333,
  'villager': 1334, 'wario': 1335, 'wii-fit-trainer': 1336, 'wolf': 1337,
  'yoshi': 1338, 'young-link': 1339, 'zelda': 1340, 'zero-suit-samus': 1341,
};

// Stage slugs de la app → IDs de Start.gg para SSBU
const STARTGG_STAGE_IDS = {
  'battlefield': 311, 'small-battlefield': 484, 'final-destination': 328,
  'pokemon-stadium-2': 378, 'smashville': 387, 'town-and-city': 397,
  'kalos': 348, 'hollow-bastion': 513,
};

// Datos de start.gg pendientes de ser asociados a una sesión (llegan antes que el create-session)
const pendingStartggData = new Map();

// Historial de "No disponible": { matchKey: Set<playerName> }
// matchKey = nombres de jugadores ordenados, ej: "BET0|Gabriel Sin H"
const unavailableHistory = new Map();

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

const httpServer = createServer(async (req, res) => {
  try {
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
            delayRequests: [],
            singleDeviceMode: false,
            unavailableUsedBy: (() => {
              const key = [player1 || 'Jugador 1', player2 || 'Jugador 2'].sort().join('|');
              const used = unavailableHistory.get(key);
              return used ? [...used] : [];
            })(),
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
          // Sesión ya existe (ej: Stream con sessionId fijo) → resetear completa
          const freshSession = {
            sessionId,
            community: session.community || null,
            player1: { name: player1 || 'Jugador 1', score: 0, character: null, wonStages: [] },
            player2: { name: player2 || 'Jugador 2', score: 0, character: null, wonStages: [] },
            format: format || 'BO3',
            currentGame: 1,
            phase: 'CHECKIN',
            checkIns: [],
            delayRequests: [],
            singleDeviceMode: false,
            unavailableUsedBy: (() => {
              const key = [player1 || 'Jugador 1', player2 || 'Jugador 2'].sort().join('|');
              const used = unavailableHistory.get(key);
              return used ? [...used] : [];
            })(),
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
          sessions.set(sessionId, freshSession);
          // Notificar a clientes conectados del reset
          io.to(sessionId).emit('session-updated', { session: freshSession });
          console.log('🔄 Sesión reseteada (CHECKIN) desde /session-meta:', sessionId);
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
      session.phase = 'CANCELLED';
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
    let session = sessions.get(sessionId);
    if (!session) {
      session = await redisSessionGet(sessionId);
      if (session) sessions._map.set(sessionId, session); // re-hidratar sin doble guardado
    }
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
        delayRequests: session.delayRequests || [],
        postponedBy: session.postponedBy || null,
        unavailableUsedBy: (() => {
          const p1 = session.player1?.name || '';
          const p2 = session.player2?.name || '';
          const key = [p1, p2].sort().join('|');
          const used = unavailableHistory.get(key);
          return used ? [...used] : [];
        })(),
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
        if (session.phase === 'FINISHED' || session.phase === 'CANCELLED' || session.phase === 'POSTPONED') return;
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
  } else if (req.url === '/emit-event' && req.method === 'POST') {
    // Endpoint interno para que las API routes de Vercel envíen eventos WS a usuarios conectados
    const expectedSecret = process.env.WS_INTERNAL_SECRET;
    const authHeader = req.headers.authorization || '';
    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      res.writeHead(401); res.end(JSON.stringify({ error: 'Unauthorized' })); return;
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { event, userId, data } = JSON.parse(body);
        if (!event || !userId) { res.writeHead(400); res.end(JSON.stringify({ error: 'event y userId requeridos' })); return; }
        const targetSocket = userSockets.get(String(userId));
        if (targetSocket && targetSocket.connected) {
          targetSocket.emit(event, data);
          console.log(`📡 emit-event: ${event} → userId ${userId}`);
        }
        res.writeHead(200); res.end(JSON.stringify({ ok: true, delivered: !!(targetSocket && targetSocket.connected) }));
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: 'Body inválido' }));
      }
    });
    return;
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
  } catch (e) {
    console.error('HTTP handler error:', e.message);
    if (!res.headersSent) res.writeHead(500).end(JSON.stringify({ error: 'Internal Server Error' }));
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

// Almacenamiento en memoria de las sesiones activas (con persistencia en Redis)
const sessions = new PersistentSessionMap();

// Mapa userId → socketId para presencia en tiempo real
const userSockets = new Map(); // userId → socket

// ── Helpers de presencia ─────────────────────────────────────────────────────
// Notifica a todos los amigos conectados que el estado de un usuario cambió.
// friendIds: string[] de userIds amigos (leídos desde Redis por el propio cliente al registrarse)
async function broadcastPresence(userId, status, friendIds) {
  if (!friendIds || friendIds.length === 0) return;
  for (const fid of friendIds) {
    const fSocket = userSockets.get(String(fid));
    if (fSocket && fSocket.connected) {
      fSocket.emit('friend-status-changed', { userId, status });
    }
  }
}

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
  socket.on('join-session', async (sessionId) => {
    let session = sessions.get(sessionId);
    if (!session) {
      // Intentar recuperar desde Redis (resiste reinicios del servidor)
      session = await redisSessionGet(sessionId);
      if (session) {
        sessions._map.set(sessionId, session); // re-hidratar sin doble guardado
        console.log('📥 Sesión recuperada desde Redis:', sessionId);
      }
    }
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
      // El set ya fue puesto en ACTIVE (verde) por el admin panel.
      // NO llamar markSetCalled aquí porque lo regresaría a CALLED (amarillo).
    } else {
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Jugador pide más tiempo — extiende el timer del admin panel en 5 minutos
  socket.on('request-match-delay', ({ sessionId, playerName }) => {
    const session = sessions.get(sessionId);
    if (!session) return;
    if (!Array.isArray(session.delayRequests)) session.delayRequests = [];
    if (session.delayRequests.includes(playerName)) return; // solo una vez por jugador
    session.delayRequests.push(playerName);
    sessions.set(sessionId, session);
    io.to(sessionId).emit('session-updated', { session });
    console.log(`⏱️ ${playerName} pidió más tiempo en ${sessionId}`);
  });

  // Jugador indica que no está disponible → cancela el match + bloquea en bracket
  socket.on('player-unavailable', ({ sessionId, playerName }) => {
    const session = sessions.get(sessionId);
    if (!session) { socket.emit('session-error', { message: 'Sesión no encontrada' }); return; }
    if (session.phase !== 'CHECKIN') { socket.emit('session-error', { message: 'Solo se puede usar en fase CHECK-IN' }); return; }

    const p1 = session.player1?.name || '';
    const p2 = session.player2?.name || '';
    const matchKey = [p1, p2].sort().join('|');
    const used = unavailableHistory.get(matchKey) || new Set();

    if (used.has(playerName)) {
      socket.emit('session-error', { message: 'Ya usaste esta opción para este match' });
      return;
    }

    // Registrar uso
    used.add(playerName);
    unavailableHistory.set(matchKey, used);

    // Marcar sesión como postponed
    session.phase = 'POSTPONED';
    session.postponedBy = playerName;
    session.unavailableUsedBy = [...used];
    sessions.set(sessionId, session);

    io.to(sessionId).emit('match-cancelled', { sessionId, postponedBy: playerName });
    io.to(sessionId).emit('session-updated', { session });
    console.log(`⏸️ ${playerName} no disponible en ${sessionId} (${p1} vs ${p2}) → match pospuesto`);
  });
  socket.on('enable-single-device', ({ sessionId }) => {
    const session = sessions.get(sessionId);
    if (!session) { socket.emit('session-error', { message: 'Sesión no encontrada' }); return; }
    session.singleDeviceMode = true;
    // Auto check-in de ambos jugadores si estamos en CHECKIN
    if (session.phase === 'CHECKIN') {
      if (!session.checkIns) session.checkIns = [];
      const p1 = session.player1?.name;
      const p2 = session.player2?.name;
      if (p1 && !session.checkIns.includes(p1)) session.checkIns.push(p1);
      if (p2 && !session.checkIns.includes(p2)) session.checkIns.push(p2);
      if (session.checkIns.length >= 2) {
        session.phase = 'RPS';
        sessions.set(sessionId, session);
        io.to(sessionId).emit('session-updated', { session });
        io.to(sessionId).emit('both-checked-in', { session });
        console.log(`📱 Modo 1 dispositivo + auto check-in → RPS en sesión ${sessionId}`);
        return;
      }
    }
    sessions.set(sessionId, session);
    io.to(sessionId).emit('session-updated', { session });
    console.log(`📱 Modo 1 dispositivo activado en sesión ${sessionId}`);
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
      // En modo 1 dispositivo: no hay otro jugador que confirme → aplicar directo
      if (session.singleDeviceMode) {
        // (handled below in shared logic)
      }
      // Si el proposedBy no es un jugador identificado ('player1'/'player2')
      // es un admin o dispositivo sin identidad → aplicar directo sin confirmación bidireccional
      const isIdentifiedPlayer = proposedBy === 'player1' || proposedBy === 'player2';
      if (!isIdentifiedPlayer || session.singleDeviceMode) {
        session.rpsProposal = null;
        session.rpsWinner = winner;
        session.phase = 'CHARACTER_SELECT';
        session.currentTurn = session.currentGame === 1 ? winner : session.lastGameWinner || winner;
        const availableStages = getStagesForTournament(sessionId, session.currentGame);
        session.availableStages = [...availableStages];
        if (session.currentGame === 1) {
          session.totalBansNeeded = 3;
          session.bansRemaining = 1;
        } else {
          if (session.lastGameWinner) {
            const winnerStages = session[session.lastGameWinner].wonStages;
            session.availableStages = session.availableStages.filter(s => !winnerStages.includes(s));
          }
          session.currentTurn = session.lastGameWinner;
          session.totalBansNeeded = 3;
          session.bansRemaining = 3;
        }
        session.bannedStages = [];
        sessions.set(sessionId, session);
        io.to(sessionId).emit('session-updated', { session });
        console.log(`✅ RPS single-device: ${winner} ganó en ${sessionId} (sin confirmación)`);
        return;
      }

      // Sistema de confirmación bidireccional (modo normal)
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
        // Ambos han seleccionado, cambiar a STAGE_BAN (delay solo en stream)
        sessions.set(sessionId, session);
        io.to(sessionId).emit('session-updated', { session });
        
        const phaseDelay = sessionId.toLowerCase().includes('stream') ? 2000 : 0;
        setTimeout(() => {
          const updatedSession = sessions.get(sessionId);
          if (updatedSession && updatedSession.phase === 'CHARACTER_SELECT') {
            // Cambiar a STAGE_BAN
            updatedSession.phase = 'STAGE_BAN';
            
            // Configurar stages disponibles según el torneo
            const stagesForGame = getStagesForTournament(sessionId, updatedSession.currentGame);
            updatedSession.availableStages = [...stagesForGame];

            if (updatedSession.currentGame === 1) {
              // Sistema 1-2: Ganador banea 1, perdedor banea 2, ganador selecciona
              updatedSession.totalBansNeeded = 3;
              updatedSession.bansRemaining = 1; // Ganador RPS banea 1 primero
              updatedSession.currentTurn = updatedSession.rpsWinner;
            } else {
              console.log('🎮 Game 2+ - Stages disponibles:', updatedSession.availableStages.length, updatedSession.availableStages);
              
              // El ganador del game anterior banea 3
              updatedSession.currentTurn = updatedSession.lastGameWinner;
              updatedSession.totalBansNeeded = 3;
              updatedSession.bansRemaining = 3;
            }
            
            updatedSession.bannedStages = [];
            sessions.set(sessionId, updatedSession);
            io.to(sessionId).emit('session-updated', { session: updatedSession });
          }
        }, phaseDelay);
      }
    }
  });

  // Proponer ganador del game (requiere confirmación del otro jugador)
  // Helper: procesar el ganador del game (lógica compartida entre game-winner y singleDeviceMode)
  function applyGameWinner(sessionId, winner) {
    const session = sessions.get(sessionId);
    if (!session || session.phase !== 'PLAYING') return;

    session.winnerProposal = null;
    session[winner].score++;
    session[winner].wonStages.push(session.selectedStage);
    session.lastGameWinner = winner;

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

    const fmt = (session.format || '').toUpperCase();
    const maxScore = fmt === 'BO5' ? 3 : 2;
    const seriesFinished = session[winner].score >= maxScore;

    if (seriesFinished) {
      session.phase = 'FINISHED';
      io.to(sessionId).emit('series-finished', { winner, session });
    } else {
      session.currentGame++;
      session.phase = 'CHARACTER_SELECT';
      session.selectedStage = null;
      session.bannedStages = [];
      session.player1.character = null;
      session.player2.character = null;
      session.currentTurn = winner;
    }

    sessions.set(sessionId, session);
    io.to(sessionId).emit('session-updated', { session });

    console.log(`[start.gg] game-winner → setId=${session.startggSetId || 'NULL'} seriesFinished=${seriesFinished} winnerEntrantId=${winnerEntrantId || 'NULL'} gamesCount=${(session.games || []).length}`);
    if (session.startggSetId && seriesFinished) {
      const gameData = session.games.map(g => ({
        gameNum: g.gameNum,
        winnerId: g.winnerId,
        p1EntrantId: g.p1EntrantId,
        p2EntrantId: g.p2EntrantId,
        p1CharacterId: g.p1CharacterId,
        p2CharacterId: g.p2CharacterId,
        stageId: g.stageId,
      }));
      reportToStartGG(session.startggSetId, winnerEntrantId, gameData)
        .catch(e => console.error('⚠️ Error reportando resultado final a start.gg:', e.message));
    }
  }

  socket.on('propose-game-winner', ({ sessionId, winner, proposedBy }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'PLAYING') {
      // En modo 1 dispositivo: aplicar el resultado directo sin confirmación del rival
      if (session.singleDeviceMode) {
        applyGameWinner(sessionId, winner);
        return;
      }
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
    applyGameWinner(sessionId, winner);
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

  // ── Presencia en tiempo real ───────────────────────────────────────────────
  // El cliente emite este evento nada más conectar (desde home.js via useWebSocket)
  socket.on('register-presence', ({ userId, friendIds }) => {
    if (!userId) return;
    socket._presenceUserId = String(userId);
    socket._presenceFriendIds = Array.isArray(friendIds) ? friendIds.map(String) : [];
    userSockets.set(String(userId), socket);
    console.log(`👤 Presencia registrada: ${userId} (${socket._presenceFriendIds.length} amigos)`);
    // Notificar a amigos que este usuario está online
    broadcastPresence(String(userId), 'online', socket._presenceFriendIds);
  });

  // El cliente puede actualizar la lista de amigos (cuando agrega/elimina uno)
  socket.on('update-friend-list', ({ friendIds }) => {
    if (socket._presenceUserId) {
      socket._presenceFriendIds = Array.isArray(friendIds) ? friendIds.map(String) : [];
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    // Limpiar presencia y notificar offline a amigos
    if (socket._presenceUserId) {
      userSockets.delete(socket._presenceUserId);
      broadcastPresence(socket._presenceUserId, 'offline', socket._presenceFriendIds || []);
    }
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
