// API Route para manejar sesiones sin WebSocket
// Usa memoria en runtime de Vercel (persiste durante la ejecución)

const sessions = new Map();

export default function handler(req, res) {
  const { sessionId } = req.query;
  const { method } = req;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET - Obtener sesión
  if (method === 'GET') {
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }
    return res.status(200).json({ session });
  }

  // POST - Crear sesión
  if (method === 'POST') {
    const { player1, player2, format } = req.body;
    
    const session = {
      sessionId,
      player1: {
        name: player1,
        score: 0,
        character: null,
        wonStages: []
      },
      player2: {
        name: player2,
        score: 0,
        character: null,
        wonStages: []
      },
      format,
      currentGame: 1,
      phase: 'RPS',
      rpsWinner: null,
      lastGameWinner: null,
      currentTurn: null,
      availableStages: [],
      bannedStages: [],
      selectedStage: null,
      banHistory: [],
      bansRemaining: 0,
      totalBansNeeded: 0,
      lastUpdate: Date.now()
    };

    sessions.set(sessionId, session);
    return res.status(201).json({ session });
  }

  // PUT - Actualizar sesión
  if (method === 'PUT') {
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Sesión no encontrada' });
    }

    const updates = req.body;
    Object.assign(session, updates, { lastUpdate: Date.now() });
    sessions.set(sessionId, session);

    return res.status(200).json({ session });
  }

  // DELETE - Eliminar sesión
  if (method === 'DELETE') {
    sessions.delete(sessionId);
    return res.status(200).json({ message: 'Sesión eliminada' });
  }

  res.status(405).json({ error: 'Método no permitido' });
}
