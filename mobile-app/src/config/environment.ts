// Configuración de ambiente para la aplicación móvil
export const config = {
  // URLs de producción
  API_BASE_URL: 'https://smash-ban-stages.vercel.app',
  WS_URL: 'wss://sweet-insight-production-80c1.up.railway.app', // Railway WebSocket
  
  // start.gg OAuth
  START_GG_CLIENT_ID: 'tu_client_id_aqui', // Configurar en build
  START_GG_REDIRECT_URI: 'afk-smash://auth/callback',
  
  // Expo
  EXPO_PROJECT_ID: 'tu_expo_project_id',
  
  // Configuración específica para AFK
  DEFAULT_COMMUNITY: 'afk',
  APP_SCHEME: 'afk-smash',
  
  // Features flags para desarrollo gradual
  FEATURES: {
    PUSH_NOTIFICATIONS: true,
    REAL_START_GG_API: false, // Cambiar a true cuando esté configurado
    ADMIN_PANEL: false, // Próxima fase
    STREAMING_INTEGRATION: false, // Próxima fase
  },
};