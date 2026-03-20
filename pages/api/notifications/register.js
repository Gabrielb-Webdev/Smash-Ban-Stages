// API Route para registrar suscripciones push (Web Push + Expo)
import redis, { pushSubKey, pushUsersSetKey } from '../../../lib/redis';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 300);
}

function parseSubs(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return []; } }
  return [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // POST: registrar suscripción push
  if (req.method === 'POST') {
    const { userId, type, subscription, token } = req.body || {};

    if (!userId) return res.status(400).json({ error: 'userId requerido' });

    const cleanUserId = sanitize(userId);
    const subs = parseSubs(await redis.get(pushSubKey(cleanUserId)));

    if (type === 'expo' && token) {
      // Expo push token (Android APK)
      const existing = subs.findIndex(s => s.type === 'expo' && s.token === token);
      if (existing === -1) {
        subs.push({ type: 'expo', token, registeredAt: new Date().toISOString() });
      } else {
        subs[existing].registeredAt = new Date().toISOString();
      }
    } else if (subscription && subscription.endpoint) {
      // Web Push subscription (iOS PWA + desktop)
      const existing = subs.findIndex(s => s.type === 'web' && s.subscription?.endpoint === subscription.endpoint);
      if (existing === -1) {
        subs.push({ type: 'web', subscription, registeredAt: new Date().toISOString() });
      } else {
        subs[existing].subscription = subscription;
        subs[existing].registeredAt = new Date().toISOString();
      }
    } else {
      return res.status(400).json({ error: 'subscription o token requerido' });
    }

    // Máximo 10 suscripciones por usuario (diferentes dispositivos)
    const trimmed = subs.length > 10 ? subs.slice(-10) : subs;
    await redis.set(pushSubKey(cleanUserId), trimmed);
    // Agregar el userId al set global para poder notificar a todos (torneos, etc.)
    await redis.sadd(pushUsersSetKey, cleanUserId);
    // Guardar mapeo nombre→userId para envío por nombre
    const playerName = req.body?.name ? String(req.body.name).trim().slice(0, 100).toLowerCase() : null;
    if (playerName) {
      await redis.hset('push:name_to_uid', { [playerName]: cleanUserId });
    }

    // Verificar que se guardó correctamente
    const verify = await redis.get(pushSubKey(cleanUserId));

    return res.status(200).json({ success: true, totalSubscriptions: trimmed.length, userId: cleanUserId, verified: Array.isArray(verify) ? verify.length : typeof verify });
  }

  // DELETE: eliminar suscripción
  if (req.method === 'DELETE') {
    const { userId, endpoint, token } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId requerido' });

    const cleanUserId = sanitize(userId);
    const subs = parseSubs(await redis.get(pushSubKey(cleanUserId)));
    const filtered = subs.filter(s => {
      if (endpoint && s.type === 'web') return s.subscription?.endpoint !== endpoint;
      if (token && s.type === 'expo') return s.token !== token;
      return true;
    });
    await redis.set(pushSubKey(cleanUserId), filtered);
    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}