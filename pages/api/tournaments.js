// API Route para gestionar torneos
import { NextApiRequest, NextApiResponse } from 'next';

// Mock data para desarrollo - en producción esto vendría de una base de datos
const mockTournaments = [
  {
    id: '1',
    name: 'AFK Weekly #45',
    slug: 'afk-weekly-45',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Próxima semana
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(),
    community: 'afk',
    description: 'Torneo semanal de la comunidad AFK Buenos Aires. ¡Todos bienvenidos!',
    registrationOpen: true,
    maxParticipants: 64,
    currentParticipants: 23,
    format: 'Double Elimination',
    games: [
      { id: 'ultimate', name: 'Super Smash Bros. Ultimate', slug: 'ultimate' }
    ]
  },
  {
    id: '2',
    name: 'AFK Monthly Championship',
    slug: 'afk-monthly-championship',
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // En 2 semanas
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(),
    community: 'afk',
    description: 'Torneo mensual con prizes! Modalidad presencial en Buenos Aires.',
    registrationOpen: true,
    maxParticipants: 128,
    currentParticipants: 67,
    format: 'Double Elimination',
    games: [
      { id: 'ultimate', name: 'Super Smash Bros. Ultimate', slug: 'ultimate' }
    ]
  },
  {
    id: '3',
    name: 'AFK Beginners Cup',
    slug: 'afk-beginners-cup',
    startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // En 3 semanas
    endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
    community: 'afk',
    description: 'Torneo especial para jugadores nuevos y de nivel principiante.',
    registrationOpen: false, // Ejemplo de registro cerrado
    maxParticipants: 32,
    currentParticipants: 18,
    format: 'Single Elimination',
    games: [
      { id: 'ultimate', name: 'Super Smash Bros. Ultimate', slug: 'ultimate' }
    ]
  }
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { community } = req.query;
    
    let tournaments = mockTournaments;
    
    // Filtrar por comunidad si se especifica
    if (community) {
      tournaments = tournaments.filter(t => t.community === community);
    }
    
    // Ordenar por fecha de inicio
    tournaments.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    res.status(200).json(tournaments);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}