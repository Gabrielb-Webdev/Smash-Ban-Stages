// API para que jugadores consulten sus notificaciones pendientes
// Comparte almacenamiento con send.js vía global._smashNotifs

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: 'name requerido' });
    }

    if (!global._smashNotifs) global._smashNotifs = [];

    const nameLower = decodeURIComponent(name).trim().toLowerCase();

    // Validar longitud para prevenir abuso
    if (nameLower.length > 100) {
      return res.status(400).json({ error: 'name demasiado largo' });
    }

    const userNotifs = global._smashNotifs
      .filter(n => n.targetName.toLowerCase() === nameLower)
      .slice(-20); // Últimas 20 notificaciones

    return res.status(200).json(userNotifs);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
