// GET /api/tournaments/bracket?phaseGroupId=3244687
// Devuelve los sets de un phaseGroup de start.gg

const STARTGG_API = 'https://api.start.gg/gql/alpha';

const SETS_QUERY = `
query PhaseGroupSets($phaseGroupId: ID!, $page: Int!) {
  phaseGroup(id: $phaseGroupId) {
    id
    state
    displayIdentifier
    phase { name }
    sets(page: $page, perPage: 50, sortType: CALL_ORDER) {
      pageInfo { total totalPages }
      nodes {
        id
        fullRoundText
        state
        startedAt
        completedAt
        slots {
          id
          slotIndex
          prereqType
          prereqId
          entrant { id name }
          standing { placement stats { score { value } } }
        }
      }
    }
  }
}
`;

// start.gg set states: 1=CREATED 2=STARTED 3=COMPLETED 6=BYE 7=CALLED(called to setup)
const SET_STATE_LABELS = { 1: 'CREATED', 2: 'ACTIVE', 3: 'COMPLETED', 6: 'BYE', 7: 'CALLED' };

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { phaseGroupId } = req.query;
  if (!phaseGroupId || !/^\d+$/.test(String(phaseGroupId))) {
    return res.status(400).json({ error: 'phaseGroupId inválido' });
  }

  const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET || '';
  if (!token) return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });

  try {
    const allSets = [];
    let page = 1;
    let totalPages = 1;
    let phaseName = '';
    let phaseGroupState = 1;

    while (page <= totalPages) {
      const resp = await fetch(STARTGG_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: SETS_QUERY, variables: { phaseGroupId: String(phaseGroupId), page } }),
      });

      if (!resp.ok) return res.status(502).json({ error: 'Error consultando start.gg' });

      const body = await resp.json();
      if (body.errors) return res.status(502).json({ error: body.errors[0].message });

      const pg = body.data?.phaseGroup;
      if (!pg) return res.status(404).json({ error: 'Phase group no encontrado' });

      phaseName       = pg.phase?.name || '';
      phaseGroupState = pg.state || 1;
      totalPages      = pg.sets?.pageInfo?.totalPages || 1;
      allSets.push(...(pg.sets?.nodes || []));
      page++;
    }

    // Build forward-reference map: setId → [{nextSetId, isLosers}]
    const forwardRefs = {};
    allSets.forEach(setY => {
      (setY.slots || []).forEach(slot => {
        if (slot.prereqType === 'set' && slot.prereqId) {
          const key = String(slot.prereqId);
          if (!forwardRefs[key]) forwardRefs[key] = [];
          forwardRefs[key].push({
            nextSetId: String(setY.id),
            isLosers: (setY.fullRoundText || '').toLowerCase().includes('losers'),
          });
        }
      });
    });

    return res.status(200).json({
      phaseGroupId: String(phaseGroupId),
      phaseName,
      phaseGroupState,
      sets: allSets.map(s => {
        const refs = forwardRefs[String(s.id)] || [];
        const isCurrentLosers = (s.fullRoundText || '').toLowerCase().includes('losers');
        let nextMatchId = null;
        let nextLooserMatchId = null;
        for (const ref of refs) {
          if (!isCurrentLosers && ref.isLosers) {
            nextLooserMatchId = ref.nextSetId;
          } else {
            nextMatchId = ref.nextSetId;
          }
        }
        return {
          id:           String(s.id),
          nextMatchId,
          nextLooserMatchId,
          round:        s.fullRoundText || '',
          state:        s.state,
          stateLabel:   SET_STATE_LABELS[s.state] || 'UNKNOWN',
          completedAt:  s.completedAt ? new Date(s.completedAt * 1000).toISOString() : null,
          slots: (s.slots || []).map(slot => ({
            id:      slot.id,
            index:   slot.slotIndex,
            entrant: slot.entrant ? { id: String(slot.entrant.id), name: slot.entrant.name } : null,
            score:   slot.standing?.stats?.score?.value ?? null,
            placement: slot.standing?.placement ?? null,
          })),
        };
      }),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno', detail: err.message });
  }
}
