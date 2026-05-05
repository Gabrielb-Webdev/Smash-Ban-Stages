import { tryAutoAssign } from '../../../lib/offlineAutoAssign';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'afk-admin-2025';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  if (auth !== ADMIN_SECRET) return res.status(401).json({ error: 'No autorizado' });

  await tryAutoAssign();
  return res.status(200).json({ ok: true });
}
