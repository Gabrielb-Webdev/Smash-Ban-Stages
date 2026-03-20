// GET /api/tournaments/info?slug=tournament/asd3
// Devuelve datos de un torneo de start.gg por slug

const STARTGG_API = 'https://api.start.gg/gql/alpha';

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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'Missing slug parameter' });

  // Sanitize slug — solo letras, números, guiones y /
  if (!/^[\w/-]+$/.test(slug)) return res.status(400).json({ error: 'Invalid slug' });

  const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET || '';
  if (!token) return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });

  try {
    const sgRes = await fetch(STARTGG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ query: QUERY, variables: { slug } }),
    });

    if (!sgRes.ok) return res.status(502).json({ error: 'Error consultando start.gg' });

    const body = await sgRes.json();
    if (body.errors) return res.status(502).json({ error: body.errors[0].message });

    const t = body.data?.tournament;
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' });

    return res.status(200).json({
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
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno', detail: err.message });
  }
}
