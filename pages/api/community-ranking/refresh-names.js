/**
 * POST /api/community-ranking/refresh-names
 * Recorre todos los torneos de una comunidad/año y actualiza el playerName
 * usando el gamerTag ACTUAL de start.gg, buscando por player.id (estable).
 *
 * Estrategia:
 *  1. Consulta phaseGroup.standings → entrant.name (nombre de registro/bracket)
 *     + participants.player.id + gamerTag (nombre actual)
 *  2. Construye idMap (playerId → currentGamerTag)
 *     y regNameMap (nombreRegistro → { playerId, currentGamerTag })
 *  3. Para standings con playerId → actualiza nombre por ID directamente
 *  4. Para standings sin playerId → busca por entrantName/playerName en regNameMap
 *     y asigna playerId para uso futuro
 *
 * La diferencia clave vs event.entrants: phaseGroup.standings devuelve el
 * nombre de registro original del bracket (snapshot), mientras que
 * event.entrants puede devolver el nombre actualizado al actual.
 */
import redis, { crTournamentsKey } from '../../../lib/redis';

const STARTGG_API = 'https://api.start.gg/gql/alpha';

// Obtiene las phase groups de un evento
const Q_EVENT_PHASE_GROUPS = `
query EventPhaseGroups($slug: String!) {
  event(slug: $slug) {
    phases {
      phaseGroups(query: { page: 1, perPage: 30 }) {
        nodes { id }
      }
    }
  }
}`;

// standings de una phaseGroup: preserva el nombre de registro original del bracket
const Q_PHASE_GROUP_NAMES = `
query PhaseGroupNames($phaseGroupId: ID!, $page: Int!, $perPage: Int!) {
  phaseGroup(id: $phaseGroupId) {
    standings(query: { page: $page, perPage: $perPage }) {
      pageInfo { totalPages }
      nodes {
        entrant {
          name
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

/**
 * Construye los mapas de nombres para un torneo.
 * Usa phaseGroup.standings (registro-time) para cada phase group del evento.
 * Devuelve:
 *  idMap:      playerId (string) → currentGamerTag
 *  regNameMap: registrationName.toLowerCase() → { playerId, currentGamerTag }
 */
async function buildNameMaps(token, phaseGroupIds) {
  const idMap = {};
  const regNameMap = {};

  for (const pgId of phaseGroupIds) {
    let page = 1;
    let totalPages = 1;
    do {
      try {
        const data = await gqlQuery(token, Q_PHASE_GROUP_NAMES, { phaseGroupId: pgId, page, perPage: 64 });
        const standings = data?.phaseGroup?.standings;
        if (!standings) break;
        totalPages = standings.pageInfo?.totalPages || 1;
        for (const node of (standings.nodes || [])) {
          const player = node.entrant?.participants?.[0]?.player;
          const regName = node.entrant?.name; // nombre en el bracket (snapshot)
          const currentTag = player?.gamerTag; // nombre actual
          const playerId = player?.id ? String(player.id) : null;
          if (!currentTag) continue;
          if (playerId) {
            idMap[playerId] = currentTag;
          }
          if (regName) {
            regNameMap[regName.toLowerCase()] = { playerId, currentGamerTag: currentTag };
          }
        }
      } catch { break; }
      page++;
    } while (page <= totalPages && page <= 5);
  }

  return { idMap, regNameMap };
}

/** Obtiene los IDs de todas las phase groups de un evento */
async function getPhaseGroupIds(token, eventSlug) {
  const data = await gqlQuery(token, Q_EVENT_PHASE_GROUPS, { slug: eventSlug });
  const ids = [];
  for (const phase of (data?.event?.phases || [])) {
    for (const pg of (phase.phaseGroups?.nodes || [])) {
      if (pg.id) ids.push(String(pg.id));
    }
  }
  return ids;
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
      // Obtener los IDs de phase groups para este torneo
      let phaseGroupIds = [];

      // Caso A: IDs ya almacenados (torneos cargados por bracket URL)
      if (t.loadedPhaseGroups?.length) {
        phaseGroupIds = t.loadedPhaseGroups.map(String);
      }

      // Caso B: tenemos event slug → consultar phases
      if (!phaseGroupIds.length && t.slug) {
        const cleanSlug = t.slug
          .replace(/^https?:\/\/(www\.)?start\.gg\//, '')
          .replace(/\/brackets(\/.*)?$/, '')
          .replace(/\/(details|registration|results)(\/.*)?$/, '');
        if (cleanSlug.includes('/event/')) {
          try {
            phaseGroupIds = await getPhaseGroupIds(token, cleanSlug);
          } catch { /* continuar */ }
        }
      }

      if (!phaseGroupIds.length) continue;

      const { idMap, regNameMap } = await buildNameMaps(token, phaseGroupIds);
      if (!Object.keys(idMap).length && !Object.keys(regNameMap).length) continue;

      let tChanged = false;
      for (const s of (t.standings || [])) {
        let currentTag = null;

        // 1. Búsqueda por playerId (más fiable, ID estable en start.gg)
        if (s.playerId) {
          currentTag = idMap[String(s.playerId)] || null;
        }

        // 2. Búsqueda por nombre de registro del bracket (snapshot, puede diferir del actual)
        if (!currentTag) {
          const byEntrant = s.entrantName ? regNameMap[s.entrantName.toLowerCase()] : null;
          if (byEntrant) {
            currentTag = byEntrant.currentGamerTag;
            // Aprovechar para guardar el playerId si no lo teníamos
            if (!s.playerId && byEntrant.playerId) s.playerId = byEntrant.playerId;
          }
        }

        // 3. Fallback: buscar por playerName actual en regNameMap
        if (!currentTag && s.playerName) {
          const byName = regNameMap[s.playerName.toLowerCase()];
          if (byName) {
            currentTag = byName.currentGamerTag;
            if (!s.playerId && byName.playerId) s.playerId = byName.playerId;
          }
        }

        if (currentTag && currentTag !== s.playerName) {
          changes.push({ tournament: t.name, old: s.playerName, new: currentTag });
          s.playerName = currentTag;
          tChanged = true;
          updatedStandings++;
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
