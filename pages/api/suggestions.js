// API para guardar y listar sugerencias de jugadores

import redis from '../../lib/redis';

const SUGGESTIONS_KEY = 'suggestions:list';
const MAX_SUGGESTIONS = 500;

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 500);
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { userId, userName, category, message } = req.body || {};
    const cleanMessage = sanitize(message);
    if (!cleanMessage) return res.status(400).json({ error: 'El mensaje no puede estar vacío' });

    const entry = {
      id: `sug_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: sanitize(userId || 'anon'),
      userName: sanitize(userName || 'Anónimo').slice(0, 80),
      category: ['Bug', 'Mejora', 'Nueva función', 'Otro'].includes(category) ? category : 'Otro',
      message: cleanMessage,
      createdAt: new Date().toISOString(),
    };

    await redis.lpush(SUGGESTIONS_KEY, entry);
    await redis.ltrim(SUGGESTIONS_KEY, 0, MAX_SUGGESTIONS - 1);

    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    // Solo para admins (verificar en el cliente o agregar auth aquí)
    const list = (await redis.lrange(SUGGESTIONS_KEY, 0, 49)) || [];
    return res.status(200).json({ suggestions: list });
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
