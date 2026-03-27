// Endpoint para DQ (descalificar) a un jugador en un set de start.gg
// POST /api/tournaments/dq-set
// Body: { setId, winnerId }  — winnerId = el entrantId del jugador que GANA (el que NO es DQ)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET;
  if (!token) {
    return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });
  }

  const { setId, winnerId } = req.body;
  if (!setId) return res.status(400).json({ error: 'setId requerido' });
  if (!winnerId) return res.status(400).json({ error: 'winnerId requerido' });

  const mutation = `
    mutation DQSet($setId: ID!, $winnerId: ID!) {
      reportBracketSet(setId: $setId, winnerId: $winnerId, isDQ: true) {
        id
        state
        slots {
          entrant { id name }
          standing { placement stats { score { value } } }
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
        variables: { setId: String(setId), winnerId: String(winnerId) },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.warn('⚠️ start.gg DQ errors:', JSON.stringify(data.errors));
      return res.status(400).json({ error: data.errors[0]?.message || 'Error de start.gg', details: data.errors });
    }

    const result = data.data?.reportBracketSet;
    console.log(`✅ DQ aplicado — setId=${setId} winner=${winnerId}`, result);
    return res.status(200).json({ ok: true, set: result });
  } catch (e) {
    console.error('❌ Error llamando a start.gg:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
