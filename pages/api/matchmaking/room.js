// API de salas para matchmaking Host/Join — Upstash Redis

import redis, { mmMatchKey } from '../../../lib/redis';

const ROOM_TTL_MS = 30 * 60 * 1000; // 30 min
const ACCEPT_MS   = 15 * 1000;       // 15s para aceptar

const STAGES = [
  'Battlefield', 'Final Destination', 'Small Battlefield',
  'Pokémon Stadium 2', 'Town & City', 'Smashville',
  'Hollow Bastion', 'Kalos Pokémon League',
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
  if (room?.host?.userId)  await redis.del(userRoomKey(room.host.userId));
  if (room?.guest?.userId) await redis.del(userRoomKey(room.guest.userId));
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
    if (!found) return res.status(200).json({ status: 'idle' });

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

      const bothAccepted =
        room.host?.userId  && room.acceptedBy.includes(room.host.userId) &&
        room.guest?.userId && room.acceptedBy.includes(room.guest.userId);

      if (bothAccepted) {
        room.status = 'active';
        room.stage  = STAGES[Math.floor(Math.random() * STAGES.length)];

        // Crear registro de match compatible con result.js
        const matchRecord = {
          id:       room.matchId,
          platform: room.platform,
          stage:    room.stage,
          player1:  { userId: room.host.userId,  userName: room.host.userName,  charId: room.host.charId  || null },
          player2:  { userId: room.guest.userId, userName: room.guest.userName, charId: room.guest.charId || null },
          status:   'active',
          reports:  [],
          result:   null,
          createdAt: new Date().toISOString(),
        };
        await redis.set(mmMatchKey(room.matchId), matchRecord);

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
