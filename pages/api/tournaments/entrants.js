// GET /api/tournaments/entrants?eventId=<id>
// Devuelve la lista de inscriptos (entrants) de un evento de start.gg

const STARTGG_API = 'https://api.start.gg/gql/alpha';

const ENTRANTS_QUERY = `
query EventEntrants($eventId: ID!, $page: Int!) {
  event(id: $eventId) {
    id
    name
    numEntrants
    entrants(query: { page: $page, perPage: 100 }) {
      pageInfo { total totalPages }
      nodes {
        id
        name
        participants {
          gamerTag
          user {
            id
            slug
            images { url type }
          }
        }
      }
    }
  }
}
`;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { eventId } = req.query;
  if (!eventId || !/^\d+$/.test(String(eventId))) {
    return res.status(400).json({ error: 'eventId inválido' });
  }

  const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET || '';
  if (!token) return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });

  try {
    const allEntrants = [];
    let page = 1, totalPages = 1;
    let eventName = '', numEntrants = 0;

    while (page <= totalPages) {
      const resp = await fetch(STARTGG_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: ENTRANTS_QUERY, variables: { eventId: String(eventId), page } }),
      });
      if (!resp.ok) return res.status(502).json({ error: 'Error consultando start.gg' });

      const body = await resp.json();
      if (body.errors) return res.status(502).json({ error: body.errors[0].message });

      const ev = body.data?.event;
      if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });

      eventName   = ev.name;
      numEntrants = ev.numEntrants || 0;
      totalPages  = ev.entrants?.pageInfo?.totalPages || 1;

      for (const e of ev.entrants?.nodes || []) {
        allEntrants.push({
          id:     String(e.id),
          name:   e.name,
          tag:    e.participants?.[0]?.gamerTag || e.name,
          avatar: e.participants?.[0]?.user?.images?.find(i => i.type === 'profile')?.url
               || e.participants?.[0]?.user?.images?.[0]?.url
               || null,
          slug:   e.participants?.[0]?.user?.slug?.replace(/^\/user\//, '').replace(/^user\//, '') || null,
        });
      }
      page++;
    }

    return res.status(200).json({ eventName, total: numEntrants, entrants: allEntrants });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno', detail: err.message });
  }
}
