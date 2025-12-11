/**
 * API Route: /api/admin/results/[resultId]
 * Aprobar o rechazar un resultado (solo admins)
 */

import { requireAdmin } from '../../../../lib/auth-middleware';
import {
  supabaseAdmin,
  approveMatchResult,
  rejectMatchResult,
  updateMatch,
  createNotification,
  logAdminAction
} from '../../../../lib/supabase';
import StartGGClient, { REPORT_BRACKET_SET, buildGameData } from '../../../../lib/startgg';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const admin = await requireAdmin(req);
    const { resultId } = req.query;
    const { action, reason } = req.body; // action: 'approve' | 'reject'

    if (!resultId || !action) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Obtener resultado con relaciones
    const { data: result, error: resultError } = await supabaseAdmin
      .from('match_results')
      .select(`
        *,
        match:matches(
          *,
          tournament:tournaments(*)
        ),
        reported_by_user:users!match_results_reported_by_fkey(*)
      `)
      .eq('id', resultId)
      .single();

    if (resultError || !result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    if (result.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Result already processed',
        currentStatus: result.status 
      });
    }

    if (action === 'approve') {
      // Aprobar resultado
      const approved = await approveMatchResult(resultId, admin.id);

      // Actualizar match a completed
      await updateMatch(result.match_id, {
        state: 'completed',
        completed_at: new Date().toISOString()
      });

      // Sincronizar con Start.gg si está habilitado
      if (result.match.tournament.auto_sync_enabled) {
        await syncResultToStartGG(result, admin);
      }

      // Notificar al reporter
      await createNotification({
        user_id: result.reported_by,
        type: 'result_approved',
        title: '✅ Resultado aprobado',
        body: `Tu resultado de ${result.match.round_text} fue aprobado`,
        match_id: result.match_id,
        tournament_id: result.match.tournament_id,
        data: { resultId }
      });

      // Log admin action
      await logAdminAction({
        admin_id: admin.id,
        action_type: 'approve_result',
        entity_type: 'result',
        entity_id: resultId,
        description: `Approved result for ${result.match.round_text}`,
        metadata: { matchId: result.match_id, resultId }
      });

      return res.status(200).json({
        success: true,
        message: 'Result approved',
        result: approved
      });

    } else {
      // Rechazar resultado
      if (!reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const rejected = await rejectMatchResult(resultId, admin.id, reason);

      // Revertir match a in_progress
      await updateMatch(result.match_id, {
        state: 'in_progress'
      });

      // Notificar al reporter
      await createNotification({
        user_id: result.reported_by,
        type: 'result_rejected',
        title: '❌ Resultado rechazado',
        body: `Tu resultado fue rechazado: ${reason}`,
        match_id: result.match_id,
        tournament_id: result.match.tournament_id,
        data: { resultId, reason }
      });

      // Log admin action
      await logAdminAction({
        admin_id: admin.id,
        action_type: 'reject_result',
        entity_type: 'result',
        entity_id: resultId,
        description: `Rejected result for ${result.match.round_text}: ${reason}`,
        metadata: { matchId: result.match_id, resultId, reason }
      });

      return res.status(200).json({
        success: true,
        message: 'Result rejected',
        result: rejected
      });
    }

  } catch (error) {
    console.error('Admin result action error:', error);

    if (error.message === 'Unauthorized') {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    return res.status(500).json({ 
      error: 'Failed to process result',
      message: error.message 
    });
  }
}

/**
 * Sincronizar resultado aprobado a Start.gg
 */
async function syncResultToStartGG(result, admin) {
  try {
    // Obtener API token (usar el del admin o uno dedicado del torneo)
    const apiToken = process.env.STARTGG_API_TOKEN;
    
    if (!apiToken) {
      console.warn('No Start.gg API token configured, skipping sync');
      return;
    }

    const client = new StartGGClient(apiToken);

    // Determinar winner's Start.gg entrant ID
    const winnerId = result.winner_startgg_id || result.match.player1_startgg_id;

    // Construir game data si está disponible
    let gameData = null;
    if (result.games_data && Array.isArray(result.games_data)) {
      gameData = buildGameData(result.games_data);
    }

    // Reportar set en Start.gg
    const reportedSet = await client.query(REPORT_BRACKET_SET, {
      setId: result.match.startgg_set_id,
      winnerId: winnerId,
      isDQ: false,
      gameData: gameData
    });

    // Marcar como sincronizado
    await supabaseAdmin
      .from('match_results')
      .update({
        synced_to_startgg: true,
        synced_at: new Date().toISOString()
      })
      .eq('id', result.id);

    console.log(`✅ Result synced to Start.gg: Set ${result.match.startgg_set_id}`);

  } catch (error) {
    console.error('Failed to sync to Start.gg:', error);
    
    // Guardar error pero no fallar la aprobación
    await supabaseAdmin
      .from('match_results')
      .update({
        sync_error: error.message
      })
      .eq('id', result.id);
  }
}
