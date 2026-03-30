/**
 * Sistema de puntos para rankings comunitarios (AFK 2025, INC, etc.)
 *
 * Tabla de puntos:
 * Pos  | Mensual | Semanal
 * -----+---------+--------
 *  1   | 1000    | 350
 *  2   |  600    | 200
 *  3   |  450    | 150
 *  4   |  360    | 120
 * 5-6  |  270    |  90
 * 7-8  |  180    |  60
 * 9-12 |   90    |  30
 *13-32 |   45    |  15
 *33-64 |   25    |  10
 *
 * Bonificación (desde 1/5/2025):
 *  - Vencer a Top 8: +60 (Mensual) / +45 (Semanal)
 *  - Los Top 8 NO reciben bonificación por vencer a otros Top 8
 */

const MONTHLY = { 1: 1000, 2: 600, 3: 450, 4: 360, 5: 270, 6: 270, 7: 180, 8: 180 };
const WEEKLY  = { 1: 350,  2: 200, 3: 150, 4: 120, 5: 90,  6: 90,  7: 60,  8: 60  };

/**
 * Calcula los puntos de base según la posición y el tipo de torneo.
 * @param {number} placement  Posición del jugador (1-based)
 * @param {'M'|'S'} type      Mensual (M) o Semanal (S)
 * @returns {number}
 */
export function getPositionPoints(placement, type) {
  const tbl = type === 'M' ? MONTHLY : WEEKLY;
  if (tbl[placement] !== undefined) return tbl[placement];
  if (placement >= 9  && placement <= 12) return type === 'M' ? 90  : 30;
  if (placement >= 13 && placement <= 32) return type === 'M' ? 45  : 15;
  if (placement >= 33 && placement <= 64) return type === 'M' ? 25  : 10;
  return 0;
}

/** Puntos de bonificación por vencer a un Top 8 */
export const BONUS_PTS = { M: 60, S: 45 };

/** Mínimo de participantes para que el torneo cuente */
export const MIN_ATTENDEES = 16;

/**
 * Recalcula el ranked completo a partir de una lista de torneos guardados.
 * Retorna un array ordenado por puntos descendente.
 * @param {Array} tournaments  Lista de torneos con standings
 * @returns {Array<{position,name,total,breakdown}>}
 */
export function buildRanking(tournaments) {
  const map = {}; // playerName → { total, breakdown }
  for (const t of tournaments) {
    for (const s of (t.standings || [])) {
      const name = s.playerName;
      if (!map[name]) map[name] = { total: 0, breakdown: {} };
      const pts = (s.basePoints || 0) + (s.bonusPoints || 0);
      map[name].total += pts;
      map[name].breakdown[t.id] = {
        name: t.name,
        type: t.type,
        placement: s.placement,
        base: s.basePoints || 0,
        bonus: s.bonusPoints || 0,
        total: pts,
      };
    }
  }
  return Object.entries(map)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .map((p, i) => ({ ...p, position: i + 1 }));
}
