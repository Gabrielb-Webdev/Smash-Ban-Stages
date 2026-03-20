// API para reportar el resultado de un match de matchmaking — Upstash Redis

import redis, { mmMatchKey, rankedStatsKey, rankedBoardKey, matchHistoryKey, charStatsKey, charBoardKey } from '../../../lib/redis';
import {
  applyWinRP, applyLossRP,
  leaderboardScore, getRankIndex, calculatePlacementRank, PLACEMENT_MATCHES,
  calcMMRDelta, calcRPDelta, MMR_DEFAULT,
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

  // ── Confirm / Deny flow ─────────────────────────────────
  const { action: resultAction } = req.body || {};

  if (resultAction === 'confirm' && match.status === 'pending_confirm') {
    // Opponent is confirming the pending report
    const pending = match.pendingResult;
    if (!pending) return res.status(400).json({ error: 'No hay resultado pendiente' });
    if (cleanReporter === pending.reporterId) return res.status(400).json({ error: 'No podés confirmar tu propio reporte' });

    // Apply result
    match.reports = [
      { userId: pending.reporterId, claimedWinnerId: pending.winnerId, stocksWon: pending.stocks },
      { userId: cleanReporter, claimedWinnerId: pending.winnerId, stocksWon: pending.stocks },
    ];
    const finalStocks = pending.stocks;
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
    let finishedMMRDelta = 0;
    if (match.status === 'finished') {
      const statsResult = await applyFinishedStats(match, matchId, cleanReporter);
      finishedRPDelta = statsResult.rpDelta;
      finishedMMRDelta = statsResult.mmrDelta;
    }

    return res.status(200).json({
      success: true,
      matchStatus: match.status,
      result: match.result,
      rpDelta: finishedRPDelta || undefined,
      mmrDelta: finishedMMRDelta || undefined,
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

  // Ganador
  const wKey   = rankedStatsKey(String(winnerId), platform);
  const wStats = (await redis.get(wKey)) || {
    userId: winnerId, userName: winnerName, platform,
    wins: 0, losses: 0, rank: 'Plástico 1', rankIndex: 0, rankPoints: 0,
    mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0,
    placementDone: false, placementWins: 0,
  };
  wStats.userName = winnerName;
  if (!wStats.mmr) wStats.mmr = MMR_DEFAULT;

  const wTotal = (wStats.wins || 0) + (wStats.losses || 0);
  let wRPDelta  = 0;
  let wMMRDelta = 0;

  if (!wStats.placementDone && wTotal < PLACEMENT_MATCHES) {
    wStats.wins       = (wStats.wins || 0) + 1;
    wStats.winStreak  = (wStats.winStreak  || 0) + 1;
    wStats.bestStreak = Math.max(wStats.bestStreak || 0, wStats.winStreak);
    wStats.placementWins = (wStats.placementWins || 0) + 1;
    if (wStats.wins + (wStats.losses || 0) === PLACEMENT_MATCHES) {
      const placed = calculatePlacementRank(wStats.placementWins);
      wStats.rank = placed.name;
      wStats.rankIndex = getRankIndex(placed.name);
      wStats.rankPoints = 0;
      wStats.placementDone = true;
    }
  } else {
    const wStreak = wStats.winStreak || 0;
    wRPDelta = calcRPDelta(finalStocks, wStreak);
    applyWinRP(wStats, wRPDelta);
  }

  // MMR siempre se actualiza
  const lStatsPreview = (await redis.get(rankedStatsKey(String(loserId), platform))) || { mmr: MMR_DEFAULT };
  wMMRDelta = calcMMRDelta(
    wStats.mmr,
    lStatsPreview.mmr || MMR_DEFAULT,
    finalStocks,
    (wStats.winStreak || 1) - 1,
  );
  wStats.mmr = (wStats.mmr || MMR_DEFAULT) + wMMRDelta;
  wStats.updatedAt = new Date().toISOString();
  await redis.set(wKey, wStats);
  await redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(wStats), member: String(winnerId) });

  // Perdedor
  const lKey   = rankedStatsKey(String(loserId), platform);
  const lStats = (await redis.get(lKey)) || {
    userId: loserId, userName: loserName, platform,
    wins: 0, losses: 0, rank: 'Plástico 1', rankIndex: 0, rankPoints: 0,
    mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0,
    placementDone: false, placementWins: 0,
  };
  lStats.userName = loserName;
  if (!lStats.mmr) lStats.mmr = MMR_DEFAULT;

  const lTotal = (lStats.wins || 0) + (lStats.losses || 0);
  if (!lStats.placementDone && lTotal < PLACEMENT_MATCHES) {
    lStats.losses    = (lStats.losses || 0) + 1;
    lStats.winStreak = 0;
    if ((lStats.wins || 0) + lStats.losses === PLACEMENT_MATCHES) {
      const placed = calculatePlacementRank(lStats.placementWins || 0);
      lStats.rank = placed.name;
      lStats.rankIndex = getRankIndex(placed.name);
      lStats.rankPoints = 0;
      lStats.placementDone = true;
    }
  } else {
    applyLossRP(lStats);
  }

  lStats.mmr = Math.max(1, (lStats.mmr || MMR_DEFAULT) - wMMRDelta);
  lStats.updatedAt = new Date().toISOString();
  await redis.set(lKey, lStats);
  await redis.zadd(rankedBoardKey(platform), { score: leaderboardScore(lStats), member: String(loserId) });

  // Historial
  const matchEntry = {
    matchId, platform, winnerId, loserId, winnerName, loserName,
    winnerCharId: match.player1.userId === winnerId ? match.player1.charId : match.player2.charId,
    loserCharId:  match.player1.userId === loserId  ? match.player1.charId : match.player2.charId,
    stocksWon: finalStocks,
    rpDelta:   wRPDelta,
    mmrDelta:  wMMRDelta,
    playedAt: new Date().toISOString(),
  };
  const wHistKey = matchHistoryKey(String(winnerId));
  const lHistKey = matchHistoryKey(String(loserId));
  await redis.lpush(wHistKey, matchEntry);
  await redis.ltrim(wHistKey, 0, 49);
  await redis.lpush(lHistKey, matchEntry);
  await redis.ltrim(lHistKey, 0, 49);

  // Stats por personaje
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

  // Limpiar sala de ambos jugadores
  await cleanupUserRoom(String(winnerId));
  await cleanupUserRoom(String(loserId));

  return { rpDelta: wRPDelta, mmrDelta: wMMRDelta };
}
