// API Route para check-in a un match
import { NextApiRequest, NextApiResponse } from 'next';

// Mock storage para matches - en producción usar base de datos
let mockMatches = [
  {
    id: 'match-1',
    tournamentId: '1',
    round: 'Winners Quarterfinals',
    player1: { id: 'player-1', name: 'Gabriel', tag: 'Gabi' },
    player2: { id: 'player-2', name: 'Ikki', tag: 'Ikki' },
    status: 'ready',
    checkedInPlayers: [],
    streamMatch: false,
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { matchId } = req.query;

  if (req.method === 'POST') {
    // TODO: Obtener userId del token de autorización
    const userId = 'mock-user-123'; // Mock user ID
    
    const matchIndex = mockMatches.findIndex(m => m.id === matchId);
    
    if (matchIndex === -1) {
      return res.status(404).json({ error: 'Match no encontrado' });
    }
    
    const match = mockMatches[matchIndex];
    
    // Verificar que el usuario es parte del match
    if (match.player1.id !== userId && match.player2.id !== userId) {
      return res.status(403).json({ error: 'No eres parte de este match' });
    }
    
    // Verificar que no ya hizo check-in
    if (match.checkedInPlayers.includes(userId)) {
      return res.status(400).json({ error: 'Ya hiciste check-in para este match' });
    }
    
    // Hacer check-in
    match.checkedInPlayers.push(userId);
    
    // Si ambos jugadores hicieron check-in, cambiar status a in_progress
    if (match.checkedInPlayers.length === 2) {
      match.status = 'in_progress';
      
      // TODO: Enviar notificación a los jugadores
      console.log(`Match ${matchId} started - both players checked in`);
    }
    
    mockMatches[matchIndex] = match;
    
    res.status(200).json({
      message: 'Check-in exitoso',
      match: match,
      allPlayersReady: match.checkedInPlayers.length === 2,
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}