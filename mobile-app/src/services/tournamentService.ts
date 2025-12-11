import { Tournament, Match, Registration } from '../types';

const API_BASE_URL = 'https://smash-ban-stages.vercel.app'; // URL de producción

class TournamentService {
  private getAuthHeaders(): HeadersInit {
    // TODO: Obtener token del AsyncStorage
    return {
      'Content-Type': 'application/json',
      // Authorization: `Bearer ${token}`,
    };
  }

  async getTournaments(community: string = 'afk'): Promise<Tournament[]> {
    const response = await fetch(`${API_BASE_URL}/api/tournaments?community=${community}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tournaments');
    }

    return response.json();
  }

  async getTournament(tournamentId: string): Promise<Tournament> {
    const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tournament');
    }

    return response.json();
  }

  async registerForTournament(tournamentId: string, gameId?: string): Promise<Registration> {
    const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/register`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        gameId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to register for tournament');
    }

    return response.json();
  }

  async unregisterFromTournament(tournamentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/register`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to unregister from tournament');
    }
  }

  async getUserMatches(userId: string): Promise<Match[]> {
    const response = await fetch(`${API_BASE_URL}/api/matches?userId=${userId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user matches');
    }

    return response.json();
  }

  async getMatch(matchId: string): Promise<Match> {
    const response = await fetch(`${API_BASE_URL}/api/matches/${matchId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch match');
    }

    return response.json();
  }

  async checkInToMatch(matchId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/matches/${matchId}/checkin`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to check in to match');
    }
  }

  async reportMatchResult(matchId: string, winnerId: string, sets?: Array<{player1Score: number, player2Score: number}>): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/matches/${matchId}/result`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        winnerId,
        sets,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to report match result');
    }
  }

  async getUserRegistrations(userId: string): Promise<Registration[]> {
    const response = await fetch(`${API_BASE_URL}/api/registrations?userId=${userId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user registrations');
    }

    return response.json();
  }

  // Métodos para admins
  async getAdminTournaments(): Promise<Tournament[]> {
    const response = await fetch(`${API_BASE_URL}/api/admin/tournaments`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch admin tournaments');
    }

    return response.json();
  }

  async getTournamentMatches(tournamentId: string): Promise<Match[]> {
    const response = await fetch(`${API_BASE_URL}/api/admin/tournaments/${tournamentId}/matches`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tournament matches');
    }

    return response.json();
  }

  async assignMatchToSetup(matchId: string, setupId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/admin/matches/${matchId}/assign-setup`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        setupId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to assign match to setup');
    }
  }

  async markMatchForStream(matchId: string, isStream: boolean): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/admin/matches/${matchId}/stream`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        streamMatch: isStream,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update stream status');
    }
  }

  async uploadResultsToStartGG(matchId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/admin/matches/${matchId}/upload-startgg`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to upload results to start.gg');
    }
  }
}

export const tournamentService = new TournamentService();