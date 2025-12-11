// API Route para gestionar matches
import { NextApiRequest, NextApiResponse } from 'next';

// Mock data para desarrollo
const mockMatches = [
  {
    id: 'match-1',
    tournamentId: '1',
    round: 'Winners Quarterfinals',
    player1: {
      id: 'player-1',
      name: 'Gabriel',
      tag: 'Gabi',
      seed: 1,
    },
    player2: {
      id: 'player-2',
      name: 'Ikki',
      tag: 'Ikki',
      seed: 8,
    },
    status: 'ready',
    scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // En 2 horas
    setup: {
      id: 'setup-1',
      name: 'Setup 1',
      location: 'Estación Principal',
      available: false,
    },
    checkedInPlayers: ['player-1'], // Solo uno hizo check-in
    streamMatch: false,
  },
  {
    id: 'match-2',
    tournamentId: '1',
    round: 'Winners Semifinals',
    player1: {
      id: 'player-3',
      name: 'Iori',
      tag: 'Iori',
      seed: 2,
    },
    player2: {
      id: 'player-4',
      name: 'Lucas',
      tag: 'Lucas',
      seed: 3,
    },
    status: 'pending',
    scheduledTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // En 3 horas
    setup: null,
    checkedInPlayers: [],
    streamMatch: true,
  },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { userId, tournamentId } = req.query;
    
    let matches = mockMatches;
    
    // Filtrar por usuario si se especifica
    if (userId) {
      matches = matches.filter(m => 
        m.player1.id === userId || m.player2.id === userId
      );
    }
    
    // Filtrar por torneo si se especifica
    if (tournamentId) {
      matches = matches.filter(m => m.tournamentId === tournamentId);
    }
    
    // Ordenar por fecha programada
    matches.sort((a, b) => {
      if (!a.scheduledTime) return 1;
      if (!b.scheduledTime) return -1;
      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
    });
    
    res.status(200).json(matches);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}