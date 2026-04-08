// API de sala grupal Parsec — emparejamiento por turnos para múltiples jugadores
// en la misma sesión Parsec física. Los puntos van al ranking Parsec estándar.

import redis, {
  rankedStatsKey, rankedBoardKey, matchHistoryKey,
  charStatsKey, charBoardKey, rankHistoryKey,
  smasherBoardKey, smasherPoolKey,
} from '../../../lib/redis';
import {
  processMatchResult, leaderboardScore, getRankIndex,
  PLACEMENT_MATCHES, MMR_DEFAULT, RANKS,
} from '../../../lib/ranks';

const PLATFORM = 'parsec';
const ROOM_TTL  = 6 * 3600; // 6 horas

const pgRoomKey = (code)   => `pg:room:${code}`;
const pgUserKey = (userId) => `pg:user:${userId}`;

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 5; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function pairKey(id1, id2) {
  return [String(id1), String(id2)].sort().join(':');
}

/**
 * Genera el siguiente par de jugadores para el match:
 * - No repite el mismo emparejamiento consecutivo (excepto si solo hay 2 jugadores)
 * - Prioriza pares que no jugaron recientemente entre sí (según matchHistory de la sala)
 */
function pickNextPair(players, lastPairKey, matchHistory) {
  if (players.length < 2) return null;
  const ids = players.map(p => p.userId);

  // Todos los pares posibles
  const allPairs = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      allPairs.push([ids[i], ids[j]]);
    }
  }

  // Excluir el emparejamiento consecutivo inmediato (a menos que sea el único posible)
  let eligible = allPairs;
  if (lastPairKey && allPairs.length > 1) {
    eligible = allPairs.filter(([a, b]) => pairKey(a, b) !== lastPairKey);
  }
  if (eligible.length === 0) eligible = allPairs;

  // Contar cuántas veces se jugó cada par en el historial de esta sala
  const pairCount = {};
  for (const entry of (matchHistory || [])) {
    const k = pairKey(entry.p1Id, entry.p2Id);
    pairCount[k] = (pairCount[k] || 0) + 1;
  }

  // Preferir pares con menos partidas jugadas entre sí (más rotación)
  const minPlayed = Math.min(...eligible.map(([a, b]) => pairCount[pairKey(a, b)] || 0));
  const freshest = eligible.filter(([a, b]) => (pairCount[pairKey(a, b)] || 0) === minPlayed);
  const chosen = freshest[Math.floor(Math.random() * freshest.length)];
  return chosen;
}

async function applyGroupMatchStats(match, roomCode) {
  const agreedWinnerId = match.winnerId;
  const agreedLoserId  = match.p1.userId === agreedWinnerId ? match.p2.userId : match.p1.userId;
  const winner = match.p1.userId === agreedWinnerId ? match.p1 : match.p2;
  const loser  = match.p1.userId === agreedLoserId  ? match.p1 : match.p2;
  const agreedStocks = match.stocksWon || 1;

  const wKey = rankedStatsKey(String(agreedWinnerId), PLATFORM);
  const lKey = rankedStatsKey(String(agreedLoserId),  PLATFORM);

  const wStats = (await redis.get(wKey)) || {
    userId: agreedWinnerId, userName: winner.userName, platform: PLATFORM,
    wins: 0, losses: 0, rank: 'Plástico I', rankIndex: 0, rankPoints: 0,
    mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0,
    placementDone: false, placementWins: 0, promotionShield: 0,
  };
  wStats.userName = winner.userName;
  if (!wStats.mmr) wStats.mmr = MMR_DEFAULT;
  wStats.rankIndex = wStats.rankIndex ?? getRankIndex(wStats.rank);

  const lStats = (await redis.get(lKey)) || {
    userId: agreedLoserId, userName: loser.userName, platform: PLATFORM,
    wins: 0, losses: 0, rank: 'Plástico I', rankIndex: 0, rankPoints: 0,
    mmr: MMR_DEFAULT, winStreak: 0, bestStreak: 0,
    placementDone: false, placementWins: 0, promotionShield: 0,
  };
  lStats.userName = loser.userName;
  if (!lStats.mmr) lStats.mmr = MMR_DEFAULT;
  lStats.rankIndex = lStats.rankIndex ?? getRankIndex(lStats.rank);

  const wWasInPlacement = !wStats.placementDone && ((wStats.wins || 0) + (wStats.losses || 0)) < PLACEMENT_MATCHES;
  const lWasInPlacement = !lStats.placementDone && ((lStats.losses || 0) + (lStats.wins || 0)) < PLACEMENT_MATCHES;

  const winnerRankBefore       = wStats.rank ?? 'Plástico I';
  const winnerRankPointsBefore = wStats.rankPoints ?? 0;
  const loserRankBefore        = lStats.rank ?? 'Plástico I';
  const loserRankPointsBefore  = lStats.rankPoints ?? 0;

  if (winner.charId) {
    if (!wStats.charCounts) wStats.charCounts = {};
    wStats.charCounts[String(winner.charId)] = (wStats.charCounts[String(winner.charId)] || 0) + 1;
  }
  if (loser.charId) {
    if (!lStats.charCounts) lStats.charCounts = {};
    lStats.charCounts[String(loser.charId)] = (lStats.charCounts[String(loser.charId)] || 0) + 1;
  }

  const result = processMatchResult(wStats, lStats, { stocksWon: agreedStocks });

  await redis.set(wKey, wStats);
  await redis.set(lKey, lStats);

  await redis.zadd(rankedBoardKey(PLATFORM), { score: leaderboardScore(wStats), member: String(agreedWinnerId) });
  await redis.zadd(rankedBoardKey(PLATFORM), { score: leaderboardScore(lStats), member: String(agreedLoserId) });

  const SMASHER_INDEX = RANKS.length - 1;
  if (wStats.rankIndex === SMASHER_INDEX) {
    await redis.zadd(smasherBoardKey(PLATFORM), { score: wStats.mmr, member: String(agreedWinnerId) });
  } else {
    await redis.zrem(smasherBoardKey(PLATFORM), String(agreedWinnerId)).catch(() => {});
  }
  if (lStats.rankIndex === SMASHER_INDEX) {
    await redis.zadd(smasherBoardKey(PLATFORM), { score: lStats.mmr, member: String(agreedLoserId) });
  } else {
    await redis.zrem(smasherBoardKey(PLATFORM), String(agreedLoserId)).catch(() => {});
  }

  await redis.zadd(smasherPoolKey(PLATFORM), { score: wStats.mmr, member: String(agreedWinnerId) });
  await redis.zadd(smasherPoolKey(PLATFORM), { score: lStats.mmr, member: String(agreedLoserId) });
  await redis.expire(smasherPoolKey(PLATFORM), 30 * 24 * 60 * 60);

  if (result.winner.rankChange.promoted || result.winner.rankChange.demoted || result.winner.placementJustDone) {
    await redis.lpush(rankHistoryKey(String(agreedWinnerId)), {
      rankBefore: result.winner.oldRank, subdivisionBefore: result.winner.oldSubdivision,
      rankAfter: wStats.rank, subdivisionAfter: RANKS[wStats.rankIndex]?.subdivision ?? null,
      reason: result.winner.placementJustDone ? 'PLACEMENT' : 'WIN',
      createdAt: new Date().toISOString(),
    });
    await redis.ltrim(rankHistoryKey(String(agreedWinnerId)), 0, 99);
  }
  if (result.loser.rankChange.promoted || result.loser.rankChange.demoted || result.loser.placementJustDone) {
    await redis.lpush(rankHistoryKey(String(agreedLoserId)), {
      rankBefore: result.loser.oldRank, subdivisionBefore: result.loser.oldSubdivision,
      rankAfter: lStats.rank, subdivisionAfter: RANKS[lStats.rankIndex]?.subdivision ?? null,
      reason: result.loser.placementJustDone ? 'PLACEMENT' : 'LOSS',
      createdAt: new Date().toISOString(),
    });
    await redis.ltrim(rankHistoryKey(String(agreedLoserId)), 0, 99);
  }

  const matchEntry = {
    matchId: `pg-${roomCode}-${Date.now()}`,
    platform: PLATFORM,
    winnerId: agreedWinnerId, loserId: agreedLoserId,
    winnerName: winner.userName, loserName: loser.userName,
    winnerCharId: winner.charId, loserCharId: loser.charId,
    winnerAltId: winner.charAlt, loserAltId: loser.charAlt,
    stocksWon: agreedStocks,
    rpDelta: result.winner.rrDelta,
    loserRpDelta: result.loser.rrDelta,
    mmrDelta: result.winner.mmrDelta,
    winnerRankBefore, winnerRankPointsBefore,
    loserRankBefore, loserRankPointsBefore,
    winnerRankAfter: wStats.rank, loserRankAfter: lStats.rank,
    isPlacementWinner: wWasInPlacement, isPlacementLoser: lWasInPlacement,
    groupRoom: roomCode,
    playedAt: new Date().toISOString(),
  };
  await redis.lpush(matchHistoryKey(String(agreedWinnerId)), matchEntry);
  await redis.ltrim(matchHistoryKey(String(agreedWinnerId)), 0, 49);
  await redis.lpush(matchHistoryKey(String(agreedLoserId)), matchEntry);
  await redis.ltrim(matchHistoryKey(String(agreedLoserId)), 0, 49);

  if (winner.charId) {
    const wcKey   = charStatsKey(String(agreedWinnerId), PLATFORM, winner.charId);
    const wcStats = (await redis.get(wcKey)) || { userId: agreedWinnerId, userName: winner.userName, charId: winner.charId, platform: PLATFORM, wins: 0, losses: 0 };
    wcStats.userName = winner.userName;
    wcStats.wins = (wcStats.wins || 0) + 1;
    await redis.set(wcKey, wcStats);
    await redis.zadd(charBoardKey(PLATFORM, winner.charId), { score: wcStats.wins, member: String(agreedWinnerId) });
  }
  if (loser.charId) {
    const lcKey   = charStatsKey(String(agreedLoserId), PLATFORM, loser.charId);
    const lcStats = (await redis.get(lcKey)) || { userId: agreedLoserId, userName: loser.userName, charId: loser.charId, platform: PLATFORM, wins: 0, losses: 0 };
    lcStats.userName = loser.userName;
    lcStats.losses = (lcStats.losses || 0) + 1;
    await redis.set(lcKey, lcStats);
    const existingScore = await redis.zscore(charBoardKey(PLATFORM, loser.charId), String(agreedLoserId));
    if (existingScore == null) {
      await redis.zadd(charBoardKey(PLATFORM, loser.charId), { score: 0, member: String(agreedLoserId) });
    }
  }

  return {
    rpDelta: result.winner.rrDelta,
    loserRpDelta: result.loser.rrDelta,
    winnerRankChange: result.winner.rankChange,
    loserRankChange: result.loser.rankChange,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  // ── GET: estado de sala del usuario ──────────────────────────────────
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const cleanId = sanitize(userId);
    const code = await redis.get(pgUserKey(cleanId));
    if (!code) return res.status(200).json({ room: null });
    const room = await redis.get(pgRoomKey(code));
    if (!room) { await redis.del(pgUserKey(cleanId)); return res.status(200).json({ room: null }); }
    return res.status(200).json({ room });
  }

  // ── POST: acciones de sala ────────────────────────────────────────────
  if (req.method === 'POST') {
    const { action, userId, userName, charId, charAlt, code: joinCode, winnerId, stocksWon } = req.body || {};
    if (!userId || !userName) return res.status(400).json({ error: 'userId y userName requeridos' });
    const cleanId   = sanitize(userId);
    const cleanName = sanitize(userName);

    // ── CREAR SALA ──────────────────────────────────────────────────────
    if (action === 'create') {
      const existingCode = await redis.get(pgUserKey(cleanId));
      if (existingCode) {
        const existingRoom = await redis.get(pgRoomKey(existingCode));
        if (existingRoom) return res.status(409).json({ error: 'Ya estás en una sala', room: existingRoom });
        await redis.del(pgUserKey(cleanId));
      }
      let code;
      for (let i = 0; i < 10; i++) {
        code = genCode();
        if (!(await redis.get(pgRoomKey(code)))) break;
      }
      const room = {
        code, hostId: cleanId, status: 'waiting',
        players: [{ userId: cleanId, userName: cleanName, charId: charId || null, charAlt: charAlt || 1, wins: 0, losses: 0 }],
        currentMatch: null, matchHistory: [], lastPairKey: null,
        createdAt: new Date().toISOString(),
      };
      await redis.set(pgRoomKey(code), room, { ex: ROOM_TTL });
      await redis.set(pgUserKey(cleanId), code, { ex: ROOM_TTL });
      return res.status(200).json({ room });
    }

    // ── UNIRSE A SALA ───────────────────────────────────────────────────
    if (action === 'join') {
      if (!joinCode) return res.status(400).json({ error: 'Código requerido' });
      const upperCode = String(joinCode).toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
      const existingCode = await redis.get(pgUserKey(cleanId));
      if (existingCode) {
        if (existingCode === upperCode) {
          const room = await redis.get(pgRoomKey(upperCode));
          if (room) return res.status(200).json({ room });
        }
        const existingRoom = await redis.get(pgRoomKey(existingCode));
        if (existingRoom) return res.status(409).json({ error: 'Ya estás en otra sala' });
        await redis.del(pgUserKey(cleanId));
      }
      const room = await redis.get(pgRoomKey(upperCode));
      if (!room) return res.status(404).json({ error: 'Sala no encontrada. Verificá el código.' });
      if (room.players.some(p => p.userId === cleanId)) return res.status(200).json({ room });
      room.players.push({ userId: cleanId, userName: cleanName, charId: charId || null, charAlt: charAlt || 1, wins: 0, losses: 0 });
      await redis.set(pgRoomKey(upperCode), room, { ex: ROOM_TTL });
      await redis.set(pgUserKey(cleanId), upperCode, { ex: ROOM_TTL });
      return res.status(200).json({ room });
    }

    // ── ACTUALIZAR PERSONAJE EN LA SALA ─────────────────────────────────
    if (action === 'update_char') {
      const code = await redis.get(pgUserKey(cleanId));
      if (!code) return res.status(404).json({ error: 'No estás en ninguna sala' });
      const room = await redis.get(pgRoomKey(code));
      if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
      const player = room.players.find(p => p.userId === cleanId);
      if (player) { player.charId = charId || null; player.charAlt = charAlt || 1; }
      await redis.set(pgRoomKey(code), room, { ex: ROOM_TTL });
      return res.status(200).json({ room });
    }

    // ── INICIAR (host) ──────────────────────────────────────────────────
    if (action === 'start') {
      const code = await redis.get(pgUserKey(cleanId));
      if (!code) return res.status(404).json({ error: 'No estás en ninguna sala' });
      const room = await redis.get(pgRoomKey(code));
      if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
      if (room.hostId !== cleanId) return res.status(403).json({ error: 'Solo el host puede iniciar' });
      if (room.players.length < 2) return res.status(400).json({ error: 'Necesitás al menos 2 jugadores para empezar' });
      if (room.status === 'playing' && room.currentMatch && !room.currentMatch.done) {
        return res.status(400).json({ error: 'Ya hay una partida en curso' });
      }
      const pair = pickNextPair(room.players, room.lastPairKey, room.matchHistory);
      if (!pair) return res.status(400).json({ error: 'No se pudo generar un par' });
      const p1 = room.players.find(p => p.userId === pair[0]);
      const p2 = room.players.find(p => p.userId === pair[1]);
      room.status = 'playing';
      room.currentMatch = {
        p1: { userId: p1.userId, userName: p1.userName, charId: p1.charId, charAlt: p1.charAlt || 1 },
        p2: { userId: p2.userId, userName: p2.userName, charId: p2.charId, charAlt: p2.charAlt || 1 },
        reports: {}, done: false, winnerId: null, stocksWon: null,
        rpDelta: null, loserRpDelta: null, startedAt: new Date().toISOString(),
      };
      room.lastPairKey = pairKey(pair[0], pair[1]);
      await redis.set(pgRoomKey(code), room, { ex: ROOM_TTL });
      return res.status(200).json({ room });
    }

    // ── SIGUIENTE PARTIDA (host) ─────────────────────────────────────────
    if (action === 'next') {
      const code = await redis.get(pgUserKey(cleanId));
      if (!code) return res.status(404).json({ error: 'No estás en ninguna sala' });
      const room = await redis.get(pgRoomKey(code));
      if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
      if (room.hostId !== cleanId) return res.status(403).json({ error: 'Solo el host puede avanzar' });
      if (!room.currentMatch?.done) return res.status(400).json({ error: 'El partido actual no terminó' });
      const pair = pickNextPair(room.players, room.lastPairKey, room.matchHistory);
      if (!pair) return res.status(400).json({ error: 'No se pudo generar un par' });
      const p1 = room.players.find(p => p.userId === pair[0]);
      const p2 = room.players.find(p => p.userId === pair[1]);
      room.currentMatch = {
        p1: { userId: p1.userId, userName: p1.userName, charId: p1.charId, charAlt: p1.charAlt || 1 },
        p2: { userId: p2.userId, userName: p2.userName, charId: p2.charId, charAlt: p2.charAlt || 1 },
        reports: {}, done: false, winnerId: null, stocksWon: null,
        rpDelta: null, loserRpDelta: null, startedAt: new Date().toISOString(),
      };
      room.lastPairKey = pairKey(pair[0], pair[1]);
      await redis.set(pgRoomKey(code), room, { ex: ROOM_TTL });
      return res.status(200).json({ room });
    }

    // ── REPORTAR RESULTADO ──────────────────────────────────────────────
    if (action === 'report') {
      const code = await redis.get(pgUserKey(cleanId));
      if (!code) return res.status(404).json({ error: 'No estás en ninguna sala' });
      const room = await redis.get(pgRoomKey(code));
      if (!room) return res.status(404).json({ error: 'Sala no encontrada' });
      if (!room.currentMatch || room.currentMatch.done) {
        return res.status(400).json({ error: 'No hay partida activa para reportar' });
      }
      const match = room.currentMatch;
      const isPlayer = cleanId === match.p1.userId || cleanId === match.p2.userId;
      const isHost   = room.hostId === cleanId;
      if (!isPlayer && !isHost) {
        return res.status(403).json({ error: 'Solo los jugadores o el host pueden reportar' });
      }
      const cleanWinner = sanitize(winnerId || '');
      if (cleanWinner !== match.p1.userId && cleanWinner !== match.p2.userId) {
        return res.status(400).json({ error: 'El ganador debe ser uno de los dos jugadores' });
      }
      const finalStocks = Math.min(3, Math.max(1, parseInt(stocksWon) || 1));

      // Guardar reporte de este usuario
      match.reports = match.reports || {};
      match.reports[cleanId] = { winnerId: cleanWinner, stocksWon: finalStocks };

      const p1Report = match.reports[match.p1.userId];
      const p2Report = match.reports[match.p2.userId];

      // Finalizar si: host decidió, o ambos jugadores coinciden
      const hostDecide = isHost && !isPlayer;
      const bothAgree  = p1Report && p2Report && p1Report.winnerId === p2Report.winnerId;

      if (!hostDecide && !bothAgree) {
        // Si hay desacuerdo entre jugadores, limpiar reportes para re-reportar
        if (p1Report && p2Report && p1Report.winnerId !== p2Report.winnerId) {
          match.reports = {};
          await redis.set(pgRoomKey(code), room, { ex: ROOM_TTL });
          return res.status(200).json({ room, disagreement: true });
        }
        // Primer reporte, esperando el otro
        await redis.set(pgRoomKey(code), room, { ex: ROOM_TTL });
        return res.status(200).json({ room, pending: true });
      }

      // Acordado
      match.winnerId  = hostDecide ? cleanWinner : p1Report.winnerId;
      match.stocksWon = hostDecide ? finalStocks : p1Report.stocksWon;
      match.done      = true;
      match.finishedAt = new Date().toISOString();

      // Aplicar stats ranked
      const statsResult = await applyGroupMatchStats(match, code);
      match.rpDelta         = statsResult.rpDelta;
      match.loserRpDelta    = statsResult.loserRpDelta;
      match.winnerRankChange = statsResult.winnerRankChange;
      match.loserRankChange  = statsResult.loserRankChange;

      // Actualizar score de sesión
      const wp = room.players.find(p => p.userId === match.winnerId);
      const loserId = match.p1.userId === match.winnerId ? match.p2.userId : match.p1.userId;
      const lp = room.players.find(p => p.userId === loserId);
      if (wp) wp.wins   = (wp.wins || 0) + 1;
      if (lp) lp.losses = (lp.losses || 0) + 1;

      room.matchHistory = room.matchHistory || [];
      room.matchHistory.push({
        p1Id: match.p1.userId, p2Id: match.p2.userId,
        winnerId: match.winnerId, stocksWon: match.stocksWon,
        rpDelta: match.rpDelta, loserRpDelta: match.loserRpDelta,
        playedAt: match.finishedAt,
      });

      await redis.set(pgRoomKey(code), room, { ex: ROOM_TTL });
      return res.status(200).json({
        room, finalized: true,
        rpDelta: match.rpDelta, loserRpDelta: match.loserRpDelta,
        winnerRankChange: match.winnerRankChange, loserRankChange: match.loserRankChange,
      });
    }

    // ── SALIR DE SALA ────────────────────────────────────────────────────
    if (action === 'leave') {
      const code = await redis.get(pgUserKey(cleanId));
      if (!code) return res.status(200).json({ left: true });
      const room = await redis.get(pgRoomKey(code));
      if (!room) { await redis.del(pgUserKey(cleanId)); return res.status(200).json({ left: true }); }
      room.players = room.players.filter(p => p.userId !== cleanId);
      await redis.del(pgUserKey(cleanId));
      if (room.players.length === 0) {
        await redis.del(pgRoomKey(code));
        return res.status(200).json({ left: true, roomClosed: true });
      }
      if (room.hostId === cleanId) room.hostId = room.players[0].userId;
      await redis.set(pgRoomKey(code), room, { ex: ROOM_TTL });
      return res.status(200).json({ left: true });
    }

    return res.status(400).json({ error: 'Acción desconocida' });
  }

  // ── DELETE: salir de sala ─────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const cleanId = sanitize(userId);
    const code = await redis.get(pgUserKey(cleanId));
    if (!code) return res.status(200).json({ left: true });
    const room = await redis.get(pgRoomKey(code));
    if (!room) { await redis.del(pgUserKey(cleanId)); return res.status(200).json({ left: true }); }
    room.players = room.players.filter(p => p.userId !== cleanId);
    await redis.del(pgUserKey(cleanId));
    if (room.players.length === 0) {
      await redis.del(pgRoomKey(code));
    } else {
      if (room.hostId === cleanId) room.hostId = room.players[0].userId;
      await redis.set(pgRoomKey(code), room, { ex: ROOM_TTL });
    }
    return res.status(200).json({ left: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
