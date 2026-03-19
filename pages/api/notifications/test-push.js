// Endpoint de diagnóstico para probar push notifications
// GET: ver tokens registrados de un usuario
// POST: enviar push de prueba a un usuario
import redis, { pushSubKey } from '../../../lib/redis';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: ver qué tokens tiene registrado un usuario
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId requerido (?userId=...)' });
    const cleanUserId = sanitize(userId);
    const subs = (await redis.get(pushSubKey(cleanUserId))) || [];
    return res.status(200).json({
      userId: cleanUserId,
      totalSubscriptions: subs.length,
      subscriptions: subs.map(s => ({
        type: s.type,
        token: s.type === 'expo' ? s.token : '(web-push)',
        registeredAt: s.registeredAt,
      })),
    });
  }

  // POST: enviar push de prueba
  if (req.method === 'POST') {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const cleanUserId = sanitize(userId);
    const subs = (await redis.get(pushSubKey(cleanUserId))) || [];

    if (subs.length === 0) {
      return res.status(200).json({
        success: false,
        error: 'No hay tokens registrados para este usuario. ¿Abriste la app y aceptaste permisos?',
      });
    }

    const results = [];
    for (const sub of subs) {
      if (sub.type === 'expo') {
        try {
          const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              to: sub.token,
              sound: 'default',
              title: '🔔 Test Push AFK Smash',
              body: 'Si ves esto, las push notifications funcionan!',
              data: { url: '/home' },
              channelId: 'default',
              priority: 'high',
            }),
          });
          const expoData = await expoRes.json();
          results.push({ type: 'expo', token: sub.token, response: expoData });
        } catch (err) {
          results.push({ type: 'expo', token: sub.token, error: err.message });
        }
      }
    }

    return res.status(200).json({ success: true, userId: cleanUserId, results });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
