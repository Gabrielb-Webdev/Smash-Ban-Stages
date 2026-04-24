// GET /api/tournaments/info?slug=tournament/asd3
// Devuelve datos de un torneo de start.gg por slug

let redis = null;
try {
  redis = require('../../../lib/redis').default;
} catch (err) {
  console.warn('Redis no disponible, funcionando sin caché');
}

const STARTGG_API = 'https://api.start.gg/gql/alpha';
const CACHE_TTL = 3600; // 1 hora en segundos

const QUERY = `
query TournamentInfo($slug: String!) {
  tournament(slug: $slug) {
    id name slug startAt endAt state numAttendees isRegistrationOpen
    url(relative: false)
    images { url type }
    owner { id player { gamerTag } }
    events {
      id name numEntrants state
      videogame { id name images { url type } }
    }
  }
}
`;

const STATE_LABELS = { 1: 'CREATED', 2: 'ACTIVE', 3: 'COMPLETED', 4: 'CANCELLED' };

const fetchWithTimeout = async (url, options, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'Missing slug parameter' });

  // Sanitize slug — solo letras, números, guiones y /
  if (!/^[\w/-]+$/.test(slug)) return res.status(400).json({ error: 'Invalid slug' });

  const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET || '';
  if (!token) return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });

  try {
    // Intenta obtener del caché primero
    const cacheKey = `tournament:info:${slug}`;
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log(`[Cache HIT] ${cacheKey}`);
          return res.status(200).json(JSON.parse(cached));
        }
      } catch (err) {
        console.warn(`Redis get error: ${err.message}`);
      }
    }

    const sgRes = await fetchWithTimeout(STARTGG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ query: QUERY, variables: { slug } }),
    });

    if (!sgRes.ok) {
      const errorText = await sgRes.text();
      console.error(`Start.gg API error: ${sgRes.status} - ${errorText}`);
      
      // Pass through specific status codes
      if (sgRes.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit de start.gg alcanzado. Intenta de nuevo en unos minutos.',
          status: 429,
        });
      }
      if (sgRes.status === 401 || sgRes.status === 403) {
        return res.status(401).json({ 
          error: 'Token de start.gg inválido',
          status: sgRes.status,
        });
      }
      
      return res.status(502).json({ 
        error: 'Error consultando start.gg',
        status: sgRes.status,
      });
    }

    const body = await sgRes.json();
    if (body.errors) {
      console.error('Start.gg GraphQL errors:', body.errors);
      return res.status(400).json({ error: body.errors[0]?.message || 'GraphQL error' });
    }

    const t = body.data?.tournament;
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' });

    const result = {
      id: String(t.id),
      name: t.name,
      slug: t.slug,
      url: t.url || `https://www.start.gg/${t.slug}`,
      startAt: t.startAt ? new Date(t.startAt * 1000).toISOString() : null,
      endAt: t.endAt ? new Date(t.endAt * 1000).toISOString() : null,
      state: t.state,
      stateLabel: STATE_LABELS[t.state] || String(t.state),
      attendees: t.numAttendees || 0,
      registrationOpen: !!t.isRegistrationOpen,
      image: t.images?.find(i => i.type === 'profile')?.url || t.images?.[0]?.url || null,
      owner: t.owner?.player?.gamerTag || null,
      events: (t.events || []).map(e => ({
        id: String(e.id),
        name: e.name,
        entrants: e.numEntrants || 0,
        state: e.state,
        game: e.videogame?.name || null,
        gameImage: e.videogame?.images?.find(i => i.type === 'profile')?.url || e.videogame?.images?.[0]?.url || null,
      })),
    };

    // Guardar en caché si está disponible
    if (redis) {
      try {
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
      } catch (err) {
        console.warn(`Redis setex error: ${err.message}`);
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('Start.gg API timeout');
      return res.status(504).json({ error: 'API timeout - intentelo nuevamente' });
    }
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Error interno', detail: err.message });
  }
}
