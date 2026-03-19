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

// Mapa de stage IDs de Start.GG para SSBU (competitivos + populares)
const STAGE_MAP = {
  2: 'Battlefield', 3: 'Final Destination', 31: 'Pokemon Stadium 2',
  32: 'Smashville', 34: 'Town and City', 49: 'Kalos Pokemon League',
  50: 'Small Battlefield', 70: 'Hollow Bastion',
  // Otros stages conocidos
  1: 'Peach\'s Castle', 5: 'Kongo Jungle', 6: 'Hyrule Castle',
  7: 'Super Happy Tree', 8: 'Dream Land', 9: 'Saffron City',
  10: 'Mushroom Kingdom', 12: 'Princess Peach\'s Castle', 13: 'Rainbow Cruise',
  14: 'Kongo Falls', 18: 'Fountain of Dreams', 19: 'Pokemon Stadium',
  25: 'Yoshi\'s Story', 26: 'Yoshi\'s Island', 29: 'Lylat Cruise',
  33: 'Unova Pokemon League', 36: 'Midgar', 37: 'Umbra Clock Tower',
  51: 'Northern Cave',
};

// Imagen local para stages competitivos
const STAGE_IMAGES = {
  'Battlefield': '/images/stages/Battlefield.png',
  'Final Destination': '/images/stages/Final Destination.png',
  'Pokemon Stadium 2': '/images/stages/Pokemon Stadium 2.png',
  'Smashville': '/images/stages/Smashville.png',
  'Town and City': '/images/stages/Town and City.png',
  'Kalos Pokemon League': '/images/stages/Kalos.png',
  'Small Battlefield': '/images/stages/Small Battlefield.png',
  'Hollow Bastion': '/images/stages/Hollow Bastion.png',
};

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

// Query para highlights de torneos
const EVENTS_QUERY = `
query PlayerEvents($slug: String!, $evPage: Int!, $evPerPage: Int!) {
  user(slug: $slug) {
    events(query: { page: $evPage, perPage: $evPerPage, filter: { videogameId: [1386] } }) {
      nodes {
        name
        numEntrants
        startAt
        slug
        userEntrant {
          standing {
            placement
          }
        }
        tournament {
          name
          images { url type }
          countryCode
          city
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
  const charSetIds = {};
  const charSetWins = {};
  const charSetMatches = {};
  const charVsChars = {};
  const charVsPlayers = {};
  const tournamentNames = new Set();
  const stageCounts = {}; // stageId → { games, wins }
  const tournamentSets = {}; // tournamentName → { wins, losses, events: Set<eventSlug> }
  const pid = String(playerId);

  let setsProcessed = 0;
  let gamesWithSelections = 0;
  let gamesWithoutSelections = 0;
  for (const set of allSets) {
    if (!set.slots || set.slots.length < 2) continue;
    const vgId = set.event?.videogame?.id;
    if (!vgId || vgId !== SSBU_GAME_ID) continue;

    const mySlot = set.slots.find(s =>
      s.entrant?.participants?.some(p => String(p.player?.id) === pid)
    );
    const myEntrantId = mySlot?.entrant?.id;
    if (!myEntrantId) continue;

    const participantCount = mySlot.entrant.participants?.length || 0;
    if (participantCount !== 1) continue;

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
    if (tName) {
      tournamentNames.add(tName);
      if (!tournamentSets[tName]) tournamentSets[tName] = { wins: 0, losses: 0, events: new Set() };
      if (isWin) tournamentSets[tName].wins++;
      else if (set.winnerId != null) tournamentSets[tName].losses++;
      if (set.event?.slug) tournamentSets[tName].events.add(set.event.slug);
    }

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

        // Collect stage selections
        const stageSel = game.selections.find(s => s.selectionType === 'STAGE');
        if (stageSel?.selectionValue) {
          const stId = stageSel.selectionValue;
          if (!stageCounts[stId]) stageCounts[stId] = { games: 0, wins: 0 };
          stageCounts[stId].games++;
          if (String(game.winnerId) === eid) stageCounts[stId].wins++;
        }

        if (mySel?.selectionValue) {
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

          // Collect match record per set
          if (!charSetMatches[cid]) charSetMatches[cid] = {};
          if (!charSetMatches[cid][setId]) {
            charSetMatches[cid][setId] = {
              tournament: tName || '?',
              round: set.fullRoundText || '?',
              score: set.displayScore || '—',
              opponent: oppName,
              setWin: isWin,
              setLink,
              date: set.completedAt || null,
              games: [],
            };
          }
          charSetMatches[cid][setId].games.push({
            win: gameWon,
            oppCharId,
            oppCharName: oppCharId ? (startggCharMap[oppCharId] || null) : null,
            oppLocalCharId: oppCharId ? (findLocalCharId(startggCharMap[oppCharId]) || null) : null,
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

      // Build vsChars array (sorted by games desc, top 15)
      const vsCharsArr = charVsChars[cid]
        ? Object.entries(charVsChars[cid]).map(([oppCid, d]) => ({
            charId: Number(oppCid),
            charName: startggCharMap[Number(oppCid)] || `unknown-${oppCid}`,
            localCharId: findLocalCharId(startggCharMap[Number(oppCid)]) || null,
            games: d.games,
            wins: d.wins,
            sets: d.sets.size,
            setWins: d.setWins.size,
          })).sort((a, b) => b.games - a.games).slice(0, 15)
        : [];

      // Build vsPlayers array (sorted by sets desc, top 20)
      const vsPlayersArr = charVsPlayers[cid]
        ? Object.entries(charVsPlayers[cid]).map(([name, d]) => ({
            name,
            games: d.games,
            wins: d.wins,
            sets: d.sets.size,
            setWins: d.setWins.size,
          })).sort((a, b) => b.sets - a.sets).slice(0, 20)
        : [];

      // Build matches per set (sorted by date desc, limited to 30)
      const matchSets = charSetMatches[cid]
        ? Object.values(charSetMatches[cid]).sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 30)
        : [];

      return {
        startggCharId: cid,
        charName: startggCharMap[cid] || `unknown-${charId}`,
        localCharId: findLocalCharId(startggCharMap[cid]) || null,
        games: count,
        wins: charWins[charId] || 0,
        sets,
        setWins,
        usage: totalGames > 0 ? Math.round(count * 100 / totalGames) : 0,
        matches: matchSets,
        vsChars: vsCharsArr,
        vsPlayers: vsPlayersArr,
      };
    })
    .sort((a, b) => b.games - a.games);

  // Build stage usage (sorted by games desc)
  const stageUsage = Object.entries(stageCounts)
    .map(([stId, d]) => ({
      stageId: Number(stId),
      name: STAGE_MAP[Number(stId)] || `Stage ${stId}`,
      image: STAGE_IMAGES[STAGE_MAP[Number(stId)]] || null,
      games: d.games,
      wins: d.wins,
      usage: totalGames > 0 ? Math.round(d.games * 100 / totalGames) : 0,
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 8);

  return {
    totalSets: setsProcessed,
    wins: totalWins,
    losses: totalLosses,
    winRate: (totalWins + totalLosses) > 0 ? Math.round(totalWins * 100 / (totalWins + totalLosses)) : 0,
    tournaments: tournamentNames.size,
    charUsage,
    stageUsage,
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

  const cacheKey = `startgg:stats:v16:${slug}`;

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
        variables: { slug, page: 1, perPage: 38 },
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
              variables: { slug, page, perPage: 38 },
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

    // Fetch events/highlights en paralelo con charMap
    let highlights = [];
    try {
      const evResp = await fetch(STARTGG_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': auth },
        body: JSON.stringify({
          query: EVENTS_QUERY,
          variables: { slug, evPage: 1, evPerPage: 16 },
        }),
      });
      if (evResp.ok) {
        const evData = await evResp.json();
        const events = evData.data?.user?.events?.nodes || [];
        highlights = events
          .filter(e => e.userEntrant?.standing?.placement)
          .map(e => {
            const tImg = e.tournament?.images?.find(i => i.type === 'profile') || e.tournament?.images?.[0];
            return {
              event: e.name,
              tournament: e.tournament?.name || e.name,
              placement: e.userEntrant.standing.placement,
              entrants: e.numEntrants || 0,
              date: e.startAt ? new Date(e.startAt * 1000).toISOString().slice(0, 10) : null,
              eventSlug: e.slug ? `https://www.start.gg/${e.slug}` : null,
              tournamentImage: tImg?.url || null,
              country: e.tournament?.countryCode || null,
            };
          })
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      }
    } catch { /* silent */ }

    const result = processSets(allSets, playerId, startggCharMap);
    result.gamerTag = gamerTag;
    result.playerId = playerId;
    result.profile = profile;
    result.highlights = highlights;

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
