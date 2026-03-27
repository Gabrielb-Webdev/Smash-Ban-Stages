// API de ranked 2v2 party con sistema de código de sala (igual que casual-party pero para ranked)
// Usa las mismas keys de redis que el sistema de party existente (partyKey / userPartyKey)
// para ser compatible con queue-doubles.js

import redis, { partyKey, userPartyKey } from '../../../lib/redis';

function sanitize(s) { return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100); }

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function genId() { return `rp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

const PARTY_TTL = 3600;
const partyCodeKey = (code) => `party:ranked:code:${code}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // GET: estado del party ranked del usuario
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const clean = sanitize(userId);
    const pid = await redis.get(userPartyKey(clean));
    if (!pid) return res.status(200).json({ status: 'none' });
    const party = await redis.get(partyKey(pid));
    if (!party || !party.code) {
      await redis.del(userPartyKey(clean));
      return res.status(200).json({ status: 'none' });
    }
    return res.status(200).json({ status: party.status, party, pid });
  }

  // POST: crear o unirse
  if (req.method === 'POST') {
    const { action, userId, userName, platform, code: joinCode } = req.body || {};
    if (!userId || !userName) return res.status(400).json({ error: 'userId y userName requeridos' });
    const cleanId   = sanitize(userId);
    const cleanName = sanitize(userName);

    // Verificar que no esté ya en un party
    const existingPid = await redis.get(userPartyKey(cleanId));
    if (existingPid) {
      const existingParty = await redis.get(partyKey(existingPid));
      if (existingParty) return res.status(409).json({ error: 'Ya estás en un party', party: existingParty, pid: existingPid });
      await redis.del(userPartyKey(cleanId));
    }

    if (action === 'create') {
      if (!['switch', 'parsec'].includes(platform)) return res.status(400).json({ error: 'platform inválido' });
      let code;
      for (let i = 0; i < 10; i++) {
        code = genCode();
        if (!(await redis.get(partyCodeKey(code)))) break;
      }
      const pid = genId();
      // El partido usa la misma estructura que queue-doubles espera:
      // party.leader.userId, party.leader.userName
      // party.invited.userId, party.invited.userName
      const party = {
        id: pid, code, platform,
        leader: { userId: cleanId, userName: cleanName },
        invited: null,
        status: 'waiting',
        createdAt: new Date().toISOString(),
      };
      await redis.set(partyKey(pid), party, { ex: PARTY_TTL });
      await redis.set(userPartyKey(cleanId), pid, { ex: PARTY_TTL });
      await redis.set(partyCodeKey(code), pid, { ex: PARTY_TTL });
      return res.status(200).json({ status: 'waiting', code, party, pid });
    }

    if (action === 'join') {
      if (!joinCode) return res.status(400).json({ error: 'code requerido para unirse' });
      const cleanCode = sanitize(joinCode).toUpperCase().slice(0, 4);
      const pid = await redis.get(partyCodeKey(cleanCode));
      if (!pid) return res.status(404).json({ error: 'Sala no encontrada' });
      const party = await redis.get(partyKey(pid));
      if (!party) return res.status(404).json({ error: 'Party no encontrado' });
      if (party.status !== 'waiting') return res.status(400).json({ error: 'La sala ya está completa' });
      if (party.leader.userId === cleanId) return res.status(400).json({ error: 'Sos el creador de esta sala' });
      party.invited = { userId: cleanId, userName: cleanName };
      party.status = 'ready';
      await redis.set(partyKey(pid), party, { ex: PARTY_TTL });
      await redis.set(userPartyKey(cleanId), pid, { ex: PARTY_TTL });
      return res.status(200).json({ status: 'ready', code: cleanCode, party, pid });
    }

    return res.status(400).json({ error: 'action inválida' });
  }

  // DELETE: salir del party
  if (req.method === 'DELETE') {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const clean = sanitize(userId);
    const pid = await redis.get(userPartyKey(clean));
    if (pid) {
      const party = await redis.get(partyKey(pid));
      if (party) {
        if (party.code) await redis.del(partyCodeKey(party.code));
        if (party.leader.userId === clean) {
          if (party.invited?.userId) await redis.del(userPartyKey(party.invited.userId));
          await redis.del(partyKey(pid));
        } else {
          party.invited = null;
          party.status = 'waiting';
          await redis.set(partyKey(pid), party, { ex: PARTY_TTL });
        }
      }
      await redis.del(userPartyKey(clean));
    }
    return res.status(200).json({ status: 'removed' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
