// Devuelve el conteo de tips por personaje (solo los que tienen al menos 1)
import redis, { tipsKey, tipsIndexKey } from '../../../lib/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const index = (await redis.get(tipsIndexKey)) || [];
  const counts = {};
  await Promise.all(index.map(async (char) => {
    const tips = (await redis.get(tipsKey(char))) || [];
    if (tips.length > 0) counts[char] = tips.length;
  }));
  return res.status(200).json(counts);
}
