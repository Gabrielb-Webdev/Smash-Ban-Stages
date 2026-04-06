// GET    /api/admin/support-users — Listar usuarios de soporte
// POST   /api/admin/support-users — Agregar usuario de soporte { userId }
// DELETE /api/admin/support-users — Remover usuario de soporte { userId }
// Solo global admins pueden gestionar el rol de soporte.

import redis, { supportUsersKey, playerKey } from '../../../lib/redis';
import { getTicketUser } from '../../../lib/ticketAuth';

export default async function handler(req, res) {
  const tu = await getTicketUser(req);
  if (!tu) return res.status(401).json({ error: 'No autenticado' });
  if (!tu.isAdmin) return res.status(403).json({ error: 'Solo global admins pueden gestionar soporte' });

  // ─── GET: listar ────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const members = await redis.smembers(supportUsersKey);
    // Enriquecer con datos de perfil si están en Redis
    const users = await Promise.all(
      (members || []).map(async (uid) => {
        try {
          const profile = await redis.get(playerKey(uid));
          if (profile) return { userId: uid, name: profile.name || profile.gamerTag || uid, avatar: profile.avatar || null };
        } catch { /* ignorar */ }
        return { userId: uid, name: uid };
      })
    );
    return res.status(200).json({ users });
  }

  // ─── POST: agregar ──────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { userId } = req.body || {};
    if (!userId || String(userId).trim() === '') {
      return res.status(400).json({ error: 'userId requerido' });
    }
    await redis.sadd(supportUsersKey, String(userId).trim());
    return res.status(200).json({ ok: true, added: String(userId).trim() });
  }

  // ─── DELETE: remover ────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    await redis.srem(supportUsersKey, String(userId));
    return res.status(200).json({ ok: true, removed: String(userId) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
