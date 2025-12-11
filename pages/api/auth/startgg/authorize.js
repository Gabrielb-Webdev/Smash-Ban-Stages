/**
 * API Route: /api/auth/startgg/authorize
 * Inicia el flujo OAuth con Start.gg
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientId = process.env.STARTGG_CLIENT_ID;
  const redirectUri = process.env.STARTGG_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.error('Missing Start.gg OAuth configuration');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Scopes necesarios
  const scopes = [
    'user.identity',  // Info básica del usuario
    'user.email',     // Email del usuario
  ].join('%20'); // URL encoded space

  // State para prevenir CSRF (en producción, guardar en session/cookie)
  const state = Buffer.from(JSON.stringify({
    timestamp: Date.now(),
    random: Math.random().toString(36)
  })).toString('base64');

  // Construir URL de autorización
  const authUrl = new URL('https://start.gg/oauth/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('state', state);

  // Opcional: Guardar state en cookie para validar después
  res.setHeader('Set-Cookie', `startgg_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);

  // Redirigir a Start.gg
  res.redirect(authUrl.toString());
}
