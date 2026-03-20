// API: Sincroniza torneos de un organizador de Start.gg y notifica nuevos
// GET  → devuelve torneos actuales del organizador
// POST → sincroniza, detecta nuevos y envía push notifications
//
// Se puede llamar manualmente (admin) o desde un cron externo.

import redis from '../../../lib/redis';
import { sendPushToAll } from '../../../lib/push';

const STARTGG_API = 'https://api.start.gg/gql/alpha';

// Slug del organizador a monitorear (dueño de Choricup)
// Se configura vía env o se usa el valor por defecto
const ORGANIZER_SLUG = process.env.STARTGG_ORGANIZER_SLUG || 'choricup';

// Keys en Redis
const SEEN_KEY      = 'startgg:tournaments:seen';   // Set de IDs ya vistos
const CACHE_KEY     = 'startgg:tournaments:cache';   // Lista cacheada de torneos
const CACHE_TTL     = 1800;                           // 30 min cache

// Query para obtener torneos de un usuario/organizador
const TOURNAMENTS_BY_OWNER_QUERY = `
query TournamentsByOwner($slug: String!, $page: Int!, $perPage: Int!) {
  user(slug: $slug) {
    id
    slug
    tournaments(query: {
      page: $page,
      perPage: $perPage,
      filter: { past: false }
    }) {
      pageInfo { total totalPages }
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
        images {
          url
          type
        }
        events {
          id
          name
          numEntrants
          videogame {
            id
            name
          }
        }
      }
    }
  }
}
`;

// Query alternativa: buscar torneos por nombre del organizador
const TOURNAMENTS_SEARCH_QUERY = `
query SearchTournaments($name: String!, $page: Int!, $perPage: Int!) {
  tournaments(query: {
    page: $page,
    perPage: $perPage,
    filter: { 
      name: $name,
      past: false
    }
  }) {
    pageInfo { total totalPages }
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
      images {
        url
        type
      }
      owner {
        id
        slug
      }
      events {
        id
        name
        numEntrants
        videogame {
          id
          name
        }
      }
    }
  }
}
`;

async function fetchStartggTournaments(token) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  let tournaments = [];

  // Intentar primero por slug de usuario/organizador
  try {
    const resp = await fetch(STARTGG_API, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: TOURNAMENTS_BY_OWNER_QUERY,
        variables: { slug: ORGANIZER_SLUG, page: 1, perPage: 25 },
      }),
    });
    const data = await resp.json();
    if (data.data?.user?.tournaments?.nodes) {
      tournaments = data.data.user.tournaments.nodes;
    }
  } catch { /* silent */ }

  // Si no encontró por usuario, buscar por nombre de torneo
  if (tournaments.length === 0) {
    try {
      const resp = await fetch(STARTGG_API, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: TOURNAMENTS_SEARCH_QUERY,
          variables: { name: ORGANIZER_SLUG, page: 1, perPage: 25 },
        }),
      });
      const data = await resp.json();
      const nodes = data.data?.tournaments?.nodes || [];
      // Filtrar solo los del organizador correcto (por slug en owner o name match)
      tournaments = nodes.filter(t => {
        const ownerMatch = t.owner?.slug?.toLowerCase() === ORGANIZER_SLUG.toLowerCase();
        const nameMatch = t.name?.toLowerCase().includes(ORGANIZER_SLUG.toLowerCase());
        return ownerMatch || nameMatch;
      });
    } catch { /* silent */ }
  }

  // Formatear datos
  return tournaments.map(t => ({
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
  }));
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
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return res.status(200).json({ tournaments: data, source: 'cache' });
      }
    } catch { /* sin cache, buscar */ }

    try {
      const tournaments = await fetchStartggTournaments(startggToken);

      // Guardar en cache
      if (tournaments.length > 0) {
        await redis.set(CACHE_KEY, JSON.stringify(tournaments), { ex: CACHE_TTL });
      }

      return res.status(200).json({ tournaments, source: 'live' });
    } catch (err) {
      return res.status(500).json({ error: 'Error consultando Start.gg' });
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
      const tournaments = await fetchStartggTournaments(startggToken);
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
