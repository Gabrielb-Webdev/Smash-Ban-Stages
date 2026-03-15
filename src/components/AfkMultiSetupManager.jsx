// ============================================================
// AFK MULTI-SETUP MANAGER
// Panel para manejar múltiples setups simultáneos en AFK.
// - 1 setup va al stream overlay
// - hasta 5 setups son offline (mismas reglas, sin stream)
// ============================================================
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';

// Definición de los 6 setups fijos
const SETUPS = [
  { id: 'afk-stream',  label: 'Setup Stream', icon: '📡', color: '#DC2626', isStream: true  },
  { id: 'afk-setup1',  label: 'Setup 1',       icon: '🎮', color: '#7C3AED', isStream: false },
  { id: 'afk-setup2',  label: 'Setup 2',       icon: '🎮', color: '#2563EB', isStream: false },
  { id: 'afk-setup3',  label: 'Setup 3',       icon: '🎮', color: '#059669', isStream: false },
  { id: 'afk-setup4',  label: 'Setup 4',       icon: '🎮', color: '#D97706', isStream: false },
  { id: 'afk-setup5',  label: 'Setup 5',       icon: '🎮', color: '#DB2777', isStream: false },
];

const PHASE_LABELS = {
  RPS:              { text: 'Esperando RPS',      color: '#6B7280' },
  CHARACTER_SELECT: { text: 'Eligiendo personaje', color: '#8B5CF6' },
  STAGE_BAN:        { text: 'Baneando stages',    color: '#EF4444' },
  STAGE_SELECT:     { text: 'Eligiendo stage',    color: '#3B82F6' },
  PLAYING:          { text: '▶ EN JUEGO',          color: '#10B981' },
  FINISHED:         { text: '✓ Finalizado',        color: '#6B7280' },
};

let socket = null;

export default function AfkMultiSetupManager() {
  const [sessions, setSessions] = useState({}); // { sessionId: sessionData }
  const [connected, setConnected] = useState(false);

  // Formulario de nuevo match (por setup)
  const [forms, setForms] = useState(
    Object.fromEntries(SETUPS.map(s => [s.id, { player1: '', player2: '', format: 'BO3' }]))
  );
  const [showForm, setShowForm] = useState(null); // setupId con formulario abierto
  const [showQR, setShowQR] = useState(null);     // setupId con QR abierto
  const [confirmReset, setConfirmReset] = useState(null);

  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://smash-ban-stages.vercel.app';

  // ── Conexión WebSocket ─────────────────────────────────────
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    socket.on('connect', () => {
      setConnected(true);
      // Unirse a todas las sesiones de setup AFK
      SETUPS.forEach(setup => {
        socket.emit('join-session', setup.id);
      });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('session-joined', (data) => {
      const s = data.session;
      setSessions(prev => ({ ...prev, [s.sessionId]: s }));
    });

    socket.on('session-created', (data) => {
      const s = data.session;
      setSessions(prev => ({ ...prev, [s.sessionId]: s }));
    });

    socket.on('session-updated', (data) => {
      const s = data.session;
      setSessions(prev => ({ ...prev, [s.sessionId]: s }));
    });

    socket.on('series-finished', (data) => {
      const s = data.session;
      setSessions(prev => ({ ...prev, [s.sessionId]: s }));
    });

    return () => { if (socket) socket.disconnect(); };
  }, []);

  // ── Crear / reiniciar sesión para un setup ─────────────────
  const handleCreate = (setupId) => {
    const form = forms[setupId];
    if (!form.player1.trim() || !form.player2.trim()) return;
    if (!socket || !socket.connected) return;

    socket.emit('create-session', {
      sessionId: setupId,
      community: 'afk',
      player1: form.player1.trim(),
      player2: form.player2.trim(),
      format: form.format,
    });
    setShowForm(null);
  };

  const handleReset = (setupId) => {
    if (!socket || !socket.connected) return;
    const session = sessions[setupId];
    if (!session) return;
    socket.emit('create-session', {
      sessionId: setupId,
      community: 'afk',
      player1: session.player1.name,
      player2: session.player2.name,
      format: session.format,
    });
    setConfirmReset(null);
  };

  const updateForm = (setupId, field, value) => {
    setForms(prev => ({ ...prev, [setupId]: { ...prev[setupId], [field]: value } }));
  };

  // ── Render ─────────────────────────────────────────────────
  const streamUrl  = (id) => `${baseUrl}/stream/${id}`;
  const tabletUrl  = (id) => `${baseUrl}/tablet/${id === 'afk-stream' ? 'afk' : id}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black" style={{ fontFamily: 'Anton' }}>
            🎮 AFK — MULTI SETUP
          </h1>
          <p className="text-white/50 text-sm mt-1">6 setups simultáneos · 1 stream + 5 offline</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{
              background: connected ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              color: connected ? '#10B981' : '#EF4444',
              border: `1px solid ${connected ? '#10B981' : '#EF4444'}44`,
            }}
          >
            {connected ? '● Conectado' : '○ Desconectado'}
          </span>
        </div>
      </div>

      {/* Grid de setups */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {SETUPS.map(setup => {
          const session = sessions[setup.id];
          const phase = session ? PHASE_LABELS[session.phase] || { text: session.phase, color: '#6B7280' } : null;
          const hasSession = !!session;

          return (
            <div
              key={setup.id}
              className="rounded-2xl overflow-hidden flex flex-col"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${setup.isStream ? setup.color + '66' : 'rgba(255,255,255,0.08)'}`,
                boxShadow: setup.isStream ? `0 0 24px ${setup.color}22` : 'none',
              }}
            >
              {/* Header del card */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                  background: setup.isStream
                    ? `linear-gradient(135deg, ${setup.color}33, ${setup.color}11)`
                    : 'rgba(255,255,255,0.03)',
                  borderBottom: `1px solid ${setup.isStream ? setup.color + '44' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{setup.icon}</span>
                  <span className="font-bold text-sm tracking-wide" style={{ color: setup.isStream ? setup.color : '#fff' }}>
                    {setup.label}
                  </span>
                  {setup.isStream && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: setup.color + '33', color: setup.color, border: `1px solid ${setup.color}55` }}
                    >
                      STREAM
                    </span>
                  )}
                </div>
                {phase && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: phase.color + '22', color: phase.color, border: `1px solid ${phase.color}44` }}
                  >
                    {phase.text}
                  </span>
                )}
              </div>

              {/* Cuerpo del card */}
              <div className="p-4 flex-1 flex flex-col gap-3">
                {hasSession ? (
                  <>
                    {/* Jugadores y score */}
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <p className="text-white font-bold text-base truncate">{session.player1.name}</p>
                        <p
                          className="text-3xl font-black"
                          style={{ fontFamily: 'Anton', color: '#60A5FA' }}
                        >
                          {session.player1.score}
                        </p>
                      </div>
                      <div className="text-white/30 text-lg font-bold px-2">VS</div>
                      <div className="text-center flex-1">
                        <p className="text-white font-bold text-base truncate">{session.player2.name}</p>
                        <p
                          className="text-3xl font-black"
                          style={{ fontFamily: 'Anton', color: '#F87171' }}
                        >
                          {session.player2.score}
                        </p>
                      </div>
                    </div>

                    {/* Info extra */}
                    <div className="flex items-center justify-between text-xs text-white/40">
                      <span>Game {session.currentGame}</span>
                      <span>{session.format}</span>
                      {session.selectedStage && session.phase === 'PLAYING' && (
                        <span className="text-green-400/70">📍 {session.selectedStage}</span>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-2 flex-wrap">
                      <a
                        href={tabletUrl(setup.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center text-xs font-bold py-2 px-3 rounded-lg transition-all active:scale-95"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                        }}
                      >
                        📱 Tablet
                      </a>
                      {setup.isStream && (
                        <a
                          href={streamUrl(setup.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center text-xs font-bold py-2 px-3 rounded-lg transition-all active:scale-95"
                          style={{
                            background: setup.color + '22',
                            border: `1px solid ${setup.color}55`,
                            color: setup.color,
                          }}
                        >
                          📡 Overlay
                        </a>
                      )}
                      <button
                        onClick={() => setShowQR(showQR === setup.id ? null : setup.id)}
                        className="text-xs font-bold py-2 px-3 rounded-lg transition-all active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                      >
                        QR
                      </button>
                      <button
                        onClick={() => setConfirmReset(setup.id)}
                        className="text-xs font-bold py-2 px-2 rounded-lg transition-all active:scale-95"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}
                        title="Reiniciar match"
                      >
                        ↺
                      </button>
                      <button
                        onClick={() => setShowForm(setup.id)}
                        className="text-xs font-bold py-2 px-2 rounded-lg transition-all active:scale-95"
                        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#60A5FA' }}
                        title="Nuevo match"
                      >
                        ✏
                      </button>
                    </div>

                    {/* QR panel */}
                    {showQR === setup.id && (
                      <div className="rounded-xl p-3 flex flex-col items-center gap-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-xs text-white/50 font-bold">TABLET URL</p>
                        <QRCodeSVG value={tabletUrl(setup.id)} size={120} bgColor="transparent" fgColor="#ffffff" />
                        <p className="text-xs text-white/40 text-center break-all">{tabletUrl(setup.id)}</p>
                      </div>
                    )}
                  </>
                ) : (
                  /* Sin sesión activa */
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
                    <p className="text-white/30 text-sm">Sin match activo</p>
                    <button
                      onClick={() => setShowForm(showForm === setup.id ? null : setup.id)}
                      className="text-sm font-bold px-5 py-2.5 rounded-xl transition-all active:scale-95"
                      style={{
                        background: `linear-gradient(135deg, ${setup.color}33, ${setup.color}11)`,
                        border: `1px solid ${setup.color}55`,
                        color: setup.color,
                      }}
                    >
                      + Nuevo Match
                    </button>
                  </div>
                )}

                {/* Formulario inline */}
                {showForm === setup.id && (
                  <div
                    className="rounded-xl p-3 flex flex-col gap-2.5 mt-1"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Nuevo Match</p>
                    <input
                      type="text"
                      placeholder="Jugador 1"
                      value={forms[setup.id].player1}
                      onChange={e => updateForm(setup.id, 'player1', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    />
                    <input
                      type="text"
                      placeholder="Jugador 2"
                      value={forms[setup.id].player2}
                      onChange={e => updateForm(setup.id, 'player2', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    />
                    <div className="flex gap-2">
                      {['BO3', 'BO5'].map(f => (
                        <button
                          key={f}
                          onClick={() => updateForm(setup.id, 'format', f)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                          style={{
                            background: forms[setup.id].format === f ? setup.color : 'rgba(255,255,255,0.06)',
                            border: `1px solid ${forms[setup.id].format === f ? setup.color : 'rgba(255,255,255,0.12)'}`,
                            color: forms[setup.id].format === f ? '#fff' : 'rgba(255,255,255,0.5)',
                          }}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCreate(setup.id)}
                        disabled={!forms[setup.id].player1.trim() || !forms[setup.id].player2.trim()}
                        className="flex-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
                        style={{ background: setup.color, color: '#fff' }}
                      >
                        Iniciar Match
                      </button>
                      <button
                        onClick={() => setShowForm(null)}
                        className="py-2 px-3 rounded-lg text-xs transition-all"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de confirmación de reset */}
      {confirmReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setConfirmReset(null)}
        >
          <div
            className="rounded-2xl p-6 max-w-xs w-full mx-4 text-center"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-4xl mb-3">⚠️</p>
            <p className="font-bold text-white text-lg mb-1">¿Reiniciar match?</p>
            <p className="text-white/50 text-sm mb-5">
              Se reiniciará el match de <strong>{SETUPS.find(s => s.id === confirmReset)?.label}</strong> con los mismos jugadores.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleReset(confirmReset)}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ background: '#EF4444', color: '#fff' }}
              >
                Reiniciar
              </button>
              <button
                onClick={() => setConfirmReset(null)}
                className="flex-1 py-3 rounded-xl font-bold text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
