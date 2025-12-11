/**
 * API Route: /api/tournaments/[tournamentId]/matches
 * Obtener matches de un torneo
 */

import { getPlayerMatches } from '../../../../lib/supabase';
import { authenticateRequest } from '../../../../lib/auth-middleware';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await authenticateRequest(req);
    const { tournamentId } = req.query;

    if (!tournamentId) {
      return res.status(400).json({ error: 'Missing tournament ID' });
    }

    // Obtener matches del usuario en este torneo
    const matches = await getPlayerMatches(user.id, tournamentId);

    return res.status(200).json({ matches });

  } catch (error) {
    console.error('Get matches error:', error);
    
    if (error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    return res.status(500).json({ error: 'Failed to fetch matches' });
  }
}
