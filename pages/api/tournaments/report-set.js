// Endpoint para reportar resultados de un set a start.gg
// POST /api/tournaments/report-set
// Body: { setId, winnerId, gameData: [{ gameNum, winnerId, selections?, stageId?,
//         p1EntrantId?, p2EntrantId?, char1Slug?, char2Slug?, stageSlug? }] }
// Si winnerId es null = actualización parcial (en curso); si tiene valor = resultado final
// Si gameData NO se envía (undefined/null) → Start.gg activa el set (CREATED → ACTIVE)
// Acepta slugs de personajes/stages y los convierte automáticamente a IDs de Start.gg

// IDs obtenidos de Start.gg API: videogame(id: 1386) → SSBU
// Keys = slugs usados en la app (lib/characters.js)
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
