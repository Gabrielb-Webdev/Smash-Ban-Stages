import redis, {
  offlineSessionKey, offlineMatchesKey, offlineResultKey,
  rankedStatsKey, rankedBoardKey, matchHistoryKey,
  charStatsKey, charBoardKey, rankHistoryKey,
  smasherBoardKey, smasherPoolKey,
} from '../../../lib/redis';
import { tryAutoAssign } from '../../../lib/offlineAutoAssign';
import {
  processMatchResult, leaderboardScore, getRankIndex,
  MMR_DEFAULT, RANKS,
} from '../../../lib/ranks';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'afk-admin-2025';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();
  if (auth !== ADMIN_SECRET) return res.status(401).json({ error: 'No autorizado' });

  const { matchId, winnerId, stocksWon } = req.body || {};
  if (!matchId || !winnerId) return res.status(400).json({ error: 'matchId y winnerId son requeridos' });

  const cleanMatchId  = sanitize(matchId);
  const cleanWinnerId = sanitize(winnerId);
  const finalStocks   = Math.min(3, Math.max(1, parseInt(stocksWon) || 1));

  const matches    = (await redis.get(offlineMatchesKey())) || [];
  const matchIndex = matches.findIndex(m => m.matchId === cleanMatchId);
  if (matchIndex === -1) return res.status(404).json({ error: 'Match no encontrado' });

  const match = matches[matchIndex];
  if (match.status !== 'active') {
    return res.status(400).json({ error: 'El match ya fue reportado' });
  }

  const validWinners = [match.player1.userId, match.player2.userId];
  if (!validWinners.includes(cleanWinnerId)) {
    return res.status(400).json({ error: 'El ganador no es jugador de este match' });
  }

  const loserId      = match.player1.userId === cleanWinnerId ? match.player2.userId : match.player1.userId;
  const winnerName   = match.player1.userId === cleanWinnerId ? match.player1.userName : match.player2.userName;
  const loserName    = match.player1.userId === loserId ? match.player1.userName : match.player2.userName;
  const winnerCharId = match.player1.userId === cleanWinnerId ? match.player1.charId : match.player2.charId;
  const loserCharId  = match.player1.userId === loserId ? match.player1.charId : match.player2.charId;
  const winnerAltId  = match.player1.userId === cleanWinnerId ? match.player1.charAlt : match.player2.charAlt;
  const loserAltId   = match.player1.userId === loserId ? match.player1.charAlt : match.player2.charAlt;
  const platform     = 'switch';

  // Cargar stats actuales de ambos jugadores
  const wKey = rankedStatsKey(String(cleanWinnerId), platform);
  const lKey = rankedStatsKey(String(loserId), platform);

  const wStats = (await redis.get(wKey)) || {
    userId: cleanWinnerId, userName: winnerName, platform,
    wins: 0, losses: 0, rank: 'Plástico I', rankIndex: 0, rankPoints: 0,
    mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0, placementDone: false, placementWins: 0, promotionShield: 0,
  };
  wStats.userName  = winnerName;
  wStats.mmr       = wStats.mmr || MMR_DEFAULT;
  wStats.rankIndex = wStats.rankIndex ?? getRankIndex(wStats.rank);

  const lStats = (await redis.get(lKey)) || {
    userId: loserId, userName: loserName, platform,
    wins: 0, losses: 0, rank: 'Plástico I', rankIndex: 0, rankPoints: 0,
    mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0, placementDone: false, placementWins: 0, promotionShield: 0,
  };
  lStats.userName  = loserName;
  lStats.mmr       = lStats.mmr || MMR_DEFAULT;
  lStats.rankIndex = lStats.rankIndex ?? getRankIndex(lStats.rank);

  const winnerRankBefore       = wStats.rank ?? 'Plástico I';
  const winnerRankPointsBefore = wStats.rankPoints ?? 0;
  const loserRankBefore        = lStats.rank ?? 'Plástico I';
  const loserRankPointsBefore  = lStats.rankPoints ?? 0;

  // Actualizar conteo de personajes
  if (winnerCharId) {
    if (!wStats.charCounts) wStats.charCounts = {};
    wStats.charCounts[String(winnerCharId)] = (wStats.charCounts[String(winnerCharId)] || 0) + 1;
  }
  if (loserCharId) {
    if (!lStats.charCounts) lStats.charCounts = {};
    lStats.charCounts[String(loserCharId)] = (lStats.charCounts[String(loserCharId)] || 0) + 1;
  }

  // Procesar resultado — muta wStats y lStats in-place
  const result = processMatchResult(wStats, lStats, { stocksWon: finalStocks });

  // Actualizar último rival offline (anti-rematch)
  if (wStats.lastOfflineOpponentId === loserId) {
    wStats.lastOfflineOpponentStreak = (wStats.lastOfflineOpponentStreak || 1) + 1;
  } else {
    wStats.lastOfflineOpponentId     = loserId;
    wStats.lastOfflineOpponentStreak = 1;
  }
  if (lStats.lastOfflineOpponentId === cleanWinnerId) {
    lStats.lastOfflineOpponentStreak = (lStats.lastOfflineOpponentStreak || 1) + 1;
  } else {
    lStats.lastOfflineOpponentId     = cleanWinnerId;
    lStats.lastOfflineOpponentStreak = 1;
  }

  // Guardar stats actualizados
  await redis.set(wKey, wStats);
  await redis.set(lKey, lStats);

  // Leaderboard principal
  await redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(wStats), member: String(cleanWinnerId) });
  await redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(lStats), member: String(loserId) });

  // SMASHer leaderboard
  const SMASHER_INDEX = RANKS.length - 1;
  if (wStats.rankIndex === SMASHER_INDEX) {
    await redis.zadd(smasherBoardKey(platform), { score: wStats.mmr, member: String(cleanWinnerId) });
  } else {
    await redis.zrem(smasherBoardKey(platform), String(cleanWinnerId)).catch(() => {});
  }
  if (lStats.rankIndex === SMASHER_INDEX) {
    await redis.zadd(smasherBoardKey(platform), { score: lStats.mmr, member: String(loserId) });
  } else {
    await redis.zrem(smasherBoardKey(platform), String(loserId)).catch(() => {});
  }
  await redis.zadd(smasherPoolKey(platform), { score: wStats.mmr, member: String(cleanWinnerId) });
  await redis.zadd(smasherPoolKey(platform), { score: lStats.mmr, member: String(loserId) });
  await redis.expire(smasherPoolKey(platform), 30 * 24 * 60 * 60);

  // Rank history
  if (result.winner.rankChange.promoted || result.winner.rankChange.demoted || result.winner.placementJustDone) {
    await redis.lpush(rankHistoryKey(String(cleanWinnerId)), {
      rankBefore: result.winner.oldRank, subdivisionBefore: result.winner.oldSubdivision,
      rankAfter: wStats.rank, subdivisionAfter: RANKS[wStats.rankIndex]?.subdivision ?? null,
      reason: result.winner.placementJustDone ? 'PLACEMENT' : 'WIN',
      createdAt: new Date().toISOString(),
    });
    await redis.ltrim(rankHistoryKey(String(cleanWinnerId)), 0, 99);
  }
  if (result.loser.rankChange.promoted || result.loser.rankChange.demoted || result.loser.placementJustDone) {
    await redis.lpush(rankHistoryKey(String(loserId)), {
      rankBefore: result.loser.oldRank, subdivisionBefore: result.loser.oldSubdivision,
      rankAfter: lStats.rank, subdivisionAfter: RANKS[lStats.rankIndex]?.subdivision ?? null,
      reason: result.loser.placementJustDone ? 'PLACEMENT' : 'LOSS',
      createdAt: new Date().toISOString(),
    });
    await redis.ltrim(rankHistoryKey(String(loserId)), 0, 99);
  }

  // Match history (aparece en historial de cada jugador)
  const matchEntry = {
    matchId: cleanMatchId, platform, winnerId: cleanWinnerId, loserId, winnerName, loserName,
    winnerCharId, loserCharId, winnerAltId, loserAltId,
    stocksWon: finalStocks, offline: true,
    rpDelta: result.winner.rrDelta, loserRpDelta: result.loser.rrDelta,
    mmrDelta: result.winner.mmrDelta,
    winnerRankBefore, winnerRankPointsBefore, loserRankBefore, loserRankPointsBefore,
    winnerRankAfter: wStats.rank, loserRankAfter: lStats.rank,
    isPlacementWinner: !wStats.placementDone && ((wStats.wins || 0) + (wStats.losses || 0)) <= 5,
    isPlacementLoser:  !lStats.placementDone && ((lStats.wins || 0) + (lStats.losses || 0)) <= 5,
    playedAt: new Date().toISOString(),
  };
  await redis.lpush(matchHistoryKey(String(cleanWinnerId)), matchEntry);
  await redis.ltrim(matchHistoryKey(String(cleanWinnerId)), 0, 49);
  await redis.lpush(matchHistoryKey(String(loserId)), matchEntry);
  await redis.ltrim(matchHistoryKey(String(loserId)), 0, 49);

  // Stats por personaje
  if (winnerCharId) {
    const wcKey   = charStatsKey(String(cleanWinnerId), platform, winnerCharId);
    const wcStats = (await redis.get(wcKey)) || { userId: cleanWinnerId, userName: winnerName, charId: winnerCharId, platform, wins: 0, losses: 0 };
    wcStats.userName = winnerName;
    wcStats.wins = (wcStats.wins || 0) + 1;
    await redis.set(wcKey, wcStats);
    await redis.zadd(charBoardKey(platform, winnerCharId), { score: wcStats.wins, member: String(cleanWinnerId) });
  }
  if (loserCharId) {
    const lcKey   = charStatsKey(String(loserId), platform, loserCharId);
    const lcStats = (await redis.get(lcKey)) || { userId: loserId, userName: loserName, charId: loserCharId, platform, wins: 0, losses: 0 };
    lcStats.userName = loserName;
    lcStats.losses = (lcStats.losses || 0) + 1;
    await redis.set(lcKey, lcStats);
    const existingScore = await redis.zscore(charBoardKey(platform, loserCharId), String(loserId));
    if (existingScore == null) await redis.zadd(charBoardKey(platform, loserCharId), { score: 0, member: String(loserId) });
  }

  // Resultado para que cada jugador lo vea en su próximo poll (TTL 10 min)
  await redis.set(
    offlineResultKey(String(cleanWinnerId)),
    { won: true,  rpDelta: result.winner.rrDelta, newRank: wStats.rank, newRankPoints: wStats.rankPoints, matchId: cleanMatchId },
    { ex: 600 }
  );
  await redis.set(
    offlineResultKey(String(loserId)),
    { won: false, rpDelta: result.loser.rrDelta,  newRank: lStats.rank, newRankPoints: lStats.rankPoints, matchId: cleanMatchId },
    { ex: 600 }
  );

  // Marcar match como terminado
  matches[matchIndex] = { ...match, status: 'finished', winnerId: cleanWinnerId, finishedAt: Date.now() };
  await redis.set(offlineMatchesKey(), matches, { ex: 24 * 60 * 60 });

  // Liberar pantalla
  const session = await redis.get(offlineSessionKey());
  if (session) {
    const screen = session.screens.find(s => s.id === match.screenId);
    if (screen) screen.busy = false;
    await redis.set(offlineSessionKey(), session, { ex: 24 * 60 * 60 });
  }

  // Auto-emparejar próxima pareja si hay jugadores en cola
  await tryAutoAssign();

  return res.status(200).json({
    ok: true,
    winnerRpDelta:   result.winner.rrDelta,
    loserRpDelta:    result.loser.rrDelta,
    winnerRankAfter: wStats.rank,
    loserRankAfter:  lStats.rank,
  });
}
