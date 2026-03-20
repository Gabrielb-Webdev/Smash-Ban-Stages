// API: Sincroniza torneos de Start.gg y notifica nuevos
// GET  → devuelve torneos actuales
// POST → sincroniza, detecta nuevos y envía push notifications
//
// Busca torneos por slug directo, por organizador, y por búsqueda.

import redis from '../../../lib/redis';
import { sendPushToAll } from '../../../lib/push';

const STARTGG_API = 'https://api.start.gg/gql/alpha';

// Slugs de torneos "semilla" — se usan para descubrir organizadores y mostrar sus torneos
const TOURNAMENT_SLUGS = (process.env.STARTGG_TOURNAMENT_SLUGS || 'choricup,un-torneo-mas-1-1')
  .split(',').map(s => s.trim()).filter(Boolean);

// Slugs adicionales de organizadores (usuarios de Start.gg) — opcional
const ORGANIZER_SLUGS = (process.env.STARTGG_ORGANIZER_SLUGS || process.env.STARTGG_ORGANIZER_SLUG || '')
  .split(',').map(s => s.trim()).filter(Boolean);

// Keys en Redis
const SEEN_KEY      = 'startgg:tournaments:seen';
const CACHE_KEY     = 'startgg:tournaments:cache';
const CACHE_TTL     = 3600; // 1 hora

// Query para obtener un torneo específico por slug (incluye owner para auto-descubrir organizador)
const TOURNAMENT_BY_SLUG_QUERY = `
query TournamentBySlug($slug: String!) {
  tournament(slug: $slug) {
    id
    name
    slug
    startAt
    endAt
    numAttendees
    state
    isRegistrationOpen
    url(relative: false)
    images { url type }
    owner { id slug name }
    events {
      id
      name
      numEntrants
      videogame { id name }
    }
  }
}
`;

// Query para obtener torneos de un usuario/organizador (incluye owner para filtrar)
const TOURNAMENTS_BY_OWNER_QUERY = `
query TournamentsByOwner($slug: String!, $page: Int!, $perPage: Int!) {
  user(slug: $slug) {
    id
    tournaments(query: {
      page: $page,
      perPage: $perPage,
      filter: { past: false }
    }) {
      nodes {
        id
        name
        slug
        startAt
        endAt
        numAttendees
        state
        isRegistrationOpen
        url(relative: false)
        images { url type }
        owner { id slug }
        events {
          id
          name
          numEntrants
          videogame { id name }
        }
      }
    }
  }
}
`;

function formatTournament(t) {
  return {
    id: String(t.id),
    name: t.name,
    slug: t.slug,
    startAt: t.startAt ? new Date(t.startAt * 1000).toISOString() : null,
    endAt: t.endAt ? new Date(t.endAt * 1000).toISOString() : null,
    attendees: t.numAttendees || 0,
    state: t.state,
    registrationOpen: t.isRegistrationOpen || false,
    url: t.url || `https://www.start.gg/tournament/${t.slug}`,
    image: t.images?.find(i => i.type === 'profile')?.url || t.images?.[0]?.url || null,
    events: (t.events || []).map(e => ({
      id: String(e.id),
      name: e.name,
      entrants: e.numEntrants || 0,
      game: e.videogame?.name || 'Unknown',
    })),
  };
}

async function fetchStartggTournaments(token) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const seen = new Set();
  const results = [];
  const debug = [];
  const discoveredOwners = new Set();

  const addTournament = (t) => {
    const id = String(t.id);
    if (!seen.has(id)) {
      seen.add(id);
      results.push(t);
    }
  };

  // 1. Fetch seed tournaments by slug — and discover their owners
  for (const slug of TOURNAMENT_SLUGS) {
    try {
      const resp = await fetch(STARTGG_API, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: TOURNAMENT_BY_SLUG_QUERY,
          variables: { slug },
        }),
      });
      const data = await resp.json();
      let tournament = data.data?.tournament;

      if (!tournament) {
        // Try with tournament/ prefix
        const resp2 = await fetch(STARTGG_API, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: TOURNAMENT_BY_SLUG_QUERY,
            variables: { slug: `tournament/${slug}` },
          }),
        });
        const data2 = await resp2.json();
        tournament = data2.data?.tournament;
        if (tournament) {
          debug.push({ slug, status: 'found', method: 'with-prefix' });
        } else {
          debug.push({ slug, status: 'not_found' });
        }
      } else {
        debug.push({ slug, status: 'found', method: 'direct' });
      }

      if (tournament) {
        addTournament(tournament);
        // Discover the owner for auto-fetching their other tournaments
        if (tournament.owner?.slug) {
          discoveredOwners.add(tournament.owner.slug);
        }
      }
    } catch (e) {
      debug.push({ slug, status: 'error', message: e.message });
    }
  }

  // Add manually configured organizer slugs
  for (const s of ORGANIZER_SLUGS) {
    discoveredOwners.add(s);
  }

  // 2. Fetch upcoming tournaments CREATED BY each discovered owner (not just registered)
  for (const ownerSlug of discoveredOwners) {
    try {
      const resp = await fetch(STARTGG_API, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: TOURNAMENTS_BY_OWNER_QUERY,
          variables: { slug: ownerSlug, page: 1, perPage: 25 },
        }),
      });
      const data = await resp.json();
      const userId = data.data?.user?.id;
      const nodes = data.data?.user?.tournaments?.nodes || [];
      // Solo agregar torneos donde el owner coincide (creados por este usuario, no donde está inscrito)
      const owned = nodes.filter(n => n.owner && String(n.owner.id) === String(userId));
      const added = owned.filter(n => !seen.has(String(n.id)));
      owned.forEach(addTournament);
      debug.push({ owner: ownerSlug, userId, status: 'fetched', total: nodes.length, owned: owned.length, newAdded: added.length });
    } catch (e) {
      debug.push({ owner: ownerSlug, status: 'error', message: e.message });
    }
  }

  // Filtrar solo torneos futuros o en curso (no pasados)
  // Start.gg states: 1=CREATED, 2=ACTIVE, 3=COMPLETED, 4=CANCELLED
  const now = Date.now();
  const formatted = results.map(formatTournament).filter(t => {
    const state = t.state;
    if (state === 3 || state === 4 || state === 'COMPLETED' || state === 'CANCELLED') return false;
    if (state === 1 || state === 2 || state === 'CREATED' || state === 'ACTIVE') return true;
    if (t.endAt && new Date(t.endAt).getTime() > now) return true;
    if (t.startAt && new Date(t.startAt).getTime() > now) return true;
    if (!t.endAt && !t.startAt) return true;
    return false;
  });

  return { tournaments: formatted, debug };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Token de Start.gg para la API
  const startggToken = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET || '';
  if (!startggToken) {
    return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });
  }

  // ── GET: Devolver torneos cacheados del organizador ──
  if (req.method === 'GET') {
    const forceRefresh = req.query.refresh === 'true';

    if (!forceRefresh) {
      try {
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
          const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
          if (Array.isArray(data) && data.length > 0) {
            return res.status(200).json({ tournaments: data, source: 'cache' });
          }
        }
      } catch { /* sin cache, buscar */ }
    }

    try {
      const { tournaments, debug } = await fetchStartggTournaments(startggToken);

      // Solo cachear si hay resultados
      if (tournaments.length > 0) {
        await redis.set(CACHE_KEY, JSON.stringify(tournaments), { ex: CACHE_TTL });
      }

      const showDebug = req.query.debug === 'true';
      const response = { tournaments, source: 'live' };
      if (showDebug) { response.slugs = TOURNAMENT_SLUGS; response.organizerSlugs = ORGANIZER_SLUGS; response.debug = debug; }
      return res.status(200).json(response);
    } catch (err) {
      console.error('[sync-startgg] handler error:', err.message);
      return res.status(500).json({ error: 'Error consultando Start.gg', detail: err.message });
    }
  }

  // ── POST: Sincronizar y notificar nuevos torneos ──
  if (req.method === 'POST') {
    // Proteger con clave de admin
    const authHeader = req.headers['authorization'] || '';
    const adminSecret = authHeader.replace('Bearer ', '').trim();
    const validSecret = process.env.ADMIN_SECRET || 'afk-admin-2025';
    if (adminSecret !== validSecret) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    try {
      const { tournaments } = await fetchStartggTournaments(startggToken);
      if (tournaments.length === 0) {
        return res.status(200).json({ success: true, newTournaments: [], message: 'No se encontraron torneos' });
      }

      // Obtener IDs ya vistos
      const seenIds = await redis.smembers(SEEN_KEY) || [];
      const seenSet = new Set(seenIds.map(String));

      // Detectar nuevos
      const newTournaments = tournaments.filter(t => !seenSet.has(String(t.id)));

      // Marcar todos como vistos
      if (tournaments.length > 0) {
        const ids = tournaments.map(t => String(t.id));
        await redis.sadd(SEEN_KEY, ...ids);
      }

      // Cachear la lista actualizada
      await redis.set(CACHE_KEY, JSON.stringify(tournaments), { ex: CACHE_TTL });

      // Notificar por cada torneo nuevo
      for (const t of newTournaments) {
        const dateStr = t.startAt
          ? new Date(t.startAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
          : '';
        const body = dateStr
          ? `📅 ${dateStr} — ${t.attendees} inscriptos. ¡Anotate ahora!`
          : `${t.attendees} inscriptos. ¡Anotate ahora!`;

        await sendPushToAll({
          title: `🏆 Nuevo torneo: ${t.name}`,
          body,
          tag: 'startgg-tournament',
          data: {
            url: t.url,
            tournamentId: t.id,
            tournamentSlug: t.slug,
          },
        }).catch(() => {});
      }

      return res.status(200).json({
        success: true,
        total: tournaments.length,
        newTournaments: newTournaments.map(t => ({ id: t.id, name: t.name, startAt: t.startAt })),
        message: newTournaments.length > 0
          ? `Se encontraron ${newTournaments.length} torneos nuevos y se enviaron notificaciones`
          : 'No hay torneos nuevos',
      });
    } catch (err) {
      return res.status(500).json({ error: 'Error sincronizando torneos' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
