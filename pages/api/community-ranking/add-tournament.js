import { redis, crTournamentsKey } from '../../../lib/redis';
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

// ── helpers ─────────────────────────────────────────────────────────────────

function checkAuth(req) {
  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  return auth === (process.env.ADMIN_SECRET || 'afk-admin-2025');
}

function parseSlug(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/^https?:\/\/(www\.)?start\.gg\//, '');
  s = s.replace(/\/(details|brackets|registration|results)(\/.*)?$/, '');
  s = s.replace(/\/$/, '');
  return s;
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

// Obtiene todos los standings páginando (máx 5 páginas de 64)
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

  const slug = parseSlug(url);
  if (!slug) return res.status(400).json({ error: 'URL inválida' });

  try {
    // ── Leer torneos existentes ──────────────────────────────────────────────
    const key = crTournamentsKey(community, year);
    const raw = await redis.get(key);
    const existing = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];

    // Determinar si es URL de evento o de torneo
    const isEvent = slug.includes('/event/');
    let eventSlug = isEvent ? slug : null;
    let tournamentName = null;
    let tournamentStartAt = null;
    let numAttendees = 0;

    if (!isEvent) {
      // Buscar evento de SSBU dentro del torneo
      const data = await gqlQuery(token, Q_TOURNAMENT_EVENTS, { slug });
      const t = data?.tournament;
      if (!t) return res.status(404).json({ error: 'Torneo no encontrado en start.gg' });

      tournamentName = nameOverride || t.name;
      tournamentStartAt = t.startAt;
      numAttendees = t.numAttendees || 0;

      // Buscar evento de Smash Bros. Ultimate (videogame id = 1386)
      const ssbuEvent =
        t.events.find(e => e.videogame?.id === 1386) ||
        t.events.find(e => /smash|ultimate|ssbu/i.test(e.name)) ||
        t.events[0];

      if (!ssbuEvent) return res.status(404).json({ error: 'No se encontró evento de SSBU en el torneo' });
      eventSlug = `tournament/${t.slug}/event/${ssbuEvent.slug}`;
    }

    // Deduplicación: comparar por eventSlug
    const dupId = eventSlug.replace(/\//g, ':');
    if (existing.some(t => t.id === dupId))
      return res.status(409).json({ error: 'Este torneo ya fue cargado' });

    // Obtener standings
    const nodes = await fetchAllStandings(token, eventSlug);

    // Si no tenemos attendees aún (era event URL), usar numEntrants del primer query
    if (numAttendees === 0) {
      const firstData = await gqlQuery(token, Q_EVENT_STANDINGS, { slug: eventSlug, page: 1, perPage: 1 });
      numAttendees = firstData?.event?.numEntrants || nodes.length;
      tournamentName = nameOverride || firstData?.event?.tournament?.name || eventSlug;
      tournamentStartAt = firstData?.event?.tournament?.startAt;
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
      slug: eventSlug,
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
