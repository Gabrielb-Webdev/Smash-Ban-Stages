// Utilidad para enviar Web Push y Expo Push Notifications
import redis, { pushSubKey } from './redis.js';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL   = process.env.VAPID_EMAIL       || 'mailto:gabrielbg211@gmail.com';

// Carga web-push dinámicamente para evitar errores de módulo CJS en Next.js
async function getWebPush() {
  try {
    const wp = (await import('web-push')).default;
    if (VAPID_PUBLIC && VAPID_PRIVATE) {
      wp.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
    }
    return wp;
  } catch {
    return null;
  }
}

/**
 * Envía push notification a un usuario (por userId).
 * @param {string} userId
 * @param {{ title: string, body: string, tag?: string, data?: object }} payload
 */
export async function sendPush(userId, payload) {
  if (!userId) return;
  try {
    const subs = (await redis.get(pushSubKey(userId))) || [];
    if (subs.length === 0) return;

    const failed = [];
    const webPayload = JSON.stringify({
      title: payload.title,
      body:  payload.body,
      tag:   payload.tag || 'afk-notif',
      data:  payload.data || {},
    });

    let wp = null;

    for (const sub of subs) {
      try {
        if (sub.type === 'expo') {
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
          if (!VAPID_PUBLIC || !VAPID_PRIVATE) continue;
          if (!wp) wp = await getWebPush();
          if (!wp) continue;
          await wp.sendNotification(sub.subscription, webPayload);
        }
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          failed.push(sub);
        }
      }
    }

    if (failed.length > 0) {
      const remaining = subs.filter(s => !failed.includes(s));
      await redis.set(pushSubKey(userId), remaining);
    }
  } catch {
    // No romper el flujo principal si push falla
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
