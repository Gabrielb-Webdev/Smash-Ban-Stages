/**
 * GET  /api/community-ranking/player-char?community=afk&year=2025
 *   â†’ { overrides: { "zant": "bowser", ... } }
 *
 * PATCH /api/community-ranking/player-char
 *   body: { community, year, playerName, charId }
 *   charId = null / "" â†’ elimina el override del jugador
 *   â†’ { ok: true, overrides: { ... } }
 */
import redis, { crCharOverrideKey } from '../../../lib/redis';
import { CHARACTERS } from '../../../lib/characters';

const ADMIN_SECRET = 'afk-admin-2025';
const VALID_CHAR_IDS = new Set([...CHARACTERS.map(c => c.id), 'random']);

export default async function handler(req, res) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  if (req.method === 'GET') {
    const { community, year } = req.query;
    if (!community || !year) return res.status(400).json({ error: 'community y year son requeridos' });

    const raw = await redis.get(crCharOverrideKey(community, year)).catch(() => null);
    const overrides = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
    return res.status(200).json({ overrides });
  }

  if (req.method === 'PATCH') {
    const { community, year, playerName, charId } = req.body || {};
    if (!community || !year) return res.status(400).json({ error: 'community y year son requeridos' });
    if (!playerName) return res.status(400).json({ error: 'playerName es requerido' });

    if (charId && !VALID_CHAR_IDS.has(charId)) {
      return res.status(400).json({ error: `charId invÃ¡lido: ${charId}` });
    }

    const raw = await redis.get(crCharOverrideKey(community, year)).catch(() => null);
    const overrides = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};

    const key = playerName.toLowerCase().trim();
    if (charId) {
      overrides[key] = charId;
    } else {
      delete overrides[key];
    }

    await redis.set(crCharOverrideKey(community, year), overrides);
    return res.status(200).json({ ok: true, overrides });
  }

  return res.status(405).end();
}
