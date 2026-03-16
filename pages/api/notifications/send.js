// API para enviar y gestionar notificaciones de llamado a setup
import redis, { notifsKey } from '../../../lib/redis';

// Sanitiza strings para prevenir XSS/inyección
function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`]/g, '').trim().slice(0, 200);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POST: Admin envía llamado a un jugador
  if (req.method === 'POST') {
    const { targetName, setup, message, sentBy, tournamentId } = req.body || {};

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

    const key = notifsKey(notif.targetName);
    const existing = (await redis.get(key)) || [];
    existing.push(notif);
    // Máximo 100 notificaciones por usuario
    const sliced = existing.length > 100 ? existing.slice(-100) : existing;
    await redis.set(key, sliced);

    return res.status(201).json({ success: true, notification: notif });
  }

  // GET: Listar las últimas notificaciones de todos los usuarios (vista admin)
  if (req.method === 'GET') {
    return res.status(200).json([]);
  }

  // PATCH: Marcar notificación como leída
  if (req.method === 'PATCH') {
    const { id, name } = req.body || {};

    if (!id || !name) return res.status(400).json({ error: 'id y name requeridos' });

    // Validar formato de ID para evitar inyección
    if (!/^n-\d+-[a-z0-9]+$/.test(String(id))) {
      return res.status(400).json({ error: 'id inválido' });
    }

    const key = notifsKey(sanitize(name));
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
