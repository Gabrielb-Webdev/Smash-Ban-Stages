/**
 * POST /api/community-ranking/auto-chars
 * Para cada jugador del ranking sin personaje asignado:
 *   1. Consulta los entrants de cada evento para obtener su userSlug de Start.GG
 *   2. Verifica si ya existe en el cache de stats (startgg:stats:v16:{slug})
 *   3. Si no, consulta sus sets recientes en Start.GG para detectar el personaje más usado
 *   4. Guarda los personajes encontrados como overrides manuales
 */
import redis, { crTournamentsKey, crCharOverrideKey } from '../../../lib/redis';
import { buildRanking } from '../../../lib/communityRanking';
import { findLocalCharId } from '../../../lib/characters';

const ADMIN_SECRET = 'afk-admin-2025';
const STARTGG_API = 'https://api.start.gg/gql/alpha';
const SSBU_GAME_ID = 1386;

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

// Query 1: obtener entrants de un evento para mapear gamerTag → userSlug
const Q_ENTRANTS = `
query EventEntrants($slug: String!, $page: Int!, $perPage: Int!) {
  event(slug: $slug) {
    entrants(query: { page: $page, perPage: $perPage }) {
      pageInfo { totalPages }
      nodes {
        participants {
          player {
            gamerTag
            user { slug }
          }
        }
      }
    }
  }
}`;

// Query 2: sets recientes de un jugador para detectar su personaje más usado
const Q_PLAYER_SETS = `
query PlayerCharLookup($slug: String!, $page: Int!, $perPage: Int!) {
  user(slug: $slug) {
    player {
      id
      sets(page: $page, perPage: $perPage) {
        nodes {
          slots {
            entrant {
              id
              participants { player { id } }
            }
          }
          games {
            selections {
              entrant { id }
              selectionType
              selectionValue
            }
          }
          event {
            videogame { id }
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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_SECRET}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { community, year } = req.body || {};
  if (!community || !year) return res.status(400).json({ error: 'community y year son requeridos' });

  const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET || '';
  if (!token) return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });

  const [raw, rawOverrides] = await Promise.all([
    redis.get(crTournamentsKey(community, year)),
    redis.get(crCharOverrideKey(community, year)).catch(() => null),
  ]);

  const tournaments = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
  const overrides = rawOverrides
    ? (typeof rawOverrides === 'string' ? JSON.parse(rawOverrides) : rawOverrides)
    : {};

  const players = buildRanking(tournaments);

  // Solo jugadores que no tienen personaje en standings NI en overrides manuales
  const needy = players.filter(p => {
    const key = p.name.toLowerCase().trim();
    return !p.topChar && !overrides[key];
  });

  if (needy.length === 0) {
    return res.status(200).json({
      ok: true, assigned: [], skipped: [],
      message: 'Todos los jugadores ya tienen personaje asignado',
    });
  }

  // ── Fase 1: construir mapa gamerTag → userSlug a partir de entrants de cada evento ──
  const slugMap = {}; // gamerTag_lower → userSlug
  for (const t of tournaments) {
    const rawSlug = t.slug || '';
    if (!rawSlug.includes('/event/')) continue;
    const cleanSlug = rawSlug.replace(/^https?:\/\/(www\.)?start\.gg\//, '');

    try {
      let page = 1, totalPages = 1;
      do {
        const data = await gqlQuery(token, Q_ENTRANTS, { slug: cleanSlug, page, perPage: 100 });
        const entrantsData = data?.event?.entrants;
        if (!entrantsData) break;
        totalPages = entrantsData.pageInfo?.totalPages || 1;
        for (const node of (entrantsData.nodes || [])) {
          for (const participant of (node.participants || [])) {
            const tag = participant.player?.gamerTag;
            const userSlug = participant.player?.user?.slug;
            if (tag && userSlug) {
              slugMap[tag.toLowerCase().trim()] = userSlug;
            }
          }
        }
        page++;
      } while (page <= totalPages && page <= 3);
      await sleep(150);
    } catch {
      // continuar con el siguiente torneo
    }
  }

  // ── Fase 2: para cada jugador que necesita personaje, buscarlo en Start.GG ──
  const assigned = [];
  const skipped = [];

  for (const player of needy) {
    const nameKey = player.name.toLowerCase().trim();
    const userSlug = slugMap[nameKey];

    if (!userSlug) {
      skipped.push({ name: player.name, reason: 'No encontrado como usuario de Start.GG' });
      continue;
    }

    // Intentar con el cache de stats de la app (si ya fue cargado)
    try {
      const sgCache = await redis.get(`startgg:stats:v16:${userSlug}`);
      if (sgCache) {
        const parsed = typeof sgCache === 'string' ? JSON.parse(sgCache) : sgCache;
        const localCharId = parsed?.charUsage?.[0]?.localCharId || null;
        if (localCharId) {
          overrides[nameKey] = localCharId;
          assigned.push({ name: player.name, charId: localCharId, source: 'cache' });
          continue;
        }
      }
    } catch { /* continuar */ }

    // Consultar Start.GG directamente: sets recientes del jugador
    try {
      const data = await gqlQuery(token, Q_PLAYER_SETS, { slug: userSlug, page: 1, perPage: 50 });
      const playerData = data?.user?.player;

      if (!playerData) {
        skipped.push({ name: player.name, reason: 'Jugador no encontrado en Start.GG' });
        await sleep(200);
        continue;
      }

      const playerId = String(playerData.id);
      const sets = playerData.sets?.nodes || [];
      const charCounts = {}; // startggCharId → count

      for (const set of sets) {
        if (!set.slots || !set.games) continue;
        // Filtrar solo sets de SSBU
        const vgId = set.event?.videogame?.id;
        if (vgId && Number(vgId) !== SSBU_GAME_ID) continue;

        // Encontrar qué slot/entrant corresponde a este jugador
        const mySlot = set.slots.find(s =>
          s.entrant?.participants?.some(p => String(p.player?.id) === playerId)
        );
        if (!mySlot) continue;

        const myEntrantId = String(mySlot.entrant.id);
        const opponentSlot = set.slots.find(s => s !== mySlot);
        const opponentEntrantId = opponentSlot?.entrant?.id ? String(opponentSlot.entrant.id) : null;

        for (const game of (set.games || [])) {
          if (!game.selections) continue;

          const charSels = game.selections.filter(
            s => s.selectionType === 'CHARACTER' || s.selectionType === 0
          );

          // Estrategia 1: match directo por entrant ID
          let mySel = charSels.find(s => String(s.entrant?.id) === myEntrantId);

          // Estrategia 2: exclusión (si el contrario se identifica, el restante es mío)
          if (!mySel && opponentEntrantId && charSels.length >= 2) {
            const notOpponent = charSels.filter(s => String(s.entrant?.id) !== opponentEntrantId);
            if (notOpponent.length === 1) mySel = notOpponent[0];
          }

          if (mySel?.selectionValue) {
            const cid = mySel.selectionValue;
            charCounts[cid] = (charCounts[cid] || 0) + 1;
          }
        }
      }

      // Determinar el personaje más usado
      const topEntry = Object.entries(charCounts).sort((a, b) => b[1] - a[1])[0];
      if (topEntry) {
        const [startggCharId] = topEntry;
        const charName = STARTGG_CHAR_NAMES[Number(startggCharId)];
        const localId = charName ? findLocalCharId(charName) : null;
        if (localId) {
          overrides[nameKey] = localId;
          assigned.push({
            name: player.name,
            charId: localId,
            charName,
            games: topEntry[1],
            source: 'startgg',
          });
        } else {
          skipped.push({ name: player.name, reason: `Personaje sin imagen local: ${charName || startggCharId}` });
        }
      } else {
        skipped.push({ name: player.name, reason: 'No hay datos de personaje en sus sets (sets sin game data)' });
      }

      await sleep(250);
    } catch (err) {
      skipped.push({ name: player.name, reason: err.message || 'Error consultando Start.GG' });
      await sleep(200);
    }
  }

  // Guardar overrides actualizados si hubo cambios
  if (assigned.length > 0) {
    await redis.set(crCharOverrideKey(community, year), overrides);
  }

  return res.status(200).json({
    ok: true,
    assigned,
    skipped,
    message: assigned.length > 0
      ? `✅ ${assigned.length} personaje(s) detectado(s) automáticamente`
      : '⚠️ No se pudo detectar ningún personaje. Los torneos locales suelen no registrar picks por juego en Start.GG.',
  });
}
