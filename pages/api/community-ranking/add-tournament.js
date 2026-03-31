import redis, { crTournamentsKey } from '../../../lib/redis';
import { getPositionPoints, MIN_ATTENDEES } from '../../../lib/communityRanking';
import { findLocalCharId } from '../../../lib/characters';

const STARTGG_API = 'https://api.start.gg/gql/alpha';

// ── start.gg GQL queries ────────────────────────────────────────────────────

const Q_TOURNAMENT_EVENTS = `
query TournamentEvents($slug: String!) {
  tournament(slug: $slug) {
    id name slug numAttendees startAt
    events { id name slug numEntrants videogame { id name } }
  }
}`;

const Q_EVENT_ENTRANTS = `
query EventEntrants($slug: String!, $page: Int!, $perPage: Int!) {
  event(slug: $slug) {
    id name numEntrants
    tournament { name slug numAttendees startAt }
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

// Query para fases de un evento con sus phase groups
const Q_EVENT_PHASES = `
query EventPhases($slug: String!) {
  event(slug: $slug) {
    id name numEntrants
    tournament { name slug startAt numAttendees }
    phases {
      id name numSeeds
      phaseGroups(query: { page: 1, perPage: 20 }) {
        nodes { id displayIdentifier }
      }
    }
  }
}`;

// Query para una fase específica (phaseGroup) de un torneo
const Q_PHASE_GROUP_STANDINGS = `
query PhaseGroupStandings($phaseGroupId: ID!, $page: Int!, $perPage: Int!) {
  phaseGroup(id: $phaseGroupId) {
    id displayIdentifier numRounds
    phase {
      id name
      event {
        id name numEntrants
        tournament { name slug startAt numAttendees }
      }
    }
    standings(query: { page: $page, perPage: $perPage }) {
      pageInfo { total totalPages }
      nodes {
        placement
        entrant {
          name
          participants { player { id gamerTag } }
        }
      }
    }
  }
}`;

/**
 * Retorna null si la fase debe ignorarse (resurrección / side event), 'valid' si cuenta.
 */
function classifyPhase(name) {
  if (/resurrect|repechage|repesca/i.test(name)) return null;
  if (/side[\s\-_]?event/i.test(name)) return null;
  return 'valid';
}

// Query para personajes usados en un evento
const Q_EVENT_CHARS = `
query EventChars($slug: String!, $page: Int!, $perPage: Int!) {
  event(slug: $slug) {
    sets(page: $page, perPage: $perPage, filters: { state: 3 }) {
      pageInfo { totalPages }
      nodes {
        games {
          selections {
            entrant { participants { player { gamerTag } } }
            selectionType
            selectionValue
          }
        }
      }
    }
  }
}`;

// Mapa de IDs de start.gg a nombres de personajes SSBU (top usados, para fallback)
const STARTGG_CHAR_NAMES = {
  1: 'Mario', 2: 'Donkey Kong', 3: 'Link', 4: 'Samus', 5: 'Dark Samus',
  6: 'Yoshi', 7: 'Kirby', 8: 'Fox', 9: 'Pikachu', 10: 'Luigi',
  11: 'Ness', 12: 'Captain Falcon', 13: 'Jigglypuff', 14: 'Peach', 15: 'Daisy',
  16: 'Bowser', 17: 'Ice Climbers', 18: 'Sheik', 19: 'Zelda', 20: 'Dr. Mario',
  21: 'Pichu', 22: 'Falco', 23: 'Marth', 24: 'Lucina', 25: 'Young Link',
  26: 'Ganondorf', 27: 'Mewtwo', 28: 'Roy', 29: 'Chrom', 30: 'Mr. Game & Watch',
  31: 'Meta Knight', 32: 'Pit', 33: 'Dark Pit', 34: 'Zero Suit Samus', 35: 'Wario',
  36: 'Snake', 37: 'Ike', 38: 'Pokemon Trainer', 39: 'Diddy Kong', 40: 'Lucas',
  41: 'Sonic', 42: 'King Dedede', 43: 'Olimar', 44: 'Lucario', 45: 'R.O.B.',
  46: 'Toon Link', 47: 'Wolf', 48: 'Villager', 49: 'Mega Man', 50: 'Wii Fit Trainer',
  51: 'Rosalina & Luma', 52: 'Little Mac', 53: 'Greninja', 54: 'Mii Brawler',
  55: 'Mii Swordfighter', 56: 'Mii Gunner', 57: 'Palutena', 58: 'Pac-Man',
  59: 'Robin', 60: 'Shulk', 61: 'Bowser Jr.', 62: 'Duck Hunt', 63: 'Ryu',
  64: 'Ken', 65: 'Cloud', 66: 'Corrin', 67: 'Bayonetta', 68: 'Inkling',
  69: 'Ridley', 70: 'Simon', 71: 'Richter', 72: 'King K. Rool', 73: 'Isabelle',
  74: 'Incineroar', 75: 'Piranha Plant', 76: 'Joker', 77: 'Hero', 78: 'Banjo & Kazooie',
  79: 'Terry', 80: 'Byleth', 81: 'Min Min', 82: 'Steve', 83: 'Sephiroth',
  84: 'Pyra/Mythra', 85: 'Kazuya', 86: 'Sora',
};

/** Obtiene el personaje más usado por cada gamer tag en los sets de un evento */
async function fetchEventCharMap(token, eventSlug) {
  const charCount = {}; // gamerTag → { charId → count }
  let page = 1, totalPages = 1;
  const perPage = 50;

  do {
    try {
      const data = await gqlQuery(token, Q_EVENT_CHARS, { slug: eventSlug, page, perPage });
      const sets = data?.event?.sets;
      if (!sets) break;
      totalPages = sets.pageInfo?.totalPages || 1;
      for (const set of (sets.nodes || [])) {
        for (const game of (set.games || [])) {
          for (const sel of (game.selections || [])) {
            if (sel.selectionType !== 'CHARACTER' && sel.selectionType !== 0) continue;
            const tag = sel.entrant?.participants?.[0]?.player?.gamerTag;
            const charId = sel.selectionValue;
            if (!tag || !charId) continue;
            if (!charCount[tag]) charCount[tag] = {};
            charCount[tag][charId] = (charCount[tag][charId] || 0) + 1;
          }
        }
      }
    } catch { break; }
    page++;
  } while (page <= totalPages && page <= 4);

  // Convertir charCount en topChar (charId más frecuente) → local charId
  const result = {};
  for (const [tag, counts] of Object.entries(charCount)) {
    const topStartggId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topStartggId) continue;
    const charName = STARTGG_CHAR_NAMES[Number(topStartggId)];
    const localId = charName ? findLocalCharId(charName) : null;
    if (localId) result[tag] = localId;
  }
  return result;
}



function checkAuth(req) {
  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  return auth === (process.env.ADMIN_SECRET || 'afk-admin-2025');
}

/**
 * Parsea una URL de start.gg y extrae:
 * - eventSlug (si aplica)
 * - tournamentSlug (si no hay event)
 * - phaseId (si la URL incluye /brackets/{phaseId})
 * - phaseGroupId (si la URL incluye /brackets/{phaseId}/{phaseGroupId})
 */
function parseUrl(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/^https?:\/\/(www\.)?start\.gg\//, '');
  s = s.replace(/\/$/, '');

  // Extraer IDs de bracket: /brackets/{phaseId} o /brackets/{phaseId}/{phaseGroupId}
  const bracketMatch = s.match(/\/brackets\/(\d+)(?:\/(\d+))?/);
  const phaseId     = bracketMatch?.[1] || null;
  const phaseGroupId = bracketMatch?.[2] || null;

  // Slug base sin /brackets
  const base = s.replace(/\/brackets(\/.*)?$/, '').replace(/\/(details|registration|results)(\/.*)?$/, '');

  const isEvent = base.includes('/event/');
  const eventSlug = isEvent ? base : null;
  const tournamentSlug = isEvent ? null : base;

  return { eventSlug, tournamentSlug, phaseId, phaseGroupId };
}

async function gqlQuery(token, query, variables) {
  const r = await fetch(STARTGG_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`start.gg HTTP ${r.status}`);
  const json = await r.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'start.gg GQL error');
  return json.data;
}

// Obtiene todos los participantes del evento con su placement final (páginando hasta 500)
async function fetchAllEntrantStandings(token, eventSlug) {
  const perPage = 64;
  let page = 1;
  let totalPages = 1;
  const nodes = [];

  do {
    const data = await gqlQuery(token, Q_EVENT_ENTRANTS, { slug: eventSlug, page, perPage });
    const ev = data?.event;
    if (!ev) throw new Error('Evento no encontrado en start.gg');
    const { entrants } = ev;
    totalPages = entrants.pageInfo.totalPages || 1;
    // Normalizar al mismo formato que event.standings
    for (const e of (entrants.nodes || [])) {
      if (!e.standing?.placement) continue;
      nodes.push({
        placement: e.standing.placement,
        entrant: { name: e.name, participants: e.participants },
      });
    }
    page++;
  } while (page <= totalPages && page <= 8);

  return nodes;
}

// Obtiene standings de un phaseGroup específico páginando (máx 3 páginas de 64)
async function fetchPhaseGroupStandings(token, phaseGroupId) {
  const perPage = 64;
  let page = 1;
  let totalPages = 1;
  const nodes = [];
  let meta = null;

  do {
    const data = await gqlQuery(token, Q_PHASE_GROUP_STANDINGS, { phaseGroupId, page, perPage });
    const pg = data?.phaseGroup;
    if (!pg) throw new Error('Phase group no encontrado en start.gg');
    if (!meta) meta = pg;
    totalPages = pg.standings.pageInfo.totalPages || 1;
    nodes.push(...pg.standings.nodes);
    page++;
  } while (page <= totalPages && page <= 3);

  return { nodes, meta };
}

// ── handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!checkAuth(req)) return res.status(401).json({ error: 'No autorizado' });

  const { url, type, community, year, nameOverride } = req.body || {};

  if (!url || !type || !community || !year)
    return res.status(400).json({ error: 'url, type, community y year son requeridos' });
  if (type !== 'M' && type !== 'S')
    return res.status(400).json({ error: 'type debe ser M (mensual) o S (semanal)' });

  const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET || '';
  if (!token) return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });

  const parsed = parseUrl(url);
  if (!parsed.eventSlug && !parsed.tournamentSlug)
    return res.status(400).json({ error: 'URL inválida' });

  try {
    // ── Leer torneos existentes ──────────────────────────────────────────────
    const key = crTournamentsKey(community, year);
    const raw = await redis.get(key);
    const existing = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];

    let nodes = [];
    let tournamentName = null;
    let tournamentStartAt = null;
    let numAttendees = 0;   // del evento padre (para validar MIN_ATTENDEES)
    let dupId = null;
    let eventSlug = parsed.eventSlug;
    let mergeTarget = null; // torneo existente al que mergear (mismo evento, otro bracket)

    // ── Caso A: URL incluye phaseGroupId (/brackets/{phaseId}/{phaseGroupId}) ──
    if (parsed.phaseGroupId) {
      const pgDupId = `phaseGroup:${parsed.phaseGroupId}`;
      // Verificar que este bracket exacto no se haya cargado ya
      if (existing.some(t => t.id === pgDupId || (t.loadedPhaseGroups || []).includes(parsed.phaseGroupId)))
        return res.status(409).json({ error: 'Este bracket ya fue cargado' });

      const { nodes: pgNodes, meta } = await fetchPhaseGroupStandings(token, parsed.phaseGroupId);
      nodes = pgNodes;

      const ev = meta?.phase?.event;
      const evId = ev?.id ? `event:${ev.id}` : null;
      numAttendees = ev?.numEntrants || pgNodes.length;
      tournamentStartAt = ev?.tournament?.startAt || null;
      eventSlug = eventSlug || (ev?.tournament?.slug ? `tournament/${ev.tournament.slug}/event/${ev.name}` : null);

      // Buscar si ya hay un torneo del mismo evento para mergear
      if (evId) mergeTarget = existing.find(t => t.id === evId);

      if (mergeTarget) {
        dupId = mergeTarget.id;
        tournamentName = mergeTarget.name;
      } else {
        dupId = evId || pgDupId;
        tournamentName = nameOverride || ev?.tournament?.name || 'Torneo';
      }

    // ── Caso B: URL de evento o torneo ──────────────────────────────────────
    } else {
      // Si es URL de torneo (no evento), buscar evento SSBU
      if (!eventSlug) {
        const data = await gqlQuery(token, Q_TOURNAMENT_EVENTS, { slug: parsed.tournamentSlug });
        const t = data?.tournament;
        if (!t) return res.status(404).json({ error: 'Torneo no encontrado en start.gg' });

        tournamentName = nameOverride || t.name;
        tournamentStartAt = t.startAt;
        numAttendees = t.numAttendees || 0;

        const ssbuEvent =
          t.events.find(e => e.videogame?.id === 1386) ||
          t.events.find(e => /smash|ultimate|ssbu/i.test(e.name)) ||
          t.events[0];

        if (!ssbuEvent) return res.status(404).json({ error: 'No se encontró evento de SSBU en el torneo' });
        eventSlug = `tournament/${t.slug}/event/${ssbuEvent.slug}`;
      }

      dupId = eventSlug.replace(/\//g, ':');

      if (existing.some(t => t.id === dupId))
        return res.status(409).json({ error: 'Este torneo ya fue cargado' });

      // Detectar fases de Resurrección para excluir sus jugadores
      const evData = await gqlQuery(token, Q_EVENT_PHASES, { slug: eventSlug });
      const evObj = evData?.event;
      if (!evObj) throw new Error('Evento no encontrado en start.gg');

      numAttendees = numAttendees || evObj.numEntrants || 0;
      tournamentName = tournamentName || nameOverride || evObj.tournament?.name || eventSlug;
      tournamentStartAt = tournamentStartAt || evObj.tournament?.startAt || null;

      // Recolectar jugadores de fases excluidas (resurrección / side events)
      const resurrectionPlayers = new Set();
      for (const phase of (evObj.phases || [])) {
        if (classifyPhase(phase.name) !== null) continue;
        for (const pg of (phase.phaseGroups?.nodes || [])) {
          try {
            const { nodes: pgNodes } = await fetchPhaseGroupStandings(token, pg.id);
            for (const n of pgNodes) {
              const pName = n.entrant?.participants?.[0]?.player?.gamerTag || n.entrant?.name;
              if (pName) resurrectionPlayers.add(pName.toLowerCase());
            }
          } catch { /* ignorar */ }
        }
      }

      // Traer TODOS los participantes con su placement final real vía event.entrants
      const allNodes = await fetchAllEntrantStandings(token, eventSlug);
      nodes = resurrectionPlayers.size > 0
        ? allNodes.filter(n => {
            const pName = (n.entrant?.participants?.[0]?.player?.gamerTag || n.entrant?.name || '').toLowerCase();
            return !resurrectionPlayers.has(pName);
          })
        : allNodes;
    }

    if (numAttendees < MIN_ATTENDEES)
      return res.status(400).json({ error: `El torneo necesita al menos ${MIN_ATTENDEES} participantes (tiene ${numAttendees})` });

    // Obtener personajes más usados por evento (best-effort, no bloquea si falla)
    let charMap = {};
    if (eventSlug) {
      try { charMap = await fetchEventCharMap(token, eventSlug); } catch { /* ignorar */ }
    }

    const standings = nodes.map(n => {
      const player = n.entrant?.participants?.[0]?.player;
      const playerName = player?.gamerTag || n.entrant?.name || 'Desconocido';
      const basePoints = getPositionPoints(n.placement, type);
      return {
        placement: n.placement,
        playerName,
        entrantName: n.entrant?.name || playerName,
        playerId: player?.id || null,
        basePoints,
        bonusPoints: 0,
        charId: charMap[playerName] || null,
      };
    });

    // Guardar el torneo
    if (mergeTarget) {
      // Mergear standings: combinar, deduplicar por playerName (mejor placement gana)
      const mergedMap = {};
      for (const s of mergeTarget.standings) {
        mergedMap[s.playerName] = { ...s };
      }
      for (const s of standings) {
        if (!mergedMap[s.playerName] || s.placement < mergedMap[s.playerName].placement) {
          mergedMap[s.playerName] = { ...s, basePoints: getPositionPoints(s.placement, mergeTarget.type) };
        }
      }
      mergeTarget.standings = Object.values(mergedMap).sort((a, b) => a.placement - b.placement);
      mergeTarget.numAttendees = Math.max(mergeTarget.numAttendees || 0, numAttendees);
      mergeTarget.loadedPhaseGroups = [...(mergeTarget.loadedPhaseGroups || []), parsed.phaseGroupId];

      await redis.set(key, JSON.stringify(existing));
      return res.status(200).json({ ok: true, tournament: mergeTarget });
    }

    const newTournament = {
      id: dupId,
      slug: eventSlug || url,
      name: tournamentName,
      type,
      startAt: tournamentStartAt,
      numAttendees,
      addedAt: Date.now(),
      standings,
      ...(parsed.phaseGroupId ? { loadedPhaseGroups: [parsed.phaseGroupId] } : {}),
    };

    existing.push(newTournament);
    await redis.set(key, JSON.stringify(existing));

    return res.status(200).json({ ok: true, tournament: newTournament });
  } catch (err) {
    console.error('[community-ranking/add-tournament]', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}
