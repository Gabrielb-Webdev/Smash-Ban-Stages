// API: obtener estadísticas de carrera de Start.GG para un jugador
// GET /api/players/startgg-stats?slug=ead8fa65
// Header: Authorization: Bearer <startgg_access_token>
// Obtiene TODOS los sets de TODOS los torneos (paginado completo)

const STARTGG_API = 'https://api.start.gg/gql/alpha';
const SSBU_GAME_ID = 1386; // Super Smash Bros. Ultimate en Start.GG
const MAX_PAGES = 20; // Máximo 20 páginas × 50 = hasta 1000 sets

// Query que obtiene player ID + sets en una sola llamada
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
    const allSets = [];
    let playerId = null;
    let totalPages = 1;

    // Paginar TODOS los sets del jugador
    for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page++) {
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
        console.error('Start.GG API error:', resp.status);
        // Si al menos tenemos datos parciales, devolver lo que hay
        if (allSets.length > 0) break;
        return res.status(502).json({ error: 'Start.GG API error', status: resp.status });
      }

      const data = await resp.json();
      if (data.errors) {
        console.error('Start.GG GraphQL errors:', data.errors);
        if (allSets.length > 0) break;
        return res.status(502).json({ error: 'GraphQL error', detail: data.errors[0]?.message });
      }

      const userData = data.data?.user;
      if (!userData?.player) {
        if (allSets.length > 0) break;
        return res.status(404).json({ error: 'Player not found' });
      }

      // Extraer player ID de la primera respuesta (sin llamada extra)
      if (!playerId) {
        playerId = userData.player.id;
      }

      const setsData = userData.player.sets;
      if (!setsData || !setsData.nodes?.length) break;

      totalPages = setsData.pageInfo.totalPages || 1;
      allSets.push(...setsData.nodes);

      // Si ya tenemos todos, salir
      if (page >= totalPages) break;
    }

    if (!playerId || allSets.length === 0) {
      return res.status(200).json({
        totalSets: 0, wins: 0, losses: 0, winRate: 0,
        tournaments: 0, charUsage: [], totalGamesWithChars: 0,
      });
    }

    // Procesar sets: contar personajes usados y estadísticas generales
    let totalWins = 0;
    let totalLosses = 0;
    const charCounts = {};
    const charWins = {};
    const tournamentNames = new Set();

    for (const set of allSets) {
      if (!set.slots || set.slots.length < 2) continue;

      // Determinar slot del jugador
      const mySlot = set.slots.find(s =>
        s.entrant?.participants?.some(p => p.player?.id === playerId)
      );
      const myEntrantId = mySlot?.entrant?.id;
      if (!myEntrantId) continue;

      const won = set.winnerId === myEntrantId;
      if (won) totalWins++;
      else totalLosses++;

      if (set.event?.tournament?.name) {
        tournamentNames.add(set.event.tournament.name);
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
      tournaments: tournamentNames.size,
      charUsage,
      totalGamesWithChars: totalGames,
    });
  } catch (err) {
    console.error('startgg-stats error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}
