// API: obtener estadísticas de carrera de Start.GG para un jugador
// GET /api/players/startgg-stats?slug=ead8fa65
// Header: Authorization: Bearer <startgg_access_token>
// Cachea resultados en Redis por 1 hora

import redis from '../../../lib/redis';
import { findLocalCharId } from '../../../lib/characters';

const STARTGG_API = 'https://api.start.gg/gql/alpha';
const SSBU_GAME_ID = 1386;
const CACHE_TTL = 3600; // 1 hora
const CHAR_CACHE_TTL = 86400; // 24 horas para el mapa de personajes

// Query para obtener personajes del videojuego desde Start.GG
const CHARACTERS_QUERY = `
query VideoGameCharacters($gameId: ID!) {
  videogame(id: $gameId) {
    characters {
      id
      name
    }
  }
}
`;

/** Obtiene el mapa charId → nombre desde Start.GG API (cacheado 24h en Redis) */
async function fetchStartggCharMap(authHeader) {
  const cacheKey = 'startgg:charmap:ssbu';
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch { /* continuar sin cache */ }

  const resp = await fetch(STARTGG_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
    body: JSON.stringify({ query: CHARACTERS_QUERY, variables: { gameId: SSBU_GAME_ID } }),
  });

  if (!resp.ok) return {};
  const data = await resp.json();
  if (data.errors || !data.data?.videogame?.characters) return {};

  const charMap = {};
  for (const c of data.data.videogame.characters) {
    charMap[c.id] = c.name;
  }

  try { await redis.set(cacheKey, JSON.stringify(charMap), { ex: CHAR_CACHE_TTL }); } catch { /* silent */ }
  return charMap;
}

// Query completa (primera página): incluye perfil del jugador
const SETS_QUERY = `
query PlayerSets($slug: String!, $page: Int!, $perPage: Int!) {
  user(slug: $slug) {
    id
    slug
    name
    bio
    birthday
    genderPronoun
    location {
      city
      state
      country
      countryId
    }
    images {
      url
      type
    }
    authorizations {
      type
      externalUsername
      url
    }
    player {
      id
      gamerTag
      prefix
      rankings(videogameId: 1386) {
        rank
        title
      }
      sets(page: $page, perPage: $perPage) {
        pageInfo { total totalPages }
        nodes {
          id
          winnerId
          fullRoundText
          displayScore
          completedAt
          slots {
            entrant {
              id
              name
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
            slug
            tournament { name }
          }
        }
      }
    }
  }
}
`;

// Query ligera (páginas extra): solo sets, sin profile
const SETS_ONLY_QUERY = `
query PlayerSetsPage($slug: String!, $page: Int!, $perPage: Int!) {
  user(slug: $slug) {
    player {
      sets(page: $page, perPage: $perPage) {
        nodes {
          id
          winnerId
          fullRoundText
          displayScore
          completedAt
          slots {
            entrant {
              id
              name
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
            slug
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

function processSets(allSets, playerId, startggCharMap = {}) {
  let totalWins = 0;
  let totalLosses = 0;
  const charCounts = {};
  const charWins = {};
  const charSetIds = {}; // charId → Set of set IDs where this char was used
  const charSetWins = {}; // charId → Set of set IDs won with this char
  const charMatches = {}; // charId → [{ tournament, round, score, opponent, opponentCharId, opponentCharName, win, setLink, date }]
  const charVsChars = {}; // charId → { oppCharId → { games, wins, sets: Set, setWins: Set } }
  const charVsPlayers = {}; // charId → { oppName → { games, wins, sets: Set, setWins: Set } }
  const tournamentNames = new Set();
  const pid = String(playerId);

  // Debug counters
  let skippedNoSlots = 0;
  let skippedNotSSBU = 0;
  let skippedNoEntrant = 0;
  let skippedDoubles = 0;
  let setsProcessed = 0;
  let gamesWithSelections = 0;
  let gamesWithoutSelections = 0;
  let matchedByDirectId = 0;
  let matchedByExclusion = 0;
  for (const set of allSets) {
    if (!set.slots || set.slots.length < 2) { skippedNoSlots++; continue; }
    const vgId = set.event?.videogame?.id;
    if (!vgId || vgId !== SSBU_GAME_ID) { skippedNotSSBU++; continue; }

    const mySlot = set.slots.find(s =>
      s.entrant?.participants?.some(p => String(p.player?.id) === pid)
    );
    const myEntrantId = mySlot?.entrant?.id;
    if (!myEntrantId) { skippedNoEntrant++; continue; }

    const participantCount = mySlot.entrant.participants?.length || 0;
    if (participantCount !== 1) { skippedDoubles++; continue; }

    setsProcessed++;
    const eid = String(myEntrantId);

    // Get opponent info for exclusion-based matching
    const opponentSlot = set.slots.find(s => s !== mySlot);
    const opponentEntrantId = opponentSlot?.entrant?.id;
    const oeid = opponentEntrantId ? String(opponentEntrantId) : null;

    const isWin = set.winnerId != null && String(set.winnerId) === eid;
    if (set.winnerId != null) {
      if (isWin) totalWins++;
      else totalLosses++;
    }

    const tName = set.event?.tournament?.name;
    if (tName) tournamentNames.add(tName);

    // Build set link using event.slug (already contains full path)
    const eSlug = set.event?.slug;
    const setId = set.id;
    const setLink = (eSlug && setId)
      ? `https://www.start.gg/${eSlug}/set/${setId}`
      : null;

    if (set.games) {
      for (const game of set.games) {
        if (!game.selections || !game.winnerId) continue;

        const allCharSels = game.selections.filter(s => s.selectionType === 'CHARACTER');

        // Strategy 1: Direct entrant ID match
        let mySel = allCharSels.find(s => String(s.entrant?.id) === eid);
        let matchMethod = 'direct';

        // Strategy 2: Exclusion — if direct match fails, take the selection
        // that is NOT the opponent's (works when entrant IDs differ between slots & selections)
        if (!mySel && oeid && allCharSels.length >= 2) {
          const notOpponent = allCharSels.filter(s => String(s.entrant?.id) !== oeid);
          if (notOpponent.length === 1) {
            mySel = notOpponent[0];
            matchMethod = 'exclusion';
          }
        }

        if (mySel?.selectionValue) {
          if (matchMethod === 'direct') matchedByDirectId++;
          else matchedByExclusion++;
          gamesWithSelections++;
          const cid = mySel.selectionValue;
          const gameWon = String(game.winnerId) === eid;
          charCounts[cid] = (charCounts[cid] || 0) + 1;
          if (gameWon) charWins[cid] = (charWins[cid] || 0) + 1;

          // Track sets per char
          if (!charSetIds[cid]) charSetIds[cid] = new Set();
          charSetIds[cid].add(setId);
          if (isWin) {
            if (!charSetWins[cid]) charSetWins[cid] = new Set();
            charSetWins[cid].add(setId);
          }

          // Opponent char info
          const opponentSel = allCharSels.find(s => s !== mySel && s.selectionType === 'CHARACTER');
          const oppCharId = opponentSel?.selectionValue || null;
          const oppName = opponentSlot?.entrant?.name || '?';

          // Collect match record
          if (!charMatches[cid]) charMatches[cid] = [];
          charMatches[cid].push({
            tournament: tName || '?',
            round: set.fullRoundText || '?',
            score: set.displayScore || '—',
            opponent: oppName,
            opponentCharId: oppCharId,
            opponentCharName: oppCharId ? (startggCharMap[oppCharId] || null) : null,
            win: gameWon,
            setWin: isWin,
            setLink,
            date: set.completedAt || null,
          });

          // vs Characters
          if (oppCharId) {
            if (!charVsChars[cid]) charVsChars[cid] = {};
            if (!charVsChars[cid][oppCharId]) charVsChars[cid][oppCharId] = { games: 0, wins: 0, sets: new Set(), setWins: new Set() };
            charVsChars[cid][oppCharId].games++;
            if (gameWon) charVsChars[cid][oppCharId].wins++;
            charVsChars[cid][oppCharId].sets.add(setId);
            if (isWin) charVsChars[cid][oppCharId].setWins.add(setId);
          }

          // vs Players
          if (!charVsPlayers[cid]) charVsPlayers[cid] = {};
          if (!charVsPlayers[cid][oppName]) charVsPlayers[cid][oppName] = { games: 0, wins: 0, sets: new Set(), setWins: new Set() };
          charVsPlayers[cid][oppName].games++;
          if (gameWon) charVsPlayers[cid][oppName].wins++;
          charVsPlayers[cid][oppName].sets.add(setId);
          if (isWin) charVsPlayers[cid][oppName].setWins.add(setId);
        } else {
          gamesWithoutSelections++;
        }
      }
    }
  }

  const totalGames = Object.values(charCounts).reduce((a, b) => a + b, 0);
  const charUsage = Object.entries(charCounts)
    .map(([charId, count]) => {
      const cid = Number(charId);
      const sets = charSetIds[cid]?.size || 0;
      const setWins = charSetWins[cid]?.size || 0;

      // Build vsChars array (sorted by games desc)
      const vsCharsArr = charVsChars[cid]
        ? Object.entries(charVsChars[cid]).map(([oppCid, d]) => ({
            charId: Number(oppCid),
            charName: startggCharMap[Number(oppCid)] || `unknown-${oppCid}`,
            localCharId: findLocalCharId(startggCharMap[Number(oppCid)]) || null,
            games: d.games,
            wins: d.wins,
            sets: d.sets.size,
            setWins: d.setWins.size,
          })).sort((a, b) => b.games - a.games)
        : [];

      // Build vsPlayers array (sorted by sets desc)
      const vsPlayersArr = charVsPlayers[cid]
        ? Object.entries(charVsPlayers[cid]).map(([name, d]) => ({
            name,
            games: d.games,
            wins: d.wins,
            sets: d.sets.size,
            setWins: d.setWins.size,
          })).sort((a, b) => b.sets - a.sets)
        : [];

      // Build matches (sorted by date desc)
      const matches = (charMatches[cid] || []).sort((a, b) => (b.date || 0) - (a.date || 0));

      return {
        startggCharId: cid,
        charName: startggCharMap[cid] || `unknown-${charId}`,
        localCharId: findLocalCharId(startggCharMap[cid]) || null,
        games: count,
        wins: charWins[charId] || 0,
        sets,
        setWins,
        usage: totalGames > 0 ? Math.round(count * 100 / totalGames) : 0,
        matches,
        vsChars: vsCharsArr,
        vsPlayers: vsPlayersArr,
      };
    })
    .sort((a, b) => b.games - a.games);

  return {
    debug: {
      totalSetsFetched: allSets.length,
      skippedNoSlots,
      skippedNotSSBU,
      skippedNoEntrant,
      skippedDoubles,
      setsProcessed,
      gamesWithSelections,
      gamesWithoutSelections,
      matchedByDirectId,
      matchedByExclusion,
    },
    totalSets: setsProcessed,
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

  const cacheKey = `startgg:stats:v14:${slug}`;

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

    const user = data.data?.user;
    const player = user?.player;
    if (!player) {
      return res.status(200).json({
        totalSets: 0, wins: 0, losses: 0, winRate: 0,
        tournaments: 0, charUsage: [], totalGamesWithChars: 0,
      });
    }

    const allSets = player.sets?.nodes || [];
    const totalPages = player.sets?.pageInfo?.totalPages || 1;
    const playerId = player.id;
    const gamerTag = player.gamerTag || null;

    // Info del perfil de Start.GG
    const profile = {
      userId: user.id,
      slug: user.slug,
      name: user.name,
      bio: user.bio,
      birthday: user.birthday,
      genderPronoun: user.genderPronoun,
      location: user.location,
      images: user.images,
      socials: user.authorizations,
      prefix: player.prefix,
      rankings: player.rankings,
    };

    // Fetch paralelo de páginas extra con query ligera
    let actualPagesFetched = 1;
    if (totalPages > 1) {
      const maxPages = Math.min(totalPages, 20); // hasta 20 páginas = 1000 sets
      const fetchPage = async (page) => {
        try {
          const r = await fetch(STARTGG_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': auth },
            body: JSON.stringify({
              query: SETS_ONLY_QUERY,
              variables: { slug, page, perPage: 50 },
            }),
          });
          if (!r.ok) return [];
          const d = await r.json();
          return d.data?.user?.player?.sets?.nodes || [];
        } catch { return []; }
      };

      // Batch paralelo: 5 páginas a la vez
      for (let batchStart = 2; batchStart <= maxPages; batchStart += 5) {
        const batchEnd = Math.min(batchStart + 4, maxPages);
        const pageNums = [];
        for (let p = batchStart; p <= batchEnd; p++) pageNums.push(p);

        const results = await Promise.all(pageNums.map(p => fetchPage(p)));
        let gotData = false;
        for (const nodes of results) {
          if (nodes.length > 0) {
            allSets.push(...nodes);
            actualPagesFetched++;
            gotData = true;
          }
        }
        if (!gotData) break; // si ninguna página del batch trajo data, parar
      }
    }

    const startggCharMap = await fetchStartggCharMap(auth);
    const result = processSets(allSets, playerId, startggCharMap);
    result.gamerTag = gamerTag;
    result.playerId = playerId;
    result.profile = profile;
    result.debug.slug = slug;
    result.debug.totalPagesAvailable = totalPages;
    result.debug.pagesFetched = actualPagesFetched;
    result.debug.totalSetsFetchedRaw = allSets.length;

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
