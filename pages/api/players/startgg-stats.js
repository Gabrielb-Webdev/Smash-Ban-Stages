// API: obtener estadísticas de carrera de Start.GG para un jugador
// GET /api/players/startgg-stats?slug=ead8fa65
// Header: Authorization: Bearer <startgg_access_token>
// Cachea resultados en Redis por 1 hora

import redis from '../../../lib/redis';

const STARTGG_API = 'https://api.start.gg/gql/alpha';
const SSBU_GAME_ID = 1386;
const CACHE_TTL = 3600; // 1 hora

// Query liviano: sets del jugador (sin filtro de videogame - SetFilters no lo soporta)
const SETS_QUERY = `
query PlayerSets($slug: String!, $page: Int!, $perPage: Int!) {
  user(slug: $slug) {
    player {
      id
      sets(page: $page, perPage: $perPage) {
        pageInfo { total totalPages }
        nodes {
          winnerId
          slots {
            entrant {
              id
              participants { player { id } }
            }
          }
          games {
            winnerId
            selections {
              entrant { id }
              selectionType
              selectionValue
            }
          }
          event {
            videogame { id }
            tournament { name }
          }
        }
      }
    }
  }
}
`;

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

function processSets(allSets, playerId) {
  let totalWins = 0;
  let totalLosses = 0;
  const charCounts = {};
  const charWins = {};
  const tournamentNames = new Set();
  const pid = String(playerId);

  for (const set of allSets) {
    if (!set.slots || set.slots.length < 2) continue;
    // Filtro estricto: solo sets de SSBU (videogame id 1386)
    const vgId = set.event?.videogame?.id;
    if (!vgId || vgId !== SSBU_GAME_ID) continue;

    const mySlot = set.slots.find(s =>
      s.entrant?.participants?.some(p => String(p.player?.id) === pid)
    );
    const myEntrantId = mySlot?.entrant?.id;
    if (!myEntrantId) continue;
    const eid = String(myEntrantId);

    if (set.winnerId != null && String(set.winnerId) === eid) totalWins++;
    else if (set.winnerId != null) totalLosses++;

    if (set.event?.tournament?.name) tournamentNames.add(set.event.tournament.name);

    if (set.games) {
      for (const game of set.games) {
        if (!game.selections || !game.winnerId) continue;
        const mySel = game.selections.find(s =>
          String(s.entrant?.id) === eid && s.selectionType === 'CHARACTER'
        );
        if (mySel?.selectionValue) {
          const cid = mySel.selectionValue;
          charCounts[cid] = (charCounts[cid] || 0) + 1;
          if (String(game.winnerId) === eid) charWins[cid] = (charWins[cid] || 0) + 1;
        }
      }
    }
  }

  const totalGames = Object.values(charCounts).reduce((a, b) => a + b, 0);
  const charUsage = Object.entries(charCounts)
    .map(([charId, count]) => ({
      startggCharId: Number(charId),
      games: count,
      wins: charWins[charId] || 0,
      usage: totalGames > 0 ? Math.round(count * 100 / totalGames) : 0,
    }))
    .sort((a, b) => b.games - a.games);

  return {
    totalSets: allSets.length,
    wins: totalWins,
    losses: totalLosses,
    winRate: (totalWins + totalLosses) > 0 ? Math.round(totalWins * 100 / (totalWins + totalLosses)) : 0,
    tournaments: tournamentNames.size,
    charUsage,
    totalGamesWithChars: totalGames,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const slug = sanitize(req.query.slug);
  if (!slug) return res.status(400).json({ error: 'slug required' });

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Authorization header required' });

  const cacheKey = `startgg:stats:v3:${slug}`;

  // Intentar devolver datos cacheados
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json(typeof cached === 'string' ? JSON.parse(cached) : cached);
    }
  } catch (e) { /* continuar sin cache */ }

  // Fetch a Start.GG — solo 1 página para respetar el timeout de Vercel
  try {
    const resp = await fetch(STARTGG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': auth },
      body: JSON.stringify({
        query: SETS_QUERY,
        variables: { slug, page: 1, perPage: 50 },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error('Start.GG error:', resp.status, errText.slice(0, 200));
      return res.status(resp.status === 401 || resp.status === 403 ? 401 : 502)
        .json({ error: 'Start.GG API error', status: resp.status, detail: errText.slice(0, 100) });
    }

    const data = await resp.json();

    if (data.errors) {
      console.error('GraphQL errors:', JSON.stringify(data.errors).slice(0, 300));
      return res.status(502).json({ error: 'GraphQL error', detail: data.errors[0]?.message });
    }

    const player = data.data?.user?.player;
    if (!player) {
      return res.status(200).json({
        totalSets: 0, wins: 0, losses: 0, winRate: 0,
        tournaments: 0, charUsage: [], totalGamesWithChars: 0,
      });
    }

    const allSets = player.sets?.nodes || [];
    const totalPages = player.sets?.pageInfo?.totalPages || 1;
    const playerId = player.id;

    // Si hay más páginas, intentar obtener más dentro del tiempo restante
    const startTime = Date.now();
    for (let page = 2; page <= Math.min(totalPages, 10); page++) {
      if (Date.now() - startTime > 4000) break; // máximo 4s extra

      try {
        const r = await fetch(STARTGG_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': auth },
          body: JSON.stringify({
            query: SETS_QUERY,
            variables: { slug, page, perPage: 50 },
          }),
        });
        if (!r.ok) break;
        const d = await r.json();
        const nodes = d.data?.user?.player?.sets?.nodes;
        if (!nodes?.length) break;
        allSets.push(...nodes);
      } catch { break; }
    }

    const result = processSets(allSets, playerId);

    // Cachear resultado
    try {
      await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL });
    } catch (e) { /* silent */ }

    return res.status(200).json(result);
  } catch (err) {
    console.error('startgg-stats error:', err.message);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
