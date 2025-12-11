/**
 * API Route: /api/matches/[matchId]/report
 * Reportar resultado de un match
 */

import { authenticateRequest } from '../../../../lib/auth-middleware';
import { 
  supabaseAdmin,
  createMatchResult,
  updateMatch,
  createNotification,
  logAdminAction
} from '../../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await authenticateRequest(req);
    const { matchId } = req.query;
    const { winnerId, player1Score, player2Score, gamesData } = req.body;

    if (!matchId || !winnerId || player1Score === undefined || player2Score === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verificar que el match existe y el usuario es participante
    const { data: match, error: matchError } = await supabaseAdmin
      .from('matches')
      .select('*, tournament:tournaments(*)')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Verificar que el usuario es uno de los jugadores
    if (match.player1_id !== user.id && match.player2_id !== user.id) {
      return res.status(403).json({ error: 'You are not a participant in this match' });
    }

    // Verificar que el match está en estado correcto
    if (!['in_progress', 'awaiting_result'].includes(match.state)) {
      return res.status(400).json({ 
        error: 'Match is not ready for result reporting',
        currentState: match.state 
      });
    }

    // Determinar si el reporter es el ganador
    const isReporterWinner = winnerId === user.id;

    // Crear resultado pendiente de aprobación
    const result = await createMatchResult({
      match_id: matchId,
      reported_by: user.id,
      is_reporter_winner: isReporterWinner,
      winner_id: winnerId,
      player1_score: player1Score,
      player2_score: player2Score,
      games_data: gamesData || null,
      status: 'pending'
    });

    // Actualizar estado del match
    await updateMatch(matchId, {
      state: 'awaiting_result'
    });

    // Notificar a admins del torneo
    await notifyAdminsOfPendingResult(match, result, user);

    // Log admin action si el que reporta es admin
    if (user.is_admin) {
      await logAdminAction({
        admin_id: user.id,
        action_type: 'approve_result',
        entity_type: 'result',
        entity_id: result.id,
        description: `Admin reported result for match ${match.round_text}`,
        metadata: { matchId, resultId: result.id }
      });
    }

    return res.status(201).json({
      success: true,
      result: {
        id: result.id,
        status: result.status,
        message: 'Result submitted for admin approval'
      }
    });

  } catch (error) {
    console.error('Report match error:', error);
    
    if (error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    return res.status(500).json({ 
      error: 'Failed to report match result',
      message: error.message 
    });
  }
}

/**
 * Notificar a admins sobre resultado pendiente
 */
async function notifyAdminsOfPendingResult(match, result, reporter) {
  try {
    // Obtener admins del torneo
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id, push_token, push_enabled')
      .eq('is_admin', true)
      .eq('is_active', true);

    if (!admins || admins.length === 0) return;

    // Crear notificaciones para cada admin
    const notifications = admins.map(admin => ({
      user_id: admin.id,
      type: 'custom',
      title: '📊 Nuevo resultado pendiente',
      body: `${reporter.gamer_tag} reportó resultado de ${match.round_text}`,
      match_id: match.id,
      tournament_id: match.tournament_id,
      data: {
        resultId: result.id,
        matchId: match.id,
        deepLink: `/admin/results/${result.id}`
      }
    }));

    await supabaseAdmin.from('notifications').insert(notifications);

    // Enviar push notifications si están habilitadas
    // TODO: Implementar con Firebase Cloud Messaging
    
  } catch (error) {
    console.error('Failed to notify admins:', error);
  }
}
