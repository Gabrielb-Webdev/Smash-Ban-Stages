import { describe, it, expect } from 'vitest';
import {
  RANKS, RANK_MAX, PLACEMENT_MATCHES, MMR_DEFAULT,
  getKFactor, getRankIndex, getRankObj,
  calculateExpectedOutcome, calculateMMRDelta, calculateRRDelta,
  checkRankPromotion, processMatchResult, assignPlacementRank,
  isInPlacement, leaderboardScore, getConvergenceMultiplier,
} from '../ranks.js';

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════
function makeStats(overrides = {}) {
  return {
    userId: 'test', userName: 'Test', platform: 'switch',
    wins: 10, losses: 5, rank: 'Bronce I', rankIndex: 12, rankPoints: 50,
    mmr: 1200, winStreak: 0, bestStreak: 3,
    placementDone: true, placementWins: 6, promotionShield: 0,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// RANKS array structure
// ═══════════════════════════════════════════════════════════════════
describe('RANKS array', () => {
  it('tiene 29 rangos en total', () => {
    expect(RANKS).toHaveLength(29);
  });

  it('Plástico tiene 4 subdivisiones (I-IV)', () => {
    const plastico = RANKS.filter(r => r.tier === 'Plástico');
    expect(plastico).toHaveLength(4);
    expect(plastico.map(r => r.subdivision)).toEqual([1, 2, 3, 4]);
  });

  it('Plata tiene 3 subdivisiones (I-III)', () => {
    const plata = RANKS.filter(r => r.tier === 'Plata');
    expect(plata).toHaveLength(3);
    expect(plata.map(r => r.subdivision)).toEqual([1, 2, 3]);
  });

  it('SMASHer es el último rango sin subdivisión', () => {
    const smasher = RANKS[28];
    expect(smasher.tier).toBe('SMASHer');
    expect(smasher.subdivision).toBeNull();
  });

  it('cada tier de low tiene 4 subdivisions y cada tier de high tiene 3', () => {
    const lowTiers = ['Plástico', 'Madera', 'Hierro', 'Bronce'];
    const highTiers = ['Plata', 'Oro', 'Platino', 'Diamante'];
    lowTiers.forEach(t => {
      expect(RANKS.filter(r => r.tier === t)).toHaveLength(4);
    });
    highTiers.forEach(t => {
      expect(RANKS.filter(r => r.tier === t)).toHaveLength(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// getKFactor
// ═══════════════════════════════════════════════════════════════════
describe('getKFactor', () => {
  it('retorna 40 para tiers bajos', () => {
    expect(getKFactor('Plástico I')).toBe(40);
    expect(getKFactor('Bronce IV')).toBe(40);
  });

  it('retorna 30 para tiers medios', () => {
    expect(getKFactor('Plata II')).toBe(30);
    expect(getKFactor('Oro I')).toBe(30);
    expect(getKFactor('Platino III')).toBe(30);
  });

  it('retorna 24 para Diamante', () => {
    expect(getKFactor('Diamante I')).toBe(24);
    expect(getKFactor('Diamante III')).toBe(24);
  });

  it('retorna 20 para SMASHer', () => {
    expect(getKFactor('SMASHer')).toBe(20);
  });

  it('retorna 40 por defecto si el rank es null/inválido', () => {
    expect(getKFactor(null)).toBe(40);
    expect(getKFactor(undefined)).toBe(40);
  });
});

// ═══════════════════════════════════════════════════════════════════
// calculateExpectedOutcome
// ═══════════════════════════════════════════════════════════════════
describe('calculateExpectedOutcome', () => {
  it('0.5 cuando MMR idéntico', () => {
    expect(calculateExpectedOutcome(1200, 1200)).toBeCloseTo(0.5, 5);
  });

  it('> 0.5 cuando jugador tiene mayor MMR', () => {
    expect(calculateExpectedOutcome(1400, 1200)).toBeGreaterThan(0.5);
  });

  it('< 0.5 cuando jugador tiene menor MMR', () => {
    expect(calculateExpectedOutcome(1000, 1200)).toBeLessThan(0.5);
  });

  it('~0.76 con 200 puntos de ventaja', () => {
    const e = calculateExpectedOutcome(1400, 1200);
    expect(e).toBeCloseTo(0.76, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// calculateMMRDelta
// ═══════════════════════════════════════════════════════════════════
describe('calculateMMRDelta', () => {
  it('victoria con MMR igual → gana ~K/2', () => {
    const delta = calculateMMRDelta(1200, 1200, 1, 40);
    expect(delta).toBe(20); // K * (1 - 0.5) = 20
  });

  it('derrota con MMR igual → pierde ~K/2', () => {
    const delta = calculateMMRDelta(1200, 1200, 0, 40);
    expect(delta).toBe(-20);
  });

  it('upset victory da más MMR', () => {
    const delta = calculateMMRDelta(1000, 1400, 1, 40);
    expect(delta).toBeGreaterThan(20);
  });

  it('favorito victory da menos MMR', () => {
    const delta = calculateMMRDelta(1400, 1000, 1, 40);
    expect(delta).toBeLessThan(20);
  });

  it('K más alto = mayor cambio', () => {
    const d40 = calculateMMRDelta(1200, 1200, 1, 40);
    const d80 = calculateMMRDelta(1200, 1200, 1, 80);
    expect(d80).toBe(d40 * 2);
  });

  it('nunca retorna 0 (mínimo absoluto 1 o -1)', () => {
    // Con K muy bajo y MMR casi idénticos, verificamos mínimo 1
    const delta = calculateMMRDelta(1200, 1201, 1, 1);
    expect(Math.abs(delta)).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// calculateRRDelta
// ═══════════════════════════════════════════════════════════════════
describe('calculateRRDelta', () => {
  it('victoria contra igual → base 20 RR', () => {
    expect(calculateRRDelta(1200, 1200, 1)).toBe(20);
  });

  it('derrota contra igual → base 15 RR', () => {
    expect(calculateRRDelta(1200, 1200, 0)).toBe(15);
  });

  it('upset: ganar a alguien +300 MMR → bonus (> 20)', () => {
    const rr = calculateRRDelta(1000, 1300, 1);
    expect(rr).toBeGreaterThan(20);
  });

  it('upset bonus capped a 12', () => {
    const rr = calculateRRDelta(1000, 2000, 1);
    // BASE_RR_WIN + 12 = 32, pero verifiquemos que no pasa de ahí
    expect(rr).toBeLessThanOrEqual(32);
  });

  it('susto: ganar a alguien -300 MMR → menos RR', () => {
    const rr = calculateRRDelta(1500, 1200, 1);
    expect(rr).toBeLessThan(20);
  });

  it('nunca baja del MIN_RR_WIN (5) en victoria', () => {
    const rr = calculateRRDelta(3000, 500, 1);
    expect(rr).toBeGreaterThanOrEqual(5);
  });

  it('favorito loss: perder contra alguien -300 → más castigo (> 15)', () => {
    const rr = calculateRRDelta(1500, 1200, 0);
    expect(rr).toBeGreaterThan(15);
  });

  it('nunca baja del MIN_RR_LOSS (8) en derrota', () => {
    const rr = calculateRRDelta(1200, 1200, 0);
    expect(rr).toBeGreaterThanOrEqual(8);
  });
});

// ═══════════════════════════════════════════════════════════════════
// checkRankPromotion
// ═══════════════════════════════════════════════════════════════════
describe('checkRankPromotion', () => {
  it('asciende de subdivisión cuando RR >= 100', () => {
    const stats = makeStats({ rank: 'Bronce I', rankIndex: 12, rankPoints: 105 });
    const result = checkRankPromotion(stats);
    expect(result.promoted).toBe(true);
    expect(stats.rank).toBe('Bronce II');
    expect(stats.rankIndex).toBe(13);
    expect(stats.rankPoints).toBe(0);
    expect(stats.promotionShield).toBe(2);
  });

  it('asciende de tier (Bronce IV → Plata I)', () => {
    const stats = makeStats({ rank: 'Bronce IV', rankIndex: 15, rankPoints: 100 });
    const result = checkRankPromotion(stats);
    expect(result.promoted).toBe(true);
    expect(stats.rank).toBe('Plata I');
    expect(stats.rankIndex).toBe(16);
  });

  it('desciende de subdivisión cuando RR < 0 sin shield', () => {
    const stats = makeStats({ rank: 'Bronce II', rankIndex: 13, rankPoints: -5, promotionShield: 0 });
    const result = checkRankPromotion(stats);
    expect(result.demoted).toBe(true);
    expect(stats.rank).toBe('Bronce I');
    expect(stats.rankPoints).toBe(75); // misma tier → 75
  });

  it('desciende de tier (Plata I → Bronce IV) con RR 50', () => {
    const stats = makeStats({ rank: 'Plata I', rankIndex: 16, rankPoints: -5, promotionShield: 0 });
    const result = checkRankPromotion(stats);
    expect(result.demoted).toBe(true);
    expect(stats.rank).toBe('Bronce IV');
    expect(stats.rankPoints).toBe(50); // cambio de tier → 50
  });

  it('Plástico I es piso absoluto: no puede descender', () => {
    const stats = makeStats({ rank: 'Plástico I', rankIndex: 0, rankPoints: -10, promotionShield: 0 });
    const result = checkRankPromotion(stats);
    expect(result.demoted).toBe(false);
    expect(stats.rankIndex).toBe(0);
    expect(stats.rankPoints).toBe(0);
  });

  it('shield activo protege del descenso', () => {
    const stats = makeStats({ rank: 'Plata I', rankIndex: 16, rankPoints: -5, promotionShield: 1 });
    const result = checkRankPromotion(stats);
    expect(result.demoted).toBe(false);
    expect(stats.rankPoints).toBe(0); // se clampea a 0
    expect(stats.rankIndex).toBe(16); // se queda
  });

  it('SMASHer no tiene promoción/descenso aquí', () => {
    const stats = makeStats({ rank: 'SMASHer', rankIndex: 28, rankPoints: -50 });
    const result = checkRankPromotion(stats);
    expect(result.promoted).toBe(false);
    expect(result.demoted).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// processMatchResult
// ═══════════════════════════════════════════════════════════════════
describe('processMatchResult', () => {
  it('actualiza wins/losses correctamente', () => {
    const w = makeStats({ wins: 10, losses: 5, winStreak: 2 });
    const l = makeStats({ userId: 'loser', wins: 8, losses: 3, winStreak: 4 });
    processMatchResult(w, l);
    expect(w.wins).toBe(11);
    expect(w.winStreak).toBe(3);
    expect(l.losses).toBe(4);
    expect(l.winStreak).toBe(0);
  });

  it('ambos jugadores cambian MMR en direcciones opuestas', () => {
    const w = makeStats({ mmr: 1200 });
    const l = makeStats({ userId: 'loser', mmr: 1200 });
    const res = processMatchResult(w, l);
    expect(res.winner.mmrDelta).toBeGreaterThan(0);
    expect(res.loser.mmrDelta).toBeLessThan(0);
    expect(w.mmr).toBeGreaterThan(1200);
    expect(l.mmr).toBeLessThan(1200);
  });

  it('placement: completa placements tras 10 partidas', () => {
    const w = makeStats({
      wins: 5, losses: 4, placementDone: false, placementWins: 5,
      rank: 'Plástico I', rankIndex: 0, rankPoints: 0, mmr: 1300,
    });
    const l = makeStats({ userId: 'loser', mmr: 1200 });
    const res = processMatchResult(w, l);
    expect(w.placementDone).toBe(true);
    expect(res.winner.placementJustDone).toBe(true);
    // Con MMR ~1300+delta debería quedar en Bronce I range
    expect(w.rankIndex).toBeGreaterThan(0);
  });

  it('during placement no cambia RR', () => {
    const w = makeStats({
      wins: 3, losses: 2, placementDone: false, placementWins: 3,
      rank: 'Plástico I', rankIndex: 0, rankPoints: 0, mmr: 1000,
    });
    const l = makeStats({ userId: 'loser', mmr: 1000, placementDone: true });
    const res = processMatchResult(w, l);
    expect(res.winner.rrDelta).toBe(0);
    expect(w.rankPoints).toBe(0);
  });

  it('post-placement calcula RR para ambos jugadores', () => {
    const w = makeStats({ mmr: 1200, rankPoints: 40 });
    const l = makeStats({ userId: 'loser', mmr: 1200, rankPoints: 50 });
    const res = processMatchResult(w, l);
    expect(res.winner.rrDelta).toBeGreaterThan(0);
    expect(res.loser.rrDelta).toBeLessThan(0);
  });

  it('decrementa promotionShield', () => {
    const w = makeStats({ promotionShield: 2 });
    const l = makeStats({ userId: 'loser', promotionShield: 1 });
    processMatchResult(w, l);
    expect(w.promotionShield).toBe(1);
    expect(l.promotionShield).toBe(0);
  });

  it('upset: winner con menos MMR gana más RR', () => {
    const w = makeStats({ mmr: 1000, rankPoints: 40, rank: 'Hierro I', rankIndex: 8 });
    const l = makeStats({ userId: 'loser', mmr: 1400, rankPoints: 50, rank: 'Plata I', rankIndex: 16 });
    const res = processMatchResult(w, l);
    // RR delta de upset > 20 (base)
    expect(res.winner.rrDelta).toBeGreaterThan(20);
  });

  it('retorna mmrBefore/mmrAfter correctos', () => {
    const w = makeStats({ mmr: 1300 });
    const l = makeStats({ userId: 'loser', mmr: 1100 });
    const res = processMatchResult(w, l);
    expect(res.winner.mmrBefore).toBe(1300);
    expect(res.loser.mmrBefore).toBe(1100);
    expect(res.winner.mmrAfter).toBe(w.mmr);
    expect(res.loser.mmrAfter).toBe(l.mmr);
  });

  it('MMR nunca baja de 0', () => {
    const w = makeStats({ mmr: 3000 });
    const l = makeStats({ userId: 'loser', mmr: 5 });
    processMatchResult(w, l);
    expect(l.mmr).toBeGreaterThanOrEqual(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// assignPlacementRank
// ═══════════════════════════════════════════════════════════════════
describe('assignPlacementRank', () => {
  it('MMR 300 → Plástico I', () => {
    expect(assignPlacementRank(300).name).toBe('Plástico I');
  });

  it('MMR 500 → Madera I', () => {
    expect(assignPlacementRank(500).name).toBe('Madera I');
  });

  it('MMR 1200 → Bronce I', () => {
    expect(assignPlacementRank(1200).name).toBe('Bronce I');
  });

  it('MMR 2000 → Oro I', () => {
    expect(assignPlacementRank(2000).name).toBe('Oro I');
  });

  it('MMR 3200+ → SMASHer', () => {
    expect(assignPlacementRank(3500).name).toBe('SMASHer');
  });

  it('MMR 0 → Plástico I', () => {
    expect(assignPlacementRank(0).name).toBe('Plástico I');
  });
});

// ═══════════════════════════════════════════════════════════════════
// isInPlacement
// ═══════════════════════════════════════════════════════════════════
describe('isInPlacement', () => {
  it('true si placementDone es false y total < 10', () => {
    expect(isInPlacement({ placementDone: false, wins: 3, losses: 2 })).toBe(true);
  });

  it('false si placementDone es true', () => {
    expect(isInPlacement({ placementDone: true, wins: 3, losses: 2 })).toBe(false);
  });

  it('false si total >= 10', () => {
    expect(isInPlacement({ placementDone: false, wins: 6, losses: 4 })).toBe(false);
  });

  it('false si stats es null', () => {
    expect(isInPlacement(null)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// leaderboardScore
// ═══════════════════════════════════════════════════════════════════
describe('leaderboardScore', () => {
  it('jugador rankeado: 1000 + rankIndex * RANK_MAX + rankPoints', () => {
    expect(leaderboardScore({ placementDone: true, rankIndex: 12, rankPoints: 50 })).toBe(1000 + 12 * 100 + 50);
  });

  it('SMASHer tiene score máximo entre rankeados', () => {
    const s = leaderboardScore({ placementDone: true, rankIndex: 28, rankPoints: 0 });
    expect(s).toBe(1000 + 2800);
  });

  it('unranked siempre debajo de cualquier rankeado', () => {
    const unranked = leaderboardScore({ placementDone: false, wins: 9 });
    const worst = leaderboardScore({ placementDone: true, rankIndex: 0, rankPoints: 0 });
    expect(unranked).toBeLessThan(worst);
  });

  it('unranked ordenado por victorias', () => {
    const u5 = leaderboardScore({ placementDone: false, wins: 5 });
    const u9 = leaderboardScore({ placementDone: false, wins: 9 });
    expect(u9).toBeGreaterThan(u5);
  });

  it('handles missing values en jugador rankeado', () => {
    expect(leaderboardScore({ placementDone: true })).toBe(1000);
  });
});

// ═══════════════════════════════════════════════════════════════════
// getRankIndex / getRankObj
// ═══════════════════════════════════════════════════════════════════
describe('getRankIndex & getRankObj', () => {
  it('Plástico I → 0', () => {
    expect(getRankIndex('Plástico I')).toBe(0);
  });

  it('SMASHer → 28', () => {
    expect(getRankIndex('SMASHer')).toBe(28);
  });

  it('nombre inválido → 0', () => {
    expect(getRankIndex('NoExiste')).toBe(0);
  });

  it('getRankObj devuelve objeto con tier', () => {
    const obj = getRankObj('Oro II');
    expect(obj.tier).toBe('Oro');
    expect(obj.subdivision).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════
// getConvergenceMultiplier
// ═══════════════════════════════════════════════════════════════════
describe('getConvergenceMultiplier', () => {
  it('en su rango exacto → 1.0 (Bronce I con MMR 1200)', () => {
    // Bronce I = índice 12, RANK_MMR_THRESHOLDS[12] = 1200
    expect(getConvergenceMultiplier(12, 1200)).toBe(1.00);
  });

  it('2 rangos por debajo del esperado → 1.20', () => {
    // Hierro I (índice 8), MMR 1000 → expectedIdx = 10 (Hierro III), gap = 2
    expect(getConvergenceMultiplier(8, 1000)).toBe(1.20);
  });

  it('6+ rangos por debajo del esperado → 1.50', () => {
    // Plástico I (índice 0), MMR 1200 → expectedIdx = 12 (Bronce I), gap = 12
    expect(getConvergenceMultiplier(0, 1200)).toBe(1.50);
  });

  it('2 rangos por encima del esperado → 0.90', () => {
    // Bronce III (índice 14), MMR 1200 → expectedIdx = 12, gap = -2
    expect(getConvergenceMultiplier(14, 1200)).toBe(0.90);
  });

  it('4+ rangos por encima del esperado → 0.75', () => {
    // Plata I (índice 16), MMR 1200 → expectedIdx = 12, gap = -4
    expect(getConvergenceMultiplier(16, 1200)).toBe(0.75);
  });

  it('multiplicador de victoria es mayor cuando estás por debajo del rango esperado', () => {
    const bajoPosicionado = getConvergenceMultiplier(8, 2000);  // debería estar en Oro
    const enSuRango      = getConvergenceMultiplier(19, 2000); // Oro I con MMR Oro
    expect(bajoPosicionado).toBeGreaterThan(enSuRango);
  });
});
