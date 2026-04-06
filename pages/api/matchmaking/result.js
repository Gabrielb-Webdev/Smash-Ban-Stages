// API para reportar el resultado de un match de matchmaking — Upstash Redis

import redis, { mmMatchKey, rankedStatsKey, rankedBoardKey, matchHistoryKey, charStatsKey, charBoardKey, rankHistoryKey, smasherBoardKey, smasherPoolKey } from '../../../lib/redis';
import {
  processMatchResult, leaderboardScore, getRankIndex, isInPlacement,
  PLACEMENT_MATCHES, MMR_DEFAULT, RANKS,
} from '../../../lib/ranks';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

async function cleanupUserRoom(userId) {
  const code = await redis.get(`mm:user:room:${String(userId)}`);
  if (code) {
    await redis.del(`mm:room:${code}`);
    await redis.del(`mm:user:room:${String(userId)}`);
  } else {
    await redis.del(`mm:user:room:${String(userId)}`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { matchId, reportingUserId, claimedWinnerId, stocksWon } = req.body || {};

  if (!matchId || !reportingUserId || !claimedWinnerId) {
    return res.status(400).json({ error: 'matchId, reportingUserId y claimedWinnerId son requeridos' });
  }

  if (!/^mm-\d+-[a-z0-9]+$/.test(String(matchId))) {
    return res.status(400).json({ error: 'matchId inválido' });
  }

  const reportStocks = Math.min(3, Math.max(1, parseInt(stocksWon) || 1));

  const match = await redis.get(mmMatchKey(matchId));
  if (!match) return res.status(404).json({ error: 'Match no encontrado' });

  const cleanReporter = sanitize(reportingUserId);
  const cleanWinner   = sanitize(claimedWinnerId);

  const isP1 = match.player1.userId === cleanReporter;
  const isP2 = match.player2.userId === cleanReporter;
  if (!isP1 && !isP2) {
    return res.status(403).json({ error: 'No sos parte de este match' });
  }

  const validWinners = [match.player1.userId, match.player2.userId];
  if (!validWinners.includes(cleanWinner)) {
    return res.status(400).json({ error: 'El ganador reportado no es jugador de este match' });
  }

  // Si el match ya terminó, devolver el resultado final sin crear un nuevo ciclo
  if (match.status === 'finished') {
    return res.status(200).json({
      success: true,
      matchStatus: 'finished',
      result: match.result,
      rpDelta: match.result?.rpDelta ?? undefined,
      loserRpDelta: match.result?.loserRpDelta ?? undefined,
      winnerRankChange: match.result?.winnerRankChange ?? undefined,
      loserRankChange: match.result?.loserRankChange ?? undefined,
    });
  }

  // ── Confirm / Deny flow ─────────────────────────────────
  const { action: resultAction } = req.body || {};

  if (resultAction === 'confirm' && match.status === 'pending_confirm') {
    // Opponent is confirming the pending report
    const pending = match.pendingResult;
    if (!pending) return res.status(400).json({ error: 'No hay resultado pendiente' });
    if (cleanReporter === pending.reporterId) return res.status(400).json({ error: 'No podés confirmar tu propio reporte' });

    // If the confirmer IS the winner, use the stocks they provided (they choose how many they had left)
    // If the confirmer is the loser, keep the original reported stocks
    const confirmerIsWinner = cleanReporter === pending.winnerId;
    const finalStocks = confirmerIsWinner ? reportStocks : pending.stocks;

    // Apply result
    match.reports = [
      { userId: pending.reporterId, claimedWinnerId: pending.winnerId, stocksWon: finalStocks },
      { userId: cleanReporter, claimedWinnerId: pending.winnerId, stocksWon: finalStocks },
    ];
    const agreedWinnerId = pending.winnerId;

    if (match.format === 'bo3') {
      const gameResult = { gameNum: match.currentGame, stage: match.stage, winnerId: agreedWinnerId, stocksWon: finalStocks };
      match.games = [...(match.games || [])];
      match.games[match.games.length - 1] = { ...(match.games[match.games.length - 1] || {}), result: gameResult };
      match.score = match.score || {};
      match.score[agreedWinnerId] = (match.score[agreedWinnerId] || 0) + 1;

      if (match.score[agreedWinnerId] >= 2) {
        match.status = 'finished';
        match.result = {
          winnerId: agreedWinnerId,
          winnerName: match.player1.userId === agreedWinnerId ? match.player1.userName : match.player2.userName,
          stocksWon: finalStocks,
          games: match.games,
          score: match.score,
          decidedAt: new Date().toISOString(),
        };
      } else {
        match.currentGame = (match.currentGame || 1) + 1;
        match.status = 'banning';
        match.reports = [];
        match.stage = null;
        match.bans = {};
        match.banPhase = 'winner_ban';
        match.pendingResult = null;
        const roomCode = await redis.get(`mm:user:room:${cleanReporter}`);
        if (roomCode) {
          const room = await redis.get(`mm:room:${roomCode}`);
          if (room) {
            room.status = 'banning';
            room.currentGame = match.currentGame;
            room.score = match.score;
            room.games = match.games;
            room.bans = {};
            room.banPhase = 'winner_ban';
            room.stage = null;
            room.banTurnStartedAt = null; // se inicia en el próximo poll del GET
            await redis.set(`mm:room:${roomCode}`, room);
          }
        }
      }
    } else {
      match.status = 'finished';
      match.result = {
        winnerId: agreedWinnerId,
        winnerName: match.player1.userId === agreedWinnerId ? match.player1.userName : match.player2.userName,
        stocksWon: finalStocks,
        decidedAt: new Date().toISOString(),
      };
    }

    match.pendingResult = null;
    await redis.set(mmMatchKey(matchId), match);

    // Run stats if finished...
    let finishedRPDelta = 0;
    let finishedLoserRPDelta = 0;
    let finishedMMRDelta = 0;
    let finishedWinnerRankChange = null;
    let finishedLoserRankChange = null;
    if (match.status === 'finished') {
      const statsResult = await applyFinishedStats(match, matchId, cleanReporter);
      finishedRPDelta = statsResult.rpDelta;
      finishedLoserRPDelta = statsResult.loserRpDelta;
      finishedMMRDelta = statsResult.mmrDelta;
      finishedWinnerRankChange = statsResult.winnerRankChange;
      finishedLoserRankChange = statsResult.loserRankChange;
    }

    return res.status(200).json({
      success: true,
      matchStatus: match.status,
      result: match.result,
      rpDelta: finishedRPDelta || undefined,
      loserRpDelta: finishedLoserRPDelta || undefined,
      mmrDelta: finishedMMRDelta || undefined,
      winnerRankChange: finishedWinnerRankChange || undefined,
      loserRankChange: finishedLoserRankChange || undefined,
    });
  }

  if (resultAction === 'deny' && match.status === 'pending_confirm') {
    // Opponent denies — reset to active so both can re-report
    match.status = 'active';
    match.pendingResult = null;
    match.reports = [];
    // Update room
    const roomCode = await redis.get(`mm:user:room:${cleanReporter}`);
    if (roomCode) {
      const room = await redis.get(`mm:room:${roomCode}`);
      if (room) {
        room.status = 'active';
        await redis.set(`mm:room:${roomCode}`, room);
      }
    }
    await redis.set(mmMatchKey(matchId), match);
    return res.status(200).json({ success: true, matchStatus: 'active', denied: true });
  }

  // ── AFK win: oponente AFK en chat por 15 min ─────────────
  if (resultAction === 'afk_win') {
    if (match.status !== 'active') {
      return res.status(400).json({ error: 'El match no está activo' });
    }
    const afkWinnerId  = cleanReporter;
    const afkLoserId   = match.player1.userId === afkWinnerId ? match.player2.userId : match.player1.userId;
    const afkWinnerName = match.player1.userId === afkWinnerId ? match.player1.userName : match.player2.userName;
    const afkLoserName  = match.player1.userId === afkLoserId  ? match.player1.userName : match.player2.userName;

    match.status = 'finished';
    match.result = {
      winnerId: afkWinnerId, winnerName: afkWinnerName,
      stocksWon: 1, afkWin: true,
      score: match.score || {}, games: match.games || [],
      decidedAt: new Date().toISOString(),
    };

    // Sumar +5 RP al ganador (sin procesar MMR normal)
    const wKey = rankedStatsKey(String(afkWinnerId), match.platform);
    const wStats = (await redis.get(wKey)) || {
      userId: afkWinnerId, userName: afkWinnerName, platform: match.platform,
      wins: 0, losses: 0, rank: 'Plástico I', rankIndex: 0, rankPoints: 0,
      mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0, placementDone: false,
    };
    wStats.wins = (wStats.wins || 0) + 1;
    wStats.rankPoints = (wStats.rankPoints || 0) + 5;
    await redis.set(wKey, wStats);
    await redis.zadd(rankedBoardKey(match.platform), { score: leaderboardScore(wStats), member: String(afkWinnerId) });

    // Historial de partidas
    const afkEntry = {
      matchId, platform: match.platform, winnerId: afkWinnerId, loserId: afkLoserId,
      winnerName: afkWinnerName, loserName: afkLoserName,
      winnerCharId: match.player1.userId === afkWinnerId ? match.player1.charId : match.player2.charId,
      loserCharId:  match.player1.userId === afkLoserId  ? match.player1.charId : match.player2.charId,
      winnerAltId:  match.player1.userId === afkWinnerId ? match.player1.charAlt : match.player2.charAlt,
      loserAltId:   match.player1.userId === afkLoserId  ? match.player1.charAlt : match.player2.charAlt,
      stocksWon: 1, rpDelta: 5, loserRpDelta: 0, afkWin: true,
      playedAt: new Date().toISOString(),
    };
    await redis.lpush(matchHistoryKey(String(afkWinnerId)), afkEntry);
    await redis.ltrim(matchHistoryKey(String(afkWinnerId)), 0, 49);
    await redis.lpush(matchHistoryKey(String(afkLoserId)), afkEntry);
    await redis.ltrim(matchHistoryKey(String(afkLoserId)), 0, 49);

    await redis.set(mmMatchKey(matchId), match);
    await cleanupUserRoom(String(afkWinnerId));
    await cleanupUserRoom(String(afkLoserId));

    return res.status(200).json({ success: true, matchStatus: 'finished', result: match.result, rpDelta: 5, afkWin: true });
  }

  // ── FORFEIT: el jugador se rinde voluntariamente ──────────
  if (resultAction === 'forfeit') {
    if (!['active', 'banning', 'pending_confirm'].includes(match.status)) {
      return res.status(400).json({ error: 'El match no puede ser abandonado en este estado' });
    }
    const forfeiterId = cleanReporter;
    const winnerId  = match.player1.userId === forfeiterId ? match.player2.userId : match.player1.userId;
    const winnerName = match.player1.userId === winnerId ? match.player1.userName : match.player2.userName;
    match.status = 'finished';
    match.result = {
      winnerId, winnerName,
      stocksWon: 1, forfeit: true,
      score: match.score || {}, games: match.games || [],
      decidedAt: new Date().toISOString(),
    };
    await redis.set(mmMatchKey(matchId), match);
    const statsResult = await applyFinishedStats(match, matchId);
    return res.status(200).json({
      success: true, matchStatus: 'finished',
      result: match.result,
      rpDelta: statsResult.rpDelta,
      loserRpDelta: statsResult.loserRpDelta || undefined,
      winnerRankChange: statsResult.winnerRankChange || undefined,
      loserRankChange: statsResult.loserRankChange || undefined,
      forfeit: true,
    });
  }

  // ── First report → pending_confirm ─────────────────────
  if (match.status === 'pending_confirm') {
    return res.status(400).json({ error: 'Ya hay un resultado pendiente de confirmación' });
  }

  match.pendingResult = {
    reporterId: cleanReporter,
    winnerId: cleanWinner,
    stocks: reportStocks,
    reportedAt: new Date().toISOString(),
  };
  match.status = 'pending_confirm';
  match.reports = [{ userId: cleanReporter, claimedWinnerId: cleanWinner, stocksWon: reportStocks, reportedAt: new Date().toISOString() }];

  // Update room status
  const roomCode = await redis.get(`mm:user:room:${cleanReporter}`);
  if (roomCode) {
    const room = await redis.get(`mm:room:${roomCode}`);
    if (room) {
      room.status = 'pending_confirm';
      room.pendingResult = match.pendingResult;
      await redis.set(`mm:room:${roomCode}`, room);
    }
  }

  await redis.set(mmMatchKey(matchId), match);

  return res.status(200).json({
    success: true,
    matchStatus: 'pending_confirm',
    pendingResult: match.pendingResult,
  });
}

// ── Helper: aplicar stats cuando un match termina ─────────
async function applyFinishedStats(match, matchId) {
  const platform   = match.platform;
  const winnerId   = match.result.winnerId;
  const loserId    = match.player1.userId === winnerId ? match.player2.userId : match.player1.userId;
  const winnerName = match.result.winnerName;
  const loserName  = match.player1.userId === loserId ? match.player1.userName : match.player2.userName;
  const finalStocks = match.result.stocksWon || 1;

  // ── Cargar stats de ambos ──
  const wKey = rankedStatsKey(String(winnerId), platform);
  const lKey = rankedStatsKey(String(loserId), platform);

  const wStats = (await redis.get(wKey)) || {
    userId: winnerId, userName: winnerName, platform,
    wins: 0, losses: 0, rank: 'Plástico I', rankIndex: 0, rankPoints: 0,
    mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0,
    placementDone: false, placementWins: 0, promotionShield: 0,
  };
  wStats.userName = winnerName;
  if (!wStats.mmr) wStats.mmr = MMR_DEFAULT;
  wStats.rankIndex = wStats.rankIndex ?? getRankIndex(wStats.rank);

  const lStats = (await redis.get(lKey)) || {
    userId: loserId, userName: loserName, platform,
    wins: 0, losses: 0, rank: 'Plástico I', rankIndex: 0, rankPoints: 0,
    mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0,
    placementDone: false, placementWins: 0, promotionShield: 0,
  };
  lStats.userName = loserName;
  if (!lStats.mmr) lStats.mmr = MMR_DEFAULT;
  lStats.rankIndex = lStats.rankIndex ?? getRankIndex(lStats.rank);

  // Capturar estado de placement ANTES de procesar (se usa en matchEntry)
  const wWasInPlacement = !wStats.placementDone && ((wStats.wins || 0) + (wStats.losses || 0)) < PLACEMENT_MATCHES;
  const lWasInPlacement = !lStats.placementDone && ((lStats.wins || 0) + (lStats.losses || 0)) < PLACEMENT_MATCHES;

  // Capturar rango y puntos ANTES de procesar (para reversión exacta en tickets)
  const winnerRankBefore       = wStats.rank ?? 'Plástico I';
  const winnerRankPointsBefore = wStats.rankPoints ?? 0;
  const loserRankBefore        = lStats.rank ?? 'Plástico I';
  const loserRankPointsBefore  = lStats.rankPoints ?? 0;

  // ── Actualizar conteo de personajes en stats ──
  const wcId = String(match.player1.userId) === String(winnerId) ? match.player1.charId : match.player2.charId;
  const lcId = String(match.player1.userId) === String(loserId)  ? match.player1.charId : match.player2.charId;
  if (wcId) {
    if (!wStats.charCounts) wStats.charCounts = {};
    wStats.charCounts[String(wcId)] = (wStats.charCounts[String(wcId)] || 0) + 1;
  }
  if (lcId) {
    if (!lStats.charCounts) lStats.charCounts = {};
    lStats.charCounts[String(lcId)] = (lStats.charCounts[String(lcId)] || 0) + 1;
  }

  // ── Procesar resultado con el nuevo sistema ──
  const result = processMatchResult(wStats, lStats, { stocksWon: finalStocks });

  // ── Guardar stats actualizados ──
  await redis.set(wKey, wStats);
  await redis.set(lKey, lStats);

  // ── Leaderboard ──
  await redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(wStats), member: String(winnerId) });
  await redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(lStats), member: String(loserId) });

  // ── SMASHer leaderboard: agregar/quitar según rango ──
  const SMASHER_INDEX = RANKS.length - 1;
  if (wStats.rankIndex === SMASHER_INDEX) {
    await redis.zadd(smasherBoardKey(platform), { score: wStats.mmr, member: String(winnerId) });
  } else {
    await redis.zrem(smasherBoardKey(platform), String(winnerId)).catch(() => {});
  }
  if (lStats.rankIndex === SMASHER_INDEX) {
    await redis.zadd(smasherBoardKey(platform), { score: lStats.mmr, member: String(loserId) });
  } else {
    await redis.zrem(smasherBoardKey(platform), String(loserId)).catch(() => {});
  }

  // ── Pool de MMR activos (para calcular threshold SMASHer, TTL 30 días) ──
  await redis.zadd(smasherPoolKey(platform), { score: wStats.mmr, member: String(winnerId) });
  await redis.zadd(smasherPoolKey(platform), { score: lStats.mmr, member: String(loserId) });
  await redis.expire(smasherPoolKey(platform), 30 * 24 * 60 * 60);

  // ── Rank History: registrar cambios de rango ──
  if (result.winner.rankChange.promoted || result.winner.rankChange.demoted || result.winner.placementJustDone) {
    const entry = {
      rankBefore: result.winner.oldRank, subdivisionBefore: result.winner.oldSubdivision,
      rankAfter: wStats.rank, subdivisionAfter: RANKS[wStats.rankIndex]?.subdivision ?? null,
      reason: result.winner.placementJustDone ? 'PLACEMENT' : 'WIN',
      createdAt: new Date().toISOString(),
    };
    await redis.lpush(rankHistoryKey(String(winnerId)), entry);
    await redis.ltrim(rankHistoryKey(String(winnerId)), 0, 99);
  }
  if (result.loser.rankChange.promoted || result.loser.rankChange.demoted || result.loser.placementJustDone) {
    const entry = {
      rankBefore: result.loser.oldRank, subdivisionBefore: result.loser.oldSubdivision,
      rankAfter: lStats.rank, subdivisionAfter: RANKS[lStats.rankIndex]?.subdivision ?? null,
      reason: result.loser.placementJustDone ? 'PLACEMENT' : 'LOSS',
      createdAt: new Date().toISOString(),
    };
    await redis.lpush(rankHistoryKey(String(loserId)), entry);
    await redis.ltrim(rankHistoryKey(String(loserId)), 0, 99);
  }

  // ── Match History ──
  const matchEntry = {
    matchId, platform, winnerId, loserId, winnerName, loserName,
    winnerCharId: match.player1.userId === winnerId ? match.player1.charId : match.player2.charId,
    loserCharId:  match.player1.userId === loserId  ? match.player1.charId : match.player2.charId,
    winnerAltId:  match.player1.userId === winnerId ? match.player1.charAlt : match.player2.charAlt,
    loserAltId:   match.player1.userId === loserId  ? match.player1.charAlt : match.player2.charAlt,
    stocksWon: finalStocks,
    forfeit: !!match.result?.forfeit,
    rpDelta:      result.winner.rrDelta,
    loserRpDelta: result.loser.rrDelta,
    mmrDelta:  result.winner.mmrDelta,
    mmrWinnerBefore: result.winner.mmrBefore,
    mmrWinnerAfter:  result.winner.mmrAfter,
    mmrLoserBefore:  result.loser.mmrBefore,
    mmrLoserAfter:   result.loser.mmrAfter,
    winnerRankBefore,      winnerRankPointsBefore,
    loserRankBefore,       loserRankPointsBefore,
    winnerRankAfter: wStats.rank,
    loserRankAfter:  lStats.rank,
    isPlacementWinner: wWasInPlacement,
    isPlacementLoser:  lWasInPlacement,
    winnerScore: 2,
    loserScore: match.score ? (match.score[String(loserId)] ?? match.score[loserId] ?? 0) : 0,
    games: match.result?.games || [],
    playedAt: new Date().toISOString(),
  };
  const wHistKey = matchHistoryKey(String(winnerId));
  const lHistKey = matchHistoryKey(String(loserId));
  await redis.lpush(wHistKey, matchEntry);
  await redis.ltrim(wHistKey, 0, 49);
  await redis.lpush(lHistKey, matchEntry);
  await redis.ltrim(lHistKey, 0, 49);

  // ── Stats por personaje ──
  const winnerCharId = matchEntry.winnerCharId;
  const loserCharId  = matchEntry.loserCharId;
  if (winnerCharId) {
    const wcKey   = charStatsKey(String(winnerId), platform, winnerCharId);
    const wcStats = (await redis.get(wcKey)) || { userId: winnerId, userName: winnerName, charId: winnerCharId, platform, wins: 0, losses: 0 };
    wcStats.userName = winnerName;
    wcStats.wins = (wcStats.wins || 0) + 1;
    await redis.set(wcKey, wcStats);
    await redis.zadd(charBoardKey(platform, winnerCharId), { score: wcStats.wins, member: String(winnerId) });
  }
  if (loserCharId) {
    const lcKey   = charStatsKey(String(loserId), platform, loserCharId);
    const lcStats = (await redis.get(lcKey)) || { userId: loserId, userName: loserName, charId: loserCharId, platform, wins: 0, losses: 0 };
    lcStats.userName = loserName;
    lcStats.losses = (lcStats.losses || 0) + 1;
    await redis.set(lcKey, lcStats);
    const existingScore = await redis.zscore(charBoardKey(platform, loserCharId), String(loserId));
    if (existingScore == null) {
      await redis.zadd(charBoardKey(platform, loserCharId), { score: 0, member: String(loserId) });
    }
  }

  // ── Guardar RP en match.result para que el polling lo entregue al no-reporter ──
  if (match.result) {
    match.result.rpDelta      = result.winner.rrDelta;
    match.result.loserRpDelta = result.loser.rrDelta;
    match.result.winnerRankChange = result.winner.rankChange;
    match.result.loserRankChange  = result.loser.rankChange;
    await redis.set(mmMatchKey(matchId), match);
  }

  // ── Mantener room viva 5 min para que el no-reporter vea el resultado ──
  const RESULT_TTL = 300; // 5 minutos
  for (const playerId of [String(winnerId), String(loserId)]) {
    const roomCode = await redis.get(`mm:user:room:${playerId}`);
    if (roomCode) {
      const roomObj = await redis.get(`mm:room:${roomCode}`);
      if (roomObj) {
        roomObj.status = 'finished'; // marcar la room como terminada
        if (!roomObj.result) roomObj.result = { ...match.result }; // copiar resultado completo (incluye winnerId)
        roomObj.result.rpDelta          = result.winner.rrDelta;
        roomObj.result.loserRpDelta     = result.loser.rrDelta;
        roomObj.result.winnerRankChange = result.winner.rankChange;
        roomObj.result.loserRankChange  = result.loser.rankChange;
        await redis.set(`mm:room:${roomCode}`, roomObj, { ex: RESULT_TTL });
      }
      // El user→room key expira en 5 min (no se borra inmediato)
      await redis.expire(`mm:user:room:${playerId}`, RESULT_TTL);
    }
  }

  return {
    rpDelta: result.winner.rrDelta,
    loserRpDelta: result.loser.rrDelta,
    mmrDelta: result.winner.mmrDelta,
    winnerRankChange: result.winner.rankChange,
    loserRankChange: result.loser.rankChange,
  };
}
