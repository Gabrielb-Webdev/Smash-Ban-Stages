// API para enviar y gestionar notificaciones de llamado a setup
import redis, { notifsKey, broadcastNotifsKey } from '../../../lib/redis';
import { sendPush, sendPushToAll } from '../../../lib/push';

// Sanitiza strings para prevenir XSS/inyección
function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`]/g, '').trim().slice(0, 200);
}

/**
 * Normaliza el nombre del jugador para la búsqueda en Redis.
 * Start.gg devuelve nombres con prefijo de sponsor: "SPONSOR | Tag" → usa solo "Tag".
 * Así el lookup funciona tanto si viene con sponsor como sin él.
 */
function extractTag(name) {
  const s = sanitize(name);
  const idx = s.indexOf(' | ');
  return (idx !== -1 ? s.slice(idx + 3) : s).trim().toLowerCase();
}

/** Guarda una notif en el inbox Redis + envía web push si hay suscripción registrada + WS en tiempo real */
async function storeAndPush(playerName, notif, pushPayload) {
  const normalizedName = extractTag(playerName);
  const key = notifsKey(normalizedName);
  const existing = (await redis.get(key)) || [];
  existing.push(notif);
  const sliced = existing.length > 100 ? existing.slice(-100) : existing;
  await redis.set(key, sliced);

  // Intentar enviar web push + WS real-time (no bloquea si falla)
  try {
    const uid = await redis.hget('push:name_to_uid', normalizedName);
    if (uid) {
      await sendPush(uid, pushPayload).catch(() => {});
      // Notificar en tiempo real si el usuario está conectado al servidor WS
      const wsUrl = process.env.SOCKET_SERVER_URL;
      const wsSecret = process.env.WS_INTERNAL_SECRET;
      if (wsUrl && wsSecret) {
        fetch(`${wsUrl}/emit-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${wsSecret}` },
          body: JSON.stringify({ event: 'new-notification', userId: uid, data: notif }),
        }).catch(() => {});
      }
    }
  } catch { /* no interrumpir */ }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POST: Admin envía llamado a uno o varios jugadores
  if (req.method === 'POST') {
    const { targetName, targetUserNames, title, body, setup, message, sentBy, tournamentId, data, broadcast } = req.body || {};

    // --- Modo broadcast: push a TODOS los usuarios + guardar en inbox global ---
    if (broadcast) {
      const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
      const secret = process.env.ADMIN_SECRET || 'afk-admin-2025';
      if (auth !== secret) return res.status(401).json({ error: 'No autorizado' });
      const cleanTitle = sanitize(title || '📢 AFK Smash');
      const cleanBody  = sanitize(body || '');
      const notif = {
        id: `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: data?.type || 'broadcast',
        setup: cleanTitle,
        message: cleanBody,
        sentBy: 'Sistema',
        sentAt: new Date().toISOString(),
        readAt: null,
        url: data?.url || null,
        _broadcast: true,
      };
      // Guardar en lista global de broadcasts (max 20, más reciente primero)
      try {
        const existing = (await redis.get(broadcastNotifsKey)) || [];
        existing.unshift(notif);
        await redis.set(broadcastNotifsKey, existing.slice(0, 20));
      } catch {}
      sendPushToAll({ title: cleanTitle, body: cleanBody, data: data || {} }).catch(() => {});
      return res.status(201).json({ success: true, broadcast: true });
    }

    // --- Modo nuevo: array de nombres (desde callMatch) ---
    if (Array.isArray(targetUserNames) && targetUserNames.length > 0) {
      const cleanTitle   = sanitize(title || '📢 AFK Smash');
      const cleanBody    = sanitize(body || '');
      const pushPayload  = { title: cleanTitle, body: cleanBody, data: data || {} };

      await Promise.allSettled(targetUserNames.map(name => {
        const notif = {
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'call_to_play',
          targetName: sanitize(name),
          setup: setup ? sanitize(setup) : '',
          message: cleanBody || cleanTitle,
          sentBy: sentBy ? sanitize(sentBy) : 'Admin',
          tournamentId: tournamentId ? sanitize(tournamentId) : null,
          sentAt: new Date().toISOString(),
          readAt: null,
          url: data?.url || null,
        };
        return storeAndPush(name, notif, pushPayload);
      }));

      return res.status(201).json({ success: true, notified: targetUserNames.length });
    }

    // --- Modo legado: targetName individual ---
    if (!targetName || !setup) {
      return res.status(400).json({ error: 'targetName y setup son requeridos' });
    }

    const notif = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'call_to_play',
      targetName: sanitize(targetName),
      setup: sanitize(setup),
      message: message ? sanitize(message) : `Tu turno — ${sanitize(setup)}`,
      sentBy: sentBy ? sanitize(sentBy) : 'Admin',
      tournamentId: tournamentId ? sanitize(tournamentId) : null,
      sentAt: new Date().toISOString(),
      readAt: null,
    };

    const pushPayload = { title: notif.message, body: notif.message, data: {} };
    await storeAndPush(targetName, notif, pushPayload);

    return res.status(201).json({ success: true, notification: notif });
  }

  // GET: Listar las últimas notificaciones de todos los usuarios (vista admin)
  if (req.method === 'GET') {
    return res.status(200).json([]);
  }

  // PATCH: Marcar notificación(es) como leída(s)
  if (req.method === 'PATCH') {
    const { id, name, action } = req.body || {};

    if (!name) return res.status(400).json({ error: 'name requerido' });

    const key = notifsKey(sanitize(name));

    // Marcar todas como leídas
    if (action === 'mark-all-read') {
      const notifs = (await redis.get(key)) || [];
      const now = new Date().toISOString();
      let changed = false;
      notifs.forEach(n => { if (!n.readAt) { n.readAt = now; changed = true; } });
      if (changed) await redis.set(key, notifs);
      return res.status(200).json({ success: true });
    }

    // Marcar una sola
    if (!id) return res.status(400).json({ error: 'id requerido' });

    // Validar formato de ID para evitar inyección
    if (!/^n-\d+-[a-z0-9]+$/.test(String(id))) {
      return res.status(400).json({ error: 'id inválido' });
    }

    const notifs = (await redis.get(key)) || [];
    const idx = notifs.findIndex(n => n.id === id);
    if (idx !== -1) {
      notifs[idx].readAt = new Date().toISOString();
      await redis.set(key, notifs);
    }

    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
