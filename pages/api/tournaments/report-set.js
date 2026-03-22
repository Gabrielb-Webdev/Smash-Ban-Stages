// Endpoint para reportar resultados de un set a start.gg
// POST /api/tournaments/report-set
// Body: { setId, winnerId, gameData: [{ gameNum, winnerId, selections?, stageId?,
//         p1EntrantId?, p2EntrantId?, char1Slug?, char2Slug?, stageSlug? }] }
// Si winnerId es null = actualización parcial (en curso); si tiene valor = resultado final
// Si gameData NO se envía (undefined/null) → Start.gg activa el set (CREATED → ACTIVE)
// Acepta slugs de personajes/stages y los convierte automáticamente a IDs de Start.gg

const STARTGG_CHARACTER_IDS = {
  'banjo-kazooie': 1747, 'bayonetta': 1279, 'bowser': 1272, 'bowser-jr': 1283,
  'byleth': 1749, 'captain-falcon': 1281, 'chrom': 1741, 'cloud': 1285,
  'corrin': 1287, 'daisy': 1739, 'dark-pit': 1289, 'dark-samus': 1740,
  'diddy-kong': 1291, 'donkey-kong': 1275, 'dr-mario': 1293, 'duck-hunt': 1295,
  'falco': 1297, 'fox': 1299, 'ganondorf': 1301, 'greninja': 1303,
  'hero': 1748, 'ice-climbers': 1305, 'ike': 1307, 'incineroar': 1743,
  'inkling': 1738, 'isabelle': 1742, 'jigglypuff': 1309, 'joker': 1746,
  'kazuya': 1753, 'ken': 1744, 'king-dedede': 1311, 'king-k-rool': 1745,
  'kirby': 1313, 'link': 1315, 'little-mac': 1317, 'lucario': 1319,
  'lucas': 1321, 'lucina': 1323, 'luigi': 1325, 'mario': 1273,
  'marth': 1327, 'mega-man': 1329, 'meta-knight': 1331, 'mewtwo': 1333,
  'mii-brawler': 1335, 'mii-gunner': 1337, 'mii-swordfighter': 1339,
  'min-min': 1750, 'mr-game-watch': 1341, 'ness': 1343, 'olimar': 1345,
  'pac-man': 1347, 'palutena': 1349, 'peach': 1351, 'pichu': 1353,
  'pikachu': 1355, 'piranha-plant': 1756, 'pit': 1357,
  'pokemon-trainer': 1359, 'pyra-mythra': 1752, 'rob': 1361, 'richter': 1736,
  'ridley': 1737, 'robin': 1363, 'rosalina-luma': 1365, 'roy': 1367,
  'ryu': 1369, 'samus': 1371, 'sephiroth': 1751, 'sheik': 1373,
  'shulk': 1375, 'simon': 1735, 'snake': 1377, 'sonic': 1379,
  'sora': 1755, 'steve': 1754, 'terry': 1758, 'toon-link': 1381,
  'villager': 1383, 'wario': 1385, 'wii-fit-trainer': 1387, 'wolf': 1389,
  'yoshi': 1391, 'young-link': 1393, 'zelda': 1395, 'zero-suit-samus': 1397,
};

const STARTGG_STAGE_IDS = {
  'battlefield': 317, 'small-battlefield': 467, 'final-destination': 318,
  'pokemon-stadium-2': 316, 'smashville': 327, 'town-and-city': 336,
  'kalos': 340, 'hollow-bastion': 468,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET;
  if (!token) {
    return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });
  }

  const { setId, winnerId, gameData } = req.body;
  if (!setId) {
    return res.status(400).json({ error: 'setId requerido' });
  }

  const mutation = `
    mutation ReportSet($setId: ID!, $winnerId: ID, $gameData: [BracketSetGameDataInput]) {
      reportBracketSet(setId: $setId, winnerId: $winnerId, isDQ: false, gameData: $gameData) {
        id
        state
        slots {
          standing {
            placement
            stats { score { value } }
          }
        }
      }
    }
  `;

  // Si gameData es undefined/null del body → pasar null a Start.gg (activa el set sin juegos)
  // Si gameData es [] vacío → pasar null también (comportamiento igual)
  // Si gameData tiene entries → mapear normalmente
  let mappedGameData = null;
  if (Array.isArray(gameData) && gameData.length > 0) {
    mappedGameData = gameData.map(g => {
      const gd = { gameNum: g.gameNum, winnerId: String(g.winnerId) };

      // Si ya vienen selections pre-armadas (del servidor), usarlas
      if (g.selections?.length) {
        gd.selections = g.selections;
      } else {
        // Auto-construir selections desde slugs de personajes (del admin panel)
        const selections = [];
        if (g.char1Slug && g.p1EntrantId) {
          const charId = STARTGG_CHARACTER_IDS[g.char1Slug];
          if (charId) selections.push({ entrantId: String(g.p1EntrantId), characterId: charId });
        }
        if (g.char2Slug && g.p2EntrantId) {
          const charId = STARTGG_CHARACTER_IDS[g.char2Slug];
          if (charId) selections.push({ entrantId: String(g.p2EntrantId), characterId: charId });
        }
        if (selections.length > 0) gd.selections = selections;
      }

      // stageId: si es numérico usarlo directo, si es slug mapearlo
      if (g.stageId != null) {
        if (typeof g.stageId === 'string' && isNaN(g.stageId)) {
          const mapped = STARTGG_STAGE_IDS[g.stageId];
          if (mapped) gd.stageId = mapped;
        } else {
          gd.stageId = Number(g.stageId);
        }
      } else if (g.stageSlug) {
        const mapped = STARTGG_STAGE_IDS[g.stageSlug];
        if (mapped) gd.stageId = mapped;
      }

      return gd;
    });
  }

  const STATE_LABELS = { 1: 'CREATED', 2: 'ACTIVE', 3: 'COMPLETED', 6: 'BYE', 7: 'CALLED' };

  try {
    const response = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          setId: String(setId),
          winnerId: winnerId ? String(winnerId) : null,
          gameData: mappedGameData,
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('⚠️ start.gg API error:', JSON.stringify(data.errors));
      return res.status(400).json({ error: data.errors[0]?.message || 'Error de start.gg', details: data.errors });
    }

    const raw = data.data?.reportBracketSet;
    const resultSet = Array.isArray(raw) ? raw[0] : raw;
    const stateLabel = STATE_LABELS[resultSet?.state] || resultSet?.state || '?';
    console.log(`✅ report-set ${setId} → state=${stateLabel} (${resultSet?.state}) winner=${winnerId || 'null'} games=${mappedGameData?.length ?? 'null'}`);

    return res.status(200).json({ ok: true, set: raw, state: resultSet?.state, stateLabel });
  } catch (err) {
    console.error('⚠️ Error calling start.gg:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
