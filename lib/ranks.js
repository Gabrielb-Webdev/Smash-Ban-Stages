// Sistema de rangos para partidas ranked online
// Completamente separado de los puntos de torneo (AFK / INC)
//
// Sistema de puntos POR rango (0 → 100):
//   Victoria  → +WIN_POINTS. Si rankPoints >= RANK_MAX se asciende y el exceso pasa al nuevo rango.
//   Derrota con rankPoints > 0  → restar LOSS_POINTS, mínimo 0 (sin descenso).
//   Derrota con rankPoints = 0  → descender al rango anterior con (RANK_MAX - LOSS_POINTS) puntos.
//   Plástico 1 en 0 puntos      → queda en 0, no puede bajar más.
//   Smasher                     → puntos acumulativos sin tope, sin descenso de categoría.

export const WIN_POINTS        = 20;
export const LOSS_POINTS       = 10;
export const RANK_MAX          = 100; // puntos para ascender de rango
export const PLACEMENT_MATCHES = 5;   // partidas de posicionamiento

export const RANKS = [
  // Plástico
  { name: 'Plástico 1', tier: 'Plástico', color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)'  },
  { name: 'Plástico 2', tier: 'Plástico', color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)'  },
  { name: 'Plástico 3', tier: 'Plástico', color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)'  },
  // Madera
  { name: 'Madera 1',   tier: 'Madera',   color: '#B45309', bg: 'rgba(180,83,9,0.15)',    border: 'rgba(180,83,9,0.4)'    },
  { name: 'Madera 2',   tier: 'Madera',   color: '#B45309', bg: 'rgba(180,83,9,0.15)',    border: 'rgba(180,83,9,0.4)'    },
  { name: 'Madera 3',   tier: 'Madera',   color: '#B45309', bg: 'rgba(180,83,9,0.15)',    border: 'rgba(180,83,9,0.4)'    },
  // Hierro
  { name: 'Hierro 1',   tier: 'Hierro',   color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  { name: 'Hierro 2',   tier: 'Hierro',   color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  { name: 'Hierro 3',   tier: 'Hierro',   color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  // Bronce
  { name: 'Bronce 1',   tier: 'Bronce',   color: '#CD7F32', bg: 'rgba(205,127,50,0.15)',  border: 'rgba(205,127,50,0.4)'  },
  { name: 'Bronce 2',   tier: 'Bronce',   color: '#CD7F32', bg: 'rgba(205,127,50,0.15)',  border: 'rgba(205,127,50,0.4)'  },
  { name: 'Bronce 3',   tier: 'Bronce',   color: '#CD7F32', bg: 'rgba(205,127,50,0.15)',  border: 'rgba(205,127,50,0.4)'  },
  // Plata
  { name: 'Plata 1',    tier: 'Plata',    color: '#CBD5E1', bg: 'rgba(203,213,225,0.15)', border: 'rgba(203,213,225,0.3)' },
  { name: 'Plata 2',    tier: 'Plata',    color: '#CBD5E1', bg: 'rgba(203,213,225,0.15)', border: 'rgba(203,213,225,0.3)' },
  { name: 'Plata 3',    tier: 'Plata',    color: '#CBD5E1', bg: 'rgba(203,213,225,0.15)', border: 'rgba(203,213,225,0.3)' },
  // Oro
  { name: 'Oro 1',      tier: 'Oro',      color: '#EAB308', bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.4)'   },
  { name: 'Oro 2',      tier: 'Oro',      color: '#EAB308', bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.4)'   },
  { name: 'Oro 3',      tier: 'Oro',      color: '#EAB308', bg: 'rgba(234,179,8,0.15)',   border: 'rgba(234,179,8,0.4)'   },
  // Platino
  { name: 'Platino 1',  tier: 'Platino',  color: '#67E8F9', bg: 'rgba(103,232,249,0.15)', border: 'rgba(103,232,249,0.3)' },
  { name: 'Platino 2',  tier: 'Platino',  color: '#67E8F9', bg: 'rgba(103,232,249,0.15)', border: 'rgba(103,232,249,0.3)' },
  { name: 'Platino 3',  tier: 'Platino',  color: '#67E8F9', bg: 'rgba(103,232,249,0.15)', border: 'rgba(103,232,249,0.3)' },
  // Diamante
  { name: 'Diamante 1', tier: 'Diamante', color: '#93C5FD', bg: 'rgba(147,197,253,0.15)', border: 'rgba(147,197,253,0.3)' },
  { name: 'Diamante 2', tier: 'Diamante', color: '#93C5FD', bg: 'rgba(147,197,253,0.15)', border: 'rgba(147,197,253,0.3)' },
  { name: 'Diamante 3', tier: 'Diamante', color: '#93C5FD', bg: 'rgba(147,197,253,0.15)', border: 'rgba(147,197,253,0.3)' },
  // Smasher — puntos acumulativos, sin límite, sin descenso de categoría
  { name: 'Smasher',    tier: 'Smasher',  color: '#FF8C00', bg: 'rgba(255,140,0,0.2)',    border: 'rgba(255,140,0,0.55)'  },
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

/** Devuelve el índice de un rango por nombre */
export function getRankIndex(rankName) {
  const i = RANKS.findIndex(r => r.name === rankName);
  return i >= 0 ? i : 0;
}

/** Devuelve el objeto de rango por nombre */
export function getRankObj(rankName) {
  return RANKS.find(r => r.name === rankName) || RANKS[0];
}

/**
 * Aplica una victoria al objeto de stats (muta y devuelve stats).
 * Si rankPoints >= RANK_MAX se asciende; el exceso pasa al nuevo rango.
 * En Smasher los puntos se acumulan sin límite.
 */
export function applyWin(stats) {
  stats.wins      = (stats.wins || 0) + 1;
  stats.rankIndex = stats.rankIndex ?? getRankIndex(stats.rank);
  stats.rankPoints = (stats.rankPoints || 0) + WIN_POINTS;

  while (stats.rankPoints >= RANK_MAX && stats.rankIndex < RANKS.length - 1) {
    stats.rankPoints -= RANK_MAX;
    stats.rankIndex  += 1;
    stats.rank        = RANKS[stats.rankIndex].name;
  }
  return stats;
}

/**
 * Aplica una derrota al objeto de stats (muta y devuelve stats).
 * - rankPoints > 0  → se descuenta, mínimo 0, sin descenso.
 * - rankPoints = 0  → descenso al rango anterior con (RANK_MAX - LOSS_POINTS) puntos.
 * - Plástico 1 y 0  → queda en 0.
 * - Smasher         → sólo descuenta, mínimo 0, sin bajar de categoría.
 */
export function applyLoss(stats) {
  stats.losses    = (stats.losses || 0) + 1;
  stats.rankIndex = stats.rankIndex ?? getRankIndex(stats.rank);
  const isSmasher = stats.rankIndex === RANKS.length - 1;

  if (isSmasher) {
    stats.rankPoints = Math.max(0, (stats.rankPoints || 0) - LOSS_POINTS);
  } else if ((stats.rankPoints || 0) > 0) {
    stats.rankPoints = Math.max(0, stats.rankPoints - LOSS_POINTS);
  } else {
    if (stats.rankIndex > 0) {
      stats.rankIndex -= 1;
      stats.rank       = RANKS[stats.rankIndex].name;
      stats.rankPoints = RANK_MAX - LOSS_POINTS; // e.g. 90
    } else {
      stats.rankPoints = 0; // Plástico 1, piso
    }
  }
  return stats;
}

/**
 * Score para el sorted set del leaderboard.
 * Permite ordenar por rango primero y por puntos dentro del rango.
 */
export function leaderboardScore(stats) {
  return (stats.rankIndex || 0) * RANK_MAX + (stats.rankPoints || 0);
}

/**
 * Devuelve true si el jugador todavía está en partidas de posicionamiento.
 */
export function isInPlacement(stats) {
  if (!stats || stats.placementDone) return false;
  return ((stats.wins || 0) + (stats.losses || 0)) < PLACEMENT_MATCHES;
}

/**
 * Determina el rango final según victorias en las partidas de posicionamiento.
 * 5W → Plata 3 | 4W → Plata 1 | 3W → Hierro 3 | 2W → Hierro 1 | 1W → Plástico 3 | 0W → Plástico 1
 */
export function calculatePlacementRank(wins) {
  if (wins >= 5) return RANKS[14]; // Plata 3
  if (wins >= 4) return RANKS[12]; // Plata 1
  if (wins >= 3) return RANKS[8];  // Hierro 3
  if (wins >= 2) return RANKS[6];  // Hierro 1
  if (wins >= 1) return RANKS[2];  // Plástico 3
  return RANKS[0];                  // Plástico 1
}
