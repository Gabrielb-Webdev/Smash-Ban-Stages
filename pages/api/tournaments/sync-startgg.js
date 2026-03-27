// API: Sincroniza torneos de Start.gg y notifica nuevos
// GET  → devuelve torneos actuales
// POST → sincroniza, detecta nuevos y envía push notifications
//
// Busca torneos por slug directo y por organizador descubierto.

import redis, { broadcastNotifsKey } from '../../../lib/redis';
import { sendPushToAll } from '../../../lib/push';

const STARTGG_API = 'https://api.start.gg/gql/alpha';

// Usuario cuya inscripción + rol (owner/admin) define qué torneos mostrar
const OWNER_USER_ID = parseInt(process.env.STARTGG_OWNER_USER_ID || '2081350', 10);
const OWNER_SLUG    = process.env.STARTGG_OWNER_SLUG || 'user/ead8fa65';

// Torneos adicionales a incluir siempre (independientemente del rol)
// Ejemplo en .env: STARTGG_EXTRA_SLUGS=tournament/mi-torneo,tournament/otro-torneo
const EXTRA_SLUGS = (process.env.STARTGG_EXTRA_SLUGS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Series de torneos a auto-trackear — descubre nuevas ediciones automáticamente
// Cada entrada: { base: 'slug-prefix', startN: primera edición conocida, community: id del panel }
const TOURNAMENT_SERIES = [
  { base: 'true-combo-weeklies', startN: 62, community: 'afk-multi' },
  { base: 'to-the-top', startN: 22, community: 'afk-multi' },
];
const SERIES_LAST_N_PREFIX = 'startgg:series:lastN:';

// Slugs a ignorar (torneos de prueba)
const BLACKLISTED_SLUGS = new Set([
  'tournament/asd3',
]);

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
      slug
      numEntrants
      videogame { id name }
    }
  }
}
`;

// Torneos donde el usuario está inscrito — filtramos luego por owner/admin
// perPage reducido a 8 para no exceder el límite de complejidad de start.gg (1000)
const USER_TOURNAMENTS_QUERY = `
query UserTournaments($slug: String!, $page: Int!) {
  user(slug: $slug) {
    tournaments(query: { page: $page, perPage: 8, filter: { upcoming: true } }) {
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
          slug
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
      slug: e.slug || null,
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

  // ── Series: auto-descubrir nuevas ediciones ──
  for (const series of TOURNAMENT_SERIES) {
    const redisKey = `${SERIES_LAST_N_PREFIX}${series.base}`;
    const storedN = parseInt(await redis.get(redisKey) || '0', 10);
    const startFrom = Math.max(storedN, series.startN);
    let highestFound = startFrom - 1;
    let misses = 0;
    let n = startFrom;

    while (misses < 3) {
      const slug = `tournament/${series.base}-${n}`;
      try {
        const resp = await fetch(STARTGG_API, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: TOURNAMENT_BY_SLUG_QUERY, variables: { slug } }),
        });
        const body = await resp.json();
        const t = body.data?.tournament;
        if (t) {
          misses = 0;
          if (n > highestFound) highestFound = n;
          const id = String(t.id);
          if (!seen.has(id)) {
            seen.add(id);
            t._series = series.base;
            t._seriesN = n;
            results.push(t);
            debug.push({ id, name: t.name, series: series.base, n, role: 'series', owner: t.owner?.id, admins: (t.admins || []).map(a => a.id) });
          } else {
            // Ya en results (encontrado vía user tournaments) — adjuntar metadatos de serie
            const existing = results.find(r => String(r.id) === id);
            if (existing && !existing._series) {
              existing._series = series.base;
              existing._seriesN = n;
              debug.push({ id, name: t.name, series: series.base, n, role: 'series-meta-attached' });
            }
          }
        } else {
          misses++;
        }
      } catch (e) {
        misses++;
        debug.push({ series: series.base, n, error: e.message });
      }
      n++;
    }

    if (highestFound >= startFrom) {
      try { await redis.set(redisKey, String(highestFound)); } catch {}
    }
  }

  // Quitar blacklisted
  const clean = results.filter(t => !BLACKLISTED_SLUGS.has(t.slug));

  // Start.gg states: 1=CREATED, 2=ACTIVE, 3=COMPLETED, 4=CANCELLED
  const formatted = clean.map(t => {
    const f = formatTournament(t);
    if (t._series) {
      f.series = t._series;
      f.seriesN = t._seriesN;
      // Vincular a la comunidad que maneja esta serie
      const seriesCfg = TOURNAMENT_SERIES.find(s => s.base === t._series);
      if (seriesCfg?.community) f.community = seriesCfg.community;
    }
    return f;
  }).filter(t => {
    const state = t.state;
    if (state === 4 || state === 'CANCELLED') return false;
    // Series completadas: excluir (la próxima edición no está publicada aún)
    if (t.series && (state === 3 || state === 'COMPLETED')) return false;
    return true;
  });

  // Para series: solo conservar la edición más reciente de cada una
  const latestPerSeries = {};
  for (const t of formatted) {
    if (t.series) {
      if (!latestPerSeries[t.series] || t.seriesN > latestPerSeries[t.series].seriesN) {
        latestPerSeries[t.series] = t;
      }
    }
  }
  const final = formatted.filter(t => {
    if (!t.series) return true;
    return t === latestPerSeries[t.series];
  });

  return { tournaments: final, debug };
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

  // Filtro por comunidad (opcional)
  const communityFilter = req.query.community || '';

  // ── GET: Devolver torneos cacheados del organizador ──
  if (req.method === 'GET') {
    const forceRefresh = req.query.refresh === 'true';

    if (!forceRefresh) {
      try {
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
          let data = typeof cached === 'string' ? JSON.parse(cached) : cached;
          if (Array.isArray(data) && data.length > 0) {
            if (communityFilter) data = data.filter(t => t.community === communityFilter);
            return res.status(200).json({ tournaments: data, source: 'cache' });
          }
        }
      } catch { /* sin cache, buscar */ }
    }

    try {
      const { tournaments, debug } = await fetchStartggTournaments(startggToken);

      // Aplicar overrides locales de auto-completado (detectado por el panel de admin)
      const AUTO_COMPLETE_PREFIX = 'startgg:auto_complete:';
      for (const t of tournaments) {
        if (t.state !== 3 && t.state !== 4) {
          try {
            const completed = await redis.get(AUTO_COMPLETE_PREFIX + t.slug);
            if (completed) t.state = 3;
          } catch {}
        }
      }

      // Solo cachear si hay resultados
      if (tournaments.length > 0) {
        await redis.set(CACHE_KEY, JSON.stringify(tournaments), { ex: CACHE_TTL });
      }

      // ── Auto-notificación: detectar torneos nuevos sin acción del admin ──
      // Lock con NX+EX para que solo un request lo ejecute por intervalo (15 min)
      try {
        const AUTOSYNC_LOCK = 'startgg:autosync:lock';
        const acquired = await redis.set(AUTOSYNC_LOCK, '1', { ex: 900, nx: true });
        if (acquired && tournaments.length > 0) {
          const seenIds = await redis.smembers(SEEN_KEY) || [];
          const seenSet = new Set(seenIds.map(String));
          const newTournaments = tournaments.filter(t => !seenSet.has(String(t.id)));

          // Marcar todos como vistos
          await redis.sadd(SEEN_KEY, ...tournaments.map(t => String(t.id)));

          // Solo notificar si ya había torneos conocidos (evita spam en el primer sync)
          if (newTournaments.length > 0 && seenIds.length > 0) {
            for (const t of newTournaments) {
              const dateStr = t.startAt
                ? new Date(t.startAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
                : '';
              const body = dateStr
                ? `📅 ${dateStr} — ${t.attendees} inscriptos. ¡Anotate ahora!`
                : `${t.attendees} inscriptos. ¡Anotate ahora!`;
              const title = `🏆 Nuevo torneo: ${t.name}`;

              // Inbox broadcast (campanita in-app)
              const notif = {
                id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                type: 'broadcast',
                setup: title,
                message: body,
                sentBy: 'Sistema',
                sentAt: new Date().toISOString(),
                readAt: null,
                url: t.url || null,
                _broadcast: true,
              };
              const existing = (await redis.get(broadcastNotifsKey)) || [];
              existing.unshift(notif);
              await redis.set(broadcastNotifsKey, existing.slice(0, 20));

              // Push al dispositivo
              await sendPushToAll({ title, body, tag: 'startgg-tournament',
                data: { url: t.url, tournamentId: t.id, tournamentSlug: t.slug },
              }).catch(() => {});
            }
          }
        }
      } catch {}

      const filtered = communityFilter ? tournaments.filter(t => t.community === communityFilter) : tournaments;
      const showDebug = req.query.debug === 'true';
      const response = { tournaments: filtered, source: 'live' };
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
        const title = `🏆 Nuevo torneo: ${t.name}`;

        // Guardar en inbox broadcast para que aparezca en la campanita in-app
        try {
          const notif = {
            id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'broadcast',
            setup: title,
            message: body,
            sentBy: 'Sistema',
            sentAt: new Date().toISOString(),
            readAt: null,
            url: t.url || null,
            _broadcast: true,
          };
          const existing = (await redis.get(broadcastNotifsKey)) || [];
          existing.unshift(notif);
          await redis.set(broadcastNotifsKey, existing.slice(0, 20));
        } catch {}

        // Push al dispositivo
        await sendPushToAll({
          title,
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
