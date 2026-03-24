// GET  /api/tournaments/featured          → lista de torneos destacados (público)
// POST /api/tournaments/featured          → agregar torneo + push a todos (requiere auth)
// DELETE /api/tournaments/featured?slug=X → quitar torneo (requiere auth)

import redis from '../../../lib/redis';
import { sendPushToAll } from '../../../lib/push';

const FEATURED_KEY  = 'tournaments:featured';
const STARTGG_API   = 'https://api.start.gg/gql/alpha';
const STATE_LABELS  = { 1: 'CREATED', 2: 'ACTIVE', 3: 'COMPLETED', 4: 'CANCELLED' };

const QUERY = `
query TournamentInfo($slug: String!) {
  tournament(slug: $slug) {
    id name slug startAt endAt state numAttendees isRegistrationOpen
    url(relative: false)
    images { url type }
    events { id name slug numEntrants }
  }
}`;

function parseSlug(raw) {
  let s = String(raw || '').trim();
  s = s.replace(/^https?:\/\/(www\.)?start\.gg\//, '');
  s = s.replace(/\/(details|brackets|events|registration|standings|results)(\/.*)?$/, '');
  s = s.replace(/\/$/, '');
  return s;
}

function sanitize(s) {
  return String(s ?? '').replace(/[<>"'`]/g, '').trim().slice(0, 300);
}

function checkAuth(req) {
  const auth = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  const secret = process.env.ADMIN_SECRET || 'afk-admin-2025';
  return auth === secret;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: lista pública ──
  if (req.method === 'GET') {
    try {
      const list = (await redis.get(FEATURED_KEY)) || [];
      return res.status(200).json({ featured: Array.isArray(list) ? list : [] });
    } catch (err) {
      return res.status(500).json({ error: 'Error al leer Redis', detail: err.message });
    }
  }

  // ── POST: agregar torneo + notificar ──
  if (req.method === 'POST') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'No autorizado' });

    const { url: rawUrl, notify = true } = req.body || {};
    const slug = parseSlug(rawUrl);
    if (!slug || !/^[\w/-]+$/.test(slug))
      return res.status(400).json({ error: 'URL o slug inválido' });

    const token = process.env.START_GG_API_TOKEN || process.env.START_GG_CLIENT_SECRET || '';
    if (!token) return res.status(500).json({ error: 'START_GG_API_TOKEN no configurado' });

    let tourData;
    try {
      const sgRes = await fetch(STARTGG_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: QUERY, variables: { slug } }),
      });
      if (!sgRes.ok) return res.status(502).json({ error: 'Error consultando Start.gg' });
      const body = await sgRes.json();
      if (body.errors) return res.status(502).json({ error: body.errors[0].message });
      const t = body.data?.tournament;
      if (!t) return res.status(404).json({ error: 'Torneo no encontrado en Start.gg' });

      tourData = {
        id: String(t.id),
        slug: t.slug,
        name: sanitize(t.name),
        url: t.url || `https://www.start.gg/${t.slug}`,
        startAt: t.startAt ? new Date(t.startAt * 1000).toISOString() : null,
        endAt:   t.endAt   ? new Date(t.endAt   * 1000).toISOString() : null,
        state: t.state,
        stateLabel: STATE_LABELS[t.state] || String(t.state),
        attendees: t.numAttendees || 0,
        registrationOpen: !!t.isRegistrationOpen,
        image: t.images?.find(i => i.type === 'profile')?.url || t.images?.[0]?.url || null,
        events: (t.events || []).map(e => ({
          id: String(e.id),
          name: sanitize(e.name),
          slug: e.slug || null,
          entrants: e.numEntrants || 0,
        })),
        addedAt: new Date().toISOString(),
        _featured: true,
      };
    } catch (err) {
      return res.status(500).json({ error: 'Error consultando Start.gg', detail: err.message });
    }

    // Guardar en Redis (dedup por slug, el nuevo va primero)
    try {
      const existing = (await redis.get(FEATURED_KEY)) || [];
      const deduped = Array.isArray(existing) ? existing.filter(t => t.slug !== tourData.slug) : [];
      deduped.unshift(tourData);
      await redis.set(FEATURED_KEY, deduped);
    } catch (err) {
      return res.status(500).json({ error: 'Error guardando en Redis', detail: err.message });
    }

    // Push a todos los usuarios (no bloquea)
    if (notify !== false) {
      sendPushToAll({
        title: `🏆 Nuevo torneo: ${tourData.name}`,
        body: tourData.registrationOpen
          ? '¡Las inscripciones están abiertas! Anotate ahora.'
          : tourData.startAt
            ? `📅 ${new Date(tourData.startAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : 'Próximamente en la app.',
        tag: `tournament-${tourData.id}`,
        data: { url: tourData.url, tournamentId: tourData.id, type: 'new_tournament' },
      }).catch(() => {});
    }

    return res.status(201).json({ success: true, tournament: tourData });
  }

  // ── DELETE: quitar torneo ──
  if (req.method === 'DELETE') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'No autorizado' });

    const rawSlug = req.query.slug || '';
    if (!rawSlug || !/^[\w/-]+$/.test(String(rawSlug)))
      return res.status(400).json({ error: 'Slug inválido' });

    try {
      const existing = (await redis.get(FEATURED_KEY)) || [];
      const filtered = Array.isArray(existing) ? existing.filter(t => t.slug !== rawSlug) : [];
      await redis.set(FEATURED_KEY, filtered);
      return res.status(200).json({ success: true, removed: rawSlug });
    } catch (err) {
      return res.status(500).json({ error: 'Error en Redis', detail: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
