/**
 * GET /api/santa-fe/stream-session
 *
 * Proxy hacia el servidor Render para obtener el estado actual
 * de la sesión "santafe-stream". Solo devuelve los campos que
 * necesita Controls.html para sincronizarse.
 *
 * Exclusivo para Santa Fe — no afecta ninguna otra comunidad.
 */

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const upstream = await fetch(
      `${SOCKET_URL}/session/santafe-stream`,
      { headers: { 'Cache-Control': 'no-store' }, signal: AbortSignal.timeout(4000) }
    );

    if (!upstream.ok) {
      res.status(502).json({ ok: false, reason: 'upstream_error', status: upstream.status });
      return;
    }

    const data = await upstream.json();
    res.status(200).json(data);
  } catch (e) {
    // Render dormido o sin conexión — devolver ok:false sin tirar 500
    res.status(200).json({ ok: false, reason: 'upstream_unavailable', message: e.message });
  }
}
