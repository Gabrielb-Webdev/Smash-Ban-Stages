// Configuración específica para start.gg OAuth en producción
import * as AuthSession from 'expo-auth-session';

export const getStartGGConfig = () => {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'afk-smash',
    path: 'auth/callback',
  });

  return {
    clientId: 'your-startgg-client-id', // TODO: Configurar con el client ID real de start.gg
    redirectUri,
    scopes: ['user:read', 'tournament:read'],
    discovery: {
      authorizationEndpoint: 'https://start.gg/oauth/authorize',
      tokenEndpoint: 'https://smash-ban-stages.vercel.app/api/auth/startgg/exchange',
    },
  };
};