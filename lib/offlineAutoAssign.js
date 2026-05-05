import redis, { offlineSessionKey, offlineQueueKey, offlineMatchesKey } from './redis';

const OFFLINE_STAGES = [
  { id: 'battlefield',       name: 'Battlefield' },
  { id: 'small-battlefield', name: 'Small Battlefield' },
  { id: 'town-and-city',     name: 'Town and City' },
  { id: 'smashville',        name: 'Smashville' },
  { id: 'pokemon-stadium-2', name: 'Pokémon Stadium 2' },
];

function pickStage() {
  return OFFLINE_STAGES[Math.floor(Math.random() * OFFLINE_STAGES.length)];
}

export async function tryAutoAssign() {
  const [session, matches, queue] = await Promise.all([
    redis.get(offlineSessionKey()),
    redis.get(offlineMatchesKey()),
    redis.get(offlineQueueKey()),
  ]);

  if (!session?.active) return;

  const allMatches = matches || [];
  const allQueue   = queue   || [];

  if (allQueue.length < 2) return;

  // Screens occupied by active or pending_accept matches
  const busyScreenIds = new Set(
    allMatches
      .filter(m => m.status === 'active' || m.status === 'pending_accept')
      .map(m => m.screenId)
  );
  const freeScreens = session.screens.filter(s => s.available && !busyScreenIds.has(s.id));

  if (freeScreens.length === 0) return;

  // Sort by MMR for closest-MMR pairing
  const sortedQueue = [...allQueue].sort((a, b) => a.mmr - b.mmr);

  const newMatches  = [];
  const usedIndexes = new Set();
  let   screenIndex = 0;

  for (let i = 0; i < sortedQueue.length && screenIndex < freeScreens.length; i++) {
    if (usedIndexes.has(i)) continue;
    const p1 = sortedQueue[i];

    // Find the closest available partner who isn't the consecutive rematch
    let partner      = null;
    let partnerIndex = -1;
    for (let j = i + 1; j < sortedQueue.length; j++) {
      if (usedIndexes.has(j)) continue;
      const p2 = sortedQueue[j];
      // Skip if BOTH have each other as last opponent AND streak >= 2
      const p1streak = p1.lastOpponentId === p2.userId ? (p1.lastOpponentStreak || 1) : 0;
      const p2streak = p2.lastOpponentId === p1.userId ? (p2.lastOpponentStreak || 1) : 0;
      if (p1streak >= 2 && p2streak >= 2) continue;
      partner      = p2;
      partnerIndex = j;
      break;
    }

    if (!partner) continue;

    usedIndexes.add(i);
    usedIndexes.add(partnerIndex);

    const screen  = freeScreens[screenIndex++];
    const stage   = pickStage();
    const rand6   = Math.random().toString(36).slice(2, 8);

    newMatches.push({
      matchId:     `offline-${Date.now()}-${rand6}`,
      screenId:    screen.id,
      player1:     p1,
      player2:     partner,
      stage,
      status:      'pending_accept',
      acceptedBy:  [],
      expiresAt:   Date.now() + 30000, // 30s to accept
      startedAt:   Date.now(),
    });
  }

  if (newMatches.length === 0) return;

  const assignedIds = new Set(newMatches.flatMap(m => [m.player1.userId, m.player2.userId]));

  for (const m of newMatches) {
    const s = session.screens.find(sc => sc.id === m.screenId);
    if (s) s.busy = true;
  }

  await Promise.all([
    redis.set(offlineSessionKey(), session, { ex: 24 * 60 * 60 }),
    redis.set(offlineMatchesKey(), [...allMatches, ...newMatches], { ex: 24 * 60 * 60 }),
    redis.set(offlineQueueKey(), allQueue.filter(p => !assignedIds.has(p.userId)), { ex: 24 * 60 * 60 }),
  ]);
}

// Return both players to queue and free the screen after a declined/timed-out match
export async function declinePendingMatch(matchId) {
  const [session, matches, queue] = await Promise.all([
    redis.get(offlineSessionKey()),
    redis.get(offlineMatchesKey()),
    redis.get(offlineQueueKey()),
  ]);

  const allMatches = matches || [];
  const allQueue   = queue   || [];
  const idx        = allMatches.findIndex(m => m.matchId === matchId && m.status === 'pending_accept');
  if (idx === -1) return;

  const match = allMatches[idx];
  allMatches[idx] = { ...match, status: 'declined' };

  // Re-queue both players (preserve lastOpponent info)
  const newQueue = [
    ...allQueue,
    match.player1,
    match.player2,
  ];

  if (session) {
    const scr = session.screens.find(s => s.id === match.screenId);
    if (scr) scr.busy = false;
    await redis.set(offlineSessionKey(), session, { ex: 24 * 60 * 60 });
  }

  await Promise.all([
    redis.set(offlineMatchesKey(), allMatches, { ex: 24 * 60 * 60 }),
    redis.set(offlineQueueKey(), newQueue, { ex: 24 * 60 * 60 }),
  ]);

  await tryAutoAssign();
}
