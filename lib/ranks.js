// ═══════════════════════════════════════════════════════════════════
// Sistema de ranking competitivo para Super Smash Bros. Ultimate
// Completamente separado de los puntos de torneo (AFK / INC)
// ═══════════════════════════════════════════════════════════════════
//
// MMR (oculto)  → Elo modificado 0–3500+, controla matchmaking
// RR  (visible) → 0–100 por subdivisión, controla ascensos/descensos
// RANGOS        → 9 tiers con subdivisiones (I–IV o I–III), + SMASHer dinámico
// PLACEMENT     → 10 partidas iniciales con K=80

// ─── Constantes ───────────────────────────────────────────────────
export const RANK_MAX          = 100;  // RR necesario para ascender de subdivisión
export const PLACEMENT_MATCHES = 5;    // partidas de clasificación
export const MMR_DEFAULT       = 1000; // MMR inicial

// RR base ganado/perdido
const BASE_RR_WIN  = 20;
const BASE_RR_LOSS = 15;

// Pisos de RR
const MIN_RR_WIN  = 5;  // mínimo que podés ganar por victoria
const MIN_RR_LOSS = 8;  // mínimo que perdés por derrota

// Umbral de MMR para bonuses/penalizaciones de RR
const MMR_UPSET_THRESHOLD   = 150; // diferencia mínima para bonus/penalización

// Protección post-ascenso: partidas sin poder descender de rango
const PROMOTION_SHIELD_GAMES = 2;

// ─── K Factor dinámico según tier ─────────────────────────────────
// Plástico–Bronce: aprendizaje rápido. Plata–Platino: intermedio.
// Diamante: estable. SMASHer: muy estable. Placement: volátil.
export function getKFactor(rank) {
  if (!rank) return 40;
  const tier = typeof rank === 'string' ? getTierFromRankName(rank) : null;
  switch (tier) {
    case 'Plástico': case 'Madera': case 'Hierro': case 'Bronce': return 40;
    case 'Plata': case 'Oro': case 'Platino': return 30;
    case 'Diamante': return 24;
    case 'SMASHer':  return 20;
    default: return 40;
  }
}
const K_PLACEMENT = 80; // durante placements fluctúa el doble

// ─── Tabla MMR → índice esperado de rango ────────────────────────
// Umbral de MMR mínimo para cada subdivisión (tiered interpolado por tier)
const RANK_MMR_THRESHOLDS = [
    0, 100, 200, 300,       // Plástico I–IV  (índices  0– 3)
  400, 500, 600, 700,       // Madera I–IV    (índices  4– 7)
  800, 900,1000,1100,       // Hierro I–IV    (índices  8–11)
 1200,1300,1400,1500,       // Bronce I–IV    (índices 12–15)
 1600,1733,1866,            // Plata I–III    (índices 16–18)
 2000,2133,2266,            // Oro I–III      (índices 19–21)
 2400,2533,2666,            // Platino I–III  (índices 22–24)
 2800,2933,3066,            // Diamante I–III (índices 25–27)
 3200,                      // SMASHer        (índice  28)
];

function getExpectedRankIndex(mmr) {
  const m = mmr || 0;
  for (let i = RANK_MMR_THRESHOLDS.length - 1; i >= 0; i--) {
    if (m >= RANK_MMR_THRESHOLDS[i]) return i;
  }
  return 0;
}

// ─── Multiplicador de stocks ──────────────────────────────────────
// stocksWon = stocks que le quedaron al ganador al terminar la partida
// 3 stocks (aplastó): +20% MMR y RR  |  1 stock (apurado): -15%
const STOCK_MULTIPLIERS = { 3: 1.20, 2: 1.00, 1: 0.85 };
function getStockMultiplier(stocksWon) {
  return STOCK_MULTIPLIERS[stocksWon] != null ? STOCK_MULTIPLIERS[stocksWon] : 1.0;
}

// ─── Multiplicador de convergencia para VICTORIAS ─────────────────
// Si tu MMR sugiere que deberías estar más alto que tu rango actual:
//   → ganás RR más rápido para llegar a donde corresponde
// Si tu MMR sugiere que estás demasiado alto (boosteado):
//   → ganás RR más lento
export function getConvergenceMultiplier(rankIndex, mmr) {
  const expectedIdx = getExpectedRankIndex(mmr || MMR_DEFAULT);
  const gap = expectedIdx - (rankIndex || 0); // + = deberías estar más alto
  if (gap >= 6) return 1.50; // muy mal posicionado → sube muy rápido
  if (gap >= 4) return 1.35;
  if (gap >= 2) return 1.20;
  if (gap >= 0) return 1.00; // en su rango → normal
  if (gap >= -2) return 0.90;
  return 0.75;                // muy por encima de su MMR → acumula RR lento
}

// ─── Multiplicador de convergencia para DERROTAS ─────────────────
// Si estás por encima de tu rango esperado → perdés más RR (cae más rápido)
// Si estás por debajo de tu rango esperado → perdés menos RR (no te hundís)
function getLossConvergenceMultiplier(rankIndex, mmr) {
  const expectedIdx = getExpectedRankIndex(mmr || MMR_DEFAULT);
  const gap = expectedIdx - (rankIndex || 0); // - = estás demasiado alto
  if (gap >= 4) return 0.75; // muy por debajo de tu rango → perdés poco
  if (gap >= 2) return 0.90;
  if (gap >= 0) return 1.00; // en su rango → normal
  if (gap >= -2) return 1.15;
  return 1.30;                // muy por encima de tu rango → perdés más RR
}

// ─── Array de RANGOS con subdivisiones ────────────────────────────
// 4 subdivisiones: Plástico, Madera, Hierro, Bronce
// 3 subdivisiones: Plata, Oro, Platino, Diamante
// Sin subdivisiones: SMASHer
export const RANKS = [
  // Plástico I–IV  (índices 0–3)
  { name: 'Plástico I',   tier: 'Plástico', subdivision: 1, color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)' },
  { name: 'Plástico II',  tier: 'Plástico', subdivision: 2, color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)' },
  { name: 'Plástico III', tier: 'Plástico', subdivision: 3, color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)' },
  { name: 'Plástico IV',  tier: 'Plástico', subdivision: 4, color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)' },
  // Madera I–IV  (índices 4–7)
  { name: 'Madera I',   tier: 'Madera', subdivision: 1, color: '#B45309', bg: 'rgba(180,83,9,0.15)', border: 'rgba(180,83,9,0.4)' },
  { name: 'Madera II',  tier: 'Madera', subdivision: 2, color: '#B45309', bg: 'rgba(180,83,9,0.15)', border: 'rgba(180,83,9,0.4)' },
  { name: 'Madera III', tier: 'Madera', subdivision: 3, color: '#B45309', bg: 'rgba(180,83,9,0.15)', border: 'rgba(180,83,9,0.4)' },
  { name: 'Madera IV',  tier: 'Madera', subdivision: 4, color: '#B45309', bg: 'rgba(180,83,9,0.15)', border: 'rgba(180,83,9,0.4)' },
  // Hierro I–IV  (índices 8–11)
  { name: 'Hierro I',   tier: 'Hierro', subdivision: 1, color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  { name: 'Hierro II',  tier: 'Hierro', subdivision: 2, color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  { name: 'Hierro III', tier: 'Hierro', subdivision: 3, color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  { name: 'Hierro IV',  tier: 'Hierro', subdivision: 4, color: '#6B7280', bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)' },
  // Bronce I–IV  (índices 12–15)
  { name: 'Bronce I',   tier: 'Bronce', subdivision: 1, color: '#CD7F32', bg: 'rgba(205,127,50,0.15)', border: 'rgba(205,127,50,0.4)' },
  { name: 'Bronce II',  tier: 'Bronce', subdivision: 2, color: '#CD7F32', bg: 'rgba(205,127,50,0.15)', border: 'rgba(205,127,50,0.4)' },
  { name: 'Bronce III', tier: 'Bronce', subdivision: 3, color: '#CD7F32', bg: 'rgba(205,127,50,0.15)', border: 'rgba(205,127,50,0.4)' },
  { name: 'Bronce IV',  tier: 'Bronce', subdivision: 4, color: '#CD7F32', bg: 'rgba(205,127,50,0.15)', border: 'rgba(205,127,50,0.4)' },
  // Plata I–III  (índices 16–18)
  { name: 'Plata I',   tier: 'Plata', subdivision: 1, color: '#CBD5E1', bg: 'rgba(203,213,225,0.15)', border: 'rgba(203,213,225,0.3)' },
  { name: 'Plata II',  tier: 'Plata', subdivision: 2, color: '#CBD5E1', bg: 'rgba(203,213,225,0.15)', border: 'rgba(203,213,225,0.3)' },
  { name: 'Plata III', tier: 'Plata', subdivision: 3, color: '#CBD5E1', bg: 'rgba(203,213,225,0.15)', border: 'rgba(203,213,225,0.3)' },
  // Oro I–III  (índices 19–21)
  { name: 'Oro I',   tier: 'Oro', subdivision: 1, color: '#EAB308', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.4)' },
  { name: 'Oro II',  tier: 'Oro', subdivision: 2, color: '#EAB308', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.4)' },
  { name: 'Oro III', tier: 'Oro', subdivision: 3, color: '#EAB308', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.4)' },
  // Platino I–III  (índices 22–24)
  { name: 'Platino I',   tier: 'Platino', subdivision: 1, color: '#67E8F9', bg: 'rgba(103,232,249,0.15)', border: 'rgba(103,232,249,0.3)' },
  { name: 'Platino II',  tier: 'Platino', subdivision: 2, color: '#67E8F9', bg: 'rgba(103,232,249,0.15)', border: 'rgba(103,232,249,0.3)' },
  { name: 'Platino III', tier: 'Platino', subdivision: 3, color: '#67E8F9', bg: 'rgba(103,232,249,0.15)', border: 'rgba(103,232,249,0.3)' },
  // Diamante I–III  (índices 25–27)
  { name: 'Diamante I',   tier: 'Diamante', subdivision: 1, color: '#93C5FD', bg: 'rgba(147,197,253,0.15)', border: 'rgba(147,197,253,0.3)' },
  { name: 'Diamante II',  tier: 'Diamante', subdivision: 2, color: '#93C5FD', bg: 'rgba(147,197,253,0.15)', border: 'rgba(147,197,253,0.3)' },
  { name: 'Diamante III', tier: 'Diamante', subdivision: 3, color: '#93C5FD', bg: 'rgba(147,197,253,0.15)', border: 'rgba(147,197,253,0.3)' },
  // SMASHer  (índice 28) — sin subdivisiones, ranking numérico + MMR visible
  { name: 'SMASHer', tier: 'SMASHer', subdivision: null, color: '#FF8C00', bg: 'rgba(255,140,0,0.2)', border: 'rgba(255,140,0,0.55)' },
];

const SMASHER_INDEX = RANKS.length - 1; // 28

export const TIER_ICONS = {
  'Plástico': '🪨',
  'Madera':   '🪵',
  'Hierro':   '⚙️',
  'Bronce':   '🔶',
  'Plata':    '🪙',
  'Oro':      '🏅',
  'Platino':  '💎',
  'Diamante': '🔷',
  'SMASHer':  '👑',
};

// ─── Helpers de lookup ────────────────────────────────────────────

/** Devuelve el tier (string) a partir de un nombre completo, ej: "Bronce II" → "Bronce" */
function getTierFromRankName(rankName) {
  if (!rankName) return 'Plástico';
  const r = RANKS.find(r => r.name === rankName);
  return r ? r.tier : 'Plástico';
}

/** Devuelve el índice de un rango por nombre (0-based dentro de RANKS[]) */
export function getRankIndex(rankName) {
  const i = RANKS.findIndex(r => r.name === rankName);
  return i >= 0 ? i : 0;
}

/** Devuelve el objeto de rango por nombre */
export function getRankObj(rankName) {
  return RANKS.find(r => r.name === rankName) || RANKS[0];
}

// ═══════════════════════════════════════════════════════════════════
// 1. calculateExpectedOutcome — probabilidad esperada de victoria
// ═══════════════════════════════════════════════════════════════════
export function calculateExpectedOutcome(mmrA, mmrB) {
  return 1 / (1 + Math.pow(10, (mmrB - mmrA) / 400));
}

// ═══════════════════════════════════════════════════════════════════
// 2. calculateMMRDelta — cambio de MMR (Elo modificado)
//    resultado: 1 = victoria, 0 = derrota
// ═══════════════════════════════════════════════════════════════════
export function calculateMMRDelta(mmrPlayer, mmrOpponent, resultado, kFactor) {
  const expected = calculateExpectedOutcome(mmrPlayer, mmrOpponent);
  const delta = kFactor * (resultado - expected);
  // Redondear, mínimo absoluto 1 si hubo resultado
  return Math.round(delta) || (resultado === 1 ? 1 : -1);
}

// Wrapper legacy: calcula el delta positivo que gana el winner (para backwards compat)
export function calcMMRDelta(winnerMMR, loserMMR, stocksWon = 1, streak = 0) {
  const k = getKFactor(null); // default 40
  const delta = calculateMMRDelta(winnerMMR, loserMMR, 1, k);
  return Math.max(1, delta);
}

// ═══════════════════════════════════════════════════════════════════
// 3. calculateRRDelta — cambio de RR visible
//    resultado: 1 = victoria, 0 = derrota
//    Ajusta por diferencia de MMR (upsets, favoritos, sustos)
// ═══════════════════════════════════════════════════════════════════
export function calculateRRDelta(mmrPlayer, mmrOpponent, resultado) {
  const diff = mmrOpponent - mmrPlayer; // positivo = rival más fuerte

  if (resultado === 1) {
    // Victoria
    let bonus = 0;
    let penalizacion = 0;
    if (diff >= MMR_UPSET_THRESHOLD) {
      // Upset: ganaste a alguien mucho mayor → bonus
      bonus = Math.min(12, Math.floor(diff / 20));
    } else if (diff <= -MMR_UPSET_THRESHOLD) {
      // Susto: ganaste a alguien mucho menor → menos RR
      penalizacion = Math.min(8, Math.floor(Math.abs(diff) / 25));
    }
    return Math.max(MIN_RR_WIN, BASE_RR_WIN + bonus - penalizacion);
  } else {
    // Derrota
    let penalizacion = 0;
    if (diff <= -MMR_UPSET_THRESHOLD) {
      // Favorito: perdiste contra alguien mucho menor → más castigo
      penalizacion = Math.min(8, Math.floor(Math.abs(diff) / 25));
    }
    return Math.max(MIN_RR_LOSS, BASE_RR_LOSS + penalizacion);
  }
}

// Wrapper legacy (para backwards compat con result.js existente)
export function calcRPDelta(stocksWon = 1, streak = 0) {
  return BASE_RR_WIN; // sin info de MMR rival, devolver base
}

// ═══════════════════════════════════════════════════════════════════
// 4. checkRankPromotion — verifica y aplica ascenso/descenso de subdivisión/rango
//    Muta stats y devuelve info del cambio:
//    { promoted, demoted, newRank, newSubdivision, newRR, oldRank, oldSubdivision }
// ═══════════════════════════════════════════════════════════════════
export function checkRankPromotion(stats) {
  stats.rankIndex = stats.rankIndex ?? getRankIndex(stats.rank);
  const oldRank = stats.rank;
  const oldIndex = stats.rankIndex;
  const isSmasher = stats.rankIndex === SMASHER_INDEX;
  let promoted = false;
  let demoted = false;

  if (isSmasher) {
    // SMASHer: sin RR, sin subdivisiones — no hay promoción/descenso aquí
    // (la caída de SMASHer se maneja en processMatchResult comparando con threshold)
    return { promoted: false, demoted: false, newRank: stats.rank, newSubdivision: null, newRR: null, oldRank, oldSubdivision: null };
  }

  // ── Ascenso: RR >= 100 ──
  while (stats.rankPoints >= RANK_MAX && stats.rankIndex < SMASHER_INDEX) {
    stats.rankPoints -= RANK_MAX;
    stats.rankIndex += 1;
    stats.rank = RANKS[stats.rankIndex].name;
    promoted = true;
    // Al ascender: shield de protección
    stats.promotionShield = PROMOTION_SHIELD_GAMES;
    // RR se resetea a 0 (el exceso sobre 100 se pierde al cambiar subdivisión)
    stats.rankPoints = 0;
    break; // solo un ascenso por partida
  }

  // ── Descenso: RR < 0 ──
  if (!promoted && stats.rankPoints < 0) {
    // Protección: shield activo → no descender, RR queda en 0
    if ((stats.promotionShield || 0) > 0) {
      stats.rankPoints = 0;
    } else if (stats.rankIndex === 0) {
      // Plástico I: piso absoluto
      stats.rankPoints = 0;
    } else {
      // Ver si bajamos de subdivisión o de tier
      const currentTier = RANKS[stats.rankIndex].tier;
      const prevIndex = stats.rankIndex - 1;
      const prevTier = RANKS[prevIndex].tier;

      stats.rankIndex -= 1;
      stats.rank = RANKS[stats.rankIndex].name;
      demoted = true;

      if (currentTier !== prevTier) {
        // Bajamos de tier (ej: de Plata I a Bronce IV) → RR = 50
        stats.rankPoints = 50;
      } else {
        // Bajamos de subdivisión dentro del mismo tier → RR = 75
        stats.rankPoints = 75;
      }
    }
  }

  const r = RANKS[stats.rankIndex];
  return {
    promoted,
    demoted,
    newRank: stats.rank,
    newSubdivision: r.subdivision,
    newRR: stats.rankPoints,
    oldRank,
    oldSubdivision: RANKS[oldIndex]?.subdivision ?? null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// 5. processMatchResult — lógica completa de una partida
//    Calcula MMR, RR, aplica ascensos/descensos, devuelve deltas.
//    NO accede a DB: recibe objetos stats, los muta, y devuelve resultados.
// ═══════════════════════════════════════════════════════════════════
export function processMatchResult(winnerStats, loserStats, options = {}) {
  // Snapshots para historia
  const wOldRank = winnerStats.rank;
  const wOldSub  = RANKS[winnerStats.rankIndex ?? getRankIndex(winnerStats.rank)]?.subdivision;
  const lOldRank = loserStats.rank;
  const lOldSub  = RANKS[loserStats.rankIndex ?? getRankIndex(loserStats.rank)]?.subdivision;

  // ── K Factor ──
  const wInPlacement = !winnerStats.placementDone && ((winnerStats.wins || 0) + (winnerStats.losses || 0)) < PLACEMENT_MATCHES;
  const lInPlacement = !loserStats.placementDone && ((loserStats.wins || 0) + (loserStats.losses || 0)) < PLACEMENT_MATCHES;
  const wK = wInPlacement ? K_PLACEMENT : getKFactor(winnerStats.rank);
  const lK = lInPlacement ? K_PLACEMENT : getKFactor(loserStats.rank);

  const wMMR = winnerStats.mmr || MMR_DEFAULT;
  const lMMR = loserStats.mmr || MMR_DEFAULT;

  // ── MMR deltas ──
  const wMMRDelta = calculateMMRDelta(wMMR, lMMR, 1, wK);
  const lMMRDelta = calculateMMRDelta(lMMR, wMMR, 0, lK);

  winnerStats.mmr = Math.max(0, wMMR + wMMRDelta);
  loserStats.mmr  = Math.max(0, lMMR + lMMRDelta);

  // ── Wins/Losses + streaks ──
  winnerStats.wins      = (winnerStats.wins || 0) + 1;
  winnerStats.winStreak = (winnerStats.winStreak || 0) + 1;
  winnerStats.bestStreak = Math.max(winnerStats.bestStreak || 0, winnerStats.winStreak);
  loserStats.losses     = (loserStats.losses || 0) + 1;
  loserStats.winStreak  = 0;

  // ── Placement tracking ──
  if (wInPlacement) winnerStats.placementWins = (winnerStats.placementWins || 0) + 1;

  // ── Si acaba de terminar placements, asignar rango ──
  let wPlacementJustDone = false;
  let lPlacementJustDone = false;

  if (wInPlacement && (winnerStats.wins + (winnerStats.losses || 0)) >= PLACEMENT_MATCHES) {
    const placed = assignPlacementRank(winnerStats.mmr);
    winnerStats.rank = placed.name;
    winnerStats.rankIndex = getRankIndex(placed.name);
    winnerStats.rankPoints = 0;
    winnerStats.placementDone = true;
    winnerStats.promotionShield = 0;
    wPlacementJustDone = true;
  }
  if (lInPlacement && ((loserStats.wins || 0) + loserStats.losses) >= PLACEMENT_MATCHES) {
    const placed = assignPlacementRank(loserStats.mmr);
    loserStats.rank = placed.name;
    loserStats.rankIndex = getRankIndex(placed.name);
    loserStats.rankPoints = 0;
    loserStats.placementDone = true;
    loserStats.promotionShield = 0;
    lPlacementJustDone = true;
  }

  // ── RR deltas (solo post-placement y no-SMASHer) ──
  let wRRDelta = 0;
  let lRRDelta = 0;

  const wIsSmasher = (winnerStats.rankIndex ?? getRankIndex(winnerStats.rank)) === SMASHER_INDEX;
  const lIsSmasher = (loserStats.rankIndex ?? getRankIndex(loserStats.rank)) === SMASHER_INDEX;

  // stockMult: bonifica/penaliza según lo dominante que fue la victoria
  const stockMult = getStockMultiplier(options.stocksWon);

  if (!wInPlacement && !wPlacementJustDone && !wIsSmasher) {
    // Convergencia: el que está bajo su rango esperado sube más rápido
    const wMult = stockMult * getConvergenceMultiplier(winnerStats.rankIndex, wMMR);
    wRRDelta = Math.max(1, Math.round(calculateRRDelta(wMMR, lMMR, 1) * wMult));
    winnerStats.rankPoints = (winnerStats.rankPoints || 0) + wRRDelta;
  }

  if (!lInPlacement && !lPlacementJustDone && !lIsSmasher) {
    // Convergencia: el que está sobre su rango esperado cae más rápido
    const lMult = stockMult * getLossConvergenceMultiplier(loserStats.rankIndex, lMMR);
    lRRDelta = -Math.max(1, Math.round(calculateRRDelta(lMMR, wMMR, 0) * lMult));
    loserStats.rankPoints = (loserStats.rankPoints || 0) + lRRDelta;
  }

  // ── Decrementar shield ──
  if ((winnerStats.promotionShield || 0) > 0) winnerStats.promotionShield -= 1;
  if ((loserStats.promotionShield || 0) > 0)  loserStats.promotionShield -= 1;

  // ── Ascensos/Descensos ──
  const wPromo = (!wInPlacement && !wPlacementJustDone && !wIsSmasher) ? checkRankPromotion(winnerStats) : { promoted: false, demoted: false };
  const lPromo = (!lInPlacement && !lPlacementJustDone && !lIsSmasher) ? checkRankPromotion(loserStats)  : { promoted: false, demoted: false };

  // Timestamps
  const now = new Date().toISOString();
  winnerStats.updatedAt = now;
  loserStats.updatedAt = now;

  return {
    winner: {
      mmrBefore: wMMR, mmrAfter: winnerStats.mmr, mmrDelta: wMMRDelta,
      rrDelta: wRRDelta, rankChange: wPromo, placementJustDone: wPlacementJustDone,
      oldRank: wOldRank, oldSubdivision: wOldSub,
    },
    loser: {
      mmrBefore: lMMR, mmrAfter: loserStats.mmr, mmrDelta: lMMRDelta,
      rrDelta: lRRDelta, rankChange: lPromo, placementJustDone: lPlacementJustDone,
      oldRank: lOldRank, oldSubdivision: lOldSub,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
// 6. assignPlacementRank — rango inicial basado en MMR tras placements
//    MMR 0–399 → Plástico I, 400–799 → Madera I, etc.
// ═══════════════════════════════════════════════════════════════════
export function assignPlacementRank(mmr) {
  if (mmr >= 3200) return RANKS[SMASHER_INDEX]; // raro pero posible con 10W perfectas
  if (mmr >= 2800) return RANKS[25]; // Diamante I
  if (mmr >= 2400) return RANKS[22]; // Platino I
  if (mmr >= 2000) return RANKS[19]; // Oro I
  if (mmr >= 1600) return RANKS[16]; // Plata I
  if (mmr >= 1200) return RANKS[12]; // Bronce I
  if (mmr >= 800)  return RANKS[8];  // Hierro I
  if (mmr >= 400)  return RANKS[4];  // Madera I
  return RANKS[0];                    // Plástico I
}

// Legacy compat
export function calculatePlacementRank(wins) {
  // Aproximar MMR según wins en placement (legacy, para migración)
  const approxMmr = MMR_DEFAULT + (wins - 5) * 80;
  return assignPlacementRank(approxMmr);
}

// ═══════════════════════════════════════════════════════════════════
// 7. Score para el sorted set del leaderboard
// ═══════════════════════════════════════════════════════════════════
export function leaderboardScore(stats) {
  // Jugadores en placement → al fondo del leaderboard, ordenados por victorias
  if (!stats.placementDone) return (stats.wins || 0);
  // Rankeados → offset 1000 para siempre quedar por encima del máximo de placement (9 wins)
  return 1000 + (stats.rankIndex || 0) * RANK_MAX + (stats.rankPoints || 0);
}

// ═══════════════════════════════════════════════════════════════════
// 8. Placement helpers
// ═══════════════════════════════════════════════════════════════════
export function isInPlacement(stats) {
  if (!stats || stats.placementDone) return false;
  return ((stats.wins || 0) + (stats.losses || 0)) < PLACEMENT_MATCHES;
}

// ═══════════════════════════════════════════════════════════════════
// 9. applyWinRP / applyLossRP — legacy wrappers usados por result.js
//    Mantenidos para no romper el flujo existente, pero ahora
//    processMatchResult es la función principal.
// ═══════════════════════════════════════════════════════════════════
export function applyWinRP(stats, rpDelta) {
  stats.wins       = (stats.wins || 0) + 1;
  stats.rankIndex  = stats.rankIndex ?? getRankIndex(stats.rank);
  stats.winStreak  = (stats.winStreak || 0) + 1;
  stats.bestStreak = Math.max(stats.bestStreak || 0, stats.winStreak);
  stats.rankPoints = (stats.rankPoints || 0) + rpDelta;
  checkRankPromotion(stats);
  return stats;
}

export function applyLossRP(stats) {
  stats.losses    = (stats.losses || 0) + 1;
  stats.rankIndex = stats.rankIndex ?? getRankIndex(stats.rank);
  stats.winStreak = 0;
  const isSmasher = stats.rankIndex === SMASHER_INDEX;
  if (isSmasher) {
    // SMASHer: sin RR
    return stats;
  }
  stats.rankPoints = (stats.rankPoints || 0) - BASE_RR_LOSS;
  checkRankPromotion(stats);
  return stats;
}

// Legacy: applyWin/applyLoss (sin MMR context) — mantenidos por si algún código viejo los usa
export function applyWin(stats)  { return applyWinRP(stats, BASE_RR_WIN); }
export function applyLoss(stats) { return applyLossRP(stats); }
