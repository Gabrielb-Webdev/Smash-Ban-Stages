// ============================================================
// WEBSOCKET SERVER - v2.5.0
// v2.5.0 - Auto-activación de siguiente match en cola cuando termina uno
// v2.4.0 - Auto-confirmación de resultados (10s por cada set) y sistema de cola de matches
// v2.3.0 - Agregar syncAfkScoreboard, mirror afk-stream→afk-tablet, handlers para afk-tablet
// ============================================================
const { createServer } = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const fs   = require('fs');
const path = require('path');

// ── Sync ScoreboardInfo.json para Santa Fe ───────────────────────────────────
const SANTAFE_SCOREBOARD_PATH = path.join(__dirname, '..', 'public', 'overlays', 'Santa-fe', 'Resources', 'Texts', 'ScoreboardInfo.json');

// Convierte el slug de personaje (banjo-kazooie) al nombre de display (Banjo & Kazooie)
const SLUG_TO_DISPLAY = {
  'banjo-kazooie':'Banjo & Kazooie','bayonetta':'Bayonetta','bowser':'Bowser',
  'bowser-jr':'Bowser Jr','byleth':'Byleth','captain-falcon':'Captain Falcon',
  'chrom':'Chrom','cloud':'Cloud','corrin':'Corrin','daisy':'Daisy',
  'dark-pit':'Dark Pit','dark-samus':'Dark Samus','diddy-kong':'Diddy Kong',
  'donkey-kong':'Donkey Kong','dr-mario':'Dr Mario','duck-hunt':'Duck Hunt',
  'falco':'Falco','fox':'Fox','ganondorf':'Ganondorf','greninja':'Greninja',
  'hero':'Hero','ice-climbers':'Ice Climbers','ike':'Ike','incineroar':'Incineroar',
  'inkling':'Inkling','isabelle':'Isabelle','jigglypuff':'Jigglypuff','joker':'Joker',
  'kazuya':'Kazuya','ken':'Ken','king-dedede':'King Dedede','king-k-rool':'King K Rool',
  'kirby':'Kirby','link':'Link','little-mac':'Little Mac','lucario':'Lucario',
  'lucas':'Lucas','lucina':'Lucina','luigi':'Luigi','mario':'Mario','marth':'Marth',
  'mega-man':'Mega Man','meta-knight':'Meta Knight','mewtwo':'Mewtwo',
  'mii-brawler':'Mii Brawler','mii-gunner':'Mii Gunner','mii-swordfighter':'Mii Swordfighter',
  'min-min':'Min Min','mr-game-watch':'Mr Game & Watch','ness':'Ness','olimar':'Olimar',
  'pac-man':'Pac Man','palutena':'Palutena','peach':'Peach','pichu':'Pichu',
  'pikachu':'Pikachu','piranha-plant':'Piranha Plant','pit':'Pit',
  'pokemon-trainer':'Pokemon Trainer','pyra-mythra':'Pyra & Mythra',
  'richter':'Richter','ridley':'Ridley','rob':'Rob','robin':'Robin',
  'rosalina-luma':'Rosalina & Luma','roy':'Roy','ryu':'Ryu','samus':'Samus',
  'sephiroth':'Sephiroth','sheik':'Sheik','shulk':'Shulk','simon':'Simon',
  'snake':'Snake','sonic':'Sonic','sora':'Sora','steve':'Steve','terry':'Terry',
  'toon-link':'Toon Link','villager':'Villager','wario':'Wario',
  'wii-fit-trainer':'Wii Fit Trainer','wolf':'Wolf','yoshi':'Yoshi',
  'young-link':'Young Link','zelda':'Zelda','zero-suit-samus':'Zero Suit Samus',
};

function syncSantaFeScoreboard(session) {
  if (!session) return;
  try {
    let current = {};
    try { current = JSON.parse(fs.readFileSync(SANTAFE_SCOREBOARD_PATH, 'utf-8')); } catch {}
    const char1 = session.player1?.character;
    const char2 = session.player2?.character;
    const p1Score = typeof session.player1?.score === 'number' ? session.player1.score : (current.p1Score || 0);
    const p2Score = typeof session.player2?.score === 'number' ? session.player2.score : (current.p2Score || 0);
    const updated = {
      ...current,
      p1Name:      session.player1?.name  || current.p1Name  || '',
      p2Name:      session.player2?.name  || current.p2Name  || '',
      p1Score,
      p2Score,
      p1NScore:    String(p1Score),
      p2NScore:    String(p2Score),
      p1Character: (char1 && SLUG_TO_DISPLAY[char1]) ? SLUG_TO_DISPLAY[char1] : 'Random',
      p2Character: (char2 && SLUG_TO_DISPLAY[char2]) ? SLUG_TO_DISPLAY[char2] : 'Random',
      p1Skin:      typeof session.player1?.skin === 'number' ? session.player1.skin : 1,
      p2Skin:      typeof session.player2?.skin === 'number' ? session.player2.skin : 1,
      bestOf:        session.format === 'BO5' ? 'Bo5' : 'Bo3',
      round:         session.round         || current.round         || '',
      tournamentName:session.tournamentName || current.tournamentName || '',
      format:        session.format === 'BO5' ? '5' : '3',
      _source:       'stream',
      _updatedAt:    Date.now(),
    };
    fs.writeFileSync(SANTAFE_SCOREBOARD_PATH, JSON.stringify(updated, null, 2), 'utf-8');
    // También persistir en Redis vía Vercel API para que el overlay funcione sin Controls.html
    const vercelUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://smash-ban-stages.vercel.app';
    fetch(`${vercelUrl}/api/scoreboard-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(e => console.error('⚠️ Error sync Redis scoreboard:', e.message));
  } catch (e) {
    console.error('⚠️ Error sincronizando scoreboard Santa Fe:', e.message);
  }
}

// Sync Mendoza scoreboard → Redis vía API de Vercel (para control.html)
function syncMendozaScoreboard(session) {
  if (!session) return;
  try {
    const vercelUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://smash-ban-stages.vercel.app';
    const adminSecret = process.env.ADMIN_SECRET || 'afk-admin-2025';
    fetch(`${vercelUrl}/api/mendoza/scoreboard-state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminSecret}` },
      body: JSON.stringify({
        player1: {
          name:      session.player1?.name      ?? '',
          score:     session.player1?.score     ?? 0,
          character: session.player1?.character ?? 'mario',
          skin:      session.player1?.skin      ?? 1,
        },
        player2: {
          name:      session.player2?.name      ?? '',
          score:     session.player2?.score     ?? 0,
          character: session.player2?.character ?? 'mario',
          skin:      session.player2?.skin      ?? 1,
        },
      }),
    }).catch(e => console.error('⚠️ Error sync Mendoza scoreboard:', e.message));
  } catch (e) {
    console.error('⚠️ Error sincronizando scoreboard Mendoza:', e.message);
  }
}

function syncAfkScoreboard(session) {
  if (!session) return;
  try {
    const vercelUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://smash-ban-stages.vercel.app';
    const adminSecret = process.env.ADMIN_SECRET || 'afk-admin-2025';
    fetch(`${vercelUrl}/api/afk/score-state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminSecret}` },
      body: JSON.stringify({
        p1tag:    session.player1?.name      ?? '',
        p2tag:    session.player2?.name      ?? '',
        p1score:  session.player1?.score     ?? 0,
        p2score:  session.player2?.score     ?? 0,
        p1char:   session.player1?.character ?? '',
        p2char:   session.player2?.character ?? '',
      }),
    }).catch(e => console.error('⚠️ Error sync AFK scoreboard:', e.message));
  } catch (e) {
    console.error('⚠️ Error sincronizando scoreboard AFK:', e.message);
  }
}

function isSantaFe(sessionId) {
  if (!sessionId) return false;
  const s = sessionId.toLowerCase();
  return s === 'santafe-stream' || s.startsWith('santafe-') || s.startsWith('santa-fe-') || s.includes('santafe');
}

// Extrae la comunidad del sessionId (ej: 'santafe-stream' → 'santafe', 'afk-multi-1' → 'afk-multi')
function communityFromSessionId(sessionId, sessionCommunity) {
  if (sessionCommunity) return sessionCommunity;
  if (!sessionId) return '';
  const s = sessionId.toLowerCase();
  const COMMUNITY_PREFIXES = ['santafe', 'santa-fe', 'cordoba', 'mendoza', 'afk-multi', 'afk', 'warui', 'inc', 'test'];
  for (const prefix of COMMUNITY_PREFIXES) {
    if (s.startsWith(prefix + '-') || s === prefix) return prefix;
  }
  return s.split('-')[0] || '';
}

// Reconstruye { community, setupId } de una sesión para ubicar su cola en Redis.
// Prefiere los campos guardados explícitamente en la sesión (vía /session-meta).
// Fallback: parsea el sessionId. OJO: para setups numerados el sessionId lleva un
// sufijo de timestamp único (ej. `warui-1-mabc123`), por eso NO sirve usarlo crudo
// como setupId — hay que quitarle ese último segmento. Para stream/tablet el
// sessionId YA es el id canónico (`warui-stream`, `afk-tablet`) y se usa tal cual.
function resolveSetupKey(session, sessionId) {
  const community = session?.community || communityFromSessionId(sessionId);
  let setupId = session?.setupId;
  if (!setupId && sessionId) {
    if (/-(stream|tablet)$/.test(sessionId)) {
      setupId = sessionId;
    } else {
      setupId = sessionId.replace(/-[^-]+$/, ''); // quita el sufijo de timestamp
    }
  }
  return { community, setupId };
}

// ── COLA DE MATCHES ──────────────────────────────────────────────────────────
// Helpers para manejar cola de matches en Redis (Upstash REST).
// IMPORTANTE: antes esto usaba un cliente `redis` que NUNCA estaba definido, así que
// todas las operaciones lanzaban "redis is not defined", el catch lo tragaba y la cola
// jamás persistía (siempre volvía vacía). Ahora usa Upstash REST igual que las sesiones.
let _upstashWarned = false;
async function upstashCmd(command) {
  // command: array tipo ['RPUSH', key, value]. Devuelve el .result del comando.
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (!_upstashWarned) { console.error('⚠️ Upstash no configurado — la cola vive solo en memoria del server (no sobrevive reinicios)'); _upstashWarned = true; }
    return null;
  }
  try {
    const r = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([command]),
    });
    const data = await r.json();
    return Array.isArray(data) ? data[0]?.result : data?.result;
  } catch (e) {
    console.error('⚠️ Upstash error', command?.[0], e.message);
    return null;
  }
}

// FUENTE DE VERDAD: cola en memoria del server (Map setupKey -> [items]). Funciona SIEMPRE,
// sin importar si Upstash está configurado, y se comparte entre todos los dispositivos (todos
// pegan al mismo server) y sobrevive el F5 del cliente (es estado del server, no del navegador).
// Upstash es solo un espejo best-effort para sobrevivir reinicios del propio server.
const queueMem = new Map();
function _memArr(setupKey) { return queueMem.get(setupKey) || []; }

// Lock de activación por setup: garantiza que se active UN solo match por setup hasta que ese
// setup se libere (cancelar/finalizar). Se setea al auto-activar y se limpia cuando el match
// de ese setup termina. Clave: setupId (ej. 'warui-4'). Evita que se drene toda la cola de golpe.
const setupActivationLock = new Map();
function clearSetupLock(setupId) { if (setupId) setupActivationLock.delete(setupId); }

async function _hydrateFromUpstash(setupKey) {
  // Si memoria no conoce esta key, intentar recuperar de Upstash (ej: tras reinicio del server).
  // Se marca como hidratada SIEMPRE (aunque venga vacía) para no repetir la consulta en cada peek.
  if (queueMem.has(setupKey)) return;
  const key = `queue:setup:${setupKey}`;
  const items = await upstashCmd(['LRANGE', key, '0', '-1']);
  const parsed = Array.isArray(items)
    ? items.map(i => { try { return JSON.parse(i); } catch { return null; } }).filter(Boolean)
    : [];
  queueMem.set(setupKey, parsed);
}

async function redisQueuePush(setupKey, queueItem) {
  const arr = _memArr(setupKey);
  arr.push(queueItem);
  queueMem.set(setupKey, arr);
  // Espejo en Upstash (no bloqueante para la lógica; si falla, la memoria sigue siendo la verdad)
  const key = `queue:setup:${setupKey}`;
  upstashCmd(['RPUSH', key, JSON.stringify(queueItem)]).then(() => upstashCmd(['EXPIRE', key, '604800']));
}

async function redisQueuePop(setupKey) {
  await _hydrateFromUpstash(setupKey);
  const arr = _memArr(setupKey);
  if (!arr.length) return null;
  const item = arr.shift();
  queueMem.set(setupKey, arr);
  upstashCmd(['LPOP', `queue:setup:${setupKey}`]); // mantener espejo en sync
  return item;
}

async function redisQueuePeek(setupKey, limit = 3) {
  await _hydrateFromUpstash(setupKey);
  return _memArr(setupKey).slice(0, limit);
}

async function redisQueueLength(setupKey) {
  await _hydrateFromUpstash(setupKey);
  return _memArr(setupKey).length;
}

function queueRemoveById(setupKey, queueItemId) {
  const arr = _memArr(setupKey).filter(it => it.id !== queueItemId);
  queueMem.set(setupKey, arr);
  // Reconstruir espejo en Upstash
  const key = `queue:setup:${setupKey}`;
  (async () => {
    await upstashCmd(['DEL', key]);
    for (const it of arr) await upstashCmd(['RPUSH', key, JSON.stringify(it)]);
    if (arr.length) await upstashCmd(['EXPIRE', key, '604800']);
  })();
  return arr;
}

// Auto-confirmación de resultados (10 segundos por cada set)
function startAutoConfirmTimer(sessionId, socket, io) {
  const session = sessions.get(sessionId);
  if (!session || !session.resultProposal) return;

  const timeoutId = setTimeout(() => {
    const s = sessions.get(sessionId);
    if (!s || s.phase !== 'FINISHED' || !s.resultProposal) return;

    const winner = s.resultProposal.winner;
    io.to(sessionId).emit('result-auto-confirmed', { winner });
    console.log(`⏱️ Auto-confirmó resultado en ${sessionId}: ${winner} gana`);

    // Aplicar resultado como si lo hubiera confirmado manualmente
    applyGameWinner(sessionId, winner, socket, io, true);
  }, 10000);

  session.resultProposal.autoConfirmTimeoutId = timeoutId;
}

// Guardar historial de torneo en Vercel (Redis) cuando una serie termina
async function saveTournamentHistory(session, winner) {
  try {
    const loser = winner === 'player1' ? 'player2' : 'player1';
    const winnerData = session[winner];
    const loserData  = session[loser];
    const community  = communityFromSessionId(session.sessionId, session.community);
    const vercelUrl  = process.env.NEXT_PUBLIC_APP_URL || 'https://smash-ban-stages.vercel.app';
    await fetch(`${vercelUrl}/api/tournament/save-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        winnerName:    winnerData.name,
        loserName:     loserData.name,
        winnerScore:   winnerData.score,
        loserScore:    loserData.score,
        winnerCharId:  winnerData.character || '',
        loserCharId:   loserData.character  || '',
        community,
        format:        session.format || 'BO3',
        round:         session.round  || '',
        tournamentName:session.tournamentName || '',
        games:         session.games  || [],
        sessionId:     session.sessionId,
      }),
    });
  } catch (e) {
    console.error('⚠️ Error guardando historial de torneo:', e.message);
  }
}

// ── Persistencia de sesiones en Redis (Upstash REST) ─────────────────────────
const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const SESSION_TTL        = 4 * 60 * 60;       // 4 horas en segundos (sesiones de match normales)
const SESSION_TTL_STREAM = 30 * 24 * 60 * 60; // 30 días (sesiones de stream persistentes)

async function redisSessionSet(sessionId, session) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  const ttl = sessionId.endsWith('-stream') ? SESSION_TTL_STREAM : SESSION_TTL;
  try {
    await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', `tournament:session:${sessionId}`, JSON.stringify(session), 'EX', String(ttl)]]),
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

// ── Estado del panel admin por comunidad (memoria + Redis) ────────────────────
// Clave Redis: panel:state:{community}, TTL 24h
const panelStates = new Map();
const PANEL_STATE_TTL = 24 * 60 * 60;

// ── Estado del panel de control Mendoza (sync RT entre múltiples usuarios) ────
let mendozaControlState = null;

async function redisPanelStateSet(community, state) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['SET', `panel:state:${community}`, JSON.stringify(state), 'EX', String(PANEL_STATE_TTL)]]),
    });
  } catch {}
}

async function redisPanelStateGet(community) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(`panel:state:${community}`)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    const data = await r.json();
    if (!data.result) return null;
    return JSON.parse(data.result);
  } catch { return null; }
}

// Merge/borra un único setup en el assignedSets persistido del panel (memoria + Redis) y
// reenvía el estado completo a TODOS los paneles de la comunidad. Lo usa la auto-activación
// (server-driven), cuyo panel:assign-update el cliente no re-emite → sin esto no se persistiría.
function persistAssignedSetToPanelState(community, setupId, assignedSet) {
  if (!community || !setupId) return;
  const cur = panelStates.get(community) || {};
  const assignedSets = { ...(cur.assignedSets || {}) };
  if (assignedSet) assignedSets[setupId] = assignedSet;
  else delete assignedSets[setupId];
  const next = { ...cur, assignedSets };
  panelStates.set(community, next);
  redisPanelStateSet(community, next);
  // Reenviar a todos los paneles para que el estado quede consistente (incluye el que ya lo tiene)
  io.to(`panel:${community}`).emit('panel:assign-update', { assignedSets: { [setupId]: assignedSet || undefined }, partial: true });
}

// ── Historial de picks por jugador (persistido en Redis) ──────────────

async function redisHistorySet(playerKey, chars) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(`${REDIS_URL}/set/${encodeURIComponent(`player:history:${playerKey}`)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(JSON.stringify(chars)),
    });
  } catch (e) {
    console.error('⚠️ Redis history save error:', e.message);
  }
}

async function redisHistoryGet(playerKey) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(`player:history:${playerKey}`)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    });
    const data = await r.json();
    if (!data.result) return null;
    return JSON.parse(data.result);
  } catch (e) {
    console.error('⚠️ Redis history fetch error:', e.message);
    return null;
  }
}

function recordCharacterPick(playerName, characterId) {
  if (!playerName || !characterId) return;
  const key = playerName.trim().toLowerCase();
  const existing = playerHistory.get(key) || [];
  const filtered = existing.filter(c => c !== characterId);
  const updated = [characterId, ...filtered].slice(0, 20);
  playerHistory.set(key, updated);
  redisHistorySet(key, updated);
}

async function getPlayerHistoryFromRedis(playerKey) {
  const cached = playerHistory.get(playerKey);
  if (cached) return cached;
  const fromRedis = await redisHistoryGet(playerKey);
  if (fromRedis) {
    playerHistory.set(playerKey, fromRedis);
    return fromRedis;
  }
  return [];
}

const playerHistory = new Map();
console.log('📚 Historial de jugadores: usando Redis (persistente)');

// Constantes para stages - AFK (Buenos Aires)
const AFK_STAGES_GAME1      = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'battlefield', 'smashville'];
const AFK_STAGES_GAME2_PLUS = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'hollow-bastion', 'battlefield', 'final-destination', 'kalos', 'smashville'];

// Constantes para stages - Mendoza (Team Anexo)
const MENDOZA_STAGES_GAME1 = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'smashville', 'battlefield'];
const MENDOZA_STAGES_GAME2_PLUS = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'hollow-bastion', 'battlefield', 'final-destination', 'kalos', 'smashville'];

// Constantes para stages - Córdoba (por defecto)
const CORDOBA_STAGES_GAME1 = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'hollow-bastion', 'battlefield'];
const CORDOBA_STAGES_GAME2_PLUS = ['small-battlefield', 'town-and-city', 'pokemon-stadium-2', 'hollow-bastion', 'battlefield', 'final-destination', 'kalos', 'smashville'];

// Constantes para stages - INC
const INC_STAGES_GAME1 = ['battlefield', 'small-battlefield', 'town-and-city', 'smashville', 'pokemon-stadium-2'];
const INC_STAGES_GAME2_PLUS = ['battlefield', 'small-battlefield', 'town-and-city', 'smashville', 'pokemon-stadium-2', 'final-destination', 'hollow-bastion', 'kalos'];

// Warui stages
const WARUI_STAGES_GAME1      = ['town-and-city', 'smashville', 'battlefield', 'small-battlefield', 'pokemon-stadium-2'];
const WARUI_STAGES_GAME2_PLUS = ['town-and-city', 'smashville', 'battlefield', 'small-battlefield', 'pokemon-stadium-2', 'hollow-bastion', 'final-destination', 'kalos'];

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

  // Detectar INC
  if (s === 'inc' || s.startsWith('inc-') || s.includes('-inc') || s.includes('/inc')) {
    console.log('✅ INC detected');
    return 'inc';
  }

  // Detectar Warui
  if (s === 'warui' || s.startsWith('warui-') || s.includes('/warui')) {
    console.log('✅ Warui detected');
    return 'warui';
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

  if (tournament === 'inc') {
    const stages = currentGame === 1 ? INC_STAGES_GAME1 : INC_STAGES_GAME2_PLUS;
    console.log('✅ INC ruleset selected:', stages);
    return stages;
  }

  if (tournament === 'warui') {
    const stages = currentGame === 1 ? WARUI_STAGES_GAME1 : WARUI_STAGES_GAME2_PLUS;
    console.log('✅ Warui ruleset selected:', stages);
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

// Notifica (push web) a los dos jugadores que les toca jugar, con su URL de tablet específica.
// Replica lo que hace callMatch() en el panel, para que la AUTO-activación de cola también avise.
async function notifyPlayersMatchReady(setupId, community, p1Name, p2Name, matchToken) {
  try {
    // Los setups tablet no notifican (jugadores presentes físicamente)
    if (setupId.endsWith('-tablet')) return;
    const vercelUrl = process.env.NEXTJS_URL || 'https://smash-ban-stages.vercel.app';
    const suffix = setupId.split('-').pop();
    const setupLabel = suffix === 'stream' ? 'Stream' : `Setup ${suffix}`;
    const tokenParam = matchToken ? `&mt=${matchToken}` : '';
    const tabletBase = `${vercelUrl}/tablet/${setupId}`;
    const title = `📢 ¡Te toca match!`;
    const body  = `${p1Name || 'Jugador 1'} vs ${p2Name || 'Jugador 2'} — ${setupLabel} — ¡Tienen 5 min para hacer check-in!`;
    const send = (name, p) => fetch(`${vercelUrl}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
      body: JSON.stringify({ title, body, targetUserNames: [name], data: { url: `${tabletBase}?p=${p}${tokenParam}` } }),
    }).catch(e => console.warn('⚠️ notif error:', e.message));
    const proms = [];
    if (p1Name) proms.push(send(p1Name, 'player1'));
    if (p2Name) proms.push(send(p2Name, 'player2'));
    await Promise.allSettled(proms);
    console.log(`📢 Notificado a jugadores de ${setupId}: ${p1Name} / ${p2Name}`);
  } catch (e) {
    console.warn('⚠️ Error notificando jugadores (auto-activación):', e.message);
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
        const { sessionId, setupId, community: communityFromBody, startggSetId, startggEntrant1Id, startggEntrant2Id, player1, player2, format, round, tournamentName, forceReset, player1Country, player1FlagCode, player1Seed, player2Country, player2FlagCode, player2Seed } = JSON.parse(body);
        if (!sessionId) { res.writeHead(400); res.end(JSON.stringify({ error: 'sessionId requerido' })); return; }

        // Guardar en pending (por si la sesión WebSocket todavía no se creó)
        pendingStartggData.set(sessionId, { startggSetId, startggEntrant1Id, startggEntrant2Id });

        // Crear la sesión completa en el Map para que join-session funcione inmediatamente
        let session = sessions.get(sessionId);
        const newMatchToken = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        if (!session && (player1 || player2)) {
          session = {
            sessionId,
            setupId: setupId || null,
            community: communityFromBody || null,
            createdAt: Date.now(),
            matchToken: newMatchToken,
            player1: { name: player1 || 'Jugador 1', score: 0, character: null, wonStages: [], country: player1Country || null, flagCode: player1FlagCode || null, seed: player1Seed || null },
            player2: { name: player2 || 'Jugador 2', score: 0, character: null, wonStages: [], country: player2Country || null, flagCode: player2FlagCode || null, seed: player2Seed || null },
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
            round: round || '',
            tournamentName: tournamentName || '',
          };
          sessions.set(sessionId, session);
          console.log('📝 Sesión pre-creada (CHECKIN) desde /session-meta:', sessionId);
          if (isSantaFe(sessionId)) syncSantaFeScoreboard(session);
          if (sessionId === 'mendoza-tablet') {
            io.to('mendoza-stream').emit('session-updated', { session });
            syncMendozaScoreboard(session);
          }
          if (sessionId === 'afk-tablet') {
            io.to('afk-stream').emit('session-updated', { session });
            syncAfkScoreboard(session);
          }
        } else if (session) {
          // Si la sesión ya tiene progreso y no viene forceReset, solo actualizar metadata
          const hasProgress = session.phase !== 'CHECKIN' || (session.player1?.score || 0) > 0 || (session.player2?.score || 0) > 0 || session.currentGame > 1;
          if (hasProgress && !forceReset) {
            // Solo actualizar datos de start.gg sin tocar el estado del set
            if (startggSetId) session.startggSetId = startggSetId;
            if (startggEntrant1Id) session.startggEntrant1Id = startggEntrant1Id;
            if (startggEntrant2Id) session.startggEntrant2Id = startggEntrant2Id;
            if (round) session.round = round;
            if (tournamentName) session.tournamentName = tournamentName;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, skipped: true }));
            return;
          }
          // Sesión ya existe (ej: Stream con sessionId fijo) → resetear completa
          const freshSession = {
            sessionId,
            setupId: setupId || session.setupId || null,
            community: communityFromBody || session.community || null,
            createdAt: Date.now(),
            matchToken: newMatchToken,
            player1: { name: player1 || 'Jugador 1', score: 0, character: null, wonStages: [], country: player1Country || null, flagCode: player1FlagCode || null, seed: player1Seed || null },
            player2: { name: player2 || 'Jugador 2', score: 0, character: null, wonStages: [], country: player2Country || null, flagCode: player2FlagCode || null, seed: player2Seed || null },
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
            round: round || '',
            tournamentName: tournamentName || '',
          };
          sessions.set(sessionId, freshSession);
          // Notificar a clientes conectados del reset
          io.to(sessionId).emit('session-updated', { session: freshSession });
          console.log('🔄 Sesión reseteada (CHECKIN) desde /session-meta:', sessionId);
          if (isSantaFe(sessionId)) syncSantaFeScoreboard(freshSession);
          if (sessionId === 'mendoza-tablet') {
            io.to('mendoza-stream').emit('session-updated', { session: freshSession });
            syncMendozaScoreboard(freshSession);
          }
          if (sessionId === 'afk-tablet') {
            io.to('afk-stream').emit('session-updated', { session: freshSession });
            syncAfkScoreboard(freshSession);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, matchToken: newMatchToken }));
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
    let session = sessions.get(sessionId);
    if (!session) {
      session = await redisSessionGet(sessionId);
      if (session) sessions._map.set(sessionId, session);
    }
    if (session) {
      session.phase = 'CANCELLED';
      sessions.set(sessionId, session);
      // Notificar a los jugadores conectados que el match fue cancelado
      io.to(sessionId).emit('match-cancelled', { sessionId });
      io.to(sessionId).emit('session-updated', { session });
      console.log(`❌ Sesión cancelada por admin: ${sessionId}`);

      // Liberar el setup: limpiar el lock de activación para que el panel pueda auto-activar
      // el siguiente match de la cola (vía activate-queued-match — único camino de promoción).
      const { setupId: freedSetupId } = resolveSetupKey(session, sessionId);
      clearSetupLock(freedSetupId);
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
        skin1: typeof session.player1?.skin === 'number' ? session.player1.skin : null,
        skin2: typeof session.player2?.skin === 'number' ? session.player2.skin : null,
        country1: session.player1?.country || null,
        flagCode1: session.player1?.flagCode || null,
        seed1: session.player1?.seed || null,
        country2: session.player2?.country || null,
        flagCode2: session.player2?.flagCode || null,
        seed2: session.player2?.seed || null,
        selectedStage: session.selectedStage || null,
        currentGame: session.currentGame || 1,
        format: session.format || 'BO3',
        round: session.round || '',
        tournamentName: session.tournamentName || '',
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
        startggReported: session.startggReported || false,
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
      const TWO_HOURS = 2 * 60 * 60 * 1000;
      sessions.forEach((session, sessionId) => {
        if (session.phase === 'FINISHED' || session.phase === 'CANCELLED' || session.phase === 'POSTPONED') return;
        // Filtrar sesiones stale en CHECKIN (sin createdAt o creadas hace más de 2 horas)
        if (session.phase === 'CHECKIN') {
          if (!session.createdAt || (Date.now() - session.createdAt) > TWO_HOURS) return;
        }
        const p1 = (session.player1?.name || '').toLowerCase().trim();
        const p2 = (session.player2?.name || '').toLowerCase().trim();
        if (p1.includes(name) || p2.includes(name) || (name.length > 2 && (p1.startsWith(name) || p2.startsWith(name)))) {
          found.push({ sessionId, player1: session.player1?.name, player2: session.player2?.name, phase: session.phase, checkIns: session.checkIns || [], createdAt: session.createdAt || 0 });
        }
      });
      // Ordenar por createdAt descendente — la sesión más reciente va primero
      // (sort lexicográfico previo era incorrecto: 'stream' > '1' y tapaba setups numerados)
      found.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(found));
    } catch (e) {
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
  } else if (req.url === '/emit-event' && req.method === 'POST') {
    // Endpoint interno para que las API routes de Vercel envíen eventos WS a usuarios conectados
    const expectedSecret = process.env.WS_INTERNAL_SECRET || process.env.ADMIN_SECRET || 'afk-admin-2025';
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
  } else if (req.url === '/overlay2-state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(overlay2State || {}));
    return;
  } else if (req.url === '/overlay2-state' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        overlay2State = data;
        overlay2StateTs = Date.now();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
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

// Estado en memoria del overlay2 (control → overlay cross-browser)
let overlay2State = null;
let overlay2StateTs = 0;

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
      session.matchToken = Date.now().toString(36); // token único por match
      if (data.tournamentName !== undefined) session.tournamentName = data.tournamentName;
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
      session.rpsGame = null;
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
        createdAt: Date.now(),
        matchToken: Date.now().toString(36), // token único por match — cambia con cada nueva sesión
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
        rpsGame: null,
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
        tournamentName: data.tournamentName || '',
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
    // Para sesiones de stream (*-stream): auto-crear sesión idle si no existe,
    // así el overlay de OBS siempre puede suscribirse y recibirá updates cuando
    // el admin llame un match (en lugar de reintentar indefinidamente).
    if (!session && sessionId.endsWith('-stream')) {
      const communityPrefix = sessionId.replace(/-stream$/, '');
      session = {
        sessionId,
        community: communityPrefix,
        createdAt: Date.now(),
        phase: 'IDLE',
        player1: { name: '', score: 0, character: null, wonStages: [] },
        player2: { name: '', score: 0, character: null, wonStages: [] },
        format: 'BO3',
        currentGame: 1,
        rpsWinner: null,
        bannedStages: [],
        selectedStage: null,
        banHistory: [],
        games: [],
      };
      sessions.set(sessionId, session); // persiste en Redis con TTL de 30 días
      console.log('✨ Sesión stream auto-creada (idle):', sessionId);
    }
    if (session) {
      socket.join(sessionId);
      // MIRROR: mendoza-stream también se suscribe al room mendoza-tablet
      // para recibir todos los eventos del tablet en tiempo real automáticamente
      if (sessionId === 'mendoza-stream') {
        socket.join('mendoza-tablet');
        const tabletSession = sessions.get('mendoza-tablet');
        if (tabletSession && tabletSession.phase && tabletSession.phase !== 'IDLE') {
          socket.emit('session-joined', { session: tabletSession });
          console.log('Cliente unido a mendoza-stream → recibiendo estado de mendoza-tablet');
          return;
        }
      }
      // MIRROR: afk-stream también se suscribe al room afk-tablet
      if (sessionId === 'afk-stream') {
        socket.join('afk-tablet');
        const tabletSession = sessions.get('afk-tablet');
        if (tabletSession && tabletSession.phase && tabletSession.phase !== 'IDLE') {
          socket.emit('session-joined', { session: tabletSession });
          console.log('Cliente unido a afk-stream → recibiendo estado de afk-tablet');
          return;
        }
      }
      socket.emit('session-joined', { session });
      console.log('Cliente unido a sesión:', sessionId);
    } else {
      socket.emit('session-error', { message: 'Sesión no encontrada' });
    }
  });

  // Check-in de jugador para match de torneo
  socket.on('player-checkin', ({ sessionId, playerName, matchToken }) => {
    const session = sessions.get(sessionId);
    if (!session) { socket.emit('session-error', { message: 'Sesión no encontrada' }); return; }

    // --- Validar matchToken: si la sesión tiene token y el cliente envía uno, deben coincidir ---
    // Esto impide que jugadores de un match anterior hagan check-in en uno nuevo (mismo setupId de stream)
    if (session.matchToken && matchToken && session.matchToken !== matchToken) {
      console.log(`❌ Check-in rechazado por token expirado: "${playerName}" en ${sessionId} (token=${matchToken}, esperado=${session.matchToken})`);
      socket.emit('session-error', { message: 'Este match ya terminó. Cerrá y abrí el nuevo link.' });
      return;
    }

    // --- Validar que el nombre corresponda a uno de los jugadores asignados ---
    const p1Name = session.player1?.name || '';
    const p2Name = session.player2?.name || '';
    const isP1 = playerName === p1Name;
    const isP2 = playerName === p2Name;
    if (!isP1 && !isP2) {
      // Comparación flexible: extraer tag (sin sponsor) para manejar "SPONSOR | Tag"
      const extractTag = (n) => { const s = String(n || '').trim(); const i = s.indexOf(' | '); return (i !== -1 ? s.slice(i + 3) : s).toLowerCase(); };
      const inTag = extractTag(playerName);
      const p1Tag = extractTag(p1Name);
      const p2Tag = extractTag(p2Name);
      const flexMatch = (inTag && p1Tag && (inTag === p1Tag || inTag.includes(p1Tag) || p1Tag.includes(inTag)))
                     || (inTag && p2Tag && (inTag === p2Tag || inTag.includes(p2Tag) || p2Tag.includes(inTag)));
      if (!flexMatch) {
        console.log(`❌ Check-in rechazado: "${playerName}" no es jugador de sesión ${sessionId} (${p1Name} vs ${p2Name})`);
        socket.emit('session-error', { message: `Check-in rechazado: "${playerName}" no es jugador de este match` });
        return;
      }
    }

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

  // RPS real — cada jugador elige piedra, papel o tijeras; el servidor determina el ganador
  socket.on('rps-pick', ({ sessionId, pick, pickedBy, matchToken }) => {
    const session = sessions.get(sessionId);
    if (!session || session.phase !== 'RPS') return;
    if (matchToken && session.matchToken && matchToken !== session.matchToken) return;

    const validPicks = ['rock', 'paper', 'scissors'];
    if (!validPicks.includes(pick)) return;

    // Solo jugadores identificados pueden elegir
    if (pickedBy !== 'player1' && pickedBy !== 'player2') return;

    // Inicializar rpsGame si es necesario
    if (!session.rpsGame) {
      session.rpsGame = { picks: { player1: null, player2: null }, revealed: false, winner: null, round: 1 };
    }

    // Si ya está revelado (empate reseteando o partida terminada), ignorar
    if (session.rpsGame.revealed) return;

    // Si este jugador ya eligió, ignorar (no se puede cambiar)
    if (session.rpsGame.picks[pickedBy]) return;

    session.rpsGame.picks[pickedBy] = pick;
    sessions.set(sessionId, session);
    io.to(sessionId).emit('session-updated', { session });
    console.log(`✊ RPS: ${pickedBy} eligió ${pick} en ${sessionId} (ronda ${session.rpsGame.round})`);

    // Si no están los dos, esperar
    const { player1: p1pick, player2: p2pick } = session.rpsGame.picks;
    if (!p1pick || !p2pick) return;

    // Ambos eligieron — determinar ganador
    let winner = null;
    if (p1pick === p2pick) {
      winner = null; // empate
    } else if (
      (p1pick === 'rock'     && p2pick === 'scissors') ||
      (p1pick === 'paper'    && p2pick === 'rock')     ||
      (p1pick === 'scissors' && p2pick === 'paper')
    ) {
      winner = 'player1';
    } else {
      winner = 'player2';
    }

    session.rpsGame.revealed = true;
    session.rpsGame.winner = winner;
    sessions.set(sessionId, session);
    io.to(sessionId).emit('session-updated', { session });
    console.log(`✊ RPS revelado: ${p1pick} vs ${p2pick} → ${winner || 'EMPATE'} en ${sessionId}`);

    if (winner === null) {
      // Empate: resetear después de 3s
      setTimeout(() => {
        const s = sessions.get(sessionId);
        if (!s || s.phase !== 'RPS') return;
        s.rpsGame = { picks: { player1: null, player2: null }, revealed: false, winner: null, round: (s.rpsGame?.round || 1) + 1 };
        sessions.set(sessionId, s);
        io.to(sessionId).emit('session-updated', { session: s });
        console.log(`☏️ RPS empate — reiniciando ronda ${s.rpsGame.round} en ${sessionId}`);
      }, 3000);
    } else {
      // Ganador: avanzar de fase después de 2.5s
      setTimeout(() => {
        const s = sessions.get(sessionId);
        if (!s || s.phase !== 'RPS') return;

        s.rpsWinner = winner;
        s.rpsProposal = null;
        s.phase = 'CHARACTER_SELECT';
        s.currentTurn = s.currentGame === 1 ? winner : s.lastGameWinner || winner;

        const availableStages = getStagesForTournament(sessionId, s.currentGame);
        s.availableStages = [...availableStages];

        if (s.currentGame === 1) {
          s.totalBansNeeded = 3;
          s.bansRemaining = 1;
        } else {
          if (s.lastGameWinner) {
            const winnerStages = s[s.lastGameWinner].wonStages;
            s.availableStages = s.availableStages.filter(st => !winnerStages.includes(st));
          }
          s.currentTurn = s.lastGameWinner;
          s.totalBansNeeded = 3;
          s.bansRemaining = 3;
        }
        s.bannedStages = [];
        sessions.set(sessionId, s);
        io.to(sessionId).emit('session-updated', { session: s });
        console.log(`\uD83D\uDE80 RPS resuelto → CHARACTER_SELECT en ${sessionId} (ganador: ${winner})`);
      }, 2500);
    }
  });

  // Banear un stage
  socket.on('ban-stage', ({ sessionId, stage, player, matchToken }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'STAGE_BAN') {
      if (session.currentTurn !== player) return;
      if (matchToken && session.matchToken && matchToken !== session.matchToken) return; // token inválido: acción rechazada
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
  socket.on('select-stage', ({ sessionId, stage, player, matchToken }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'STAGE_SELECT') {
      if (session.currentTurn !== player) return;
      if (matchToken && session.matchToken && matchToken !== session.matchToken) return;
      session.selectedStage = stage;
      // Ir directo a PLAYING ya que los personajes ya están seleccionados
      session.phase = 'PLAYING';
      session.currentTurn = null;
      
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Proponer repetir stage anterior (el rival debe confirmar)
  socket.on('propose-repeat-stage', ({ sessionId }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'STAGE_BAN' && session.previousStageData?.selectedStage) {
      // En modo 1 dispositivo: aplicar directo sin confirmación
      if (session.singleDeviceMode) {
        session.bannedStages = Array.isArray(session.previousStageData.bannedStages) ? [...session.previousStageData.bannedStages] : [];
        session.selectedStage = session.previousStageData.selectedStage;
        session.phase = 'PLAYING';
        session.currentTurn = null;
        sessions.set(sessionId, session);
        io.to(sessionId).emit('session-updated', { session });
        return;
      }
      session.repeatStageProposal = { proposedBy: session.currentTurn };
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Confirmar repetir stage (el rival acepta)
  socket.on('confirm-repeat-stage', ({ sessionId }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'STAGE_BAN' && session.repeatStageProposal && session.previousStageData?.selectedStage) {
      session.bannedStages = Array.isArray(session.previousStageData.bannedStages) ? [...session.previousStageData.bannedStages] : [];
      session.selectedStage = session.previousStageData.selectedStage;
      session.phase = 'PLAYING';
      session.currentTurn = null;
      session.repeatStageProposal = null;
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Rechazar repetir stage
  socket.on('reject-repeat-stage', ({ sessionId }) => {
    const session = sessions.get(sessionId);
    if (session && session.repeatStageProposal) {
      session.repeatStageProposal = null;
      session.repeatStageRejected = true;
      sessions.set(sessionId, session);
      io.to(sessionId).emit('session-updated', { session });
    }
  });

  // Repetir stage anterior (aplica los mismos baneos y stage directamente) - legacy/singleDevice
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
  socket.on('get-player-history', async ({ playerName }) => {
    const key = (playerName || '').trim().toLowerCase();
    const chars = await getPlayerHistoryFromRedis(key);
    socket.emit('player-history', { playerName, characters: chars });
  });

  // Seleccionar personaje
  socket.on('select-character', ({ sessionId, character, player, skin, matchToken }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'CHARACTER_SELECT') {
      if (session.currentTurn !== player) return;
      if (matchToken && session.matchToken && matchToken !== session.matchToken) return;
      // Guardar en historial por nombre de jugador
      recordCharacterPick(session[player].name, character);
      session[player].character = character;
      if (skin) session[player].skin = skin;
      
      // Verificar si ambos jugadores han seleccionado
      const otherPlayer = player === 'player1' ? 'player2' : 'player1';
      
      if (!session[otherPlayer].character) {
        // El otro jugador debe seleccionar
        session.currentTurn = otherPlayer;
        sessions.set(sessionId, session);
        io.to(sessionId).emit('session-updated', { session });
        if (isSantaFe(sessionId)) syncSantaFeScoreboard(session);
        if (sessionId === 'mendoza-tablet') syncMendozaScoreboard(session);
        if (sessionId === 'afk-tablet') syncAfkScoreboard(session);
      } else {
        // Ambos han seleccionado, cambiar a STAGE_BAN (delay para animación VS)
        sessions.set(sessionId, session);
        io.to(sessionId).emit('session-updated', { session });
        if (isSantaFe(sessionId)) syncSantaFeScoreboard(session);
        if (sessionId === 'mendoza-tablet') syncMendozaScoreboard(session);
        if (sessionId === 'afk-tablet') syncAfkScoreboard(session);
        
        const phaseDelay = 2500;
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
      // Guardar en historial de torneo (Redis vía Vercel API)
      saveTournamentHistory(session, winner);
      // Cuando termina un tablet de mendoza: limpiar mendoza-stream a IDLE
      if (sessionId === 'mendoza-tablet') {
        const streamSess = sessions.get('mendoza-tablet'); // usar mismo objeto ya actualizado
        const idleStream = {
          sessionId: 'mendoza-stream', phase: 'IDLE',
          player1: { name: '', score: 0, character: null, wonStages: [] },
          player2: { name: '', score: 0, character: null, wonStages: [] },
        };
        setTimeout(() => io.to('mendoza-stream').emit('session-updated', { session: idleStream }), 8000);
      }
      // Cuando termina un tablet de afk: limpiar afk-stream a IDLE
      if (sessionId === 'afk-tablet') {
        const idleStream = {
          sessionId: 'afk-stream', phase: 'IDLE',
          player1: { name: '', score: 0, character: null, wonStages: [] },
          player2: { name: '', score: 0, character: null, wonStages: [] },
        };
        sessions.set('afk-stream', idleStream);
        io.to('afk-stream').emit('session-updated', { session: idleStream });
      }

      // Liberar el setup: limpiar el lock para que el panel pueda auto-activar el siguiente
      // match de la cola (vía activate-queued-match — único camino de promoción).
      const { setupId: freedSetupId } = resolveSetupKey(session, sessionId);
      clearSetupLock(freedSetupId);
    } else {
      // Guardar datos del stage actual para ofrecer repetir en el próximo game
      session.previousStageData = {
        bannedStages: [...(session.bannedStages || [])],
        selectedStage: session.selectedStage,
      };
      session.repeatStageProposal = null;
      session.repeatStageRejected = false;
      // Guardar personajes del game anterior para ofrecer repetir en el próximo
      session.lastCharacters = {
        player1: session.player1.character,
        player2: session.player2.character,
      };
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
    if (isSantaFe(sessionId)) syncSantaFeScoreboard(session);
    if (sessionId === 'mendoza-tablet') syncMendozaScoreboard(session);
    if (sessionId === 'afk-tablet') syncAfkScoreboard(session);

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
        .then(() => {
          const s = sessions.get(sessionId);
          if (s) { s.startggReported = true; sessions.set(sessionId, s); }
        })
        .catch(e => console.error('⚠️ Error reportando resultado final a start.gg:', e.message));
    }
  }

  socket.on('propose-game-winner', ({ sessionId, winner, proposedBy, matchToken }) => {
    const session = sessions.get(sessionId);
    if (session && session.phase === 'PLAYING') {
      if (matchToken && session.matchToken && matchToken !== session.matchToken) return;
      // En modo 1 dispositivo: aplicar el resultado directo sin confirmación del rival
      if (session.singleDeviceMode) {
        applyGameWinner(sessionId, winner);
        return;
      }
      // Ignorar si ya existe una propuesta pendiente (evita race condition)
      if (session.winnerProposal) return;

      session.winnerProposal = { winner, proposedBy: proposedBy || null, autoConfirmTimeoutId: null };

      // Auto-confirmación: si el rival no confirma en 30s, se aplica el resultado propuesto.
      const autoConfirmTimeout = setTimeout(() => {
        const s = sessions.get(sessionId);
        if (!s || s.phase !== 'PLAYING' || !s.winnerProposal) return;
        console.log(`⏱️ Auto-confirmó resultado en ${sessionId} después de 30s: ${winner} gana`);
        applyGameWinner(sessionId, winner);
      }, 30000);

      session.winnerProposal.autoConfirmTimeoutId = autoConfirmTimeout;
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
  socket.on('game-winner', ({ sessionId, winner, matchToken }) => {
    const session = sessions.get(sessionId);
    if (matchToken && session?.matchToken && matchToken !== session.matchToken) return;

    // Limpiar timeout de auto-confirmación si existe
    if (session?.winnerProposal?.autoConfirmTimeoutId) {
      clearTimeout(session.winnerProposal.autoConfirmTimeoutId);
    }

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
      session.rpsGame = null;
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

  // ── COLA DE MATCHES ──────────────────────────────────────────────────────
  // Encolar un nuevo match
  socket.on('queue-match', async ({ setupId, community, player1, player2, format, round, tournamentName, startggSetId, startggEntrant1Id, startggEntrant2Id }) => {
    console.log(`[QUEUE] Servidor recibió queue-match:`, { setupId, community, player1: player1?.name, player2: player2?.name });
    try {
      const queueItem = {
        id: uuidv4(),
        player1,
        player2,
        format: format || 'BO3',
        round: round || '',
        tournamentName: tournamentName || '',
        startggSetId: startggSetId || null,
        startggEntrant1Id: startggEntrant1Id || null,
        startggEntrant2Id: startggEntrant2Id || null,
        createdAt: Date.now(),
        status: 'pending'
      };

      // Guardar en Redis
      await redisQueuePush(`${community}:${setupId}`, queueItem);

      // Obtener lista actualizada de cola
      const queueLength = await redisQueueLength(`${community}:${setupId}`);
      const queue = await redisQueuePeek(`${community}:${setupId}`, 5);

      // Emitir actualización a panel admin
      io.to(`admin-panel`).emit('queue:updated', {
        setupId,
        community,
        queue,
        queueLength,
        message: `✅ Match encolado para ${setupId} (${queueLength} en cola)`
      });

      console.log(`[QUEUE] Match encolado en ${setupId}: ${player1.name} vs ${player2.name} (${queueLength} total)`);
    } catch (e) {
      console.error('⚠️ Error encolando match:', e.message);
    }
  });

  // Desencolar un match
  socket.on('dequeue-match', async ({ setupId, community, queueItemId }) => {
    try {
      await _hydrateFromUpstash(`${community}:${setupId}`);
      queueRemoveById(`${community}:${setupId}`, queueItemId);

      const queueLength = await redisQueueLength(`${community}:${setupId}`);
      const updatedQueue = await redisQueuePeek(`${community}:${setupId}`, 5);

      // Emitir actualización
      io.to(`admin-panel`).emit('queue:updated', {
        setupId,
        community,
        queue: updatedQueue,
        queueLength,
        message: `🗑️ Match removido de cola de ${setupId} (${queueLength} restantes)`
      });

      console.log(`[QUEUE] Match removido de cola en ${setupId} (${queueLength} total)`);
    } catch (e) {
      console.error('⚠️ Error removiendo de cola:', e.message);
    }
  });

  // Obtener estado de cola
  socket.on('get-queue-status', async ({ setupId, community }) => {
    try {
      const queueLength = await redisQueueLength(`${community}:${setupId}`);
      const queue = await redisQueuePeek(`${community}:${setupId}`, 5);
      socket.emit('queue:status', { setupId, community, queue, queueLength });
    } catch (e) {
      console.error('⚠️ Error obteniendo estado de cola:', e.message);
    }
  });

  // Activar el siguiente match en cola para un setup que quedó libre (red de seguridad:
  // cubre cualquier camino que libere un setup sin pasar por cancelación/series-finished)
  socket.on('activate-queued-match', async ({ setupId, community }) => {
    try {
      if (!setupId || !community) return;
      // LOCK por setup: si ya activamos un match en este setup y todavía no se liberó, NO activar otro.
      // Esto asegura que se active UN solo match por cola de setup (no se drena toda la cola). El lock
      // se limpia cuando el match de ese setup se cancela/finaliza. Como esto corre en el server (único),
      // tambien es seguro para multi-device: aunque N paneles empujen, solo el primero pasa el lock.
      if (setupActivationLock.has(setupId)) { console.log(`[QUEUE] activate-queued-match: ${setupId} ya tiene match activo (lock) — ignorado`); return; }
      const queueKey = `${community}:${setupId}`;
      const nextQueueItem = await redisQueuePop(queueKey);
      if (!nextQueueItem) { console.log(`[QUEUE] activate-queued-match: cola vacía para ${queueKey}`); return; }
      setupActivationLock.set(setupId, Date.now());

      console.log(`[QUEUE] Auto-activando siguiente match en ${setupId} (setup detectado libre): ${nextQueueItem.player1?.name} vs ${nextQueueItem.player2?.name}`);

      const newSession = {
        sessionId: setupId,
        setupId,
        community,
        phase: 'CHECKIN',
        player1: {
          name: nextQueueItem.player1?.name || 'Player 1',
          score: 0, character: null, wonStages: [],
          country: nextQueueItem.player1?.country,
          flagCode: nextQueueItem.player1?.flagCode,
          seed: nextQueueItem.player1?.seed,
        },
        player2: {
          name: nextQueueItem.player2?.name || 'Player 2',
          score: 0, character: null, wonStages: [],
          country: nextQueueItem.player2?.country,
          flagCode: nextQueueItem.player2?.flagCode,
          seed: nextQueueItem.player2?.seed,
        },
        format: nextQueueItem.format || 'BO3',
        currentGame: 1,
        currentTurn: null,
        games: [],
        checkIns: [],
        delayRequests: [],
        startggSetId: nextQueueItem.startggSetId || null,
        startggEntrant1Id: nextQueueItem.startggEntrant1Id || null,
        startggEntrant2Id: nextQueueItem.startggEntrant2Id || null,
        startggReported: false,
        matchToken: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        round: nextQueueItem.round || '',
        community,
      };

      sessions.set(setupId, newSession);
      io.to(setupId).emit('session-updated', { session: newSession });
      if (newSession.startggSetId) markSetInProgress(newSession.startggSetId);

      // Notificar a los jugadores que les toca jugar (igual que callMatch en el panel)
      notifyPlayersMatchReady(setupId, community, newSession.player1?.name, newSession.player2?.name, newSession.matchToken);

      const remainingQueue = await redisQueuePeek(queueKey, 5);
      const queueLength = await redisQueueLength(queueKey);
      io.to('admin-panel').emit('queue:updated', {
        setupId,
        community,
        queue: remainingQueue,
        queueLength,
        message: `✅ Siguiente match activado en ${setupId} (setup detectado libre)`
      });

      const assignedSetObj = {
        [setupId]: {
          id: nextQueueItem.startggSetId,
          slots: [
            { entrant: { name: nextQueueItem.player1?.name || 'Player 1', id: nextQueueItem.startggEntrant1Id } },
            { entrant: { name: nextQueueItem.player2?.name || 'Player 2', id: nextQueueItem.startggEntrant2Id } }
          ],
          fullRoundText: nextQueueItem.round || '',
          sessionId: setupId,
          startggSetId: nextQueueItem.startggSetId,
          startggEntrant1Id: nextQueueItem.startggEntrant1Id,
          startggEntrant2Id: nextQueueItem.startggEntrant2Id,
          // timerStartedAt hace que el panel arranque el countdown de check-in y muestre el match
          // como ACTIVO (CHECK-IN + timer + Cancelar), no como "Iniciar match" sin arrancar.
          timerStartedAt: Date.now(),
        }
      };
      io.to('admin-panel').emit('panel:assign-update', { assignedSets: assignedSetObj, partial: true });

      // PERSISTIR en panelStates: el cliente recibe el partial pero NO lo re-emite (lo bloquea
      // isRemoteAssignRef para evitar eco), así que si no persistimos acá, el panelStates del server
      // queda SIN este match → cualquier panel:state-update o F5 lo borraría del setup. Por eso el
      // server (autoridad) lo guarda directamente en panelStates + Redis.
      persistAssignedSetToPanelState(community, setupId, assignedSetObj[setupId]);
    } catch (e) {
      console.error('⚠️ Error activando match en cola (setup libre):', e.message);
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

  // ── Panel Admin: sincronización de asignaciones en tiempo real ──────────────
  socket.on('panel:join', async ({ community }) => {
    if (!community) return;
    const room = `panel:${community}`;
    socket.join(room);
    // Los handlers de cola (queue:updated/queue:status/panel:assign-update) emiten a 'admin-panel'.
    // Sin este join, el panel nunca recibía esos eventos → setupQueues no se hidrataba y la
    // auto-activación del server jamás llegaba al cliente. Los eventos traen setupId/community,
    // así que el cliente filtra por setup (no hay colisión entre comunidades).
    socket.join('admin-panel');
    socket._panelCommunity = community;
    console.log(`🎮 Panel admin unido: ${socket.id} → ${room} (+admin-panel)`);

    // Emitir estado actual SOLO al socket que se acaba de unir
    let currentState = panelStates.get(community);
    if (!currentState) {
      // Fallback: intentar recuperar de Redis (reinicio del servidor)
      currentState = await redisPanelStateGet(community);
      if (currentState) panelStates.set(community, currentState);
    }
    if (currentState && Object.keys(currentState).length > 0) {
      socket.emit('panel:state-update', { state: currentState });
      console.log(`📋 Estado del panel enviado a nuevo admin [${community}]: ${Object.keys(currentState).join(', ')}`);
    }
  });

  socket.on('panel:assign-update', ({ community, assignedSets }) => {
    if (!community || !assignedSets) return;
    const room = `panel:${community}`;
    socket.to(room).emit('panel:assign-update', { assignedSets });
    // Actualizar estado en memoria y Redis
    const merged = { ...(panelStates.get(community) || {}), assignedSets };
    panelStates.set(community, merged);
    redisPanelStateSet(community, merged);
    console.log(`🔄 Panel sync [${community}]: ${Object.keys(assignedSets).filter(k => assignedSets[k]).length} setups asignados`);
  });

  socket.on('panel:state-update', ({ community, state }) => {
    if (!community || !state) return;
    const room = `panel:${community}`;
    const prev = panelStates.get(community) || {};

    // Merge inteligente de assignedSets: preservar entries con sessionId activa
    // a menos que el cliente envíe forceResetAssigned: true (cierre intencional de torneo)
    let mergedAssignedSets = state.assignedSets;
    if (state.assignedSets !== undefined && !state.forceResetAssigned) {
      const prevAssigned = prev.assignedSets || {};
      const activeFromPrev = Object.fromEntries(
        Object.entries(prevAssigned).filter(([, set]) => set?.sessionId)
      );
      // Los entries activos del estado anterior tienen prioridad sobre el reset vacío
      mergedAssignedSets = { ...state.assignedSets, ...activeFromPrev };
    } else if (state.forceResetAssigned) {
      mergedAssignedSets = {};
    }

    // Construir el estado mergeado final (sin persistir forceResetAssigned)
    const { forceResetAssigned: _drop, ...stateToMerge } = state;
    const merged = {
      ...prev,
      ...stateToMerge,
      ...(mergedAssignedSets !== undefined ? { assignedSets: mergedAssignedSets } : {}),
    };
    panelStates.set(community, merged);
    redisPanelStateSet(community, merged);

    // Broadcast el estado ya mergeado (no el payload crudo) para que todos los clientes
    // reciban la versión consistente incluyendo los matches activos preservados
    socket.to(room).emit('panel:state-update', { state: merged });
    console.log(`🔄 Panel state sync [${community}]:`, Object.keys(state).join(', '));
  });

  // ── Control Panel Mendoza: sync en tiempo real entre múltiples usuarios ─────
  // Cualquier usuario que abra control.html se une a este room y recibe/envía cambios
  socket.on('mendoza-control:join', () => {
    socket.join('mendoza-control');
    console.log(`🎮 Control Mendoza: ${socket.id} unido (total: ${(io.sockets.adapter.rooms.get('mendoza-control')?.size || 1)})`);
    // Enviar estado actual al nuevo cliente para que quede sincronizado al instante
    if (mendozaControlState) {
      socket.emit('mendoza-control:state', mendozaControlState);
    }
  });

  socket.on('mendoza-control:update', (state) => {
    if (!state || typeof state !== 'object') return;
    // Guardar como último estado conocido (last-write-wins)
    mendozaControlState = { ...state, _ts: Date.now() };
    // Broadcast al resto del room (el emisor ya tiene el estado aplicado)
    socket.to('mendoza-control').emit('mendoza-control:state', mendozaControlState);
    const roomSize = io.sockets.adapter.rooms.get('mendoza-control')?.size || 1;
    if (roomSize > 1) {
      console.log(`🔄 Control Mendoza sync → ${roomSize} usuario(s) conectados`);
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

// Re-hidratar sesiones activas desde Redis al arrancar (evita pérdida de datos en deploy)
async function hydrateSessionsFromRedis() {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    let cursor = '0';
    let totalLoaded = 0;
    do {
      const r = await fetch(
        `${REDIS_URL}/scan/${cursor}/match/${encodeURIComponent('tournament:session:*')}/count/100`,
        { headers: { Authorization: `Bearer ${REDIS_TOKEN}` } }
      );
      const data = await r.json();
      if (!data.result) break;
      cursor = String(data.result[0]);
      const keys = data.result[1] || [];
      for (const key of keys) {
        const sessionId = key.replace('tournament:session:', '');
        if (!sessions._map.has(sessionId)) {
          const session = await redisSessionGet(sessionId);
          if (session) { sessions._map.set(sessionId, session); totalLoaded++; }
        }
      }
    } while (cursor !== '0');
    if (totalLoaded > 0) console.log(`✅ Re-hidratadas ${totalLoaded} sesiones desde Redis`);
  } catch (e) {
    console.error('⚠️  Error al hidratar sesiones desde Redis:', e.message);
  }
}

hydrateSessionsFromRedis().then(() => {
  httpServer.listen(PORT, HOST, () => {
    console.log(`✅ Servidor WebSocket corriendo en ${HOST}:${PORT}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check disponible en http://${HOST}:${PORT}/health`);
  });
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
