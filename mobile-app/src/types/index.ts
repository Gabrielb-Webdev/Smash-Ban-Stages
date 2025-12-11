export interface User {
  id: string;
  startggId: string;
  name: string;
  tag: string;
  email?: string;
  avatar?: string;
  isAdmin?: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  slug: string;
  startDate: string;
  endDate: string;
  community: string;
  description?: string;
  registrationOpen: boolean;
  maxParticipants?: number;
  currentParticipants: number;
  format: 'Single Elimination' | 'Double Elimination' | 'Round Robin';
  games: TournamentGame[];
}

export interface TournamentGame {
  id: string;
  name: string;
  slug: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: string;
  player1: MatchPlayer;
  player2: MatchPlayer;
  winner?: MatchPlayer;
  status: 'pending' | 'ready' | 'in_progress' | 'completed';
  scheduledTime?: string;
  setup?: Setup;
  checkedInPlayers: string[];
  streamMatch?: boolean;
}

export interface MatchPlayer {
  id: string;
  name: string;
  tag: string;
  seed?: number;
}

export interface Setup {
  id: string;
  name: string;
  location: string;
  available: boolean;
}

export interface Registration {
  id: string;
  userId: string;
  tournamentId: string;
  registeredAt: string;
  checkedIn: boolean;
  seed?: number;
}

export interface NotificationData {
  type: 'match_ready' | 'match_starting' | 'tournament_update' | 'admin_message';
  matchId?: string;
  tournamentId?: string;
  title: string;
  message: string;
  data?: any;
}

export interface StartGGAuthResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    name: string;
    slug: string;
    email?: string;
    avatar?: string;
  };
}