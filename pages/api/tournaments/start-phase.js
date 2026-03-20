// POST /api/tournaments/start-phase
// Inicia un phase group en start.gg via mutación startPhaseGroup
// Body: { phaseGroupId: string }

const STARTGG_API = 'https://api.start.gg/gql/alpha';

const START_MUTATION = `
mutation StartPhaseGroup($phaseGroupId: ID!) {
  startPhaseGroup(phaseGroupId: $phaseGroupId) {
    id
    state
  }
}
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  if (auth !== 'Bearer afk-admin-2025') return res.status(401).json({ error: 'No autorizado' });

  const { phaseGroupId } = req.body || {};
  if (!phaseGroupId) return res.status(400).json({ error: 'Falta phaseGroupId' });
  if (!/^\d+$/.test(String(phaseGroupId))) return res.status(400).json({ error: 'phaseGroupId inválido' });

  const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET || '';
  if (!token) return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });

  try {
    const resp = await fetch(STARTGG_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        query: START_MUTATION,
        variables: { phaseGroupId: String(phaseGroupId) },
      }),
    });

    if (!resp.ok) return res.status(502).json({ error: `Error HTTP ${resp.status} de start.gg` });

    const body = await resp.json();
    if (body.errors?.length) {
      const msg = body.errors[0].message || '';
      // Si ya estaba iniciado lo tratamos como éxito
      if (/already|started|ALREADY/i.test(msg)) {
        return res.status(200).json({ id: String(phaseGroupId), state: 2, ok: true, alreadyStarted: true });
      }
      return res.status(400).json({ error: msg, startggErrors: body.errors });
    }

    const pg = body.data?.startPhaseGroup;
    if (!pg) return res.status(502).json({ error: 'Respuesta inesperada de start.gg' });

    return res.status(200).json({ id: String(pg.id), state: pg.state, ok: true });
  } catch (err) {
    console.error('[start-phase]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
