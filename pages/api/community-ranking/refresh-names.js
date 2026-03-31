/**
 * POST /api/community-ranking/refresh-names
 * Recorre todos los torneos de una comunidad/año y actualiza el playerName
 * de cada standing consultando el gamerTag ACTUAL en start.gg.
 *
 * Estrategia de matching (por prioridad):
 *  1. Por playerId (start.gg ID numérico) si fue guardado en el standing
 *  2. Por entrantName (nombre de registro en el bracket, clave estable)
 */
import redis, { crTournamentsKey } from '../../../lib/redis';

const STARTGG_API = 'https://api.start.gg/gql/alpha';

// Query para re-obtener entrants con nombre actual y playerId
const Q_EVENT_ENTRANTS_REFRESH = `
query EventEntrantsRefresh($slug: String!, $page: Int!, $perPage: Int!) {
  event(slug: $slug) {
    entrants(query: { page: $page, perPage: $perPage }) {
      pageInfo { total totalPages }
      nodes {
        name
        participants { player { id gamerTag } }
      }
    }
  }
}`;

async function gqlQuery(token, query, variables) {
  const r = await fetch(STARTGG_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`start.gg HTTP ${r.status}`);
  const json = await r.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'GQL error');
  return json.data;
}

/**
 * Devuelve dos mapas para actualizar nombres:
 *  idMap:   playerId (string) → currentGamerTag
 *  nameMap: entrantName.toLowerCase() → currentGamerTag
 */
async function fetchNameMaps(token, eventSlug) {
  const idMap = {};
  const nameMap = {};
  let page = 1;
  let totalPages = 1;
  const perPage = 64;

  do {
    try {
      const data = await gqlQuery(token, Q_EVENT_ENTRANTS_REFRESH, { slug: eventSlug, page, perPage });
      const entrants = data?.event?.entrants;
      if (!entrants) break;
      totalPages = entrants.pageInfo?.totalPages || 1;
      for (const e of (entrants.nodes || [])) {
        const player = e.participants?.[0]?.player;
        const currentTag = player?.gamerTag;
        const playerId = player?.id;
        const entrantName = e.name;
        if (!currentTag) continue;
        if (playerId) idMap[String(playerId)] = currentTag;
        if (entrantName) nameMap[entrantName.toLowerCase()] = currentTag;
      }
    } catch { break; }
    page++;
  } while (page <= totalPages && page <= 8);

  return { idMap, nameMap };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (auth !== (process.env.ADMIN_SECRET || 'afk-admin-2025'))
    return res.status(401).json({ error: 'No autorizado' });

  const { community, year } = req.body || {};
  if (!community || !year) return res.status(400).json({ error: 'community y year requeridos' });

  const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET || '';
  if (!token) return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });

  const key = crTournamentsKey(community, year);
  const raw = await redis.get(key);
  const tournaments = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];

  let updatedTournaments = 0;
  let updatedStandings = 0;
  const changes = []; // { tournament, old, new } para debug

  for (const t of tournaments) {
    const slug = t.slug;
    if (!slug || typeof slug !== 'string') continue;

    // Limpiar slug
    const cleanSlug = slug
      .replace(/^https?:\/\/(www\.)?start\.gg\//, '')
      .replace(/\/brackets(\/.*)?$/, '')
      .replace(/\/(details|registration|results)(\/.*)?$/, '');
    if (!cleanSlug.includes('/event/')) continue;

    try {
      const { idMap, nameMap } = await fetchNameMaps(token, cleanSlug);
      if (!Object.keys(idMap).length && !Object.keys(nameMap).length) continue;

      let tChanged = false;
      for (const s of (t.standings || [])) {
        // 1. Match por playerId
        let currentTag = s.playerId ? idMap[String(s.playerId)] : null;
        // 2. Fallback: match por entrantName
        if (!currentTag && s.entrantName) {
          currentTag = nameMap[s.entrantName.toLowerCase()];
        }
        // 3. Fallback: match por playerName actual (por si entrantName no está guardado)
        if (!currentTag && s.playerName) {
          currentTag = nameMap[s.playerName.toLowerCase()];
        }

        if (currentTag && currentTag !== s.playerName) {
          changes.push({ tournament: t.name, old: s.playerName, new: currentTag });
          s.playerName = currentTag;
          tChanged = true;
          updatedStandings++;
        }
      }
      if (tChanged) updatedTournaments++;
    } catch { /* continuar con el siguiente */ }
  }

  await redis.set(key, JSON.stringify(tournaments));
  return res.status(200).json({
    ok: true,
    updatedTournaments,
    updatedStandings,
    total: tournaments.length,
    changes,
  });
}
