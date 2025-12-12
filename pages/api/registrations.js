// API Route para obtener registros de un usuario
import { NextApiRequest, NextApiResponse } from 'next';

// Mock data para desarrollo
const mockRegistrations = [
  {
    id: 'reg-1',
    userId: 'mock-user-123',
    tournamentId: '1',
    registeredAt: new Date().toISOString(),
    checkedIn: false,
  },
];

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { userId } = req.query;
    
    // TODO: Obtener userId del token de autorización en lugar del query
    const userRegistrations = mockRegistrations.filter(r => r.userId === userId);
    
    res.status(200).json(userRegistrations);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}