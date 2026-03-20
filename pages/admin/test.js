import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { getStoredUser, logout, verifySession } from '../../src/utils/auth';

const TOURNAMENT_SLUG = 'tournament/asd3';

const STATE_COLORS = {
  CREATED:   { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.3)',  text: '#22C55E' },
  ACTIVE:    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', text: '#3B82F6' },
  COMPLETED: { bg: 'rgba(107,114,128,0.12)',border: 'rgba(107,114,128,0.3)',text: '#9CA3AF' },
  CANCELLED: { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  text: '#EF4444' },
};

export default function TestAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [tournament, setTournament] = useState(null);
  const [loadingTournament, setLoadingTournament] = useState(false);
  const [tournamentError, setTournamentError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Auth guard
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.access_token) { router.replace('/login'); return; }

    verifySession().then(data => {
      if (!data) { router.replace('/login'); return; }
      if (!data.isAdmin) { router.replace('/home'); return; }
      setUser(data.user);
      setChecking(false);
    });
  }, []);

  // Cargar datos del torneo
  useEffect(() => {
    if (checking) return;
    setLoadingTournament(true);
    fetch(`/api/tournaments/info?slug=${encodeURIComponent(TOURNAMENT_SLUG)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setTournamentError(data.error); }
        else { setTournament(data); }
      })
      .catch(e => setTournamentError(e.message))
      .finally(() => setLoadingTournament(false));
  }, [checking]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stateStyle = tournament ? (STATE_COLORS[tournament.stateLabel] || STATE_COLORS.CREATED) : null;
  const startDate = tournament?.startAt
    ? new Date(tournament.startAt).toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })
    : null;

  return (
    <>
      <Head>
        <title>Test — Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#0B0B12', fontFamily: "'Outfit', sans-serif", padding: '0 0 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>🧪</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.5px' }}>Panel Test</span>
          </div>

          {/* User dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '6px 12px', cursor: 'pointer' }}
            >
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} style={{ width: 28, height: 28, borderRadius: '50%' }} />
                : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#374151' }} />}
              <span style={{ color: '#D1D5DB', fontSize: 13 }}>{user?.name}</span>
              <svg width={12} height={12} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#6B7280' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, width: 180, background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden', zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', fontSize: 13, color: '#D1D5DB', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }} onClick={() => setDropdownOpen(false)}>
                  🎮 Panel Admin
                </Link>
                <Link href="/home" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', fontSize: 13, color: '#D1D5DB', textDecoration: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)' }} onClick={() => setDropdownOpen(false)}>
                  🏠 Home
                </Link>
                <button onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', fontSize: 13, color: '#F87171', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  🚪 Salir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>

          <h2 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 800, color: '#fff' }}>
            Torneo vinculado
          </h2>

          {loadingTournament && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#9CA3AF', fontSize: 14 }}>
              <div style={{ width: 20, height: 20, border: '2px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Cargando datos del torneo...
            </div>
          )}

          {tournamentError && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, padding: '16px 20px', color: '#F87171', fontSize: 14 }}>
              Error: {tournamentError}
            </div>
          )}

          {tournament && (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden' }}>

              {/* Banner / imagen */}
              {tournament.image && (
                <div style={{ height: 160, background: `url(${tournament.image}) center/cover no-repeat`, borderBottom: '1px solid rgba(255,255,255,0.06)' }} />
              )}

              <div style={{ padding: '24px 24px 20px' }}>

                {/* Nombre + estado */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{tournament.name}</h3>
                  {stateStyle && (
                    <span style={{ flexShrink: 0, background: stateStyle.bg, border: `1px solid ${stateStyle.border}`, color: stateStyle.text, borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 700 }}>
                      {tournament.stateLabel}
                    </span>
                  )}
                </div>

                {/* Datos */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {startDate && (
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px' }}>
                      <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fecha</p>
                      <p style={{ margin: 0, fontSize: 13, color: '#E5E7EB', fontWeight: 600 }}>{startDate}</p>
                    </div>
                  )}
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Inscriptos</p>
                    <p style={{ margin: 0, fontSize: 13, color: '#E5E7EB', fontWeight: 600 }}>{tournament.attendees}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Organizador</p>
                    <p style={{ margin: 0, fontSize: 13, color: '#E5E7EB', fontWeight: 600 }}>{tournament.owner || '—'}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Inscripción</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: tournament.registrationOpen ? '#22C55E' : '#EF4444' }}>
                      {tournament.registrationOpen ? '✅ Abierta' : '❌ Cerrada'}
                    </p>
                  </div>
                </div>

                {/* Eventos */}
                {tournament.events.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Eventos</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {tournament.events.map(ev => (
                        <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px' }}>
                          {ev.gameImage && <img src={ev.gameImage} alt={ev.game} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff' }}>{ev.name}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{ev.game} · {ev.entrants} participantes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Link a start.gg */}
                <a
                  href={tournament.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', color: '#fff', borderRadius: 14, padding: '13px 20px', fontWeight: 800, fontSize: 15, textDecoration: 'none', width: '100%', boxSizing: 'border-box' }}
                >
                  Ver en start.gg →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
