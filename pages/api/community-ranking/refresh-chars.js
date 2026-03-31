/**
 * POST /api/community-ranking/refresh-chars
 * Recorre todos los torneos de una comunidad/año, consulta start.gg para obtener
 * el personaje más usado por cada jugador y actualiza los standings en Redis.
 */
import redis, { crTournamentsKey } from '../../../lib/redis';
import { findLocalCharId } from '../../../lib/characters';

const STARTGG_API = 'https://api.start.gg/gql/alpha';

const STARTGG_CHAR_NAMES = {
  1: 'Mario', 2: 'Donkey Kong', 3: 'Link', 4: 'Samus', 5: 'Dark Samus',
  6: 'Yoshi', 7: 'Kirby', 8: 'Fox', 9: 'Pikachu', 10: 'Luigi',
  11: 'Ness', 12: 'Captain Falcon', 13: 'Jigglypuff', 14: 'Peach', 15: 'Daisy',
  16: 'Bowser', 17: 'Ice Climbers', 18: 'Sheik', 19: 'Zelda', 20: 'Dr. Mario',
  21: 'Pichu', 22: 'Falco', 23: 'Marth', 24: 'Lucina', 25: 'Young Link',
  26: 'Ganondorf', 27: 'Mewtwo', 28: 'Roy', 29: 'Chrom', 30: 'Mr. Game & Watch',
  31: 'Meta Knight', 32: 'Pit', 33: 'Dark Pit', 34: 'Zero Suit Samus', 35: 'Wario',
  36: 'Snake', 37: 'Ike', 38: 'Pokemon Trainer', 39: 'Diddy Kong', 40: 'Lucas',
  41: 'Sonic', 42: 'King Dedede', 43: 'Olimar', 44: 'Lucario', 45: 'R.O.B.',
  46: 'Toon Link', 47: 'Wolf', 48: 'Villager', 49: 'Mega Man', 50: 'Wii Fit Trainer',
  51: 'Rosalina & Luma', 52: 'Little Mac', 53: 'Greninja', 54: 'Mii Brawler',
  55: 'Mii Swordfighter', 56: 'Mii Gunner', 57: 'Palutena', 58: 'Pac-Man',
  59: 'Robin', 60: 'Shulk', 61: 'Bowser Jr.', 62: 'Duck Hunt', 63: 'Ryu',
  64: 'Ken', 65: 'Cloud', 66: 'Corrin', 67: 'Bayonetta', 68: 'Inkling',
  69: 'Ridley', 70: 'Simon', 71: 'Richter', 72: 'King K. Rool', 73: 'Isabelle',
  74: 'Incineroar', 75: 'Piranha Plant', 76: 'Joker', 77: 'Hero', 78: 'Banjo & Kazooie',
  79: 'Terry', 80: 'Byleth', 81: 'Min Min', 82: 'Steve', 83: 'Sephiroth',
  84: 'Pyra/Mythra', 85: 'Kazuya', 86: 'Sora',
};

const Q_EVENT_CHARS = `
query EventChars($slug: String!, $page: Int!, $perPage: Int!) {
  event(slug: $slug) {
    sets(page: $page, perPage: $perPage, filters: { state: 3 }) {
      pageInfo { totalPages }
      nodes {
        games {
          selections {
            entrant { participants { player { gamerTag } } }
            selectionType
            selectionValue
          }
        }
      }
    }
  }
}`;

async function gqlQuery(token, query, variables) {
  const r = await fetch(STARTGG_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) throw new Error(`start.gg HTTP ${r.status}`);
  const json = await r.json();
  if (json.errors) throw new Error(json.errors[0]?.message || 'GQL error');
  return json.data;
}

async function fetchCharMap(token, eventSlug) {
  // charCount: gamerTag (lowercase) → { charId → count }
  const charCount = {};
  let page = 1, totalPages = 1;

  do {
    try {
      const data = await gqlQuery(token, Q_EVENT_CHARS, { slug: eventSlug, page, perPage: 50 });
      const sets = data?.event?.sets;
      if (!sets) break;
      totalPages = sets.pageInfo?.totalPages || 1;
      for (const set of (sets.nodes || [])) {
        for (const game of (set.games || [])) {
          for (const sel of (game.selections || [])) {
            // selectionType puede venir como string 'CHARACTER' o como 0 numérico
            if (sel.selectionType !== 'CHARACTER' && sel.selectionType !== 0) continue;
            const tag = sel.entrant?.participants?.[0]?.player?.gamerTag;
            const charId = sel.selectionValue;
            if (!tag || !charId) continue;
            const tagKey = tag.toLowerCase();
            if (!charCount[tagKey]) charCount[tagKey] = {};
            charCount[tagKey][charId] = (charCount[tagKey][charId] || 0) + 1;
          }
        }
      }
    } catch { break; }
    page++;
  } while (page <= totalPages && page <= 6);

  // Convertir a localCharId. Guardar tanto por clave lowercase como original.
  const result = {};
  for (const [tagKey, counts] of Object.entries(charCount)) {
    const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topId) continue;
    const charName = STARTGG_CHAR_NAMES[Number(topId)];
    const localId = charName ? findLocalCharId(charName) : null;
    if (localId) result[tagKey] = localId;
  }
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();
  const expected = process.env.ADMIN_SECRET || 'afk-admin-2025';
  const authHeader = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  const authQuery  = (req.query.secret || '').trim();
  if (authHeader !== expected && authQuery !== expected)
    return res.status(401).json({ error: 'No autorizado' });

  // Soporta parámetros tanto por body (POST) como por query string (GET)
  const community = req.body?.community || req.query.community;
  const year       = req.body?.year      || req.query.year;
  const force      = req.body?.force !== undefined ? req.body.force : true; // GET siempre force
  if (!community || !year) return res.status(400).json({ error: 'community y year requeridos' });

  const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET || '';
  if (!token) return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });

  const key = crTournamentsKey(community, year);
  const raw = await redis.get(key);
  const tournaments = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];

  let updated = 0;

  for (const t of tournaments) {
    const slug = t.slug;
    if (!slug || typeof slug !== 'string') continue;
    const cleanSlug = slug
      .replace(/^https?:\/\/(www\.)?start\.gg\//, '')
      .replace(/\/brackets(\/.*)?$/, '')
      .replace(/\/(details|registration|results)(\/.*)?$/, '');
    if (!cleanSlug.includes('/event/')) continue;

    try {
      const charMap = await fetchCharMap(token, cleanSlug);
      if (!Object.keys(charMap).length) continue;

      let changed = false;
      for (const s of (t.standings || [])) {
        if (s.charId && !force) continue; // ya tiene, no sobreescribir (salvo force=true)
        const key2 = (s.playerName || '').toLowerCase();
        if (charMap[key2]) {
          s.charId = charMap[key2];
          changed = true;
        }
      }
      if (changed) updated++;
    } catch { /* continuar con el siguiente */ }
  }

  await redis.set(key, JSON.stringify(tournaments));
  return res.status(200).json({ ok: true, updated, total: tournaments.length });
}
