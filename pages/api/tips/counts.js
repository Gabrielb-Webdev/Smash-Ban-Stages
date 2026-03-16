// Devuelve el conteo de tips por personaje (solo los que tienen al menos 1)
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).end();

  const store = global._smashTips || {};
  const counts = {};
  for (const [char, arr] of Object.entries(store)) {
    if (Array.isArray(arr) && arr.length > 0) counts[char] = arr.length;
  }
  return res.status(200).json(counts);
}
