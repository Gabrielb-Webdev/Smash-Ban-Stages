// GET /api/mendoza/config — expone configuración pública para archivos HTML estáticos
// Permite que control.html obtenga la URL del servidor Socket.IO sin hardcodear env vars

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  res.status(200).json({
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
  });
}
