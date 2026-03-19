// API para reportar el resultado de un match 2v2 — Upstash Redis

import redis, { mmMatchKey, rankedDoubleStatsKey, rankedDoubleBoardKey, matchHistoryKey, partyKey, userPartyKey } from '../../../lib/redis';
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

async function cleanupParty(partyId) {
  const party = await redis.get(partyKey(partyId));
  if (party) {
    party.status = 'disbanded';
    await redis.set(partyKey(partyId), party);
    await redis.del(userPartyKey(party.leader.userId));
    if (party.invited?.userId) await redis.del(userPartyKey(party.invited.userId));
  }
}

async function updatePlayerStats(userId, userName, platform, isWin, finalStocks, opponentMMR) {
  const sKey = rankedDoubleStatsKey(String(userId), platform);
  const stats = (await redis.get(sKey)) || {
    userId, userName, platform,
    wins: 0, losses: 0, rank: 'Plástico 1', rankIndex: 0, rankPoints: 0,
    mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0,
    placementDone: false, placementWins: 0,
  };
  stats.userName = userName;
  if (!stats.mmr) stats.mmr = MMR_DEFAULT;

  const total = (stats.wins || 0) + (stats.losses || 0);
  let rpDelta = 0;
  let mmrDelta = 0;

  if (isWin) {
    if (!stats.placementDone && total < PLACEMENT_MATCHES) {
      stats.wins = (stats.wins || 0) + 1;
      stats.winStreak = (stats.winStreak || 0) + 1;
      stats.bestStreak = Math.max(stats.bestStreak || 0, stats.winStreak);
      stats.placementWins = (stats.placementWins || 0) + 1;
      if (stats.wins + (stats.losses || 0) === PLACEMENT_MATCHES) {
        const placed = calculatePlacementRank(stats.placementWins);
        stats.rank = placed.name;
        stats.rankIndex = getRankIndex(placed.name);
        stats.rankPoints = 0;
        stats.placementDone = true;
      }
    } else {
      rpDelta = calcRPDelta(finalStocks, stats.winStreak || 0);
      applyWinRP(stats, rpDelta);
    }
    mmrDelta = calcMMRDelta(stats.mmr, opponentMMR, finalStocks, (stats.winStreak || 1) - 1);
    stats.mmr = (stats.mmr || MMR_DEFAULT) + mmrDelta;
  } else {
    if (!stats.placementDone && total < PLACEMENT_MATCHES) {
      stats.losses = (stats.losses || 0) + 1;
      stats.winStreak = 0;
      if ((stats.wins || 0) + stats.losses === PLACEMENT_MATCHES) {
        const placed = calculatePlacementRank(stats.placementWins || 0);
        stats.rank = placed.name;
        stats.rankIndex = getRankIndex(placed.name);
        stats.rankPoints = 0;
        stats.placementDone = true;
      }
    } else {
      applyLossRP(stats);
    }
    stats.mmr = Math.max(1, (stats.mmr || MMR_DEFAULT) - Math.abs(mmrDelta || 5));
  }

  stats.updatedAt = new Date().toISOString();
  await redis.set(sKey, stats);
  await redis.zadd(rankedDoubleBoardKey(platform), { score: leaderboardScore(stats), member: String(userId) });

  return { rpDelta, mmrDelta };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { matchId, reportingUserId, claimedWinnerTeam, stocksWon } = req.body || {};

  if (!matchId || !reportingUserId || !claimedWinnerTeam) {
    return res.status(400).json({ error: 'matchId, reportingUserId y claimedWinnerTeam requeridos' });
  }

  if (!/^mm2v2-\d+-[a-z0-9]+$/.test(String(matchId))) {
    return res.status(400).json({ error: 'matchId inválido' });
  }

  const reportStocks = Math.min(3, Math.max(1, parseInt(stocksWon) || 1));

  const match = await redis.get(mmMatchKey(matchId));
  if (!match) return res.status(404).json({ error: 'Match no encontrado' });

  const cleanReporter = sanitize(reportingUserId);
  const cleanWinnerTeam = sanitize(claimedWinnerTeam);

  // Verificar que el reporter es parte del match
  const allPlayers = [
    match.team1.player1.userId, match.team1.player2.userId,
    match.team2.player1.userId, match.team2.player2.userId,
  ];
  if (!allPlayers.includes(cleanReporter)) {
    return res.status(403).json({ error: 'No sos parte de este match' });
  }

  if (!['team1', 'team2'].includes(cleanWinnerTeam)) {
    return res.status(400).json({ error: 'claimedWinnerTeam debe ser team1 o team2' });
  }

  const existingIdx = match.reports.findIndex(r => r.userId === cleanReporter);
  const report = {
    userId: cleanReporter,
    claimedWinnerTeam: cleanWinnerTeam,
    stocksWon: reportStocks,
    reportedAt: new Date().toISOString(),
  };
  if (existingIdx !== -1) {
    match.reports[existingIdx] = report;
  } else {
    match.reports.push(report);
  }

  // Necesitamos reportes de ambos equipos (al menos 1 de cada equipo, o todos)
  const team1Reports = match.reports.filter(r =>
    r.userId === match.team1.player1.userId || r.userId === match.team1.player2.userId
  );
  const team2Reports = match.reports.filter(r =>
    r.userId === match.team2.player1.userId || r.userId === match.team2.player2.userId
  );

  if (team1Reports.length > 0 && team2Reports.length > 0) {
    const t1Winner = team1Reports[0].claimedWinnerTeam;
    const t2Winner = team2Reports[0].claimedWinnerTeam;

    if (t1Winner === t2Winner) {
      match.status = 'finished';
      const winT = t1Winner === 'team1' ? match.team1 : match.team2;
      const winnerReport = match.reports.find(r =>
        r.userId === winT.player1.userId || r.userId === winT.player2.userId
      );
      match.result = {
        winnerTeam: t1Winner,
        winnerNames: [winT.player1.userName, winT.player2.userName],
        stocksWon: winnerReport?.stocksWon ?? reportStocks,
        decidedAt: new Date().toISOString(),
      };
    } else {
      match.status = 'disputed';
    }
  } else {
    match.status = 'pending_result';
  }

  await redis.set(mmMatchKey(matchId), match);

  if (match.status === 'finished') {
    const platform = match.platform;
    const winTeamKey = match.result.winnerTeam;
    const loseTeamKey = winTeamKey === 'team1' ? 'team2' : 'team1';
    const winTeam = match[winTeamKey];
    const loseTeam = match[loseTeamKey];
    const finalStocks = match.result.stocksWon || 1;

    // Calcular MMR promedio de cada equipo para deltas
    const getTeamMMR = async (team) => {
      const s1 = await redis.get(rankedDoubleStatsKey(String(team.player1.userId), platform));
      const s2 = await redis.get(rankedDoubleStatsKey(String(team.player2.userId), platform));
      return ((s1?.mmr || MMR_DEFAULT) + (s2?.mmr || MMR_DEFAULT)) / 2;
    };
    const loseMMR = await getTeamMMR(loseTeam);

    // Actualizar stats de ganadores
    for (const p of [winTeam.player1, winTeam.player2]) {
      await updatePlayerStats(p.userId, p.userName, platform, true, finalStocks, loseMMR);
    }
    // Actualizar stats de perdedores
    for (const p of [loseTeam.player1, loseTeam.player2]) {
      await updatePlayerStats(p.userId, p.userName, platform, false, finalStocks, loseMMR);
    }

    // Historial para los 4 jugadores
    const matchEntry = {
      matchId, platform, mode: '2v2',
      winnerTeam: winTeamKey,
      team1: { p1: match.team1.player1.userName, p2: match.team1.player2.userName },
      team2: { p1: match.team2.player1.userName, p2: match.team2.player2.userName },
      stocksWon: finalStocks,
      playedAt: new Date().toISOString(),
    };
    for (const uid of allPlayers) {
      const hKey = matchHistoryKey(String(uid));
      await redis.lpush(hKey, matchEntry);
      await redis.ltrim(hKey, 0, 49);
    }

    // Limpiar rooms y parties
    for (const uid of allPlayers) {
      await cleanupUserRoom(String(uid));
    }
    if (winTeam.partyId) await cleanupParty(winTeam.partyId);
    if (loseTeam.partyId) await cleanupParty(loseTeam.partyId);
  }

  return res.status(200).json({
    success: true,
    matchStatus: match.status,
    result: match.result,
    reportsCount: match.reports.length,
  });
}
