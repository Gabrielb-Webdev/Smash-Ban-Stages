// POST /api/tickets/[ticketId]/resolve
// Resuelve un ticket: cambia ganador, cambia stocks, elimina match, o rechaza.
// Solo disponible para admin/soporte.
//
// Body: {
//   action: 'change_winner' | 'change_stocks' | 'delete_match' | 'reject',
//   newStocks?: number  (solo para change_stocks: 1|2|3),
//   note?: string       (nota opcional interna)
// }

import redis, {
  ticketKey, ticketsOpenKey, matchHistoryKey,
  rankedStatsKey, rankedBoardKey, charStatsKey, charBoardKey,
  smasherBoardKey, smasherPoolKey,
} from '../../../../lib/redis';
import { getTicketUser, canManageTickets } from '../../../../lib/ticketAuth';
import { processMatchResult, leaderboardScore, getRankIndex, RANKS, PLACEMENT_MATCHES, MMR_DEFAULT } from '../../../../lib/ranks';

const SMASHER_IDX = RANKS.length - 1;

// ─── Reversar un match ya aplicado ──────────────────────────────────────────
// Restaura stats de ambos jugadores al estado pre-match usando los datos
// almacenados en el matchEntry.
async function reverseMatch(matchEntry) {
  const {
    matchId, platform,
    winnerId, loserId,
    winnerName, loserName,
    mmrWinnerBefore, mmrLoserBefore,
    rpDelta, loserRpDelta,
    winnerRankBefore,      winnerRankPointsBefore,
    loserRankBefore,       loserRankPointsBefore,
    winnerCharId, loserCharId,
    isPlacementWinner, isPlacementLoser,
  } = matchEntry;

  const wKey = rankedStatsKey(String(winnerId), platform);
  const lKey = rankedStatsKey(String(loserId), platform);
  const [wStats, lStats] = await Promise.all([redis.get(wKey), redis.get(lKey)]);
  if (!wStats || !lStats) throw new Error('Stats de jugadores no encontradas');

  // ── Restaurar winner ──
  wStats.mmr    = mmrWinnerBefore ?? wStats.mmr;
  wStats.wins   = Math.max(0, (wStats.wins || 0) - 1);
  wStats.winStreak = Math.max(0, (wStats.winStreak || 1) - 1);

  if (winnerRankBefore !== undefined) {
    // Reversión exacta (match nuevo con campos extra)
    wStats.rank        = winnerRankBefore;
    wStats.rankIndex   = getRankIndex(winnerRankBefore);
    wStats.rankPoints  = winnerRankPointsBefore ?? 0;
  } else {
    // Fallback aproximado: descontar rpDelta
    wStats.rankPoints = Math.max(0, (wStats.rankPoints || 0) - (rpDelta || 0));
  }

  if (isPlacementWinner) {
    wStats.placementWins = Math.max(0, (wStats.placementWins || 0) - 1);
    const totalGames = (wStats.wins || 0) + (wStats.losses || 0);
    if (totalGames < PLACEMENT_MATCHES) wStats.placementDone = false;
  }

  // ── Restaurar loser ──
  lStats.mmr     = mmrLoserBefore ?? lStats.mmr;
  lStats.losses  = Math.max(0, (lStats.losses || 0) - 1);

  if (loserRankBefore !== undefined) {
    lStats.rank       = loserRankBefore;
    lStats.rankIndex  = getRankIndex(loserRankBefore);
    lStats.rankPoints = loserRankPointsBefore ?? 0;
  } else {
    lStats.rankPoints = Math.max(0, (lStats.rankPoints || 0) + Math.abs(loserRpDelta || 0));
  }

  if (isPlacementLoser) {
    const totalGames = (lStats.wins || 0) + (lStats.losses || 0);
    if (totalGames < PLACEMENT_MATCHES) lStats.placementDone = false;
  }

  // ── Guardar stats ──
  await Promise.all([redis.set(wKey, wStats), redis.set(lKey, lStats)]);

  // ── Actualizar leaderboards ──
  await Promise.all([
    redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(wStats), member: String(winnerId) }),
    redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(lStats), member: String(loserId) }),
  ]);

  // SMASHer board
  const updateSmasher = async (stats, uid) => {
    if (stats.rankIndex === SMASHER_IDX) {
      await redis.zadd(smasherBoardKey(platform), { score: stats.mmr, member: String(uid) });
    } else {
      await redis.zrem(smasherBoardKey(platform), String(uid)).catch(() => {});
    }
    await redis.zadd(smasherPoolKey(platform), { score: stats.mmr, member: String(uid) });
  };
  await Promise.all([updateSmasher(wStats, winnerId), updateSmasher(lStats, loserId)]);

  // ── Char stats: deshacer win del winner y loss del loser ──
  if (winnerCharId) {
    const wcKey = charStatsKey(String(winnerId), platform, winnerCharId);
    const wcStats = await redis.get(wcKey);
    if (wcStats) {
      wcStats.wins = Math.max(0, (wcStats.wins || 0) - 1);
      await redis.set(wcKey, wcStats);
      await redis.zadd(charBoardKey(platform, winnerCharId), { score: wcStats.wins, member: String(winnerId) });
    }
  }
  if (loserCharId) {
    const lcKey = charStatsKey(String(loserId), platform, loserCharId);
    const lcStats = await redis.get(lcKey);
    if (lcStats) {
      lcStats.losses = Math.max(0, (lcStats.losses || 0) - 1);
      await redis.set(lcKey, lcStats);
    }
  }

  // ── Eliminar del historial de ambos jugadores ──
  await Promise.all([
    removeFromHistory(String(winnerId), String(matchId)),
    removeFromHistory(String(loserId), String(matchId)),
  ]);

  return { wStats, lStats };
}

async function removeFromHistory(userId, matchId) {
  const raw = await redis.lrange(matchHistoryKey(userId), 0, 49);
  const entries = raw.map(e => (typeof e === 'string' ? JSON.parse(e) : e));
  const filtered = entries.filter(e => String(e.matchId) !== String(matchId));
  if (filtered.length === entries.length) return; // no estaba
  await redis.del(matchHistoryKey(userId));
  if (filtered.length > 0) {
    // Re-insertar en orden (lpush invierte, así que insertamos al revés)
    for (let i = filtered.length - 1; i >= 0; i--) {
      await redis.lpush(matchHistoryKey(userId), filtered[i]);
    }
  }
}

// ─── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ticketId } = req.query;
  const tu = await getTicketUser(req);
  if (!tu) return res.status(401).json({ error: 'No autenticado' });
  if (!canManageTickets(tu)) return res.status(403).json({ error: 'Sin permiso' });

  const ticket = await redis.get(ticketKey(ticketId));
  if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });
  if (ticket.status === 'resolved' || ticket.status === 'rejected') {
    return res.status(400).json({ error: 'El ticket ya está cerrado' });
  }

  const { action, newStocks, note } = req.body || {};
  const validActions = ['change_winner', 'change_stocks', 'delete_match', 'reject'];
  if (!action || !validActions.includes(action)) {
    return res.status(400).json({ error: 'action inválido. Debe ser: ' + validActions.join(', ') });
  }

  const matchEntry = ticket.matchEntry;
  const now = new Date().toISOString();

  try {
    // ── REJECT: cerrar sin cambios ───────────────────────────────
    if (action === 'reject') {
      ticket.status = 'rejected';
      ticket.resolution = { action: 'reject', note: note || null, resolvedBy: tu.userId, resolvedByName: tu.name, resolvedAt: now };
      ticket.updatedAt = now;
      await redis.set(ticketKey(ticketId), ticket);
      await redis.lrem(ticketsOpenKey, 0, ticketId);
      await redis.lpush('tickets:closed', ticketId);
      return res.status(200).json({ ticket });
    }

    // ── DELETE_MATCH: revertir completamente ─────────────────────
    if (action === 'delete_match') {
      await reverseMatch(matchEntry);

      ticket.status     = 'resolved';
      ticket.resolution = { action: 'delete_match', note: note || null, resolvedBy: tu.userId, resolvedByName: tu.name, resolvedAt: now };
      ticket.updatedAt  = now;
      await redis.set(ticketKey(ticketId), ticket);
      await redis.lrem(ticketsOpenKey, 0, ticketId);
      await redis.lpush('tickets:closed', ticketId);
      return res.status(200).json({ ticket, message: 'Match eliminado y puntos revertidos' });
    }

    // ── CHANGE_WINNER: revertir + re-aplicar con ganador opuesto ─
    if (action === 'change_winner') {
      // 1. Revertir el match original
      await reverseMatch(matchEntry);

      // 2. Construir nuevo matchEntry con winner/loser intercambiados
      const platform   = matchEntry.platform;
      const newWinnerId   = String(matchEntry.loserId);
      const newLoserId    = String(matchEntry.winnerId);
      const newWinnerName = matchEntry.loserName;
      const newLoserName  = matchEntry.winnerName;
      const stocks     = matchEntry.stocksWon; // mantener stocks originales

      const wKey = rankedStatsKey(newWinnerId, platform);
      const lKey = rankedStatsKey(newLoserId, platform);
      const [wStats, lStats] = await Promise.all([redis.get(wKey), redis.get(lKey)]);
      if (!wStats || !lStats) throw new Error('Stats no encontradas para re-aplicar resultado');

      // Snapshots pre-re-aplicación
      const newWinnerRankBefore      = wStats.rank ?? 'Plástico I';
      const newWinnerRankPointsBefore = wStats.rankPoints ?? 0;
      const newLoserRankBefore       = lStats.rank ?? 'Plástico I';
      const newLoserRankPointsBefore  = lStats.rankPoints ?? 0;

      const result = processMatchResult(wStats, lStats, { stocksWon: stocks });
      await Promise.all([redis.set(wKey, wStats), redis.set(lKey, lStats)]);
      await Promise.all([
        redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(wStats), member: newWinnerId }),
        redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(lStats), member: newLoserId }),
      ]);

      const updateSmasher = async (stats, uid) => {
        if (stats.rankIndex === SMASHER_IDX) {
          await redis.zadd(smasherBoardKey(platform), { score: stats.mmr, member: String(uid) });
        } else {
          await redis.zrem(smasherBoardKey(platform), String(uid)).catch(() => {});
        }
        await redis.zadd(smasherPoolKey(platform), { score: stats.mmr, member: String(uid) });
      };
      await Promise.all([updateSmasher(wStats, newWinnerId), updateSmasher(lStats, newLoserId)]);

      // Char stats
      const newWinnerCharId = matchEntry.loserCharId;
      const newLoserCharId  = matchEntry.winnerCharId;
      if (newWinnerCharId) {
        const wcKey = charStatsKey(newWinnerId, platform, newWinnerCharId);
        const wcStats = (await redis.get(wcKey)) || { userId: newWinnerId, charId: newWinnerCharId, platform, wins: 0, losses: 0 };
        wcStats.wins = (wcStats.wins || 0) + 1;
        await redis.set(wcKey, wcStats);
        await redis.zadd(charBoardKey(platform, newWinnerCharId), { score: wcStats.wins, member: newWinnerId });
      }
      if (newLoserCharId) {
        const lcKey = charStatsKey(newLoserId, platform, newLoserCharId);
        const lcStats = (await redis.get(lcKey)) || { userId: newLoserId, charId: newLoserCharId, platform, wins: 0, losses: 0 };
        lcStats.losses = (lcStats.losses || 0) + 1;
        await redis.set(lcKey, lcStats);
      }

      // Nuevo matchEntry con datos corregidos
      const correctedEntry = {
        ...matchEntry,
        winnerId: newWinnerId, winnerName: newWinnerName,
        loserId: newLoserId,   loserName: newLoserName,
        winnerCharId: newWinnerCharId, loserCharId: newLoserCharId,
        winnerAltId: matchEntry.loserAltId, loserAltId: matchEntry.winnerAltId,
        rpDelta:       result.winner.rrDelta,
        loserRpDelta:  result.loser.rrDelta,
        mmrDelta:      result.winner.mmrDelta,
        mmrWinnerBefore: result.winner.mmrBefore, mmrWinnerAfter: result.winner.mmrAfter,
        mmrLoserBefore:  result.loser.mmrBefore,  mmrLoserAfter:  result.loser.mmrAfter,
        winnerRankBefore: newWinnerRankBefore, winnerRankPointsBefore: newWinnerRankPointsBefore,
        loserRankBefore:  newLoserRankBefore,  loserRankPointsBefore:  newLoserRankPointsBefore,
        winnerRankAfter: wStats.rank, loserRankAfter: lStats.rank,
        correctedAt: now, correctedBy: tu.userId,
      };
      await redis.lpush(matchHistoryKey(newWinnerId), correctedEntry);
      await redis.ltrim(matchHistoryKey(newWinnerId), 0, 49);
      await redis.lpush(matchHistoryKey(newLoserId), correctedEntry);
      await redis.ltrim(matchHistoryKey(newLoserId), 0, 49);

      ticket.matchEntry = correctedEntry;
      ticket.status     = 'resolved';
      ticket.resolution = { action: 'change_winner', newWinnerId, newWinnerName, note: note || null, resolvedBy: tu.userId, resolvedByName: tu.name, resolvedAt: now };
      ticket.updatedAt  = now;
      await redis.set(ticketKey(ticketId), ticket);
      await redis.lrem(ticketsOpenKey, 0, ticketId);
      await redis.lpush('tickets:closed', ticketId);
      return res.status(200).json({ ticket, message: 'Ganador cambiado y puntos recalculados' });
    }

    // ── CHANGE_STOCKS: revertir + re-aplicar con nuevos stocks ───
    if (action === 'change_stocks') {
      const stocks = Math.min(3, Math.max(1, parseInt(newStocks) || 1));
      if (stocks === matchEntry.stocksWon) {
        return res.status(400).json({ error: 'Los stocks nuevos son iguales a los actuales' });
      }

      await reverseMatch(matchEntry);

      const platform  = matchEntry.platform;
      const winnerId  = String(matchEntry.winnerId);
      const loserId   = String(matchEntry.loserId);
      const wKey = rankedStatsKey(winnerId, platform);
      const lKey = rankedStatsKey(loserId, platform);
      const [wStats, lStats] = await Promise.all([redis.get(wKey), redis.get(lKey)]);
      if (!wStats || !lStats) throw new Error('Stats no encontradas para re-aplicar resultado');

      const newWinnerRankBefore       = wStats.rank ?? 'Plástico I';
      const newWinnerRankPointsBefore = wStats.rankPoints ?? 0;
      const newLoserRankBefore        = lStats.rank ?? 'Plástico I';
      const newLoserRankPointsBefore  = lStats.rankPoints ?? 0;

      const result = processMatchResult(wStats, lStats, { stocksWon: stocks });
      await Promise.all([redis.set(wKey, wStats), redis.set(lKey, lStats)]);
      await Promise.all([
        redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(wStats), member: winnerId }),
        redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(lStats), member: loserId }),
      ]);

      const updateSmasher = async (stats, uid) => {
        if (stats.rankIndex === SMASHER_IDX) {
          await redis.zadd(smasherBoardKey(platform), { score: stats.mmr, member: String(uid) });
        } else {
          await redis.zrem(smasherBoardKey(platform), String(uid)).catch(() => {});
        }
        await redis.zadd(smasherPoolKey(platform), { score: stats.mmr, member: String(uid) });
      };
      await Promise.all([updateSmasher(wStats, winnerId), updateSmasher(lStats, loserId)]);

      // Char stats
      if (matchEntry.winnerCharId) {
        const wcKey = charStatsKey(winnerId, platform, matchEntry.winnerCharId);
        const wcStats = (await redis.get(wcKey)) || { wins: 0, losses: 0 };
        wcStats.wins = (wcStats.wins || 0) + 1;
        await redis.set(wcKey, wcStats);
        await redis.zadd(charBoardKey(platform, matchEntry.winnerCharId), { score: wcStats.wins, member: winnerId });
      }
      if (matchEntry.loserCharId) {
        const lcKey = charStatsKey(loserId, platform, matchEntry.loserCharId);
        const lcStats = (await redis.get(lcKey)) || { wins: 0, losses: 0 };
        lcStats.losses = (lcStats.losses || 0) + 1;
        await redis.set(lcKey, lcStats);
      }

      const correctedEntry = {
        ...matchEntry,
        stocksWon: stocks,
        rpDelta:      result.winner.rrDelta,
        loserRpDelta: result.loser.rrDelta,
        mmrDelta:     result.winner.mmrDelta,
        mmrWinnerBefore: result.winner.mmrBefore, mmrWinnerAfter: result.winner.mmrAfter,
        mmrLoserBefore:  result.loser.mmrBefore,  mmrLoserAfter:  result.loser.mmrAfter,
        winnerRankBefore: newWinnerRankBefore, winnerRankPointsBefore: newWinnerRankPointsBefore,
        loserRankBefore:  newLoserRankBefore,  loserRankPointsBefore:  newLoserRankPointsBefore,
        winnerRankAfter: wStats.rank, loserRankAfter: lStats.rank,
        correctedAt: now, correctedBy: tu.userId,
      };
      await redis.lpush(matchHistoryKey(winnerId), correctedEntry);
      await redis.ltrim(matchHistoryKey(winnerId), 0, 49);
      await redis.lpush(matchHistoryKey(loserId), correctedEntry);
      await redis.ltrim(matchHistoryKey(loserId), 0, 49);

      ticket.matchEntry = correctedEntry;
      ticket.status     = 'resolved';
      ticket.resolution = { action: 'change_stocks', oldStocks: matchEntry.stocksWon, newStocks: stocks, note: note || null, resolvedBy: tu.userId, resolvedByName: tu.name, resolvedAt: now };
      ticket.updatedAt  = now;
      await redis.set(ticketKey(ticketId), ticket);
      await redis.lrem(ticketsOpenKey, 0, ticketId);
      await redis.lpush('tickets:closed', ticketId);
      return res.status(200).json({ ticket, message: `Stocks corregidos de ${matchEntry.stocksWon} a ${stocks}` });
    }
  } catch (err) {
    console.error('[resolve ticket]', err);
    return res.status(500).json({ error: 'Error al resolver el ticket', detail: err.message });
  }

  return res.status(400).json({ error: 'Acción no manejada' });
}
