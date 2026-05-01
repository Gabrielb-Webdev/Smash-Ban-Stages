/**
 * GET  /api/santa-fe/overlay2-state  → devuelve el último estado enviado por control.html
 * POST /api/santa-fe/overlay2-state  → almacena nuevo estado desde control.html
 *
 * Proxy al servidor Render para comunicación cross-browser / cross-device / OBS.
 */

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const upstream = await fetch(
        `${SOCKET_URL}/overlay2-state`,
        { headers: { 'Cache-Control': 'no-store' }, signal: AbortSignal.timeout(4000) }
      );
      if (!upstream.ok) {
        res.status(502).json({ ok: false });
        return;
      }
      const data = await upstream.json();
      res.status(200).json(data);
    } catch (e) {
      res.status(200).json({});
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const upstream = await fetch(
        `${SOCKET_URL}/overlay2-state`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
          signal: AbortSignal.timeout(4000),
        }
      );
      const data = await upstream.json();
      res.status(200).json(data);
    } catch (e) {
      res.status(200).json({ ok: false, reason: 'upstream_unavailable' });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
