// Configuración de temas para cada organización
export const TOURNAMENT_THEMES = {
  'cordoba': {
    name: 'Smash Córdoba',
    emoji: '🔵', 
    // Córdoba usa los estilos originales - sin personalización
    useOriginalStyles: true
  },
  'mendoza': {
    name: 'Smash Mendoza',
    emoji: '🟢',
    colors: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#FBBF24', 
      text: '#FFFFFF',
      cardBg: 'rgba(5, 150, 105, 0.15)',
      gradient: 'from-green-900 via-green-700 to-emerald-800'
    },
    styles: {
      bannerText: 'text-4xl font-bold text-green-100 drop-shadow-lg',
      cardBorder: 'border-2 border-green-400/40',
      buttonPrimary: 'bg-green-600 hover:bg-green-700',
      buttonSecondary: 'bg-emerald-600 hover:bg-emerald-700'
    },
    customBackground: '/images/Team Anexo/FONDO tablet.png'
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
export const getTournamentTheme = (tournamentId) => {
  return TOURNAMENT_THEMES[tournamentId] || TOURNAMENT_THEMES['cordoba']; // cordoba por defecto
};

// Función para verificar si debe usar estilos originales
export const shouldUseOriginalStyles = (tournamentId) => {
  const theme = getTournamentTheme(tournamentId);
  return theme.useOriginalStyles === true;
};

// Función para aplicar estilos dinámicos
export const getThemeStyles = (tournamentId) => {
  const theme = getTournamentTheme(tournamentId);
  
  return {
    '--primary-color': theme.colors.primary,
    '--secondary-color': theme.colors.secondary,
    '--accent-color': theme.colors.accent,
    '--text-color': theme.colors.text,
    '--card-bg': theme.colors.cardBg
  };
};