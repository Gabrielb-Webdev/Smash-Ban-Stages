// API para enviar y gestionar notificaciones de llamado a setup

// Almacenamiento compartido en memoria (global del proceso Node.js)
if (!global._smashNotifs) global._smashNotifs = [];

// Sanitiza strings para prevenir XSS/inyección
function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`]/g, '').trim().slice(0, 200);
}

export default function handler(req, res) {
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

    global._smashNotifs.push(notif);

    // Mantener máximo 1000 notificaciones en memoria
    if (global._smashNotifs.length > 1000) {
      global._smashNotifs = global._smashNotifs.slice(-1000);
    }

    return res.status(201).json({ success: true, notification: notif });
  }

  // GET: Listar las últimas notificaciones (vista admin)
  if (req.method === 'GET') {
    return res.status(200).json(global._smashNotifs.slice(-50).reverse());
  }

  // PATCH: Marcar notificación como leída
  if (req.method === 'PATCH') {
    const { id } = req.body || {};

    if (!id) return res.status(400).json({ error: 'id requerido' });

    // Validar formato de ID para evitar inyección
    if (!/^n-\d+-[a-z0-9]+$/.test(String(id))) {
      return res.status(400).json({ error: 'id inválido' });
    }

    const notif = global._smashNotifs.find(n => n.id === id);
    if (notif) notif.readAt = new Date().toISOString();

    return res.status(200).json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
