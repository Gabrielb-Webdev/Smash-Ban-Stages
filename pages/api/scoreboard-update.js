import fs from 'fs';
import path from 'path';
import redis from '../../lib/redis';

const JSON_PATH = path.join(process.cwd(), 'public', 'overlays', 'Santa-fe', 'Resources', 'Texts', 'ScoreboardInfo.json');
const REDIS_KEY = 'santafe:scoreboard:state';
const REDIS_TTL = 7 * 24 * 60 * 60; // 7 días

const ALLOWED_COLORS = ['Red', 'Blue', 'Yellow', 'Green', 'Orange', 'Cyan', 'Pink', 'Purple', 'CPU', 'Amiibo'];
const ALLOWED_WL = ['W', 'L', 'Nada'];
const ALLOWED_BESTOF = ['Bo3', 'Bo5', 'FreePlays'];

function validate(body) {
  if (typeof body !== 'object' || body === null) return false;
  if (body.p1Color && !ALLOWED_COLORS.includes(body.p1Color)) return false;
  if (body.p2Color && !ALLOWED_COLORS.includes(body.p2Color)) return false;
  if (body.p1WL && !ALLOWED_WL.includes(body.p1WL)) return false;
  if (body.p2WL && !ALLOWED_WL.includes(body.p2WL)) return false;
  if (body.bestOf && !ALLOWED_BESTOF.includes(body.bestOf)) return false;
  if (body.p1Score !== undefined && (typeof body.p1Score !== 'number' || body.p1Score < 0 || body.p1Score > 3)) return false;
  if (body.p2Score !== undefined && (typeof body.p2Score !== 'number' || body.p2Score < 0 || body.p2Score > 3)) return false;
  return true;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // 1) Intentar desde Redis (fuente de verdad para Vercel)
    try {
      const stored = await redis.get(REDIS_KEY);
      if (stored) {
        const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
        res.status(200).json(parsed);
        return;
      }
    } catch {}
    // 2) Fallback: leer desde archivo local (solo funciona en local/Render)
    try {
      const data = fs.readFileSync(JSON_PATH, 'utf-8');
      res.status(200).json(JSON.parse(data));
    } catch {
      res.status(200).json({});
    }
    return;
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (!validate(body)) {
      res.status(400).json({ error: 'Datos inválidos' });
      return;
    }

    const allowed = [
      'p1Name', 'p1Team', 'p1Pron', 'p1Score', 'p1NScore',
      'p1Character', 'p1Skin', 'p1Color', 'p1WL',
      'p2Name', 'p2Team', 'p2Pron', 'p2Score', 'p2NScore',
      'p2Character', 'p2Skin', 'p2Color', 'p2WL',
      'bestOf', 'round', 'format',
      'caster1Name', 'caster1Twitter', 'caster1Twitch',
      'caster2Name', 'caster2Twitter', 'caster2Twitch',
      'tournamentName', 'allowIntro',
    ];

    const safe = {};
    for (const key of allowed) {
      if (key in body) safe[key] = body[key];
    }

    // Guardar en Redis (persiste en Vercel y cualquier entorno)
    try {
      await redis.set(REDIS_KEY, JSON.stringify(safe), { ex: REDIS_TTL });
    } catch {}

    // También intentar escribir al archivo local (solo funciona en desarrollo/local)
    try {
      fs.writeFileSync(JSON_PATH, JSON.stringify(safe, null, 2), 'utf-8');
    } catch {}

    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Método no permitido' });
}
