// Devuelve el conteo de tips por personaje (solo los que tienen al menos 1)
import redis, { tipsKey, tipsIndexKey } from '../../../lib/redis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();
  // Cache 5 min: los tips no cambian frecuentemente
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');

  const index = (await redis.get(tipsIndexKey)) || [];
  if (index.length === 0) return res.status(200).json({});
  // mget en vez de N gets individuales via Promise.all
  const allTips = await redis.mget(...index.map(char => tipsKey(char)));
  const counts = {};
  index.forEach((char, i) => {
    const tips = allTips[i] || [];
    if (tips.length > 0) counts[char] = tips.length;
  });
  return res.status(200).json(counts);
}
