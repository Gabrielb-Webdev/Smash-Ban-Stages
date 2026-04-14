// POST /api/admin/broadcast-push
// Envía una push notification a TODOS los usuarios suscritos.
// Solo admins (ADMIN_SECRET) pueden usarlo.

import { sendPushToAll } from '../../../lib/push';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'afk-admin-2025';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  if (auth !== ADMIN_SECRET) return res.status(401).json({ error: 'No autorizado' });

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
