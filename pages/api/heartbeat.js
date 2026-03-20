// POST /api/heartbeat — registra presencia online del usuario (TTL 60s)
import redis, { presenceKey } from '../../lib/redis';

const PRESENCE_TTL = 60; // segundos

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = String(req.body?.userId ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
  if (!userId) return res.status(400).json({ error: 'userId requerido' });

  await redis.set(presenceKey(userId), '1', { ex: PRESENCE_TTL });
  return res.status(200).json({ ok: true });
}
