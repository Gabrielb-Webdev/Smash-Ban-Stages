// POST /api/tournaments/start-phase
// La API pública de start.gg NO tiene mutación para iniciar phase groups.
// Este endpoint solo activa el flag local en la app.
// Para iniciar el torneo real hay que hacerlo desde el panel de start.gg.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const auth = req.headers.authorization || '';
  if (auth !== 'Bearer afk-admin-2025') return res.status(401).json({ error: 'No autorizado' });
  return res.status(200).json({ ok: true, local: true });
}
