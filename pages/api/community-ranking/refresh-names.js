/**
 * POST /api/community-ranking/refresh-names
 * Para cada torneo, consulta start.gg y actualiza el playerName en Redis
 * usando el gamerTag ACTUAL del jugador.
 *
 * start.gg siempre devuelve el nombre actual → no se puede matchear por nombre.
 * Solución: matchear por PLACEMENT (posición) dentro del mismo evento.
 *   - placement 2 en nuestros datos = placement 2 en start.gg = mismo jugador
 */
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

 *     - Para placements únicos (1°, 2°, 3°, 4°) → match directo
 *     - Para placements compartidos (5°-6°, 7°-8°, 9°-12°) → match por
 *       eliminación (los que ya coinciden en nombre se descartan)
 *  3. Guardar el playerId descubierto para futuros refreshes
 */
import redis, { crTournamentsKey } from '../../../lib/redis';

const STARTGG_API = 'https://api.start.gg/gql/alpha';

const Q_EVENT_ENTRANTS_FULL = `
query EventEntrantsFull($slug: String!, $page: Int!, $perPage: Int!) {
  event(slug: $slug) {
    entrants(query: { page: $page, perPage: $perPage }) {
      pageInfo { total totalPages }
      nodes {
        standing { placement }
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
 * Obtiene todos los entrants del evento con placement, player.id y gamerTag actual.
 * Devuelve:
 *  idMap:        playerId → currentGamerTag
 *  placementMap: placement → [{ playerId, currentTag }]
 */
async function fetchEntrantData(token, eventSlug) {
  const idMap = {};
  const placementMap = {};
  let page = 1;
  let totalPages = 1;

  do {
    try {
      const data = await gqlQuery(token, Q_EVENT_ENTRANTS_FULL, { slug: eventSlug, page, perPage: 64 });
      const entrants = data?.event?.entrants;
      if (!entrants) break;
      totalPages = entrants.pageInfo?.totalPages || 1;
      for (const e of (entrants.nodes || [])) {
        const placement = e.standing?.placement;
        const player = e.participants?.[0]?.player;
        const currentTag = player?.gamerTag || e.name;
        const playerId = player?.id ? String(player.id) : null;
        if (!placement || !currentTag) continue;

        if (playerId) idMap[playerId] = currentTag;

        if (!placementMap[placement]) placementMap[placement] = [];
        placementMap[placement].push({ playerId, currentTag });
      }
    } catch { break; }
    page++;
  } while (page <= totalPages && page <= 8);

  return { idMap, placementMap };
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

  for (const t of tournaments) {
    try {
      // Extraer event slug
      const slug = t.slug;
      if (!slug || typeof slug !== 'string') continue;
      const cleanSlug = slug
        .replace(/^https?:\/\/(www\.)?start\.gg\//, '')
        .replace(/\/brackets(\/.*)?$/, '')
        .replace(/\/(details|registration|results)(\/.*)?$/, '');
      if (!cleanSlug.includes('/event/')) continue;

      const { idMap, placementMap } = await fetchEntrantData(token, cleanSlug);
      if (!Object.keys(placementMap).length) continue;

      let tChanged = false;
      const standings = t.standings || [];

      // ── Paso 1: Match por playerId (para standings que ya lo tienen) ──
      for (const s of standings) {
        if (!s.playerId) continue;
        const currentTag = idMap[String(s.playerId)];
        if (currentTag && currentTag !== s.playerName) {
          changes.push({ tournament: t.name, old: s.playerName, new: currentTag });
          s.playerName = currentTag;
          tChanged = true;
          updatedStandings++;
        }
      }

      // ── Paso 2: Match por placement (para standings SIN playerId) ──
      // Agrupar nuestros standings sin playerId por placement
      const needMatch = standings.filter(s => !s.playerId);
      const byPlacement = {};
      for (const s of needMatch) {
        if (!byPlacement[s.placement]) byPlacement[s.placement] = [];
        byPlacement[s.placement].push(s);
      }

      for (const [placement, ourEntries] of Object.entries(byPlacement)) {
        const sggEntries = placementMap[placement];
        if (!sggEntries || !sggEntries.length) continue;

        // Descartar los que ya coinciden en nombre (ya están bien)
        const alreadyMatched = new Set();
        const sggRemaining = [];
        for (const sgg of sggEntries) {
          const exactMatch = ourEntries.find(s =>
            !alreadyMatched.has(s) && s.playerName === sgg.currentTag
          );
          if (exactMatch) {
            // Nombre ya correcto, pero asignar playerId si no lo tiene
            if (!exactMatch.playerId && sgg.playerId) {
              exactMatch.playerId = sgg.playerId;
              tChanged = true;
            }
            alreadyMatched.add(exactMatch);
          } else {
            sggRemaining.push(sgg);
          }
        }

        const ourRemaining = ourEntries.filter(s => !alreadyMatched.has(s));

        // Si queda exactamente 1 de cada lado → match directo
        if (ourRemaining.length === 1 && sggRemaining.length === 1) {
          const s = ourRemaining[0];
          const sgg = sggRemaining[0];
          if (sgg.currentTag !== s.playerName) {
            changes.push({ tournament: t.name, old: s.playerName, new: sgg.currentTag });
            s.playerName = sgg.currentTag;
            updatedStandings++;
            tChanged = true;
          }
          if (sgg.playerId) s.playerId = sgg.playerId;
        }
        // Si hay N restantes de cada lado con N <= 3, intentar matchear 1:1
        // (todos en la misma posición, asignamos en orden)
        else if (ourRemaining.length === sggRemaining.length && ourRemaining.length > 0 && ourRemaining.length <= 4) {
          // No hay forma de saber cuál es cuál con certeza, pero podemos
          // asignar por orden y al menos el playerId queda para el futuro
          for (let i = 0; i < ourRemaining.length; i++) {
            const s = ourRemaining[i];
            const sgg = sggRemaining[i];
            if (sgg.currentTag !== s.playerName) {
              changes.push({ tournament: t.name, old: s.playerName, new: sgg.currentTag, uncertain: true });
              s.playerName = sgg.currentTag;
              updatedStandings++;
              tChanged = true;
            }
            if (sgg.playerId) s.playerId = sgg.playerId;
          }
        }
      }

      if (tChanged) updatedTournaments++;
    } catch { /* continuar con el siguiente torneo */ }
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
