// Configuración de temas para cada organización
export const TOURNAMENT_THEMES = {
  'cordoba': {
    name: 'Smash Córdoba',
    emoji: '🔵', 
    // Córdoba usa los estilos originales - sin personalización
    useOriginalStyles: true
  },
  'mendoza': {
    name: 'Team Anexo - Mendoza',
    emoji: '🟣',
    colors: {
      primary: '#8B5CF6',
      secondary: '#7C3AED',
      accent: '#A78BFA', 
      text: '#FFFFFF',
      cardBg: 'rgba(139, 92, 246, 0.15)',
      gradient: 'from-purple-900 via-violet-700 to-purple-800'
    },
    styles: {
      bannerText: 'text-4xl font-bold text-purple-100 drop-shadow-lg',
      cardBorder: 'border-2 border-purple-400/40',
      buttonPrimary: 'bg-purple-600 hover:bg-purple-700',
      buttonSecondary: 'bg-violet-600 hover:bg-violet-700'
    },
    customBackground: '/images/Team_Anexo/FONDO_tablet.png?v=1.2'
  },
  'afk': {
    name: 'Smash AFK (Buenos Aires)',
    emoji: '🟡',
    colors: {
      primary: '#DC2626',
      secondary: '#B91C1C',
      accent: '#FBBF24',
      text: '#FFFFFF',
      cardBg: 'rgba(220, 38, 38, 0.15)',
      gradient: 'from-red-900 via-red-700 to-orange-800'
    },
    styles: {
      bannerText: 'text-4xl font-bold text-yellow-100 drop-shadow-lg',
      cardBorder: 'border-2 border-red-400/40',
      buttonPrimary: 'bg-red-600 hover:bg-red-700',
      buttonSecondary: 'bg-orange-600 hover:bg-orange-700'
    }
  }
};

// Función para obtener el tema de un torneo
export const getTournamentTheme = (sessionId) => {
  if (!sessionId) return TOURNAMENT_THEMES['cordoba']; // cordoba por defecto
  
  // Extraer el nombre del torneo del sessionId
  let tournamentId = 'cordoba'; // Por defecto
  
  // Caso 1: sessionId directo (ej: "mendoza" desde /tablet/mendoza)
  if (sessionId === 'mendoza') {
    tournamentId = 'mendoza';
  }
  // Caso 2: sessionId con formato session-torneo (ej: "abc123-mendoza")
  else if (sessionId.includes('-')) {
    const parts = sessionId.split('-');
    const lastPart = parts[parts.length - 1];
    if (lastPart === 'mendoza') {
      tournamentId = 'mendoza';
    }
  }
  // Caso 3: sessionId con URL path (ej: "path/mendoza")
  else if (sessionId.includes('/')) {
    const lastPart = sessionId.split('/').pop();
    if (lastPart === 'mendoza') {
      tournamentId = 'mendoza';
    }
  }
  
  console.log('🎨 Tema detectado:', { sessionId, tournamentId, theme: TOURNAMENT_THEMES[tournamentId]?.name });
  
  return TOURNAMENT_THEMES[tournamentId] || TOURNAMENT_THEMES['cordoba']; // cordoba por defecto
};

// Función para verificar si debe usar estilos originales
export const shouldUseOriginalStyles = (sessionId) => {
  const theme = getTournamentTheme(sessionId);
  return theme.useOriginalStyles === true;
};

// Función para aplicar estilos dinámicos
export const getThemeStyles = (sessionId) => {
  const theme = getTournamentTheme(sessionId);
  
  if (!theme.colors) return {};
  
  return {
    '--primary-color': theme.colors.primary,
    '--secondary-color': theme.colors.secondary,
    '--accent-color': theme.colors.accent,
    '--text-color': theme.colors.text,
    '--card-bg': theme.colors.cardBg
  };
};