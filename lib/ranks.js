// Sistema de rangos para partidas ranked online
// Completamente separado de los puntos de torneo (AFK / INC)

export const WIN_POINTS  = 20;  // Puntos ganados por victoria
export const LOSS_POINTS = 10;  // Puntos perdidos por derrota (mínimo 0)

export const RANKS = [
  // Plástico
  { name: 'Plástico 1', tier: 'Plástico', minPts: 0,    color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)'  },
  { name: 'Plástico 2', tier: 'Plástico', minPts: 100,  color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)'  },
  { name: 'Plástico 3', tier: 'Plástico', minPts: 200,  color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)'  },
  // Madera
  { name: 'Madera 1',   tier: 'Madera',   minPts: 300,  color: '#B45309', bg: 'rgba(180,83,9,0.15)',    border: 'rgba(180,83,9,0.4)'    },
  { name: 'Madera 2',   tier: 'Madera',   minPts: 400,  color: '#B45309', bg: 'rgba(180,83,9,0.15)',    border: 'rgba(180,83,9,0.4)'    },
  { name: 'Madera 3',   tier: 'Madera',   minPts: 500,  color: '#B45309', bg: 'rgba(180,83,9,0.15)',    border: 'rgba(180,83,9,0.4)'    },
  // Hierro
  { name: 'Hierro 1',   tier: 'Hierro',   minPts: 600,  color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  { name: 'Hierro 2',   tier: 'Hierro',   minPts: 700,  color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  { name: 'Hierro 3',   tier: 'Hierro',   minPts: 800,  color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  // Bronce
  { name: 'Bronce 1',   tier: 'Bronce',   minPts: 900,  color: '#CD7F32', bg: 'rgba(205,127,50,0.15)',  border: 'rgba(205,127,50,0.4)'  },
  { name: 'Bronce 2',   tier: 'Bronce',   minPts: 1000, color: '#CD7F32', bg: 'rgba(205,127,50,0.15)',  border: 'rgba(205,127,50,0.4)'  },
  { name: 'Bronce 3',   tier: 'Bronce',   minPts: 1100, color: '#CD7F32', bg: 'rgba(205,127,50,0.15)',  border: 'rgba(205,127,50,0.4)'  },
  // Plata
  { name: 'Plata 1',    tier: 'Plata',    minPts: 1200, color: '#CBD5E1', bg: 'rgba(203,213,225,0.15)', border: 'rgba(203,213,225,0.3)' },
  { name: 'Plata 2',    tier: 'Plata',    minPts: 1300, color: '#CBD5E1', bg: 'rgba(203,213,225,0.15)', border: 'rgba(203,213,225,0.3)' },
  { name: 'Plata 3',    tier: 'Plata',    minPts: 1400, color: '#CBD5E1', bg: 'rgba(203,213,225,0.15)', border: 'rgba(203,213,225,0.3)' },
  // Oro
  { name: 'Oro 1',      tier: 'Oro',      minPts: 1500, color: '#EAB308', bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.4)'   },
  { name: 'Oro 2',      tier: 'Oro',      minPts: 1600, color: '#EAB308', bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.4)'   },
  { name: 'Oro 3',      tier: 'Oro',      minPts: 1700, color: '#EAB308', bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.4)'   },
  // Platino
  { name: 'Platino 1',  tier: 'Platino',  minPts: 1800, color: '#67E8F9', bg: 'rgba(103,232,249,0.15)', border: 'rgba(103,232,249,0.3)' },
  { name: 'Platino 2',  tier: 'Platino',  minPts: 1900, color: '#67E8F9', bg: 'rgba(103,232,249,0.15)', border: 'rgba(103,232,249,0.3)' },
  { name: 'Platino 3',  tier: 'Platino',  minPts: 2000, color: '#67E8F9', bg: 'rgba(103,232,249,0.15)', border: 'rgba(103,232,249,0.3)' },
  // Diamante
  { name: 'Diamante 1', tier: 'Diamante', minPts: 2100, color: '#93C5FD', bg: 'rgba(147,197,253,0.15)', border: 'rgba(147,197,253,0.3)' },
  { name: 'Diamante 2', tier: 'Diamante', minPts: 2200, color: '#93C5FD', bg: 'rgba(147,197,253,0.15)', border: 'rgba(147,197,253,0.3)' },
  { name: 'Diamante 3', tier: 'Diamante', minPts: 2300, color: '#93C5FD', bg: 'rgba(147,197,253,0.15)', border: 'rgba(147,197,253,0.3)' },
  // Smasher — competen por puntos, leaderboard separado
  { name: 'Smasher',    tier: 'Smasher',  minPts: 2500, color: '#FF8C00', bg: 'rgba(255,140,0,0.2)',    border: 'rgba(255,140,0,0.55)'  },
];

export const TIER_ICONS = {
  'Plástico': '🪨',
  'Madera':   '🪵',
  'Hierro':   '⚙️',
  'Bronce':   '🔶',
  'Plata':    '🪙',
  'Oro':      '🏅',
  'Platino':  '💎',
  'Diamante': '🔷',
  'Smasher':  '👑',
};

/** Devuelve el objeto de rango para los puntos dados */
export function calcRank(points) {
  const p = Math.max(0, Math.floor(points || 0));
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (p >= RANKS[i].minPts) return RANKS[i];
  }
  return RANKS[0];
}
