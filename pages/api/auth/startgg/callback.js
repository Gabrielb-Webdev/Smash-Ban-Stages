/**
 * API Route: /api/auth/startgg/callback
 * Maneja el callback OAuth de Start.gg
 */

import jwt from 'jsonwebtoken';
import StartGGClient, { GET_CURRENT_USER } from '../../../../lib/startgg';
import { getUserByStartGGId, createUser, updateUserTokens } from '../../../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error } = req.query;

  // Si Start.gg devolvió un error
  if (error) {
    console.error('Start.gg OAuth error:', error);
    return res.redirect(`/?error=oauth_failed&message=${encodeURIComponent(error)}`);
  }

  // Validar que tenemos el código
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  // TODO: Validar state contra cookie (CSRF protection)
  // const stateCookie = req.cookies.startgg_oauth_state;
  // if (!state || state !== stateCookie) {
  //   return res.status(400).json({ error: 'Invalid state parameter' });
  // }

  try {
    // 1. Intercambiar código por access token
    const tokenData = await exchangeCodeForToken(code);
    
    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }

    // 2. Obtener datos del usuario desde Start.gg
    const client = new StartGGClient(tokenData.access_token);
    const userData = await client.query(GET_CURRENT_USER);
    
    if (!userData.currentUser) {
      throw new Error('Could not fetch user data from Start.gg');
    }

    const startggUser = userData.currentUser;

    // 3. Crear o actualizar usuario en nuestra DB
    let user = await getUserByStartGGId(startggUser.id);
    
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
    
    if (user) {
      // Usuario existe, actualizar tokens
      user = await updateUserTokens(user.id, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt
      });
    } else {
      // Nuevo usuario, crear registro
      user = await createUser({
        startgg_user_id: startggUser.id,
        gamer_tag: startggUser.gamerTag || startggUser.name,
        prefix: startggUser.prefix,
        full_name: startggUser.name,
        email: startggUser.email,
        avatar_url: startggUser.images?.[0]?.url,
        location_city: startggUser.location?.city,
        location_state: startggUser.location?.state,
        location_country: startggUser.location?.country,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: expiresAt,
        is_admin: false,
        is_active: true
      });
    }

    // 4. Generar nuestro propio JWT session token
    const sessionToken = jwt.sign(
      {
        userId: user.id,
        startggUserId: user.startgg_user_id,
        gamerTag: user.gamer_tag,
        isAdmin: user.is_admin
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Guardar session token en cookie HttpOnly
    res.setHeader('Set-Cookie', [
      `session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
      'startgg_oauth_state=; Path=/; HttpOnly; Max-Age=0' // Limpiar state cookie
    ]);

    // 6. Redirigir a la app (mobile deep link o web)
    // Para mobile: usar custom URL scheme
    // Para web: redirigir al dashboard
    
    const isMobileApp = req.headers['user-agent']?.includes('la-app-sin-h');
    
    if (isMobileApp) {
      // Deep link para app móvil
      return res.redirect(`la-app-sin-h://auth/callback?token=${sessionToken}`);
    } else {
      // Redirigir a web dashboard
      return res.redirect(`/dashboard/afk?welcome=true`);
    }

  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.redirect(`/?error=auth_failed&message=${encodeURIComponent(error.message)}`);
  }
}

/**
 * Intercambiar authorization code por access token
 */
async function exchangeCodeForToken(code) {
  const clientId = process.env.STARTGG_CLIENT_ID;
  const clientSecret = process.env.STARTGG_CLIENT_SECRET;
  const redirectUri = process.env.STARTGG_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing OAuth configuration');
  }

  const response = await fetch('https://api.start.gg/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      scope: 'user.identity user.email',
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Token exchange failed:', errorData);
    throw new Error(`Failed to exchange token: ${response.status}`);
  }

  const data = await response.json();
  return data;
}
