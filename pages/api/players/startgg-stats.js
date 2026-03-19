// API: obtener estadísticas de carrera de Start.GG para un jugador
// GET /api/players/startgg-stats?slug=ead8fa65
// Header: Authorization: Bearer <startgg_access_token>

const STARTGG_API = 'https://api.start.gg/gql/alpha';
const SSBU_GAME_ID = 1386; // Super Smash Bros. Ultimate en Start.GG

// Query para obtener sets recientes del jugador en SSBU
const SETS_QUERY = `
query PlayerSets($slug: String!, $page: Int!, $perPage: Int!) {
  user(slug: $slug) {
    id
    player {
      id
      gamerTag
      sets(page: $page, perPage: $perPage, filters: { videogameId: ${SSBU_GAME_ID} }) {
        pageInfo {
          total
          totalPages
          page
          perPage
        }
        nodes {
          id
          displayScore
          winnerId
          slots {
            entrant {
              id
              name
              participants {
                player {
                  id
                }
              }
            }
            standing {
              placement
            }
          }
          games {
            winnerId
            selections {
              entrant {
                id
              }
              selectionType
              selectionValue
            }
          }
          event {
            name
            numEntrants
            tournament {
              name
            }
          }
          completedAt
        }
      }
    }
  }
}
`;

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
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

  try {
    // Obtener hasta 3 páginas de 50 sets cada una (150 sets máximo)
    const allSets = [];
    for (let page = 1; page <= 3; page++) {
      const resp = await fetch(STARTGG_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth,
        },
        body: JSON.stringify({
          query: SETS_QUERY,
          variables: { slug, page, perPage: 50 },
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error('Start.GG API error:', resp.status, errText);
        return res.status(502).json({ error: 'Start.GG API error', status: resp.status });
      }

      const data = await resp.json();
      if (data.errors) {
        console.error('Start.GG GraphQL errors:', data.errors);
        return res.status(502).json({ error: 'GraphQL error', detail: data.errors[0]?.message });
      }

      const setsData = data.data?.user?.player?.sets;
      if (!setsData || !setsData.nodes?.length) break;

      allSets.push(...setsData.nodes);

      if (page >= setsData.pageInfo.totalPages) break;
    }

    // Procesar sets: contar personajes usados y estadísticas generales
    const playerId = (await getPlayerId(slug, auth));
    let totalWins = 0;
    let totalLosses = 0;
    const charCounts = {}; // { charSelectionValue: count }
    const charWins = {};
    let totalEvents = new Set();

    for (const set of allSets) {
      if (!set.slots || set.slots.length < 2) continue;

      // Determinar si el jugador ganó este set
      const mySlot = set.slots.find(s =>
        s.entrant?.participants?.some(p => p.player?.id === playerId)
      );
      const myEntrantId = mySlot?.entrant?.id;
      if (!myEntrantId) continue;

      const won = set.winnerId === myEntrantId;
      if (won) totalWins++;
      else totalLosses++;

      if (set.event?.tournament?.name) {
        totalEvents.add(set.event.tournament.name);
      }

      // Contar personajes de los games dentro del set
      if (set.games && set.games.length > 0) {
        for (const game of set.games) {
          if (!game.selections) continue;
          const mySel = game.selections.find(s =>
            s.entrant?.id === myEntrantId && s.selectionType === 'CHARACTER'
          );
          if (mySel && mySel.selectionValue) {
            const charId = mySel.selectionValue;
            charCounts[charId] = (charCounts[charId] || 0) + 1;
            if (game.winnerId === myEntrantId) {
              charWins[charId] = (charWins[charId] || 0) + 1;
            }
          }
        }
      }
    }

    // Convertir conteos a array ordenado por uso
    const totalGames = Object.values(charCounts).reduce((a, b) => a + b, 0);
    const charUsage = Object.entries(charCounts)
      .map(([charId, count]) => ({
        startggCharId: Number(charId),
        games: count,
        wins: charWins[charId] || 0,
        usage: totalGames > 0 ? Math.round(count * 100 / totalGames) : 0,
      }))
      .sort((a, b) => b.games - a.games);

    return res.status(200).json({
      totalSets: allSets.length,
      wins: totalWins,
      losses: totalLosses,
      winRate: (totalWins + totalLosses) > 0 ? Math.round(totalWins * 100 / (totalWins + totalLosses)) : 0,
      tournaments: totalEvents.size,
      charUsage,
      totalGamesWithChars: totalGames,
    });
  } catch (err) {
    console.error('startgg-stats error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}

// Helper: obtener el player ID numérico de Start.GG
async function getPlayerId(slug, auth) {
  const resp = await fetch(STARTGG_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': auth,
    },
    body: JSON.stringify({
      query: `query { user(slug: "${slug}") { player { id } } }`,
    }),
  });
  const data = await resp.json();
  return data.data?.user?.player?.id || null;
}
