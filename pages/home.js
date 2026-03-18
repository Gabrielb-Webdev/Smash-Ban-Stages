import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getStoredUser, logout } from '../src/utils/auth';
import { RANKS, TIER_ICONS } from '../lib/ranks';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

/* ─── PLATAFORMAS ─────────────────────────────── */
const PLATFORMS = [
  { id: 'parsec', label: 'Parsec',        icon: '🖥️', from: '#7C3AED', to: '#3730A3' },
  { id: 'switch', label: 'Switch Online', icon: '🎮', from: '#DC2626', to: '#9F1239' },
];

/* ─── SVG HELPERS ─────────────────────────────── */
function Svg({ children, size = 24, sw = 1.7 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={sw} stroke="currentColor" width={size} height={size}>
      {children}
    </svg>
  );
}

const ICO = {
  home:      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />,
  trophy:    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />,
  calendar:  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />,
  bulb:      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />,
  bolt:      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />,
  bell:      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />,
  chevron:   <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />,
  back:      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />,
  settings:  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />,
};

/* ─── ROOT ─────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();
  const [user, setUser]       = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab]         = useState('inicio');
  const [showMenu, setShowMenu] = useState(false);
  const [notifs, setNotifs]       = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifToast, setNotifToast] = useState(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.replace('/login'); return; }

    // Detectar sesión desactualizada: el nombre es un slug hexadecimal (ej: "ead8fa65")
    // o coincide con el slug. En ese caso forzamos re-login para obtener datos frescos.
    const u = stored.user;
    const nameIsStale = !u?.name
      || u.name === u?.slug
      || /^[0-9a-f]{6,16}$/i.test(u.name);

    if (nameIsStale) {
      if (typeof window !== 'undefined') localStorage.removeItem('afk_user');
      router.replace('/login');
      return;
    }

    setUser(u);
    setIsAdmin(!!stored.isAdmin);
    // Guardar perfil del jugador en Redis
    if (u.id) {
      fetch('/api/players/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, name: u.name, slug: u.slug, avatar: u.avatar }),
      }).catch(() => {});
    }
  }, []);

  // Polling de notificaciones
  useEffect(() => {
    if (!user) return;
    const name = user.name || (user.slug || '').replace(/^user\//, '') || 'Usuario';

    const fetchNotifs = async () => {
      try {
        const r = await fetch(`/api/notifications/inbox?name=${encodeURIComponent(name)}`);
        if (!r.ok) return;
        const data = await r.json();
        if (!Array.isArray(data)) return;
        setNotifs(prev => {
          const prevIds = new Set(prev.map(n => n.id));
          const newUnread = data.filter(n => !prevIds.has(n.id) && !n.readAt);
          if (newUnread.length > 0) {
            setNotifToast(newUnread[newUnread.length - 1]);
            setTimeout(() => setNotifToast(null), 6000);
          }
          return data;
        });
      } catch {}
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B0B12' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #E88E00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const displayName = user.name || (user.slug || '').replace(/^user\//, '') || 'Usuario';
  const initial = displayName[0]?.toUpperCase() || '?';
  const unreadCount = notifs.filter(n => !n.readAt).length;

  const dismissNotif = async (id) => {
    try {
      await fetch('/api/notifications/send', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: displayName }),
      });
    } catch {}
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  };

  return (
    <>
      <Head>
        <title>AFK Smash</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap');
          * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
          body { background: #0B0B12; margin: 0; }
          ::-webkit-scrollbar { display: none; }
          .tab-content { animation: fadeUp 0.18s ease; }
          @keyframes fadeUp    { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
          @keyframes spin      { to { transform: rotate(360deg) } }
          @keyframes pulse-ring { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.12)} }
          @keyframes glow-pulse { 0%,100%{box-shadow:0 0 12px rgba(232,142,0,0.35)} 50%{box-shadow:0 0 28px rgba(232,142,0,0.7)} }
          @keyframes slideUp   { from { transform: translateY(100%) } to { transform: translateY(0) } }
          @keyframes shimmer   { to { background-position: -200% 0 } }
          .shimmer { background: linear-gradient(90deg,#13131E 25%,#1E1E2E 50%,#13131E 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
          .gamer-card { transition: border-color 0.2s, box-shadow 0.2s; }
          .gamer-card:hover { border-color: rgba(232,142,0,0.35) !important; box-shadow: 0 0 20px rgba(232,142,0,0.07) !important; }
          .btn-gamer:active { transform: scale(0.97); }
        `}</style>
      </Head>

      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: '#0B0B12', display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* ── TOP BAR ── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          padding: '13px 18px 12px',
          background: 'rgba(11,11,18,0.92)',
          backdropFilter: 'blur(28px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, boxShadow: '0 0 16px rgba(232,142,0,0.55), 0 4px 12px rgba(0,0,0,0.4)', animation: 'glow-pulse 3s ease-in-out infinite' }}>
              🎮
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: '0.04em', color: '#fff', textTransform: 'uppercase' }}>AFK</span>
              <span style={{ fontWeight: 300, fontSize: 17, color: 'rgba(232,142,0,0.7)', marginLeft: 3, letterSpacing: '0.06em' }}>SMASH</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em', marginLeft: 5, alignSelf: 'center' }}>v{APP_VERSION}</span>
            </div>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

            {/* Campana */}
            <button
              id="app-bell-btn"
              onClick={() => { setShowNotifs(v => !v); setShowMenu(false); }}
              style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', color: unreadCount > 0 ? '#FF8C00' : 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', zIndex: 51 }}
            >
              <Svg size={22} sw={1.8}>{ICO.bell}</Svg>
              {unreadCount > 0 && (
                <div style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: 'linear-gradient(135deg,#EF4444,#DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#fff', border: '2px solid #0B0B12', padding: '0 2px', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>

            {/* Perfil — oculto en la app mobile vía #app-profile-header */}
            <div id="app-profile-header" style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setShowMenu(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
              {user.avatar
                ? <img src={user.avatar} alt={displayName} style={{ width: 36, height: 36, borderRadius: '50%', border: showMenu ? '2px solid #FF8C00' : '2px solid rgba(232,142,0,0.4)', objectFit: 'cover', transition: 'border 0.15s' }} />
                : <div style={{ width: 36, height: 36, borderRadius: '50%', background: showMenu ? 'linear-gradient(135deg,#FF8C00,#E85D00)' : 'linear-gradient(135deg,rgba(232,142,0,0.3),rgba(232,142,0,0.1))', border: '2px solid rgba(232,142,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#fff', transition: 'all 0.15s' }}>
                    {initial}
                  </div>
              }
            </button>
            </div>
          </div>
        </header>

        {/* ── PROFILE MENU OVERLAY ── */}
        {showMenu && (
          <>
            <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
            <div style={{
              position: 'fixed', top: 66, right: 'max(calc(50% - 240px + 14px), 14px)',
              zIndex: 46, background: '#161620', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 18, padding: 6, minWidth: 220,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              animation: 'fadeUp 0.15s ease',
            }}>
              {/* User info */}
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
                {user.avatar
                  ? <img src={user.avatar} alt={displayName} style={{ width: 42, height: 42, borderRadius: 13, objectFit: 'cover', border: '2px solid rgba(232,142,0,0.4)' }} />
                  : <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff' }}>{initial}</div>
                }
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                  {user.slug && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>@{user.slug}</p>}
                </div>
              </div>
              {/* Menu items */}
              {[{icon:'🎮', label:'Mi perfil', sub:'Start.GG', action: () => { setShowMenu(false); router.push('/profile'); }},
                {icon:'⚙️', label:'Configuración', sub:'Preferencias', action: () => { setShowMenu(false); }},
              ].map(item => (
                <button key={item.label} onClick={item.action} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{item.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#fff' }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{item.sub}</p>
                  </div>
                </button>
              ))}
              {/* Logout */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4, paddingTop: 4 }}>
                <button onClick={() => { logout(); setShowMenu(false); window.location.href = '/login'; }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: '#ef4444' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>🚪</span>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Cerrar sesión</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(239,68,68,0.6)' }}>Salir de la cuenta</p>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── NOTIFICATION DRAWER ── */}
        {showNotifs && (
          <>
            <div onClick={() => setShowNotifs(false)} style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
            <div style={{
              position: 'fixed',
              bottom: 0,
              left: 'max(0px, calc(50% - 240px))',
              right: 'max(0px, calc(50% - 240px))',
              zIndex: 46,
              background: '#0F0F18',
              borderRadius: '24px 24px 0 0',
              padding: '20px 18px 48px',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
              animation: 'slideUp 0.22s ease',
              maxHeight: '80dvh',
              overflowY: 'auto',
            }}>
              {/* Handle */}
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 20px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff' }}>Notificaciones</h2>
                {unreadCount > 0 && (
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '4px 10px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>{unreadCount} {unreadCount === 1 ? 'nueva' : 'nuevas'}</span>
                  </div>
                )}
              </div>
              {notifs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 40 }}>🔔</div>
                  <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Sin notificaciones</p>
                  <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Te avisamos acá cuando sea tu turno</p>
                </div>
              ) : (
                [...notifs].reverse().map(n => (
                  <NotifCard key={n.id} notif={n} onDismiss={dismissNotif} />
                ))
              )}
            </div>
          </>
        )}

        {/* ── NOTIF TOAST ── */}
        {notifToast && (
          <div style={{
            position: 'fixed', top: 76,
            left: 'max(16px, calc(50% - 224px))',
            right: 'max(16px, calc(50% - 224px))',
            zIndex: 100,
            background: '#1c1c1c',
            border: '1px solid rgba(232,142,0,0.35)',
            borderRadius: 20,
            padding: '14px 16px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', gap: 12,
            animation: 'fadeUp 0.2s ease',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(232,142,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎮</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 800, color: '#fff' }}>¡Es tu turno!</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notifToast.setup} — {notifToast.sentBy}</p>
            </div>
            <button onClick={() => setNotifToast(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
          </div>
        )}

        {/* ── CONTENT ── */}
        <main key={tab} className="tab-content" style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
          {tab === 'inicio'   && <TabInicio   user={user} isAdmin={isAdmin} router={router} displayName={displayName} initial={initial} setTab={setTab} />}
          {tab === 'rankings' && <TabRankings />}
          {tab === 'torneos'  && <TabTorneos  />}
          {tab === 'tips'     && <TabTips     />}
          {tab === 'match'    && <TabMatch    />}
        </main>

        {/* ── BOTTOM NAV ── */}
        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </>
  );
}

/* ─── BOTTOM NAV ────────────────────────────────── */
function BottomNav({ tab, setTab }) {
  const leftItems = [
    { id: 'inicio',   label: 'Inicio',   icon: ICO.home   },
    { id: 'rankings', label: 'Rankings', icon: ICO.trophy },
  ];
  const rightItems = [
    { id: 'torneos',  label: 'Torneos',  icon: ICO.calendar },
    { id: 'tips',     label: 'Tips',     icon: ICO.bulb     },
  ];
  const matchActive = tab === 'match';

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 50,
      background: 'rgba(11,11,18,0.97)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'flex-end',
      height: 60,
      overflow: 'visible',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {/* Tabs izquierdos */}
      {leftItems.map(item => {
        const active = tab === item.id;
        return (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 5,
            padding: '8px 2px 12px',
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: active ? '#FF8C00' : 'rgba(255,255,255,0.28)',
            transition: 'color 0.15s',
          }}>
            <Svg size={20} sw={active ? 2.2 : 1.6}>{item.icon}</Svg>
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1 }}>
              {item.label}
            </span>
          </button>
        );
      })}

      {/* MATCH — botón central elevado */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative', height: '100%' }}>
        <button
          onClick={() => setTab('match')}
          style={{
            position: 'absolute',
            bottom: 0,
            width: 88,
            height: 70,
            background: matchActive
              ? 'linear-gradient(170deg, #e84040 0%, #b01010 100%)'
              : 'linear-gradient(170deg, #c92020 0%, #8c0e0e 100%)',
            clipPath: 'polygon(14% 0%, 86% 0%, 100% 100%, 0% 100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            border: 'none', cursor: 'pointer',
            color: '#fff',
            filter: matchActive
              ? 'drop-shadow(0 -4px 12px rgba(220,40,40,0.7))'
              : 'drop-shadow(0 -2px 8px rgba(180,20,20,0.45))',
            transition: 'filter 0.2s, background 0.2s',
            paddingBottom: 6,
          }}
        >
          <Svg size={20} sw={2.4}>{ICO.bolt}</Svg>
          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', lineHeight: 1 }}>
            MATCH
          </span>
        </button>
      </div>

      {/* Tabs derechos */}
      {rightItems.map(item => {
        const active = tab === item.id;
        return (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 5,
            padding: '8px 2px 12px',
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: active ? '#FF8C00' : 'rgba(255,255,255,0.28)',
            transition: 'color 0.15s',
          }}>
            <Svg size={20} sw={active ? 2.2 : 1.6}>{item.icon}</Svg>
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1 }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/* ─── SECTION HEADER ────────────────────────────── */
function SectionTitle({ children, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#FF8C00,#E85D00)', boxShadow: '0 0 8px rgba(232,142,0,0.6)', flexShrink: 0, display: 'inline-block' }} />
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', margin: 0 }}>{children}</p>
      </div>
      {action && <button onClick={onAction} style={{ fontSize: 11, color: '#FF8C00', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{action}</button>}
    </div>
  );
}

/* ─── STAT CARD ─────────────────────────────────── */
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{
      flex: 1, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: '14px 10px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      position: 'relative', overflow: 'hidden',
    }}>
      {accent && (
        <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${accent}60,transparent)` }} />
      )}
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 21, fontWeight: 900, color: accent || '#fff', lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>{label}</span>
      {sub && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{sub}</span>}
    </div>
  );
}

/* ─── TAG ────────────────────────────────────────── */
function Tag({ children, color = '#FF8C00' }) {
  return (
    <span style={{
      fontSize: 8.5, fontWeight: 800, padding: '3px 7px', borderRadius: 4,
      background: `${color}18`, color, border: `1px solid ${color}35`,
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   COMPONENTES DE RANKED
═══════════════════════════════════════════════════ */
function RankBadge({ rankName }) {
  const rankObj = RANKS.find(r => r.name === rankName) || RANKS[0];
  const icon    = TIER_ICONS[rankObj.tier] || '🎮';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20,
      background: rankObj.bg, border: `1px solid ${rankObj.border}`,
      fontSize: 11, fontWeight: 800, color: rankObj.color, whiteSpace: 'nowrap',
    }}>
      {icon} {rankObj.name}
    </span>
  );
}

function RankedPlayerRow({ position, player }) {
  const isSmasher = player.rank === 'Smasher';
  const rankObj   = RANKS.find(r => r.name === player.rank) || RANKS[0];
  const posIcon   = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : null;
  const rpts      = player.rankPoints || 0;
  const pct       = isSmasher ? null : Math.min(100, rpts);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: isSmasher ? 'rgba(255,140,0,0.08)' : '#10101A',
      border: `1px solid ${isSmasher ? 'rgba(255,140,0,0.28)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: 14, padding: '12px 14px',
    }}>
      <div style={{ width: 26, textAlign: 'center', flexShrink: 0 }}>
        {posIcon
          ? <span style={{ fontSize: 17 }}>{posIcon}</span>
          : <span style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.25)' }}>{position}</span>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: isSmasher ? '#FF8C00' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {player.userName}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RankBadge rankName={player.rank} />
          {isSmasher && <span style={{ fontSize: 10, color: '#FF8C00', fontWeight: 700 }}>{rpts} RP</span>}
        </div>
        {!isSmasher && (
          <div style={{ marginTop: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: rankObj.color, borderRadius: 4, transition: 'width 0.35s' }} />
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 800, color: '#fff' }}>
          <span style={{ color: '#22C55E' }}>{player.wins || 0}W</span>
          <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 3px' }}>·</span>
          <span style={{ color: '#EF4444' }}>{player.losses || 0}L</span>
        </p>
        {!isSmasher && (
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{rpts}/100 RP</p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB — INICIO
═══════════════════════════════════════════════════ */
function TabInicio({ user, isAdmin, router, displayName, initial, setTab }) {
  const [rankedStats, setRankedStats] = useState(null);
  const [topPlayers, setTopPlayers]   = useState({ switch: [], parsec: [] });
  const [torneos, setTorneos]         = useState([]);
  const [topPlat, setTopPlat]         = useState('switch');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const uid = String(user?.id || user?.slug || '');
    setLoadingData(true);
    Promise.all([
      uid ? fetch(`/api/players/stats?userId=${encodeURIComponent(uid)}`).then(r => r.json()).catch(() => null) : Promise.resolve(null),
      fetch('/api/ranked/leaderboard?platform=switch').then(r => r.json()).catch(() => []),
      fetch('/api/ranked/leaderboard?platform=parsec').then(r => r.json()).catch(() => []),
      fetch('/api/tournaments').then(r => r.json()).catch(() => []),
    ]).then(([stats, sw, ps, tc]) => {
      setRankedStats(stats);
      setTopPlayers({
        switch: Array.isArray(sw) ? sw.slice(0, 3) : [],
        parsec: Array.isArray(ps) ? ps.slice(0, 3) : [],
      });
      setTorneos(Array.isArray(tc) ? tc.slice(0, 3) : []);
      setLoadingData(false);
    });
  }, []);

  const totalW = (rankedStats?.switch?.wins   || 0) + (rankedStats?.parsec?.wins   || 0);
  const totalL = (rankedStats?.switch?.losses || 0) + (rankedStats?.parsec?.losses || 0);

  // Mejor rango entre plataformas
  const swIdx      = RANKS.findIndex(r => r.name === rankedStats?.switch?.rank);
  const psIdx      = RANKS.findIndex(r => r.name === rankedStats?.parsec?.rank);
  const bestRankName = (swIdx !== -1 || psIdx !== -1)
    ? (swIdx >= psIdx ? rankedStats?.switch?.rank : rankedStats?.parsec?.rank) || ''
    : '';
  const bestRankObj  = RANKS.find(r => r.name === bestRankName);
  const bestTierIcon = bestRankObj ? (TIER_ICONS[bestRankObj.tier] || '🎮') : null;

  return (
    <div>
      {/* ── Hero Banner ── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: '28px 20px 24px',
        background: 'linear-gradient(160deg, rgba(124,58,237,0.09) 0%, rgba(232,142,0,0.07) 50%, transparent 80%)',
      }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,142,0,0.09) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: -60, bottom: -20, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            {user.avatar
              ? <img src={user.avatar} alt={displayName} style={{ width: 56, height: 56, borderRadius: 18, border: '2px solid rgba(232,142,0,0.5)', objectFit: 'cover' }} />
              : <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff' }}>{initial}</div>
            }
            <div style={{ position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, borderRadius: '50%', background: '#22C55E', border: '2px solid #0B0B12', boxShadow: '0 0 8px rgba(34,197,94,0.7)' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: 2 }}>Bienvenido/a,</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1.1 }}>{displayName}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
              <Tag color="#FF8C00">AFK Smash</Tag>
              <Tag color="#6366F1">Buenos Aires</Tag>
            </div>
          </div>
        </div>

        {/* Stats + mejor rango */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          {/* W / L */}
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px 10px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, position: 'relative', overflow: 'hidden' }}>
            <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#22C55E55,transparent)' }} />
            <span style={{ fontSize: 20, fontWeight: 900, color: '#22C55E', lineHeight: 1 }}>{rankedStats ? `${totalW}W` : '—'}</span>
            {rankedStats && <span style={{ fontSize: 20, fontWeight: 900, color: '#EF4444', lineHeight: 1 }}>{totalL}L</span>}
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', marginTop: 4 }}>PARTIDAS</span>
          </div>
          {/* Mejor rango */}
          <div style={{ flex: 2, background: bestRankObj ? `linear-gradient(135deg, ${bestRankObj.color}18, rgba(0,0,0,0) 70%)` : 'rgba(255,255,255,0.025)', border: `1px solid ${bestRankObj ? bestRankObj.color + '30' : 'rgba(255,255,255,0.06)'}`, borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: bestRankObj ? `${bestRankObj.color}18` : 'rgba(255,255,255,0.05)', border: `2px solid ${bestRankObj ? bestRankObj.color + '40' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, boxShadow: bestRankObj ? `0 0 16px ${bestRankObj.color}30` : 'none' }}>
              {bestTierIcon || '?'}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 2 }}>MEJOR RANGO</p>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: bestRankObj ? bestRankObj.color : 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.1 }}>
                {bestRankName || 'UNRANKED'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 18px 24px' }}>

        {/* ── Quick Match CTA ── */}
        <button
          onClick={() => setTab('match')}
          className="btn-gamer"
          style={{
            width: '100%', marginBottom: 24, padding: '18px 20px',
            background: 'linear-gradient(135deg, #c92020 0%, #7a0808 100%)',
            border: '1px solid rgba(220,40,40,0.35)',
            borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', boxShadow: '0 8px 28px rgba(180,0,0,0.35)',
            position: 'relative', overflow: 'hidden', textAlign: 'left',
          }}
        >
          <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>⚡ Buscar Partida</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Jugá ranked ahora mismo</p>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Svg size={22} sw={2.5}>{ICO.chevron}</Svg>
          </div>
        </button>

        {/* ── Admin button ── */}
        {isAdmin && (
          <button onClick={() => router.push('/')} style={{
            width: '100%', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14,
            background: 'linear-gradient(135deg,rgba(232,142,0,0.12),rgba(232,80,0,0.06))',
            border: '1px solid rgba(232,142,0,0.2)', borderRadius: 18, padding: '14px 16px',
            cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 12px rgba(232,142,0,0.35)', flexShrink: 0 }}>🎛️</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 800, color: '#FF8C00', fontSize: 14 }}>Panel de Administración</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Gestionar torneos y setups</p>
            </div>
            <Svg size={18} sw={2}>{ICO.chevron}</Svg>
          </button>
        )}

        {/* ── Top Ranked ── */}
        <SectionTitle action="Ver todo" onAction={() => setTab('rankings')}>Top Ranked</SectionTitle>
        <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 3, display: 'flex', gap: 3, marginBottom: 12 }}>
          {[{ id: 'switch', label: '🎮 Switch' }, { id: 'parsec', label: '🖥️ Parsec' }].map(p => (
            <button key={p.id} onClick={() => setTopPlat(p.id)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 9, fontWeight: 700, fontSize: 11,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: topPlat === p.id ? 'linear-gradient(135deg,#FF8C00,#E85D00)' : 'transparent',
              color: topPlat === p.id ? '#fff' : 'rgba(255,255,255,0.3)',
              boxShadow: topPlat === p.id ? '0 3px 10px rgba(232,142,0,0.3)' : 'none',
            }}>{p.label}</button>
          ))}
        </div>
        {loadingData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {[1,2,3].map(i => (
              <div key={i} className="shimmer" style={{ height: 62, borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : topPlayers[topPlat].length === 0 ? (
          <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '24px 20px', textAlign: 'center', marginBottom: 24 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Sin jugadores rankeados aún</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {topPlayers[topPlat].map((p, i) => {
              const posIcon  = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
              const rankObj  = RANKS.find(r => r.name === p.rank) || RANKS[0];
              const isSmasher = p.rank === 'Smasher';
              return (
                <div key={p.userId} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: isSmasher ? 'rgba(255,140,0,0.08)' : 'rgba(255,255,255,0.025)',
                  border: `1px solid ${isSmasher ? 'rgba(255,140,0,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 14, padding: '12px 14px',
                }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{posIcon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: isSmasher ? '#FF8C00' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.userName}</p>
                    <div style={{ marginTop: 3 }}><RankBadge rankName={p.rank} /></div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>
                      <span style={{ color: '#22C55E' }}>{p.wins || 0}W</span>
                      <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 3px' }}>·</span>
                      <span style={{ color: '#EF4444' }}>{p.losses || 0}L</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Torneos ── */}
        <SectionTitle action="Ver todos" onAction={() => setTab('torneos')}>Torneos</SectionTitle>
        {loadingData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {[1,2].map(i => (
              <div key={i} className="shimmer" style={{ height: 66, borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : torneos.length === 0 ? (
          <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '24px 20px', textAlign: 'center', marginBottom: 24 }}>
            <p style={{ margin: '0 0 4px', fontSize: 28 }}>🏆</p>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Sin torneos próximos</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {torneos.map((t, i) => (
              <div key={i} style={{
                background: 'linear-gradient(135deg, rgba(232,142,0,0.07), rgba(0,0,0,0) 70%)',
                border: '1px solid rgba(232,142,0,0.15)',
                borderRadius: 16, padding: '13px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(232,142,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏆</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: 14, color: '#fff' }}>{t.name || t.tournamentName || 'Torneo'}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{t.date || t.startAt || 'Fecha por confirmar'}</p>
                </div>
                <Svg size={16} sw={2}>{ICO.chevron}</Svg>
              </div>
            ))}
          </div>
        )}

        {/* ── Comunidades ── */}
        <SectionTitle>Comunidades</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { name: 'Smash AFK', region: 'Buenos Aires', tag: 'LOCAL', tagColor: '#38BDF8', desc: 'Torneos semanales, ranking local y espacio de práctica competitiva.', icon: '🗺️', from: '#0C4A6E', to: '#0f172a', border: '1px solid rgba(56,189,248,0.15)' },
            { name: 'Smash INC', region: 'Nacional · Argentina', tag: 'NACIONAL', tagColor: '#FB923C', desc: 'Circuito nacional con ranking y torneos interregionales.', icon: '🏅', from: '#431407', to: '#1c0a00', border: '1px solid rgba(251,146,60,0.15)' },
          ].map(c => (
            <div key={c.name} className="gamer-card" style={{ background: `linear-gradient(135deg,${c.from},${c.to})`, border: c.border, borderRadius: 20, padding: '16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{c.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: '#fff' }}>{c.name}</span>
                  <Tag color={c.tagColor}>{c.tag}</Tag>
                </div>
                <p style={{ margin: '0 0 6px', fontSize: 11, color: c.tagColor, fontWeight: 600 }}>{c.region}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── NOTIF CARD ─────────────────────────────────── */
function NotifCard({ notif, onDismiss }) {
  const isRead = !!notif.readAt;
  const t = new Date(notif.sentAt);
  const timeStr = t.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      background: isRead ? '#10101A' : 'rgba(232,142,0,0.06)',
      border: `1px solid ${isRead ? 'rgba(255,255,255,0.05)' : 'rgba(232,142,0,0.22)'}`,
      borderRadius: 16, padding: '14px 16px', marginBottom: 10,
      display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: isRead ? 'rgba(255,255,255,0.04)' : 'rgba(232,142,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        🎮
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 800, color: isRead ? 'rgba(255,255,255,0.45)' : '#fff' }}>
          {notif.setup}
        </p>
        <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
          {notif.message}
        </p>
        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
          {timeStr} · {notif.sentBy}
        </p>
      </div>
      {!isRead && (
        <button onClick={() => onDismiss(notif.id)} style={{
          flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '5px 10px', color: 'rgba(255,255,255,0.5)',
          fontSize: 11, cursor: 'pointer', fontWeight: 600,
        }}>
          Leído
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB — RANKINGS
═══════════════════════════════════════════════════ */
function TabRankings() {
  const [mode,        setMode]       = useState('ba');
  const [rankPlat,    setRankPlat]   = useState('switch');
  const [rankBoard,   setRankBoard]  = useState([]);
  const [rankLoading, setRankLoading] = useState(false);

  const MODES = [
    { id: 'ba',     label: 'AFK'  },
    { id: 'inc',    label: 'INC'       },
    { id: 'char',   label: 'Personaje' },
    { id: 'ranked', label: 'Ranked'    },
  ];

  useEffect(() => {
    if (mode !== 'ranked') return;
    setRankLoading(true);
    fetch(`/api/ranked/leaderboard?platform=${rankPlat}`)
      .then(r => r.json())
      .then(d => { setRankBoard(Array.isArray(d) ? d : []); setRankLoading(false); })
      .catch(() => setRankLoading(false));
  }, [mode, rankPlat]);

  return (
    <div style={{ padding: '24px 18px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Rankings</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Clasificaciones de la comunidad</p>

      {/* Pill switcher */}
      <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, display: 'flex', gap: 4, marginBottom: 22 }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{
              flex: 1, padding: '9px 2px', borderRadius: 10, fontWeight: 700, fontSize: 11,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: mode === m.id ? 'linear-gradient(135deg,#FF8C00,#E85D00)' : 'transparent',
              color: mode === m.id ? '#fff' : 'rgba(255,255,255,0.3)',
              boxShadow: mode === m.id ? '0 4px 12px rgba(232,142,0,0.3)' : 'none',
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'ranked' ? (
        <>
          {/* Sub-selector de plataforma */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[{ id: 'switch', label: '🎮 Switch Online' }, { id: 'parsec', label: '🖥️ Parsec' }].map(p => (
              <button key={p.id} onClick={() => setRankPlat(p.id)} style={{
                flex: 1, padding: '10px 4px', borderRadius: 12, fontWeight: 700, fontSize: 12,
                cursor: 'pointer', transition: 'all 0.15s',
                background: rankPlat === p.id ? 'rgba(232,142,0,0.1)' : '#10101A',
                border: `1px solid ${rankPlat === p.id ? 'rgba(232,142,0,0.35)' : 'rgba(255,255,255,0.06)'}`,
                color: rankPlat === p.id ? '#FF8C00' : 'rgba(255,255,255,0.35)',
              }}>
                {p.label}
              </button>
            ))}
          </div>

          {rankLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ background: '#10101A', borderRadius: 14, padding: 14, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="shimmer" style={{ width: 28, height: 28, borderRadius: 8 }} />
                  <div style={{ flex: 1 }}>
                    <div className="shimmer" style={{ height: 12, width: '55%', borderRadius: 6, marginBottom: 7 }} />
                    <div className="shimmer" style={{ height: 10, width: '30%', borderRadius: 5 }} />
                  </div>
                  <div className="shimmer" style={{ width: 50, height: 28, borderRadius: 8 }} />
                </div>
              ))}
            </div>
          ) : rankBoard.length === 0 ? (
            <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '44px 24px', textAlign: 'center' }}>
              <span style={{ fontSize: 44 }}>⚔️</span>
              <p style={{ margin: '14px 0 6px', fontWeight: 800, fontSize: 16, color: '#fff' }}>Sin partidas ranked aún</p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Jugá partidas en la sección Match para aparecer en este ranking</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rankBoard.some(p => p.rank === 'Smasher') && (
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#FF8C00', letterSpacing: '0.08em' }}>
                  👑 SMASHERS
                </p>
              )}
              {rankBoard.map((p, i) => (
                <RankedPlayerRow key={p.userId} position={i + 1} player={p} />
              ))}
            </div>
          )}
        </>
      ) : mode !== 'char' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{mode === 'ba' ? '📍 Buenos Aires' : '🇦🇷 Argentina'}</p>
            <Tag color="#EAB308">Próximamente</Tag>
          </div>

          <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '36px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🏆</div>
            <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 16, color: '#fff' }}>Ranking {mode === 'ba' ? 'AFK' : 'Smash INC'}</p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Los puntos se actualizarán automáticamente después de cada torneo registrado en Start.GG</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              {['🥇 1er lugar', '🥈 2do lugar', '🥉 3er lugar', '4° lugar', '5° lugar'].map((label, i) => (
                <div key={i} style={{ background: i === 0 ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '8px 14px' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: i === 0 ? '#EAB308' : 'rgba(255,255,255,0.3)' }}>{label}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: 'inline-flex', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)', borderRadius: 10, padding: '7px 16px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(234,179,8,0.6)', letterSpacing: '0.05em' }}>Próximamente</span>
            </div>
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Tu rendimiento por personaje</p>
          <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '32px 20px', textAlign: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
              {[{ t:'S', a:'#FBBF24', b:'#F59E0B' }, { t:'A', a:'#34D399', b:'#10B981' }, { t:'B', a:'#60A5FA', b:'#3B82F6' }, { t:'C', a:'#9CA3AF', b:'#6B7280' }].map(({ t, a, b }) => (
                <div key={t} style={{ width: 52, height: 52, borderRadius: 14, background: '#111', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 26, fontWeight: 900, background: `linear-gradient(135deg,${a},${b})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t}</span>
                </div>
              ))}
            </div>
            <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 15, color: '#fff' }}>Ranking por personaje</p>
            <p style={{ margin: '0 0 18px', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Jugá partidas online para acumular victorias con tu main y subir de clase</p>
            <div style={{ display: 'inline-flex', background: 'rgba(232,142,0,0.06)', border: '1px solid rgba(232,142,0,0.15)', borderRadius: 10, padding: '7px 16px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,140,0,0.6)', letterSpacing: '0.05em' }}>Próximamente</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB — TORNEOS
═══════════════════════════════════════════════════ */
function TabTorneos() {
  const [loading, setLoading] = useState(true);
  const [torneos, setTorneos] = useState([]);

  useEffect(() => {
    fetch('/api/tournaments')
      .then(r => r.json())
      .then(d => { setTorneos(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '24px 18px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Torneos</h1>
      <p style={{ margin: '0 0 22px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Publicados en Start.GG</p>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: '#10101A', borderRadius: 18, padding: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="shimmer" style={{ height: 14, width: '70%', borderRadius: 7, marginBottom: 10 }} />
              <div className="shimmer" style={{ height: 10, width: '40%', borderRadius: 5 }} />
            </div>
          ))}
        </div>
      ) : torneos.length === 0 ? (
        <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '44px 24px', textAlign: 'center' }}>
          <span style={{ fontSize: 44 }}>📋</span>
          <p style={{ margin: '14px 0 6px', fontWeight: 800, fontSize: 16, color: '#fff' }}>Sin torneos activos</p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Los torneos de Start.GG van a aparecer acá automáticamente</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {torneos.map((t, i) => (
            <div key={i} style={{
              background: '#10101A', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 18, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,rgba(232,142,0,0.2),rgba(232,80,0,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏆</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: 14, color: '#fff' }}>{t.name || t.tournamentName || 'Torneo'}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{t.date || t.startAt || 'Fecha por confirmar'}</p>
              </div>
              <Svg size={16} sw={2}>{ICO.chevron}</Svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB — TIPS
═══════════════════════════════════════════════════ */
const CHARS = [
  'Banjo Kazooie','Bayonetta','Bowser','Bowser Jr.','Byleth','Captain Falcon',
  'Chrom','Cloud','Corrin','Daisy','Dark Pit','Dark Samus','Diddy Kong','Donkey Kong',
  'Dr. Mario','Duck Hunt','Falco','Fox','Ganondorf','Greninja','Hero','Ice Climbers',
  'Ike','Incineroar','Inkling','Isabelle','Jigglypuff','Joker','Kazuya','Ken',
  'King Dedede','King K. Rool','Kirby','Link','Little Mac','Lucario','Lucas',
  'Lucina','Luigi','Mario','Marth','Mega Man','Meta Knight','Mewtwo','Mii Brawler',
  'Mii Gunner','Mii Swordfighter','Min Min','Mr. Game & Watch','Ness','Olimar',
  'Pac-Man','Palutena','Peach','Pichu','Pikachu','Piranha Plant','Pit',
  'Pokemon Trainer','Pyra Mythra','R.O.B.','Richter','Ridley','Robin',
  'Rosalina & Luma','Roy','Ryu','Samus','Sephiroth','Sheik','Shulk','Simon',
  'Snake','Sonic','Sora','Steve','Terry','Toon Link','Villager','Wario',
  'Wii Fit Trainer','Wolf','Yoshi','Young Link','Zelda','Zero Suit Samus',
];

/* ─── TIP CARD ───────────────────────────────────── */
function TipCard({ tip, currentUserId, currentUserName, onDelete, onEdit }) {
  const [editing, setEditing]             = useState(false);
  const [editText, setEditText]           = useState('');
  const [editNewMedia, setEditNewMedia]   = useState(null);    // base64 nuevo archivo
  const [editNewMediaName, setEditNewMediaName] = useState('');
  const [editRemoveMedia, setEditRemoveMedia] = useState(false);
  const [editVideoUrl, setEditVideoUrl]   = useState('');
  const [saving, setSaving]               = useState(false);
  const [editError, setEditError]         = useState(null);

  // Tips viejos sin authorId: fallback por nombre de autor
  const isOwner = !!(currentUserId && (
    (tip.authorId != null && String(tip.authorId) === String(currentUserId)) ||
    (!tip.authorId && currentUserName && tip.author &&
      tip.author.trim().toLowerCase() === currentUserName.trim().toLowerCase())
  ));

  const openEdit = () => {
    setEditText(tip.text || '');
    setEditNewMedia(null); setEditNewMediaName(''); setEditRemoveMedia(false);
    setEditVideoUrl(tip.videoUrl || ''); setEditError(null);
    setEditing(true);
  };

  const handleEditFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm'];
    if (!allowed.includes(file.type)) { setEditError('Tipo no permitido'); return; }
    const limitMB = file.type.startsWith('video') ? 40 : 5;
    if (file.size > limitMB * 1024 * 1024) { setEditError(`Máximo ${limitMB} MB`); return; }
    const reader = new FileReader();
    reader.onload = ev => { setEditNewMedia(ev.target.result); setEditNewMediaName(file.name); setEditRemoveMedia(false); setEditError(null); };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async () => {
    setSaving(true); setEditError(null);
    const body = { tipId: tip.id, userId: currentUserId, userName: currentUserName, text: editText.trim(), videoUrl: editVideoUrl.trim() || undefined };
    if (editRemoveMedia) body.removeMedia = true;
    else if (editNewMedia) body.mediaData = editNewMedia;
    try {
      const r = await fetch(`/api/tips/${encodeURIComponent(tip.char)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) { setEditError(data.error || 'Error al guardar'); return; }
      const updated = {
        ...tip, text: editText.trim(), videoUrl: editVideoUrl.trim() || null, updatedAt: data.tip?.updatedAt,
        mediaData: editRemoveMedia ? null : (editNewMedia || tip.mediaData),
        mediaType: editRemoveMedia ? null : (data.tip?.mediaType || tip.mediaType),
        mediaIsVideo: editRemoveMedia ? false : (data.tip?.mediaIsVideo ?? tip.mediaIsVideo),
      };
      onEdit(updated); setEditing(false);
    } catch { setEditError('Error de conexión'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este tip?')) return;
    try {
      const r = await fetch(`/api/tips/${encodeURIComponent(tip.char)}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipId: tip.id, userId: currentUserId, userName: currentUserName }),
      });
      if (r.ok) onDelete(tip.id);
    } catch {}
  };

  // Vista en modo edición
  if (editing) {
    const previewMedia = editRemoveMedia ? null : (editNewMedia || tip.mediaData);
    const previewIsVideo = editRemoveMedia ? false : (editNewMedia ? editNewMedia.startsWith('data:video') : tip.mediaIsVideo);
    return (
      <div style={{ background: '#10101A', border: '1px solid rgba(232,142,0,0.3)', borderRadius: 18, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(232,142,0,0.07)' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#FF8C00' }}>✏️ Editando tip</span>
        </div>
        {previewMedia && (
          previewIsVideo
            ? <video src={previewMedia} controls style={{ width: '100%', maxHeight: 200, background: '#000', display: 'block' }} />
            : <img src={previewMedia} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ padding: '12px 14px' }}>
          <textarea value={editText} onChange={e => setEditText(e.target.value)} maxLength={2000} rows={3}
            style={{ width: '100%', background: '#161620', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: '#fff', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '7px 10px', cursor: 'pointer', fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
              📷 {editNewMediaName || 'Cambiar foto/video'}
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm" onChange={handleEditFile} style={{ display: 'none' }} />
            </label>
            {(editNewMedia || tip.mediaData) && !editRemoveMedia && (
              <button onClick={() => { setEditRemoveMedia(true); setEditNewMedia(null); }}
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '7px 10px', color: '#EF4444', fontSize: 11, cursor: 'pointer' }}>✕ Quitar media</button>
            )}
          </div>
          <input type="url" value={editVideoUrl} onChange={e => setEditVideoUrl(e.target.value)} placeholder="Link de YouTube / Vimeo..."
            style={{ marginTop: 8, width: '100%', background: '#161620', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
          {editError && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#EF4444' }}>{editError}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={handleSaveEdit} disabled={saving}
              style={{ flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#FF8C00,#E85D00)', color: '#fff' }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button onClick={() => { setEditing(false); setEditError(null); }}
              style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, overflow: 'hidden', marginBottom: 10 }}>
      {tip.mediaData && !tip.mediaIsVideo && (
        <img src={tip.mediaData} alt="tip" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }} />
      )}
      {tip.mediaData && tip.mediaIsVideo && (
        <video src={tip.mediaData} controls style={{ width: '100%', maxHeight: 240, background: '#000', display: 'block' }} />
      )}
      {tip.videoUrl && (
        <a href={tip.videoUrl} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(255,0,0,0.08)', borderBottom: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}>
          <span style={{ fontSize: 20 }}>▶️</span>
          <span style={{ fontSize: 12, color: '#FF8C00', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Ver video</span>
        </a>
      )}
      {tip.text && (
        <p style={{ margin: 0, padding: '12px 14px', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{tip.text}</p>
      )}
      <div style={{ padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>@{tip.author}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isOwner && (
            <>
              <button onClick={openEdit} title="Editar"
                style={{ background: 'none', border: 'none', color: 'rgba(255,200,0,0.65)', fontSize: 15, cursor: 'pointer', padding: '2px 5px', lineHeight: 1 }}>✏️</button>
              <button onClick={handleDelete} title="Eliminar"
                style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.65)', fontSize: 15, cursor: 'pointer', padding: '2px 5px', lineHeight: 1 }}>🗑️</button>
            </>
          )}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{new Date(tip.createdAt).toLocaleDateString('es-AR')}</span>
        </div>
      </div>
    </div>
  );
}

function TabTips() {
  const [selected, setSelected]       = useState(null);
  const [query, setQuery]             = useState('');
  const [tips, setTips]               = useState([]);
  const [loadingTips, setLoadingTips] = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [tipText, setTipText]         = useState('');
  const [tipMediaData, setTipMediaData] = useState(null);
  const [tipMediaName, setTipMediaName] = useState('');
  const [tipVideoUrl, setTipVideoUrl] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [tipCounts, setTipCounts]     = useState({});

  // Obtener userId y nombre del usuario logueado
  const stored = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('afk_user') || '{}') : {};
  const _rawUid = stored?.user?.id || stored?.user?.slug;
  const currentUserId = _rawUid != null ? String(_rawUid) : null;
  const currentUserName = stored?.user?.name || 'Anónimo';

  // Cargar contadores cuando se muestra la lista
  useEffect(() => {
    if (selected) return;
    fetch('/api/tips/counts')
      .then(r => r.json())
      .then(d => { if (d && typeof d === 'object') setTipCounts(d); })
      .catch(() => {});
  }, [selected]);

  // Cargar tips del personaje seleccionado
  useEffect(() => {
    if (!selected) return;
    setLoadingTips(true);
    fetch(`/api/tips/${encodeURIComponent(selected)}`)
      .then(r => r.json())
      .then(d => setTips(Array.isArray(d) ? d : []))
      .catch(() => setTips([]))
      .finally(() => setLoadingTips(false));
  }, [selected]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm'];
    if (!allowed.includes(file.type)) {
      setSubmitResult({ error: 'Tipo no permitido. Usá JPG, PNG, GIF, WebP, MP4 o WebM' }); return;
    }
    const limitMB = file.type.startsWith('video') ? 40 : 5;
    if (file.size > limitMB * 1024 * 1024) {
      setSubmitResult({ error: `Máximo ${limitMB} MB para este tipo de archivo` }); return;
    }
    const reader = new FileReader();
    reader.onload = ev => { setTipMediaData(ev.target.result); setTipMediaName(file.name); setSubmitResult(null); };
    reader.readAsDataURL(file);
  };

  const submitTip = async () => {
    if (!tipText.trim() && !tipMediaData && !tipVideoUrl.trim()) {
      setSubmitResult({ error: 'Ingresá texto, foto o un link de video' }); return;
    }
    setSubmitting(true); setSubmitResult(null);
    try {
      const r = await fetch(`/api/tips/${encodeURIComponent(selected)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorId: currentUserId, author: currentUserName, text: tipText.trim(), mediaData: tipMediaData || undefined, videoUrl: tipVideoUrl.trim() || undefined }),
      });
      const data = await r.json();
      if (!r.ok) { setSubmitResult({ error: data.error || 'Error al enviar' }); return; }
      const newTip = { ...data.tip, authorId: currentUserId, mediaData: tipMediaData };
      setTips(prev => [...prev, newTip]);
      setTipCounts(prev => ({ ...prev, [selected]: (prev[selected] || 0) + 1 }));
      setTipText(''); setTipMediaData(null); setTipMediaName(''); setTipVideoUrl('');
      setShowForm(false);
      setSubmitResult({ ok: true });
      setTimeout(() => setSubmitResult(null), 3000);
    } catch { setSubmitResult({ error: 'Error de conexión' }); }
    finally { setSubmitting(false); }
  };

  const handleDeleteTip = (tipId) => {
    setTips(prev => prev.filter(t => t.id !== tipId));
    setTipCounts(prev => ({ ...prev, [selected]: Math.max(0, (prev[selected] || 1) - 1) }));
  };

  const handleEditTip = (updated) => {
    setTips(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  if (selected) {
    const imgSrc = `/images/characters/${encodeURIComponent(selected.replace(/\.$/, ''))}.png`;
    return (
      <div style={{ padding: '24px 18px' }}>
        <button onClick={() => { setSelected(null); setShowForm(false); setTips([]); setSubmitResult(null); }} style={{
          display: 'flex', alignItems: 'center', gap: 8, color: '#FF8C00',
          fontSize: 14, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 0', marginBottom: 20,
        }}>
          <Svg size={18} sw={2}>{ICO.back}</Svg> Volver
        </button>

        {/* Character hero */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: 16 }}>
          <img src={imgSrc} alt={selected} style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 14, background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>{selected}</h2>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Super Smash Bros. Ultimate</p>
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '4px 10px' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>{tips.length} tip{tips.length !== 1 ? 's' : ''} de la comunidad</span>
            </div>
          </div>
        </div>

        {/* Botón subir tip */}
        <button onClick={() => { setShowForm(v => !v); setSubmitResult(null); }} style={{
          width: '100%', marginBottom: 14, padding: '12px 16px', borderRadius: 14,
          background: showForm ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,rgba(232,142,0,0.15),rgba(232,142,0,0.06))',
          border: `1px solid ${showForm ? 'rgba(255,255,255,0.08)' : 'rgba(232,142,0,0.3)'}`,
          color: '#FF8C00', fontWeight: 800, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {showForm ? '✕ Cancelar' : '+ Subir tip'}
        </button>

        {/* Formulario */}
        {showForm && (
          <div style={{ background: '#10101A', border: '1px solid rgba(232,142,0,0.2)', borderRadius: 20, padding: 16, marginBottom: 14 }}>
            <p style={{ margin: '0 0 12px', fontWeight: 800, fontSize: 14, color: '#fff' }}>Nuevo tip — {selected}</p>

            <textarea
              value={tipText}
              onChange={e => setTipText(e.target.value)}
              placeholder="Contá tu tip, combo o estrategia..."
              maxLength={2000}
              rows={4}
              style={{ width: '100%', background: '#161620', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: '#fff', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />

            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                📷 {tipMediaName || 'Foto / Video'}
                <input type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm" onChange={handleFile} style={{ display: 'none' }} />
              </label>
              {tipMediaData && (
                <button onClick={() => { setTipMediaData(null); setTipMediaName(''); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 10px', color: '#EF4444', fontSize: 11, cursor: 'pointer' }}>✕ Quitar</button>
              )}
            </div>

            {tipMediaData && (
              <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                {tipMediaData.startsWith('data:video') ? (
                  <video src={tipMediaData} controls style={{ width: '100%', maxHeight: 180, background: '#000' }} />
                ) : (
                  <img src={tipMediaData} alt="preview" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
                )}
              </div>
            )}

            <input
              type="url"
              value={tipVideoUrl}
              onChange={e => setTipVideoUrl(e.target.value)}
              placeholder="O pegá un link de YouTube / Vimeo..."
              style={{ marginTop: 10, width: '100%', background: '#161620', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
            />

            {submitResult?.error && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#EF4444' }}>{submitResult.error}</p>
            )}

            <button onClick={submitTip} disabled={submitting}
              style={{ marginTop: 12, width: '100%', padding: '12px', borderRadius: 12, border: 'none', fontWeight: 800, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer', background: submitting ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#FF8C00,#E85D00)', color: '#fff' }}>
              {submitting ? 'Enviando...' : 'Publicar tip'}
            </button>
          </div>
        )}

        {submitResult?.ok && (
          <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 14, padding: '10px 14px', marginBottom: 14, textAlign: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#34D399' }}>✅ Tip publicado</span>
          </div>
        )}

        {loadingTips ? (
          <div style={{ padding: '30px 0', textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, border: '2px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />
          </div>
        ) : tips.length === 0 ? (
          <div style={{ background: '#10101A', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 20, padding: '40px 24px', textAlign: 'center' }}>
            <span style={{ fontSize: 40 }}>💡</span>
            <p style={{ margin: '14px 0 4px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Sin tips todavía</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Sé el primero en colaborar con la comunidad</p>
          </div>
        ) : (
          [...tips].reverse().map(t => <TipCard key={t.id} tip={t} currentUserId={currentUserId} currentUserName={currentUserName} onDelete={handleDeleteTip} onEdit={handleEditTip} />)
        )}
      </div>
    );
  }

  const filtered = query.trim()
    ? CHARS.filter(c => c.toLowerCase().includes(query.toLowerCase()))
    : CHARS;

  return (
    <div style={{ padding: '24px 18px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Tips</h1>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Elegí un personaje · {CHARS.length} disponibles</p>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Buscar personaje..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', background: '#10101A', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14, padding: '11px 14px 11px 40px', fontSize: 14, color: '#fff',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <span style={{ fontSize: 32 }}>🔍</span>
          <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Sin resultados para "{query}"</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {filtered.map((c) => (
            <button key={c} onClick={() => setSelected(c)} style={{
              background: '#10101A', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 16, padding: '10px 12px', textAlign: 'left',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
              onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(232,142,0,0.3)'; e.currentTarget.style.background = 'rgba(232,142,0,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)'; e.currentTarget.style.background = '#10101A'; }}
            >
              <img
                src={`/images/characters/${encodeURIComponent(c.replace(/\.$/, ''))}.png`}
                alt={c}
                style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}
              />
              <div style={{ overflow: 'hidden' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</p>
                <p style={{ margin: 0, fontSize: 10, color: tipCounts[c] ? 'rgba(232,142,0,0.7)' : 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                  {tipCounts[c] ? `${tipCounts[c]} tip${tipCounts[c] !== 1 ? 's' : ''}` : '0 tips'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB — MATCH
═══════════════════════════════════════════════════ */
const STAGE_EMOJI = {
  'Battlefield': '⚔️', 'Final Destination': '🌌', 'Small Battlefield': '🗡️',
  'Pokémon Stadium 2': '⚡', 'Town & City': '🏙️', 'Smashville': '🏡',
  'Hollow Bastion': '🏰', 'Kalos Pokémon League': '🔷',
};

function fmtElapsed(s) { return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; }

function TabMatch() {
  const [plat, setPlat]           = useState(null);
  const [mmStatus, setMmStatus]   = useState(null);
  const [polling, setPolling]     = useState(false);
  const [joining, setJoining]     = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [reported, setReported]   = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError]     = useState(null);
  const [onlineCount, setOnlineCount]     = useState(null);

  useEffect(() => {
    const fetchOnline = () => {
      fetch('/api/matchmaking/online')
        .then(r => r.json())
        .then(d => setOnlineCount(d?.total ?? 0))
        .catch(() => {});
    };
    fetchOnline();
    const iv = setInterval(fetchOnline, 15000);
    return () => clearInterval(iv);
  }, []);
  const [elapsed, setElapsed]     = useState(0);

  const p = PLATFORMS.find(x => x.id === plat);

  const stored   = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('afk_user') || '{}') : {};
  const _rawUidMm = stored?.user?.id || stored?.user?.slug;
  const userId   = _rawUidMm != null ? String(_rawUidMm) : undefined;
  const userName = stored?.user?.name || 'Jugador';

  // ── Polling de estado ─────────────────────────────
  useEffect(() => {
    if (!polling || !userId || !plat) return;
    let active = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/matchmaking/queue?userId=${encodeURIComponent(userId)}&platform=${plat}`);
        if (!r.ok || !active) return;
        const data = await r.json();
        setMmStatus(data);
        if (data.status === 'finished') setPolling(false);
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => { active = false; clearInterval(iv); };
  }, [polling, userId, plat]);

  // ── Contador de tiempo en cola ────────────────────
  useEffect(() => {
    if (!polling || mmStatus?.status !== 'waiting') { setElapsed(0); return; }
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [polling, mmStatus?.status]);

  // ── Acciones ──────────────────────────────────────
  const joinQueue = async () => {
    setJoining(true); setJoinError(null);
    const body = { userId, userName, platform: plat };
    try {
      const r = await fetch('/api/matchmaking/queue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) { setJoinError(data.error || 'Error al unirse'); return; }
      setMmStatus(data);
      setPolling(true);
    } catch { setJoinError('Error de conexión'); }
    finally { setJoining(false); }
  };

  const cancelQueue = async () => {
    setPolling(false);
    try {
      await fetch('/api/matchmaking/queue', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, platform: plat }),
      });
    } catch {}
    setMmStatus(null); setElapsed(0);
  };

  const reportResult = async (winnerId) => {
    const matchId = mmStatus?.match?.id;
    if (!matchId) return;
    setReportLoading(true); setReportError(null);
    try {
      const r = await fetch('/api/matchmaking/result', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, reportingUserId: userId, claimedWinnerId: winnerId }),
      });
      const data = await r.json();
      if (!r.ok) { setReportError(data.error || 'Error al reportar'); return; }
      setReported(true);
      setMmStatus(prev => ({ ...prev, match: { ...prev.match, status: data.matchStatus, result: data.result } }));
      if (data.matchStatus !== 'finished') setPolling(true);
    } catch { setReportError('Error de conexión'); }
    finally { setReportLoading(false); }
  };

  const resetAll = () => {
    setPlat(null); setMmStatus(null);
    setPolling(false); setJoining(false); setJoinError(null);
    setReported(false); setReportError(null); setElapsed(0);
  };

  const matchData = mmStatus?.match;
  const matchStatus = matchData?.status || mmStatus?.status;

  // ════════════════════════════════════════════════════
  // RENDER — Selección de plataforma
  // ════════════════════════════════════════════════════
  if (!plat) return (
    <div style={{ padding: '24px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Matchmaking</h1>
        {onlineCount !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: onlineCount > 0 ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${onlineCount > 0 ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 20, padding: '4px 10px 4px 8px' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: onlineCount > 0 ? '#34D399' : '#555', boxShadow: onlineCount > 0 ? '0 0 6px #34D399' : 'none', flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: onlineCount > 0 ? '#34D399' : 'rgba(255,255,255,0.3)' }}>{onlineCount} en cola</span>
          </div>
        )}
      </div>
      <p style={{ margin: '0 0 22px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Elegí tu plataforma para jugar</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {PLATFORMS.map(px => (
          <button key={px.id} onClick={() => setPlat(px.id)} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: `linear-gradient(135deg,${px.from}1a,${px.to}0d)`,
            border: `1px solid ${px.from}40`, borderRadius: 20, padding: '16px', cursor: 'pointer',
            textAlign: 'left', transition: 'all 0.15s',
          }}>
            <div style={{ width: 50, height: 50, borderRadius: 16, background: `linear-gradient(135deg,${px.from},${px.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, boxShadow: `0 6px 16px ${px.from}35` }}>{px.icon}</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 3px', fontWeight: 800, fontSize: 15, color: '#fff' }}>{px.label}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{px.id === 'parsec' ? 'Emulador · Rollback netcode' : 'Nintendo Switch Online'}</p>
            </div>
            {onlineCount !== null && onlineCount > 0 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: '3px 8px', flexShrink: 0 }}>
                {onlineCount}
              </div>
            )}
            <Svg size={18} sw={2} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </Svg>
          </button>
        ))}
      </div>

      <SectionTitle>¿Cómo funciona?</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          ['🔍', 'Buscás partida', 'Te unís a la cola y te emparejamos automáticamente'],
          ['🗺️', 'Escenario aleatorio', 'Mapa competitivo elegido al azar entre los 8 legales'],
          ['📜', 'Reglas estándar', 'Stock 3, tiempo 7 min, sin objetos'],
          ['📤', 'Reportás el resultado', 'Ambos confirman quién ganó'],
        ].map(([icon, t, d], idx, arr) => (
          <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: '#10101A', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
              {idx < arr.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 12, background: 'rgba(255,255,255,0.05)', marginTop: 4 }} />}
            </div>
            <div style={{ paddingBottom: 12 }}>
              <p style={{ margin: '4px 0 2px', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{t}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.45 }}>{d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════
  // RENDER — Estado FINISHED
  // ════════════════════════════════════════════════════
  if (matchStatus === 'finished' && matchData?.result) {
    const iWon = matchData.result.winnerId === userId;
    return (
      <div style={{ padding: '24px 18px' }}>
        <button onClick={resetAll} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FF8C00', fontSize: 14, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 24 }}>
          <Svg size={18} sw={2}>{ICO.back}</Svg> Volver al inicio
        </button>
        <div style={{ textAlign: 'center', padding: '32px 16px', background: iWon ? 'linear-gradient(135deg,rgba(52,211,153,0.12),rgba(16,185,129,0.06))' : 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(220,38,38,0.06))', border: `1px solid ${iWon ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{iWon ? '🏆' : '💀'}</div>
          <p style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: iWon ? '#34D399' : '#EF4444' }}>{iWon ? '¡Ganaste!' : 'Perdiste'}</p>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{iWon ? `Derrotaste a ${matchData.opponent.name}` : `${matchData.opponent.name} ganó esta vez`}</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 14px' }}>
            <span style={{ fontSize: 16 }}>{STAGE_EMOJI[matchData.stage] || '🗺️'}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{matchData.stage}</span>
          </div>
        </div>
        <button onClick={resetAll} style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: `linear-gradient(135deg,${p.from},${p.to})`, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
          {p.icon} Jugar otra vez
        </button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // RENDER — Match activo (matched / pending_result / disputed)
  // ════════════════════════════════════════════════════
  if ((matchStatus === 'matched' || matchStatus === 'active' || matchStatus === 'pending_result' || matchStatus === 'disputed') && matchData) {
    return (
      <div style={{ padding: '24px 18px' }}>
        {/* Header rival encontrado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg,${p.from},${p.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{p.icon}</div>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 900, fontSize: 17, color: '#fff' }}>¡Rival encontrado!</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{p.label}</p>
          </div>
        </div>

        {/* Card rival */}
        <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '16px', marginBottom: 12 }}>
          <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Tu rival</p>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff' }}>{matchData.opponent.name}</p>
        </div>

        {/* Stage card */}
        <div style={{ background: 'linear-gradient(135deg,rgba(232,142,0,0.1),rgba(232,142,0,0.04))', border: '1px solid rgba(232,142,0,0.2)', borderRadius: 20, padding: '16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 34 }}>{STAGE_EMOJI[matchData.stage] || '🗺️'}</span>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: 'rgba(255,165,0,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Escenario elegido</p>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#FF8C00' }}>{matchData.stage}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Stock 3 · 7 min · Sin objetos</p>
          </div>
        </div>

        {/* Coordinar conexión */}
        <div style={{ background: 'rgba(232,142,0,0.05)', border: '1px solid rgba(232,142,0,0.15)', borderRadius: 16, padding: '12px 16px', marginBottom: 18 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
            {plat === 'switch' ? '🎮 Buscá a tu rival por su usuario en Nintendo Switch Online y añadilo como amigo.' : '🖥️ Coordiná con tu rival para conectarse en Parsec (por Discord u otro medio).'}
          </p>
        </div>

        {/* Reporte de resultado */}
        {matchStatus === 'disputed' ? (
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 18, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#FBBF24' }}>⚠️ Resultado en disputa</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>Reportaron resultados distintos. Contactá a un admin para resolver.</p>
          </div>
        ) : reported ? (
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 18, padding: '16px', textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, border: '2px solid #818CF8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#818CF8' }}>Esperando el reporte del rival...</p>
          </div>
        ) : (
          <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '16px' }}>
            <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: '#fff' }}>¿Quién ganó la partida?</p>
            {reportError && <p style={{ margin: '0 0 10px', fontSize: 12, color: '#EF4444' }}>{reportError}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => reportResult(userId)} disabled={reportLoading}
                style={{ padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,rgba(52,211,153,0.15),rgba(16,185,129,0.08))', border: '1px solid rgba(52,211,153,0.3)', color: '#34D399', fontWeight: 800, fontSize: 14, cursor: reportLoading ? 'not-allowed' : 'pointer' }}>
                🏆 Yo gané
              </button>
              <button onClick={() => reportResult(matchData.opponent.userId)} disabled={reportLoading}
                style={{ padding: '13px', borderRadius: 14, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', fontWeight: 800, fontSize: 14, cursor: reportLoading ? 'not-allowed' : 'pointer' }}>
                💀 Perdí
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════
  // RENDER — En cola (waiting)
  // ════════════════════════════════════════════════════
  if (mmStatus?.status === 'waiting') return (
    <div style={{ padding: '24px 18px' }}>
      <button onClick={cancelQueue} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FF8C00', fontSize: 14, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 24 }}>
        <Svg size={18} sw={2}>{ICO.back}</Svg> Cancelar búsqueda
      </button>

      <div style={{ background: `linear-gradient(135deg,${p.from}15,${p.to}08)`, border: `1px solid ${p.from}30`, borderRadius: 24, padding: '36px 24px', textAlign: 'center', marginBottom: 16 }}>
        {/* Spinner pulsante */}
        <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 22px' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `3px solid ${p.from}30` }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `3px solid ${p.from}`, borderTopColor: 'transparent', animation: 'spin 0.9s linear infinite' }} />
          <div style={{ position: 'absolute', inset: '16px', background: `linear-gradient(135deg,${p.from},${p.to})`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{p.icon}</div>
        </div>

        <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900, color: '#fff' }}>Buscando rival...</p>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{p.label} · {fmtElapsed(elapsed)} esperando</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 900, color: '#fff' }}>#{mmStatus.position}</p>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Posición</p>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 900, color: '#fff' }}>{mmStatus.queueSize}</p>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>En cola</p>
          </div>
        </div>
      </div>

      <button onClick={cancelQueue} style={{ width: '100%', padding: '13px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
        Cancelar
      </button>
    </div>
  );

  // ════════════════════════════════════════════════════
  // RENDER — Formulario de ingreso (idle / default)
  // ════════════════════════════════════════════════════
  return (
    <div style={{ padding: '24px 18px' }}>
      <button onClick={resetAll} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FF8C00', fontSize: 14, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 20 }}>
        <Svg size={18} sw={2}>{ICO.back}</Svg> Volver
      </button>

      {/* Platform header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg,${p.from},${p.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: `0 6px 18px ${p.from}40` }}>{p.icon}</div>
        <div>
          <h1 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 900, color: '#fff' }}>{p.label}</h1>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{plat === 'parsec' ? 'Emulador · Rollback netcode' : 'Nintendo Switch Online'}</p>
        </div>
      </div>

      {joinError && <p style={{ margin: '0 0 10px', fontSize: 13, color: '#EF4444', textAlign: 'center' }}>{joinError}</p>}

      <button onClick={joinQueue} disabled={joining}
        style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: joining ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg,${p.from},${p.to})`, color: '#fff', fontWeight: 900, fontSize: 15, cursor: joining ? 'not-allowed' : 'pointer', boxShadow: joining ? 'none' : `0 6px 20px ${p.from}35` }}>
        {joining ? 'Buscando...' : '🔍 Buscar partida'}
      </button>

      {/* Info reglas */}
      <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
        {[['⚔️', 'Stock 3'], ['⏱️', '7 min'], ['🚫', 'Sin items']].map(([icon, label]) => (
          <div key={label} style={{ flex: 1, textAlign: 'center', background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '10px 4px' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
