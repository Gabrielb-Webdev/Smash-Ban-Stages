// POST /api/admin/broadcast-push
// Envía una push notification a TODOS los usuarios suscritos.
// Solo global admins pueden usarlo.

import { sendPushToAll } from '../../../lib/push';
import { getTicketUser } from '../../../lib/ticketAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const tu = await getTicketUser(req);
  if (!tu) return res.status(401).json({ error: 'No autenticado' });
  if (!tu.isAdmin) return res.status(403).json({ error: 'Solo global admins pueden enviar broadcasts' });

  const { title, body, tag } = req.body || {};
  if (!title || !body) return res.status(400).json({ error: 'title y body son requeridos' });

  const cleanTitle = String(title).trim().slice(0, 100);
  const cleanBody  = String(body).trim().slice(0, 300);

  try {
    await sendPushToAll({
      title: cleanTitle,
      body:  cleanBody,
      tag:   tag ? String(tag).trim().slice(0, 50) : 'afk-broadcast',
      data:  { type: 'broadcast' },
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[broadcast-push]', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
}
