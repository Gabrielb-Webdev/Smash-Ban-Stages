// Configuración de temas para cada organización
export const TOURNAMENT_THEMES = {
  'main-session': {
    name: 'General',
    emoji: '🎮',
    colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF', 
      accent: '#F59E0B',
      text: '#FFFFFF',
      cardBg: 'rgba(255, 255, 255, 0.1)',
      gradient: 'from-blue-900 via-blue-800 to-purple-900'
    },
    styles: {
      // Mantiene el estilo original de Córdoba
      bannerText: 'text-4xl font-bold text-white',
      cardBorder: 'border-2 border-white/30',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-700',
      buttonSecondary: 'bg-purple-600 hover:bg-purple-700'
    }
  },
  'cordoba': {
    name: 'Smash Córdoba',
    emoji: '🔵', 
    colors: {
      primary: '#2563EB',
      secondary: '#1D4ED8',
      accent: '#F59E0B',
      text: '#FFFFFF',
      cardBg: 'rgba(37, 99, 235, 0.15)',
      gradient: 'from-blue-900 via-blue-700 to-blue-800'
    },
    styles: {
      // Estilo actual - mantiene como está
      bannerText: 'text-4xl font-bold text-white',
      cardBorder: 'border-2 border-blue-400/40',
      buttonPrimary: 'bg-blue-600 hover:bg-blue-700',
      buttonSecondary: 'bg-blue-800 hover:bg-blue-900'
    }
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
    }
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
  return TOURNAMENT_THEMES[tournamentId] || TOURNAMENT_THEMES['cordoba']; // Córdoba por defecto
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