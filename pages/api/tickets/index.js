// POST /api/tickets        — Crear un nuevo ticket (jugador autenticado)
// GET  /api/tickets        — Listar tickets:
//   - admin/soporte: listar por status (todos)
//   - jugador: listar solo los propios

import redis, {
  ticketKey, ticketsOpenKey, ticketsByUserKey, ticketsByMatchKey,
  ticketImageKey, matchHistoryKey,
} from '../../../lib/redis';
import { getTicketUser, canManageTickets } from '../../../lib/ticketAuth';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

const TICKET_TTL      = 90 * 24 * 60 * 60; // 90 días
const MAX_DESC_LENGTH = 500;
const HOURS_LIMIT     = 48;

export default async function handler(req, res) {
  // ─── GET: listar tickets ──────────────────────────────────────
  if (req.method === 'GET') {
    const tu = await getTicketUser(req);
    if (!tu) return res.status(401).json({ error: 'No autenticado' });

    // Admin/soporte: devuelve lista filtrada por status
    if (canManageTickets(tu)) {
      const status = req.query.status || 'open'; // open | closed | all
      let ids = [];
      if (status === 'open' || status === 'all') {
        const open = await redis.lrange(ticketsOpenKey, 0, 199);
        ids = ids.concat(open.map(v => typeof v === 'string' ? v : JSON.stringify(v)));
      }
      if (status === 'closed' || status === 'all') {
        const closed = await redis.lrange('tickets:closed', 0, 199);
        ids = ids.concat(closed.map(v => typeof v === 'string' ? v : JSON.stringify(v)));
      }
      const tickets = (await Promise.all(ids.map(id => redis.get(ticketKey(id))))).filter(Boolean);
      return res.status(200).json({ tickets });
    }

    // Jugador: solo sus propios tickets
    const userId = req.query.userId || tu.userId;
    if (userId !== tu.userId) return res.status(403).json({ error: 'Acceso denegado' });

    const ids = await redis.lrange(ticketsByUserKey(tu.userId), 0, 49);
    const tickets = (await Promise.all(ids.map(id => {
      const idStr = typeof id === 'string' ? id : JSON.stringify(id);
      return redis.get(ticketKey(idStr));
    }))).filter(Boolean);
    return res.status(200).json({ tickets });
  }

  // ─── POST: crear ticket ───────────────────────────────────────
  if (req.method === 'POST') {
    const tu = await getTicketUser(req);
    if (!tu) return res.status(401).json({ error: 'No autenticado' });

    const { matchId, reason, description, imageBase64 } = req.body || {};

    // Validaciones básicas
    if (!matchId) return res.status(400).json({ error: 'matchId requerido' });
    if (!reason || !['wrong_result', 'wrong_stocks', 'wrong_character', 'other'].includes(reason)) {
      return res.status(400).json({ error: 'reason inválido' });
    }
    if (!description || description.trim().length < 10) {
      return res.status(400).json({ error: 'Descripción demasiado corta (mínimo 10 caracteres)' });
    }
    if (description.length > MAX_DESC_LENGTH) {
      return res.status(400).json({ error: `Descripción demasiado larga (máximo ${MAX_DESC_LENGTH} caracteres)` });
    }
    if (!imageBase64) return res.status(400).json({ error: 'La imagen es obligatoria como evidencia' });

    // Verificar que la imagen no supere ~600KB en base64 (800KB antes de encode64 overhead)
    if (imageBase64.length > 800_000) {
      return res.status(400).json({ error: 'Imagen demasiado grande. Comprimí antes de enviar (máx ~500KB)' });
    }

    // Buscar el matchEntry en el historial del jugador
    const histIds = await redis.lrange(matchHistoryKey(tu.userId), 0, 49);
    const allEntries = histIds.map(e => (typeof e === 'string' ? JSON.parse(e) : e));
    const matchEntry = allEntries.find(e => String(e.matchId) === String(matchId));

    if (!matchEntry) {
      return res.status(404).json({ error: 'Match no encontrado en tu historial' });
    }

    // Solo ranked (tiene rpDelta y no es casual)
    if (matchEntry.rpDelta === undefined && matchEntry.loserRpDelta === undefined) {
      return res.status(400).json({ error: 'Solo se pueden reportar partidas ranked' });
    }

    // Límite de 48hs
    const playedAt = new Date(matchEntry.playedAt).getTime();
    if (Date.now() - playedAt > HOURS_LIMIT * 60 * 60 * 1000) {
      return res.status(400).json({ error: `Solo podés reportar partidas de las últimas ${HOURS_LIMIT} horas` });
    }

    // Verificar si ya existe un ticket abierto para este match por este jugador
    const existingIds = await redis.lrange(ticketsByMatchKey(String(matchId)), 0, 19);
    for (const eid of existingIds) {
      const existing = await redis.get(ticketKey(typeof eid === 'string' ? eid : String(eid)));
      if (existing && String(existing.reporterId) === tu.userId && existing.status !== 'rejected') {
        return res.status(409).json({ error: 'Ya tenés un ticket abierto para este match' });
      }
    }

    // Determinar oponente
    const opponentId   = String(matchEntry.winnerId) === tu.userId ? String(matchEntry.loserId) : String(matchEntry.winnerId);
    const opponentName = String(matchEntry.winnerId) === tu.userId ? matchEntry.loserName : matchEntry.winnerName;

    // Crear ticket
    const ticketId = `tkt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const ticket = {
      id: ticketId,
      matchId: String(matchId),
      matchEntry,
      reporterId:   tu.userId,
      reporterName: tu.name,
      opponentId,
      opponentName,
      reason,
      description: description.trim(),
      status: 'open',
      resolution: null,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    // Guardar ticket + imagen por separado (TTL 90 días)
    await Promise.all([
      redis.set(ticketKey(ticketId), ticket, { ex: TICKET_TTL }),
      redis.set(ticketImageKey(ticketId), imageBase64, { ex: TICKET_TTL }),
      redis.lpush(ticketsOpenKey, ticketId),
      redis.lpush(ticketsByUserKey(tu.userId), ticketId),
      redis.lpush(ticketsByMatchKey(String(matchId)), ticketId),
    ]);

    return res.status(201).json({ ticket });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
