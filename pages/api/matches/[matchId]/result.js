// API Route para reportar resultados de un match
import { NextApiRequest, NextApiResponse } from 'next';

// Mock storage para matches
let mockMatches = [
  {
    id: 'match-1',
    tournamentId: '1',
    round: 'Winners Quarterfinals',
    player1: { id: 'player-1', name: 'Gabriel', tag: 'Gabi' },
    player2: { id: 'player-2', name: 'Ikki', tag: 'Ikki' },
    status: 'in_progress',
    checkedInPlayers: ['player-1', 'player-2'],
    winner: null,
    reportedResults: [], // Array de reportes de cada jugador
    streamMatch: false,
  },
];

export default function handler(req, res) {
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
    const { winnerId, sets } = req.body;
    
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
    
    // Verificar que el match está en progreso
    if (match.status !== 'in_progress') {
      return res.status(400).json({ error: 'El match no está en progreso' });
    }
    
    // Verificar que el winnerId es válido
    if (winnerId !== match.player1.id && winnerId !== match.player2.id) {
      return res.status(400).json({ error: 'Winner ID inválido' });
    }
    
    // Agregar el reporte del resultado
    const resultReport = {
      reporterId: userId,
      winnerId,
      sets: sets || [],
      reportedAt: new Date().toISOString(),
    };
    
    // Verificar si ya reportó este usuario
    const existingReportIndex = match.reportedResults.findIndex(r => r.reporterId === userId);
    if (existingReportIndex !== -1) {
      // Actualizar reporte existente
      match.reportedResults[existingReportIndex] = resultReport;
    } else {
      // Nuevo reporte
      match.reportedResults.push(resultReport);
    }
    
    // Verificar si ambos jugadores reportaron
    if (match.reportedResults.length === 2) {
      const report1 = match.reportedResults[0];
      const report2 = match.reportedResults[1];
      
      // Verificar si coinciden los reportes
      if (report1.winnerId === report2.winnerId) {
        // Ambos concuerdan, establecer ganador oficial
        match.winner = { id: report1.winnerId };
        match.status = 'completed';
        
        // TODO: Notificar a admins y actualizar en start.gg
        console.log(`Match ${matchId} completed - Winner: ${report1.winnerId}`);
        
        res.status(200).json({
          message: 'Resultado confirmado',
          match: match,
          status: 'completed',
        });
      } else {
        // Conflicto en los reportes, notificar a admin
        console.log(`Match ${matchId} has conflicting reports - Admin intervention needed`);
        
        res.status(200).json({
          message: 'Hay un conflicto en los reportes. Un admin revisará el resultado.',
          match: match,
          status: 'disputed',
          conflict: {
            player1Report: report1,
            player2Report: report2,
          },
        });
      }
    } else {
      // Solo un jugador reportó, esperando el otro
      res.status(200).json({
        message: 'Resultado reportado. Esperando confirmación del oponente.',
        match: match,
        status: 'pending_confirmation',
      });
    }
    
    mockMatches[matchIndex] = match;
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}