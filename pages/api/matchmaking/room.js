// API de salas para matchmaking Host/Join — Upstash Redis

import redis, { mmMatchKey, mmQueueKey, mmQueueDoublesKey } from '../../../lib/redis';

const ROOM_TTL_MS = 30 * 60 * 1000; // 30 min
const ACCEPT_MS   = 15 * 1000;       // 15s para aceptar

const RANKED_STAGES_G1 = [
  'Battlefield', 'Small Battlefield', 'Town and City',
  'Smashville', 'Pokémon Stadium 2',
];

const RANKED_STAGES_G2 = [
  'Battlefield', 'Small Battlefield', 'Town and City',
  'Smashville', 'Pokémon Stadium 2',
  'Final Destination', 'Hollow Bastion', 'Kalos',
];

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

function roomKey(code)   { return `mm:room:${code}`; }
function userRoomKey(id) { return `mm:user:room:${id}`; }

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

async function getUserRoom(userId) {
  const code = await redis.get(userRoomKey(userId));
  if (!code) return null;
  const room = await redis.get(roomKey(code));
  if (!room) { await redis.del(userRoomKey(userId)); return null; }
  return { code, room };
}

async function cleanupRoom(code, room) {
  await redis.del(roomKey(code));
  if (room?.mode === '2v2') {
    // Limpiar 4 jugadores en 2v2
    for (const team of [room.team1, room.team2]) {
      if (team?.player1?.userId) await redis.del(userRoomKey(team.player1.userId));
      if (team?.player2?.userId) await redis.del(userRoomKey(team.player2.userId));
    }
  } else {
    if (room?.host?.userId)  await redis.del(userRoomKey(room.host.userId));
    if (room?.guest?.userId) await redis.del(userRoomKey(room.guest.userId));
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // GET: poll estado actual del usuario
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const cleanId = sanitize(userId);

    const found = await getUserRoom(cleanId);
    if (!found) {
      // Verificar si el usuario está en alguna cola de búsqueda
      for (const plat of ['switch', 'parsec']) {
        const queue = (await redis.get(mmQueueKey(plat))) || [];
        if (queue.find(e => e.userId === cleanId)) {
          return res.status(200).json({ status: 'searching', platform: plat });
        }
        // También verificar cola de 2v2
        const queue2v2 = (await redis.get(mmQueueDoublesKey(plat))) || [];
        if (queue2v2.find(e => e.player1.userId === cleanId || e.player2.userId === cleanId)) {
          return res.status(200).json({ status: 'searching', platform: plat, mode: '2v2' });
        }
      }
      return res.status(200).json({ status: 'idle' });
    }

    const { code, room } = found;

    // Expirado
    if (Date.now() - new Date(room.createdAt).getTime() > ROOM_TTL_MS) {
      await cleanupRoom(code, room);
      return res.status(200).json({ status: 'idle' });
    }

    // Chequear timeout de aceptación
    if (room.status === 'pending_accept' && room.pendingAcceptAt) {
      const elapsed = Date.now() - new Date(room.pendingAcceptAt).getTime();
      if (elapsed > ACCEPT_MS) {
        await cleanupRoom(code, room);
        return res.status(200).json({ status: 'timeout' });
      }
      const timeLeft = Math.max(0, Math.ceil((ACCEPT_MS - elapsed) / 1000));
      return res.status(200).json({ status: 'pending_accept', code, room, timeLeft });
    }

    return res.status(200).json({ status: room.status, code, room });
  }

  // POST: acciones
  if (req.method === 'POST') {
    const { action, userId, userName, platform, password, code: inputCode, customCode, charId } = req.body || {};
    const cleanUserId   = sanitize(userId   || '');
    const cleanUserName = sanitize(userName || '');
    const cleanCharId   = sanitize(charId   || '');
    if (!cleanUserId || !cleanUserName) {
      return res.status(400).json({ error: 'userId y userName requeridos' });
    }

    // ─── create ───────────────────────────────────────────
    if (action === 'create') {
      if (!['switch', 'parsec', 'tournament'].includes(platform)) {
        return res.status(400).json({ error: 'Plataforma inválida' });
      }

      const existing = await getUserRoom(cleanUserId);
      if (existing && !['finished', 'timeout'].includes(existing.room.status)) {
        return res.status(409).json({
          error: 'Ya tenés una sala activa',
          status: existing.room.status,
          code: existing.code,
          room: existing.room,
        });
      }

      let code;
      if (customCode) {
        // Código personalizado del host
        const sanitizedCode = sanitize(customCode).toUpperCase().replace(/[^A-Z0-9\-_]/g, '').slice(0, 20);
        if (!sanitizedCode || sanitizedCode.length < 2) {
          return res.status(400).json({ error: 'C\u00f3digo de sala inv\u00e1lido' });
        }
        // Verificar que no exista ya
        const taken = await redis.get(roomKey(sanitizedCode));
        if (taken) {
          return res.status(409).json({ error: 'Ese nombre de sala ya est\u00e1 en uso, eleg\u00ed otro' });
        }
        code = sanitizedCode;
      } else {
        for (let i = 0; i < 10; i++) {
          code = genCode();
          if (!(await redis.get(roomKey(code)))) break;
        }
      }

      const room = {
        code, platform,
        host:  { userId: cleanUserId, userName: cleanUserName, charId: cleanCharId || null },
        guest: null,
        password: password ? sanitize(password).slice(0, 30) : null,
        status: 'waiting',
        matchId: null,
        stage: null,
        acceptedBy: [],
        pendingAcceptAt: null,
        createdAt: new Date().toISOString(),
      };

      await redis.set(roomKey(code), room);
      await redis.set(userRoomKey(cleanUserId), code);
      return res.status(200).json({ status: 'waiting', code, room });
    }

    // ─── join ─────────────────────────────────────────────
    if (action === 'join') {
      if (!inputCode) return res.status(400).json({ error: 'Código de sala requerido' });
      const cleanCode = sanitize(inputCode).toUpperCase();

      const room = await redis.get(roomKey(cleanCode));
      if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
      if (room.status !== 'waiting') return res.status(409).json({ error: 'La sala ya no está disponible' });
      if (room.host.userId === cleanUserId) return res.status(400).json({ error: 'No podés unirte a tu propia sala' });
      if (room.password && room.password !== sanitize(password || '')) {
        return res.status(403).json({ error: 'Contraseña incorrecta' });
      }

      // Limpiar sala previa del guest si existe
      const existingMe = await getUserRoom(cleanUserId);
      if (existingMe) await cleanupRoom(existingMe.code, existingMe.room);

      room.guest          = { userId: cleanUserId, userName: cleanUserName, charId: cleanCharId || null };
      room.status         = 'pending_accept';
      room.matchId        = `mm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      room.pendingAcceptAt = new Date().toISOString();

      await redis.set(roomKey(cleanCode), room);
      await redis.set(userRoomKey(cleanUserId), cleanCode);
      return res.status(200).json({ status: 'pending_accept', code: cleanCode, room, timeLeft: 15 });
    }

    // ─── accept ───────────────────────────────────────────
    if (action === 'accept') {
      const found = await getUserRoom(cleanUserId);
      if (!found) return res.status(400).json({ error: 'No estás en ninguna sala' });
      const { code, room } = found;

      if (room.status !== 'pending_accept') {
        return res.status(400).json({ error: 'No hay partida pendiente de aceptar' });
      }

      const elapsed = Date.now() - new Date(room.pendingAcceptAt).getTime();
      if (elapsed > ACCEPT_MS) {
        await cleanupRoom(code, room);
        return res.status(400).json({ error: 'Tiempo de aceptación expirado', status: 'timeout' });
      }

      if (!room.acceptedBy.includes(cleanUserId)) {
        room.acceptedBy.push(cleanUserId);
      }

      // Determinar si es 2v2 o 1v1
      const is2v2 = room.mode === '2v2';
      let allAccepted = false;

      if (is2v2) {
        const allPlayerIds = [
          room.team1.player1.userId, room.team1.player2.userId,
          room.team2.player1.userId, room.team2.player2.userId,
        ];
        allAccepted = allPlayerIds.every(id => room.acceptedBy.includes(id));
      } else {
        allAccepted =
          room.host?.userId  && room.acceptedBy.includes(room.host.userId) &&
          room.guest?.userId && room.acceptedBy.includes(room.guest.userId);
      }

      if (allAccepted) {
        if (is2v2) {
          // 2v2: Bo1 con stage aleatorio
          room.status = 'active';
          room.stage  = RANKED_STAGES_G1[Math.floor(Math.random() * RANKED_STAGES_G1.length)];
          const matchRecord = {
            id:       room.matchId,
            platform: room.platform,
            mode:     '2v2',
            stage:    room.stage,
            team1:    room.team1,
            team2:    room.team2,
            status:   'active',
            reports:  [],
            result:   null,
            createdAt: new Date().toISOString(),
          };
          await redis.set(mmMatchKey(room.matchId), matchRecord);
        } else {
          // 1v1: Bo3 — J1/J2 aleatorio, J1 ban 1 → J2 ban 2 → J1 pick
          const j1Id = Math.random() < 0.5 ? room.host.userId : room.guest.userId;
          const j2Id = j1Id === room.host.userId ? room.guest.userId : room.host.userId;
          room.status   = 'banning';
          room.format   = 'bo3';
          room.games    = [];
          room.currentGame = 1;
          room.score    = { [room.host.userId]: 0, [room.guest.userId]: 0 };
          room.bans     = {};
          room.banPhase = 'j1_ban';
          room.j1       = j1Id;
          room.j2       = j2Id;
          room.stage    = null;
          const matchRecord = {
            id:       room.matchId,
            platform: room.platform,
            format:   'bo3',
            stage:    null,
            player1:  { userId: room.host.userId,  userName: room.host.userName,  charId: room.host.charId  || null },
            player2:  { userId: room.guest.userId, userName: room.guest.userName, charId: room.guest.charId || null },
            status:   'banning',
            games:    [],
            currentGame: 1,
            score:    { [room.host.userId]: 0, [room.guest.userId]: 0 },
            bans:     {},
            banPhase: 'j1_ban',
            j1:       j1Id,
            j2:       j2Id,
            reports:  [],
            result:   null,
            createdAt: new Date().toISOString(),
          };
          await redis.set(mmMatchKey(room.matchId), matchRecord);
        }

        const MATCH_LIST_KEY = 'mm:matches:index';
        const index = (await redis.get(MATCH_LIST_KEY)) || [];
        index.push(room.matchId);
        await redis.set(MATCH_LIST_KEY, index.length > 500 ? index.slice(-500) : index);
      }

      const timeLeft = Math.max(0, Math.ceil((ACCEPT_MS - elapsed) / 1000));
      await redis.set(roomKey(code), room);
      return res.status(200).json({ status: room.status, code, room, timeLeft });
    }

    // ─── decline ──────────────────────────────────────────
    if (action === 'decline') {
      const found = await getUserRoom(cleanUserId);
      if (found) await cleanupRoom(found.code, found.room);
      return res.status(200).json({ status: 'declined' });
    }

    // ─── ban: banear stages (Bo3) ──────────────────────────
    if (action === 'ban') {
      const found = await getUserRoom(cleanUserId);
      if (!found) return res.status(400).json({ error: 'No estás en ninguna sala' });
      const { code, room } = found;
      if (room.status !== 'banning') return res.status(400).json({ error: 'No estás en fase de baneo' });

      const { bannedStages } = req.body || {};
      if (!Array.isArray(bannedStages)) return res.status(400).json({ error: 'bannedStages requerido' });

      const isGame1 = room.currentGame === 1;
      const VALID_STAGES = isGame1 ? RANKED_STAGES_G1 : RANKED_STAGES_G2;

      // ── Game 1: J1 ban 1 → J2 ban 2 → J1 pick ──
      if (room.banPhase === 'j1_ban') {
        if (cleanUserId !== room.j1) return res.status(400).json({ error: 'No es tu turno de banear' });
        if (bannedStages.length !== 1) return res.status(400).json({ error: 'Debés banear exactamente 1 escenario' });
        for (const s of bannedStages) { if (!VALID_STAGES.includes(s)) return res.status(400).json({ error: 'Stage inválido: ' + s }); }
        room.bans[cleanUserId] = bannedStages;
        room.banPhase = 'j2_ban';
        await redis.set(roomKey(code), room);
        return res.status(200).json({ status: room.status, code, room });
      }

      if (room.banPhase === 'j2_ban') {
        if (cleanUserId !== room.j2) return res.status(400).json({ error: 'No es tu turno de banear' });
        if (bannedStages.length !== 2) return res.status(400).json({ error: 'Debés banear exactamente 2 escenarios' });
        const j1Bans = room.bans[room.j1] || [];
        for (const s of bannedStages) {
          if (!VALID_STAGES.includes(s)) return res.status(400).json({ error: 'Stage inválido: ' + s });
          if (j1Bans.includes(s)) return res.status(400).json({ error: 'Ese escenario ya fue baneado: ' + s });
        }
        room.bans[cleanUserId] = bannedStages;
        room.banPhase = 'j1_pick';
        await redis.set(roomKey(code), room);
        return res.status(200).json({ status: room.status, code, room });
      }

      // ── Game 2+: Winner bans 3 → Loser picks ──
      if (room.banPhase === 'winner_ban') {
        const prevWinnerId = room.games[room.games.length - 1]?.result?.winnerId;
        if (cleanUserId !== prevWinnerId) return res.status(400).json({ error: 'Solo el ganador del game anterior puede banear' });
        if (bannedStages.length !== 3) return res.status(400).json({ error: 'Debés banear exactamente 3 escenarios' });
        for (const s of bannedStages) { if (!VALID_STAGES.includes(s)) return res.status(400).json({ error: 'Stage inválido: ' + s }); }
        room.bans[cleanUserId] = bannedStages;
        room.banPhase = 'loser_pick';
        await redis.set(roomKey(code), room);
        return res.status(200).json({ status: room.status, code, room });
      }

      return res.status(400).json({ error: 'Fase de baneo inválida' });
    }

    // ─── pick_stage: J1 o loser elige stage ─────
    if (action === 'pick_stage') {
      const found = await getUserRoom(cleanUserId);
      if (!found) return res.status(400).json({ error: 'No estás en ninguna sala' });
      const { code, room } = found;
      if (room.status !== 'banning') return res.status(400).json({ error: 'No estás en fase de elección' });

      const { pickedStage } = req.body || {};
      const isGame1 = room.currentGame === 1;
      const VALID_STAGES = isGame1 ? RANKED_STAGES_G1 : RANKED_STAGES_G2;
      if (!pickedStage || !VALID_STAGES.includes(pickedStage)) return res.status(400).json({ error: 'Stage inválido' });

      // Verificar que no esté baneado
      const allBanned = new Set(Object.values(room.bans).flat());
      if (allBanned.has(pickedStage)) return res.status(400).json({ error: 'Ese escenario fue baneado' });

      if (room.banPhase === 'j1_pick') {
        if (cleanUserId !== room.j1) return res.status(400).json({ error: 'Solo J1 puede elegir escenario' });
      } else if (room.banPhase === 'loser_pick') {
        const prevWinnerId = room.games[room.games.length - 1]?.result?.winnerId;
        if (cleanUserId === prevWinnerId) return res.status(400).json({ error: 'Solo el perdedor puede elegir escenario' });
      } else {
        return res.status(400).json({ error: 'No estás en fase de selección' });
      }

      room.games.push({ gameNum: room.currentGame, stage: pickedStage, bans: { ...room.bans }, result: null });
      room.stage = pickedStage;
      room.status = 'active';
      room.bans = {};
      const match = await redis.get(mmMatchKey(room.matchId));
      if (match) { match.stage = pickedStage; match.status = 'active'; match.games = room.games; await redis.set(mmMatchKey(room.matchId), match); }
      await redis.set(roomKey(code), room);
      return res.status(200).json({ status: room.status, code, room });
    }

    return res.status(400).json({ error: 'Acción inválida' });
  }

  // DELETE: cancelar sala
  if (req.method === 'DELETE') {
    const { userId } = req.body || {};
    const cleanId = sanitize(userId || '');
    if (!cleanId) return res.status(400).json({ error: 'userId requerido' });
    const found = await getUserRoom(cleanId);
    if (found) await cleanupRoom(found.code, found.room);
    return res.status(200).json({ status: 'cancelled' });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
