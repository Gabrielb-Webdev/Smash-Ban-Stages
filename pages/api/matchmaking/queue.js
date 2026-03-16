// API de cola de matchmaking para Switch Online y Parsec

if (!global._mmQueue)   global._mmQueue   = { switch: [], parsec: [] };
if (!global._mmMatches) global._mmMatches = {};

const STAGES = [
  'Battlefield', 'Final Destination', 'Small Battlefield',
  'Pokémon Stadium 2', 'Town & City', 'Smashville',
  'Hollow Bastion', 'Kalos Pokémon League',
];

const QUEUE_TTL_MS   = 10 * 60 * 1000; // 10 min máximo en cola
const MATCH_TTL_MS   = 60 * 60 * 1000; // 1 h máximo match activo

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

function randomStage() {
  return STAGES[Math.floor(Math.random() * STAGES.length)];
}

// Limpiar entradas vencidas
function pruneQueue() {
  const now = Date.now();
  for (const plat of ['switch', 'parsec']) {
    global._mmQueue[plat] = global._mmQueue[plat].filter(
      e => now - new Date(e.joinedAt).getTime() < QUEUE_TTL_MS
    );
  }
  for (const id of Object.keys(global._mmMatches)) {
    const m = global._mmMatches[id];
    if (now - new Date(m.createdAt).getTime() > MATCH_TTL_MS && m.status !== 'active') {
      delete global._mmMatches[id];
    }
  }
}

// Intentar emparejar dos jugadores en la cola
function tryMatch(platform) {
  const q = global._mmQueue[platform];
  if (q.length < 2) return;

  const [p1, p2] = q.splice(0, 2);

  const match = {
    id: `mm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    platform,
    stage: randomStage(),
    player1: p1,
    player2: p2,
    status: 'active',
    reports: [],
    result: null,
    createdAt: new Date().toISOString(),
  };

  global._mmMatches[match.id] = match;

  // Marcar a ambos jugadores como emparejados
  p1.matchId = match.id;
  p2.matchId = match.id;
  global._mmQueue[platform].push(p1, p2); // Volver a la "sala de espera" para que puedan hacer poll
  // Nota: usaremos matchId en el poll para sacarlos
}

function getPlayerStatus(userId, platform) {
  pruneQueue();

  // ¿Tiene un match activo?
  for (const m of Object.values(global._mmMatches)) {
    if (m.platform !== platform) continue;
    const isP1 = m.player1.userId === userId;
    const isP2 = m.player2.userId === userId;
    if (!isP1 && !isP2) continue;

    if (m.status === 'active' || m.status === 'pending_result' || m.status === 'disputed') {
      return { status: 'matched', match: safeMatch(m, userId) };
    }
    if (m.status === 'finished') {
      return { status: 'finished', match: safeMatch(m, userId) };
    }
  }

  // ¿Está en cola?
  const q = global._mmQueue[platform];
  const idx = q.findIndex(e => e.userId === userId);
  if (idx !== -1) {
    const entry = q[idx];
    if (entry.matchId) {
      // Fue emparejado pero aún está en la lista de espera → devolver match
      const m = global._mmMatches[entry.matchId];
      if (m) {
        // Sacar de la cola ahora que ya lo vio
        global._mmQueue[platform] = q.filter(e => e.userId !== userId);
        return { status: 'matched', match: safeMatch(m, userId) };
      }
    }
    return {
      status: 'waiting',
      position: idx + 1,
      queueSize: q.length,
      waitingSince: entry.joinedAt,
    };
  }

  return { status: 'idle' };
}

// No exponer datos de conexión del rival excepto al jugador que los necesita
function safeMatch(m, requestingUserId) {
  const isP1 = m.player1.userId === requestingUserId;
  const self    = isP1 ? m.player1 : m.player2;
  const opponent = isP1 ? m.player2 : m.player1;

  // El jugador puede ver los datos de conexión del rival
  return {
    id: m.id,
    platform: m.platform,
    stage: m.stage,
    status: m.status,
    result: m.result,
    reports: m.reports,
    createdAt: m.createdAt,
    self: { name: self.userName, parsecId: self.parsecId, switchCode: self.switchCode },
    opponent: { name: opponent.userName, userId: opponent.userId, parsecId: opponent.parsecId, switchCode: opponent.switchCode },
    selfIsP1: isP1,
  };
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET: poll de estado ────────────────────────────────
  if (req.method === 'GET') {
    const { userId, platform } = req.query;
    if (!userId || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId y platform requeridos' });
    }
    return res.status(200).json(getPlayerStatus(sanitize(userId), platform));
  }

  // ── POST: unirse a la cola ────────────────────────────
  if (req.method === 'POST') {
    const { userId, userName, platform, parsecId, switchCode } = req.body || {};

    if (!userId || !userName || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId, userName y platform requeridos' });
    }

    // Validar datos de conexión según plataforma
    if (platform === 'parsec' && !parsecId?.trim()) {
      return res.status(400).json({ error: 'Ingresá tu Parsec Peer ID' });
    }
    if (platform === 'switch' && !switchCode?.trim()) {
      return res.status(400).json({ error: 'Ingresá tu código de amigo de Nintendo Switch' });
    }

    const cleanUserId = sanitize(userId);
    const cleanUserName = sanitize(userName);

    // Verificar que no esté ya en cola o en match
    const current = getPlayerStatus(cleanUserId, platform);
    if (current.status === 'waiting') {
      return res.status(409).json({ error: 'Ya estás en cola', ...current });
    }
    if (current.status === 'matched' || current.status === 'active') {
      return res.status(409).json({ error: 'Ya tenés un match activo', ...current });
    }

    const entry = {
      userId: cleanUserId,
      userName: cleanUserName,
      platform,
      parsecId:   parsecId   ? sanitize(parsecId).slice(0, 80)   : null,
      switchCode: switchCode ? sanitize(switchCode).replace(/[^0-9\-SW]/gi, '').slice(0, 20) : null,
      joinedAt: new Date().toISOString(),
      matchId: null,
    };

    global._mmQueue[platform].push(entry);
    tryMatch(platform);

    return res.status(200).json(getPlayerStatus(cleanUserId, platform));
  }

  // ── DELETE: salir de la cola ──────────────────────────
  if (req.method === 'DELETE') {
    const { userId, platform } = req.body || {};
    if (!userId || !['switch', 'parsec'].includes(platform)) {
      return res.status(400).json({ error: 'userId y platform requeridos' });
    }
    const clean = sanitize(userId);
    global._mmQueue[platform] = global._mmQueue[platform].filter(e => e.userId !== clean);
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
