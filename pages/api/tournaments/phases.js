// GET /api/tournaments/phases?slug=tournament/mi-torneo
// Devuelve eventos → fases → phase groups de un torneo de start.gg

const STARTGG_API = 'https://api.start.gg/gql/alpha';

const PHASES_QUERY = `
query TournamentPhases($slug: String!) {
  tournament(slug: $slug) {
    id
    name
    events {
      id
      name
      numEntrants
      state
      phases {
        id
        name
        bracketType
        state
        phaseGroups(query: { page: 1, perPage: 50 }) {
          nodes {
            id
            displayIdentifier
          }
        }
      }
    }
  }
}
`;

const STATE_LABELS = { 1: 'CREATED', 2: 'ACTIVE', 3: 'COMPLETED', 4: 'CANCELLED' };

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ error: 'Missing slug' });
  if (!/^[\w/-]+$/.test(slug)) return res.status(400).json({ error: 'Invalid slug' });

  const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET || '';
  if (!token) return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });

  try {
    const resp = await fetch(STARTGG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: PHASES_QUERY, variables: { slug } }),
    });
    if (!resp.ok) return res.status(502).json({ error: 'Error consultando start.gg' });

    const body = await resp.json();
    if (body.errors) return res.status(502).json({ error: body.errors[0].message });

    const t = body.data?.tournament;
    if (!t) return res.status(404).json({ error: 'Torneo no encontrado' });

    return res.status(200).json({
      id:   String(t.id),
      name: t.name,
      events: (t.events || []).map(e => ({
        id:         String(e.id),
        name:       e.name,
        entrants:   e.numEntrants || 0,
        state:      e.state,
        stateLabel: STATE_LABELS[e.state] || String(e.state),
        phases: (e.phases || []).map(p => ({
          id:          String(p.id),
          name:        p.name,
          bracketType: p.bracketType || '',
          state:       p.state,
          stateLabel:  STATE_LABELS[p.state] || String(p.state),
          phaseGroups: (p.phaseGroups?.nodes || []).map(pg => ({
            id:    String(pg.id),
            label: pg.displayIdentifier || 'Pool 1',
          })),
        })),
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno', detail: err.message });
  }
}
