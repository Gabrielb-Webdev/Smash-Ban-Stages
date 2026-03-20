import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default redis;

// ── Helpers de claves ──────────────────────────────────────────

/** Tips de un personaje: lista JSON */
export const tipsKey       = (char) => `tips:${char}`;

/** Lista de todos los personajes que tienen tips */
export const tipsIndexKey  = 'tips:index';

/** Notificaciones de un usuario: lista JSON */
export const notifsKey     = (name)  => `notifs:${name.toLowerCase()}`;

/** Cola de matchmaking por plataforma: lista JSON */
export const mmQueueKey    = (plat)  => `mm:queue:${plat}`;

/** Match: objeto JSON */
export const mmMatchKey    = (id)    => `mm:match:${id}`;

/** Perfil de jugador */
export const playerKey     = (id)    => `player:${id}`;

export const playersIndexKey = 'players:index';

/** Stats de ranked por jugador y plataforma: objeto JSON */
export const rankedStatsKey = (userId, platform) => `ranked:stats:${userId}:${platform}`;

/** Historial de partidas de un jugador: lista JSON (max 50) */
export const matchHistoryKey = (userId) => `match:history:${userId}`;

/** Leaderboard ranked por plataforma: sorted set */
export const rankedBoardKey = (platform) => `ranked:board:${platform}`;

/** Stats de un personaje para un jugador en una plataforma: objeto JSON */
export const charStatsKey = (userId, platform, charId) => `char:stats:${userId}:${platform}:${charId}`;

/** Leaderboard de un personaje en una plataforma: sorted set (score = wins) */
export const charBoardKey = (platform, charId) => `char:board:${platform}:${charId}`;

/** Lista de amigos de un usuario: lista JSON de {userId, userName, addedAt} */
export const friendsKey = (userId) => `friends:${userId}`;

/** Solicitudes de amistad pendientes para un usuario: lista JSON */
export const friendRequestsKey = (userId) => `friend:requests:${userId}`;

/** Solicitudes de amistad enviadas por un usuario: lista JSON */
export const sentRequestsKey = (userId) => `friend:sent:${userId}`;

/** Mensajes de chat entre dos usuarios: lista (lpush/lrange) */
export const chatKey = (id1, id2) => {
  const sorted = [String(id1), String(id2)].sort();
  return `chat:${sorted[0]}:${sorted[1]}`;
};

/** Party/grupo de un usuario: objeto JSON */
export const partyKey = (partyId) => `party:${partyId}`;

/** Mapa usuario → partyId */
export const userPartyKey = (userId) => `party:user:${userId}`;

/** Suscripciones push de un usuario: lista JSON de objetos PushSubscription */
export const pushSubKey = (userId) => `push:sub:${userId}`;

/** Cola de matchmaking 2v2 por plataforma: lista JSON */
export const mmQueueDoublesKey = (plat) => `mm:queue:doubles:${plat}`;

/** Stats de ranked 2v2 por jugador y plataforma: objeto JSON */
export const rankedDoubleStatsKey = (userId, platform) => `ranked:doubles:${userId}:${platform}`;

/** Leaderboard ranked 2v2 por plataforma: sorted set */
export const rankedDoubleBoardKey = (platform) => `ranked:doubles:board:${platform}`;

/** Set con todos los userId que tienen al menos una suscripción push activa */
export const pushUsersSetKey = 'push:users:set';

/** Presencia online de un usuario: string con TTL (60s) */
export const presenceKey = (userId) => `presence:${userId}`;
