import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente con service role para operaciones server-side
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cliente público para operaciones client-side
export const createSupabaseClient = () => {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!anonKey) {
    throw new Error('Missing Supabase anon key');
  }
  
  return createClient(supabaseUrl, anonKey);
};

/**
 * Utilidades para queries comunes
 */

// Usuarios
export async function getUserByStartGGId(startggUserId) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('startgg_user_id', startggUserId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    throw error;
  }
  
  return data;
}

export async function createUser(userData) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert(userData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateUserTokens(userId, { accessToken, refreshToken, expiresAt }) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .update({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: expiresAt,
      last_login_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Torneos
export async function getTournamentBySlug(slug, community = 'afk') {
  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .select('*')
    .eq('slug', slug)
    .eq('community', community)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  return data;
}

export async function createTournament(tournamentData) {
  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .insert(tournamentData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getActiveTournaments(community = 'afk') {
  const { data, error } = await supabaseAdmin
    .from('tournaments')
    .select('*')
    .eq('community', community)
    .eq('is_active', true)
    .order('starts_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

// Matches
export async function getMatchByStartGGSetId(setId, tournamentId) {
  const { data, error } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('startgg_set_id', setId)
    .eq('tournament_id', tournamentId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  return data;
}

export async function createMatch(matchData) {
  const { data, error } = await supabaseAdmin
    .from('matches')
    .insert(matchData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateMatch(matchId, updates) {
  const { data, error } = await supabaseAdmin
    .from('matches')
    .update(updates)
    .eq('id', matchId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getPlayerMatches(userId, tournamentId = null) {
  let query = supabaseAdmin
    .from('matches')
    .select(`
      *,
      tournament:tournaments(*),
      setup:setups(*),
      player1:users!matches_player1_id_fkey(*),
      player2:users!matches_player2_id_fkey(*)
    `)
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  
  if (tournamentId) {
    query = query.eq('tournament_id', tournamentId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

// Match Results
export async function createMatchResult(resultData) {
  const { data, error } = await supabaseAdmin
    .from('match_results')
    .insert(resultData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getPendingResults(tournamentId = null) {
  let query = supabaseAdmin
    .from('match_results')
    .select(`
      *,
      match:matches(*),
      reported_by_user:users!match_results_reported_by_fkey(*)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  
  if (tournamentId) {
    query = query.eq('match.tournament_id', tournamentId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function approveMatchResult(resultId, adminId) {
  const { data, error } = await supabaseAdmin
    .from('match_results')
    .update({
      status: 'approved',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', resultId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function rejectMatchResult(resultId, adminId, reason) {
  const { data, error } = await supabaseAdmin
    .from('match_results')
    .update({
      status: 'rejected',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: reason
    })
    .eq('id', resultId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Setups
export async function getTournamentSetups(tournamentId) {
  const { data, error } = await supabaseAdmin
    .from('setups')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('is_active', true)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function getAvailableSetups(tournamentId) {
  const { data, error } = await supabaseAdmin
    .from('setups')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('is_available', true)
    .eq('is_active', true)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data;
}

export async function assignMatchToSetup(matchId, setupId) {
  const { data, error } = await supabaseAdmin
    .from('matches')
    .update({
      setup_id: setupId,
      state: 'called',
      called_at: new Date().toISOString()
    })
    .eq('id', matchId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Notifications
export async function createNotification(notificationData) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert(notificationData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getUserNotifications(userId, unreadOnly = false) {
  let query = supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (unreadOnly) {
    query = query.eq('read', false);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function markNotificationRead(notificationId) {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Admin Actions (Audit Log)
export async function logAdminAction(actionData) {
  const { data, error } = await supabaseAdmin
    .from('admin_actions')
    .insert(actionData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Realtime subscriptions
export function subscribeToMatches(tournamentId, callback) {
  return supabaseAdmin
    .channel(`matches:tournament:${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`
      },
      callback
    )
    .subscribe();
}

export function subscribeToMatchResults(tournamentId, callback) {
  return supabaseAdmin
    .channel(`match_results:tournament:${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'match_results'
      },
      async (payload) => {
        // Fetch full data with relations
        const { data } = await supabaseAdmin
          .from('match_results')
          .select(`
            *,
            match:matches(*),
            reported_by_user:users!match_results_reported_by_fkey(*)
          `)
          .eq('id', payload.new.id)
          .single();
        
        callback(data);
      }
    )
    .subscribe();
}

export default supabaseAdmin;
