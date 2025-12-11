/**
 * API Route: /api/auth/startgg/refresh
 * Refresca el access token usando refresh token
 */

import { supabaseAdmin, updateUserTokens } from '../../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, refreshToken } = req.body;

  if (!userId || !refreshToken) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Refrescar token en Start.gg
    const newTokenData = await refreshStartGGToken(refreshToken);

    // Actualizar en database
    const expiresAt = new Date(Date.now() + (newTokenData.expires_in * 1000)).toISOString();
    
    const updatedUser = await updateUserTokens(userId, {
      accessToken: newTokenData.access_token,
      refreshToken: newTokenData.refresh_token,
      expiresAt
    });

    return res.status(200).json({
      success: true,
      accessToken: newTokenData.access_token,
      expiresAt
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ 
      error: 'Failed to refresh token',
      message: error.message 
    });
  }
}

/**
 * Refrescar access token usando refresh token
 */
async function refreshStartGGToken(refreshToken) {
  const clientId = process.env.STARTGG_CLIENT_ID;
  const clientSecret = process.env.STARTGG_CLIENT_SECRET;
  const redirectUri = process.env.STARTGG_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing OAuth configuration');
  }

  const response = await fetch('https://api.start.gg/oauth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      scope: 'user.identity user.email',
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Token refresh failed:', errorData);
    throw new Error(`Failed to refresh token: ${response.status}`);
  }

  const data = await response.json();
  return data;
}
