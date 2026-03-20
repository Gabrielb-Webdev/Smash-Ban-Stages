// Endpoint para reportar resultados de un set a start.gg
// POST /api/tournaments/report-set
// Body: { setId, winnerId, gameData: [{ gameNum, winnerId }] }
// Si winnerId es null = actualización parcial (en curso); si tiene valor = resultado final

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
          gameData: (gameData || []).map(g => ({
            gameNum: g.gameNum,
            winnerId: String(g.winnerId),
          })),
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('⚠️ start.gg API error:', JSON.stringify(data.errors));
      return res.status(400).json({ error: data.errors[0]?.message || 'Error de start.gg', details: data.errors });
    }

    return res.status(200).json({ ok: true, set: data.data?.reportBracketSet });
  } catch (err) {
    console.error('⚠️ Error calling start.gg:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
