// Utilidad para enviar Web Push y Expo Push Notifications
import webpush from 'web-push';
import redis, { pushSubKey } from './redis.js';

// VAPID config — setear VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY y VAPID_EMAIL en env
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL   = process.env.VAPID_EMAIL       || 'mailto:gabrielbg211@gmail.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

/**
 * Envía push notification a un usuario (por userId).
 * Busca todas sus suscripciones (web push + expo) y envía a todas.
 * @param {string} userId
 * @param {{ title: string, body: string, tag?: string, data?: object }} payload
 */
export async function sendPush(userId, payload) {
  if (!userId) return;
  const subs = (await redis.get(pushSubKey(userId))) || [];
  if (subs.length === 0) return;

  const failed = [];
  const webPayload = JSON.stringify({
    title: payload.title,
    body:  payload.body,
    tag:   payload.tag || 'afk-notif',
    data:  payload.data || {},
  });

  for (const sub of subs) {
    try {
      if (sub.type === 'expo') {
        // Expo Push Notification
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: sub.token,
            sound: 'default',
            title: payload.title,
            body:  payload.body,
            data:  payload.data || {},
          }),
        });
      } else {
        // Web Push
        if (!VAPID_PUBLIC || !VAPID_PRIVATE) continue;
        await webpush.sendNotification(sub.subscription, webPayload);
      }
    } catch (err) {
      // 410 Gone o 404 = suscripción expirada/inválida → marcar para eliminar
      if (err.statusCode === 410 || err.statusCode === 404) {
        failed.push(sub);
      }
    }
  }

  // Limpiar suscripciones inválidas
  if (failed.length > 0) {
    const remaining = subs.filter(s => !failed.includes(s));
    await redis.set(pushSubKey(userId), remaining);
  }
}

/**
 * Envía push a múltiples usuarios.
 * @param {string[]} userIds
 * @param {{ title: string, body: string, tag?: string, data?: object }} payload
 */
export async function sendPushToMany(userIds, payload) {
  await Promise.allSettled(userIds.map(id => sendPush(id, payload)));
}
