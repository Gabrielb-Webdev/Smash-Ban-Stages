// API Route para gestionar torneos
import { sendPushToAll } from '../../lib/push';

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Los torneos reales vienen de /api/tournaments/sync-startgg
    res.status(200).json([]);
  } else if (req.method === 'POST') {
    // Publicar torneo y notificar a todos los usuarios con push activo
    const { name, description } = req.body || {};

    // Proteger con clave de admin
    const authHeader = req.headers['authorization'] || '';
    const adminSecret = authHeader.replace('Bearer ', '').trim();
    const validSecret = process.env.ADMIN_SECRET || 'afk-admin-2025';
    if (adminSecret !== validSecret) {
      return res.status(401).json({ error: 'No autorizado' });
    }

    const tournamentName = String(name || 'Nuevo torneo').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
    const tournamentDesc = String(description || '¡Mirá los detalles en la app!').replace(/[<>"'`\\]/g, '').trim().slice(0, 200);

    sendPushToAll({
      title: `🏆 ${tournamentName}`,
      body: tournamentDesc,
      tag: 'tournament',
      data: { url: '/home?open=torneos' },
    }).catch(() => {});

    res.status(200).json({ success: true, message: 'Notificación enviada a todos los usuarios' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}