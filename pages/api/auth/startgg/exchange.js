// API Route para autenticación con start.gg

const START_GG_CLIENT_ID = process.env.START_GG_CLIENT_ID || '435';
const START_GG_CLIENT_SECRET = process.env.START_GG_CLIENT_SECRET;
const ADMIN_SLUGS = (process.env.ADMIN_SLUGS || '').split(',').map(s => s.trim()).filter(Boolean);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!START_GG_CLIENT_SECRET) {
    console.error('START_GG_CLIENT_SECRET no está configurado en las variables de entorno');
    return res.status(500).json({ error: 'Server misconfigured: missing client secret' });
  }

  const { code, redirectUri } = req.body;

  if (!code || !redirectUri) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const tokenResponse = await fetch('https://api.start.gg/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: START_GG_CLIENT_ID,
        client_secret: START_GG_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error('Start.gg token error:', tokenResponse.status, errBody);
      return res.status(500).json({ error: 'Failed to exchange code for token', detail: errBody });
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
    const avatar = user.images?.find((img) => img.type === 'profile')?.url;
    const isAdmin = ADMIN_SLUGS.length === 0 || ADMIN_SLUGS.includes(user.slug);

    res.status(200).json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      isAdmin,
      user: {
        id: user.id,
        name: user.name,
        slug: user.slug,
        avatar,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed', detail: error?.message || String(error) });
  }
}