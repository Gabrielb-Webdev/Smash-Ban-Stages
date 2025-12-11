// API Route para autenticación con start.gg
import { NextApiRequest, NextApiResponse } from 'next';

const START_GG_CLIENT_ID = process.env.START_GG_CLIENT_ID;
const START_GG_CLIENT_SECRET = process.env.START_GG_CLIENT_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, redirectUri } = req.body;

  if (!code || !redirectUri) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.start.gg/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: START_GG_CLIENT_ID!,
        client_secret: START_GG_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();

    // Get user data from start.gg
    const userResponse = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({
        query: `
          query {
            currentUser {
              id
              name
              slug
              email
              images {
                type
                url
              }
            }
          }
        `,
      }),
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user data');
    }

    const userData = await userResponse.json();

    if (userData.errors) {
      throw new Error('GraphQL error: ' + userData.errors[0].message);
    }

    const user = userData.data.currentUser;
    const avatar = user.images?.find((img: any) => img.type === 'profile')?.url;

    res.status(200).json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      user: {
        id: user.id,
        name: user.name,
        slug: user.slug,
        email: user.email,
        avatar,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}