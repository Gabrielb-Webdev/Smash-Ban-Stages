// POST /api/tickets/[ticketId]/message — Enviar mensaje en un ticket

import redis, { ticketKey } from '../../../../../lib/redis';
import { getTicketUser, canManageTickets } from '../../../../../lib/ticketAuth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ticketId } = req.query;
  const tu = await getTicketUser(req);
  if (!tu) return res.status(401).json({ error: 'No autenticado' });

  const ticket = await redis.get(ticketKey(ticketId));
  if (!ticket) return res.status(404).json({ error: 'Ticket no encontrado' });

  const isOwner   = String(ticket.reporterId) === tu.userId;
  const isSupport = canManageTickets(tu);

  if (!isOwner && !isSupport) return res.status(403).json({ error: 'Acceso denegado' });
  if (ticket.status === 'resolved' || ticket.status === 'rejected') {
    return res.status(400).json({ error: 'No se puede enviar mensajes en un ticket cerrado' });
  }

  const { text } = req.body || {};
  if (!text || text.trim().length === 0) return res.status(400).json({ error: 'Mensaje vacío' });
  if (text.length > 1000) return res.status(400).json({ error: 'Mensaje demasiado largo (máx 1000 caracteres)' });

  const message = {
    from:      tu.userId,
    fromName:  tu.name,
    role:      isSupport ? 'support' : 'player',
    text:      text.trim(),
    at:        new Date().toISOString(),
  };

  if (!Array.isArray(ticket.messages)) ticket.messages = [];
  ticket.messages.push(message);
  ticket.updatedAt = new Date().toISOString();

  // Auto-cambiar status a in_review si soporte responde a un ticket open
  if (isSupport && ticket.status === 'open') {
    ticket.status = 'in_review';
  }

  await redis.set(ticketKey(ticketId), ticket);
  return res.status(200).json({ message, ticket });
}
