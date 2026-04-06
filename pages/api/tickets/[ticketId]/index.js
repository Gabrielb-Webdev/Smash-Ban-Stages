// GET   /api/tickets/[ticketId]  — Ver detalle de un ticket
// PATCH /api/tickets/[ticketId]  — Cambiar status (admin/soporte)

import redis, { ticketKey, ticketImageKey, ticketsOpenKey } from '../../../../lib/redis';
import { getTicketUser, canManageTickets } from '../../../../lib/ticketAuth';

export default async function handler(req, res) {
  const { ticketId } = req.query;
  if (!ticketId) return res.status(400).json({ error: 'ticketId requerido' });

  const tu = await getTicketUser(req);
  if (!tu) return res.status(401).json({ error: 'No autenticado' });

  const ticket = await redis.get(ticketKey(ticketId));
  if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

  // Solo el reportador o admin/soporte puede ver el ticket
  const isOwner = String(ticket.reporterId) === tu.userId;
  if (!isOwner && !canManageTickets(tu)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  // ─── GET ────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    let imageBase64 = null;
    if (canManageTickets(tu) || isOwner) {
      try { imageBase64 = await redis.get(ticketImageKey(ticketId)); } catch { /* ignorar */ }
    }
    return res.status(200).json({ ticket, imageBase64 });
  }

  // ─── PATCH: cambiar status ───────────────────────────────────────
  if (req.method === 'PATCH') {
    if (!canManageTickets(tu)) return res.status(403).json({ error: 'Sin permiso' });

    const { status } = req.body || {};
    const validStatuses = ['open', 'in_review', 'resolved', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'status inválido' });
    }

    const wasOpen = ticket.status === 'open' || ticket.status === 'in_review';
    const nowClosed = status === 'resolved' || status === 'rejected';

    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    await redis.set(ticketKey(ticketId), ticket);

    // Mover entre listas open/closed si corresponde
    if (wasOpen && nowClosed) {
      await redis.lrem(ticketsOpenKey, 0, ticketId);
      await redis.lpush('tickets:closed', ticketId);
    } else if (!wasOpen && !nowClosed) {
      await redis.lrem('tickets:closed', 0, ticketId);
      await redis.lpush(ticketsOpenKey, ticketId);
    }

    return res.status(200).json({ ticket });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
