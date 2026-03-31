import redis, { crTournamentsKey } from '../../../lib/redis';
import { getPositionPoints, MIN_ATTENDEES } from '../../../lib/communityRanking';

const STARTGG_API = 'https://api.start.gg/gql/alpha';

// ── start.gg GQL queries ────────────────────────────────────────────────────

const Q_TOURNAMENT_EVENTS = `
query TournamentEvents($slug: String!) {
  tournament(slug: $slug) {
    id name slug numAttendees startAt
    events { id name slug numEntrants videogame { id name } }
  }
}`;

const Q_EVENT_STANDINGS = `
query EventStandings($slug: String!, $page: Int!, $perPage: Int!) {
  event(slug: $slug) {
    id name numEntrants
    tournament { name slug numAttendees startAt }
    standings(query: { page: $page, perPage: $perPage }) {
      pageInfo { total totalPages }
      nodes {
        placement
        entrant {
          name
          participants { player { gamerTag } }
        }
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
      id name numEntrants
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
          participants { player { gamerTag } }
        }
      }
    }
  }
}`;

// ── helpers ─────────────────────────────────────────────────────────────────

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

// Obtiene todos los standings del evento páginando (máx 5 páginas de 64)
async function fetchAllStandings(token, eventSlug) {
  const perPage = 64;
  let page = 1;
  let totalPages = 1;
  const nodes = [];

  do {
    const data = await gqlQuery(token, Q_EVENT_STANDINGS, { slug: eventSlug, page, perPage });
    const ev = data?.event;
    if (!ev) throw new Error('Evento no encontrado en start.gg');
    const { standings } = ev;
    totalPages = standings.pageInfo.totalPages || 1;
    nodes.push(...standings.nodes);
    page++;
  } while (page <= totalPages && page <= 5);

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

    // ── Caso A: URL incluye phaseGroupId (/brackets/{phaseId}/{phaseGroupId}) ──
    if (parsed.phaseGroupId) {
      dupId = `phaseGroup:${parsed.phaseGroupId}`;
      if (existing.some(t => t.id === dupId))
        return res.status(409).json({ error: 'Este bracket ya fue cargado' });

      const { nodes: pgNodes, meta } = await fetchPhaseGroupStandings(token, parsed.phaseGroupId);
      nodes = pgNodes;

      const ev = meta?.phase?.event;
      numAttendees = ev?.numEntrants || pgNodes.length;
      tournamentName = nameOverride || `${ev?.tournament?.name || 'Torneo'} – ${meta.phase?.name || 'Phase'} ${meta.displayIdentifier || ''}`.trim();
      tournamentStartAt = ev?.tournament?.startAt || null;
      eventSlug = eventSlug || (ev?.tournament?.slug ? `tournament/${ev.tournament.slug}/event/${ev.name}` : null);

    // ── Caso B: URL de evento o torneo (comportamiento original) ─────────────
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

      // Si la URL tiene phaseId pero no phaseGroupId, usamos eventSlug+phaseId como ID
      dupId = parsed.phaseId
        ? `${eventSlug.replace(/\//g, ':')}:phase:${parsed.phaseId}`
        : eventSlug.replace(/\//g, ':');

      if (existing.some(t => t.id === dupId))
        return res.status(409).json({ error: 'Este torneo ya fue cargado' });

      nodes = await fetchAllStandings(token, eventSlug);

      if (numAttendees === 0) {
        const firstData = await gqlQuery(token, Q_EVENT_STANDINGS, { slug: eventSlug, page: 1, perPage: 1 });
        numAttendees = firstData?.event?.numEntrants || nodes.length;
        tournamentName = nameOverride || firstData?.event?.tournament?.name || eventSlug;
        tournamentStartAt = firstData?.event?.tournament?.startAt;
      }
    }

    if (numAttendees < MIN_ATTENDEES)
      return res.status(400).json({ error: `El torneo necesita al menos ${MIN_ATTENDEES} participantes (tiene ${numAttendees})` });

    // Construir standings con puntos base
    const standings = nodes.map(n => {
      const playerName = n.entrant?.participants?.[0]?.player?.gamerTag || n.entrant?.name || 'Desconocido';
      const basePoints = getPositionPoints(n.placement, type);
      return {
        placement: n.placement,
        playerName,
        entrantName: n.entrant?.name || playerName,
        basePoints,
        bonusPoints: 0,
      };
    });

    // Guardar el torneo
    const newTournament = {
      id: dupId,
      slug: eventSlug || url,
      name: tournamentName,
      type,
      startAt: tournamentStartAt,
      numAttendees,
      addedAt: Date.now(),
      standings,
    };

    existing.push(newTournament);
    await redis.set(key, JSON.stringify(existing));

    return res.status(200).json({ ok: true, tournament: newTournament });
  } catch (err) {
    console.error('[community-ranking/add-tournament]', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}
