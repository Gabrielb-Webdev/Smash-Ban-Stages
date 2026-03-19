import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getStoredUser, logout } from '../src/utils/auth';
import { RANKS, TIER_ICONS } from '../lib/ranks';
import { CHARACTERS, charImgPath } from '../lib/characters';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;

/* â”€â”€â”€ PLATAFORMAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const PLATFORMS = [
  { id: 'parsec',  label: 'Parsec',        icon: '🖥️', from: '#7C3AED', to: '#3730A3' },
  { id: 'switch',  label: 'Switch Online', icon: '🎮', from: '#DC2626', to: '#9F1239' },
];

/* â”€â”€â”€ SVG HELPERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
  user:      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />,
};

/* â”€â”€â”€ ROOT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function HomePage() {
  const router = useRouter();
  const [user, setUser]       = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab]         = useState('rankings');
  const [showMenu, setShowMenu] = useState(false);
  const [notifs, setNotifs]       = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifToast, setNotifToast] = useState(null);
  const [showIOSTip, setShowIOSTip] = useState(false);

  // Estado global de matchmaking (persiste al cambiar de tab)
  const [bgMM, setBgMM]               = useState(null);
  const [acceptCountdown, setAcceptCountdown] = useState(15);

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

  // Registrar Service Worker y suscribirse a Web Push
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    // Detectar iOS: solo funciona en modo standalone (Agregar a pantalla de inicio)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true
      || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      setShowIOSTip(true);
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!vapidKey) { console.warn('[PUSH] VAPID key no configurada'); return; }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { console.warn('[PUSH] Push no soportado en este navegador'); return; }

    const uid = String(user?.id || user?.slug || '');
    if (!uid) { console.warn('[PUSH] No hay userId'); return; }

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') { console.warn('[PUSH] Permiso denegado'); return; }

        // urlBase64ToUint8Array
        const padding = '='.repeat((4 - vapidKey.length % 4) % 4);
        const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(base64);
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);

        // Si ya hay una suscripción con otra key, desuscribir primero
        const existingSub = await reg.pushManager.getSubscription();
        if (existingSub) {
          await existingSub.unsubscribe();
          console.log('[PUSH] Suscripción anterior eliminada');
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: arr,
        });

        const regRes = await fetch('/api/notifications/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, subscription: sub.toJSON() }),
        });
        const regData = await regRes.json();
        console.log('[PUSH] Web push registrado:', regData);
      } catch (e) { console.error('[PUSH] Error registrando web push:', e.message); }
    })();
  }, [user]);

  // Polling global de matchmaking (persiste entre tabs)
  useEffect(() => {
    if (!bgMM?.polling || !user) return;
    const uid = String(user?.id || user?.slug || '');
    if (!uid) return;
    let active = true;
    const poll = async () => {
      try {
        const r = await fetch('/api/matchmaking/room?userId=' + encodeURIComponent(uid));
        if (!r.ok || !active) return;
        const data = await r.json();
        // Si estamos buscando ranked y room devuelve idle, seguir esperando
        if (prev_status === 'searching' && data.status === 'idle') return;
        if (['idle', 'timeout', 'declined'].includes(data.status)) {
          if (active) setBgMM(null);
          return;
        }
        setBgMM(prev => prev ? {
          ...prev,
          status:   data.status,
          room:     data.room  || prev.room,
          code:     data.code  || prev.code,
          timeLeft: data.timeLeft,
          polling:  !['finished', 'idle', 'timeout', 'declined'].includes(data.status),
        } : prev);
      } catch {}
    };
    const prev_status = bgMM?.status;
    poll();
    const iv = setInterval(poll, 3000);
    return () => { active = false; clearInterval(iv); };
  }, [bgMM?.polling, bgMM?.status, user]);

  // Detectar sala activa al cargar la app (reconexión automática)
  useEffect(() => {
    if (!user || bgMM) return;
    const uid = String(user?.id || user?.slug || '');
    if (!uid) return;
    fetch('/api/matchmaking/room?userId=' + encodeURIComponent(uid))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data || ['idle', 'timeout', 'declined'].includes(data.status)) return;
        if (data.status === 'searching') {
          setBgMM({ status: 'searching', plat: data.platform, mode: data.mode || '1v1', polling: true });
          return;
        }
        setBgMM({
          status: data.status,
          code: data.code,
          room: data.room,
          plat: data.room?.platform,
          mode: data.room?.mode || '1v1',
          polling: true,
        });
      })
      .catch(() => {});
  }, [user]);

  // Countdown local para la pantalla de aceptación
  useEffect(() => {
    if (bgMM?.status !== 'pending_accept') return;
    setAcceptCountdown(bgMM?.timeLeft ?? 15);
    const t = setInterval(() => setAcceptCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [bgMM?.status]);

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

  const uid        = user?.id ? String(user.id) : (user?.slug || '');
  const uName      = user?.name || 'Jugador';

  const handleAcceptMatch = async () => {
    try {
      const r = await fetch('/api/matchmaking/room', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', userId: uid, userName: uName }),
      });
      const data = await r.json();
      setBgMM(prev => prev ? { ...prev, status: data.status, room: data.room || prev.room, timeLeft: data.timeLeft } : prev);
    } catch {}
  };

  const handleDeclineMatch = async () => {
    try {
      await fetch('/api/matchmaking/room', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline', userId: uid, userName: uName }),
      });
    } catch {}
    setBgMM(null);
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

        {/* â”€â”€ TOP BAR â”€â”€ */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          padding: '10px 16px',
          background: 'rgba(11,11,18,0.92)',
          backdropFilter: 'blur(28px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center',
          boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {/* Left — Avatar / menú de perfil (oculto en mobile vía #app-profile-header) */}
          <div id="app-profile-header" style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setShowMenu(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              {user.avatar
                ? <img src={user.avatar} alt={displayName} style={{ width: 36, height: 36, borderRadius: '50%', border: showMenu ? '2px solid #FF8C00' : '2px solid rgba(232,142,0,0.35)', objectFit: 'cover', transition: 'border 0.15s', boxShadow: showMenu ? '0 0 12px rgba(232,142,0,0.5)' : 'none' }} />
                : <div style={{ width: 36, height: 36, borderRadius: '50%', background: showMenu ? 'linear-gradient(135deg,#FF8C00,#E85D00)' : 'linear-gradient(135deg,rgba(232,142,0,0.25),rgba(232,142,0,0.08))', border: `2px solid ${showMenu ? '#FF8C00' : 'rgba(232,142,0,0.35)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#fff', transition: 'all 0.15s', boxShadow: showMenu ? '0 0 12px rgba(232,142,0,0.5)' : 'none' }}>
                    {initial}
                  </div>
              }
            </button>
          </div>

          {/* Center — Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, boxShadow: '0 0 16px rgba(232,142,0,0.55), 0 4px 12px rgba(0,0,0,0.4)', animation: 'glow-pulse 3s ease-in-out infinite' }}>
              🎮
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: '0.04em', color: '#fff', textTransform: 'uppercase' }}>AFK</span>
              <span style={{ fontWeight: 300, fontSize: 17, color: 'rgba(232,142,0,0.7)', marginLeft: 3, letterSpacing: '0.06em' }}>SMASH</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em', marginLeft: 5, alignSelf: 'center' }}>v{APP_VERSION}</span>
            </div>
          </div>

          {/* Right — Campana */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
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
          </div>
        </header>
        {/* iOS: tip para agregar a pantalla de inicio */}
        {showIOSTip && (
          <div style={{ background: 'rgba(232,142,0,0.12)', border: '1px solid rgba(232,142,0,0.28)', margin: '10px 12px 0', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>📲</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#FF8C00' }}>Activá las notificaciones</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
                En iPhone, tocá <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Compartir →</strong> luego <strong style={{ color: 'rgba(255,255,255,0.7)' }}>"Agregar a inicio"</strong> y abrí la app desde ahí.
              </p>
            </div>
            <button onClick={() => setShowIOSTip(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 18, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>✕</button>
          </div>
        )}

        {/* â”€â”€ PROFILE MENU OVERLAY â”€â”€ */}
        {showMenu && (
          <>
            <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} />
            <div style={{
              position: 'fixed', top: 66, left: 'max(calc(50% - 240px + 12px), 12px)',
              zIndex: 46,
              background: 'rgba(14,14,22,0.97)',
              backdropFilter: 'blur(40px) saturate(1.6)',
              WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: 24, overflow: 'hidden',
              minWidth: 248,
              boxShadow: '0 24px 64px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)',
              animation: 'fadeUp 0.16s ease',
            }}>
              {/* Accent bar */}
              <div style={{ height: 3, background: 'linear-gradient(90deg,#FF8C00,#7C3AED,#FF8C00)', backgroundSize: '200% 100%' }} />

              {/* User info */}
              <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 13 }}>
                {user.avatar
                  ? <img src={user.avatar} alt={displayName} style={{ width: 50, height: 50, borderRadius: 18, objectFit: 'cover', border: '2px solid rgba(232,142,0,0.5)', boxShadow: '0 0 18px rgba(232,142,0,0.25)' }} />
                  : <div style={{ width: 50, height: 50, borderRadius: 18, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff', boxShadow: '0 0 18px rgba(232,142,0,0.3)' }}>{initial}</div>
                }
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                  {user.slug && <p style={{ margin: '3px 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>@{user.slug}</p>}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 99, padding: '2px 9px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 5px #22C55E' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E' }}>En línea</span>
                  </div>
                </div>
              </div>

              {/* Panel de Admin */}
              {isAdmin && (
              <div style={{ padding: '8px 10px 4px' }}>
                <button onClick={() => { setShowMenu(false); router.push('/admin/afk-multi'); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 16, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,142,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 13, background: 'rgba(232,142,0,0.14)', border: '1px solid rgba(232,142,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🎛️</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#FF8C00' }}>Panel de Admin</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(232,142,0,0.45)' }}>Gestionar torneos y setups</p>
                  </div>
                  <Svg size={14} sw={2.5} style={{ color: 'rgba(255,255,255,0.2)' }}>{ICO.chevron}</Svg>
                </button>
              </div>
              )}

              {/* Logout */}
              <div style={{ padding: '4px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button onClick={() => { logout(); setShowMenu(false); window.location.href = '/login'; }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 16, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.09)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 13, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🚪</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#EF4444' }}>Cerrar sesión</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(239,68,68,0.45)' }}>Salir de la cuenta</p>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}

        {/* â”€â”€ NOTIFICATION DRAWER â”€â”€ */}
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
                  <NotifCard key={n.id} notif={n} onDismiss={dismissNotif} userId={uid} userName={uName} />
                ))
              )}
            </div>
          </>
        )}

        {/* â”€â”€ NOTIF TOAST â”€â”€ */}
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

        {/* â”€â”€ CONTENT â”€â”€ */}
        <main key={tab} className="tab-content" style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
          {/* Banner sala activa (fuera del tab match) */}
          {tab !== 'match' && bgMM && ['searching','waiting','active','pending_result','disputed','pending_accept'].includes(bgMM.status) && (
            <button
              onClick={() => setTab('match')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 16px', background: 'linear-gradient(90deg,rgba(124,58,237,0.18),rgba(255,140,0,0.12))', borderBottom: '1px solid rgba(124,58,237,0.3)', border: 'none', cursor: 'pointer', gap: 10 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: bgMM.status === 'active' ? '#34D399' : '#FF8C00', flexShrink: 0, display: 'inline-block', boxShadow: '0 0 6px ' + (bgMM.status === 'active' ? '#34D399' : '#FF8C00') }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {bgMM.status === 'searching'      ? 'Buscando rival\u2026'    :
                   bgMM.status === 'waiting'        ? 'Esperando rival\u2026'    :
                   bgMM.status === 'pending_accept' ? '\u00a1Match encontrado!'  :
                   bgMM.status === 'active'         ? '\u00a1Partida en juego!'  :
                   bgMM.status === 'pending_result' ? 'Report\u00e1 el resultado' :
                                                      'Resultado en disputa'}
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#FF8C00', fontWeight: 800 }}>Ir \u2192</span>
            </button>
          )}
          {tab === 'rankings' && <TabRankings user={user} />}
          {tab === 'torneos'  && <TabTorneos  />}
          {tab === 'tips'     && <TabTips     />}
          {tab === 'match'    && <TabMatch bgMM={bgMM} setBgMM={setBgMM} userId={uid} userName={uName} />}
          {tab === 'perfil'   && <TabPerfil user={user} />}
        </main>

        {/* â”€â”€ BOTTOM NAV â”€â”€ */}
        <BottomNav tab={tab} setTab={setTab} bgMMStatus={bgMM?.status} />

        {/* ══ POPUP match encontrado ══ */}
        {bgMM && bgMM.status === 'pending_accept' && bgMM.room && (() => {
          const is2v2    = bgMM.room.mode === '2v2';
          const myRole   = uid === bgMM.room.host?.userId ? 'host' : 'guest';
          const opponent = is2v2 ? null : (myRole === 'host' ? bgMM.room.guest : bgMM.room.host);
          const myTeam2  = is2v2 ? (bgMM.room.team1?.some(p => p.userId === uid) ? 'team1' : 'team2') : null;
          const enemyTeam2 = is2v2 ? (myTeam2 === 'team1' ? bgMM.room.team2 : bgMM.room.team1) : null;
          const pData    = PLATFORMS.find(x => x.id === bgMM.plat);
          const radius   = 26;
          const circ     = 2 * Math.PI * radius;
          const pct      = acceptCountdown / 15;
          return (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 24px',
            }}>
              <div style={{
                width: '100%', maxWidth: 360,
                background: 'linear-gradient(160deg,#13131E,#0e0e18)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 28, padding: '28px 24px',
                boxShadow: '0 24px 80px rgba(0,0,0,0.9)',
                animation: 'fadeUp 0.22s ease',
              }}>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 46, marginBottom: 10 }}>⚡</div>
                  <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 900, color: '#fff' }}>¡Partida encontrada!</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{is2v2 ? '2v2 · ' : ''}{pData?.label ?? bgMM.plat}</p>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16, padding: '14px 16px', marginBottom: 20, textAlign: 'center',
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>{is2v2 ? 'Equipo rival' : 'Tu rival'}</p>
                  {is2v2 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {(enemyTeam2 || []).map(p => (
                        <p key={p.userId} style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#fff' }}>{p.userName}</p>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff' }}>{opponent?.userName || '—'}</p>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{ position: 'relative', width: 68, height: 68 }}>
                    <svg width={68} height={68} style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx={34} cy={34} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4} />
                      <circle cx={34} cy={34} r={radius} fill="none"
                        stroke={acceptCountdown > 5 ? '#FF8C00' : '#EF4444'}
                        strokeWidth={4}
                        strokeDasharray={circ}
                        strokeDashoffset={circ * (1 - pct)}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                      />
                    </svg>
                    <p style={{
                      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: 0, fontSize: 20, fontWeight: 900,
                      color: acceptCountdown > 5 ? '#FF8C00' : '#EF4444',
                    }}>{acceptCountdown}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={handleDeclineMatch} style={{
                    flex: 1, padding: '13px', borderRadius: 14,
                    border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)',
                    color: '#EF4444', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                  }}>Rechazar</button>
                  <button onClick={handleAcceptMatch} style={{
                    flex: 2, padding: '13px', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg,#22C55E,#16A34A)',
                    color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(34,197,94,0.35)',
                  }}>✅ Aceptar</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}

/* â”€â”€â”€ BOTTOM NAV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function BottomNav({ tab, setTab, bgMMStatus }) {
  const leftItems = [
    { id: 'rankings', label: 'Rankings', icon: ICO.trophy   },
    { id: 'torneos',  label: 'Torneos',  icon: ICO.calendar },
  ];
  const rightItems = [
    { id: 'tips',   label: 'Tips',   icon: ICO.bulb },
    { id: 'perfil', label: 'Perfil', icon: ICO.user },
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
            transition: 'color 0.15s', position: 'relative',
          }}>
            {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 22, height: 3, borderRadius: 2, background: 'linear-gradient(90deg,#FF8C00,#E85D00)', boxShadow: '0 0 8px rgba(232,142,0,0.6)' }} />}
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
          {bgMMStatus && bgMMStatus !== 'idle' && (
            <div style={{ position: 'absolute', top: 8, right: 14, width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E', animation: 'pulse-ring 1.2s ease-in-out infinite' }} />
          )}
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
            transition: 'color 0.15s', position: 'relative',
          }}>
            {active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 22, height: 3, borderRadius: 2, background: 'linear-gradient(90deg,#FF8C00,#E85D00)', boxShadow: '0 0 8px rgba(232,142,0,0.6)' }} />}
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

/* â”€â”€â”€ SECTION HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€ STAT CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€â”€ TAG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   COMPONENTES DE RANKED
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

function RankedPlayerRow({ position, player, onPlayerClick }) {
  const isSmasher  = player.rank === 'Smasher';
  const rankObj    = RANKS.find(r => r.name === player.rank) || RANKS[0];
  const posIcon    = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : null;
  const rpts       = player.rankPoints || 0;
  const pct        = isSmasher ? null : Math.min(100, rpts);
  const inPlacement = !player.placementDone;
  const played      = (player.wins || 0) + (player.losses || 0);
  return (
    <div onClick={() => onPlayerClick && onPlayerClick(player.userId, player.userName)} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: isSmasher ? 'rgba(255,140,0,0.08)' : '#10101A',
      border: `1px solid ${isSmasher ? 'rgba(255,140,0,0.28)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: 14, padding: '12px 14px',
      cursor: onPlayerClick ? 'pointer' : 'default',
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
          {inPlacement ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 9px', borderRadius: 20,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap',
            }}>
              ❓ Unranked
            </span>
          ) : (
            <>
              <RankBadge rankName={player.rank} />
              {isSmasher && <span style={{ fontSize: 10, color: '#FF8C00', fontWeight: 700 }}>{rpts} RP</span>}
            </>
          )}
        </div>
        {!inPlacement && !isSmasher && (
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
        {!inPlacement && !isSmasher && (
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{rpts}/100 RP</p>
        )}
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TAB — INICIO
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function TabInicio({ user, isAdmin, router, displayName, initial, setTab }) {
  const [torneos,     setTorneos]     = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetch('/api/tournaments')
      .then(r => r.json())
      .then(d => { setTorneos(Array.isArray(d) ? d : []); setLoadingData(false); })
      .catch(() => setLoadingData(false));
  }, []);

  const featuredTorneo = torneos[0] || null;

  const QUICK = [
    { icon: '⚡', label: 'Match',    action: () => setTab('match')    },
    { icon: '🏆', label: 'Torneos',  action: () => setTab('torneos')  },
    { icon: '📊', label: 'Rankings', action: () => setTab('rankings') },
    { icon: '💡', label: 'Tips',     action: () => setTab('tips')     },
  ];

  return (
    <div style={{ paddingBottom: 28 }}>

      {/* â”€â”€ Greeting row â”€â”€ */}
      <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ position: 'relative' }}>
            {user.avatar
              ? <img src={user.avatar} alt={displayName} style={{ width: 48, height: 48, borderRadius: 16, border: '2px solid rgba(232,142,0,0.5)', objectFit: 'cover', boxShadow: '0 0 16px rgba(232,142,0,0.22)' }} />
              : <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#fff' }}>{initial}</div>
            }
            <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: '#22C55E', border: '2px solid #0B0B12', boxShadow: '0 0 6px rgba(34,197,94,0.7)' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Bienvenido/a,</p>
            <p style={{ margin: 0, fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.1 }}>{displayName}</p>
          </div>
        </div>
        <button onClick={() => router.push('/profile')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 99, padding: '7px 16px', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
          Ver perfil →
        </button>
      </div>

      {/* â”€â”€ Featured Banner â”€â”€ */}
      <div style={{ padding: '0 16px', marginBottom: 18 }}>
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: 28,
          background: 'linear-gradient(135deg,#0d1a40 0%,#1a0533 45%,#2d1060 100%)',
          border: '1px solid rgba(124,58,237,0.3)',
          padding: '24px 22px 22px', minHeight: 158,
          boxShadow: '0 10px 36px rgba(124,58,237,0.22)',
        }}>
          {/* Neon grid */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(124,58,237,0.7) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.7) 1px,transparent 1px)', backgroundSize: '30px 30px' }} />
          {/* Orbs */}
          <div style={{ position: 'absolute', right: -30, top: -30, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(124,58,237,0.45) 0%,transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: -50, bottom: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.18) 0%,transparent 70%)', pointerEvents: 'none' }} />

          {loadingData ? (
            <div>
              <div className="shimmer" style={{ height: 12, width: 90, borderRadius: 8, marginBottom: 14 }} />
              <div className="shimmer" style={{ height: 28, width: '65%', borderRadius: 8, marginBottom: 10 }} />
              <div className="shimmer" style={{ height: 10, width: '45%', borderRadius: 6 }} />
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.5)', borderRadius: 99, padding: '4px 13px', marginBottom: 13 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#A78BFA', boxShadow: '0 0 6px #A78BFA' }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: '#C4B5FD', letterSpacing: '0.08em' }}>
                  {featuredTorneo ? 'PRÓXIMO TORNEO' : 'TEMPORADA ACTIVA'}
                </span>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.1, textShadow: '0 0 24px rgba(167,139,250,0.55)' }}>
                {featuredTorneo ? (featuredTorneo.name || featuredTorneo.tournamentName || 'Torneo AFK') : 'AFK Smash Season'}
              </p>
              <p style={{ margin: '0 0 18px', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                {featuredTorneo
                  ? (featuredTorneo.date || featuredTorneo.startAt || 'Fecha por confirmar')
                  : 'Ranked · Buenos Aires · Smash Ultimate'}
              </p>
              <button onClick={() => setTab(featuredTorneo ? 'torneos' : 'match')} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                background: 'rgba(167,139,250,0.18)', border: '1px solid rgba(167,139,250,0.4)',
                borderRadius: 99, padding: '9px 20px', color: '#C4B5FD',
                fontWeight: 800, fontSize: 12, cursor: 'pointer',
              }}>
                {featuredTorneo ? 'Ver torneo' : 'Jugar ahora'} <span>→</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* â”€â”€ Quick access pills â”€â”€ */}
      <div style={{ padding: '0 16px', marginBottom: 22, display: 'flex', gap: 8 }}>
        {QUICK.map(q => (
          <button key={q.label} onClick={q.action} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            padding: '13px 4px', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,142,0,0.1)'; e.currentTarget.style.borderColor = 'rgba(232,142,0,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
          >
            <span style={{ fontSize: 22 }}>{q.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>{q.label}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* â”€â”€ Quick Match CTA â”€â”€ */}
        <button onClick={() => setTab('match')} className="btn-gamer" style={{
          width: '100%', marginBottom: isAdmin ? 12 : 22, padding: '20px 22px',
          background: 'linear-gradient(135deg,#c92020 0%,#7a0808 100%)',
          border: '1px solid rgba(220,40,40,0.28)',
          borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', boxShadow: '0 10px 34px rgba(180,0,0,0.38)',
          position: 'relative', overflow: 'hidden', textAlign: 'left',
        }}>
          <div style={{ position: 'absolute', right: -28, top: -28, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
          <div>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>⚡ Buscar Partida</p>
            <p style={{ margin: '5px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Jugá ranked ahora mismo</p>
          </div>
          <div style={{ width: 46, height: 46, borderRadius: 99, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Svg size={20} sw={2.5}>{ICO.chevron}</Svg>
          </div>
        </button>

        {/* â”€â”€ Admin button â”€â”€ */}
        {isAdmin && (
          <button onClick={() => router.push('/')} style={{
            width: '100%', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14,
            background: 'linear-gradient(135deg,rgba(232,142,0,0.12),rgba(232,80,0,0.05))',
            border: '1px solid rgba(232,142,0,0.2)', borderRadius: 24, padding: '15px 18px',
            cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 15, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 14px rgba(232,142,0,0.4)', flexShrink: 0 }}>🎛️</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 800, color: '#FF8C00', fontSize: 14 }}>Panel de Administración</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Gestionar torneos y setups</p>
            </div>
            <Svg size={16} sw={2}>{ICO.chevron}</Svg>
          </button>
        )}

        {/* â”€â”€ Comunidades â”€â”€ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#38BDF8,#7C3AED)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Comunidades</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { name: 'Smash AFK', region: 'Buenos Aires', tag: 'LOCAL', tagColor: '#38BDF8', desc: 'Torneos semanales, ranking local y espacio de práctica competitiva.', icon: '🗺️', from: 'rgba(12,74,110,0.55)', to: 'rgba(2,12,40,0.92)', glow: 'rgba(56,189,248,0.14)' },
            { name: 'Smash INC', region: 'Nacional · Argentina', tag: 'NACIONAL', tagColor: '#FB923C', desc: 'Circuito nacional con ranking y torneos interregionales.', icon: '🏅', from: 'rgba(67,20,7,0.55)', to: 'rgba(28,10,0,0.92)', glow: 'rgba(251,146,60,0.12)' },
          ].map(c => (
            <div key={c.name} style={{
              background: `linear-gradient(135deg,${c.from},${c.to})`,
              border: `1px solid ${c.tagColor}22`,
              borderRadius: 28, padding: '18px 18px',
              display: 'flex', gap: 16, alignItems: 'flex-start',
              boxShadow: `0 8px 26px ${c.glow}`,
            }}>
              <div style={{ width: 52, height: 52, borderRadius: 18, background: `${c.tagColor}12`, border: `1px solid ${c.tagColor}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>{c.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontWeight: 900, fontSize: 16, color: '#fff' }}>{c.name}</span>
                  <span style={{ fontSize: 8.5, fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: `${c.tagColor}18`, color: c.tagColor, border: `1px solid ${c.tagColor}35`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{c.tag}</span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 11, color: c.tagColor, fontWeight: 600, opacity: 0.85 }}>{c.region}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55 }}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* --- TAB PERFIL ------------------------------------------------ */
function platLabel(p) { return p === 'switch' ? '🎮 Switch' : '🖥️ Parsec'; }
function platColor(p) { return p === 'switch' ? '#EF4444' : '#8B5CF6'; }
function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'hace un momento';
  if (m < 60) return 'hace ' + m + 'm';
  const h = Math.floor(m / 60);
  if (h < 24) return 'hace ' + h + 'h';
  const d = Math.floor(h / 24);
  return 'hace ' + d + 'd';
}
function TabPerfil({ user }) {
  const [stats, setStats]     = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRanks, setShowRanks]       = useState(false);
  const [friendTab, setFriendTab]       = useState('list');
  const [friends, setFriends]           = useState([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [friendResults, setFriendResults] = useState([]);
  const [friendSearching, setFriendSearching] = useState(false);
  const [friendAdding, setFriendAdding] = useState(null);
  const [friendCollapsed, setFriendCollapsed] = useState({ in_match: false, searching: false, offline: false });
  const [friendRequests, setFriendRequests] = useState([]);
  const [chatOpen, setChatOpen]         = useState(null); // { userId, userName }
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState('');
  const [chatSending, setChatSending]   = useState(false);
  const [partyState, setPartyState]     = useState(null);
  const [doublesStats, setDoublesStats] = useState(null);
  const [sentRequests, setSentRequests] = useState([]);
  const [viewProfile, setViewProfile]   = useState(null); // { userId, userName }
  const [profileData, setProfileData]   = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const chatEndRef = useRef(null);

  const uid   = user ? String(user?.id || user?.slug || '') : '';
  const uName = user ? String(user?.name || user?.player?.gamerTag || 'Jugador') : '';

  useEffect(() => {
    if (!user) return;
    const uidEnc = encodeURIComponent(String(user.id || user.slug || ''));
    Promise.all([
      fetch('/api/players/stats?userId=' + uidEnc).then(r => r.json()).catch(() => null),
      fetch('/api/players/history?userId=' + uidEnc + '&limit=30').then(r => r.json()).catch(() => []),
    ]).then(([s, h]) => { setStats(s); setHistory(Array.isArray(h) ? h : []); setLoading(false); });
  }, [user?.id]);

  // Fetch friends
  useEffect(() => {
    if (!uid) return;
    fetch('/api/friends?userId=' + encodeURIComponent(uid))
      .then(r => r.ok ? r.json() : [])
      .then(d => setFriends(Array.isArray(d) ? d : []))
      .catch(() => {});
    // Fetch friend requests
    fetch('/api/friends?userId=' + encodeURIComponent(uid) + '&type=requests')
      .then(r => r.ok ? r.json() : [])
      .then(d => setFriendRequests(Array.isArray(d) ? d : []))
      .catch(() => {});
    // Fetch sent requests
    fetch('/api/friends?userId=' + encodeURIComponent(uid) + '&type=sent')
      .then(r => r.ok ? r.json() : [])
      .then(d => setSentRequests(Array.isArray(d) ? d : []))
      .catch(() => {});
    // Fetch party state
    fetch('/api/party?userId=' + encodeURIComponent(uid))
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.status !== 'none') setPartyState(d); })
      .catch(() => {});
  }, [uid]);

  // Polling: friends, requests, sent requests (cada 12s)
  useEffect(() => {
    if (!uid) return;
    const uidEnc = encodeURIComponent(uid);
    const poll = setInterval(() => {
      fetch('/api/friends?userId=' + uidEnc)
        .then(r => r.ok ? r.json() : [])
        .then(d => { if (Array.isArray(d)) setFriends(d); })
        .catch(() => {});
      fetch('/api/friends?userId=' + uidEnc + '&type=requests')
        .then(r => r.ok ? r.json() : [])
        .then(d => { if (Array.isArray(d)) setFriendRequests(d); })
        .catch(() => {});
      fetch('/api/friends?userId=' + uidEnc + '&type=sent')
        .then(r => r.ok ? r.json() : [])
        .then(d => { if (Array.isArray(d)) setSentRequests(d); })
        .catch(() => {});
    }, 12000);
    return () => clearInterval(poll);
  }, [uid]);

  // Fetch 2v2 stats
  useEffect(() => {
    if (!user) return;
    const uidEnc = encodeURIComponent(String(user.id || user.slug || ''));
    Promise.all([
      fetch('/api/players/stats?userId=' + uidEnc + '&mode=doubles').then(r => r.json()).catch(() => null),
    ]).then(([dStats]) => { setDoublesStats(dStats); });
  }, [user?.id]);

  // Chat polling
  useEffect(() => {
    if (!chatOpen || !uid) return;
    const fetchMsgs = () => {
      fetch('/api/chat?userId=' + encodeURIComponent(uid) + '&friendId=' + encodeURIComponent(chatOpen.userId))
        .then(r => r.ok ? r.json() : { messages: [] })
        .then(d => setChatMessages(d.messages || []))
        .catch(() => {});
    };
    fetchMsgs();
    const iv = setInterval(fetchMsgs, 3000);
    return () => clearInterval(iv);
  }, [chatOpen?.userId, uid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Search players for adding friends
  useEffect(() => {
    if (friendSearch.length < 2) { setFriendResults([]); return; }
    setFriendSearching(true);
    const t = setTimeout(() => {
      fetch('/api/players/search?q=' + encodeURIComponent(friendSearch))
        .then(r => r.ok ? r.json() : [])
        .then(d => { setFriendResults(Array.isArray(d) ? d.filter(p => p.userId !== uid) : []); setFriendSearching(false); })
        .catch(() => setFriendSearching(false));
    }, 400);
    return () => clearTimeout(t);
  }, [friendSearch, uid]);

  const addFriend = async (friendId, friendName) => {
    setFriendAdding(friendId);
    try {
      const r = await fetch('/api/friends', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, userName: uName, friendId, friendName }),
      });
      const data = await r.json();
      if (r.ok) {
        if (data.autoAccepted) {
          setFriends(prev => [...prev, { userId: friendId, userName: friendName, online: 'offline' }]);
          setFriendRequests(prev => prev.filter(rq => rq.fromId !== friendId));
          setSentRequests(prev => prev.filter(s => s.toId !== friendId));
        } else if (data.requestSent) {
          setSentRequests(prev => [...prev, { toId: friendId, toName: friendName, sentAt: new Date().toISOString() }]);
        }
        setFriendSearch(''); setFriendResults([]);
      } else if (r.status === 409) {
        // Already sent or already friends — sync sentRequests state
        setSentRequests(prev => prev.some(s => s.toId === friendId) ? prev : [...prev, { toId: friendId, toName: friendName, sentAt: new Date().toISOString() }]);
      }
    } catch {}
    setFriendAdding(null);
  };

  const acceptRequest = async (fromId, fromName) => {
    try {
      await fetch('/api/friends', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, userName: uName, fromId, action: 'accept' }),
      });
      setFriendRequests(prev => prev.filter(r => r.fromId !== fromId));
      setFriends(prev => [...prev, { userId: fromId, userName: fromName, online: 'offline' }]);
    } catch {}
  };

  const rejectRequest = async (fromId) => {
    try {
      await fetch('/api/friends', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, userName: uName, fromId, action: 'reject' }),
      });
      setFriendRequests(prev => prev.filter(r => r.fromId !== fromId));
    } catch {}
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatSending || !chatOpen) return;
    setChatSending(true);
    const msg = chatInput.trim();
    setChatInput('');
    try {
      await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, userName: uName, friendId: chatOpen.userId, message: msg }),
      });
      setChatMessages(prev => [...prev, { id: 'm-' + Date.now(), from: uid, fromName: uName, text: msg, sentAt: new Date().toISOString() }]);
    } catch {}
    setChatSending(false);
  };

  const inviteToDoubles = async (friendId, friendName, platform) => {
    try {
      const r = await fetch('/api/party', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, userName: uName, friendId, friendName, platform }),
      });
      const data = await r.json();
      if (data.success) setPartyState({ status: 'pending', partyId: data.partyId, party: data.party });
    } catch {}
  };

  const leaveParty = async () => {
    try {
      await fetch('/api/party', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });
      setPartyState(null);
    } catch {}
  };

  const removeFriend = async (friendId) => {
    try {
      await fetch('/api/friends', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, friendId }),
      });
      setFriends(prev => prev.filter(f => f.userId !== friendId));
    } catch {}
  };

  const cancelSentRequest = async (toId) => {
    setSentRequests(prev => prev.filter(s => s.toId !== toId));
  };

  const openProfile = (playerId, playerName) => {
    setViewProfile({ userId: playerId, userName: playerName });
    setProfileData(null);
    setProfileLoading(true);
    fetch('/api/players/profile?id=' + encodeURIComponent(playerId) + '&full=true')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setProfileData(d); setProfileLoading(false); })
      .catch(() => setProfileLoading(false));
  };

  if (!user) return null;
  const displayName = user.name || user.slug || 'Jugador';
  const initial     = displayName.charAt(0).toUpperCase();
  const totalW = (stats?.switch?.wins || 0)   + (stats?.parsec?.wins || 0);
  const totalL = (stats?.switch?.losses || 0) + (stats?.parsec?.losses || 0);
  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ padding: '28px 18px 24px', background: 'linear-gradient(160deg,rgba(124,58,237,0.09) 0%,rgba(232,142,0,0.06) 50%,transparent 80%)', display: 'flex', gap: 16, alignItems: 'center', position: 'relative', overflow: 'hidden', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(232,142,0,0.07) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {user.avatar
            ? <img src={user.avatar} alt={displayName} style={{ width: 72, height: 72, borderRadius: 22, objectFit: 'cover', border: '2px solid rgba(232,142,0,0.5)' }} />
            : <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900, color: '#fff', boxShadow: '0 8px 20px rgba(232,142,0,0.3)' }}>{initial}</div>
          }
          <div style={{ position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: '#22C55E', border: '2px solid #0B0B12', boxShadow: '0 0 8px rgba(34,197,94,0.7)' }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.4px', color: '#fff' }}>{displayName}</p>
          {user.slug && <p style={{ margin: '3px 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>@{user.slug}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,140,0,0.15)', border: '1px solid rgba(255,140,0,0.3)', color: '#FF8C00' }}>AFK SMASH</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818CF8' }}>START.GG</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
          <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#FF8C00,#E85D00)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Estadísticas</p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Victorias', value: totalW,          color: '#22C55E' },
            { label: 'Derrotas',  value: totalL,          color: '#EF4444' },
            { label: 'Partidas',  value: totalW + totalL, color: '#FF8C00' },
            { label: 'W/R', value: (totalW + totalL) > 0 ? Math.round(totalW * 100 / (totalW + totalL)) + '%' : '—', color: '#F59E0B' },
          ].map(st => (
            <div key={st.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: st.color }}>{loading ? '—' : st.value}</p>
              <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{st.label}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
          <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#FF8C00,#E85D00)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>⚔️ Ranked</p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {(['switch', 'parsec']).map(plat => {
            const st = stats?.[plat];
            const total = (st?.wins || 0) + (st?.losses || 0);
            const unranked  = !st?.placementDone && total === 0;
            const inPlace   = !st?.placementDone && total > 0;
            const rankName  = st?.rank || '';
            const pts       = st?.rankPoints || 0;
            const isSmasher = rankName === 'Smasher';
            const rankObj   = RANKS.find(r => r.name === rankName);
            const rankColor = rankObj ? rankObj.color : 'rgba(255,255,255,0.2)';
            const tierIcon  = rankObj ? (TIER_ICONS[rankObj.tier] || '🎮') : '?';
            return (
              <div key={plat} onClick={() => setShowRanks(true)} style={{ flex: 1, background: unranked ? 'rgba(255,255,255,0.04)' : inPlace ? 'rgba(255,140,0,0.04)' : 'linear-gradient(160deg,' + rankColor + '15 0%,transparent 60%)', border: '1px solid ' + (unranked ? 'rgba(255,255,255,0.07)' : inPlace ? 'rgba(255,140,0,0.2)' : rankColor + '30'), borderRadius: 16, padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'transform 0.15s', position: 'relative' }}>
                <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: platColor(plat), alignSelf: 'flex-start' }}>{platLabel(plat)}</p>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: unranked ? 'rgba(255,255,255,0.05)' : inPlace ? 'rgba(255,140,0,0.1)' : rankColor + '18', border: '2px solid ' + (unranked ? 'rgba(255,255,255,0.1)' : inPlace ? 'rgba(255,140,0,0.3)' : rankColor + '50'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  {unranked ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 20 }}>?</span> : inPlace ? '⚔️' : tierIcon}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: unranked ? 'rgba(255,255,255,0.2)' : inPlace ? '#FF8C00' : rankColor, textAlign: 'center' }}>
                  {unranked ? 'UNRANKED' : inPlace ? 'CLAS. ' + total + '/5' : rankName}
                </p>
                {!unranked && !inPlace && !isSmasher && (
                  <div style={{ width: '100%', marginTop: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>RR</span>
                      <span style={{ fontSize: 8, fontWeight: 800, color: rankColor }}>{pts}/100</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 5, overflow: 'hidden' }}>
                      <div style={{ width: Math.min(100, pts) + '%', height: '100%', background: rankColor, borderRadius: 3 }} />
                    </div>
                  </div>
                )}
                {isSmasher && <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 800, color: '#FF8C00' }}>{pts} RP</p>}
                <p style={{ margin: '6px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                  <span style={{ color: '#22C55E', fontWeight: 700 }}>{st?.wins || 0}W</span>{' · '}<span style={{ color: '#EF4444', fontWeight: 700 }}>{st?.losses || 0}L</span>
                </p>
              </div>
            );
          })}
        </div>

        {/* ═══ RANKED 2v2 ═══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
          <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#7C3AED,#4F46E5)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>👥 Ranked 2v2</p>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {(['switch', 'parsec']).map(plat => {
            const st = doublesStats?.[plat];
            const total = (st?.wins || 0) + (st?.losses || 0);
            const unranked = !st?.placementDone && total === 0;
            const inPlace = !st?.placementDone && total > 0;
            const rankName = st?.rank || '';
            const pts = st?.rankPoints || 0;
            const isSmasher = rankName === 'Smasher';
            const rankObj = RANKS.find(r => r.name === rankName);
            const rankColor = rankObj ? rankObj.color : 'rgba(255,255,255,0.2)';
            const tierIcon = rankObj ? (TIER_ICONS[rankObj.tier] || '🎮') : '?';
            return (
              <div key={plat} onClick={() => setShowRanks(true)} style={{ flex: 1, background: unranked ? 'rgba(124,58,237,0.04)' : inPlace ? 'rgba(124,58,237,0.06)' : 'linear-gradient(160deg,' + rankColor + '15 0%,transparent 60%)', border: '1px solid ' + (unranked ? 'rgba(124,58,237,0.12)' : inPlace ? 'rgba(124,58,237,0.25)' : rankColor + '30'), borderRadius: 16, padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', position: 'relative' }}>
                <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: platColor(plat), alignSelf: 'flex-start' }}>2v2 {platLabel(plat)}</p>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: unranked ? 'rgba(124,58,237,0.08)' : inPlace ? 'rgba(124,58,237,0.12)' : rankColor + '18', border: '2px solid ' + (unranked ? 'rgba(124,58,237,0.2)' : inPlace ? 'rgba(124,58,237,0.35)' : rankColor + '50'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {unranked ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 16 }}>?</span> : inPlace ? '⚔️' : tierIcon}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: unranked ? 'rgba(255,255,255,0.2)' : inPlace ? '#7C3AED' : rankColor, textAlign: 'center' }}>
                  {unranked ? 'UNRANKED' : inPlace ? 'CLAS. ' + total + '/5' : rankName}
                </p>
                {!unranked && !inPlace && !isSmasher && (
                  <div style={{ width: '100%', marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>RR</span>
                      <span style={{ fontSize: 8, fontWeight: 800, color: rankColor }}>{pts}/100</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                      <div style={{ width: Math.min(100, pts) + '%', height: '100%', background: rankColor, borderRadius: 3 }} />
                    </div>
                  </div>
                )}
                {isSmasher && <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 800, color: '#7C3AED' }}>{pts} RP</p>}
                <p style={{ margin: '4px 0 0', fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>
                  <span style={{ color: '#22C55E', fontWeight: 700 }}>{st?.wins || 0}W</span>{' · '}<span style={{ color: '#EF4444', fontWeight: 700 }}>{st?.losses || 0}L</span>
                </p>
              </div>
            );
          })}
        </div>

        {/* Party estado */}
        {partyState && partyState.status !== 'none' && (
          <div style={{ marginBottom: 16, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>👥</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 800, color: '#A78BFA' }}>Party Dobles</p>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                {partyState.status === 'pending' ? 'Esperando que acepten la invitación…' : partyState.status === 'ready' ? '¡Listo! Andá a Ranked para buscar partida 2v2' : partyState.status === 'searching' ? 'Buscando rivales 2v2…' : partyState.status}
              </p>
            </div>
            <button onClick={leaveParty} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Salir</button>
          </div>
        )}

        {/* ═══ AMIGOS — Estilo Valorant ═══ */}
        {uid && (
          <div style={{ marginBottom: 24, background: '#0D0D15', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Lista de amigos</p>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{friends.length}</span>
            </div>

            {/* Tab switcher */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setFriendTab('list')} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderBottom: friendTab === 'list' ? '2px solid #34D399' : '2px solid transparent', transition: 'all 0.15s' }}>
                <span style={{ fontSize: 16, color: friendTab === 'list' ? '#fff' : 'rgba(255,255,255,0.3)' }}>☰</span>
              </button>
              <button onClick={() => setFriendTab('requests')} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderBottom: friendTab === 'requests' ? '2px solid #FF8C00' : '2px solid transparent', transition: 'all 0.15s', position: 'relative' }}>
                <span style={{ fontSize: 16, color: friendTab === 'requests' ? '#fff' : 'rgba(255,255,255,0.3)' }}>📩</span>
                {friendRequests.length > 0 && (
                  <span style={{ position: 'absolute', top: 4, right: '30%', minWidth: 16, height: 16, borderRadius: 8, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{friendRequests.length}</span>
                )}
              </button>
              <button onClick={() => setFriendTab('add')} style={{ flex: 1, padding: '10px 0', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderBottom: friendTab === 'add' ? '2px solid #34D399' : '2px solid transparent', transition: 'all 0.15s' }}>
                <span style={{ fontSize: 16, color: friendTab === 'add' ? '#fff' : 'rgba(255,255,255,0.3)' }}>👤+</span>
              </button>
            </div>

            {friendTab === 'list' ? (
              <div>
                {/* Search dentro de amigos */}
                <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 12px' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>🔍</span>
                    <input
                      value={friendSearch}
                      onChange={e => { setFriendSearch(e.target.value); setFriendTab('add'); }}
                      placeholder="Buscar amigo…"
                      maxLength={50}
                      style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 12, outline: 'none' }}
                    />
                  </div>
                </div>

                {friends.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 24 }}>👥</p>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>Sin amigos aún</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Tocá 👤+ para buscar y agregar jugadores</p>
                  </div>
                ) : (
                  <div>
                    {/* Grupo: En partida */}
                    {(() => {
                      const inMatch = friends.filter(f => f.online === 'in_match');
                      if (inMatch.length === 0) return null;
                      return (
                        <div>
                          <button onClick={() => setFriendCollapsed(p => ({ ...p, in_match: !p.in_match }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(52,211,153,0.04)', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                            <span style={{ fontSize: 12, color: '#34D399' }}>⚔️</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1, textAlign: 'left' }}>En partida ({inMatch.length})</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', transform: friendCollapsed.in_match ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>▼</span>
                          </button>
                          {!friendCollapsed.in_match && inMatch.map(f => (
                            <div key={f.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}>
                              <div onClick={() => openProfile(f.userId, f.userName)} style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#34D399,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0, position: 'relative', cursor: 'pointer' }}>
                                {(f.userName || '?').charAt(0).toUpperCase()}
                                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: '#34D399', border: '2px solid #0D0D15' }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => openProfile(f.userId, f.userName)}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.userName}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                                  <span style={{ fontSize: 10, color: '#34D399', fontWeight: 600 }}>En partida</span>
                                  {f.placementDone && f.rank ? <RankBadge rankName={f.rank} /> : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>Unranked</span>}
                                </div>
                              </div>
                              <button onClick={() => { setChatOpen({ userId: f.userId, userName: f.userName }); setChatMessages([]); }} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(99,102,241,0.1)', color: '#818CF8', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>💬</button>
                              <button onClick={() => removeFriend(f.userId)} style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.5)', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>✕</button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Grupo: Buscando */}
                    {(() => {
                      const searching = friends.filter(f => f.online === 'searching');
                      if (searching.length === 0) return null;
                      return (
                        <div>
                          <button onClick={() => setFriendCollapsed(p => ({ ...p, searching: !p.searching }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(251,191,36,0.04)', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                            <span style={{ fontSize: 12, color: '#FBBF24' }}>🔍</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1, textAlign: 'left' }}>Buscando ({searching.length})</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', transform: friendCollapsed.searching ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>▼</span>
                          </button>
                          {!friendCollapsed.searching && searching.map(f => (
                            <div key={f.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}>
                              <div onClick={() => openProfile(f.userId, f.userName)} style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#FBBF24,#D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0, position: 'relative', cursor: 'pointer' }}>
                                {(f.userName || '?').charAt(0).toUpperCase()}
                                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: '#FBBF24', border: '2px solid #0D0D15' }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => openProfile(f.userId, f.userName)}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.userName}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                                  <span style={{ fontSize: 10, color: '#FBBF24', fontWeight: 600 }}>Buscando…</span>
                                  {f.placementDone && f.rank ? <RankBadge rankName={f.rank} /> : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>Unranked</span>}
                                </div>
                              </div>
                              <button onClick={() => { setChatOpen({ userId: f.userId, userName: f.userName }); setChatMessages([]); }} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(99,102,241,0.1)', color: '#818CF8', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>💬</button>
                              <button onClick={() => removeFriend(f.userId)} style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.5)', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>✕</button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Grupo: Desconectado */}
                    {(() => {
                      const offline = friends.filter(f => f.online !== 'in_match' && f.online !== 'searching');
                      if (offline.length === 0) return null;
                      return (
                        <div>
                          <button onClick={() => setFriendCollapsed(p => ({ ...p, offline: !p.offline }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>💤</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1, textAlign: 'left' }}>Desconectado ({offline.length})</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.15)', transform: friendCollapsed.offline ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>▼</span>
                          </button>
                          {!friendCollapsed.offline && offline.map(f => (
                            <div key={f.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: 0.6 }}>
                              <div onClick={() => openProfile(f.userId, f.userName)} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.3)', flexShrink: 0, position: 'relative', cursor: 'pointer' }}>
                                {(f.userName || '?').charAt(0).toUpperCase()}
                                <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid #0D0D15' }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => openProfile(f.userId, f.userName)}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.userName}</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>Desconectado</span>
                                  {f.placementDone && f.rank ? <RankBadge rankName={f.rank} /> : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)' }}>Unranked</span>}
                                </div>
                              </div>
                              <button onClick={() => { setChatOpen({ userId: f.userId, userName: f.userName }); setChatMessages([]); }} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(99,102,241,0.08)', color: 'rgba(99,102,241,0.5)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>💬</button>
                              <button onClick={() => removeFriend(f.userId)} style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.08)', color: 'rgba(239,68,68,0.4)', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>✕</button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : friendTab === 'requests' ? (
              /* Tab: Solicitudes de amistad */
              <div>
                {friendRequests.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 24 }}>📩</p>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>Sin solicitudes</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Las solicitudes de amistad aparecen acá</p>
                  </div>
                ) : (
                  <div>
                    {friendRequests.map(rq => (
                      <div key={rq.fromId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div onClick={() => openProfile(rq.fromId, rq.fromName)} style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff', flexShrink: 0, cursor: 'pointer' }}>
                          {(rq.fromName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => openProfile(rq.fromId, rq.fromName)}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rq.fromName}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Quiere ser tu amigo</p>
                        </div>
                        <button onClick={() => acceptRequest(rq.fromId, rq.fromName)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.15)', color: '#34D399', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>✓</button>
                        <button onClick={() => rejectRequest(rq.fromId)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Tab: Agregar amigo */
              <div>
                <div style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10, padding: '10px 12px' }}>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>👤+</span>
                      <input
                        value={friendSearch}
                        onChange={e => setFriendSearch(e.target.value)}
                        placeholder="Nombre de jugador…"
                        maxLength={50}
                        style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 12, outline: 'none' }}
                      />
                    </div>
                    {friendSearch.length >= 2 && (
                      <button onClick={() => { setFriendSearch(''); setFriendResults([]); }} style={{ padding: '0 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>✕</button>
                    )}
                  </div>
                </div>

                {/* Resultados de búsqueda */}
                {friendSearching ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Buscando…</p>
                  </div>
                ) : friendResults.length > 0 ? (
                  <div>
                    {friendResults.map(p => {
                      const alreadyFriend = friends.find(f => f.userId === p.userId);
                      const alreadySent = sentRequests.find(s => s.toId === p.userId);
                      return (
                        <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div onClick={() => openProfile(p.userId, p.userName)} style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0, cursor: 'pointer' }}>
                            {(p.userName || '?').charAt(0).toUpperCase()}
                          </div>
                          <p onClick={() => openProfile(p.userId, p.userName)} style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{p.userName}</p>
                          {alreadyFriend ? (
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', padding: '4px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>Ya agregado</span>
                          ) : alreadySent ? (
                            <span style={{ fontSize: 10, color: '#F59E0B', padding: '4px 10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontWeight: 700 }}>Pendiente</span>
                          ) : (
                            <button onClick={() => addFriend(p.userId, p.userName)} disabled={friendAdding === p.userId} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)', color: '#34D399', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                              {friendAdding === p.userId ? '…' : '📩 Solicitud'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : friendSearch.length >= 2 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>No se encontraron jugadores</p>
                  </div>
                ) : (
                  <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Escribí un nombre para buscar</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>Mínimo 2 caracteres</p>
                  </div>
                )}

                {/* ── Solicitudes enviadas ── */}
                {sentRequests.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
                    <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12 }}>📤</span>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Solicitudes enviadas</p>
                    </div>
                    {sentRequests.map(sr => (
                      <div key={sr.toId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div onClick={() => openProfile(sr.toId, sr.toName)} style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#F59E0B,#D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0, cursor: 'pointer' }}>
                          {(sr.toName || '?').charAt(0).toUpperCase()}
                        </div>
                        <p onClick={() => openProfile(sr.toId, sr.toName)} style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{sr.toName}</p>
                        <span style={{ fontSize: 10, color: '#F59E0B', padding: '4px 10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontWeight: 700 }}>Pendiente</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Jugados recientemente ── */}
                {(() => {
                  const friendIds = new Set(friends.map(f => f.userId));
                  const sentIds = new Set(sentRequests.map(s => s.toId));
                  const seen = new Set();
                  const recentPlayers = [];
                  for (const m of history) {
                    const oppId = String(m.winnerId) === String(user.id || user.slug) ? m.loserId : m.winnerId;
                    const oppName = String(m.winnerId) === String(user.id || user.slug) ? m.loserName : m.winnerName;
                    if (!oppId || oppId === String(user.id || user.slug) || friendIds.has(oppId) || seen.has(oppId)) continue;
                    seen.add(oppId);
                    recentPlayers.push({ id: oppId, name: oppName });
                    if (recentPlayers.length >= 10) break;
                  }
                  if (recentPlayers.length === 0) return null;
                  return (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
                      <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12 }}>🕹️</span>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Jugados recientemente</p>
                      </div>
                      {recentPlayers.map(rp => (
                        <div key={rp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <div onClick={() => openProfile(rp.id, rp.name)} style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0, cursor: 'pointer' }}>
                            {(rp.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <p onClick={() => openProfile(rp.id, rp.name)} style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{rp.name}</p>
                          {sentIds.has(rp.id) ? (
                            <span style={{ fontSize: 10, color: '#F59E0B', padding: '4px 10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontWeight: 700 }}>Pendiente</span>
                          ) : (
                            <button onClick={() => addFriend(rp.id, rp.name)} disabled={friendAdding === rp.id} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)', color: '#34D399', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                              {friendAdding === rp.id ? '…' : '📩 Solicitud'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ═══ CHAT ENTRE AMIGOS ═══ */}
        {chatOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 9998, display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#0D0D15' }}>
              <button onClick={() => setChatOpen(null)} style={{ background: 'none', border: 'none', color: '#FF8C00', fontSize: 18, cursor: 'pointer', padding: 4, flexShrink: 0 }}>←</button>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {(() => {
                  const chatFriend = friends.find(f => f.userId === chatOpen.userId);
                  const avatar = chatFriend?.avatar || null;
                  return avatar
                    ? <img src={avatar} alt={chatOpen.userName} style={{ width: 36, height: 36, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(124,58,237,0.4)' }} />
                    : <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,#6366F1,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff' }}>
                        {(chatOpen.userName || '?').charAt(0).toUpperCase()}
                      </div>;
                })()}
                {(() => {
                  const chatFriend = friends.find(f => f.userId === chatOpen.userId);
                  if (!chatFriend) return null;
                  const c = chatFriend.online === 'in_match' ? '#34D399' : chatFriend.online === 'searching' ? '#FBBF24' : 'rgba(255,255,255,0.15)';
                  return <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: c, border: '2px solid #0D0D15' }} />;
                })()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chatOpen.userName}</p>
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Chat privado</p>
              </div>
              {!partyState && (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {['switch', 'parsec'].map(plat => (
                    <button key={plat} onClick={() => inviteToDoubles(chatOpen.userId, chatOpen.userName, plat)} style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.1)', color: '#A78BFA', fontWeight: 700, fontSize: 8, cursor: 'pointer', textTransform: 'uppercase', lineHeight: 1.2 }}>
                      🎮 2v2<br/>{plat === 'switch' ? 'SW' : 'PC'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Party banner */}
            {partyState && (
              <div style={{ padding: '8px 18px', background: 'rgba(124,58,237,0.08)', borderBottom: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14 }}>👥</span>
                <p style={{ margin: 0, flex: 1, fontSize: 12, color: '#A78BFA', fontWeight: 700 }}>
                  Party {partyState.status === 'pending' ? '(esperando respuesta)' : partyState.status === 'ready' ? '✓ Listo' : partyState.status === 'searching' ? '🔍 Buscando…' : partyState.status}
                </p>
                <button onClick={leaveParty} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>Salir</button>
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {chatMessages.length === 0 && (
                <p style={{ margin: 'auto', fontSize: 13, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '40px 0' }}>No hay mensajes aún. ¡Escribí algo!</p>
              )}
              {chatMessages.map(m => {
                const isMe = m.from === uid;
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    {!isMe && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>{m.fromName}</span>}
                    <div style={{ maxWidth: '80%', background: isMe ? 'rgba(232,142,0,0.18)' : 'rgba(255,255,255,0.06)', border: '1px solid ' + (isMe ? 'rgba(232,142,0,0.25)' : 'rgba(255,255,255,0.08)'), borderRadius: 14, padding: '8px 12px' }}>
                      <p style={{ margin: 0, fontSize: 14, color: '#fff', wordBreak: 'break-word' }}>{m.text}</p>
                    </div>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', marginTop: 2 }}>{new Date(m.sentAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: 8, padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0D0D15' }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                placeholder="Escribí un mensaje…"
                maxLength={500}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
              />
              <button onClick={sendChatMessage} disabled={!chatInput.trim() || chatSending} style={{ background: 'rgba(232,142,0,0.15)', border: '1px solid rgba(232,142,0,0.3)', borderRadius: 12, padding: '0 16px', color: '#FF8C00', fontWeight: 700, cursor: 'pointer', fontSize: 20 }}>→</button>
            </div>
          </div>
        )}

        {/* ═══ MODAL PERFIL JUGADOR ═══ */}
        {viewProfile && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* Header con avatar */}
            <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(160deg,rgba(124,58,237,0.09) 0%,rgba(232,142,0,0.06) 50%,transparent 80%)', position: 'sticky', top: 0, zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setViewProfile(null)} style={{ background: 'none', border: 'none', color: '#FF8C00', fontSize: 18, cursor: 'pointer', padding: 4 }}>←</button>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {profileData?.profile?.avatar
                    ? <img src={profileData.profile.avatar} alt={viewProfile.userName} style={{ width: 56, height: 56, borderRadius: 18, objectFit: 'cover', border: '2px solid rgba(124,58,237,0.5)' }} />
                    : <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#6366F1,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#fff', boxShadow: '0 6px 16px rgba(99,102,241,0.3)' }}>
                        {(viewProfile.userName || '?').charAt(0).toUpperCase()}
                      </div>
                  }
                  {(() => {
                    const friendEntry = friends.find(f => f.userId === viewProfile.userId);
                    if (!friendEntry) return null;
                    const onlineColor = friendEntry.online === 'in_match' ? '#34D399' : friendEntry.online === 'searching' ? '#FBBF24' : 'rgba(255,255,255,0.2)';
                    return <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: onlineColor, border: '2px solid #0D0D15', boxShadow: friendEntry.online !== 'offline' ? '0 0 6px ' + onlineColor : 'none' }} />;
                  })()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>{viewProfile.userName}</p>
                  {(() => {
                    const friendEntry = friends.find(f => f.userId === viewProfile.userId);
                    if (friendEntry) {
                      const statusText = friendEntry.online === 'in_match' ? 'En partida' : friendEntry.online === 'searching' ? 'Buscando partida…' : 'Desconectado';
                      const statusColor = friendEntry.online === 'in_match' ? '#34D399' : friendEntry.online === 'searching' ? '#FBBF24' : 'rgba(255,255,255,0.3)';
                      return <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: statusColor }}>● {statusText}</p>;
                    }
                    return <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Perfil de jugador</p>;
                  })()}
                </div>
                {!friends.find(f => f.userId === viewProfile.userId) && viewProfile.userId !== uid && (
                  <button onClick={() => addFriend(viewProfile.userId, viewProfile.userName)} disabled={friendAdding === viewProfile.userId} style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)', color: '#34D399', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                    {friendAdding === viewProfile.userId ? '…' : '📩 Agregar'}
                  </button>
                )}
              </div>
            </div>

            {profileLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Cargando perfil…</p>
              </div>
            ) : profileData ? (
              <div style={{ padding: '16px 18px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
                {/* ── Ranked 1v1 ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 12 }}>⚔️</span>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ranked 1v1</p>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  {['switch', 'parsec'].map(plat => {
                    const s = profileData.stats?.[plat] || {};
                    const wins = s.wins || 0;
                    const losses = s.losses || 0;
                    const total = wins + losses;
                    const rp = s.rankedPoints || 0;
                    const rankName = s.rank || 'Plástico 1';
                    const inPlacement = total > 0 && total < 5;
                    const isUnranked = total === 0;
                    const rankObj = RANKS.find(r => r.name === rankName) || RANKS[0];
                    const tierIcon = rankObj ? (TIER_ICONS[rankObj.tier] || '🎮') : '?';
                    const rankColor = rankObj?.color || '#9CA3AF';
                    return (
                      <div key={plat} style={{ flex: 1, background: isUnranked ? 'rgba(255,255,255,0.03)' : inPlacement ? 'rgba(255,140,0,0.04)' : 'linear-gradient(160deg,' + rankColor + '15 0%,transparent 60%)', border: '1px solid ' + (isUnranked ? 'rgba(255,255,255,0.06)' : inPlacement ? 'rgba(255,140,0,0.2)' : rankColor + '30'), borderRadius: 14, padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{platLabel(plat)}</span>
                        {isUnranked ? (
                          <>
                            <span style={{ fontSize: 20 }}>❔</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Unranked</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>0/5 partidas</span>
                          </>
                        ) : inPlacement ? (
                          <>
                            <span style={{ fontSize: 20 }}>{tierIcon}</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#FF8C00' }}>Clasificando</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{total}/5 partidas · faltan {5 - total}</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 20 }}>{tierIcon}</span>
                            <span style={{ fontSize: 12, fontWeight: 900, color: rankColor }}>{rankName}</span>
                            <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 2 }}>
                              <div style={{ height: '100%', borderRadius: 2, background: rankColor, width: Math.min(rp, 100) + '%', transition: 'width 0.3s' }} />
                            </div>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{rp} RP</span>
                          </>
                        )}
                        {total > 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{wins}W - {losses}L</span>}
                      </div>
                    );
                  })}
                </div>

                {/* ── Ranked 2v2 ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 12 }}>👥</span>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ranked 2v2</p>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                  {['switch', 'parsec'].map(plat => {
                    const s = profileData.doublesStats?.[plat] || {};
                    const wins = s.wins || 0;
                    const losses = s.losses || 0;
                    const total = wins + losses;
                    const rp = s.rankedPoints || 0;
                    const rankName = s.rank || 'Plástico 1';
                    const inPlacement = total < 5;
                    const rankObj = RANKS.find(r => r.name === rankName) || RANKS[0];
                    const tierIcon = rankObj ? (TIER_ICONS[rankObj.tier] || '🎮') : '?';
                    const rankColor = rankObj?.color || '#9CA3AF';
                    return (
                      <div key={plat} style={{ flex: 1, background: total === 0 ? 'rgba(255,255,255,0.03)' : inPlacement ? 'rgba(124,58,237,0.04)' : 'linear-gradient(160deg,' + rankColor + '15 0%,transparent 60%)', border: '1px solid ' + (total === 0 ? 'rgba(255,255,255,0.06)' : inPlacement ? 'rgba(124,58,237,0.2)' : rankColor + '30'), borderRadius: 14, padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{platLabel(plat)}</span>
                        {total === 0 ? (
                          <>
                            <span style={{ fontSize: 20 }}>❔</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Unranked</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>0/5 partidas</span>
                          </>
                        ) : inPlacement ? (
                          <>
                            <span style={{ fontSize: 20 }}>{tierIcon}</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#A78BFA' }}>Clasificando</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{total}/5 partidas · faltan {5 - total}</span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 20 }}>{tierIcon}</span>
                            <span style={{ fontSize: 12, fontWeight: 900, color: rankColor }}>{rankName}</span>
                            <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 2 }}>
                              <div style={{ height: '100%', borderRadius: 2, background: rankColor, width: Math.min(rp, 100) + '%', transition: 'width 0.3s' }} />
                            </div>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{rp} RP</span>
                          </>
                        )}
                        {total > 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{wins}W - {losses}L</span>}
                      </div>
                    );
                  })}
                </div>

                {/* ── Resumen general ── */}
                {(() => {
                  const sw1 = profileData.stats?.switch || {};
                  const pc1 = profileData.stats?.parsec || {};
                  const sw2 = profileData.doublesStats?.switch || {};
                  const pc2 = profileData.doublesStats?.parsec || {};
                  const tW = (sw1.wins || 0) + (pc1.wins || 0) + (sw2.wins || 0) + (pc2.wins || 0);
                  const tL = (sw1.losses || 0) + (pc1.losses || 0) + (sw2.losses || 0) + (pc2.losses || 0);
                  const tT = tW + tL;
                  const wr = tT > 0 ? Math.round((tW / tT) * 100) : 0;
                  return (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#fff' }}>{tT}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Partidas</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#22C55E' }}>{tW}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Victorias</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#EF4444' }}>{tL}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Derrotas</p>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#FF8C00' }}>{wr}%</p>
                        <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Winrate</p>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Historial ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 12 }}>📋</span>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Historial</p>
                </div>
                {(!profileData.history || profileData.history.length === 0) ? (
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '24px 16px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Sin partidas registradas</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {profileData.history.slice(0, 20).map((m, i) => {
                      const isWin = String(m.winnerId) === String(viewProfile.userId);
                      const opponent = isWin ? m.loserName : m.winnerName;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: isWin ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)', border: '1px solid ' + (isWin ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)'), borderLeft: '3px solid ' + (isWin ? '#22C55E' : '#EF4444'), borderRadius: 10, padding: '8px 12px' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: isWin ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: isWin ? '#22C55E' : '#EF4444' }}>
                            {isWin ? 'W' : 'L'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>vs {opponent}</p>
                            <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{platLabel(m.platform)} · {timeAgo(m.playedAt)}</p>
                          </div>
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: isWin ? '#22C55E' : '#EF4444', flexShrink: 0 }}>{isWin ? 'WIN' : 'LOSS'}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No se pudo cargar el perfil</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ MODAL RANGOS ═══ */}
        {showRanks && (
          <div onClick={() => setShowRanks(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, maxHeight: '85vh', overflowY: 'auto', background: '#12121E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, background: '#12121E', borderRadius: '20px 20px 0 0', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>🏅</span>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#fff' }}>Todos los rangos</p>
                </div>
                <button onClick={() => setShowRanks(false)} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              {/* Ranks grid — estilo Valorant */}
              <div style={{ padding: '8px 6px' }}>
                {/* Tier headers */}
                {(() => {
                  const tiers = ['Plástico','Madera','Hierro','Bronce','Plata','Oro','Platino','Diamante','Smasher'];
                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 3, marginBottom: 3 }}>
                        {tiers.map(tier => {
                          const r0 = RANKS.find(r => r.tier === tier);
                          return (
                            <div key={tier} style={{ textAlign: 'center', padding: '4px 1px', borderBottom: '2px solid ' + (r0?.color || '#555') }}>
                              <p style={{ margin: 0, fontSize: 7, fontWeight: 900, color: r0?.color || '#fff', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden' }}>{tier.slice(0, 4).toUpperCase()}</p>
                            </div>
                          );
                        })}
                      </div>
                      {/* Rows: 3, 2, 1 */}
                      {[3, 2, 1].map(num => (
                        <div key={num} style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 3, marginBottom: 3 }}>
                          {tiers.map(tier => {
                            const icon = TIER_ICONS[tier] || '🎮';
                            const rankName = tier === 'Smasher' ? 'Smasher' : `${tier} ${num}`;
                            const r = RANKS.find(x => x.name === rankName);
                            if (!r && tier !== 'Smasher') return <div key={tier} />;
                            if (tier === 'Smasher' && num !== 3) return <div key={tier} />;
                            const obj = r || RANKS.find(x => x.name === 'Smasher');
                            return (
                              <div key={tier} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '5px 1px', background: obj.bg, border: '1px solid ' + obj.border, borderRadius: 8 }}>
                                <span style={{ fontSize: 16 }}>{icon}</span>
                                <p style={{ margin: 0, fontSize: 7, fontWeight: 800, color: obj.color, textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.2 }}>
                                  {tier === 'Smasher' ? 'SMASHER' : `${num}`}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      {/* Unranked row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 3, marginTop: 6 }}>
                        <div style={{ gridColumn: '8 / 10', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '5px 2px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}>
                          <span style={{ fontSize: 16 }}>❓</span>
                          <p style={{ margin: 0, fontSize: 7, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>UNRANKED</p>
                        </div>
                      </div>
                    </>
                  );
                })()}
                {/* Explicación */}
                <div style={{ padding: '10px 8px', marginTop: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>¿Cómo funciona?</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                    Jugá 5 partidas de posicionamiento para obtener tu rango inicial. Ganá +20 RP por victoria, perdé -10 RP por derrota. Al llegar a 100 RP ascendés al siguiente rango. ¡Llegá a Smasher para ser el mejor!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
          <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#6366F1,#4F46E5)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>📋 Historial de partidas</p>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Cargando...</div>
        ) : history.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '32px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 28, margin: '0 0 8px' }}>⚔️</p>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Sin partidas aún</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Jugá partidas ranked para ver tu historial</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map((m, i) => {
              const isWin    = String(m.winnerId) === String(user.id || user.slug);
              const opponent = isWin ? m.loserName : m.winnerName;
              const opponentId = isWin ? m.loserId : m.winnerId;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isWin ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', border: '1px solid ' + (isWin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)'), borderLeft: '3px solid ' + (isWin ? '#22C55E' : '#EF4444'), borderRadius: 12, padding: '10px 14px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: isWin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: isWin ? '#22C55E' : '#EF4444' }}>
                    {isWin ? 'W' : 'L'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, cursor: opponentId ? 'pointer' : 'default' }} onClick={() => opponentId && openProfile(opponentId, opponent)}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>vs {opponent}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{platLabel(m.platform)} · {timeAgo(m.playedAt)}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: isWin ? '#22C55E' : '#EF4444' }}>{isWin ? 'VICTORIA' : 'DERROTA'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


/* â”€â”€â”€ NOTIF CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function NotifCard({ notif, onDismiss, userId, userName }) {
  const isRead = !!notif.readAt;
  const t = new Date(notif.sentAt);
  const timeStr = t.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const [acting, setActing] = useState(false);

  const isFriendReq = notif.type === 'friend_request';
  const isPartyInvite = notif.type === 'party_invite';
  const hasActions = (isFriendReq || isPartyInvite) && !isRead;

  const icon = isFriendReq ? '📩' : isPartyInvite ? '👥' : '🎮';
  const accentColor = isFriendReq ? 'rgba(99,102,241,' : isPartyInvite ? 'rgba(124,58,237,' : 'rgba(232,142,0,';

  const handleAction = async (action) => {
    if (acting) return;
    setActing(true);
    try {
      if (isFriendReq) {
        await fetch('/api/friends', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, userName, fromId: notif.fromId, action }),
        });
      } else if (isPartyInvite) {
        await fetch('/api/party', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, partyId: notif.partyId, action }),
        });
      }
      onDismiss(notif.id);
    } catch {}
    finally { setActing(false); }
  };

  return (
    <div style={{
      background: isRead ? '#10101A' : accentColor + '0.06)',
      border: `1px solid ${isRead ? 'rgba(255,255,255,0.05)' : accentColor + '0.22)'}`,
      borderRadius: 16, padding: '14px 16px', marginBottom: 10,
      display: 'flex', gap: 14, alignItems: 'flex-start',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 14, background: isRead ? 'rgba(255,255,255,0.04)' : accentColor + '0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 3px', fontSize: 14, fontWeight: 800, color: isRead ? 'rgba(255,255,255,0.45)' : '#fff' }}>
          {notif.setup}
        </p>
        <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
          {notif.message}
        </p>
        {hasActions ? (
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button onClick={() => handleAction('accept')} disabled={acting} style={{
              padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.3)',
              background: 'rgba(52,211,153,0.1)', color: '#34D399', fontSize: 12,
              fontWeight: 700, cursor: acting ? 'not-allowed' : 'pointer',
            }}>✓ Aceptar</button>
            <button onClick={() => handleAction('reject')} disabled={acting} style={{
              padding: '5px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontSize: 12,
              fontWeight: 700, cursor: acting ? 'not-allowed' : 'pointer',
            }}>✕ Rechazar</button>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
            {timeStr} · {notif.sentBy}
          </p>
        )}
      </div>
      {!isRead && !hasActions && (
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TAB — RANKINGS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function TabRankings({ user }) {
  const [mode,        setMode]       = useState('ba');
  const [rankPlat,    setRankPlat]   = useState('switch');
  const [rankBoard,   setRankBoard]  = useState([]);
  const [rankLoading, setRankLoading] = useState(false);
  const [charPlat,    setCharPlat]   = useState('switch');
  const [charSearch,  setCharSearch] = useState('');
  const [charSel,     setCharSel]    = useState(null);
  const [charBoard,   setCharBoard]  = useState([]);
  const [charLoading, setCharLoading] = useState(false);

  // Secciones del ranked
  const [onlinePlayers, setOnlinePlayers] = useState([]);

  // Profile viewing
  const [viewProfile, setViewProfile]       = useState(null);
  const [profileData, setProfileData]       = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const openProfile = (playerId, playerName) => {
    setViewProfile({ userId: playerId, userName: playerName });
    setProfileData(null);
    setProfileLoading(true);
    fetch('/api/players/profile?id=' + encodeURIComponent(playerId) + '&full=true')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setProfileData(d); setProfileLoading(false); })
      .catch(() => setProfileLoading(false));
  };

  // Fetch online players
  useEffect(() => {
    if (mode !== 'ranked' && mode !== 'ranked2v2') return;
    const fetchOnline = () => {
      fetch('/api/matchmaking/online').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.players) setOnlinePlayers(d.players);
      }).catch(() => {});
    };
    fetchOnline();
    const iv = setInterval(fetchOnline, 10000);
    return () => clearInterval(iv);
  }, [mode]);

  const MODES = [
    { id: 'ba',       label: 'AFK'  },
    { id: 'inc',      label: 'INC'       },
    { id: 'char',     label: 'Personaje' },
    { id: 'ranked',   label: 'Ranked'    },
    { id: 'ranked2v2', label: '2v2'      },
  ];

  useEffect(() => {
    if (mode !== 'ranked' && mode !== 'ranked2v2') return;
    setRankLoading(true);
    const modeParam = mode === 'ranked2v2' ? '&mode=doubles' : '';
    fetch(`/api/ranked/leaderboard?platform=${rankPlat}${modeParam}`)
      .then(r => r.json())
      .then(d => { setRankBoard(Array.isArray(d) ? d : []); setRankLoading(false); })
      .catch(() => setRankLoading(false));
  }, [mode, rankPlat]);

  useEffect(() => {
    if (mode !== 'char' || !charSel) return;
    setCharLoading(true);
    setCharBoard([]);
    fetch(`/api/matchmaking/char-stats?platform=${charPlat}&charId=${charSel}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setCharBoard(d?.leaderboard || []); setCharLoading(false); })
      .catch(() => setCharLoading(false));
  }, [mode, charPlat, charSel]);

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

      {(mode === 'ranked' || mode === 'ranked2v2') ? (
        <>
          {mode === 'ranked2v2' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>👥</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#A78BFA' }}>Ranked Dobles (2v2)</p>
            </div>
          )}
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
              <span style={{ fontSize: 44 }}>{mode === 'ranked2v2' ? '👥' : '⚔️'}</span>
              <p style={{ margin: '14px 0 6px', fontWeight: 800, fontSize: 16, color: '#fff' }}>Sin partidas {mode === 'ranked2v2' ? '2v2' : 'ranked'} aún</p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{mode === 'ranked2v2' ? 'Jugá partidas 2v2 para aparecer en este ranking' : 'Jugá partidas en la sección Match para aparecer en este ranking'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rankBoard.some(p => p.rank === 'Smasher') && (
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#FF8C00', letterSpacing: '0.08em' }}>
                  👑 SMASHERS
                </p>
              )}
              {rankBoard.map((p, i) => (
                <RankedPlayerRow key={p.userId} position={i + 1} player={p} onPlayerClick={openProfile} />
              ))}
            </div>
          )}

          {/* ═══ JUGADORES EN LÍNEA ═══ */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Jugadores buscando partida</p>
            </div>
            {onlinePlayers.length === 0 ? (
              <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Nadie buscando partida ahora</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {onlinePlayers.map(p => (
                  <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 14px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 5px #22C55E', flexShrink: 0 }} />
                    <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 700, color: '#fff' }}>{p.userName}</p>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', padding: '2px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                      {p.platform === 'switch' ? '🎮 Switch' : '🖥️ Parsec'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          {/* Selector de plataforma */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[{ id: 'switch', label: '🎮 Switch Online' }, { id: 'parsec', label: '🖥️ Parsec' }].map(p => (
              <button key={p.id} onClick={() => { setCharPlat(p.id); setCharSel(null); }} style={{
                flex: 1, padding: '10px 4px', borderRadius: 12, fontWeight: 700, fontSize: 12,
                cursor: 'pointer', transition: 'all 0.15s',
                background: charPlat === p.id ? 'rgba(232,142,0,0.1)' : '#10101A',
                border: `1px solid ${charPlat === p.id ? 'rgba(232,142,0,0.35)' : 'rgba(255,255,255,0.06)'}`,
                color: charPlat === p.id ? '#FF8C00' : 'rgba(255,255,255,0.35)',
              }}>{p.label}</button>
            ))}
          </div>

          {!charSel ? (
            <>
              {/* Búsqueda + grid */}
              <input
                placeholder="🔍 Buscar personaje…"
                value={charSearch}
                onChange={e => setCharSearch(e.target.value)}
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none',
                  marginBottom: 14, boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                {CHARACTERS.filter(c => c.name.toLowerCase().includes(charSearch.toLowerCase())).map(c => (
                  <button key={c.id} onClick={() => setCharSel(c.id)} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12, padding: 4, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 4,
                  }}>
                    <img src={charImgPath(c.img)} alt={c.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'contain', borderRadius: 8 }} />
                    <p style={{ margin: 0, fontSize: 8, color: 'rgba(255,255,255,0.45)', fontWeight: 600, textAlign: 'center', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{c.name}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Cabecera del personaje */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <button onClick={() => setCharSel(null)} style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '7px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 13,
                }}>← Volver</button>
                {(() => { const c = CHARACTERS.find(x => x.id === charSel); return c ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <img src={charImgPath(c.img)} alt={c.name} style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#fff' }}>{c.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{charPlat === 'switch' ? '🎮 Switch Online' : '🖥️ Parsec'}</p>
                    </div>
                  </div>
                ) : null; })()}
              </div>

              {/* Leaderboard */}
              {charLoading ? (
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
              ) : charBoard.length === 0 ? (
                <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '44px 24px', textAlign: 'center' }}>
                  <span style={{ fontSize: 44 }}>🎮</span>
                  <p style={{ margin: '14px 0 6px', fontWeight: 800, fontSize: 16, color: '#fff' }}>Sin partidas todavía</p>
                  <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Nadie jugó ranked con este personaje en esta plataforma aún</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {charBoard.map((p, i) => {
                    const medals = ['🥇','🥈','🥉'];
                    const winRate = Math.round(p.winRate ?? 0);
                    return (
                      <div key={p.userId} style={{
                        background: i < 3 ? `rgba(255,255,255,0.04)` : '#10101A',
                        border: `1px solid ${i === 0 ? 'rgba(255,215,0,0.18)' : i === 1 ? 'rgba(192,192,192,0.14)' : i === 2 ? 'rgba(205,127,50,0.14)' : 'rgba(255,255,255,0.05)'}`,
                        borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
                      }}>
                        <span style={{ fontSize: i < 3 ? 20 : 13, fontWeight: 800, color: 'rgba(255,255,255,0.3)', width: 24, textAlign: 'center', flexShrink: 0 }}>
                          {i < 3 ? medals[i] : `#${i+1}`}
                        </span>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#fff', flex: 1 }}>{p.userName}</p>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{p.wins}V {p.losses}D</span>
                          <div style={{ background: winRate >= 60 ? 'rgba(52,211,153,0.15)' : winRate >= 40 ? 'rgba(255,200,0,0.12)' : 'rgba(255,80,80,0.12)', border: `1px solid ${winRate >= 60 ? 'rgba(52,211,153,0.3)' : winRate >= 40 ? 'rgba(255,200,0,0.25)' : 'rgba(255,80,80,0.25)'}`, borderRadius: 8, padding: '3px 8px' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: winRate >= 60 ? '#34D399' : winRate >= 40 ? '#FBBF24' : '#F87171' }}>{winRate}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ═══ MODAL PERFIL JUGADOR (Rankings) ═══ */}
      {viewProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#0D0D15', position: 'sticky', top: 0, zIndex: 1 }}>
            <button onClick={() => setViewProfile(null)} style={{ background: 'none', border: 'none', color: '#FF8C00', fontSize: 18, cursor: 'pointer', padding: 4 }}>←</button>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg,#6366F1,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 900, color: '#fff' }}>
              {(viewProfile.userName || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff' }}>{viewProfile.userName}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Perfil de jugador</p>
            </div>
          </div>

          {profileLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Cargando perfil…</p>
            </div>
          ) : profileData ? (
            <div style={{ padding: '16px 18px', maxWidth: 480, margin: '0 auto', width: '100%' }}>
              {/* Ranked 1v1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 12 }}>⚔️</span>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ranked 1v1</p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {['switch', 'parsec'].map(plat => {
                  const s = profileData.stats?.[plat] || {};
                  const wins = s.wins || 0; const losses = s.losses || 0; const total = wins + losses;
                  const rp = s.rankedPoints || 0;
                  const rankName = s.rank || 'Plástico 1';
                  const inP = total < 5;
                  const ro = RANKS.find(r => r.name === rankName) || RANKS[0];
                  const ti = ro ? (TIER_ICONS[ro.tier] || '🎮') : '?';
                  const rc = ro?.color || '#9CA3AF';
                  return (
                    <div key={plat} style={{ flex: 1, background: inP ? 'rgba(255,140,0,0.04)' : 'linear-gradient(160deg,' + rc + '15 0%,transparent 60%)', border: '1px solid ' + (inP ? 'rgba(255,140,0,0.2)' : rc + '30'), borderRadius: 14, padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{platLabel(plat)}</span>
                      {inP ? (<><span style={{ fontSize: 20 }}>📊</span><span style={{ fontSize: 11, fontWeight: 800, color: '#FF8C00' }}>Posicionamiento</span><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{total}/5 partidas</span></>) : (<><span style={{ fontSize: 20 }}>{ti}</span><span style={{ fontSize: 12, fontWeight: 900, color: rc }}>{rankName}</span><div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 2 }}><div style={{ height: '100%', borderRadius: 2, background: rc, width: Math.min(rp, 100) + '%' }} /></div><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{rp} RP</span></>)}
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{wins}W - {losses}L</span>
                    </div>
                  );
                })}
              </div>

              {/* Ranked 2v2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 12 }}>👥</span>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ranked 2v2</p>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {['switch', 'parsec'].map(plat => {
                  const s = profileData.doublesStats?.[plat] || {};
                  const wins = s.wins || 0; const losses = s.losses || 0; const total = wins + losses;
                  const rp = s.rankedPoints || 0;
                  const rankName = s.rank || 'Plástico 1';
                  const inP = total < 5;
                  const ro = RANKS.find(r => r.name === rankName) || RANKS[0];
                  const ti = ro ? (TIER_ICONS[ro.tier] || '🎮') : '?';
                  const rc = ro?.color || '#9CA3AF';
                  return (
                    <div key={plat} style={{ flex: 1, background: total === 0 ? 'rgba(255,255,255,0.03)' : inP ? 'rgba(124,58,237,0.04)' : 'linear-gradient(160deg,' + rc + '15 0%,transparent 60%)', border: '1px solid ' + (total === 0 ? 'rgba(255,255,255,0.06)' : inP ? 'rgba(124,58,237,0.2)' : rc + '30'), borderRadius: 14, padding: '12px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>{platLabel(plat)}</span>
                      {total === 0 ? (<><span style={{ fontSize: 20 }}>➖</span><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Sin partidas</span></>) : inP ? (<><span style={{ fontSize: 20 }}>📊</span><span style={{ fontSize: 11, fontWeight: 800, color: '#A78BFA' }}>Posicionamiento</span><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{total}/5 partidas</span></>) : (<><span style={{ fontSize: 20 }}>{ti}</span><span style={{ fontSize: 12, fontWeight: 900, color: rc }}>{rankName}</span><div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 2 }}><div style={{ height: '100%', borderRadius: 2, background: rc, width: Math.min(rp, 100) + '%' }} /></div><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{rp} RP</span></>)}
                      {total > 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{wins}W - {losses}L</span>}
                    </div>
                  );
                })}
              </div>

              {/* Resumen */}
              {(() => {
                const sw1 = profileData.stats?.switch || {}; const pc1 = profileData.stats?.parsec || {};
                const sw2 = profileData.doublesStats?.switch || {}; const pc2 = profileData.doublesStats?.parsec || {};
                const tW = (sw1.wins||0)+(pc1.wins||0)+(sw2.wins||0)+(pc2.wins||0);
                const tL = (sw1.losses||0)+(pc1.losses||0)+(sw2.losses||0)+(pc2.losses||0);
                const tT = tW+tL; const wr = tT > 0 ? Math.round((tW/tT)*100) : 0;
                return (
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div><p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#fff' }}>{tT}</p><p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Partidas</p></div>
                    <div><p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#22C55E' }}>{tW}</p><p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Victorias</p></div>
                    <div><p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#EF4444' }}>{tL}</p><p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Derrotas</p></div>
                    <div><p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#FF8C00' }}>{wr}%</p><p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Winrate</p></div>
                  </div>
                );
              })()}

              {/* Historial */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 12 }}>📋</span>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Historial</p>
              </div>
              {(!profileData.history || profileData.history.length === 0) ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '24px 16px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Sin partidas registradas</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {profileData.history.slice(0, 20).map((m, i) => {
                    const isWin = String(m.winnerId) === String(viewProfile.userId);
                    const opp = isWin ? m.loserName : m.winnerName;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: isWin ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)', border: '1px solid ' + (isWin ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)'), borderLeft: '3px solid ' + (isWin ? '#22C55E' : '#EF4444'), borderRadius: 10, padding: '8px 12px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: isWin ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: isWin ? '#22C55E' : '#EF4444' }}>{isWin ? 'W' : 'L'}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>vs {opp}</p>
                          <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{platLabel(m.platform)} · {timeAgo(m.playedAt)}</p>
                        </div>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: isWin ? '#22C55E' : '#EF4444', flexShrink: 0 }}>{isWin ? 'WIN' : 'LOSS'}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No se pudo cargar el perfil</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TAB — TORNEOS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TAB — TIPS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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

/* â”€â”€â”€ TIP CARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
          <span style={{ fontSize: 12, fontWeight: 800, color: '#FF8C00' }}>âœï¸ Editando tip</span>
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
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '7px 10px', color: '#EF4444', fontSize: 11, cursor: 'pointer' }}>âœ• Quitar media</button>
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
          <span style={{ fontSize: 20 }}>â–¶ï¸</span>
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
                style={{ background: 'none', border: 'none', color: 'rgba(255,200,0,0.65)', fontSize: 15, cursor: 'pointer', padding: '2px 5px', lineHeight: 1 }}>âœï¸</button>
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
          {showForm ? 'âœ• Cancelar' : '+ Subir tip'}
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
                <button onClick={() => { setTipMediaData(null); setTipMediaName(''); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 10px', color: '#EF4444', fontSize: 11, cursor: 'pointer' }}>âœ• Quitar</button>
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
            <span style={{ fontSize: 13, fontWeight: 700, color: '#34D399' }}>âœ… Tip publicado</span>
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TAB — MATCH
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const STAGE_EMOJI = {
  'Battlefield': '⚔️', 'Final Destination': '🌌', 'Small Battlefield': '🗡️',
  'Pokémon Stadium 2': '⚡', 'Town & City': '🏙️', 'Smashville': '🏡',
  'Hollow Bastion': '🏰', 'Kalos Pokémon League': '🔷',
};

function fmtElapsed(s) { return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; }

/* ─── CharPicker ─────────────────────────────────────────────────────────── */
function CharPicker({ selected, onSelect, platform, userId }) {
  // ─ Estado persistido: personajes usados recientemente ─
  const [recentIds, setRecentIds] = useState([]);

  // Cargar recientes desde Redis al montar (o migrar desde localStorage)
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/matchmaking/recent-chars?userId=${encodeURIComponent(userId)}`)
      .then(r => r.ok ? r.json() : [])
      .then(ids => {
        if (ids && ids.length) {
          setRecentIds(ids);
          // Sincronizar localStorage con lo que tiene Redis
          try { localStorage.setItem('afk_recent_chars', JSON.stringify(ids)); } catch {}
        } else if (typeof window !== 'undefined') {
          // Redis vacío → migrar localStorage a Redis
          try {
            const local = JSON.parse(localStorage.getItem('afk_recent_chars') || '[]');
            if (local.length) {
              setRecentIds(local);
              // Subir todo el array a Redis de una vez
              fetch('/api/matchmaking/recent-chars', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, chars: local }),
              }).catch(() => {});
            }
          } catch {}
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          try { setRecentIds(JSON.parse(localStorage.getItem('afk_recent_chars') || '[]')); } catch {}
        }
      });
  }, [userId]);

  // ─ Estado interno del picker ─
  const [expanded, setExpanded]         = useState(!selected);
  const [search, setSearch]             = useState('');
  const [stats, setStats]               = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Cuando se selecciona un personaje: guardar en recientes y colapsar
  useEffect(() => {
    if (!selected) return;
    setRecentIds(prev => {
      const next = [selected, ...prev.filter(id => id !== selected)].slice(0, 6);
      // Guardar en Redis (y localStorage como cache local)
      if (userId) {
        fetch('/api/matchmaking/recent-chars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, charId: selected }),
        }).catch(() => {});
      }
      try { localStorage.setItem('afk_recent_chars', JSON.stringify(next)); } catch {}
      return next;
    });
    setExpanded(false);
  }, [selected]);

  // Cargar stats cuando se tiene personaje + plataforma
  useEffect(() => {
    if (!selected || !platform || !userId) { setStats(null); return; }
    setLoadingStats(true);
    fetch(`/api/matchmaking/char-stats?platform=${encodeURIComponent(platform)}&charId=${encodeURIComponent(selected)}&userId=${encodeURIComponent(userId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setStats(d))
      .catch(() => setStats(null))
      .finally(() => setLoadingStats(false));
  }, [selected, platform, userId]);

  const char = CHARACTERS.find(c => c.id === selected);

  // ── Vista colapsada (personaje ya elegido) ──────────────────────────────
  if (char && !expanded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.28)', borderRadius: 14 }}>
        <img src={charImgPath(char.img)} alt={char.name} style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 10, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 900, fontSize: 15, color: '#fff' }}>{char.name}</p>
          {loadingStats && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Cargando stats…</p>}
          {!loadingStats && stats?.myStats && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
              {stats.myStats.wins}V · {stats.myStats.losses}D · #{stats.myRank ?? '—'} ranking
            </p>
          )}
          {!loadingStats && !stats?.myStats && platform && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Sin partidas aún con este personaje</p>
          )}
        </div>
        <button
          onClick={() => { setExpanded(true); setSearch(''); }}
          style={{ flexShrink: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '6px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          Cambiar
        </button>
      </div>
    );
  }

  // ── Vista expandida (picker) ────────────────────────────────────────────
  const recents = recentIds.map(id => CHARACTERS.find(c => c.id === id)).filter(Boolean);
  const filtered = CHARACTERS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {/* Personajes recientes */}
      {recents.length > 0 && !search && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Últimos jugados</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {recents.map(c => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                title={c.name}
                style={{
                  background: selected === c.id ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.05)',
                  border: selected === c.id ? '2px solid #FF8C00' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: 4, cursor: 'pointer',
                  width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                <img src={charImgPath(c.img)} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar personaje…"
        style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
      />

      {/* Grilla */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
        {filtered.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            title={c.name}
            style={{
              background: selected === c.id ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.03)',
              border: selected === c.id ? '2px solid #FF8C00' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10, padding: 4, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1',
            }}
          >
            <img src={charImgPath(c.img)} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />
          </button>
        ))}
      </div>

      {/* Botón cancelar cambio (si ya hay uno seleccionado) */}
      {char && (
        <button
          onClick={() => setExpanded(false)}
          style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 12, cursor: 'pointer' }}
        >
          Cancelar
        </button>
      )}
    </div>
  );
}

function TabMatch({ bgMM, setBgMM, userId, userName }) {
  const uid = userId || '';
  const uName = userName || 'Jugador';

  const p = bgMM?.plat ? PLATFORMS.find(x => x.id === bgMM.plat) : null;
  const matchData = bgMM?.room;
  const matchStatus = bgMM?.status;

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState('');
  const [chatSending, setChatSending]   = useState(false);
  const chatBottomRef = useRef(null);

  // Polling de chat
  useEffect(() => {
    if (!matchData?.matchId || !['active','pending_result','disputed'].includes(matchStatus)) return;
    let lastTs = 0;
    const fetchChat = async () => {
      try {
        const url = '/api/matchmaking/chat?matchId=' + encodeURIComponent(matchData.matchId) + (lastTs ? '&since=' + lastTs : '');
        const r = await fetch(url);
        if (!r.ok) return;
        const data = await r.json();
        if (data.messages?.length) {
          lastTs = data.messages[data.messages.length - 1].ts;
          setChatMessages(prev => {
            const ids = new Set(prev.map(m => m.id));
            const newOnes = data.messages.filter(m => !ids.has(m.id));
            return newOnes.length ? [...prev, ...newOnes] : prev;
          });
        }
      } catch {}
    };
    fetchChat();
    const iv = setInterval(fetchChat, 2500);
    return () => clearInterval(iv);
  }, [matchData?.matchId, matchStatus]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatSending || !matchData?.matchId) return;
    setChatSending(true);
    const msg = chatInput.trim();
    setChatInput('');
    try {
      await fetch('/api/matchmaking/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: matchData.matchId, userId: uid, userName: uName, message: msg }),
      });
    } catch {}
    setChatSending(false);
  };

  // Reportar resultado
  const [reported, setReported]           = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError]     = useState(null);
  const [reportStocks, setReportStocks]   = useState(1);
  const [matchRpDelta, setMatchRpDelta]   = useState(null);

  // Estado de búsqueda
  const [searchPlat, setSearchPlat]   = useState(null);
  const [searchChar, setSearchChar]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [formError, setFormError]     = useState(null);
  const [onlineCount, setOnlineCount] = useState(null);
  const [searchElapsed, setSearchElapsed] = useState(0);
  const [matchMode, setMatchMode]     = useState('1v1'); // '1v1' o '2v2'
  const [partyInfo, setPartyInfo]     = useState(null); // Para 2v2

  // Ban state (Bo3)
  const [selectedBans, setSelectedBans] = useState([]);
  const [banLoading, setBanLoading]     = useState(false);

  // Contador online
  useEffect(() => {
    const fetchOnline = () => {
      fetch('/api/matchmaking/online')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setOnlineCount(d); })
        .catch(() => {});
    };
    fetchOnline();
    const iv = setInterval(fetchOnline, 10000);
    return () => clearInterval(iv);
  }, []);

  // Check party status for 2v2
  useEffect(() => {
    if (matchMode !== '2v2' || !uid) return;
    const checkParty = () => {
      fetch('/api/party?userId=' + encodeURIComponent(uid))
        .then(r => r.ok ? r.json() : null)
        .then(d => setPartyInfo(d && d.status !== 'none' ? d : null))
        .catch(() => {});
    };
    checkParty();
    const iv = setInterval(checkParty, 5000);
    return () => clearInterval(iv);
  }, [matchMode, uid]);

  // Timer de búsqueda
  useEffect(() => {
    if (matchStatus !== 'searching') { setSearchElapsed(0); return; }
    setSearchElapsed(0);
    const iv = setInterval(() => setSearchElapsed(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [matchStatus]);

  const reportResult = async (winnerId, stocks) => {
    if (!matchData?.matchId) return;
    setReportLoading(true); setReportError(null);
    try {
      const is2v2 = matchData.mode === '2v2';
      const apiUrl = is2v2 ? '/api/matchmaking/result-doubles' : '/api/matchmaking/result';
      const bodyPayload = is2v2
        ? { matchId: matchData.matchId, reportingUserId: uid, claimedWinnerTeam: winnerId, stocksWon: stocks ?? 1 }
        : { matchId: matchData.matchId, reportingUserId: uid, claimedWinnerId: winnerId, stocksWon: stocks ?? 1 };
      const r = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const data = await r.json();
      if (!r.ok) { setReportError(data.error || 'Error al reportar'); return; }
      setReported(true);
      if (typeof data.rpDelta === 'number') setMatchRpDelta(data.rpDelta);
      if (data.matchStatus === 'banning') {
        setReported(false);
        setReportStocks(1);
        setReportError(null);
        setSelectedBans([]);
      }
      setBgMM(prev => prev ? {
        ...prev,
        room: { ...prev.room, status: data.matchStatus, result: data.result },
        status: data.matchStatus === 'finished' ? 'finished' :
                data.matchStatus === 'banning' ? 'banning' : prev.status,
      } : prev);
    } catch { setReportError('Error de conexión'); }
    finally { setReportLoading(false); }
  };

  const resetAll = () => {
    setBgMM(null);
    setChatMessages([]); setChatInput('');
    setReported(false); setReportError(null);
    setReportStocks(1); setMatchRpDelta(null);
    setSearchPlat(null); setSearchChar(null);
  };

  const startSearch = async (platform) => {
    if (!searchChar) { setFormError('Elegí tu personaje primero'); return; }
    setLoading(true); setFormError(null);
    try {
      const r = await fetch('/api/matchmaking/queue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, userName: uName, platform, charId: searchChar }),
      });
      const data = await r.json();
      if (r.status === 409) {
        // Ya en cola o match activo
        setFormError(data.error);
        return;
      }
      if (!r.ok) { setFormError(data.error || 'Error al buscar'); return; }
      setBgMM({ status: 'searching', plat: platform, polling: true });
    } catch { setFormError('Error de conexión'); }
    finally { setLoading(false); }
  };

  const cancelSearch = async () => {
    try {
      await fetch('/api/matchmaking/queue', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, platform: bgMM?.plat }),
      });
    } catch {}
    setBgMM(null);
  };

  const startSearch2v2 = async (platform) => {
    if (!partyInfo || partyInfo.status !== 'ready') {
      setFormError('Necesitás un party listo. Invitá a un amigo desde tu perfil.');
      return;
    }
    setLoading(true); setFormError(null);
    try {
      const r = await fetch('/api/matchmaking/queue-doubles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, platform }),
      });
      const data = await r.json();
      if (!r.ok) { setFormError(data.error || 'Error al buscar'); return; }
      setBgMM({ status: 'searching', plat: platform, mode: '2v2', polling: true });
    } catch { setFormError('Error de conexión'); }
    finally { setLoading(false); }
  };

  const cancelSearch2v2 = async () => {
    try {
      await fetch('/api/matchmaking/queue-doubles', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, platform: bgMM?.plat }),
      });
    } catch {}
    setBgMM(null);
  };

  const STAGE_IMG = {
    'Battlefield': '/images/stages/Battlefield.png',
    'Final Destination': '/images/stages/Final Destination.png',
    'Small Battlefield': '/images/stages/Small Battlefield.png',
    'Pokémon Stadium 2': '/images/stages/Pokemon Stadium 2.png',
    'Town & City': '/images/stages/Town and City.png',
    'Smashville': '/images/stages/Smashville.png',
    'Hollow Bastion': '/images/stages/Hollow Bastion.png',
    'Kalos Pokémon League': '/images/stages/Kalos.png',
  };

  const BAN_STAGES = [
    'Battlefield', 'Final Destination', 'Small Battlefield',
    'Pokémon Stadium 2', 'Town & City', 'Smashville',
    'Hollow Bastion', 'Kalos Pokémon League',
  ];

  const submitBans = async () => {
    if (selectedBans.length !== 2 || banLoading) return;
    setBanLoading(true);
    try {
      const r = await fetch('/api/matchmaking/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ban', userId: uid, userName: uName, bannedStages: selectedBans }),
      });
      const data = await r.json();
      if (!r.ok) { setFormError(data.error); setBanLoading(false); return; }
      setSelectedBans([]);
      setFormError(null);
      setBgMM(prev => prev ? { ...prev, status: data.status, room: data.room } : prev);
    } catch { setFormError('Error de conexión'); }
    finally { setBanLoading(false); }
  };

  const pickStage = async (stage) => {
    if (banLoading) return;
    setBanLoading(true);
    try {
      const r = await fetch('/api/matchmaking/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pick_stage', userId: uid, userName: uName, pickedStage: stage }),
      });
      const data = await r.json();
      if (!r.ok) { setFormError(data.error); setBanLoading(false); return; }
      setSelectedBans([]);
      setFormError(null);
      setBgMM(prev => prev ? { ...prev, status: data.status, room: data.room } : prev);
    } catch { setFormError('Error de conexión'); }
    finally { setBanLoading(false); }
  };

  // ═══ RENDER: RESULTADO FINAL ═══════════════════════════════════════════
  if (matchStatus === 'finished' && matchData?.result) {
    const is2v2Finished = matchData.mode === '2v2';
    const myTeamFinished = is2v2Finished ? (matchData.team1?.some(p => p.userId === uid) ? 'team1' : 'team2') : null;
    const iWon = is2v2Finished
      ? matchData.result.winnerTeam === myTeamFinished
      : matchData.result.winnerId === uid;
    const stocks = matchData.result.stocksWon;
    return (
      <div style={{ padding: '24px 18px' }}>
        <button onClick={resetAll} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FF8C00', fontSize: 14, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 24 }}>
          <Svg size={18} sw={2}>{ICO.back}</Svg> Nueva partida
        </button>
        <div style={{ textAlign: 'center', padding: '32px 16px', background: iWon ? 'linear-gradient(135deg,rgba(52,211,153,0.12),rgba(16,185,129,0.06))' : 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(220,38,38,0.06))', border: '1px solid ' + (iWon ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'), borderRadius: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{iWon ? '🏆' : '💀'}</div>
          <p style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 900, color: iWon ? '#34D399' : '#EF4444' }}>{iWon ? (is2v2Finished ? '¡Ganaron!' : '¡Ganaste!') : (is2v2Finished ? 'Perdieron' : 'Perdiste')}</p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{iWon ? 'Bien jugado 💪' : 'La próxima será'}</p>
          {stocks && (
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
              {'❤️'.repeat(stocks)} {stocks} stock{stocks > 1 ? 's' : ''} de ventaja
            </p>
          )}
          {iWon && matchRpDelta != null && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)' }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#34D399' }}>+{matchRpDelta} RP</span>
            </div>
          )}
          {!iWon && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#EF4444' }}>-10 RP</span>
            </div>
          )}
          {/* Bo3 Games Summary */}
          {matchData.format === 'bo3' && matchData.result?.games?.length > 0 && (
            <div style={{ marginTop: 16, textAlign: 'left', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '10px 14px' }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Score: {matchData.result.score?.[uid] || 0} — {matchData.result.score?.[Object.keys(matchData.result.score || {}).find(k => k !== uid)] || 0}
              </p>
              {matchData.result.games.map(g => {
                const gWon = g.result?.winnerId === uid;
                return (
                  <div key={g.gameNum} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                    <span style={{ fontSize: 12 }}>{gWon ? '🏆' : '💀'}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: gWon ? '#22C55E' : '#EF4444' }}>Game {g.gameNum}: {g.stage || g.result?.stage}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <button onClick={resetAll} style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#FF8C00,#E85D00)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
          Jugar otra vez
        </button>
      </div>
    );
  }

  // ═══ RENDER: MATCH ACTIVO (active / pending_result / disputed) ══════════
  if (matchData && ['active','pending_result','disputed'].includes(matchStatus)) {
    const is2v2 = matchData.mode === '2v2';
    const opponent = is2v2 ? null : (uid === matchData.host?.userId ? matchData.guest : matchData.host);
    const myTeam = is2v2 ? (matchData.team1?.some(p => p.userId === uid) ? 'team1' : 'team2') : null;
    const enemyTeam = is2v2 ? (myTeam === 'team1' ? matchData.team2 : matchData.team1) : null;
    const stage    = matchData.stage || '—';
    const STAGE_EMOJI = { 'Battlefield': '⚔️', 'Final Destination': '🌌', 'Small Battlefield': '⚔️', 'Pokémon Stadium 2': '⚡', 'Town & City': '🏙️', 'Smashville': '🏘️', 'Hollow Bastion': '🏯', 'Kalos Pokémon League': '❄️' };
    const isBo3 = matchData.format === 'bo3';
    const gameNum = matchData.currentGame || 1;
    const myScore = isBo3 ? (matchData.score?.[uid] || 0) : 0;
    const oppScore = isBo3 ? (matchData.score?.[opponent?.userId] || 0) : 0;
    return (
      <div style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: p ? 'linear-gradient(135deg,' + p.from + ',' + p.to + ')' : '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{p?.icon || '🎮'}</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px', fontWeight: 900, fontSize: 17, color: '#fff' }}>{is2v2 ? '¡Rivales encontrados!' : '¡Rival encontrado!'}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{p?.label}</p>
          </div>
          {isBo3 && (
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '6px 12px' }}>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>Game {gameNum}/3</p>
              <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: '#fff' }}>
                <span style={{ color: '#22C55E' }}>{myScore}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>—</span>
                <span style={{ color: '#EF4444' }}>{oppScore}</span>
              </p>
            </div>
          )}
        </div>

        <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '14px 16px' }}>
          <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>{is2v2 ? 'Equipo rival' : 'Tu rival'}</p>
          {is2v2 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(enemyTeam || []).map(p => (
                <p key={p.userId} style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#fff' }}>{p.userName}</p>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff' }}>{opponent?.userName || '—'}</p>
          )}
        </div>

        <div style={{ background: 'linear-gradient(135deg,rgba(232,142,0,0.1),rgba(232,142,0,0.04))', border: '1px solid rgba(232,142,0,0.2)', borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 32 }}>{STAGE_EMOJI[stage] || '🗺️'}</span>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: 'rgba(255,165,0,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Escenario</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#FF8C00' }}>{stage}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Stock 3 · 7 min · Sin objetos</p>
          </div>
        </div>

        <div style={{ background: 'rgba(232,142,0,0.05)', border: '1px solid rgba(232,142,0,0.12)', borderRadius: 14, padding: '10px 14px' }}>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
            {bgMM?.plat === 'switch' ? '🎮 Coordiná con tu rival quién crea la Arena en Nintendo Switch Online.' : '🖥️ Coordiná con tu rival quién hostea la sesión en Parsec.'}
          </p>
        </div>

        {/* Chat */}
        <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Chat</p>
          </div>
          <div style={{ height: 130, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chatMessages.length === 0 && (
              <p style={{ margin: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>Sin mensajes aún…</p>
            )}
            {chatMessages.map(m => {
              const isMe = m.userId === uid;
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  {!isMe && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>{m.userName}</span>}
                  <div style={{ maxWidth: '80%', background: isMe ? 'rgba(232,142,0,0.18)' : 'rgba(255,255,255,0.06)', border: '1px solid ' + (isMe ? 'rgba(232,142,0,0.25)' : 'rgba(255,255,255,0.08)'), borderRadius: 10, padding: '6px 10px' }}>
                    <p style={{ margin: 0, fontSize: 13, color: '#fff', wordBreak: 'break-word' }}>{m.message}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              placeholder="Escribí un mensaje…"
              maxLength={200}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
            />
            <button onClick={sendChat} disabled={!chatInput.trim() || chatSending} style={{ background: 'rgba(232,142,0,0.15)', border: '1px solid rgba(232,142,0,0.3)', borderRadius: 10, padding: '0 14px', color: '#FF8C00', fontWeight: 700, cursor: 'pointer', fontSize: 18 }}>→</button>
          </div>
        </div>

        {/* Reporte resultado */}
        {matchStatus === 'disputed' ? (
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 16, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#FBBF24' }}>⚠️ Resultado en disputa</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Reportaron resultados distintos. Contactá a un admin.</p>
          </div>
        ) : reported ? (
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '16px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: 20 }}>⏳</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#818CF8' }}>Esperando reporte del rival…</p>
          </div>
        ) : (
          <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: '#fff' }}>¿Quién ganó?</p>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Stocks que te quedaban</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[1,2,3].map(n => (
                <button key={n} onClick={() => setReportStocks(n)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: '1px solid ' + (reportStocks === n ? 'rgba(255,140,0,0.6)' : 'rgba(255,255,255,0.1)'), background: reportStocks === n ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.04)', color: reportStocks === n ? '#FF8C00' : 'rgba(255,255,255,0.4)', fontWeight: 900, fontSize: 16, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {'❤️'.repeat(n)}
                </button>
              ))}
            </div>
            {reportError && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#EF4444' }}>{reportError}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => reportResult(is2v2 ? myTeam : uid, reportStocks)} disabled={reportLoading} style={{ padding: '13px', borderRadius: 13, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)', color: '#34D399', fontWeight: 800, fontSize: 14, cursor: reportLoading ? 'not-allowed' : 'pointer' }}>🏆 {is2v2 ? 'Ganamos' : 'Yo gané'}</button>
              <button onClick={() => reportResult(is2v2 ? (myTeam === 'team1' ? 'team2' : 'team1') : (uid === matchData.host?.userId ? matchData.guest?.userId : matchData.host?.userId), 1)} disabled={reportLoading} style={{ padding: '13px', borderRadius: 13, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', fontWeight: 800, fontSize: 14, cursor: reportLoading ? 'not-allowed' : 'pointer' }}>💀 {is2v2 ? 'Perdimos' : 'Perdí'}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══ RENDER: BANNING (Bo3 stage bans) ══════════════════════════════════
  if (matchStatus === 'banning' && matchData) {
    const opponent = uid === matchData.host?.userId ? matchData.guest : matchData.host;
    const gameNum = matchData.currentGame || 1;
    const myScore = matchData.score?.[uid] || 0;
    const oppScore = matchData.score?.[opponent?.userId] || 0;
    const banPhase = matchData.banPhase;
    const prevGame = matchData.games?.length ? matchData.games[matchData.games.length - 1] : null;
    const prevWinnerId = prevGame?.result?.winnerId || null;
    const iAmPrevWinner = prevWinnerId === uid;
    const myBansSent = matchData.bans?.[uid];

    const winnerBans = banPhase === 'loser_pick' && prevWinnerId ? (matchData.bans?.[prevWinnerId] || []) : [];
    const availableForPick = BAN_STAGES.filter(s => !winnerBans.includes(s));

    let subtitle, showStages = false, canSelect = false, maxSelect = 0, isPickMode = false;
    if (banPhase === 'both_ban') {
      if (myBansSent) {
        subtitle = 'Esperando que tu rival banee…';
      } else {
        subtitle = 'Baneá 2 escenarios';
        showStages = true; canSelect = true; maxSelect = 2;
      }
    } else if (banPhase === 'winner_ban') {
      if (iAmPrevWinner) {
        subtitle = 'Baneá 2 escenarios';
        showStages = true; canSelect = true; maxSelect = 2;
      } else {
        subtitle = 'Tu rival está baneando…';
      }
    } else if (banPhase === 'loser_pick') {
      if (!iAmPrevWinner) {
        subtitle = 'Elegí un escenario';
        showStages = true; canSelect = true; maxSelect = 1; isPickMode = true;
      } else {
        subtitle = 'Tu rival está eligiendo escenario…';
      }
    }

    const stagesToShow = isPickMode ? availableForPick : BAN_STAGES;

    const toggleBan = (stage) => {
      if (!canSelect) return;
      if (isPickMode) { setSelectedBans([stage]); return; }
      setSelectedBans(prev => {
        if (prev.includes(stage)) return prev.filter(s => s !== stage);
        if (prev.length >= maxSelect) return prev;
        return [...prev, stage];
      });
    };

    return (
      <div style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: p ? 'linear-gradient(135deg,' + p.from + ',' + p.to + ')' : '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{p?.icon || '🎮'}</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px', fontWeight: 900, fontSize: 17, color: '#fff' }}>⚔️ Game {gameNum} de 3</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>vs {opponent?.userName || '—'}</p>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '6px 12px' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff' }}>
              <span style={{ color: '#22C55E' }}>{myScore}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>—</span>
              <span style={{ color: '#EF4444' }}>{oppScore}</span>
            </p>
          </div>
        </div>

        {/* Subtitle / Phase */}
        <div style={{ textAlign: 'center', padding: '10px 16px', background: 'rgba(232,142,0,0.08)', border: '1px solid rgba(232,142,0,0.2)', borderRadius: 14 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#FF8C00' }}>{subtitle}</p>
          {showStages && !isPickMode && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Seleccioná {maxSelect} escenarios para banear</p>}
          {showStages && isPickMode && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Elegí en qué escenario jugar</p>}
        </div>

        {/* Stages grid or waiting spinner */}
        {showStages ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {stagesToShow.map(stage => {
                const isSel = selectedBans.includes(stage);
                return (
                  <div key={stage} onClick={() => toggleBan(stage)} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', border: isSel ? (isPickMode ? '2px solid #22C55E' : '2px solid #EF4444') : '2px solid rgba(255,255,255,0.1)', transition: 'all 0.15s' }}>
                    <img src={STAGE_IMG[stage] || ''} alt={stage} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                    {isSel && !isPickMode && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 32 }}>🚫</span>
                      </div>
                    )}
                    {isSel && isPickMode && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 32 }}>✅</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', padding: '20px 8px 6px' }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#fff', textShadow: '0 1px 3px #000' }}>{stage}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Confirm button */}
            {isPickMode ? (
              <button onClick={() => selectedBans.length === 1 && pickStage(selectedBans[0])} disabled={selectedBans.length !== 1 || banLoading} style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: selectedBans.length === 1 ? 'linear-gradient(135deg,#22C55E,#16A34A)' : 'rgba(255,255,255,0.08)', color: selectedBans.length === 1 ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: 800, fontSize: 15, cursor: selectedBans.length === 1 ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                {banLoading ? '⏳ Confirmando…' : `⚔️ Jugar en ${selectedBans[0] || '...'}`}
              </button>
            ) : (
              <button onClick={submitBans} disabled={selectedBans.length !== 2 || banLoading} style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: selectedBans.length === 2 ? 'linear-gradient(135deg,#EF4444,#DC2626)' : 'rgba(255,255,255,0.08)', color: selectedBans.length === 2 ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: 800, fontSize: 15, cursor: selectedBans.length === 2 ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                {banLoading ? '⏳ Enviando…' : `🚫 Confirmar baneos (${selectedBans.length}/2)`}
              </button>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(232,142,0,0.3)', borderTopColor: '#FF8C00', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{subtitle}</p>
          </div>
        )}

        {formError && <p style={{ margin: 0, fontSize: 12, color: '#EF4444', textAlign: 'center' }}>{formError}</p>}

        {/* Previous games summary */}
        {matchData.games?.filter(g => g.result).length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '10px 14px' }}>
            <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Games anteriores</p>
            {matchData.games.filter(g => g.result).map(g => {
              const won = g.result.winnerId === uid;
              return (
                <div key={g.gameNum} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <span style={{ fontSize: 14 }}>{won ? '🏆' : '💀'}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: won ? '#22C55E' : '#EF4444' }}>Game {g.gameNum}</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>— {g.stage}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ═══ RENDER: BUSCANDO RANKED ═══════════════════════════════════════════
  if (matchStatus === 'searching') {
    const sp = bgMM?.plat ? PLATFORMS.find(x => x.id === bgMM.plat) : null;
    return (
      <div style={{ padding: '24px 18px' }}>
        <div style={{ background: sp ? 'linear-gradient(135deg,' + sp.from + '15,' + sp.to + '08)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '32px 24px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 18px' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid ' + (sp?.from || '#FF8C00'), borderTopColor: 'transparent', animation: 'spin 0.9s linear infinite' }} />
            <div style={{ position: 'absolute', inset: '16px', background: sp ? 'linear-gradient(135deg,' + sp.from + ',' + sp.to + ')' : '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{sp?.icon || '⚡'}</div>
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900, color: '#fff' }}>{bgMM?.mode === '2v2' ? 'Buscando rivales 2v2…' : 'Buscando rival…'}</p>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: sp?.from || '#FF8C00' }}>{sp?.label || 'Ranked'}</p>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Podés navegar la app sin cancelar</p>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>
            {Math.floor(searchElapsed / 60)}:{String(searchElapsed % 60).padStart(2, '0')}
          </p>
        </div>

        <button onClick={bgMM?.mode === '2v2' ? cancelSearch2v2 : cancelSearch} style={{ width: '100%', padding: '13px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
          Cancelar búsqueda
        </button>
      </div>
    );
  }

  // ═══ RENDER: SALA WAITING (reconexión a sala anterior) ══════════════════
  if (matchStatus === 'waiting' && matchData) {
    const myCode = bgMM?.code || '????';
    return (
      <div style={{ padding: '24px 18px' }}>
        <button onClick={async () => {
          await fetch('/api/matchmaking/room', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid }) });
          setBgMM(null);
        }} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FF8C00', fontSize: 14, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 24 }}>
          <Svg size={18} sw={2}>{ICO.back}</Svg> Cancelar
        </button>

        <div style={{ background: p ? 'linear-gradient(135deg,' + p.from + '15,' + p.to + '08)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '32px 24px', textAlign: 'center', marginBottom: 16 }}>
          <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 18px' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid ' + (p?.from || '#FF8C00'), borderTopColor: 'transparent', animation: 'spin 0.9s linear infinite' }} />
            <div style={{ position: 'absolute', inset: '16px', background: p ? 'linear-gradient(135deg,' + p.from + ',' + p.to + ')' : '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{p?.icon || '⚡'}</div>
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900, color: '#fff' }}>Esperando rival…</p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Podés navegar la app sin cancelar</p>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>Código de sala</p>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color: '#FF8C00', letterSpacing: 6 }}>{myCode}</p>
        </div>

        <button onClick={async () => {
          await fetch('/api/matchmaking/room', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid }) });
          setBgMM(null);
        }} style={{ width: '100%', padding: '13px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
          Cancelar sala
        </button>
      </div>
    );
  }

  // ═══ RENDER: PANTALLA PRINCIPAL — Buscar Ranked ════════════════════════
  return (
    <div style={{ padding: '24px 18px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#fff' }}>Ranked</h1>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Elegí tu personaje y buscá rival</p>

      {/* Mode selector: 1v1 / 2v2 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        {[{ id: '1v1', label: '⚔️ Solo (1v1)' }, { id: '2v2', label: '👥 Dobles (2v2)' }].map(m => (
          <button key={m.id} onClick={() => setMatchMode(m.id)} style={{ flex: 1, padding: '10px 0', background: matchMode === m.id ? 'rgba(255,140,0,0.15)' : 'transparent', border: 'none', borderBottom: matchMode === m.id ? '2px solid #FF8C00' : '2px solid transparent', color: matchMode === m.id ? '#FF8C00' : 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>{m.label}</button>
        ))}
      </div>

      {/* Banner de sala activa */}
      {bgMM && ['waiting','active','pending_result','disputed','pending_accept'].includes(bgMM.status) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,rgba(124,58,237,0.14),rgba(255,140,0,0.08))', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 18, padding: '14px 16px', marginBottom: 20, cursor: 'default' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: bgMM.status === 'active' ? '#34D399' : bgMM.status === 'waiting' ? '#FF8C00' : '#FBBF24', flexShrink: 0, boxShadow: '0 0 8px ' + (bgMM.status === 'active' ? '#34D399' : '#FF8C00'), animation: 'pulse-ring 1.2s ease-in-out infinite' }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 14, color: '#fff' }}>
              {bgMM.status === 'waiting'        ? 'Sala activa — esperando rival' :
               bgMM.status === 'pending_accept' ? '¡Match encontrado!' :
               bgMM.status === 'active'         ? '¡Partida en juego!' :
               bgMM.status === 'pending_result' ? 'Reportá el resultado' :
                                                   'Resultado en disputa'}
            </p>
          </div>
        </div>
      )}

      {/* Personaje */}
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Tu personaje</p>
      <div style={{ marginBottom: 24 }}>
        <CharPicker selected={searchChar} onSelect={setSearchChar} platform={searchPlat} userId={uid} />
      </div>

      {/* Contador online */}
      {onlineCount && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '8px 14px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 12 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 5px #22C55E' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {onlineCount.total} jugador{onlineCount.total !== 1 ? 'es' : ''} buscando
            {onlineCount.switch > 0 ? ` · ${onlineCount.switch} Switch` : ''}
            {onlineCount.parsec > 0 ? ` · ${onlineCount.parsec} Parsec` : ''}
          </span>
        </div>
      )}

      {formError && <p style={{ margin: '0 0 12px', fontSize: 13, color: '#EF4444', textAlign: 'center' }}>{formError}</p>}

      {matchMode === '1v1' ? (
        <>
          {/* Botones de búsqueda por plataforma */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PLATFORMS.map(px => (
              <button
                key={px.id}
                onClick={() => { setSearchPlat(px.id); startSearch(px.id); }}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg,' + px.from + '18,' + px.to + '0a)', border: '1px solid ' + px.from + '40', borderRadius: 20, padding: '18px 16px', cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: loading ? 0.6 : 1, transition: 'all 0.15s' }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,' + px.from + ',' + px.to + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, boxShadow: '0 4px 16px ' + px.from + '40' }}>{px.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 900, fontSize: 16, color: '#fff' }}>Buscar en {px.label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
                    {px.id === 'switch' ? 'Ranked en Nintendo Switch Online' : 'Ranked en Parsec (PC)'}
                  </p>
                </div>
                <Svg size={18} sw={2.5} style={{ color: 'rgba(255,255,255,0.3)' }}>{ICO.chevron}</Svg>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* 2v2 Mode */}
          {!partyInfo || partyInfo.status === 'none' ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 20 }}>
              <p style={{ margin: '0 0 8px', fontSize: 40 }}>👥</p>
              <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 900, color: '#A78BFA' }}>Necesitás un compañero</p>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                Invitá a un amigo desde tu perfil para jugar ranked 2v2. Tocá 💬 en cualquier amigo y usá el botón "2v2".
              </p>
            </div>
          ) : partyInfo.status === 'pending' ? (
            <div style={{ textAlign: 'center', padding: '28px 16px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 20 }}>
              <p style={{ margin: '0 0 8px', fontSize: 36 }}>⏳</p>
              <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 900, color: '#FBBF24' }}>Esperando respuesta</p>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                Tu compañero todavía no aceptó la invitación
              </p>
              <button onClick={() => { fetch('/api/party', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid }) }).then(() => setPartyInfo(null)).catch(() => {}); }} style={{ padding: '10px 24px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar invitación</button>
            </div>
          ) : partyInfo.status === 'ready' ? (
            <div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 16, marginBottom: 16 }}>
                <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#34D399' }}>✓ Party listo</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  Con {partyInfo.party?.invited?.userName || partyInfo.party?.leader?.userName || '…'} · {partyInfo.party?.platform}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {PLATFORMS.filter(px => px.id === partyInfo.party?.platform).map(px => (
                  <button
                    key={px.id}
                    onClick={() => startSearch2v2(px.id)}
                    disabled={loading}
                    style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg,' + px.from + '18,' + px.to + '0a)', border: '1px solid ' + px.from + '40', borderRadius: 20, padding: '18px 16px', cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: loading ? 0.6 : 1, transition: 'all 0.15s' }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,' + px.from + ',' + px.to + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, boxShadow: '0 4px 16px ' + px.from + '40' }}>{px.icon}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px', fontWeight: 900, fontSize: 16, color: '#fff' }}>Buscar 2v2 en {px.label}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>Ranked dobles</p>
                    </div>
                    <Svg size={18} sw={2.5} style={{ color: 'rgba(255,255,255,0.3)' }}>{ICO.chevron}</Svg>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 16px', background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 20 }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: '#A78BFA' }}>Party: {partyInfo.status}</p>
            </div>
          )}
        </>
      )}

      {/* Cómo funciona */}
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1 }}>¿Cómo funciona?</p>
        {matchMode === '1v1' ? (
          [['🎮','Elegí personaje','Seleccioná con quién querés jugar'],['🔍','Buscá rival','Elegí Switch o Parsec y entrá a la cola'],['✅','Ambos aceptan (15s)','Cuando se encuentre rival, los dos confirman'],['💬','Coordiná en el chat','Decidan quién crea la sala/hostea'],['⚔️','A jugar','Escenario aleatorio, reportan resultado al final']].map(([icon,t,d])=>(
            <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '4px 0' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <div>
                <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{t}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{d}</p>
              </div>
            </div>
          ))
        ) : (
          [['👥','Invitá a un amigo','Desde tu perfil, tocá 💬 y usá el botón 2v2'],['✅','Tu amigo acepta','Cuando acepte, el party estará listo'],['🔍','Buscar rivales','Entrá a la cola como equipo de 2'],['⚔️','Los 4 aceptan','Ambos equipos confirman la partida'],['🏆','Reportá el resultado','El equipo ganador reporta y sube de rango']].map(([icon,t,d])=>(
            <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '4px 0' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <div>
                <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{t}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{d}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
