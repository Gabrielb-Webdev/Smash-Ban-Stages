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
        totalGames
        startedAt
        completedAt
        games {
          id
          orderNum
          winnerId
          stage { id }
          selections {
            selectionType
            selectionValue
            entrant { id }
          }
        }
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

// Reverse-lookup maps: Start.GG ID → app slug
const STARTGG_CHARACTER_IDS = {
  'banjo-kazooie': 1530, 'bayonetta': 1271, 'bowser': 1273, 'bowser-jr': 1272,
  'byleth': 1539, 'captain-falcon': 1274, 'chrom': 1409, 'cloud': 1275,
  'corrin': 1276, 'daisy': 1277, 'dark-pit': 1278, 'dark-samus': 1408,
  'diddy-kong': 1279, 'donkey-kong': 1280, 'dr-mario': 1282, 'duck-hunt': 1283,
  'falco': 1285, 'fox': 1286, 'ganondorf': 1287, 'greninja': 1289,
  'hero': 1526, 'ice-climbers': 1290, 'ike': 1291, 'incineroar': 1406,
  'inkling': 1292, 'isabelle': 1413, 'jigglypuff': 1293, 'joker': 1453,
  'kazuya': 1846, 'ken': 1410, 'king-dedede': 1294, 'king-k-rool': 1407,
  'kirby': 1295, 'link': 1296, 'little-mac': 1297, 'lucario': 1298,
  'lucas': 1299, 'lucina': 1300, 'luigi': 1301, 'mario': 1302,
  'marth': 1304, 'mega-man': 1305, 'meta-knight': 1307, 'mewtwo': 1310,
  'mii-brawler': 1311, 'mii-gunner': 1415, 'mii-swordfighter': 1414,
  'min-min': 1747, 'mr-game-watch': 1405, 'ness': 1313, 'olimar': 1314,
  'pac-man': 1315, 'palutena': 1316, 'peach': 1317, 'pichu': 1318,
  'pikachu': 1319, 'piranha-plant': 1441, 'pit': 1320,
  'pokemon-trainer': 1321, 'pyra-mythra': 1795, 'rob': 1323, 'richter': 1412,
  'ridley': 1322, 'robin': 1324, 'rosalina-luma': 1325, 'roy': 1326,
  'ryu': 1327, 'samus': 1328, 'sephiroth': 1777, 'sheik': 1329,
  'shulk': 1330, 'simon': 1411, 'snake': 1331, 'sonic': 1332,
  'sora': 1897, 'steve': 1766, 'terry': 1532, 'toon-link': 1333,
  'villager': 1334, 'wario': 1335, 'wii-fit-trainer': 1336, 'wolf': 1337,
  'yoshi': 1338, 'young-link': 1339, 'zelda': 1340, 'zero-suit-samus': 1341,
};
const STARTGG_STAGE_IDS = {
  'battlefield': 311, 'small-battlefield': 484, 'final-destination': 328,
  'pokemon-stadium-2': 378, 'smashville': 387, 'town-and-city': 397,
  'kalos': 348, 'hollow-bastion': 513,
};
const CHAR_ID_TO_SLUG  = Object.fromEntries(Object.entries(STARTGG_CHARACTER_IDS).map(([k, v]) => [v, k]));
const STAGE_ID_TO_SLUG = Object.fromEntries(Object.entries(STARTGG_STAGE_IDS).map(([k, v]) => [v, k]));

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
        const p1EntrantId = (s.slots || []).find(sl => sl.slotIndex === 0)?.entrant?.id;
        const p2EntrantId = (s.slots || []).find(sl => sl.slotIndex === 1)?.entrant?.id;
        const mappedGames = (s.games || [])
          .sort((a, b) => (a.orderNum || 0) - (b.orderNum || 0))
          .map(g => {
            const selP1 = (g.selections || []).find(sel => String(sel.entrant?.id) === String(p1EntrantId));
            const selP2 = (g.selections || []).find(sel => String(sel.entrant?.id) === String(p2EntrantId));
            return {
              gameNum:  g.orderNum,
              winnerId: g.winnerId ? String(g.winnerId) : null,
              char0:    selP1 ? (CHAR_ID_TO_SLUG[selP1.selectionValue] || '') : '',
              char1:    selP2 ? (CHAR_ID_TO_SLUG[selP2.selectionValue] || '') : '',
              stageId:  g.stage?.id ? (STAGE_ID_TO_SLUG[g.stage.id] || '') : '',
            };
          });
        return {
          id:           String(s.id),
          nextMatchId,
          nextLooserMatchId,
          round:        s.fullRoundText || '',
          state:        s.state,
          stateLabel:   SET_STATE_LABELS[s.state] || 'UNKNOWN',
          completedAt:  s.completedAt ? new Date(s.completedAt * 1000).toISOString() : null,
          totalGames:   s.totalGames || null,
          games:        mappedGames,
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
