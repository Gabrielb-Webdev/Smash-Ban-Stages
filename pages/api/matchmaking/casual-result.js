// API para reportar resultado de una partida CASUAL (sin cambios de rango)

import redis, { casualMatchKey, matchHistoryKey } from '../../../lib/redis';

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`\\]/g, '').trim().slice(0, 100);
}

function roomKey(code)   { return `mm:casual:room:${code}`; }
function userRoomKey(id) { return `mm:casual:user:room:${id}`; }

async function cleanupUserRoom(userId) {
  const code = await redis.get(userRoomKey(String(userId)));
  if (code) {
    await redis.del(roomKey(code));
    await redis.del(userRoomKey(String(userId)));
  } else {
    await redis.del(userRoomKey(String(userId)));
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

  const { matchId, reportingUserId, claimedWinnerId, stocksWon, action } = req.body || {};

  if (!matchId || !reportingUserId || !claimedWinnerId) {
    return res.status(400).json({ error: 'matchId, reportingUserId y claimedWinnerId son requeridos' });
  }

  if (!/^mc-\d+-[a-z0-9]+$/.test(String(matchId))) {
    return res.status(400).json({ error: 'matchId casual inválido' });
  }

  const reportStocks = Math.min(3, Math.max(1, parseInt(stocksWon) || 1));

  const match = await redis.get(casualMatchKey(matchId));
  if (!match) return res.status(404).json({ error: 'Match casual no encontrado' });

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

  // ── ACCEPT ──────────────────────────────────────────────────────
  if (action === 'accept') {
    if (match.status !== 'pending_accept') {
      return res.status(400).json({ error: 'Match no está en estado pending_accept' });
    }
    match.acceptedBy = match.acceptedBy || [];
    if (!match.acceptedBy.includes(cleanReporter)) {
      match.acceptedBy.push(cleanReporter);
    }
    // Find the room to sync state and return it
    const roomCode = await redis.get(userRoomKey(cleanReporter));
    let updatedRoom = null;
    if (roomCode) {
      const room = await redis.get(roomKey(roomCode));
      if (room) {
        room.acceptedBy = match.acceptedBy;
        if (match.acceptedBy.length >= 2) {
          match.status = 'active';
          room.status = 'active';
        }
        await redis.set(roomKey(roomCode), room, { ex: 3600 });
        updatedRoom = room;
      }
    }
    if (match.acceptedBy.length >= 2) match.status = 'active';
    await redis.set(casualMatchKey(matchId), match, { ex: 3600 });
    return res.status(200).json({ success: true, matchStatus: match.status, room: updatedRoom || match });
  }

  // ── DECLINE (rechazar match antes de empezar) ────────────────────
  if (action === 'decline') {
    await cleanupUserRoom(match.player1.userId);
    await cleanupUserRoom(match.player2.userId);
    await redis.del(casualMatchKey(matchId));
    return res.status(200).json({ success: true, matchStatus: 'cancelled' });
  }

  // ── CONFIRM resultado pendiente ──────────────────────────────────
  if (action === 'confirm' && match.status === 'pending_confirm') {
    const pending = match.pendingResult;
    if (!pending) return res.status(400).json({ error: 'No hay resultado pendiente' });
    if (cleanReporter === pending.reporterId) return res.status(400).json({ error: 'No podés confirmar tu propio reporte' });

    const confirmerIsWinner = cleanReporter === pending.winnerId;
    const finalStocks = confirmerIsWinner ? reportStocks : pending.stocks;

    match.status = 'finished';
    match.result = {
      winnerId: pending.winnerId,
      winnerName: match.player1.userId === pending.winnerId ? match.player1.userName : match.player2.userName,
      loserId:  match.player1.userId === pending.winnerId ? match.player2.userId : match.player1.userId,
      loserName: match.player1.userId === pending.winnerId ? match.player2.userName : match.player1.userName,
      stocksWon: finalStocks,
      decidedAt: new Date().toISOString(),
    };
    match.pendingResult = null;
    await redis.set(casualMatchKey(matchId), match, { ex: 3600 });

    await saveHistory(match);
    await cleanupUserRoom(match.player1.userId);
    await cleanupUserRoom(match.player2.userId);

    return res.status(200).json({ success: true, matchStatus: 'finished', result: match.result });
  }

  // ── DENY resultado pendiente ────────────────────────────────────
  if (action === 'deny' && match.status === 'pending_confirm') {
    match.status = 'active';
    match.pendingResult = null;
    match.reports = [];
    await redis.set(casualMatchKey(matchId), match, { ex: 3600 });
    return res.status(200).json({ success: true, matchStatus: 'active', denied: true });
  }

  // ── PRIMER reporte ───────────────────────────────────────────────
  if (match.status !== 'active' && match.status !== 'pending_confirm') {
    return res.status(400).json({ error: 'No se puede reportar en este estado' });
  }

  match.reports = match.reports || [];
  const alreadyReported = match.reports.find(r => r.userId === cleanReporter);
  if (alreadyReported) {
    return res.status(400).json({ error: 'Ya reportaste el resultado' });
  }

  match.reports.push({ userId: cleanReporter, claimedWinnerId: cleanWinner, stocksWon: reportStocks });

  if (match.reports.length >= 2) {
    const r1 = match.reports[0];
    const r2 = match.reports[1];
    if (r1.claimedWinnerId === r2.claimedWinnerId) {
      // Acuerdo — finalizar
      const finalStocks = r1.userId === r1.claimedWinnerId ? r1.stocksWon : r2.stocksWon;
      match.status = 'finished';
      match.result = {
        winnerId: r1.claimedWinnerId,
        winnerName: match.player1.userId === r1.claimedWinnerId ? match.player1.userName : match.player2.userName,
        loserId:  match.player1.userId === r1.claimedWinnerId ? match.player2.userId : match.player1.userId,
        loserName: match.player1.userId === r1.claimedWinnerId ? match.player2.userName : match.player1.userName,
        stocksWon: finalStocks,
        decidedAt: new Date().toISOString(),
      };
      await redis.set(casualMatchKey(matchId), match, { ex: 3600 });
      await saveHistory(match);
      await cleanupUserRoom(match.player1.userId);
      await cleanupUserRoom(match.player2.userId);
    } else {
      // Desacuerdo
      match.status = 'pending_confirm';
      match.pendingResult = { reporterId: cleanReporter, winnerId: cleanWinner, stocks: reportStocks };
      await redis.set(casualMatchKey(matchId), match, { ex: 3600 });
    }
  } else {
    // Esperando al otro
    match.status = 'pending_confirm';
    match.pendingResult = { reporterId: cleanReporter, winnerId: cleanWinner, stocks: reportStocks };
    await redis.set(casualMatchKey(matchId), match, { ex: 3600 });
  }

  return res.status(200).json({
    success: true,
    matchStatus: match.status,
    result: match.result || null,
    pendingResult: match.pendingResult || null,
  });
}

async function saveHistory(match) {
  const { player1, player2, result, platform, matchId } = match;
  if (!result) return;

  const winnerId   = result.winnerId;
  const loserId    = result.loserId;
  const winnerName = result.winnerName;
  const loserName  = result.loserName;

  const entry = {
    matchId,
    platform,
    type: 'casual',
    winnerId,
    loserId,
    winnerName,
    loserName,
    winnerCharId: player1.userId === winnerId ? player1.charId : player2.charId,
    loserCharId:  player1.userId === loserId  ? player1.charId : player2.charId,
    stocksWon: result.stocksWon,
    rpDelta: 0,
    mmrDelta: 0,
    playedAt: result.decidedAt || new Date().toISOString(),
  };

  const wHistKey = matchHistoryKey(String(winnerId));
  const lHistKey = matchHistoryKey(String(loserId));
  await redis.lpush(wHistKey, entry);
  await redis.ltrim(wHistKey, 0, 49);
  await redis.lpush(lHistKey, entry);
  await redis.ltrim(lHistKey, 0, 49);
}
