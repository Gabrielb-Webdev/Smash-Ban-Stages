// API: Sincroniza torneos de Start.gg y notifica nuevos
// GET  → devuelve torneos actuales
// POST → sincroniza, detecta nuevos y envía push notifications
//
// Busca torneos por slug directo y por organizador descubierto.

import redis from '../../../lib/redis';
import { sendPushToAll } from '../../../lib/push';

const STARTGG_API = 'https://api.start.gg/gql/alpha';

// Usuario cuya inscripción + rol (owner/admin) define qué torneos mostrar
const OWNER_USER_ID = parseInt(process.env.STARTGG_OWNER_USER_ID || '2081350', 10);
const OWNER_SLUG    = process.env.STARTGG_OWNER_SLUG || 'user/ead8fa65';

// Torneos adicionales a incluir siempre (independientemente del rol)
// Ejemplo en .env: STARTGG_EXTRA_SLUGS=tournament/asd3,tournament/otro-torneo
const EXTRA_SLUGS = (process.env.STARTGG_EXTRA_SLUGS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Keys en Redis
const SEEN_KEY      = 'startgg:tournaments:seen';
const CACHE_KEY     = 'startgg:tournaments:cache';
const CACHE_TTL     = 600; // 10 minutos (se auto-refresca)

// Query para obtener un torneo individual por slug
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
    owner { id }
    admins { id }
    events {
      id
      name
      numEntrants
      videogame { id name }
    }
  }
}
`;

// Torneos donde el usuario está inscrito — filtramos luego por owner/admin
const USER_TOURNAMENTS_QUERY = `
query UserTournaments($slug: String!, $page: Int!) {
  user(slug: $slug) {
    tournaments(query: { page: $page, perPage: 20, filter: { upcoming: true } }) {
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
        images { url type }
        owner { id }
        admins { id }
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

  // Paginar todos los torneos donde el usuario está inscrito con upcoming:true
  // y quedarnos solo con aquellos donde es owner o admin
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    try {
      const resp = await fetch(STARTGG_API, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: USER_TOURNAMENTS_QUERY,
          variables: { slug: OWNER_SLUG, page },
        }),
      });
      const body = await resp.json();

      if (body.errors) {
        debug.push({ page, error: body.errors });
        break;
      }

      const tourData  = body.data?.user?.tournaments;
      const nodes     = tourData?.nodes || [];
      totalPages      = tourData?.pageInfo?.totalPages || 1;

      debug.push({ page, total: tourData?.pageInfo?.total, found: nodes.length });

      for (const t of nodes) {
        const id      = String(t.id);
        if (seen.has(id)) continue;

        const isOwner = String(t.owner?.id) === String(OWNER_USER_ID);
        const isAdmin = (t.admins || []).some(a => String(a.id) === String(OWNER_USER_ID));

        if (!isOwner && !isAdmin) continue;

        seen.add(id);
        results.push(t);
        debug.push({ id, name: t.name, role: isOwner ? 'owner' : 'admin' });
      }

      page++;
    } catch (e) {
      debug.push({ page, error: e.message });
      break;
    }
  }

  // Agregar torneos extra (STARTGG_EXTRA_SLUGS) — siempre incluidos sin importar el rol
  for (const slug of EXTRA_SLUGS) {
    try {
      const resp = await fetch(STARTGG_API, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: TOURNAMENT_BY_SLUG_QUERY, variables: { slug } }),
      });
      const body = await resp.json();
      const t = body.data?.tournament;
      if (t && !seen.has(String(t.id))) {
        seen.add(String(t.id));
        results.push(t);
        debug.push({ id: String(t.id), name: t.name, role: 'extra-slug' });
      } else if (!t) {
        debug.push({ slug, error: 'no encontrado en start.gg' });
      }
    } catch (e) {
      debug.push({ slug, error: e.message });
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
      if (showDebug) { response.ownerUserId = OWNER_USER_ID; response.ownerSlug = OWNER_SLUG; response.debug = debug; }
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
