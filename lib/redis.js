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
