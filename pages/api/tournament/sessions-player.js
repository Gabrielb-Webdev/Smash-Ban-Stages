// Proxy para /sessions/player del servidor Render (evita CORS en el cliente)
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'name required' });

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
  try {
    const r = await fetch(`${socketUrl}/sessions/player?name=${encodeURIComponent(name)}`);
    if (!r.ok) return res.status(r.status).end();
    const data = await r.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
  } catch {
    return res.status(502).end();
  }
}
