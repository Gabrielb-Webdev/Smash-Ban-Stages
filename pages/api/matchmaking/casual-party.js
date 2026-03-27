// API de casual 2v2 party — dos jugadores se unen antes de buscar rivales
import redis from '../../../lib/redis';

function sanitize(s) { return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100); }

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

const PARTY_TTL = 3600;
const partyKey     = (code)   => `mm:casual:party:${code}`;
const partyUserKey = (userId) => `mm:casual:party:user:${userId}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET: estado del party del usuario ─────────────────────────
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const clean = sanitize(userId);
    const code = await redis.get(partyUserKey(clean));
    if (!code) return res.status(200).json({ status: 'none' });
    const party = await redis.get(partyKey(code));
    if (!party) {
      await redis.del(partyUserKey(clean));
      return res.status(200).json({ status: 'none' });
    }
    return res.status(200).json({ status: party.status, party, code });
  }

  // ── POST: crear o unirse ───────────────────────────────────────
  if (req.method === 'POST') {
    const { action, userId, userName, charId, platform, code: joinCode } = req.body || {};
    if (!userId || !userName) return res.status(400).json({ error: 'userId y userName requeridos' });
    const cleanId   = sanitize(userId);
    const cleanName = sanitize(userName);
    const cleanChar = charId ? sanitize(charId) : null;

    // Verificar que no esté ya en un party
    const existingCode = await redis.get(partyUserKey(cleanId));
    if (existingCode) {
      const existingParty = await redis.get(partyKey(existingCode));
      if (existingParty) return res.status(409).json({ error: 'Ya estás en un party casual', party: existingParty, code: existingCode });
      await redis.del(partyUserKey(cleanId));
    }

    // ── Crear sala ──
    if (action === 'create') {
      if (!['switch', 'parsec'].includes(platform)) return res.status(400).json({ error: 'platform inválido' });
      let code;
      for (let i = 0; i < 10; i++) {
        code = genCode();
        if (!(await redis.get(partyKey(code)))) break;
      }
      const party = {
        code, platform,
        leader:  { userId: cleanId, userName: cleanName, charId: cleanChar },
        partner: null,
        status: 'waiting',
        createdAt: new Date().toISOString(),
      };
      await redis.set(partyKey(code), party, { ex: PARTY_TTL });
      await redis.set(partyUserKey(cleanId), code, { ex: PARTY_TTL });
      return res.status(200).json({ status: 'waiting', code, party });
    }

    // ── Unirse a sala ──
    if (action === 'join') {
      if (!joinCode) return res.status(400).json({ error: 'code requerido' });
      const cleanCode = sanitize(joinCode).toUpperCase().slice(0, 4);
      const party = await redis.get(partyKey(cleanCode));
      if (!party) return res.status(404).json({ error: 'Sala no encontrada' });
      if (party.status !== 'waiting') return res.status(400).json({ error: 'La sala ya está completa' });
      if (party.leader.userId === cleanId) return res.status(400).json({ error: 'Sos el creador de esta sala' });
      party.partner = { userId: cleanId, userName: cleanName, charId: cleanChar };
      party.status = 'ready';
      await redis.set(partyKey(cleanCode), party, { ex: PARTY_TTL });
      await redis.set(partyUserKey(cleanId), cleanCode, { ex: PARTY_TTL });
      return res.status(200).json({ status: 'ready', code: cleanCode, party });
    }

    // ── Actualizar personaje en el party ──
    if (action === 'update-char') {
      const code = await redis.get(partyUserKey(cleanId));
      if (!code) return res.status(404).json({ error: 'No estás en ningún party' });
      const party = await redis.get(partyKey(code));
      if (!party) return res.status(404).json({ error: 'Party no encontrado' });
      if (party.leader.userId === cleanId) party.leader.charId = cleanChar;
      else if (party.partner?.userId === cleanId) party.partner.charId = cleanChar;
      await redis.set(partyKey(code), party, { ex: PARTY_TTL });
      return res.status(200).json({ status: party.status, code, party });
    }

    return res.status(400).json({ error: 'action inválida' });
  }

  // ── DELETE: salir del party ────────────────────────────────────
  if (req.method === 'DELETE') {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const clean = sanitize(userId);
    const code = await redis.get(partyUserKey(clean));
    if (code) {
      const party = await redis.get(partyKey(code));
      if (party) {
        if (party.leader.userId === clean) {
          // Líder se va → disuelve el party
          if (party.partner) await redis.del(partyUserKey(party.partner.userId));
          await redis.del(partyKey(code));
        } else {
          // Partner se va → party vuelve a 'waiting'
          party.partner = null;
          party.status = 'waiting';
          await redis.set(partyKey(code), party, { ex: PARTY_TTL });
        }
      }
      await redis.del(partyUserKey(clean));
    }
    return res.status(200).json({ status: 'removed' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
