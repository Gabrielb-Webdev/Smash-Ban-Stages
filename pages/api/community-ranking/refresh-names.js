/**
 * POST /api/community-ranking/refresh-names
 * Para cada torneo, consulta start.gg y actualiza el playerName en Redis
 * usando el gamerTag ACTUAL del jugador, matcheando por placement.
 * Usa event.standings que devuelve todos los participantes con placement real.
 */
import redis, { crTournamentsKey } from '../../../lib/redis';

const STARTGG_API = 'https://api.start.gg/gql/alpha';

// event.standings es la fuente más confiable de placements finales
const Q_EVENT_STANDINGS_FULL = `
query EventStandingsFull($slug: String!, $page: Int!, $perPage: Int!) {
  event(slug: $slug) {
    standings(query: { page: $page, perPage: $perPage }) {
      pageInfo { totalPages }
      nodes {
        placement
        entrant {
          participants { player { id gamerTag } }
        }
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

// placementMap[placement] = [{ playerId, currentTag }, ...]
async function fetchPlacementMap(token, eventSlug) {
  const placementMap = {};
  let page = 1;
  let totalPages = 1;
  do {
    const data = await gqlQuery(token, Q_EVENT_STANDINGS_FULL, { slug: eventSlug, page, perPage: 64 });
    const standings = data?.event?.standings;
    if (!standings) break;
    totalPages = standings.pageInfo?.totalPages || 1;
    for (const node of (standings.nodes || [])) {
      const placement = node.placement;
      const player = node.entrant?.participants?.[0]?.player;
      if (!placement || !player?.gamerTag) continue;
      if (!placementMap[placement]) placementMap[placement] = [];
      placementMap[placement].push({
        playerId: player.id ? String(player.id) : null,
        currentTag: player.gamerTag,
      });
    }
    page++;
  } while (page <= totalPages && page <= 8);
  return placementMap;
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
  const changes = [];
  const tournamentResults = [];

  for (const t of tournaments) {
    const result = { name: t.name, status: 'skipped', error: null, cleanSlug: null, placementMapSize: 0 };
    try {
      const slug = t.slug;
      if (!slug || typeof slug !== 'string') { result.status = 'no-slug'; tournamentResults.push(result); continue; }

      const cleanSlug = slug
        .replace(/^https?:\/\/(www\.)?start\.gg\//, '')
        .replace(/\/brackets(\/.*)?$/, '')
        .replace(/\/(details|registration|results)(\/.*)?$/, '');

      result.cleanSlug = cleanSlug;

      if (!cleanSlug.includes('/event/')) { result.status = 'no-event-slug'; tournamentResults.push(result); continue; }

      const placementMap = await fetchPlacementMap(token, cleanSlug);
      result.placementMapSize = Object.keys(placementMap).length;

      if (!result.placementMapSize) { result.status = 'empty-placement-map'; tournamentResults.push(result); continue; }

      let tChanged = false;
      for (const s of (t.standings || [])) {
        const sggList = placementMap[s.placement];
        if (!sggList || !sggList.length) continue;

        let match = null;

        // 1. Por playerId
        if (s.playerId) {
          match = sggList.find(x => x.playerId === String(s.playerId)) || null;
        }

        // 2. Placement único → match directo
        if (!match && sggList.length === 1) {
          match = sggList[0];
        }

        // 3. Placement compartido → descarte por eliminación
        if (!match && sggList.length > 1) {
          const ourAtPlacement = (t.standings || []).filter(x => x.placement === s.placement);
          const sggRemaining = sggList.filter(x => !ourAtPlacement.some(o => o.playerName === x.currentTag && o !== s));
          const ourRemaining = ourAtPlacement.filter(o => !sggList.some(x => x.currentTag === o.playerName));
          if (ourRemaining.length === 1 && sggRemaining.length === 1 && ourRemaining[0] === s) {
            match = sggRemaining[0];
          }
        }

        if (!match) continue;

        if (match.playerId && !s.playerId) s.playerId = match.playerId;

        if (match.currentTag !== s.playerName) {
          changes.push({ tournament: t.name, old: s.playerName, new: match.currentTag, placement: s.placement });
          s.playerName = match.currentTag;
          tChanged = true;
          updatedStandings++;
        }
      }

      result.status = tChanged ? 'updated' : 'ok';
      if (tChanged) updatedTournaments++;
    } catch (err) {
      result.status = 'error';
      result.error = err.message;
    }
    tournamentResults.push(result);
  }

  await redis.set(key, JSON.stringify(tournaments));
  return res.status(200).json({
    ok: true,
    updatedTournaments,
    updatedStandings,
    total: tournaments.length,
    changes,
    tournamentResults,
  });
}

import redis, { crTournamentsKey } from '../../../lib/redis';

const STARTGG_API = 'https://api.start.gg/gql/alpha';

const Q_EVENT_ENTRANTS_FULL = `
query EventEntrantsFull($slug: String!, $page: Int!, $perPage: Int!) {
  event(slug: $slug) {
    entrants(query: { page: $page, perPage: $perPage }) {
      pageInfo { totalPages }
      nodes {
        standing { placement }
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

// Devuelve: placementMap[placement] = { playerId, currentTag }
// Solo necesitamos top 128 → máx 2 páginas de 64
async function fetchPlacementMap(token, eventSlug) {
  const placementMap = {};
  let page = 1;
  let totalPages = 1;
  do {
    const data = await gqlQuery(token, Q_EVENT_ENTRANTS_FULL, { slug: eventSlug, page, perPage: 64 });
    const entrants = data?.event?.entrants;
    if (!entrants) break;
    totalPages = Math.min(entrants.pageInfo?.totalPages || 1, 2);
    for (const e of (entrants.nodes || [])) {
      const placement = e.standing?.placement;
      const player = e.participants?.[0]?.player;
      if (!placement || !player?.gamerTag) continue;
      // Para placements únicos guardamos directamente; para compartidos guardamos array
      if (!placementMap[placement]) placementMap[placement] = [];
      placementMap[placement].push({ playerId: player.id ? String(player.id) : null, currentTag: player.gamerTag });
    }
    page++;
  } while (page <= totalPages);
  return placementMap;
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
  const changes = [];
  const tournamentResults = []; // debug

  for (const t of tournaments) {
    const result = { name: t.name, slug: t.slug, status: 'skipped', error: null };
    try {
      const slug = t.slug;
      if (!slug || typeof slug !== 'string') { result.status = 'no-slug'; tournamentResults.push(result); continue; }

      const cleanSlug = slug
        .replace(/^https?:\/\/(www\.)?start\.gg\//, '')
        .replace(/\/brackets(\/.*)?$/, '')
        .replace(/\/(details|registration|results)(\/.*)?$/, '');

      if (!cleanSlug.includes('/event/')) { result.status = 'no-event-slug'; result.cleanSlug = cleanSlug; tournamentResults.push(result); continue; }

      result.cleanSlug = cleanSlug;
      const placementMap = await fetchPlacementMap(token, cleanSlug);
      result.placementMapSize = Object.keys(placementMap).length;

      if (!result.placementMapSize) { result.status = 'empty-placement-map'; tournamentResults.push(result); continue; }

      let tChanged = false;
      for (const s of (t.standings || [])) {
        const sggList = placementMap[s.placement];
        if (!sggList || !sggList.length) continue;

        let match = null;

        // 1. Match por playerId si ya lo tenemos
        if (s.playerId) {
          match = sggList.find(x => x.playerId === String(s.playerId)) || null;
        }

        // 2. Si placement es único → match directo (caso más común: top 4)
        if (!match && sggList.length === 1) {
          match = sggList[0];
        }

        // 3. Placement compartido con > 1 entrant: descartar los que ya coinciden
        if (!match && sggList.length > 1) {
          // Cuántos de nuestros standings tienen este mismo placement
          const ourAtPlacement = (t.standings || []).filter(x => x.placement === s.placement);
          const sggRemaining = sggList.filter(x => !ourAtPlacement.some(o => o.playerName === x.currentTag && o !== s));
          const ourRemaining = ourAtPlacement.filter(o => !sggList.some(x => x.currentTag === o.playerName));
          if (ourRemaining.length === 1 && sggRemaining.length === 1 && ourRemaining[0] === s) {
            match = sggRemaining[0];
          }
        }

        if (!match) continue;

        // Guardar playerId aunque el nombre ya esté bien
        if (match.playerId && !s.playerId) s.playerId = match.playerId;

        if (match.currentTag !== s.playerName) {
          changes.push({ tournament: t.name, old: s.playerName, new: match.currentTag, placement: s.placement });
          s.playerName = match.currentTag;
          tChanged = true;
          updatedStandings++;
        }
      }

      result.status = tChanged ? 'updated' : 'ok';
      if (tChanged) updatedTournaments++;
    } catch (err) {
      result.status = 'error';
      result.error = err.message;
    }
    tournamentResults.push(result);
  }

  await redis.set(key, JSON.stringify(tournaments));
  return res.status(200).json({
    ok: true,
    updatedTournaments,
    updatedStandings,
    total: tournaments.length,
    changes,
    tournamentResults, // debug: ver en la consola del navegador / Network tab
  });
}
