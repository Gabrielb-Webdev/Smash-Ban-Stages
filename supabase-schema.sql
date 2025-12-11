-- =============================================================================
-- LA APP SIN H - MOBILE DATABASE SCHEMA
-- Para AFK Community con Start.gg Integration
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- USERS TABLE
-- Usuarios autenticados con Start.gg
-- =============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startgg_user_id INTEGER UNIQUE NOT NULL,
  gamer_tag TEXT NOT NULL,
  prefix TEXT,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  location_city TEXT,
  location_state TEXT,
  location_country TEXT,
  
  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Push notifications
  push_token TEXT,
  push_enabled BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_startgg_id ON users(startgg_user_id);
CREATE INDEX idx_users_gamer_tag ON users(gamer_tag);
CREATE INDEX idx_users_push_token ON users(push_token) WHERE push_token IS NOT NULL;

-- =============================================================================
-- TOURNAMENTS TABLE
-- Torneos vinculados desde Start.gg
-- =============================================================================
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Start.gg IDs
  startgg_tournament_id INTEGER UNIQUE NOT NULL,
  startgg_event_id INTEGER,
  startgg_phase_id INTEGER,
  
  -- Basic info
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  community TEXT NOT NULL CHECK (community IN ('afk', 'cordoba', 'mendoza')),
  
  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  auto_sync_enabled BOOLEAN DEFAULT TRUE,
  require_admin_approval BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for tournaments
CREATE INDEX idx_tournaments_startgg_id ON tournaments(startgg_tournament_id);
CREATE INDEX idx_tournaments_community ON tournaments(community);
CREATE INDEX idx_tournaments_active ON tournaments(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- SETUPS TABLE
-- Consolas/setups físicos en el venue
-- =============================================================================
CREATE TABLE setups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  
  -- Setup info
  name TEXT NOT NULL,
  display_name TEXT NOT NULL, -- "Setup 1", "Stream Setup"
  type TEXT NOT NULL CHECK (type IN ('regular', 'stream', 'special')),
  
  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Stream setups específicos
  assigned_device_id TEXT, -- Device ID fijo para stream
  
  -- Location
  location_description TEXT, -- "Sector A - Mesa 3"
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for setups
CREATE INDEX idx_setups_tournament ON setups(tournament_id);
CREATE INDEX idx_setups_type ON setups(type);
CREATE INDEX idx_setups_available ON setups(is_available) WHERE is_available = TRUE;

-- =============================================================================
-- MATCHES TABLE
-- Sets/partidas del bracket
-- =============================================================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  
  -- Start.gg set info
  startgg_set_id INTEGER NOT NULL,
  startgg_phase_id INTEGER,
  
  -- Players
  player1_id UUID REFERENCES users(id),
  player2_id UUID REFERENCES users(id),
  player1_startgg_id INTEGER, -- Para antes de que se registren
  player2_startgg_id INTEGER,
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  
  -- Setup assignment
  setup_id UUID REFERENCES setups(id),
  
  -- Match info
  round_number INTEGER,
  round_text TEXT, -- "Winner's Finals", "Loser's R2"
  best_of INTEGER DEFAULT 3,
  
  -- State management
  state TEXT NOT NULL DEFAULT 'pending' CHECK (
    state IN ('pending', 'called', 'in_progress', 'awaiting_result', 'completed', 'cancelled')
  ),
  
  -- Timestamps
  called_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tournament_id, startgg_set_id)
);

-- Indexes for matches
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_startgg_set ON matches(startgg_set_id);
CREATE INDEX idx_matches_player1 ON matches(player1_id);
CREATE INDEX idx_matches_player2 ON matches(player2_id);
CREATE INDEX idx_matches_setup ON matches(setup_id);
CREATE INDEX idx_matches_state ON matches(state);

-- =============================================================================
-- MATCH_RESULTS TABLE
-- Resultados reportados por jugadores
-- =============================================================================
CREATE TABLE match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  
  -- Reporter info
  reported_by UUID NOT NULL REFERENCES users(id),
  is_reporter_winner BOOLEAN,
  
  -- Result data
  winner_id UUID REFERENCES users(id),
  winner_startgg_id INTEGER,
  player1_score INTEGER NOT NULL CHECK (player1_score >= 0),
  player2_score INTEGER NOT NULL CHECK (player2_score <= 10),
  
  -- Game details (JSON)
  games_data JSONB, -- Array de games con stage, characters, winner
  /*
  Formato:
  [
    {
      "gameNum": 1,
      "winnerId": 123456,
      "stageId": 1,
      "stageName": "Battlefield",
      "player1Character": {"id": 70, "name": "Fox"},
      "player2Character": {"id": 23, "name": "Marth"}
    },
    ...
  ]
  */
  
  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'disputed')
  ),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  -- Start.gg sync
  synced_to_startgg BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for match_results
CREATE INDEX idx_match_results_match ON match_results(match_id);
CREATE INDEX idx_match_results_reported_by ON match_results(reported_by);
CREATE INDEX idx_match_results_status ON match_results(status);
CREATE INDEX idx_match_results_pending ON match_results(status) WHERE status = 'pending';

-- =============================================================================
-- NOTIFICATIONS TABLE
-- Log de notificaciones enviadas
-- =============================================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification content
  type TEXT NOT NULL CHECK (
    type IN ('match_assigned', 'match_called', 'result_approved', 'result_rejected', 'tournament_start', 'custom')
  ),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Related entities
  match_id UUID REFERENCES matches(id),
  tournament_id UUID REFERENCES tournaments(id),
  
  -- Delivery
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_error TEXT,
  
  -- User interaction
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  data JSONB, -- Extra data for deep linking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;

-- =============================================================================
-- ADMIN_ACTIONS TABLE
-- Audit log de acciones administrativas
-- =============================================================================
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES users(id),
  
  -- Action details
  action_type TEXT NOT NULL CHECK (
    action_type IN ('approve_result', 'reject_result', 'assign_setup', 'call_match', 'cancel_match', 'modify_tournament')
  ),
  entity_type TEXT NOT NULL, -- 'match', 'result', 'tournament', 'setup'
  entity_id UUID NOT NULL,
  
  -- Details
  description TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for admin_actions
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_entity ON admin_actions(entity_type, entity_id);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Users: Can read their own data, admins can read all
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id OR is_admin = TRUE);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Tournaments: Everyone can read active tournaments
CREATE POLICY "Anyone can view active tournaments" ON tournaments
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can manage tournaments" ON tournaments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Matches: Players can view their own matches
CREATE POLICY "Users can view their matches" ON matches
  FOR SELECT USING (
    player1_id = auth.uid() OR 
    player2_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Match Results: Players can report, admins can approve
CREATE POLICY "Players can report results" ON match_results
  FOR INSERT WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Users can view results of their matches" ON match_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m 
      WHERE m.id = match_results.match_id 
      AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE POLICY "Admins can update results" ON match_results
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Notifications: Users can only see their own
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_setups_updated_at BEFORE UPDATE ON setups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_match_results_updated_at BEFORE UPDATE ON match_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Notify match assignment via Postgres NOTIFY
CREATE OR REPLACE FUNCTION notify_match_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.setup_id IS NOT NULL AND (OLD.setup_id IS NULL OR OLD.setup_id != NEW.setup_id) THEN
    PERFORM pg_notify(
      'match_assigned',
      json_build_object(
        'match_id', NEW.id,
        'tournament_id', NEW.tournament_id,
        'player1_id', NEW.player1_id,
        'player2_id', NEW.player2_id,
        'setup_id', NEW.setup_id
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_match_assignment
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION notify_match_assignment();

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Community admins placeholder (actualizar después con IDs reales)
-- INSERT INTO users (startgg_user_id, gamer_tag, email, is_admin, access_token, refresh_token, token_expires_at)
-- VALUES (0, 'System Admin', 'admin@afk.gg', TRUE, 'placeholder', 'placeholder', NOW() + INTERVAL '1 year');

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View: Active matches with player names and setup info
CREATE VIEW active_matches_view AS
SELECT 
  m.id,
  m.tournament_id,
  t.name AS tournament_name,
  m.player1_name,
  m.player2_name,
  u1.gamer_tag AS player1_gamer_tag,
  u2.gamer_tag AS player2_gamer_tag,
  m.round_text,
  m.state,
  s.display_name AS setup_name,
  s.type AS setup_type,
  m.called_at,
  m.started_at
FROM matches m
JOIN tournaments t ON m.tournament_id = t.id
LEFT JOIN users u1 ON m.player1_id = u1.id
LEFT JOIN users u2 ON m.player2_id = u2.id
LEFT JOIN setups s ON m.setup_id = s.id
WHERE m.state IN ('called', 'in_progress', 'awaiting_result');

-- View: Pending results for admin review
CREATE VIEW pending_results_view AS
SELECT 
  mr.id,
  mr.match_id,
  m.tournament_id,
  t.name AS tournament_name,
  m.player1_name,
  m.player2_name,
  mr.player1_score,
  mr.player2_score,
  u.gamer_tag AS reported_by_gamer_tag,
  mr.created_at AS reported_at,
  mr.games_data
FROM match_results mr
JOIN matches m ON mr.match_id = m.id
JOIN tournaments t ON m.tournament_id = t.id
JOIN users u ON mr.reported_by = u.id
WHERE mr.status = 'pending'
ORDER BY mr.created_at DESC;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE users IS 'Usuarios autenticados con Start.gg OAuth';
COMMENT ON TABLE tournaments IS 'Torneos importados desde Start.gg';
COMMENT ON TABLE setups IS 'Consolas/setups físicos en el venue';
COMMENT ON TABLE matches IS 'Sets del bracket vinculados a Start.gg';
COMMENT ON TABLE match_results IS 'Resultados reportados por jugadores pendientes de aprobación';
COMMENT ON TABLE notifications IS 'Push notifications enviadas a usuarios';
COMMENT ON TABLE admin_actions IS 'Audit log de acciones administrativas';

COMMENT ON COLUMN users.access_token IS 'Start.gg OAuth access token (encriptado en producción)';
COMMENT ON COLUMN matches.state IS 'pending: esperando | called: llamado | in_progress: jugando | awaiting_result: esperando reporte | completed: finalizado';
COMMENT ON COLUMN match_results.games_data IS 'Array JSON con detalles de cada game (stage, personajes, ganador)';
