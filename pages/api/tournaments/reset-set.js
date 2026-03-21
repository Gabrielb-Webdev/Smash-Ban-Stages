// Endpoint para resetear un set en start.gg (vuelve a estado CREATED)
// POST /api/tournaments/reset-set
// Body: { setId }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET;
  if (!token) {
    return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });
  }

  const { setId } = req.body;
  if (!setId) {
    return res.status(400).json({ error: 'setId requerido' });
  }

  const mutation = `
    mutation ResetSet($setId: ID!) {
      resetSet(setId: $setId) {
        id
        state
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
      body: JSON.stringify({ query: mutation, variables: { setId: String(setId) } }),
    });

    const data = await response.json();

    if (data.errors) {
      console.warn('⚠️ start.gg resetSet errors:', JSON.stringify(data.errors));
      return res.status(400).json({ error: data.errors[0]?.message || 'Error de start.gg', details: data.errors });
    }

    console.log(`✅ start.gg set ${setId} reseteado:`, data.data?.resetSet);
    return res.status(200).json({ ok: true, set: data.data?.resetSet });
  } catch (e) {
    console.error('❌ Error llamando a start.gg:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
