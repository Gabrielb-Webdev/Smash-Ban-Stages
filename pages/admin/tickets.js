// /admin/tickets — Panel de revisión de tickets/disputas para admin y soporte
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { getStoredUser, verifySession } from '../../src/utils/auth';
import { CHARACTERS, charImgPath, stockIconPath } from '../../lib/characters';

const REASON_LABELS = {
  wrong_result:    'Resultado incorrecto',
  wrong_stocks:    'Stocks incorrectos',
  wrong_character: 'Personaje incorrecto',
  other:           'Otro',
};

const STATUS_LABELS = {
  open:      { label: 'Abierto',     color: '#F59E0B' },
  in_review: { label: 'En revisión', color: '#818CF8' },
  resolved:  { label: 'Resuelto',    color: '#22C55E' },
  rejected:  { label: 'Rechazado',   color: '#6B7280' },
};

function timeAgo(iso) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)   return `hace ${d}s`;
  if (d < 3600) return `hace ${Math.floor(d/60)}m`;
  if (d < 86400) return `hace ${Math.floor(d/3600)}h`;
  return `hace ${Math.floor(d/86400)}d`;
}

export default function TicketsAdmin() {
  const [user, setUser]           = useState(null);
  const [authorized, setAuthorized] = useState(null); // null=loading, true, false
  const [tickets, setTickets]     = useState([]);
  const [filter, setFilter]       = useState('open');  // open | closed | all
  const [selected, setSelected]   = useState(null);    // Ticket seleccionado
  const [image, setImage]         = useState(null);    // base64 de evidencia
  const [chatMsg, setChatMsg]     = useState('');
  const [sending, setSending]     = useState(false);
  const [resolveAction, setResolveAction] = useState('');
  const [resolveStocks, setResolveStocks] = useState(2);
  const [resolveNote, setResolveNote]     = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');

  // Usuarios de soporte
  const [supportUsers, setSupportUsers] = useState([]);
  const [newSupportId, setNewSupportId] = useState('');
  const [managingSupport, setManagingSupport] = useState(false);

  const tokenRef = useRef(null);

  // ── Auth ──────────────────────────────────────────────────────
  useEffect(() => {
    async function check() {
      const session = await verifySession();
      if (!session || (!session.isAdmin && !session.isSupport)) {
        setAuthorized(false);
        return;
      }
      tokenRef.current = getStoredUser()?.access_token;
      setUser(session.user);
      setAuthorized(true);
    }
    check();
  }, []);

  // ── Cargar tickets ─────────────────────────────────────────────
  useEffect(() => {
    if (!authorized) return;
    loadTickets();
  }, [authorized, filter]);

  async function loadTickets() {
    const res = await fetch(`/api/tickets?status=${filter}`, {
      headers: { Authorization: `Bearer ${tokenRef.current}` },
    });
    if (res.ok) {
      const data = await res.json();
      // Ordenar por fecha desc
      setTickets((data.tickets || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }
  }

  // ── Cargar usuarios soporte ────────────────────────────────────
  useEffect(() => {
    if (!authorized || !user?.isAdmin) return;
    fetch('/api/admin/support-users', { headers: { Authorization: `Bearer ${tokenRef.current}` } })
      .then(r => r.json()).then(d => setSupportUsers(d.users || []));
  }, [authorized]);

  // ── Abrir ticket ──────────────────────────────────────────────
  async function openTicket(ticket) {
    setSelected(ticket);
    setResolveAction('');
    setResolveNote('');
    setResolveError('');
    setImage(null);
    // Cargar imagen y datos actualizados
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      headers: { Authorization: `Bearer ${tokenRef.current}` },
    });
    if (res.ok) {
      const { ticket: t, imageBase64 } = await res.json();
      setSelected(t);
      setImage(imageBase64);
    }
  }

  // ── Enviar mensaje ─────────────────────────────────────────────
  async function sendMessage() {
    if (!chatMsg.trim() || !selected) return;
    setSending(true);
    const res = await fetch(`/api/tickets/${selected.id}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify({ text: chatMsg }),
    });
    if (res.ok) {
      const { ticket: t } = await res.json();
      setSelected(t);
      setChatMsg('');
      setTickets(prev => prev.map(tk => tk.id === t.id ? t : tk));
    }
    setSending(false);
  }

  // ── Resolver ticket ────────────────────────────────────────────
  async function resolve() {
    if (!resolveAction || !selected) return;
    setResolving(true);
    setResolveError('');
    const body = { action: resolveAction, note: resolveNote || undefined };
    if (resolveAction === 'change_stocks') body.newStocks = resolveStocks;
    const res = await fetch(`/api/tickets/${selected.id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setSelected(data.ticket);
      setTickets(prev => prev.filter(tk => tk.id !== data.ticket.id));
      setResolveAction('');
    } else {
      setResolveError(data.error || 'Error al resolver');
    }
    setResolving(false);
  }

  // ── Agregar soporte ────────────────────────────────────────────
  async function addSupport() {
    if (!newSupportId.trim()) return;
    const res = await fetch('/api/admin/support-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify({ userId: newSupportId.trim() }),
    });
    if (res.ok) {
      setSupportUsers(prev => [...prev, { userId: newSupportId.trim(), name: newSupportId.trim() }]);
      setNewSupportId('');
    }
  }

  async function removeSupport(uid) {
    await fetch('/api/admin/support-users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenRef.current}` },
      body: JSON.stringify({ userId: uid }),
    });
    setSupportUsers(prev => prev.filter(u => u.userId !== uid));
  }

  // ── Loading / No auth ──────────────────────────────────────────
  if (authorized === null) {
    return <div style={{ minHeight: '100vh', background: '#0E0E1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>Verificando acceso...</div>;
  }
  if (!authorized) {
    return (
      <div style={{ minHeight: '100vh', background: '#0E0E1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <p style={{ color: '#EF4444', fontSize: 16, fontWeight: 700 }}>Acceso denegado</p>
        <Link href="/home" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>← Volver al inicio</Link>
      </div>
    );
  }

  const openCount   = tickets.filter(t => t.status === 'open' || t.status === 'in_review').length;
  const resolvedCnt = tickets.filter(t => t.status === 'resolved').length;

  return (
    <>
      <Head>
        <title>Tickets — Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`* { box-sizing: border-box; } body { margin: 0; background: #0E0E1A; color: #fff; font-family: 'Outfit', sans-serif; }`}</style>
      </Head>

      <div style={{ minHeight: '100vh', background: '#0E0E1A', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/_panel" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textDecoration: 'none' }}>← Panel</Link>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>🎫 Tickets</h1>
          {openCount > 0 && <span style={{ background: '#EF4444', color: '#fff', borderRadius: 8, padding: '2px 7px', fontSize: 11, fontWeight: 800 }}>{openCount}</span>}
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Columna izquierda — Lista */}
          <div style={{ width: selected ? 'min(320px, 38%)' : '100%', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: 6, padding: 12, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {[['open', 'Abiertos'], ['closed', 'Cerrados'], ['all', 'Todos']].map(([val, label]) => (
                <button key={val} onClick={() => { setFilter(val); setSelected(null); }}
                  style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', background: filter === val ? '#FF8C00' : 'rgba(255,255,255,0.06)', color: filter === val ? '#000' : 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Lista tickets */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {tickets.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No hay tickets</div>
              ) : tickets.map(t => {
                const st = STATUS_LABELS[t.status] || STATUS_LABELS.open;
                return (
                  <div key={t.id} onClick={() => openTicket(t)}
                    style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: selected?.id === t.id ? 'rgba(255,140,0,0.08)' : 'transparent', transition: 'background 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{t.reporterName}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: st.color, border: `1px solid ${st.color}40`, borderRadius: 5, padding: '1px 5px' }}>{st.label}</span>
                    </div>
                    <p style={{ margin: '0 0 3px', fontSize: 11, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{REASON_LABELS[t.reason] || t.reason} · vs {t.opponentName}</p>
                    <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{timeAgo(t.createdAt)} {t.messages?.length > 0 ? `· 💬 ${t.messages.length}` : ''}</p>
                  </div>
                );
              })}
            </div>

            {/* Soporte — solo global admin */}
            {user?.isAdmin && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: 12 }}>
                <button onClick={() => setManagingSupport(p => !p)} style={{ width: '100%', padding: '7px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  👥 Usuarios de soporte ({supportUsers.length})
                </button>
                {managingSupport && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {supportUsers.map(u => (
                      <div key={u.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 7 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{u.name}</span>
                        <button onClick={() => removeSupport(u.userId)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', borderRadius: 5, color: '#EF4444', fontSize: 11, padding: '2px 7px', cursor: 'pointer' }}>×</button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input value={newSupportId} onChange={e => setNewSupportId(e.target.value)} placeholder="userId o slug" style={{ flex: 1, padding: '6px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#fff', fontSize: 11, outline: 'none', fontFamily: 'inherit' }} />
                      <button onClick={addSupport} style={{ background: '#22C55E', border: 'none', borderRadius: 7, color: '#000', fontWeight: 800, fontSize: 11, padding: '6px 10px', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Columna derecha — Detalle */}
          {selected && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Header del ticket */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 18, cursor: 'pointer', padding: 0 }}>←</button>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Ticket de {selected.reporterName}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{timeAgo(selected.createdAt)} · {selected.id}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: STATUS_LABELS[selected.status]?.color, border: `1px solid ${STATUS_LABELS[selected.status]?.color}40`, borderRadius: 6, padding: '3px 8px' }}>{STATUS_LABELS[selected.status]?.label}</span>
              </div>

              {/* Info del match */}
              {selected.matchEntry && (() => {
                const me = selected.matchEntry;
                return (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Match</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#22C55E' }}>{me.winnerName}</p>
                        <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Ganador · {me.stocksWon} stocks</p>
                        {me.rpDelta !== undefined && <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 800, color: '#22C55E' }}>+{me.rpDelta} RR</p>}
                      </div>
                      <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)' }}>vs</span>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: '#EF4444' }}>{me.loserName}</p>
                        <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Perdedor</p>
                        {me.loserRpDelta !== undefined && <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 800, color: '#EF4444' }}>{me.loserRpDelta} RR</p>}
                      </div>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Plataforma: {me.platform} · MMR W: {me.mmrWinnerBefore}→{me.mmrWinnerAfter} · MMR L: {me.mmrLoserBefore}→{me.mmrLoserAfter}</p>
                  </div>
                );
              })()}

              {/* Razón y descripción */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px' }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, color: '#F59E0B' }}>{REASON_LABELS[selected.reason] || selected.reason}</p>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{selected.description}</p>
              </div>

              {/* Evidencia */}
              {image && (
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, overflow: 'hidden' }}>
                  <p style={{ margin: 0, padding: '8px 12px', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Evidencia</p>
                  <img src={image} alt="evidencia" style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'contain', background: '#000' }} />
                </div>
              )}

              {/* Chat */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
                <p style={{ margin: 0, padding: '8px 12px', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Chat</p>
                <div style={{ maxHeight: 200, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(!selected.messages || selected.messages.length === 0) ? (
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>Sin mensajes aún</p>
                  ) : selected.messages.map((msg, i) => (
                    <div key={i} style={{ padding: '7px 10px', borderRadius: 8, background: msg.role === 'support' ? 'rgba(129,140,248,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${msg.role === 'support' ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                      <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: msg.role === 'support' ? '#818CF8' : '#F59E0B' }}>{msg.fromName} {msg.role === 'support' ? '(soporte)' : ''}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{msg.text}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{timeAgo(msg.at)}</p>
                    </div>
                  ))}
                </div>
                {(selected.status === 'open' || selected.status === 'in_review') && (
                  <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
                    <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Escribir mensaje..." style={{ flex: 1, padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
                    <button onClick={sendMessage} disabled={sending || !chatMsg.trim()} style={{ background: '#818CF8', border: 'none', borderRadius: 8, color: '#000', fontWeight: 800, fontSize: 12, padding: '7px 12px', cursor: 'pointer' }}>Enviar</button>
                  </div>
                )}
              </div>

              {/* Acciones de resolución */}
              {(selected.status === 'open' || selected.status === 'in_review') && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Resolución</p>

                  {/* Botones de acción */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { action: 'change_winner', label: '✅ Cambiar ganador', color: '#22C55E' },
                      { action: 'change_stocks', label: '🔢 Cambiar stocks',  color: '#818CF8' },
                      { action: 'delete_match',  label: '🗑️ Eliminar match', color: '#EF4444' },
                      { action: 'reject',         label: '❌ Rechazar',        color: '#6B7280' },
                    ].map(({ action, label, color }) => (
                      <button key={action} onClick={() => setResolveAction(resolveAction === action ? '' : action)}
                        style={{ padding: '9px', borderRadius: 9, border: `1px solid ${resolveAction === action ? color : 'rgba(255,255,255,0.1)'}`, background: resolveAction === action ? `${color}20` : 'rgba(255,255,255,0.03)', color: resolveAction === action ? color : 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s' }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Opciones extra según acción */}
                  {resolveAction === 'change_stocks' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Nuevos stocks:</span>
                      {[1, 2, 3].map(s => (
                        <button key={s} onClick={() => setResolveStocks(s)} style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${resolveStocks === s ? '#818CF8' : 'rgba(255,255,255,0.12)'}`, background: resolveStocks === s ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.04)', color: resolveStocks === s ? '#818CF8' : 'rgba(255,255,255,0.6)', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>{s}</button>
                      ))}
                    </div>
                  )}

                  {resolveAction && (
                    <>
                      <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)} rows={2} placeholder="Nota interna (opcional)..." style={{ padding: '7px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12, fontFamily: 'inherit', resize: 'none', outline: 'none' }} />

                      {resolveError && <p style={{ margin: 0, fontSize: 12, color: '#EF4444' }}>{resolveError}</p>}

                      <button onClick={resolve} disabled={resolving}
                        style={{ padding: '10px', background: resolveAction === 'reject' ? '#6B7280' : resolveAction === 'delete_match' ? '#EF4444' : '#22C55E', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 800, fontSize: 13, cursor: resolving ? 'default' : 'pointer', opacity: resolving ? 0.6 : 1 }}>
                        {resolving ? 'Procesando...' : 'Confirmar acción'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Resolución ya aplicada */}
              {selected.resolution && (
                <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resolución aplicada</p>
                  <p style={{ margin: '0 0 2px', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Acción: <strong>{selected.resolution.action}</strong> por {selected.resolution.resolvedByName}</p>
                  {selected.resolution.note && <p style={{ margin: '0 0 2px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Nota: {selected.resolution.note}</p>}
                  <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{timeAgo(selected.resolution.resolvedAt)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
