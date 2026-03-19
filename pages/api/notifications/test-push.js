// Endpoint de diagnóstico para probar push notifications
// GET ?userId=ID → ver tokens registrados
// GET ?userId=ID&send=1 → enviar push de prueba
// GET ?userId=ID&register=EXPO_TOKEN → registrar token manualmente
import redis, { pushSubKey, pushUsersSetKey } from '../../../lib/redis';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, send, register } = req.query;
  if (!userId) {
    return res.status(400).json({
      error: 'userId requerido',
      uso: '/api/notifications/test-push?userId=TU_ID para ver tokens',
      enviar: '/api/notifications/test-push?userId=TU_ID&send=1 para enviar push de prueba',
      registrar: '/api/notifications/test-push?userId=TU_ID&register=ExponentPushToken[xxx] para registrar token manualmente',
    });
  }

  const cleanUserId = sanitize(userId);

  // Registrar token manualmente (para debug)
  if (register) {
    const cleanToken = sanitize(register);
    if (!cleanToken.startsWith('ExponentPushToken[')) {
      return res.status(400).json({ error: 'Token inválido. Debe ser ExponentPushToken[...]' });
    }
    const subs = (await redis.get(pushSubKey(cleanUserId))) || [];
    const existing = subs.findIndex(s => s.type === 'expo' && s.token === cleanToken);
    if (existing === -1) {
      subs.push({ type: 'expo', token: cleanToken, registeredAt: new Date().toISOString() });
    } else {
      subs[existing].registeredAt = new Date().toISOString();
    }
    await redis.set(pushSubKey(cleanUserId), subs);
    await redis.sadd(pushUsersSetKey, cleanUserId);
    return res.status(200).json({
      success: true,
      message: '✅ Token registrado manualmente',
      userId: cleanUserId,
      token: cleanToken,
      totalSubscriptions: subs.length,
    });
  }

  const rawSubs = await redis.get(pushSubKey(cleanUserId));
  const subs = Array.isArray(rawSubs) ? rawSubs : (typeof rawSubs === 'string' ? (() => { try { return JSON.parse(rawSubs); } catch { return []; } })() : []);

  const vapidConfigured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

  // Solo ver tokens
  if (!send) {
    return res.status(200).json({
      userId: cleanUserId,
      redisKey: pushSubKey(cleanUserId),
      rawType: rawSubs === null ? 'null' : typeof rawSubs,
      totalSubscriptions: subs.length,
      expoTokens: subs.filter(s => s.type === 'expo').map(s => ({ token: s.token, registeredAt: s.registeredAt })),
      webTokens: subs.filter(s => s.type === 'web').length,
      vapidConfigured,
      diagnostico: subs.length === 0
        ? '❌ No hay tokens. El usuario no abrió la app o no aceptó permisos.'
        : '✅ Tokens registrados. Usá &send=1 para enviar push de prueba.',
    });
  }

  // Enviar push de prueba
  if (subs.length === 0) {
    return res.status(200).json({
      success: false,
      error: '❌ No hay tokens registrados. Abrí la app, logueate, y aceptá permisos de notificación.',
    });
  }

  const results = [];
  for (const sub of subs) {
    if (sub.type === 'expo') {
      try {
        const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            to: sub.token,
            sound: 'default',
            title: '🔔 Test Push AFK Smash',
            body: 'Si ves esto en la barra de notificaciones, ¡funciona!',
            data: { url: '/home' },
            channelId: 'default',
            priority: 'high',
          }),
        });
        const expoData = await expoRes.json();
        const ticket = expoData?.data;
        let diagnostico = '';
        if (ticket?.status === 'ok') {
          diagnostico = '✅ Expo aceptó la notificación. Si no llega al teléfono, el problema es FCM (Firebase).';
        } else if (ticket?.status === 'error') {
          diagnostico = `❌ Expo rechazó: ${ticket.message || ticket.details?.error || 'error desconocido'}`;
        } else {
          diagnostico = '⚠️ Respuesta inesperada de Expo';
        }
        results.push({ type: 'expo', token: sub.token, expoResponse: expoData, diagnostico });
      } catch (err) {
        results.push({ type: 'expo', token: sub.token, error: err.message, diagnostico: '❌ Error de red al contactar Expo' });
      }
    }
  }

  return res.status(200).json({
    success: true,
    userId: cleanUserId,
    results,
    siguientePaso: 'Si Expo dice OK pero no llega al teléfono → falta configurar Firebase/FCM en el proyecto Expo.',
  });
}
