import { redis, crTournamentsKey } from '../../../lib/redis';
import { MIN_ATTENDEES } from '../../../lib/communityRanking';

function checkAuth(req) {
  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  return auth === (process.env.ADMIN_SECRET || 'afk-admin-2025');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!checkAuth(req)) return res.status(401).json({ error: 'No autorizado' });

  const { rows, community, year, tournamentName, type = 'IMPORT' } = req.body || {};

  if (!rows || !Array.isArray(rows) || rows.length === 0)
    return res.status(400).json({ error: 'rows es requerido y no puede estar vacío' });
  if (!community || !year)
    return res.status(400).json({ error: 'community y year son requeridos' });
  if (!tournamentName || !tournamentName.trim())
    return res.status(400).json({ error: 'tournamentName es requerido' });

  if (rows.length < MIN_ATTENDEES)
    return res.status(400).json({ error: `Se necesitan al menos ${MIN_ATTENDEES} filas (hay ${rows.length})` });

  // Validar y normalizar filas
  const standings = rows.map((r, i) => {
    const placement = parseInt(r.placement, 10) || i + 1;
    const playerName = String(r.playerName || r.name || '').trim().slice(0, 100);
    const basePoints = parseInt(r.basePoints ?? r.points ?? 0, 10) || 0;
    if (!playerName) throw new Error(`Fila ${i + 1}: nombre del jugador vacío`);
    return { placement, playerName, entrantName: playerName, basePoints, bonusPoints: 0 };
  });

  try {
    const key = crTournamentsKey(community, year);
    const raw = await redis.get(key);
    const existing = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];

    const id = `import:${Date.now()}`;
    const newTournament = {
      id,
      slug: null,
      name: tournamentName.trim(),
      type,
      startAt: null,
      numAttendees: standings.length,
      addedAt: Date.now(),
      isImport: true,
      standings,
    };

    existing.push(newTournament);
    await redis.set(key, JSON.stringify(existing));
    return res.status(200).json({ ok: true, tournament: newTournament });
  } catch (err) {
    console.error('[community-ranking/import-csv]', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}
