import { StartGGAuthResponse } from '../types';

const API_BASE_URL = 'https://smash-ban-stages.vercel.app'; // URL de producción
const START_GG_API_URL = 'https://api.start.gg/gql/alpha';

class AuthService {
  private accessToken: string | null = null;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  async exchangeStartGGCode(code: string, redirectUri: string): Promise<StartGGAuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/startgg/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async getCurrentUser(token: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    return response.json();
  }

  async refreshToken(refreshToken: string): Promise<StartGGAuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    return response.json();
  }

  // Métodos para comunicarse directamente con start.gg API
  async makeStartGGRequest(query: string, variables?: any) {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const response = await fetch(START_GG_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`start.gg API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(`start.gg API error: ${data.errors[0].message}`);
    }

    return data.data;
  }

  async getUserTournaments(userId: string) {
    const query = `
      query GetUserTournaments($userId: ID!) {
        user(id: $userId) {
          events(query: {perPage: 50, sortBy: "startAt desc"}) {
            nodes {
              id
              name
              slug
              tournament {
                id
                name
                slug
                startAt
                endAt
                city
                countryCode
              }
            }
          }
        }
      }
    `;

    return this.makeStartGGRequest(query, { userId });
  }
}

export const authService = new AuthService();