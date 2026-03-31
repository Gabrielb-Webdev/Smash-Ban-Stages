/**
 * POST /api/admin/rename-profile
 * Cambia el campo `name` en el perfil y en el índice de un jugador de la app.
 * Body: { oldName, newName }
 * Header: Authorization: Bearer afk-admin-2025
 *
 * GET /api/admin/rename-profile?oldName=Facundo+Rey&newName=Faka!&secret=afk-admin-2025
 */
import redis, { playerKey, playersIndexKey } from '../../../lib/redis';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();

  const expected = process.env.ADMIN_SECRET || 'afk-admin-2025';
  const authHeader = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  const authQuery  = (req.query.secret || '').trim();
  if (authHeader !== expected && authQuery !== expected)
    return res.status(401).json({ error: 'No autorizado' });

  const oldName = (req.method === 'GET' ? req.query.oldName : req.body?.oldName)?.trim();
  const newName = (req.method === 'GET' ? req.query.newName : req.body?.newName)?.trim();

  if (!oldName || !newName) return res.status(400).json({ error: 'oldName y newName son requeridos' });
  if (oldName === newName)   return res.status(400).json({ error: 'Los nombres son iguales' });

  try {
    const raw = await redis.get(playersIndexKey);
    const idx = Array.isArray(raw) ? raw : [];

    const target = idx.find(u => u.name?.trim().toLowerCase() === oldName.toLowerCase());
    if (!target) return res.status(404).json({ error: `No se encontró ningún usuario con nombre "${oldName}"` });

    // Actualizar índice
    target.name = newName;
    await redis.set(playersIndexKey, idx);

    // Actualizar perfil
    const profile = await redis.get(playerKey(target.id));
    if (profile) {
      profile.name = newName;
      await redis.set(playerKey(target.id), profile);
    }

    return res.status(200).json({ ok: true, id: target.id, oldName, newName });
  } catch (err) {
    console.error('[rename-profile]', err);
    return res.status(500).json({ error: err.message });
  }
}
