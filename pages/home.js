import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getStoredUser, logout, verifySession } from '../src/utils/auth';
import { RANKS, TIER_ICONS } from '../lib/ranks';
import { CHARACTERS, charImgPath, CHARACTER_RENDERS, charRenderPath, charAltPaths, charDefaultAltPath, stockIconPath } from '../lib/characters';
import CharacterDetail from '../src/components/CharacterDetail';
import { registerPresence, updateFriendList, setPresenceCallback, setNotificationCallback, setReconnectCallback } from '../src/hooks/useWebSocket';
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION;
const PLACEMENT_TOTAL = 5;
const STAGE_IMG = {
  'Battlefield':       '/images/stages/Battlefield.png',
  'Final Destination': '/images/stages/Final%20Destination.png',
  'Small Battlefield': '/images/stages/Small%20Battlefield.png',
  'Smashville':        '/images/stages/Smashville.png',
  'Pokémon Stadium 2': '/images/stages/Pokemon%20Stadium%202.png',
  'Town and City':     '/images/stages/Town%20and%20City.png',
  'Hollow Bastion':    '/images/stages/Hollow%20Bastion.png',
  'Kalos':             '/images/stages/Kalos.png',
};
const STAGE_SLUG_TO_NAME = {
  'battlefield': 'Battlefield', 'final-destination': 'Final Destination',
  'small-battlefield': 'Small Battlefield', 'smashville': 'Smashville',
  'pokemon-stadium-2': 'Pokémon Stadium 2', 'town-and-city': 'Town and City',
  'hollow-bastion': 'Hollow Bastion', 'kalos': 'Kalos',
};
function resolveGameStage(g) {
  const name = g?.result?.stage || g?.stage;
  if (name && STAGE_IMG[name]) return name;
  const slug = g?.stageId || g?.result?.stageId;
  return slug ? (STAGE_SLUG_TO_NAME[slug] || null) : (name || null);
}

/* ─── PLATAFORMAS ─────────────────────────────── */
const PLATFORMS = [
  { id: 'parsec',  label: 'Parsec',        icon: '🖥️', from: '#7C3AED', to: '#3730A3' },
  { id: 'switch',  label: 'Switch Online', icon: '🎮', from: '#DC2626', to: '#9F1239' },
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
  user:      <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />,
  users:     <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />,
};

/* ─── ROOT ─────────────────────────────────────── */
const COUNTRY_TO_CODE = {
  'Argentina':'AR','Brasil':'BR','Brazil':'BR','Mexico':'MX','México':'MX',
  'Chile':'CL','Peru':'PE','Perú':'PE','Colombia':'CO','Venezuela':'VE',
  'Uruguay':'UY','Paraguay':'PY','Bolivia':'BO','Ecuador':'EC','Costa Rica':'CR',
  'United States':'US','USA':'US','Canada':'CA','Spain':'ES','España':'ES',
  'Japan':'JP','South Korea':'KR','France':'FR','Germany':'DE','Italy':'IT',
  'United Kingdom':'GB','UK':'GB','Australia':'AU','Portugal':'PT',
  'New Zealand':'NZ','Netherlands':'NL','Sweden':'SE','Norway':'NO','Denmark':'DK',
};
function countryFlag(country) {
  if (!country) return null;
  return country.length === 2 ? country.toUpperCase() : (COUNTRY_TO_CODE[country] || null);
}
function FlagImg({ cc, size = 16 }) {
  if (!cc) return null;
  return <img src={`https://flagcdn.com/w40/${cc.toLowerCase()}.png`} alt={cc} style={{ width: size, height: Math.round(size * 0.75), objectFit: 'cover', borderRadius: 2, verticalAlign: 'middle' }} onError={e => { e.target.style.display = 'none'; }} />;
}

function getNotifRoute(notif) {
  const type = notif?.type || '';
  if (type === 'friend_request') return { tab: 'amigos', friendTab: 'requests' };
  if (type === 'friend_accepted') return { tab: 'amigos', friendTab: 'list' };
  if (type === 'party_invite')   return { tab: 'amigos', friendTab: 'list' };
  if (type === 'broadcast' || type === 'tournament_started' || type === 'new_tournament') return { tab: 'torneos' };
  // call_to_play or unknown ? match tab, or external url if provided
  const url = notif?.url || '';
  if (url && url.startsWith('/') && !url.startsWith('/home')) return { external: url };
  if (url && url.includes('open=torneos')) return { tab: 'torneos' };
  return { tab: 'match' };
}

const TOUR_STEPS = [
  {
    tab: 'perfil',
    emoji: '👤',
    title: 'Tu perfil',
    desc: 'Acá ves tu rango ranked 1v1 y 2v2, tu personaje principal, historial de partidas y tus estadísticas generales. También podés cambiar tu main desde acá.',
  },
  {
    tab: 'match',
    emoji: '⚡',
    title: 'Ranked – Buscar partida',
    desc: 'El botón central te manda a la cola de matchmaking. Te emparejamos con jugadores de rango similar; al terminar, tu rango, RR y MMR se actualizan según el resultado y los stocks con que ganaste.',
  },
  {
    tab: 'rankings',
    emoji: '🏆',
    title: 'Rankings',
    desc: 'El leaderboard de todos los jugadores, ordenado por rango. Los rankeados van primero (el de mayor tier y puntos arriba); los que aún están en sus 10 partidas de clasificatoria aparecen al fondo, ordenados por victorias.',
  },
  {
    tab: 'torneos',
    emoji: '📅',
    title: 'Torneos',
    desc: 'Los torneos activos de la comunidad. Podés inscribirte, seguir el bracket en tiempo real y ver tus partidas pendientes sin salir de la app.',
  },
  {
    tab: 'tips',
    emoji: '💡',
    title: 'Tips',
    desc: 'Consejos y guías de la comunidad para mejorar tu juego. 🎮 Daéle una mirada cuando quieras subir de rango más rápido.',
  },
];

const VALID_TABS = ['rankings', 'torneos', 'tips', 'match', 'amigos', 'perfil'];

function getInitialTab() {
  if (typeof window === 'undefined') return 'rankings';
  const hash = window.location.hash.replace('#', '');
  return VALID_TABS.includes(hash) ? hash : 'rankings';
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser]       = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCommunities, setAdminCommunities] = useState([]);
  const [tab, setTab]         = useState(getInitialTab);
  const [pendingFriendTab, setPendingFriendTab] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [notifs, setNotifs]       = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [showIOSPushBtn, setShowIOSPushBtn] = useState(false);
  const [iosPushState, setIosPushState] = useState(null); // null | 'loading' | 'ok' | 'error'
  const [showPushBanner, setShowPushBanner] = useState(false); // Android/Desktop: permiso no concedido
  const [pushBannerState, setPushBannerState] = useState(null); // null | 'loading' | 'ok' | 'error' | 'denied'
  const [installPrompt, setInstallPrompt] = useState(null); // Android beforeinstallprompt
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showIconUpdateBanner, setShowIconUpdateBanner] = useState(false); // iOS standalone: actualizar ícono
  const [activeTournamentMatch, setActiveTournamentMatch] = useState(null);

  // Chat flotante
  const [chatInbox, setChatInbox]       = useState([]);
  const [chatBubbleOpen, setChatBubbleOpen] = useState(false);
  const [chatLastOpened, setChatLastOpened] = useState(() => {
    try { return parseInt(localStorage.getItem('chat_last_opened') || '0', 10); } catch { return 0; }
  });
  // Mini-chat inline
  const [miniChat, setMiniChat]         = useState(null); // { friendId, friendName }
  const [miniChatMsgs, setMiniChatMsgs] = useState([]);
  const [miniChatInput, setMiniChatInput] = useState('');
  const miniChatScrollRef               = useRef(null);

  // Page visibility: pausar polling cuando la tab está oculta
  const pageVisible = useRef(true);
  useEffect(() => {
    const onVis = () => { pageVisible.current = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Estado global de matchmaking (persiste al cambiar de tab)
  const [bgMM, setBgMM]               = useState(null);
  const [acceptCountdown, setAcceptCountdown] = useState(15);

  // Tour de bienvenida
  const [showTour, setShowTour]   = useState(false);
  const [tourStep, setTourStep]   = useState(0);

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

    // Limpiar localStorage per-user si cambió el usuario (otra cuenta en el mismo dispositivo)
    try {
      const lastUid = localStorage.getItem('afk_last_uid');
      const currentUid = String(u.id || u.slug || '');
      if (lastUid && lastUid !== currentUid) {
        ['afk_main_char','afk_main_alt','afk_my_status','afk_recent_chars','afk_parsec_role','chat_last_opened'].forEach(k => localStorage.removeItem(k));
      }
      localStorage.setItem('afk_last_uid', currentUid);
    } catch {}

    setUser(u);
    setIsAdmin(!!stored.isAdmin);
    setAdminCommunities(stored.adminCommunities || []);
    // Refrescar adminCommunities desde el servidor (para community admins añadidos después del login)
    // También usamos el nombre fresco de start.gg (gamerTag) para guardar el perfil correctamente
    verifySession().then(data => {
      if (!data) {
        // Si verifySession falla, guardar de todos modos con lo que tenemos (priorizando gamerTag)
        if (u.id) {
          const safeName = u.player?.gamerTag || u.name;
          fetch('/api/players/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: u.id, name: safeName, slug: u.slug, avatar: u.avatar }),
          }).catch(() => {});
        }
        return;
      }
      setIsAdmin(!!data.isAdmin);
      setAdminCommunities(data.adminCommunities || []);
      // Guardar perfil con el nombre verificado (gamerTag) desde start.gg
      const verifiedName = data.user?.name || u.player?.gamerTag || u.name;
      if (u.id) {
        fetch('/api/players/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: u.id, name: verifiedName, slug: u.slug, avatar: u.avatar }),
        }).catch(() => {});
      }
    }).catch(() => {
      // Fallback: guardar perfil con lo disponible en localStorage
      if (u.id) {
        const safeName = u.player?.gamerTag || u.name;
        fetch('/api/players/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: u.id, name: safeName, slug: u.slug, avatar: u.avatar }),
        }).catch(() => {});
      }
    });
  }, []);

  // Tour: mostrar en el primer uso
  useEffect(() => {
    if (!user) return;
    try {
      if (!localStorage.getItem('tour_done')) {
        setTimeout(() => { setShowTour(true); setTourStep(0); }, 700);
      }
    } catch {}
  }, [user?.id]);

  // Tour: navegar al tab del paso actual
  useEffect(() => {
    if (!showTour) return;
    const step = TOUR_STEPS[tourStep];
    if (step?.tab) setTab(step.tab);
  }, [showTour, tourStep]);

  // Capturar beforeinstallprompt (Android Chrome / Edge mobile)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isStandalone = window.navigator.standalone === true
      || window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return; // Ya instalada
    const dismissed = sessionStorage.getItem('install_dismissed');
    if (dismissed) return;

    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function triggerInstall() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setInstallPrompt(null);
    }
  }

  function dismissInstall() {
    setShowInstallBanner(false);
    sessionStorage.setItem('install_dismissed', '1');
  }
  // Poll unificado: heartbeat + amigos + chat inbox en 1 sola llamada (3 requests → 1)
  useEffect(() => {
    if (!user?.id) return;
    const userName = (user.name || (user.slug || '').replace(/^\/user\//, '') || '').toLowerCase();
    const uid = String(user.id || user.slug || '');
    const poll = async () => {
      if (!pageVisible.current) return;
      const status = localStorage.getItem('afk_my_status') || 'online';
      try {
        const r = await fetch('/api/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, status, userName }),
        });
        if (r.ok) {
          const d = await r.json();
          if (Array.isArray(d.notifs))  setNotifs(d.notifs);
          if (Array.isArray(d.inbox))   setChatInbox(d.inbox);
        }
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 45000);
    return () => clearInterval(iv);
  }, [user?.id]);

  // Polling de notificaciones — eliminado, ahora vienen en el heartbeat
  // y en tiempo real vía WebSocket (new-notification)

  // Registrar Service Worker y suscribirse a Web Push
  const registerPush = async (uid, userName) => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!vapidKey) { console.warn('[PUSH] VAPID key no configurada'); return; }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { console.warn('[PUSH] Push no soportado en este navegador'); return; }
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
        body: JSON.stringify({ userId: uid, name: userName, subscription: sub.toJSON() }),
      });
      const regData = await regRes.json();
      console.log('[PUSH] Web push registrado:', regData);
      return true;
    } catch (e) { console.error('[PUSH] Error registrando web push:', e.message); return false; }
  };

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

    // iOS en standalone: Notification.requestPermission() DEBE ser llamado desde un gesto del usuario
    // Por eso mostramos un botón en lugar de llamarlo automáticamente
    if (isIOS && isStandalone) {
      // Solo mostrar el botón si aún no tiene permiso
      if (Notification.permission !== 'granted') {
        setShowIOSPushBtn(true);
      } else {
        // Ya tiene permiso: re-registrar la suscripción silenciosamente
        const uid = String(user?.id || user?.slug || '');
        if (uid) registerPush(uid, user.name);
      }
      return;
    }

    // Android / Desktop: auto-suscribir
    const uid = String(user?.id || user?.slug || '');
    if (!uid) { console.warn('[PUSH] No hay userId'); return; }
    // Si ya tiene permiso, suscribir silenciosamente
    if (Notification.permission === 'granted') {
      registerPush(uid, user.name);
    } else if (Notification.permission === 'denied') {
      // Bloqueado por el usuario: mostrar banner con instrucciones
      setShowPushBanner(true);
      setPushBannerState('denied');
    } else {
      // 'default' (no preguntado aún): mostrar banner para solicitar con gesto explícito
      setShowPushBanner(true);
    }
  }, [user]);

  // Polling match activo de torneo
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    const playerName = user.player?.gamerTag || user.name;
    if (!playerName) return;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const fetchMatch = async () => {
      if (!pageVisible.current) return;
      try {
        const r = await fetch(`${socketUrl}/sessions/player?name=${encodeURIComponent(playerName)}`);
        if (!r.ok) return;
        const list = await r.json();
        const active = Array.isArray(list) ? list.find(s => s.phase !== 'FINISHED' && s.phase !== 'CANCELLED' && s.phase !== 'POSTPONED') : null;
        setActiveTournamentMatch(active || null);
      } catch {}
    };
    fetchMatch();
    const iv = setInterval(fetchMatch, 15000);
    return () => clearInterval(iv);
  }, [user]);

  // Polling de mensajes del mini-chat activo (cada 3s)
  useEffect(() => {
    if (!miniChat || !user) return;
    const uid = String(user?.id || user?.slug || '');
    if (!uid) return;
    const poll = () => {
      if (!pageVisible.current) return;
      fetch(`/api/chat?userId=${encodeURIComponent(uid)}&friendId=${encodeURIComponent(miniChat.friendId)}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.messages) setMiniChatMsgs(d.messages); })
        .catch(() => {});
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [miniChat, user]);

  // Auto-scroll mini-chat al recibir mensajes
  useEffect(() => {
    if (miniChatScrollRef.current) {
      miniChatScrollRef.current.scrollTop = miniChatScrollRef.current.scrollHeight;
    }
  }, [miniChatMsgs]);

  async function sendMiniMsg() {
    if (!miniChatInput.trim() || !miniChat || !user) return;
    const text = miniChatInput.trim();
    const uid = String(user?.id || user?.slug || '');
    setMiniChatInput('');
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid, userName: user.name, friendId: miniChat.friendId, message: text }),
    }).catch(() => {});
    fetch(`/api/chat?userId=${encodeURIComponent(uid)}&friendId=${encodeURIComponent(miniChat.friendId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.messages) setMiniChatMsgs(d.messages); })
      .catch(() => {});
  }

  // Polling global de matchmaking RANKED (persiste entre tabs)
  useEffect(() => {
    if (!bgMM?.polling || !user) return;
    if (bgMM?.gameType === 'casual') return; // casual usa su propio polling
    const uid = String(user?.id || user?.slug || '');
    if (!uid) return;
    let active = true;
    const poll = async () => {
      try {
        const r = await fetch('/api/matchmaking/room?userId=' + encodeURIComponent(uid));
        if (!r.ok || !active) return;
        const data = await r.json();
        // Ignorar 'idle' solo en los primeros 5s para evitar race condition al iniciar búsqueda
        const msSinceSearch = searchStartedAt ? Date.now() - searchStartedAt : Infinity;
        if (prev_status === 'searching' && data.status === 'idle' && msSinceSearch < 5000) return;
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
          autoConfirmSignal: data.autoConfirmSignal || false,
          chatAfkWinId: data.room?.chatAfkWin || null,
          searchStartedAt: prev.searchStartedAt || (data.joinedAt ? new Date(data.joinedAt).getTime() : prev.searchStartedAt),
          polling:  !['finished', 'idle', 'timeout', 'declined'].includes(data.status),
        } : prev);
      } catch {}
    };
    const prev_status = bgMM?.status;
    const searchStartedAt = bgMM?.searchStartedAt || 0;
    poll();
    const iv = setInterval(poll, 3000);
    return () => { active = false; clearInterval(iv); };
  }, [bgMM?.polling, bgMM?.gameType, bgMM?.status, user]);

  // Polling CASUAL (persiste entre tabs)
  useEffect(() => {
    if (!bgMM?.polling || bgMM?.gameType !== 'casual' || !user) return;
    const uid = String(user?.id || user?.slug || '');
    const plat = bgMM?.plat;
    if (!uid || !plat) return;
    let active = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/matchmaking/casual-queue?userId=${encodeURIComponent(uid)}&platform=${plat}`);
        if (!r.ok || !active) return;
        const data = await r.json();
        if (data.status === 'idle') { if (active) setBgMM(null); return; }
        setBgMM(prev => prev ? {
          ...prev,
          status:  data.status,
          room:    data.room || prev.room,
          searchStartedAt: prev.searchStartedAt || (data.joinedAt ? new Date(data.joinedAt).getTime() : prev.searchStartedAt),
          polling: !['finished', 'idle'].includes(data.status),
        } : prev);
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => { active = false; clearInterval(iv); };
  }, [bgMM?.polling, bgMM?.gameType, bgMM?.status, bgMM?.plat, user]);

  // Detectar sala activa al cargar la app Y polling mientras está idle (cada 8s)
  // Así detecta matches creados remotamente sin necesidad de F5
  useEffect(() => {
    if (!user || bgMM) return;
    const uid = String(user?.id || user?.slug || '');
    if (!uid) return;
    let active = true;
    const checkRoom = async () => {
      if (!active) return;
      try {
        // 1) Chequear ranked (room.js)
        const r = await fetch('/api/matchmaking/room?userId=' + encodeURIComponent(uid));
        const data = r.ok ? await r.json() : null;
        if (!active) return;
        if (data && !['idle', 'timeout', 'declined'].includes(data.status)) {
          if (data.status === 'searching') {
            const startedAt = data.joinedAt ? new Date(data.joinedAt).getTime() : Date.now();
            setBgMM({ status: 'searching', plat: data.platform, mode: data.mode || '1v1', polling: true, searchStartedAt: startedAt, charId: data.charId || null, charAlt: data.charAlt || 1 });
          } else {
            setBgMM({
              status: data.status,
              code: data.code,
              room: data.room,
              plat: data.room?.platform,
              mode: data.room?.mode || '1v1',
              polling: true,
            });
          }
          return;
        }
        // 2) Chequear casual (casual-queue) en ambas plataformas
        for (const plat of ['switch', 'parsec']) {
          if (!active) return;
          const r2 = await fetch('/api/matchmaking/casual-queue?userId=' + encodeURIComponent(uid) + '&platform=' + plat);
          const d2 = r2.ok ? await r2.json() : null;
          if (!active) return;
          if (d2 && d2.status !== 'idle') {
            if (d2.status === 'searching') {
              const startedAt = d2.joinedAt ? new Date(d2.joinedAt).getTime() : Date.now();
              setBgMM({ status: 'searching', plat, gameType: 'casual', polling: true, searchStartedAt: startedAt });
            } else if (d2.room) {
              setBgMM({ status: d2.status, room: d2.room, plat: d2.room?.platform || plat, gameType: 'casual', polling: true });
            }
            return;
          }
        }
      } catch {}
    };
    checkRoom();
    const iv = setInterval(checkRoom, 8000);
    return () => { active = false; clearInterval(iv); };
  // !!bgMM: cuando bgMM pasa de null a un objeto, el effect se limpia solo
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, !!bgMM]);

  // Countdown local para la pantalla de aceptación
  useEffect(() => {
    if (bgMM?.status !== 'pending_accept') return;
    setAcceptCountdown(bgMM?.timeLeft ?? 15);
    const t = setInterval(() => setAcceptCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [bgMM?.status]);

  // Deep link desde notificación push: /home?open=tab
  useEffect(() => {
    if (!user || !router.isReady) return;
    const open = router.query.open;
    if (!open) return;
    const validTabs = ['match', 'torneos', 'rankings', 'tips', 'perfil'];
    if (validTabs.includes(open)) setTab(open);
    router.replace('/home', undefined, { shallow: true });
  }, [user, router.isReady]);

  // Sincronizar tab → URL hash (para que F5 restaure el tab actual)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const newHash = '#' + tab;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }, [tab]);

  // Capturar el botón "atrás" del navegador/gesto del celu → cambiar tab en vez de salir
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = () => {
      const hash = window.location.hash.replace('#', '');
      if (VALID_TABS.includes(hash)) {
        setTab(hash);
      } else {
        // Si no hay hash válido, volver a rankings y restaurar el hash
        setTab('rankings');
        window.history.replaceState(null, '', '#rankings');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Escuchar postMessage del Service Worker (fallback para navegadores sin client.navigate)
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.serviceWorker) return;
    const handler = (event) => {
      if (event.data?.type === 'NOTIF_NAVIGATE') {
        const url = event.data.url || '';
        const m = url.match(/[?&]open=([^&]+)/);
        if (m) {
          const validTabs = ['match', 'torneos', 'rankings', 'tips', 'perfil'];
          if (validTabs.includes(m[1])) setTab(m[1]);
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

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

  const dismissAllNotifs = async () => {
    try {
      await fetch('/api/notifications/send', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName, action: 'mark-all-read' }),
      });
    } catch {}
    setNotifs(prev => prev.map(n => n.readAt ? n : { ...n, readAt: new Date().toISOString() }));
  };

  const uid        = user?.id ? String(user.id) : (user?.slug || '');
  const uName      = user?.name || 'Jugador';

  const handleAcceptMatch = async () => {
    const isCasual = bgMM?.gameType === 'casual';
    try {
      if (isCasual) {
        const matchId = bgMM?.room?.matchId;
        if (!matchId) return;
        const r = await fetch('/api/matchmaking/casual-result', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, reportingUserId: uid, claimedWinnerId: uid, action: 'accept' }),
        });
        const data = await r.json();
        setBgMM(prev => prev ? { ...prev, status: data.matchStatus, room: data.room || { ...prev.room, status: data.matchStatus } } : prev);
      } else {
        const r = await fetch('/api/matchmaking/room', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'accept', userId: uid, userName: uName }),
        });
        const data = await r.json();
        setBgMM(prev => prev ? { ...prev, status: data.status, room: data.room || prev.room, timeLeft: data.timeLeft } : prev);
      }
    } catch {}
  };

  const handleDeclineMatch = async () => {
    const isCasual = bgMM?.gameType === 'casual';
    try {
      if (isCasual) {
        const matchId = bgMM?.room?.matchId;
        if (matchId) {
          await fetch('/api/matchmaking/casual-result', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchId, reportingUserId: uid, claimedWinnerId: uid, action: 'decline' }),
          });
        }
      } else {
        await fetch('/api/matchmaking/room', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'decline', userId: uid, userName: uName }),
        });
      }
    } catch {}
    setBgMM(null);
  };

  return (
    <>
      <Head>
        <title>la app sin H</title>
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

      <div style={{ maxWidth: 480, margin: '0 auto', height: '100dvh', background: '#0B0B12', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

        {/* ── TOP BAR ── */}
        <header id="app-top-header" style={{
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
            <img src="/images/logo.app.png" alt="Logo" style={{ width: 45, height: 34 }} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: '0.04em', color: '#fff', textTransform: 'uppercase' }}>la app</span>
              <span style={{ fontWeight: 300, fontSize: 17, color: 'rgba(232,142,0,0.7)', marginLeft: 3, letterSpacing: '0.06em' }}>sin H</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em', marginLeft: 5, alignSelf: 'auto' }}>by INC</span>
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
        {/* Android Chrome: banner de instalar app */}
        {showInstallBanner && (
          <div style={{ background: 'linear-gradient(135deg,rgba(255,140,0,0.13),rgba(232,93,0,0.08))', border: '1px solid rgba(255,140,0,0.35)', margin: '10px 12px 0', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>📲</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#FF8C00', letterSpacing: '-0.2px' }}>Instalá La app sin H</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>Acceso rápido desde tu pantalla de inicio, sin navegador.</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                onClick={triggerInstall}
                style={{ background: 'linear-gradient(135deg,#FF8C00,#E85D00)', border: 'none', color: '#fff', borderRadius: 9, padding: '7px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
              >Instalar</button>
              <button onClick={dismissInstall} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}>×</button>
            </div>
          </div>
        )}
        {/* iOS Standalone: botón para activar notificaciones (debe ser gesto del usuario) */}
        {showIOSPushBtn && (
          <div style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.28)', margin: '10px 12px 0', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🔔</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#A78BFA' }}>Activar notificaciones</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Recibí alertas cuando te llamen a jugar</p>
            </div>
            <button
              onClick={async () => {
                if (iosPushState === 'loading') return;
                setIosPushState('loading');
                const uid = String(user?.id || user?.slug || '');
                const ok = await registerPush(uid, user?.name);
                if (ok) { setIosPushState('ok'); setShowIOSPushBtn(false); }
                else setIosPushState('error');
              }}
              style={{
                background: iosPushState === 'error' ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg,#7C3AED,#5B21B6)',
                border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px',
                fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0,
                opacity: iosPushState === 'loading' ? 0.6 : 1,
              }}
            >
              {iosPushState === 'loading' ? '...' : iosPushState === 'error' ? '⚠️ Error' : 'Activar'}
            </button>
            <button onClick={() => setShowIOSPushBtn(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', fontSize: 20, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>×</button>
          </div>
        )}

        {/* Android/Desktop: activar notificaciones push */}
        {showPushBanner && (
          <div style={{ background: pushBannerState === 'denied' ? 'rgba(239,68,68,0.08)' : 'rgba(124,58,237,0.10)', border: `1px solid ${pushBannerState === 'denied' ? 'rgba(239,68,68,0.25)' : 'rgba(124,58,237,0.28)'}`, margin: '10px 12px 0', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: pushBannerState === 'denied' ? 'linear-gradient(135deg,#EF4444,#B91C1C)' : 'linear-gradient(135deg,#7C3AED,#5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🔔</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: pushBannerState === 'denied' ? '#F87171' : '#A78BFA' }}>
                {pushBannerState === 'denied' ? 'Notificaciones bloqueadas' : 'Activar notificaciones'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {pushBannerState === 'denied'
                  ? 'Habilitalo en los ajustes del sitio (🔒 en la barra de URL)'
                  : 'Recibí alertas cuando te llamen a jugar'}
              </p>
            </div>
            {pushBannerState !== 'denied' && (
              <button
                onClick={async () => {
                  if (pushBannerState === 'loading') return;
                  setPushBannerState('loading');
                  const uid = String(user?.id || user?.slug || '');
                  const ok = await registerPush(uid, user?.name);
                  if (ok) { setPushBannerState('ok'); setShowPushBanner(false); }
                  else {
                    const blocked = typeof Notification !== 'undefined' && Notification.permission === 'denied';
                    setPushBannerState(blocked ? 'denied' : 'error');
                  }
                }}
                style={{
                  background: pushBannerState === 'error' ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg,#7C3AED,#5B21B6)',
                  border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px',
                  fontSize: 12, fontWeight: 800, cursor: 'pointer', flexShrink: 0,
                  opacity: pushBannerState === 'loading' ? 0.6 : 1,
                }}
              >
                {pushBannerState === 'loading' ? '...' : pushBannerState === 'error' ? '⚠️ Reintentar' : 'Activar'}
              </button>
            )}
            <button onClick={() => setShowPushBanner(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', fontSize: 20, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>×</button>
          </div>
        )}

        {/* Banner match activo de torneo */}
        {activeTournamentMatch && (
          <div
            onClick={() => {
              const uName = (user?.name || '').toLowerCase().trim();
              const p1Name = (activeTournamentMatch.player1 || '').toLowerCase().trim();
              const p2Name = (activeTournamentMatch.player2 || '').toLowerCase().trim();
              let pParam = '';
              if (uName && p1Name && (p1Name === uName || p1Name.includes(uName) || uName.includes(p1Name))) pParam = '?p=player1';
              else if (uName && p2Name && (p2Name === uName || p2Name.includes(uName) || uName.includes(p2Name))) pParam = '?p=player2';
              router.push(`/tablet/${activeTournamentMatch.sessionId}${pParam}`);
            }}
            style={{ background: activeTournamentMatch.phase === 'CHECKIN' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.10)', border: `1px solid ${activeTournamentMatch.phase === 'CHECKIN' ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.35)'}`, margin: '10px 12px 0', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: activeTournamentMatch.phase === 'CHECKIN' ? 'linear-gradient(135deg,#EF4444,#B91C1C)' : 'linear-gradient(135deg,#22C55E,#16A34A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
              {activeTournamentMatch.phase === 'CHECKIN' ? '🔔' : '⚔️'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: activeTournamentMatch.phase === 'CHECKIN' ? '#F87171' : '#4ADE80' }}>
                {activeTournamentMatch.phase === 'CHECKIN' ? '¡Hacé check-in en tu match!' : '¡Tenés un match activo!'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeTournamentMatch.player1} vs {activeTournamentMatch.player2}
              </p>
              {activeTournamentMatch.sessionId && (() => {
                const sid = activeTournamentMatch.sessionId;
                const label = sid.includes('stream') ? '📡 Stream' : (() => { const m = sid.match(/-(\d+)-/); return m ? `🎮 Setup ${m[1]}` : null; })();
                return label ? <p style={{ margin: '3px 0 0', fontSize: 11, color: activeTournamentMatch.phase === 'CHECKIN' ? '#FCA5A5' : '#86EFAC', fontWeight: 800, letterSpacing: '0.02em' }}>{label}</p> : null;
              })()}
              {activeTournamentMatch.phase === 'CHECKIN' && (
                <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                  Check-in: {(activeTournamentMatch.checkIns || []).length}/2 confirmados
                </p>
              )}
            </div>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>›</span>
          </div>
        )}

        {/* iOS Safari: instrucciones para agregar a pantalla de inicio */}
        {showIOSTip && (
          <div style={{ background: 'rgba(232,142,0,0.10)', border: '1px solid rgba(232,142,0,0.28)', margin: '10px 12px 0', borderRadius: 16, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📲</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#FF8C00' }}>Instalá La app sin H en iPhone</p>
                <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Seguí estos 3 pasos rápidos</p>
              </div>
              <button onClick={() => setShowIOSTip(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', fontSize: 20, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { icon: '⬆️', label: 'Tocá el botón', desc: 'Compartir (cuadrado con flecha)' },
                { icon: '+', label: 'Elegí', desc: '"Agregar a pantalla de inicio"' },
                { icon: '✅', label: 'Confirmá', desc: 'Tocá "Agregar" arriba a la derecha' },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: '8px 7px', textAlign: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,140,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, margin: '0 auto 5px' }}>{s.icon}</div>
                  <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 800, color: '#FF8C00' }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* iOS Standalone: actualizar ícono de la app */}
        {showIconUpdateBanner && (
          <div style={{ background: 'rgba(232,142,0,0.10)', border: '1px solid rgba(232,142,0,0.28)', margin: '10px 12px 0', borderRadius: 16, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <img src="/images/logo.app.png" alt="Nuevo ícono" style={{ width: 40, height: 40, borderRadius: 11, background: '#000', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#FF8C00' }}>¡Nuevo ícono disponible!</p>
                <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>Para actualizar el ícono en tu pantalla de inicio, borrá la app y volvé a agregarla desde Safari.</p>
              </div>
              <button
                onClick={() => {
                  setShowIconUpdateBanner(false);
                  const uid2 = String(user?.id || user?.slug || '');
                  if (uid2) fetch('/api/players/profile', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: uid2, dismissedIconBanner: true }),
                  }).catch(() => {});
                }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', fontSize: 20, cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}
              >✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { icon: '🗑️', label: 'Borrá la app', desc: 'Mantené presionado el ícono y eliminá' },
                { icon: '🌐', label: 'Abrí Safari', desc: 'Entrá a la app desde el navegador' },
                { icon: '+', label: 'Agregá de nuevo', desc: 'Compartir → "Agregar a pantalla de inicio"' },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 11, padding: '8px 7px', textAlign: 'center' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,140,0,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, margin: '0 auto 5px' }}>{s.icon}</div>
                  <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 800, color: '#FF8C00' }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROFILE MENU OVERLAY ── */}
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
              {(isAdmin || adminCommunities.length > 0) && (() => {
                const _panelItems = isAdmin
                  ? [{ label: 'Panel de Admin', sub: 'Gestionar torneos y setups', url: '/?panel=1' }]
                  : [{ label: 'Panel de Admin', sub: 'Selector de comunidad', url: '/?panel=1' }];
                return _panelItems.map(item => (
                  <div key={item.url} style={{ padding: '8px 10px 4px' }}>
                    <button onClick={() => { setShowMenu(false); window.location.href = item.url; }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 16, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,142,0,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 13, background: 'rgba(232,142,0,0.14)', border: '1px solid rgba(232,142,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🎛️</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#FF8C00' }}>{item.label}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(232,142,0,0.45)' }}>{item.sub}</p>
                      </div>
                      <Svg size={14} sw={2.5} style={{ color: 'rgba(255,255,255,0.2)' }}>{ICO.chevron}</Svg>
                    </button>
                  </div>
                ));
              })()}

              {/* Gestionar Rankings */}
              {(isAdmin || adminCommunities.length > 0) && (
                <div style={{ padding: '0 10px 4px' }}>
                  <button onClick={() => { setShowMenu(false); window.location.href = '/admin/afk-ranking'; }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 16, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 13, background: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🏆</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#A78BFA' }}>Gestionar Rankings</p>
                      <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(167,139,250,0.45)' }}>Rankings comunitarios y puntos</p>
                    </div>
                    <Svg size={14} sw={2.5} style={{ color: 'rgba(255,255,255,0.2)' }}>{ICO.chevron}</Svg>
                  </button>
                </div>
              )}

              {/* Amigos */}
              <div style={{ padding: '4px 10px 0' }}>
                <button onClick={() => { setShowMenu(false); setTab('amigos'); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 16, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 13, background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>👥</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#818CF8' }}>Amigos</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(99,102,241,0.45)' }}>Ver y agregar amigos</p>
                  </div>
                  <Svg size={14} sw={2.5} style={{ color: 'rgba(255,255,255,0.2)' }}>{ICO.chevron}</Svg>
                </button>
              </div>

              {/* Configuración */}
              <div style={{ padding: '4px 10px 0' }}>
                <button onClick={() => { setShowMenu(false); setShowConfig(true); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 16, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 13, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>⚙️</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>Configuración</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Personajes preferidos</p>
                  </div>
                  <Svg size={14} sw={2.5} style={{ color: 'rgba(255,255,255,0.2)' }}>{ICO.chevron}</Svg>
                </button>
              </div>

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

        {/* ── CONFIG MODAL ── */}
        {showConfig && <ConfigModal onClose={() => setShowConfig(false)} userId={uid} />}

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
              boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
              animation: 'slideUp 0.22s ease',
              maxHeight: '80dvh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              {/* -- Sticky header: handle + título (no hace scroll) -- */}
              <div style={{ flexShrink: 0, padding: '20px 18px 0', background: '#0F0F18' }}>
                {/* Handle */}
                <div onClick={() => setShowNotifs(false)} onTouchStart={e => { e.currentTarget.dataset.ty = e.touches[0].clientY; }} onTouchEnd={e => { if (e.changedTouches[0].clientY - Number(e.currentTarget.dataset.ty||0) > 30) setShowNotifs(false); }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 -18px 12px', padding: '4px 0 12px', cursor: 'pointer', userSelect: 'none' }}>
                  <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.22)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff' }}>Notificaciones</h2>
                  {unreadCount > 0 && (
                    <button onClick={dismissAllNotifs} style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#818CF8' }}>Marcar todas como leídas</span>
                    </button>
                  )}
                </div>
              </div>
              {/* ── Área scrolleable ── */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '4px 18px 48px' }}>
              {notifs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 40 }}>🔔</div>
                  <p style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Sin notificaciones</p>
                  <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Te avisamos acá cuando sea tu turno</p>
                </div>
              ) : (
                notifs.map(n => (
                  <NotifCard key={n.id} notif={n} onDismiss={dismissNotif} userId={uid} userName={uName}
                    onNavigate={(route) => {
                      setShowNotifs(false);
                      if (route.external) { router.push(route.external); }
                      else if (route.tab) { setTab(route.tab); if (route.friendTab) setPendingFriendTab(route.friendTab); }
                    }}
                  />
                ))
              )}
              </div>
            </div>
          </>
        )}


        {/* -- CONTENT -- */}
        <main key={tab} className="tab-content" style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
          {/* Banner sala activa (fuera del tab match) */}
          {tab !== 'match' && bgMM && ['searching','waiting','active','pending_confirm','disputed','pending_accept'].includes(bgMM.status) && (
            <button
              onClick={() => setTab('match')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 16px', background: 'linear-gradient(90deg,rgba(124,58,237,0.18),rgba(255,140,0,0.12))', borderBottom: '1px solid rgba(124,58,237,0.3)', border: 'none', cursor: 'pointer', gap: 10 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: bgMM.status === 'active' ? '#34D399' : '#FF8C00', flexShrink: 0, display: 'inline-block', boxShadow: '0 0 6px ' + (bgMM.status === 'active' ? '#34D399' : '#FF8C00') }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {bgMM.status === 'searching'       ? 'Buscando partida...'     :
                   bgMM.status === 'waiting'          ? 'Esperando confirmación'  :
                   bgMM.status === 'active'           ? '¡Partida en juego!'      :
                   bgMM.status === 'pending_confirm' ? 'Confirm\u00e1 el resultado' :
                                                      'Resultado en disputa'}
                </span>
              </div>
              <span style={{ fontSize: 12, color: '#FF8C00', fontWeight: 800 }}>Ir \u2192</span>
            </button>
          )}
          {tab === 'rankings' && <TabRankings user={user} setTab={setTab} />}
          {tab === 'torneos'  && <TabTorneos user={user} />}
          {tab === 'tips'     && <TabTips     />}
          {tab === 'match'    && <TabMatch bgMM={bgMM} setBgMM={setBgMM} userId={uid} userName={uName} user={user} />}
          {tab === 'amigos'   && <TabAmigos user={user} setNotifs={setNotifs} />}
          {tab === 'perfil'   && <TabPerfil user={user} />}
        </main>

        {/* ── BOTTOM NAV ── */}

        {/* CHAT FLOTANTE */}
        {chatInbox.length > 0 && tab !== 'amigos' && (
          <>
            <button
              onClick={() => setChatBubbleOpen(v => { if (!v) { const t = Date.now(); setChatLastOpened(t); try { localStorage.setItem('chat_last_opened', String(t)); } catch {} } return !v; })}
              style={{
                position: 'fixed', bottom: 76, right: 18, zIndex: 48,
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(99,102,241,0.5)',
                transition: 'transform 0.2s',
                transform: chatBubbleOpen ? 'scale(0.9)' : 'scale(1)',
              }}
            >
              <span style={{ fontSize: 22 }}>💬</span>
              {chatInbox.some(c => c.lastMessage && c.lastMessage.from !== uid && c.lastMessage.sentAt && new Date(c.lastMessage.sentAt).getTime() > chatLastOpened) && (
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 14, height: 14, borderRadius: '50%',
                  background: '#EF4444', border: '2px solid #0B0B12',
                }} />
              )}
            </button>

            {chatBubbleOpen && (
              <>
                <div onClick={() => setChatBubbleOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 47, background: 'rgba(0,0,0,0.4)' }} />
                <div style={{
                  position: 'fixed', bottom: 136, right: 18, zIndex: 49,
                  width: 300, maxHeight: 380,
                  background: '#13141f', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20, overflow: 'hidden',
                  boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                }}>
                  <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 900, fontSize: 15, color: '#fff' }}>💬 Chats</span>
                    <button onClick={() => { setChatBubbleOpen(false); setTab('amigos'); }} style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Ver todos →</button>
                  </div>
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {chatInbox.map(c => {
                      const isFromMe = c.lastMessage?.from === uid;
                      const timeAgo = c.lastMessage?.sentAt ? (() => {
                        const diff = Date.now() - new Date(c.lastMessage.sentAt).getTime();
                        const mins = Math.floor(diff / 60000);
                        if (mins < 1) return 'ahora';
                        if (mins < 60) return `${mins}m`;
                        const hrs = Math.floor(mins / 60);
                        if (hrs < 24) return `${hrs}h`;
                        return `${Math.floor(hrs / 24)}d`;
                      })() : '';
                      return (
                        <button
                          key={c.friendId}
                          onClick={() => { setChatBubbleOpen(false); setMiniChat({ friendId: c.friendId, friendName: c.friendName }); setMiniChatMsgs([]); }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 18px', background: 'transparent',
                            border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                            cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                          }}
                        >
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, color: '#818CF8', fontWeight: 800 }}>
                            {(c.friendName || '?')[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.friendName}</span>
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{timeAgo}</span>
                            </div>
                            <p style={{ margin: '2px 0 0', fontSize: 11, color: isFromMe ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)', fontWeight: isFromMe ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isFromMe ? 'Vos: ' : ''}{c.lastMessage?.text || ''}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* MINI-CHAT INLINE */}
        {miniChat && (
          <div style={{
            position: 'fixed', bottom: 76, right: 18, zIndex: 50,
            width: 330, height: 470,
            background: '#13141f', border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 20, display: 'flex', flexDirection: 'column',
            boxShadow: '0 8px 40px rgba(0,0,0,0.75)',
          }}>
            {/* Header */}
            <div style={{ padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#818CF8', fontWeight: 800, flexShrink: 0 }}>
                {(miniChat.friendName || '?')[0].toUpperCase()}
              </div>
              <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{miniChat.friendName}</span>
              <button
                onClick={() => { setMiniChat(null); setMiniChatMsgs([]); setMiniChatInput(''); }}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 4, flexShrink: 0 }}
              >×</button>
            </div>
            {/* Mensajes */}
            <div ref={miniChatScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {miniChatMsgs.map((m, i) => {
                const isMe = m.from === uid;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '80%', padding: '8px 12px',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isMe ? 'linear-gradient(135deg, #6366F1, #4F46E5)' : 'rgba(255,255,255,0.07)',
                      color: '#fff', fontSize: 13, lineHeight: 1.4, wordBreak: 'break-word',
                    }}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
              {miniChatMsgs.length === 0 && (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 20 }}>No hay mensajes aún</p>
              )}
            </div>
            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
              <input
                value={miniChatInput}
                onChange={e => setMiniChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMiniMsg()}
                placeholder="Escribí un mensaje..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '9px 13px', color: '#fff', fontSize: 13,
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button
                onClick={sendMiniMsg}
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #4F46E5)', border: 'none',
                  borderRadius: 12, width: 42, height: 42, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0,
                }}
              >➤</button>
            </div>
          </div>
        )}

        <BottomNav tab={tab} setTab={setTab} bgMMStatus={bgMM?.status} />

        {/* -- POPUP match encontrado -- */}
        {bgMM && bgMM.status === 'pending_accept' && bgMM.room && (() => {
          const is2v2    = bgMM.room.mode === '2v2';
          const myRole   = uid === bgMM.room.host?.userId ? 'host' : 'guest';
          const opponent = is2v2 ? null : (myRole === 'host' ? bgMM.room.guest : bgMM.room.host);
          const myTeam2  = is2v2 ? (bgMM.room.team1?.some(p => p.userId === uid) ? 'team1' : 'team2') : null;
          const enemyTeam2 = is2v2 ? (myTeam2 === 'team1' ? bgMM.room.team2 : bgMM.room.team1) : null;
          const pData    = PLATFORMS.find(x => x.id === bgMM.plat);
          const radius   = 32;
          const circ     = 2 * Math.PI * radius;
          const pct      = acceptCountdown / 15;
          const isUrgent = acceptCountdown <= 5;
          const oppChar  = !is2v2 && opponent?.charId ? CHARACTERS.find(c => c.id === opponent.charId) : null;
          return (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 20px',
            }}>
              <div style={{
                width: '100%', maxWidth: 370,
                background: 'linear-gradient(160deg,#15152A,#0d0d16)',
                border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.3)' : 'rgba(255,140,0,0.2)'}`,
                borderRadius: 28, padding: '0 0 24px',
                boxShadow: `0 24px 80px rgba(0,0,0,0.9), 0 0 40px ${isUrgent ? 'rgba(239,68,68,0.1)' : 'rgba(255,140,0,0.08)'}`,
                animation: `fadeUp 0.25s ease${isUrgent ? ', glow-pulse 1s ease-in-out infinite' : ''}`,
                overflow: 'hidden',
                transition: 'border-color 0.3s',
              }}>
                {/* Top accent bar */}
                <div style={{ height: 3, background: isUrgent ? 'linear-gradient(90deg,#EF4444,#FF6B6B,#EF4444)' : `linear-gradient(90deg,${pData?.from || '#FF8C00'},${pData?.to || '#E85D00'},${pData?.from || '#FF8C00'})`, animation: 'shimmer 2s linear infinite', backgroundSize: '200% 100%' }} />

                <div style={{ padding: '24px 24px 0' }}>
                  {/* Icon + Title */}
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: pData ? `linear-gradient(135deg,${pData.from},${pData.to})` : 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px', boxShadow: `0 8px 24px ${pData?.from || '#FF8C00'}40` }}>
                      {pData?.icon || '⚔️'}
                    </div>
                    <p style={{ margin: '0 0 3px', fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>¡Partida encontrada!</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{is2v2 ? '2v2 · ' : ''}{pData?.label ?? bgMM.plat}</p>
                  </div>

                  {/* Opponent info */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 16px', marginBottom: 18 }}>
                    <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' }}>{is2v2 ? 'Equipo rival' : 'Tu rival'}</p>
                    {is2v2 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                        {(enemyTeam2 || []).map(p => (
                          <p key={p.userId} style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#fff' }}>{p.userName}</p>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        {oppChar && <img src={stockIconPath(oppChar, opponent?.charAlt || 1)} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8, background: 'rgba(239,68,68,0.08)' }} onError={e => { e.target.style.display='none'; }} />}
                        <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#fff' }}>{opponent?.userName || '—'}</p>
                      </div>
                    )}
                  </div>

                  {/* Countdown circle */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                    <div style={{ position: 'relative', width: 80, height: 80 }}>
                      <svg width={80} height={80} style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={40} cy={40} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
                        <circle cx={40} cy={40} r={radius} fill="none"
                          stroke={isUrgent ? '#EF4444' : (pData?.from || '#FF8C00')}
                          strokeWidth={5}
                          strokeDasharray={circ}
                          strokeDashoffset={circ * (1 - pct)}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s', filter: `drop-shadow(0 0 6px ${isUrgent ? '#EF4444' : (pData?.from || '#FF8C00')})` }}
                        />
                      </svg>
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: isUrgent ? '#EF4444' : (pData?.from || '#FF8C00'), lineHeight: 1 }}>{acceptCountdown}</p>
                        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>seg</p>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  {(() => {
                    const iDidAccept = bgMM.room?.acceptedBy?.includes(uid);
                    return (
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={handleDeclineMatch} disabled={iDidAccept} style={{
                          flex: 1, padding: '14px', borderRadius: 16,
                          border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)',
                          color: iDidAccept ? 'rgba(239,68,68,0.25)' : '#EF4444', fontWeight: 800, fontSize: 14, cursor: iDidAccept ? 'default' : 'pointer',
                          transition: 'all 0.15s',
                        }}>✕ Rechazar</button>
                        <button onClick={iDidAccept ? undefined : handleAcceptMatch} disabled={iDidAccept} style={{
                          flex: 2, padding: '14px', borderRadius: 16,
                          border: iDidAccept ? '1px solid rgba(34,197,94,0.35)' : 'none',
                          background: iDidAccept ? 'rgba(34,197,94,0.1)' : 'linear-gradient(135deg,#22C55E,#16A34A)',
                          color: iDidAccept ? '#22C55E' : '#fff', fontWeight: 900, fontSize: 15,
                          cursor: iDidAccept ? 'default' : 'pointer',
                          boxShadow: iDidAccept ? 'none' : '0 6px 24px rgba(34,197,94,0.35)',
                          transition: 'all 0.15s',
                        }}>{iDidAccept ? '✅ Aceptado — Esperando rival…' : '⚡ Aceptar partida'}</button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* -- TOUR DE BIENVENIDA -- */}
      {showTour && (() => {
        const step = TOUR_STEPS[tourStep];
        const isLast = tourStep >= TOUR_STEPS.length - 1;
        const finishTour = () => { setShowTour(false); try { localStorage.setItem('tour_done', '1'); } catch {} };
        const nextTour = () => isLast ? finishTour() : setTourStep(s => s + 1);
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }}>
            {/* Backdrop semitransparente — no bloquea interacción con la app */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(2px)' }} onClick={finishTour} />
            {/* Tarjeta del tour */}
            <div style={{
              position: 'absolute', bottom: 88, left: 12, right: 12,
              background: 'linear-gradient(160deg,#1A1A2E,#111118)',
              border: '1px solid rgba(255,140,0,0.35)',
              borderRadius: 20, padding: '18px 18px 14px',
              boxShadow: '0 -4px 40px rgba(255,140,0,0.15)',
              animation: 'slideUp 0.25s ease',
              zIndex: 9999,
            }} onClick={e => e.stopPropagation()}>
              {/* Barra de progreso */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                {TOUR_STEPS.map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i <= tourStep ? '#FF8C00' : 'rgba(255,255,255,0.1)',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
              {/* Paso actual */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{step.emoji}</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '0.01em' }}>{step.title}</span>
              </div>
              <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.55 }}>
                {step.desc}
              </p>
              {/* Botones */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={finishTour} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)', fontSize: 13, cursor: 'pointer', padding: '6px 4px' }}>
                  Saltar
                </button>
                <button onClick={nextTour} style={{
                  background: 'linear-gradient(90deg,#FF8C00,#E85D00)', border: 'none',
                  color: '#fff', fontWeight: 800, fontSize: 14,
                  padding: '10px 26px', borderRadius: 12, cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255,140,0,0.35)',
                }}>
                  {isLast ? '¡Entendido! 🎮' : 'Siguiente →'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

/* ─── BOTTOM NAV ────────────────────────────────── */
function BottomNav({ tab, setTab, bgMMStatus }) {
  const leftItems = [
    { id: 'rankings', label: 'Rankings', icon: ICO.trophy   },
    { id: 'torneos',  label: 'Torneos',  icon: ICO.calendar },
  ];
  const rightItems = [
    { id: 'tips',    label: 'Tips',    icon: ICO.bulb  },
    { id: 'perfil',  label: 'Perfil',  icon: ICO.user  },
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
  const icon    = TIER_ICONS[rankObj.tier] || '??';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 800, color: rankObj.color, whiteSpace: 'nowrap',
    }}>
      {icon} {rankObj.name}
    </span>
  );
}

/* ─── CONFIG MODAL ──────────────────────────────── */
function ConfigModal({ onClose, userId }) {
  const SECTIONS = [
    { key: 'ranked',  label: '⚔️ Ranked',  lsKey: 'afk_chars_ranked'  },
    { key: 'casual',  label: '🎮 Casual',   lsKey: 'afk_chars_casual'  },
    { key: 'tourney', label: '🏆 Torneos',  lsKey: 'afk_chars_tourney' },
  ];
  const MAX_CHARS = 5;
  const [prefs, setPrefs] = useState(() => {
    const r = {};
    SECTIONS.forEach(s => {
      try { r[s.key] = JSON.parse(localStorage.getItem(s.lsKey) || '[]'); } catch { r[s.key] = []; }
    });
    return r;
  });
  const [activeSection, setActiveSection] = useState('ranked');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch('/api/players/profile?id=' + encodeURIComponent(userId))
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const cp = d?.profile?.charPrefs;
        if (!cp || typeof cp !== 'object') return;
        setPrefs(prev => ({
          ranked:  Array.isArray(cp.ranked)  ? cp.ranked  : prev.ranked,
          casual:  Array.isArray(cp.casual)  ? cp.casual  : prev.casual,
          tourney: Array.isArray(cp.tourney) ? cp.tourney : prev.tourney,
        }));
      }).catch(() => {});
  }, [userId]);

  const toggleChar = (charId) => {
    setPrefs(prev => {
      const current = prev[activeSection] || [];
      if (current.includes(charId)) return { ...prev, [activeSection]: current.filter(c => c !== charId) };
      if (current.length >= MAX_CHARS) return prev;
      return { ...prev, [activeSection]: [...current, charId] };
    });
  };

  const handleSave = () => {
    setSaving(true);
    SECTIONS.forEach(s => {
      try { localStorage.setItem(s.lsKey, JSON.stringify(prefs[s.key] || [])); } catch {}
    });
    if (userId) {
      fetch('/api/players/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, charPrefs: prefs }),
      }).catch(() => {});
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const currentChars = prefs[activeSection] || [];
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} />
      <div style={{
        position: 'fixed', zIndex: 61,
        bottom: 0, left: 'max(0px, calc(50% - 240px))', right: 'max(0px, calc(50% - 240px))',
        background: '#0F0F18', borderRadius: '24px 24px 0 0',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.22s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff' }}>⚙️ Configuración</p>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 99, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 16, fontFamily: 'inherit' }}>✕</button>
        </div>
        {/* Tabs de sección */}
        <div style={{ display: 'flex', margin: '14px 16px 0', background: 'rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden' }}>
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
              flex: 1, padding: '10px 4px', border: 'none', cursor: 'pointer',
              background: activeSection === s.key ? 'rgba(255,140,0,0.15)' : 'transparent',
              borderBottom: activeSection === s.key ? '2px solid #FF8C00' : '2px solid transparent',
              color: activeSection === s.key ? '#FF8C00' : 'rgba(255,255,255,0.4)',
              fontSize: 12, fontWeight: 800, fontFamily: 'inherit', transition: 'all 0.15s',
            }}>{s.label}</button>
          ))}
        </div>
        <p style={{ margin: '10px 18px 6px', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
          {currentChars.length}/{MAX_CHARS} personajes · tocá para seleccionar / deseleccionar
        </p>
        {/* Grilla de personajes */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
            {CHARACTERS.map(ch => {
              const sel = currentChars.includes(ch.id);
              return (
                <button key={ch.id} onClick={() => toggleChar(ch.id)} style={{
                  background: sel ? 'rgba(255,140,0,0.18)' : 'rgba(255,255,255,0.04)',
                  border: sel ? '2px solid #FF8C00' : '2px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '6px 2px 4px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  opacity: (!sel && currentChars.length >= MAX_CHARS) ? 0.35 : 1,
                  transition: 'all 0.12s', fontFamily: 'inherit',
                }}>
                  <img src={charImgPath(ch.img)} alt={ch.name} style={{ width: 36, height: 36, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                  <span style={{ fontSize: 7.5, fontWeight: 700, color: sel ? '#FF8C00' : 'rgba(255,255,255,0.55)', lineHeight: 1.2, overflow: 'hidden', maxWidth: '100%', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Botón guardar */}
        <div style={{ padding: '12px 16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: saved ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg,#FF8C00,#E85D00)',
            color: saved ? '#22C55E' : '#fff',
            fontSize: 15, fontWeight: 900, fontFamily: 'inherit', transition: 'all 0.2s',
          }}>
            {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar preferencias'}
          </button>
        </div>
      </div>
    </>
  );
}

function CommPlayerRow({ position, player, onPlayerClick, onNoProfile }) {
  // Prioridad: topChar (de torneos importados) → mainCharId (del perfil / auto-completado desde start.gg)
  // mainCharAlt NO se usa aquí porque es una skin alternativa, no el personaje base
  const charId     = player.topChar ? String(player.topChar) : (player.mainCharId ? String(player.mainCharId) : null);
  const renderFile = charId ? CHARACTER_RENDERS[charId] : null;
  const charObj    = charId ? CHARACTERS.find(c => c.id === charId) : null;
  const charSrc    = renderFile ? charRenderPath(renderFile) : (charObj ? charImgPath(charObj.img) : null);

  const isTop3 = position <= 3;
  const topColors = {
    1: { bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', text: '#000', posBg: 'rgba(255,255,255,0.25)', posColor: '#000' },
    2: { bg: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)', text: '#000', posBg: 'rgba(255,255,255,0.25)', posColor: '#000' },
    3: { bg: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)', text: '#000', posBg: 'rgba(255,255,255,0.25)', posColor: '#000' },
  };
  const tc = topColors[position] || null;
  const hasProfile = !!player.userId;

  function handleClick() {
    if (hasProfile) { onPlayerClick && onPlayerClick(player.userId, player.name); }
    else { onNoProfile && onNoProfile(player.name); }
  }

  return (
    <div onClick={handleClick} style={{
      display: 'flex', alignItems: 'center',
      background: tc ? tc.bg : '#10101A',
      border: tc ? 'none' : '1px solid rgba(255,255,255,0.05)',
      borderRadius: 12, overflow: 'hidden',
      cursor: 'pointer', position: 'relative', minHeight: isTop3 ? 72 : 56,
    }}>
      {/* Position badge */}
      <div style={{
        width: isTop3 ? 52 : 44, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: tc ? tc.posBg : 'rgba(124,58,237,0.15)',
        alignSelf: 'stretch',
      }}>
        <span style={{ fontSize: isTop3 ? 24 : 18, fontWeight: 900, color: tc ? tc.posColor : '#A78BFA', fontFamily: "'Outfit', sans-serif" }}>
          {position}
        </span>
      </div>

      {/* Name + pts */}
      <div style={{ flex: 1, padding: isTop3 ? '10px 12px' : '8px 10px', minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: isTop3 ? 17 : 14, fontWeight: 900,
          color: tc ? tc.text : '#fff',
          textTransform: 'uppercase', letterSpacing: '0.02em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {player.country && <FlagImg cc={player.country} size={14} />}
          {player.name}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: isTop3 ? 16 : 13, fontWeight: 900, color: tc ? 'rgba(0,0,0,0.65)' : '#A78BFA' }}>
          {player.total} <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7 }}>pts</span>
        </p>
      </div>

      {/* Character render */}
      {charSrc && (
        <img src={charSrc} alt="" style={{
          height: isTop3 ? 88 : 68, objectFit: 'contain',
          position: 'relative', zIndex: 1,
          marginRight: 25, marginLeft: isTop3 ? -8 : -6,
          filter: isTop3 ? 'none' : 'brightness(0.85)',
          flexShrink: 0,
        }} onError={e => { e.target.style.display = 'none'; }} />
      )}
      {/* Indicador sin perfil */}
      {!hasProfile && !charSrc && (
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginRight: 14, flexShrink: 0 }}>sin perfil</span>
      )}
    </div>
  );
}

function RankedPlayerRow({ position, player, onPlayerClick }) {
  const isSmasher   = player.rank === 'SMASHer';
  const rankObj     = RANKS.find(r => r.name === player.rank) || RANKS[0];
  const inPlacement = !player.placementDone;
  const wins  = player.wins || 0;
  const losses = player.losses || 0;
  const total  = wins + losses;
  const winPct = total > 0 ? Math.round(wins / total * 100) : 0;

  // Character render
  const charId    = player.mainCharId || null;
  const renderFile = charId ? CHARACTER_RENDERS[charId] : null;
  const charSrc   = player.mainCharAlt || (renderFile ? charRenderPath(renderFile) : null);

  // Top 3 styling
  const isTop3 = position <= 3;
  const topColors = {
    1: { bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', text: '#000', posBg: '#fff', posColor: '#000' },
    2: { bg: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)', text: '#000', posBg: '#fff', posColor: '#000' },
    3: { bg: 'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)', text: '#000', posBg: '#fff', posColor: '#000' },
  };
  const tc = topColors[position] || null;
  const winPillBg  = tc ? 'rgba(0,0,0,0.4)' : (winPct >= 60 ? 'rgba(52,211,153,0.2)' : winPct >= 40 ? 'rgba(255,200,0,0.18)' : 'rgba(255,80,80,0.18)');
  const winPillBdr = tc ? '1px solid rgba(0,0,0,0.2)' : `1px solid ${winPct >= 60 ? 'rgba(52,211,153,0.4)' : winPct >= 40 ? 'rgba(255,200,0,0.35)' : 'rgba(255,80,80,0.35)'}`;
  const winPillClr = winPct >= 60 ? '#34D399' : winPct >= 40 ? '#FBBF24' : '#F87171';

  return (
    <div onClick={() => onPlayerClick && onPlayerClick(player.userId, player.userName)} style={{
      display: 'flex', alignItems: 'center',
      background: tc ? tc.bg : '#10101A',
      border: tc ? 'none' : '1px solid rgba(255,255,255,0.05)',
      borderRadius: 12, overflow: 'hidden',
      cursor: onPlayerClick ? 'pointer' : 'default',
      position: 'relative', minHeight: isTop3 ? 72 : 56,
    }}>
      {/* Position badge */}
      <div style={{
        width: isTop3 ? 52 : 44, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: tc ? 'rgba(255,255,255,0.25)' : 'rgba(124,58,237,0.15)',
        alignSelf: 'stretch',
      }}>
        <span style={{
          fontSize: isTop3 ? 24 : 18, fontWeight: 900,
          color: tc ? tc.posColor : '#A78BFA',
          fontFamily: "'Outfit', sans-serif",
        }}>{position}</span>
      </div>

      {/* Name + score */}
      <div style={{ flex: 1, padding: isTop3 ? '10px 12px' : '8px 10px', minWidth: 0 }}>
        <p style={{
          margin: 0, fontSize: isTop3 ? 18 : 14, fontWeight: 900,
          color: tc ? tc.text : (isSmasher ? '#FF8C00' : '#fff'),
          textTransform: 'uppercase', letterSpacing: '0.02em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {player.country && <FlagImg cc={player.country} size={14} />}
          {player.userName}
        </p>
        {!inPlacement && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            <RankBadge rankName={player.rank} />
            {isSmasher && <span style={{ fontSize: 10, color: tc ? 'rgba(0,0,0,0.6)' : '#FF8C00', fontWeight: 700 }}>{player.rankPoints || 0} RP</span>}
            <div style={{ background: winPillBg, border: winPillBdr, borderRadius: 8, padding: '2px 7px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: winPillClr }}>{winPct}%</span>
            </div>
          </div>
        )}
        {inPlacement && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: tc ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.35)' }}>
              {wins}W · {losses}L
            </p>
            {total > 0 && (
              <div style={{ background: winPillBg, border: winPillBdr, borderRadius: 8, padding: '2px 7px' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: winPillClr }}>{winPct}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* W/L stats (non-top3) */}
      {!isTop3 && !inPlacement && (
        <div style={{ textAlign: 'right', flexShrink: 0, paddingRight: charSrc ? 4 : 14 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800 }}>
            <span style={{ color: '#22C55E' }}>{wins}W</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 3px' }}>·</span>
            <span style={{ color: '#EF4444' }}>{losses}L</span>
          </p>
        </div>
      )}

      {/* Character render */}
      {charSrc && (
        <img
          src={charSrc}
          alt=""
          style={{
            height: isTop3 ? 88 : 68,
            objectFit: 'contain',
            position: 'relative', zIndex: 1,
            marginRight: 25,
            marginLeft: isTop3 ? -8 : -6,
            filter: isTop3 ? 'none' : 'brightness(0.85)',
            flexShrink: 0,
          }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB — INICIO
═══════════════════════════════════════════════════ */
function TabInicio({ user, isAdmin, router, displayName, initial, setTab }) {
  const [torneos,     setTorneos]     = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    fetch('/api/tournaments/sync-startgg')
      .then(r => r.json())
      .then(d => { setTorneos(Array.isArray(d.tournaments) ? d.tournaments : []); setLoadingData(false); })
      .catch(() => setLoadingData(false));
  }, []);

  const featuredTorneo = torneos[0] || null;

  const QUICK = [
    { icon: '⚡', label: 'Match',    action: () => setTab('match')    },
    { icon: '📅', label: 'Torneos',  action: () => setTab('torneos')  },
    { icon: '🏆', label: 'Rankings', action: () => setTab('rankings') },
    { icon: '💡', label: 'Tips',     action: () => setTab('tips')     },
  ];

  return (
    <div style={{ paddingBottom: 28 }}>

      {/* ── Greeting row ── */}
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
          Ver perfil ?
        </button>
      </div>

      {/* ── Featured Banner ── */}
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
                  ? (featuredTorneo.startAt ? new Date(featuredTorneo.startAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Fecha por confirmar')
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

      {/* ── Quick access pills ── */}
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

        {/* ── Quick Match CTA ── */}
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

        {/* ── Admin button ── */}
        {isAdmin && (
          <button onClick={() => router.push('/')} style={{
            width: '100%', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14,
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

        {/* ── Gestionar Rankings (por comunidad) ── */}
        {(isAdmin || (user?.adminCommunities?.length > 0)) && (
          <button onClick={() => router.push('/admin/afk-ranking')} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14,
            background: 'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(99,42,190,0.04))',
            border: '1px solid rgba(124,58,237,0.2)', borderRadius: 24, padding: '15px 18px',
            cursor: 'pointer', textAlign: 'left', marginBottom: 12,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 15, background: 'linear-gradient(135deg,#7C3AED,#6D28D9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 14px rgba(124,58,237,0.3)', flexShrink: 0 }}>🏆</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 800, color: '#A78BFA', fontSize: 14 }}>Gestionar Rankings</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Rankings comunitarios y puntos</p>
            </div>
            <Svg size={16} sw={2}>{ICO.chevron}</Svg>
          </button>
        )}

        {/* ── Comunidades ── */}
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


/* --- MATCH DETAIL MODAL --------------------------------------- */
function MatchDetail({ match: m, viewingId, onClose, onBack, onViewOpponent }) {
  // Hooks must run before any conditional return
  const isTournament_h = m?.type === 'tournament';
  const isWin_h = m ? (m.mode === '2v2' ? !!m.isWin : String(m.winnerId) === String(viewingId)) : false;
  const opponent_h = m ? (m.mode === '2v2' ? '?' : (isWin_h ? m.loserName : m.winnerName)) : '';
  // Para partidas de torneo: buscar si el oponente tiene perfil en la app por nombre
  const [tourOppProfile, setTourOppProfile] = useState(undefined); // undefined=buscando, null=no tiene la app, obj=encontrado
  useEffect(() => {
    if (!isTournament_h || !opponent_h) { setTourOppProfile(null); return; }
    setTourOppProfile(undefined);
    fetch('/api/players/search?q=' + encodeURIComponent(opponent_h))
      .then(r => r.ok ? r.json() : [])
      .then(results => {
        const exact = results.find(p => p.userName.toLowerCase() === opponent_h.toLowerCase());
        setTourOppProfile(exact || null);
      })
      .catch(() => setTourOppProfile(null));
  }, [isTournament_h, opponent_h]);

  if (!m) return null;
  const myId = String(viewingId);
  const is2v2 = m.mode === '2v2';
  const isCasual = m.type === 'casual';
  const isTournament = m.type === 'tournament';
  const isWin = is2v2 ? !!m.isWin : String(m.winnerId) === myId;
  const opponent = is2v2 ? '?' : (isWin ? m.loserName : m.winnerName);
  const myCharId = is2v2 ? null : (isWin ? m.winnerCharId : m.loserCharId);
  const oppCharId = is2v2 ? null : (isWin ? m.loserCharId : m.winnerCharId);
  const myCharObj = myCharId ? CHARACTERS.find(c => c.id === myCharId) : null;
  const oppCharObj = oppCharId ? CHARACTERS.find(c => c.id === oppCharId) : null;
  const mySkin = is2v2 ? null : (isWin ? (m.winnerAltId || 1) : (m.loserAltId || 1));
  const oppSkin = is2v2 ? null : (isWin ? (m.loserAltId || 1) : (m.winnerAltId || 1));
  const myCharSrc = stockIconPath(myCharObj, mySkin);
  const oppCharSrc = stockIconPath(oppCharObj, oppSkin);
  const oppId = is2v2 ? null : (isWin ? m.loserId : m.winnerId);
  const myName = is2v2 ? 'Tu equipo' : (isWin ? m.winnerName : m.loserName);
  const myScore = m.winnerScore != null ? (isWin ? m.winnerScore : (m.loserScore ?? 0)) : null;
  const oppScore = m.winnerScore != null ? (isWin ? (m.loserScore ?? 0) : m.winnerScore) : null;
  const isMyPlacement = !isCasual && !is2v2 && !isTournament && (isWin ? m.isPlacementWinner : m.isPlacementLoser);
  const rpDelta = isCasual || is2v2 || isTournament ? null : isMyPlacement ? null : (isWin ? m.rpDelta : (m.loserRpDelta || -10));
  const myRankName = !isCasual && !is2v2 ? (isWin ? m.winnerRankAfter : m.loserRankAfter) : null;
  const myRankObj = myRankName ? RANKS.find(r => r.name === myRankName) : null;
  const games = (m.games || []).filter(g => g?.result || g?.gameNum).map(g => {
    if (g.result) return g;
    const stageName = resolveGameStage(g);
    const isGameWin = isTournament ? (g.winnerName === (isWin ? m.winnerName : '___')) : String(g.winnerId) === myId;
    return { ...g, result: { gameNum: g.gameNum, stage: stageName, winnerId: isGameWin ? myId : '__opp__', stocksWon: g.stocksWon ?? null } };
  });
  // Para torneo: determinar si el oponente tiene perfil clickeable
  const oppClickable = isTournament
    ? (tourOppProfile ? () => onViewOpponent && onViewOpponent(String(tourOppProfile.userId), tourOppProfile.userName) : undefined)
    : (onViewOpponent && oppId ? () => onViewOpponent(String(oppId), opponent) : undefined);
  const oppBadge = isTournament ? (
    tourOppProfile === undefined
      ? <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>Buscando...</span>
      : tourOppProfile
        ? <span style={{ fontSize: 9, fontWeight: 700, color: '#A78BFA', cursor: 'pointer' }}>Ver perfil →</span>
        : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.3 }}>Sin perfil en la app</span>
  ) : null;
  const CharSlot = ({ src, playerName, charName, onClick, badge }) => (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 0, cursor: onClick ? 'pointer' : 'default' }}>
      {playerName && <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{playerName}</span>}
      <div style={{ width: 64, height: 64, borderRadius: 16, background: onClick ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.06)', border: onClick ? '1px solid rgba(167,139,250,0.3)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {src ? <img src={src} alt="" style={{ width: 58, height: 58, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} /> : <span style={{ fontSize: 28 }}>{is2v2 ? '👥' : '⚔️'}</span>}
      </div>
      {charName && <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: 75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{charName}</span>}
      {badge}
    </div>
  );
  const commLogo = isTournament && HIST_COMM_LOGOS[m.community] ? HIST_COMM_LOGOS[m.community] : null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(5px)', zIndex: 10001, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '88vh', background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '22px 22px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'slideUp .22s ease-out' }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0, cursor: 'pointer' }} onClick={onClose}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
        </div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {onBack && <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#FF8C00', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: '0 8px 0 0', flexShrink: 0 }}>←</button>}
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff', flex: 1 }}>Resumen de partida</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>
        {/* Scrollable content */}
        <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 16px 24px' }}>
          {/* Resultado principal */}
          <div style={{ position: 'relative', background: isWin ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${isWin ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)'}`, borderRadius: 20, padding: '18px 16px 14px', marginBottom: 12 }}>
            {commLogo && <img src={commLogo} alt="" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 60, height: 60, objectFit: 'contain', opacity: 0.12, pointerEvents: 'none' }} />}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <CharSlot src={myCharSrc} playerName={myName} charName={myCharObj?.name} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0, paddingTop: 20 }}>
                {myScore != null && <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: 2, lineHeight: 1 }}>{myScore}–{oppScore ?? 0}</p>}
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: isWin ? '#22C55E' : '#EF4444' }}>{isWin ? 'VICTORIA' : 'DERROTA'}</p>
                {rpDelta != null && <span style={{ fontSize: 10, fontWeight: 800, color: rpDelta >= 0 ? '#22C55E' : '#EF4444', padding: '1px 6px', borderRadius: 8, background: rpDelta >= 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }}>{rpDelta >= 0 ? '+' : ''}{rpDelta} RR</span>}
                {isMyPlacement && <span style={{ fontSize: 10, fontWeight: 800, color: '#FBBF24', padding: '1px 6px', borderRadius: 8, background: 'rgba(251,191,36,0.12)' }}>Posicionamiento</span>}
                {myRankObj && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, color: myRankObj.color, padding: '2px 7px', borderRadius: 10, background: myRankObj.bg, border: `1px solid ${myRankObj.border}` }}>{TIER_ICONS[myRankObj.tier]} {myRankObj.name}</span>}
              </div>
              <CharSlot src={oppCharSrc} playerName={opponent} charName={oppCharObj?.name} onClick={oppClickable} badge={oppBadge} />
            </div>
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{isTournament ? `${m.tournamentName || m.communityLabel || m.community || 'Torneo'}${m.round ? ` · ${m.round}` : ''} · ${timeAgo(m.playedAt)}` : `${platLabel(m.platform)} · ${timeAgo(m.playedAt)}${isCasual ? ' · Normal' : is2v2 ? ' · 2v2' : ' · Ranked'}`}</p>
          {/* Juegos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#FF8C00,#E85D00)', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Juegos</p>
          </div>
          {games.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {games.map((g, gi) => {
                const gWon = String(g.result.winnerId) === myId;
                const gStage = resolveGameStage(g);
                const gStocks = g.result.stocksWon;
                const stageSrc = gStage ? STAGE_IMG[gStage] : null;
                return (
                  <div key={gi} style={{ position: 'relative', height: 80, borderRadius: 14, overflow: 'hidden', borderLeft: `3px solid ${gWon ? '#22C55E' : '#EF4444'}` }}>
                    {stageSrc && <img src={stageSrc} alt={gStage} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
                    <div style={{ position: 'absolute', inset: 0, background: stageSrc ? 'linear-gradient(to right, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 100%)' : (gWon ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)') }} />
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '100%', padding: '0 14px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Juego {g.result.gameNum || gi + 1}</p>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>{gStage || 'Escenario desconocido'}</p>
                        {gStocks != null && <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{gWon ? `Ganaste · ${gStocks} stock${gStocks !== 1 ? 's' : ''}` : `Perdiste · ${gStocks} stock${gStocks !== 1 ? 's' : ''}`}</p>}
                      </div>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: gWon ? '#22C55E' : '#EF4444', flexShrink: 0 }}>{gWon ? '✅' : '❌'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>{isCasual ? 'Las partidas normales son BO1 — sin detalle por juego' : 'Sin detalle de juegos disponible para esta partida'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -- Helpers de historial (compartidos entre tabs) -----------------------------
const HIST_COMM_LABELS = { 'santafe': 'Santa Fe', 'cordoba': 'Córdoba', 'mendoza': 'Mendoza', 'afk-multi': 'AFK', 'afk': 'AFK', 'warui': 'Warui', 'inc': 'INC', 'test': 'Test' };
const HIST_COMM_SHORT  = { 'santafe': 'SFE', 'cordoba': 'CBA', 'mendoza': 'MDZ', 'afk-multi': 'AFK', 'afk': 'AFK', 'warui': 'WAR', 'inc': 'INC', 'test': 'TST' };
const HIST_COMM_LOGOS  = { 'santafe': '/images/Smash_Santa_Fe.png', 'cordoba': '/images/SCC.webp', 'mendoza': '/images/Team_Anexo/team_anexo_logo_nwe.png', 'afk-multi': '/images/AFK.webp', 'afk': '/images/AFK.webp', 'warui': '/images/warui/logo.png', 'inc': '/images/inc.png' };
// Canonical community id: lowercase, trim, afk-multi → afk
function canonComm(raw) {
  const c = String(raw || '').toLowerCase().trim();
  return c === 'afk-multi' ? 'afk' : c;
}
function buildHistFilterTabs(hist) {
  if (!Array.isArray(hist)) return [['all','Todos']];
  const hasCasual = hist.some(m => m.type === 'casual');
  // Deduplicate by display label — any two communities with the same label become one tab
  const labelToId = {};
  hist.filter(m => m.type === 'tournament' && m.community).forEach(m => {
    const id = canonComm(m.community);
    const label = HIST_COMM_LABELS[id] || HIST_COMM_LABELS[m.community] || m.community;
    if (!labelToId[label]) labelToId[label] = id;
  });
  const commTabs = Object.entries(labelToId).map(([label, id]) => [id, label]);
  return [['all','Todos'],['ranked','Ranked'],...(hasCasual?[['casual','Normal']]:[]),...commTabs];
}
function applyHistFilter(hist, filter) {
  if (filter === 'all') return hist;
  if (filter === 'casual') return hist.filter(m => m.type === 'casual');
  if (filter === 'ranked') return hist.filter(m => !m.type || m.type === 'ranked');
  return hist.filter(m => m.type === 'tournament' && canonComm(m.community) === filter);
}
function groupHistByDate(matches) {
  const groups = []; let curKey = null, curGroup = null;
  for (const m of matches) {
    const d = m.playedAt ? new Date(m.playedAt) : null;
    const key = d ? d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' }) : 'Sin fecha';
    if (key !== curKey) { curKey = key; curGroup = { dateStr: key, matches: [] }; groups.push(curGroup); }
    curGroup.matches.push(m);
  }
  return groups;
}
function ProfileHistorySection({ history: hist, histFilter, setHistFilter, histExpanded, setHistExpanded, viewedUserId, setViewMatchDetail, rankStats }) {
  const [showAllModal, setShowAllModal] = useState(false);
  if (!Array.isArray(hist) || hist.length === 0) return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
      <p style={{ fontSize: 32, margin: '0 0 8px' }}>⚔️</p>
      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Sin partidas aún</p>
    </div>
  );
  const tabs = buildHistFilterTabs(hist);
  const filtered = applyHistFilter(hist, histFilter);
  const toShow = filtered.slice(0, 5);
  const groups = groupHistByDate(toShow);
  const allGroups = groupHistByDate(filtered);
  return (
    <div>
      {tabs.length > 2 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {tabs.map(([id, lbl]) => (
            <button key={id} onClick={() => { setHistFilter(id); setHistExpanded(false); }} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: histFilter === id ? 'rgba(255,140,0,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${histFilter === id ? 'rgba(255,140,0,0.5)' : 'rgba(255,255,255,0.06)'}`, color: histFilter === id ? '#FF8C00' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}>{lbl}</button>
          ))}
        </div>
      )}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Sin partidas para este filtro</div>
      ) : (
        <div>
          {groups.map(({ dateStr, matches: gm }, gi) => {
            const gW = gm.filter(m => (m.mode === '2v2' || m.type === 'tournament') ? !!m.isWin : String(m.winnerId) === String(viewedUserId)).length;
            return (
              <div key={gi}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 2px 5px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', flex: 1 }}>{dateStr}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#22C55E' }}>{gW}W</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', margin: '0 3px' }}>//</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#EF4444' }}>{gm.length - gW}L</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
                  {gm.map((m, i) => {
                    const isCasual = m.type === 'casual';
                    const isTournament = m.type === 'tournament';
                    const is2v2 = m.mode === '2v2';
                    const isWin = (is2v2 || isTournament) ? !!m.isWin : String(m.winnerId) === String(viewedUserId);
                    const opponent = is2v2 ? (isWin ? `${m[m.winnerTeam === 'team1' ? 'team2' : 'team1']?.p1 || '?'} & ${m[m.winnerTeam === 'team1' ? 'team2' : 'team1']?.p2 || '?'}` : `${m[m.winnerTeam]?.p1 || '?'} & ${m[m.winnerTeam]?.p2 || '?'}`) : (isWin ? m.loserName : m.winnerName);
                    const myCharId = is2v2 ? null : (isWin ? m.winnerCharId : m.loserCharId);
                    const myRankName = is2v2 ? null : (isWin ? m.winnerRankAfter : m.loserRankAfter);
                    // Fallback: usar rango actual del perfil segun plataforma de la partida
                    const fallbackRankName = (!myRankName && !isCasual && !is2v2 && !isTournament && rankStats)
                      ? (rankStats[m.platform || m.plat || 'switch']?.rankName || null)
                      : null;
                    const resolvedRankName = myRankName || fallbackRankName;
                    const rankObj = resolvedRankName ? RANKS.find(r => r.name === resolvedRankName) : null;
                    const tierIcon = rankObj ? TIER_ICONS[rankObj.tier] : null;
                    const charObj = myCharId ? CHARACTERS.find(ch => ch.id === myCharId) : null;
                    const mySkin = is2v2 ? null : (isWin ? (m.winnerAltId || 1) : (m.loserAltId || 1));
                    const charSrc = stockIconPath(charObj, mySkin);
                    const oppCharId = is2v2 ? null : (isWin ? m.loserCharId : m.winnerCharId);
                    const oppCharObj = oppCharId ? CHARACTERS.find(ch => ch.id === oppCharId) : null;
                    const oppSkin = is2v2 ? null : (isWin ? (m.loserAltId || 1) : (m.winnerAltId || 1));
                    const oppCharSrc = stockIconPath(oppCharObj, oppSkin);
                    const isMyPlacement = !isCasual && !is2v2 && !isTournament && (isWin ? m.isPlacementWinner : m.isPlacementLoser);
                    const rpDelta = isCasual || is2v2 || isTournament ? null : (isMyPlacement ? null : (isWin ? m.rpDelta : (m.loserRpDelta || -10)));
                    const myScore = m.winnerScore != null ? (isWin ? m.winnerScore : (m.loserScore ?? 0)) : null;
                    const oppScore = m.winnerScore != null ? (isWin ? (m.loserScore ?? 0) : m.winnerScore) : null;
                    const games = m.games || [];
                    const playedStages = games.map(g => resolveGameStage(g)).filter(Boolean);
                    const uniqueStages = [...new Set(playedStages)];
                    return (
                      <div key={i} onClick={() => setViewMatchDetail({ match: m, viewingId: String(viewedUserId) })} style={{ position: 'relative', height: 72, borderRadius: 12, overflow: 'hidden', borderLeft: '3px solid ' + (isWin ? '#22C55E' : '#EF4444'), cursor: 'pointer' }}>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                          {uniqueStages.length > 0 ? uniqueStages.map((stage, si) => (
                            <div key={si} style={{ flex: 1, backgroundImage: `url(${STAGE_IMG[stage] || ''})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                          )) : (
                            <div style={{ flex: 1, background: isWin ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)' }} />
                          )}
                        </div>
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 50%, rgba(0,0,0,0.52) 100%)' }} />
                        {isTournament && HIST_COMM_LOGOS[m.community] && (
                          <img src={HIST_COMM_LOGOS[m.community]} alt="" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 46, height: 46, objectFit: 'contain', opacity: 0.22, pointerEvents: 'none', filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.7))' }} />
                        )}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}>
                          <div style={{ width: 100, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px 4px 8px 8px' }}>
                            {charSrc ? (
                              <img src={charSrc} alt="" style={{ width: 50, height: 50, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />
                            ) : (
                              <div style={{ width: 50, height: 50, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: is2v2 ? 24 : 20 }}>{is2v2 ? '👥' : '⚔️'}</div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              {isCasual ? (
                                <span style={{ fontSize: 8, fontWeight: 800, color: '#A78BFA', padding: '1px 3px', borderRadius: 3, background: 'rgba(139,92,246,0.15)' }}>NRM</span>
                              ) : isTournament ? (
                                HIST_COMM_LOGOS[m.community] ? (
                                  <img src={HIST_COMM_LOGOS[m.community]} alt="" style={{ width: 30, height: 30, objectFit: 'contain', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }} onError={e => { e.target.style.display='none'; }} />
                                ) : (
                                  <span style={{ fontSize: 8, fontWeight: 800, color: '#F59E0B', padding: '1px 3px', borderRadius: 3, background: 'rgba(245,158,11,0.15)' }}>&nbsp;</span>
                                )
                              ) : is2v2 ? (
                                <span style={{ fontSize: 8, fontWeight: 800, color: '#60A5FA', padding: '1px 3px', borderRadius: 3, background: 'rgba(96,165,250,0.15)' }}>2v2</span>
                              ) : rankObj ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                                  <span style={{ fontSize: 20, lineHeight: 1.1 }}>{TIER_ICONS[rankObj.tier]}</span>
                                  <span style={{ fontSize: 8, fontWeight: 900, color: rankObj.color, lineHeight: 1.2, letterSpacing: '0.04em' }}>{['I','II','III','IV'][(rankObj.subdivision||1)-1]}</span>
                                </div>
                              ) : isMyPlacement ? (
                                <span style={{ fontSize: 8, fontWeight: 800, color: '#FBBF24', padding: '1px 3px', borderRadius: 3, background: 'rgba(251,191,36,0.15)' }}>POS</span>
                              ) : (
                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>?</span></div>
                              )}
                            </div>
                          </div>
                          <div style={{ flex: 1, padding: '9px 5px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>vs {opponent}</p>
                            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                              {isTournament ? (m.tournamentName || m.communityLabel || m.community || 'Torneo') : platLabel(m.platform)} · {timeAgo(m.playedAt)}
                            </p>
                            {isTournament ? (
                              m.round ? <span style={{ fontSize: 10, fontWeight: 800, color: '#F59E0B' }}>{m.round}</span> : null
                            ) : !isCasual && !is2v2 && (
                              isMyPlacement ? (
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#FBBF24' }}>Posicionamiento</span>
                              ) : rpDelta != null ? (
                                <span style={{ fontSize: 10, fontWeight: 800, color: rpDelta >= 0 ? '#22C55E' : '#EF4444' }}>{rpDelta >= 0 ? '+' : ''}{rpDelta} RR</span>
                              ) : null
                            )}
                          </div>
                          <div style={{ padding: '9px 10px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                            {oppCharSrc && <img src={oppCharSrc} alt="" style={{ width: 28, height: 28, objectFit: 'contain', opacity: 0.7 }} onError={e => { e.target.style.display='none'; }} />}
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: isWin ? '#22C55E' : '#EF4444' }}>{isWin ? 'VICTORIA' : 'DERROTA'}</p>
                            {myScore != null && <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)' }}>{myScore}–{oppScore ?? 0}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filtered.length > 5 && (
            <button onClick={() => setShowAllModal(true)} style={{ width: '100%', marginTop: 8, padding: '11px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em' }}>
              Ver todo ({filtered.length}) →
            </button>
          )}
        </div>
      )}
      {/* Bottom sheet: Historial completo */}
      {showAllModal && (
        <div onClick={() => setShowAllModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(5px)', zIndex: 10001, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '22px 22px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'slideUp .22s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0, cursor: 'pointer' }} onClick={() => setShowAllModal(false)}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>Historial completo ({filtered.length})</p>
              <button onClick={() => setShowAllModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '10px 16px 24px' }}>
              {allGroups.map(({ dateStr, matches: gm }, gi) => {
                const gW = gm.filter(mm => (mm.mode === '2v2' || mm.type === 'tournament') ? !!mm.isWin : String(mm.winnerId) === String(viewedUserId)).length;
                return (
                  <div key={gi}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 2px 5px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', flex: 1 }}>{dateStr}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#22C55E' }}>{gW}W</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', margin: '0 3px' }}>//</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#EF4444' }}>{gm.length - gW}L</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
                      {gm.map((m, i) => {
                        const isCasual = m.type === 'casual';
                        const isTournament = m.type === 'tournament';
                        const is2v2 = m.mode === '2v2';
                        const isWin = (is2v2 || isTournament) ? !!m.isWin : String(m.winnerId) === String(viewedUserId);
                        const opponent = is2v2 ? (isWin ? `${m[m.winnerTeam === 'team1' ? 'team2' : 'team1']?.p1 || '?'} & ${m[m.winnerTeam === 'team1' ? 'team2' : 'team1']?.p2 || '?'}` : `${m[m.winnerTeam]?.p1 || '?'} & ${m[m.winnerTeam]?.p2 || '?'}`) : (isWin ? m.loserName : m.winnerName);
                        const myCharId = is2v2 ? null : (isWin ? m.winnerCharId : m.loserCharId);
                        const myRankName = is2v2 ? null : (isWin ? m.winnerRankAfter : m.loserRankAfter);
                        const rankObj = myRankName ? RANKS.find(r => r.name === myRankName) : null;
                        const charObj = myCharId ? CHARACTERS.find(ch => ch.id === myCharId) : null;
                        const mySkin = is2v2 ? null : (isWin ? (m.winnerAltId || 1) : (m.loserAltId || 1));
                        const _ai = (o, s) => Math.min(Math.max(0,(s||1)-1),(o.alts?.length||1)-1);
                        const charSrc = stockIconPath(charObj, mySkin);
                        const oppCharId = is2v2 ? null : (isWin ? m.loserCharId : m.winnerCharId);
                        const oppCharObj = oppCharId ? CHARACTERS.find(ch => ch.id === oppCharId) : null;
                        const oppSkin = is2v2 ? null : (isWin ? (m.loserAltId || 1) : (m.winnerAltId || 1));
                        const oppCharSrc = stockIconPath(oppCharObj, oppSkin);
                        const isMyPlacement = !isCasual && !is2v2 && !isTournament && (isWin ? m.isPlacementWinner : m.isPlacementLoser);
                        const rpDelta = isCasual || is2v2 || isTournament ? null : (isMyPlacement ? null : (isWin ? m.rpDelta : (m.loserRpDelta || -10)));
                        const myScore = m.winnerScore != null ? (isWin ? m.winnerScore : (m.loserScore ?? 0)) : null;
                        const oppScore = m.winnerScore != null ? (isWin ? (m.loserScore ?? 0) : m.winnerScore) : null;
                        const games = m.games || [];
                        const playedStages = games.map(g => resolveGameStage(g)).filter(Boolean);
                        const uniqueStages = [...new Set(playedStages)];
                        return (
                          <div key={i} onClick={() => { setShowAllModal(false); setViewMatchDetail({ match: m, viewingId: String(viewedUserId), onBack: () => { setViewMatchDetail(null); setShowAllModal(true); } }); }} style={{ position: 'relative', height: 72, borderRadius: 12, overflow: 'hidden', borderLeft: '3px solid ' + (isWin ? '#22C55E' : '#EF4444'), cursor: 'pointer' }}>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                              {uniqueStages.length > 0 ? uniqueStages.map((stage, si) => (
                                <div key={si} style={{ flex: 1, backgroundImage: `url(${STAGE_IMG[stage] || ''})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                              )) : (
                                <div style={{ flex: 1, background: isWin ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)' }} />
                              )}
                            </div>
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 50%, rgba(0,0,0,0.52) 100%)' }} />
                            {isTournament && HIST_COMM_LOGOS[m.community] && (
                              <img src={HIST_COMM_LOGOS[m.community]} alt="" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 46, height: 46, objectFit: 'contain', opacity: 0.22, pointerEvents: 'none', filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.7))' }} />
                            )}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}>
                              <div style={{ width: 100, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px 4px 8px 8px' }}>
                                {charSrc ? (
                                  <img src={charSrc} alt="" style={{ width: 50, height: 50, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />
                                ) : (
                                  <div style={{ width: 50, height: 50, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: is2v2 ? 24 : 20 }}>{is2v2 ? '👥' : '⚔️'}</div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                  {isCasual ? (
                                    <span style={{ fontSize: 8, fontWeight: 800, color: '#A78BFA', padding: '1px 3px', borderRadius: 3, background: 'rgba(139,92,246,0.15)' }}>NRM</span>
                                  ) : isTournament ? (
                                    HIST_COMM_LOGOS[m.community] ? (
                                      <img src={HIST_COMM_LOGOS[m.community]} alt="" style={{ width: 30, height: 30, objectFit: 'contain', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }} onError={e => { e.target.style.display='none'; }} />
                                    ) : (
                                      <span style={{ fontSize: 8, fontWeight: 800, color: '#F59E0B', padding: '1px 3px', borderRadius: 3, background: 'rgba(245,158,11,0.15)' }}>&nbsp;</span>
                                    )
                                  ) : is2v2 ? (
                                    <span style={{ fontSize: 8, fontWeight: 800, color: '#60A5FA', padding: '1px 3px', borderRadius: 3, background: 'rgba(96,165,250,0.15)' }}>2v2</span>
                                  ) : rankObj ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                                      <span style={{ fontSize: 20, lineHeight: 1.1 }}>{TIER_ICONS[rankObj.tier]}</span>
                                      <span style={{ fontSize: 8, fontWeight: 900, color: rankObj.color, lineHeight: 1.2, letterSpacing: '0.04em' }}>{['I','II','III','IV'][(rankObj.subdivision||1)-1]}</span>
                                    </div>
                                  ) : isMyPlacement ? (
                                    <span style={{ fontSize: 8, fontWeight: 800, color: '#FBBF24', padding: '1px 3px', borderRadius: 3, background: 'rgba(251,191,36,0.15)' }}>POS</span>
                                  ) : (
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>?</span></div>
                                  )}
                                </div>
                              </div>
                              <div style={{ flex: 1, padding: '9px 5px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>vs {opponent}</p>
                                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                              {isTournament ? (m.communityLabel || m.community || 'Torneo') : platLabel(m.platform)} · {timeAgo(m.playedAt)}
                                </p>
                                {isTournament ? (
                                  m.round ? <span style={{ fontSize: 10, fontWeight: 800, color: '#F59E0B' }}>{m.round}</span> : null
                                ) : !isCasual && !is2v2 && (
                                  isMyPlacement ? (
                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#FBBF24' }}>Posicionamiento</span>
                                  ) : rpDelta != null ? (
                                    <span style={{ fontSize: 10, fontWeight: 800, color: rpDelta >= 0 ? '#22C55E' : '#EF4444' }}>{rpDelta >= 0 ? '+' : ''}{rpDelta} RR</span>
                                  ) : null
                                )}
                              </div>
                              <div style={{ padding: '9px 10px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                {oppCharSrc && <img src={oppCharSrc} alt="" style={{ width: 28, height: 28, objectFit: 'contain', opacity: 0.7 }} onError={e => { e.target.style.display='none'; }} />}
                                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: isWin ? '#22C55E' : '#EF4444' }}>{isWin ? 'VICTORIA' : 'DERROTA'}</p>
                            {myScore != null && <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)' }}>{myScore}–{oppScore ?? 0}</p>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
/* --- TAB AMIGOS ------------------------------------------------ */
function TabAmigos({ user, setNotifs }) {
  const pageVisible = useRef(true);
  useEffect(() => {
    const onVis = () => { pageVisible.current = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const [friendTab, setFriendTab]       = useState('list');
  const [friends, setFriends]           = useState([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [friendResults, setFriendResults] = useState([]);
  const [friendSearching, setFriendSearching] = useState(false);
  const [friendAdding, setFriendAdding] = useState(null);
  const [friendCollapsed, setFriendCollapsed] = useState({ in_match: false, searching: false, online: false, away: false, dnd: false, offline: false });
  const [friendRequests, setFriendRequests] = useState([]);
  const [chatOpen, setChatOpen]         = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState('');
  const [chatSending, setChatSending]   = useState(false);
  const [sentRequests, setSentRequests] = useState([]);
  const [partyState, setPartyState]     = useState(null);
  const [myStatus, setMyStatus]         = useState(() => { try { return localStorage.getItem('afk_my_status') || 'online'; } catch { return 'online'; } });
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [viewProfile, setViewProfile]   = useState(null);
  const [profileData, setProfileData]   = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStartggStats, setProfileStartggStats] = useState(null);
  const [selectedCharAmigos, setSelectedCharAmigos] = useState(null);
  const [showCharsModalAmigos, setShowCharsModalAmigos] = useState(false);
  const [charFromModalAmigos, setCharFromModalAmigos] = useState(false);
  const [history, setHistory]           = useState([]);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'ranked' | 'casual'
  const [viewMatchDetail, setViewMatchDetail] = useState(null);
  const [profileHistFilter, setProfileHistFilter] = useState('all');
  const [profileHistExpanded, setProfileHistExpanded] = useState(false);
  const chatEndRef = useRef(null);

  const uid   = user ? String(user?.id || user?.slug || '') : '';
  const uName = user ? String(user?.player?.gamerTag || user?.name || 'Jugador') : '';

  // Fetch friends, requests, sent, party, history
  useEffect(() => {
    if (!uid) return;
    const uidEnc = encodeURIComponent(uid);
    fetch('/api/friends?userId=' + uidEnc).then(r => r.ok ? r.json() : []).then(d => setFriends(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/friends?userId=' + uidEnc + '&type=requests').then(r => r.ok ? r.json() : []).then(d => setFriendRequests(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/friends?userId=' + uidEnc + '&type=sent').then(r => r.ok ? r.json() : []).then(d => setSentRequests(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/party?userId=' + uidEnc).then(r => r.ok ? r.json() : null).then(d => { if (d && d.status !== 'none') setPartyState(d); }).catch(() => {});
    const playerNameEnc = encodeURIComponent(String(user?.player?.gamerTag || user?.name || ''));
    Promise.all([
      fetch('/api/players/history?userId=' + uidEnc + '&limit=30').then(r => r.json()).catch(() => []),
      playerNameEnc ? fetch('/api/tournament/player-history?name=' + playerNameEnc + '&limit=50').then(r => r.json()).catch(() => []) : Promise.resolve([]),
    ]).then(([h, th]) => {
      const ranked = Array.isArray(h) ? h : [];
      const tournament = Array.isArray(th) ? th : [];
      const merged = [...ranked, ...tournament].sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
      setHistory(merged);
    });
  }, [uid]);

  // Registrar presencia WS y callbacks de tiempo real una vez que tengamos amigos + userId
  useEffect(() => {
    if (!uid) return;
    // Callback: cuando un amigo cambia de estado ? actualizar campo 'online' (que usa la UI)
    setPresenceCallback(({ userId, status }) => {
      setFriends(prev => prev.map(f =>
        String(f.userId) === String(userId) ? { ...f, online: status } : f
      ));
    });
    // Callback: notificación en tiempo real
    setNotificationCallback((notif) => {
      setNotifs(prev => {
        const exists = prev.some(n => n.id === notif.id);
        return exists ? prev : [notif, ...prev].slice(0, 20);
      });
    });
    // Callback: socket reconectó → re-sincronizar estados de amigos desde la API
    // (cubre eventos perdidos durante la desconexión)
    setReconnectCallback(() => {
      fetch('/api/friends?userId=' + encodeURIComponent(uid))
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (Array.isArray(d)) setFriends(d); })
        .catch(() => {});
    });
  }, [uid]);

  // Registrar presencia cuando la lista de amigos cargue
  useEffect(() => {
    if (!uid || friends.length === 0) return;
    const friendIds = friends.map(f => String(f.userId)).filter(Boolean);
    registerPresence(uid, friendIds);
  }, [uid, friends.length]);

  // Refrescar solicitudes pendientes cuando estemos en la tab de amigos (sin polling)
  // El polling agresivo de 8s se reemplaza por un refresh manual al abrir la tab
  // + Los cambios de estado de presencia llegan en tiempo real por WS

  // Load my current status
  useEffect(() => {
    if (!uid) return;
    fetch('/api/heartbeat?userId=' + encodeURIComponent(uid)).then(r => r.ok ? r.json() : null).then(d => { if (d?.status) setMyStatus(d.status); }).catch(() => {});
  }, [uid]);

  const changeStatus = async (newStatus) => {
    setMyStatus(newStatus);
    setShowStatusMenu(false);
    try { localStorage.setItem('afk_my_status', newStatus); } catch {}
    try {
      await fetch('/api/heartbeat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, status: newStatus }) });
    } catch {}
  };

  // Chat polling
  useEffect(() => {
    if (!chatOpen || !uid) return;
    const fetchMsgs = () => {
      if (!pageVisible.current) return;
      fetch('/api/chat?userId=' + encodeURIComponent(uid) + '&friendId=' + encodeURIComponent(chatOpen.userId))
        .then(r => r.ok ? r.json() : { messages: [] }).then(d => setChatMessages(d.messages || [])).catch(() => {});
    };
    fetchMsgs();
    const iv = setInterval(fetchMsgs, 3000);
    return () => clearInterval(iv);
  }, [chatOpen?.userId, uid]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // Search players
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
      const r = await fetch('/api/friends', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, userName: uName, friendId, friendName }) });
      const data = await r.json();
      if (r.ok) {
        if (data.autoAccepted) { setFriends(prev => [...prev, { userId: friendId, userName: friendName, online: 'offline' }]); setFriendRequests(prev => prev.filter(rq => rq.fromId !== friendId)); setSentRequests(prev => prev.filter(s => s.toId !== friendId)); updateFriendList([...friends.map(f => String(f.userId)), String(friendId)]); }
        else if (data.requestSent) { setSentRequests(prev => [...prev, { toId: friendId, toName: friendName, sentAt: new Date().toISOString() }]); }
        setFriendSearch(''); setFriendResults([]);
      } else if (r.status === 409) { setSentRequests(prev => prev.some(s => s.toId === friendId) ? prev : [...prev, { toId: friendId, toName: friendName, sentAt: new Date().toISOString() }]); }
    } catch {}
    setFriendAdding(null);
  };
  const acceptRequest = async (fromId, fromName) => { try { await fetch('/api/friends', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, userName: uName, fromId, action: 'accept' }) }); setFriendRequests(prev => prev.filter(r => r.fromId !== fromId)); setFriends(prev => [...prev, { userId: fromId, userName: fromName, online: 'offline' }]); updateFriendList([...friends.map(f => String(f.userId)), String(fromId)]); } catch {} };
  const rejectRequest = async (fromId) => { try { await fetch('/api/friends', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, userName: uName, fromId, action: 'reject' }) }); setFriendRequests(prev => prev.filter(r => r.fromId !== fromId)); } catch {} };
  const removeFriend = async (friendId) => { try { await fetch('/api/friends', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, friendId }) }); setFriends(prev => prev.filter(f => f.userId !== friendId)); updateFriendList(friends.filter(f => String(f.userId) !== String(friendId)).map(f => String(f.userId))); } catch {} };
  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatSending || !chatOpen) return;
    setChatSending(true); const msg = chatInput.trim(); setChatInput('');
    try { await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, userName: uName, friendId: chatOpen.userId, message: msg }) }); setChatMessages(prev => [...prev, { id: 'm-' + Date.now(), from: uid, fromName: uName, text: msg, sentAt: new Date().toISOString() }]); } catch {}
    setChatSending(false);
  };
  const inviteToDoubles = async (friendId, friendName, platform) => { try { const r = await fetch('/api/party', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid, userName: uName, friendId, friendName, platform }) }); const data = await r.json(); if (data.success) setPartyState({ status: 'pending', partyId: data.partyId, party: data.party }); } catch {} };
  const leaveParty = async () => { try { await fetch('/api/party', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid }) }); setPartyState(null); } catch {} };
  const openProfile = (playerId, playerName) => {
    setViewProfile({ userId: playerId, userName: playerName });
    setProfileData(null);
    setProfileStartggStats(null);
    setSelectedCharAmigos(null);
    setShowCharsModalAmigos(false);
    setCharFromModalAmigos(false);
    setProfileHistFilter('all');
    setProfileHistExpanded(false);
    setProfileLoading(true);
    fetch('/api/players/profile?id=' + encodeURIComponent(playerId) + '&full=true')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setProfileData(d);
        setProfileLoading(false);
        const slug = d?.profile?.slug;
        if (slug) {
          try {
            const stored = JSON.parse(localStorage.getItem('afk_user') || '{}');
            const token = stored.access_token;
            if (token) {
              fetch('/api/players/startgg-stats?slug=' + encodeURIComponent(slug), { headers: { 'Authorization': 'Bearer ' + token } })
                .then(r => r.ok ? r.json() : null)
                .then(sg => { if (sg) setProfileStartggStats(sg); })
                .catch(() => {});
            }
          } catch {}
        }
      })
      .catch(() => setProfileLoading(false));
  };

  // Navegación nativa: pushState al abrir perfil de amigo, popstate para volver
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (viewProfile) {
      window.history.pushState({ friendProfile: viewProfile.userId }, '', window.location.href);
    }
  }, [viewProfile?.userId]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      if (viewProfile) {
        setViewProfile(null);
        setProfileData(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [viewProfile]);

  if (!user || !uid) return null;

  const renderFriendRow = (f, statusColor, statusLabel) => {
    const isOffline = !statusColor;
    return (
    <div key={f.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: isOffline ? 'transparent' : 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div onClick={() => openProfile(f.userId, f.userName)} style={{ width: 38, height: 38, borderRadius: 12, background: statusColor ? `linear-gradient(135deg,${statusColor},${statusColor}88)` : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: statusColor ? '#fff' : 'rgba(255,255,255,0.4)', flexShrink: 0, position: 'relative', cursor: 'pointer' }}>
        {(f.userName || '?').charAt(0).toUpperCase()}
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: '50%', background: statusColor || '#555', border: '2.5px solid #0D0D15', boxShadow: statusColor ? `0 0 6px ${statusColor}` : 'none' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => openProfile(f.userId, f.userName)}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: isOffline ? 'rgba(255,255,255,0.45)' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
          {f.country && <FlagImg cc={f.country} size={14} />}
          {f.userName}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: statusColor || 'rgba(255,255,255,0.25)', fontWeight: 700 }}>{statusLabel}</span>
          {f.placementDone && f.rank ? <RankBadge rankName={f.rank} /> : <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>Unranked</span>}
        </div>
      </div>
      <button onClick={() => { setChatOpen({ userId: f.userId, userName: f.userName }); setChatMessages([]); }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.12)', color: '#818CF8', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>💬</span><span style={{ fontSize: 10 }}>Chat</span>
      </button>
      <button onClick={() => removeFriend(f.userId)} style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.06)', color: 'rgba(239,68,68,0.5)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✕</button>
    </div>
    );
  };

  const renderGroup = (label, icon, color, items, groupKey) => {
    if (items.length === 0) return null;
    const statusMap = { in_match: { color: '#34D399', label: 'En partida' }, searching: { color: '#FBBF24', label: 'Buscando…' }, online: { color: '#22C55E', label: 'En línea' }, away: { color: '#F59E0B', label: 'Ausente' }, dnd: { color: '#EF4444', label: 'No molestar' }, offline: { color: null, label: 'Desconectado' } };
    const s = statusMap[groupKey] || statusMap.offline;
    return (
      <div>
        <button onClick={() => setFriendCollapsed(p => ({ ...p, [groupKey]: !p[groupKey] }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: color ? `${color}0D` : 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color || '#555', boxShadow: color ? `0 0 6px ${color}` : 'none', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: color || 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1, textAlign: 'left' }}>{label} ({items.length})</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', transform: friendCollapsed[groupKey] ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>▾</span>
        </button>
        {!friendCollapsed[groupKey] && items.map(f => renderFriendRow(f, s.color, s.label))}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ padding: '20px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#6366F1,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 22 }}>👥</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff' }}>Amigos</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {friends.length} amigo{friends.length !== 1 ? 's' : ''}
              {friends.filter(f => f.online && f.online !== 'offline').length > 0 && (
                <span style={{ color: '#22C55E', fontWeight: 700 }}> · {friends.filter(f => f.online && f.online !== 'offline').length} en línea</span>
              )}
            </p>
          </div>
          {/* My status selector */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowStatusMenu(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: myStatus === 'online' ? '#22C55E' : myStatus === 'away' ? '#F59E0B' : myStatus === 'dnd' ? '#EF4444' : '#555', boxShadow: `0 0 4px ${myStatus === 'online' ? '#22C55E' : myStatus === 'away' ? '#F59E0B' : myStatus === 'dnd' ? '#EF4444' : 'transparent'}` }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                {myStatus === 'online' ? 'En línea' : myStatus === 'away' ? 'Ausente' : myStatus === 'dnd' ? 'No molestar' : 'Invisible'}
              </span>
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>▾</span>
            </button>
            {showStatusMenu && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, overflow: 'hidden', zIndex: 50, minWidth: 150, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                {[
                  { key: 'online', color: '#22C55E', label: 'En línea', icon: '🟢' },
                  { key: 'away', color: '#F59E0B', label: 'Ausente', icon: '🌙' },
                  { key: 'dnd', color: '#EF4444', label: 'No molestar', icon: '🔕' },
                  { key: 'invisible', color: '#555', label: 'Invisible', icon: '👻' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => changeStatus(opt.key)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)', background: myStatus === opt.key ? 'rgba(255,255,255,0.06)' : 'transparent', cursor: 'pointer' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, boxShadow: opt.color !== '#555' ? `0 0 4px ${opt.color}` : 'none' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: myStatus === opt.key ? '#fff' : 'rgba(255,255,255,0.5)' }}>{opt.label}</span>
                    {myStatus === opt.key && <span style={{ marginLeft: 'auto', fontSize: 10, color: opt.color }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Party estado */}
      {partyState && partyState.status !== 'none' && (
        <div style={{ margin: '0 18px 12px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
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

      <div style={{ margin: '0 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden' }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
          <button onClick={() => { setFriendTab('list'); setFriendSearch(''); }}  style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderBottom: friendTab === 'list' ? '2px solid #6366F1' : '2px solid transparent', transition: 'all 0.15s' }}>
            <span style={{ fontSize: 14 }}>👥</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: friendTab === 'list' ? '#fff' : 'rgba(255,255,255,0.35)' }}>Lista</span>
          </button>
          <button onClick={() => { setFriendTab('requests'); setFriendSearch(''); }} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderBottom: friendTab === 'requests' ? '2px solid #FF8C00' : '2px solid transparent', transition: 'all 0.15s', position: 'relative' }}>
            <span style={{ fontSize: 14 }}>📩</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: friendTab === 'requests' ? '#fff' : 'rgba(255,255,255,0.35)' }}>Solicitudes</span>
            {friendRequests.length > 0 && (
              <span style={{ position: 'absolute', top: 4, right: '10%', minWidth: 18, height: 18, borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', boxShadow: '0 0 8px rgba(239,68,68,0.4)' }}>{friendRequests.length}</span>
            )}
          </button>
          <button onClick={() => { setFriendTab('add'); setFriendSearch(''); }} style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderBottom: friendTab === 'add' ? '2px solid #22C55E' : '2px solid transparent', transition: 'all 0.15s' }}>
            <span style={{ fontSize: 14 }}>➕</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: friendTab === 'add' ? '#fff' : 'rgba(255,255,255,0.35)' }}>Agregar</span>
          </button>
        </div>

        {friendTab === 'list' ? (
          <div>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 12px' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>🔍</span>
                <input value={friendSearch} onChange={e => setFriendSearch(e.target.value)} placeholder="Buscar amigo…" maxLength={50} style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 12, outline: 'none' }} />
              </div>
            </div>
            {friends.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#6366F1,#818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>👥</div>
                <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Sin amigos aún</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Tocá <b style={{ color: '#22C55E' }}>➕ Agregar</b> para buscar jugadores</p>
              </div>
            ) : (
              <div>
                {(() => {
                  const q = friendSearch.trim().toLowerCase();
                  const filtered = q ? friends.filter(f => (f.userName || '').toLowerCase().includes(q)) : friends;
                  if (filtered.length === 0 && q) return (
                    <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>No se encontraron amigos con ese nombre</p>
                    </div>
                  );
                  return (<>
                    {renderGroup('En partida', '⚔️', '#34D399', filtered.filter(f => f.online === 'in_match'), 'in_match')}
                    {renderGroup('Buscando', '🔍', '#FBBF24', filtered.filter(f => f.online === 'searching'), 'searching')}
                    {renderGroup('En línea', '🟢', '#22C55E', filtered.filter(f => f.online === 'online'), 'online')}
                    {renderGroup('Ausente', '🌙', '#F59E0B', filtered.filter(f => f.online === 'away'), 'away')}
                    {renderGroup('No molestar', '🔕', '#EF4444', filtered.filter(f => f.online === 'dnd'), 'dnd')}
                    {renderGroup('Desconectado', '💤', null, filtered.filter(f => !f.online || f.online === 'offline'), 'offline')}
                  </>);
                })()}
              </div>
            )}
          </div>
        ) : friendTab === 'requests' ? (
          <div>
            {friendRequests.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#FF8C00,#F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 24 }}>📩</div>
                <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Sin solicitudes</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Las solicitudes de amistad aparecen acá</p>
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
                    <button onClick={() => acceptRequest(rq.fromId, rq.fromName)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.15)', color: '#34D399', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>✓ Aceptar</button>
                    <button onClick={() => rejectRequest(rq.fromId)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ padding: '12px' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 12, padding: '10px 12px' }}>
                  <span style={{ fontSize: 13, color: '#22C55E' }}>🔍</span>
                  <input value={friendSearch} onChange={e => setFriendSearch(e.target.value)} placeholder="Nombre de jugador…" maxLength={50} style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', fontSize: 12, outline: 'none' }} />
                </div>
                {friendSearch.length >= 2 && (
                  <button onClick={() => { setFriendSearch(''); setFriendResults([]); }} style={{ padding: '0 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>✕</button>
                )}
              </div>
            </div>
            {friendSearching ? (
              <div style={{ padding: '20px 16px', textAlign: 'center' }}><p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Buscando…</p></div>
            ) : friendResults.length > 0 ? (
              <div>
                {friendResults.map(p => {
                  const alreadyFriend = friends.find(f => f.userId === p.userId);
                  const alreadySent = sentRequests.find(s => s.toId === p.userId);
                  return (
                    <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div onClick={() => openProfile(p.userId, p.userName)} style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0, cursor: 'pointer' }}>{(p.userName || '?').charAt(0).toUpperCase()}</div>
                      <p onClick={() => openProfile(p.userId, p.userName)} style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{p.userName}</p>
                      {alreadyFriend ? (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', padding: '4px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>Ya agregado</span>
                      ) : alreadySent ? (
                        <span style={{ fontSize: 10, color: '#F59E0B', padding: '4px 10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontWeight: 700 }}>Pendiente</span>
                      ) : (
                        <button onClick={() => addFriend(p.userId, p.userName)} disabled={friendAdding === p.userId} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)', color: '#34D399', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>{friendAdding === p.userId ? '…' : '📩 Solicitud'}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : friendSearch.length >= 2 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}><p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>No se encontraron jugadores</p></div>
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Escribí un nombre para buscar</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>Mínimo 2 caracteres</p>
              </div>
            )}
            {sentRequests.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
                <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12 }}>📤</span>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Solicitudes enviadas</p>
                </div>
                {sentRequests.map(sr => (
                  <div key={sr.toId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div onClick={() => openProfile(sr.toId, sr.toName)} style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#F59E0B,#D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0, cursor: 'pointer' }}>{(sr.toName || '?').charAt(0).toUpperCase()}</div>
                    <p onClick={() => openProfile(sr.toId, sr.toName)} style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{sr.toName}</p>
                    <span style={{ fontSize: 10, color: '#F59E0B', padding: '4px 10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontWeight: 700 }}>Pendiente</span>
                  </div>
                ))}
              </div>
            )}
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
                      <div onClick={() => openProfile(rp.id, rp.name)} style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0, cursor: 'pointer' }}>{(rp.name || '?').charAt(0).toUpperCase()}</div>
                      <p onClick={() => openProfile(rp.id, rp.name)} style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{rp.name}</p>
                      {sentIds.has(rp.id) ? (
                        <span style={{ fontSize: 10, color: '#F59E0B', padding: '4px 10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontWeight: 700 }}>Pendiente</span>
                      ) : (
                        <button onClick={() => addFriend(rp.id, rp.name)} disabled={friendAdding === rp.id} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)', color: '#34D399', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>{friendAdding === rp.id ? '…' : '📩 Solicitud'}</button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* --- CHAT ENTRE AMIGOS --- */}
      {chatOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 9998, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#0D0D15' }}>
            <button onClick={() => setChatOpen(null)} style={{ background: 'none', border: 'none', color: '#FF8C00', fontSize: 18, cursor: 'pointer', padding: 4, flexShrink: 0 }}>←</button>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg,#6366F1,#4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff' }}>{(chatOpen.userName || '?').charAt(0).toUpperCase()}</div>
              {(() => { const cf = friends.find(f => f.userId === chatOpen.userId); if (!cf) return null; const c = cf.online === 'in_match' ? '#34D399' : cf.online === 'searching' ? '#FBBF24' : 'rgba(255,255,255,0.15)'; return <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: c, border: '2px solid #0D0D15' }} />; })()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chatOpen.userName}</p>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Chat privado</p>
            </div>
            {!partyState && (
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {['switch', 'parsec'].map(plat => (
                  <button key={plat} onClick={() => inviteToDoubles(chatOpen.userId, chatOpen.userName, plat)} style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.1)', color: '#A78BFA', fontWeight: 700, fontSize: 8, cursor: 'pointer', textTransform: 'uppercase', lineHeight: 1.2 }}>🎮 2v2<br/>{plat === 'switch' ? 'SW' : 'PC'}</button>
                ))}
              </div>
            )}
          </div>
          {partyState && (
            <div style={{ padding: '8px 18px', background: 'rgba(124,58,237,0.08)', borderBottom: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14 }}>👥</span>
              <p style={{ margin: 0, flex: 1, fontSize: 12, color: '#A78BFA', fontWeight: 700 }}>Party {partyState.status === 'pending' ? '(esperando respuesta)' : partyState.status === 'ready' ? '✅ Listo' : partyState.status === 'searching' ? '🔍 Buscando…' : partyState.status}</p>
              <button onClick={leaveParty} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>Salir</button>
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chatMessages.length === 0 && (<p style={{ margin: 'auto', fontSize: 13, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '40px 0' }}>No hay mensajes aún. ¡Escribí algo!</p>)}
            {chatMessages.map(m => { const isMe = m.from === uid; return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                {!isMe && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>{m.fromName}</span>}
                <div style={{ maxWidth: '80%', background: isMe ? 'rgba(232,142,0,0.18)' : 'rgba(255,255,255,0.06)', border: '1px solid ' + (isMe ? 'rgba(232,142,0,0.25)' : 'rgba(255,255,255,0.08)'), borderRadius: 14, padding: '8px 12px' }}>
                  <p style={{ margin: 0, fontSize: 14, color: '#fff', wordBreak: 'break-word' }}>{m.text}</p>
                </div>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', marginTop: 2 }}>{new Date(m.sentAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ); })}
            <div ref={chatEndRef} />
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0D0D15' }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()} placeholder="Escribí un mensaje…" maxLength={500} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }} />
            <button onClick={sendChatMessage} disabled={!chatInput.trim() || chatSending} style={{ background: 'rgba(232,142,0,0.15)', border: '1px solid rgba(232,142,0,0.3)', borderRadius: 12, padding: '0 16px', color: '#FF8C00', fontWeight: 700, cursor: 'pointer', fontSize: 20 }}>➤</button>
          </div>
        </div>
      )}

      {viewMatchDetail && <MatchDetail match={viewMatchDetail.match} viewingId={viewMatchDetail.viewingId} onClose={() => setViewMatchDetail(null)} onBack={viewMatchDetail.onBack} onViewOpponent={(id, name) => { setViewMatchDetail(null); openProfile(id, name); }} />}

      {/* --- MODAL PERFIL JUGADOR --- */}
      {viewProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0B0B12', zIndex: 9999, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'rgba(11,11,18,0.95)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setViewProfile(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={18} height={18}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            </button>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 16, flex: 1 }}>{viewProfile.userName}</p>
            {(() => { const fe = friends.find(f => f.userId === viewProfile.userId); if (fe) { const st = fe.online === 'in_match' ? 'En partida' : fe.online === 'searching' ? 'Buscando…' : ''; const sc = fe.online === 'in_match' ? '#34D399' : fe.online === 'searching' ? '#FBBF24' : null; if (sc) return <span style={{ fontSize: 10, fontWeight: 700, color: sc }}>? {st}</span>; } return null; })()}
            {!friends.find(f => f.userId === viewProfile.userId) && viewProfile.userId !== uid && (
              <button onClick={() => addFriend(viewProfile.userId, viewProfile.userName)} disabled={friendAdding === viewProfile.userId} style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.1)', color: '#34D399', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>{friendAdding === viewProfile.userId ? '…' : '📩 Agregar'}</button>
            )}
          </div>
          {profileLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Cargando perfil…</p>
            </div>
          ) : profileData ? (
            <div style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
              {/* Hero banner */}
              {(() => {
                const heroCharSrc = (() => {
                  if (profileData.profile?.mainCharAlt) return profileData.profile.mainCharAlt;
                  const mc = profileData.profile?.mainChar;
                  if (mc && CHARACTER_RENDERS[mc]) return charRenderPath(CHARACTER_RENDERS[mc]);
                  const hist = profileData.history || [];
                  if (hist.length) {
                    const counts = {};
                    for (const m of hist) {
                      const cid = String(m.winnerId) === String(viewProfile.userId) ? m.winnerCharId : m.loserCharId;
                      if (cid) counts[cid] = (counts[cid] || 0) + 1;
                    }
                    let best = null, max = 0;
                    for (const [id, c] of Object.entries(counts)) { if (c > max) { max = c; best = id; } }
                    if (best && CHARACTER_RENDERS[best]) return charRenderPath(CHARACTER_RENDERS[best]);
                  }
                  const rc = profileData.recentChars?.[0];
                  if (rc && CHARACTER_RENDERS[rc]) return charRenderPath(CHARACTER_RENDERS[rc]);
                  return null;
                })();
                return (
                  <div style={{ position: 'relative', background: '#1a1a1a', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10 }}>
                    {heroCharSrc ? (
                      <img src={heroCharSrc} alt="" style={{ display: 'block', height: 180, objectFit: 'contain', position: 'relative', zIndex: 1 }} onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ height: 100 }} />
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, #1a1a1a, transparent)', zIndex: 2, pointerEvents: 'none' }} />
                    <p style={{ margin: 0, padding: '8px 18px 16px', fontSize: 26, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', textAlign: 'center', lineHeight: 1, position: 'relative', zIndex: 3 }}>{viewProfile.userName}</p>
                  </div>
                );
              })()}

              <div style={{ padding: '0 18px 40px' }}>
                {/* Estadísticas */}
                {(() => {
                  const sw1 = profileData.stats?.switch || {}; const pc1 = profileData.stats?.parsec || {};
                  const sw2 = profileData.doublesStats?.switch || {}; const pc2 = profileData.doublesStats?.parsec || {};
                  const tW = (sw1.wins||0)+(pc1.wins||0)+(sw2.wins||0)+(pc2.wins||0);
                  const tL = (sw1.losses||0)+(pc1.losses||0)+(sw2.losses||0)+(pc2.losses||0);
                  const tT = tW+tL; const wr = tT > 0 ? Math.round((tW/tT)*100) : 0;
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '22px 0 12px' }}>
                        <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#22C55E,#16A34A)', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Estadísticas</p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                        {[
                          { label: 'Victorias', value: tW, color: '#22C55E' },
                          { label: 'Derrotas', value: tL, color: '#EF4444' },
                          { label: 'Partidas', value: tT, color: '#fff' },
                          { label: 'W/R', value: wr + '%', color: '#F59E0B' },
                        ].map(st => (
                          <div key={st.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: st.color }}>{st.value}</p>
                            <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{st.label}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}

                {/* Resumen Start.GG */}
                {profileStartggStats && profileStartggStats.charUsage && profileStartggStats.charUsage.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#F5C518,#D4A017)', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>🏆 Resumen</p>
                      </div>
                      <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>Start.GG · {profileStartggStats.totalSets} sets</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
                      {profileStartggStats.charUsage.slice(0, 3).map((ch, i) => {
                        const localId = ch.localCharId;
                        const charObj = localId ? CHARACTERS.find(c => c.id === localId) : null;
                        const renderFile = localId ? CHARACTER_RENDERS[localId] : null;
                        const isTop = i === 0;
                        const charWR = ch.games > 0 ? Math.round(ch.wins * 100 / ch.games) : 0;
                        const barColors = ['#F5C518', '#818CF8', '#22C55E', '#F97316', '#EF4444'];
                        const barColor = barColors[i % barColors.length];
                        return (
                          <div key={ch.startggCharId} onClick={() => setSelectedCharAmigos(ch.startggCharId)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isTop ? '10px 14px 10px 6px' : '9px 14px', borderBottom: i < Math.min(profileStartggStats.charUsage.length, 3) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', background: isTop ? 'linear-gradient(90deg,rgba(245,197,24,0.10),transparent)' : 'transparent', cursor: 'pointer', transition: 'background 0.2s' }}>
                            {renderFile ? (
                              <img src={charRenderPath(renderFile)} alt="" style={{ width: isTop ? 52 : 36, height: isTop ? 52 : 36, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                            ) : charObj ? (
                              <img src={charImgPath(charObj.img)} alt="" style={{ width: isTop ? 44 : 32, height: isTop ? 44 : 32, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                            ) : (
                              <div style={{ width: isTop ? 44 : 32, height: isTop ? 44 : 32, flexShrink: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>?</span>
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <p style={{ margin: 0, fontSize: isTop ? 13 : 11, fontWeight: 700, color: isTop ? '#fff' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {charObj?.name || ch.charName || `#${ch.startggCharId}`}
                                </p>
                                <p style={{ margin: 0, fontSize: isTop ? 15 : 12, fontWeight: 900, color: barColor, flexShrink: 0, marginLeft: 8 }}>{ch.usage}%</p>
                              </div>
                              <div style={{ height: isTop ? 6 : 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: ch.usage + '%', height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                                <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{ch.games} games</p>
                                <p style={{ margin: 0, fontSize: 9, color: charWR >= 50 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)', fontWeight: 700 }}>{charWR}% WR ({ch.wins}W-{ch.games - ch.wins}L)</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Detalle de personaje seleccionado */}
                    {selectedCharAmigos && (() => {
                      const ch = profileStartggStats.charUsage.find(c => c.startggCharId === selectedCharAmigos);
                      return ch ? <CharacterDetail ch={ch} onClose={() => { setSelectedCharAmigos(null); setCharFromModalAmigos(false); }} onBack={charFromModalAmigos ? () => { setSelectedCharAmigos(null); setShowCharsModalAmigos(true); } : undefined} /> : null;
                    })()}

                    {/* Botón Ver todos */}
                    {profileStartggStats.charUsage.length > 3 && (
                      <button onClick={() => setShowCharsModalAmigos(true)} style={{ width: '100%', padding: '8px', marginTop: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Ver todos ({profileStartggStats.charUsage.length})
                      </button>
                    )}

                    {/* Modal ver todos chars */}
                    {showCharsModalAmigos && (
                      <div onClick={() => setShowCharsModalAmigos(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '80vh', background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'slideUp .25s ease-out' }}>
                          <div onClick={() => setShowCharsModalAmigos(false)} onTouchStart={e => { e.currentTarget.dataset.ty = e.touches[0].clientY; }} onTouchEnd={e => { if (e.changedTouches[0].clientY - Number(e.currentTarget.dataset.ty||0) > 30) setShowCharsModalAmigos(false); }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 0', cursor: 'pointer', userSelect: 'none' }}>
                            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.22)' }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>Todos los personajes</p>
                            <button onClick={() => setShowCharsModalAmigos(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
                          </div>
                          <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            {profileStartggStats.charUsage.map((ch, i) => {
                              const localId = ch.localCharId;
                              const charObj = localId ? CHARACTERS.find(c => c.id === localId) : null;
                              const renderFile = localId ? CHARACTER_RENDERS[localId] : null;
                              const cWR = ch.games > 0 ? Math.round(ch.wins * 100 / ch.games) : 0;
                              const barColor = ['#F5C518','#818CF8','#22C55E','#F97316','#EF4444'][i % 5];
                              return (
                                <div key={ch.startggCharId} onClick={() => { setShowCharsModalAmigos(false); setCharFromModalAmigos(true); setSelectedCharAmigos(ch.startggCharId); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                                  {renderFile ? <img src={charRenderPath(renderFile)} alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                                    : charObj ? <img src={charImgPath(charObj.img)} alt="" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                                    : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{charObj?.name || ch.charName}</p>
                                      <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: barColor, flexShrink: 0, marginLeft: 8 }}>{ch.usage}%</p>
                                    </div>
                                    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                                      <div style={{ width: ch.usage + '%', height: '100%', background: barColor, borderRadius: 2 }} />
                                    </div>
                                    <p style={{ margin: '2px 0 0', fontSize: 9, color: cWR >= 50 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)', fontWeight: 700 }}>{ch.games}g · {cWR}% WR</p>
                                  </div>
                                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>›</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stats cards */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      {[
                        { label: 'Win Rate', value: profileStartggStats.winRate + '%', color: '#F5C518' },
                        { label: 'Ganados',  value: profileStartggStats.wins,          color: '#22C55E' },
                        { label: 'Perdidos', value: profileStartggStats.losses,        color: '#EF4444' },
                        { label: 'Torneos',  value: profileStartggStats.tournaments,   color: '#818CF8' },
                      ].map(st => (
                        <div key={st.label} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: st.color }}>{st.value}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700 }}>{st.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Stages */}
                    {profileStartggStats.stageUsage && profileStartggStats.stageUsage.length > 0 && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
                          <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#818CF8,#6366F1)', flexShrink: 0 }} />
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Stages</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                          {profileStartggStats.stageUsage.slice(0, 3).map((st, idx) => (
                            <div key={st.stageId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
                              {st.image && <img src={st.image} alt="" style={{ width: '100%', height: 55, objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />}
                              {!st.image && <div style={{ width: '100%', height: 55, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '0 4px' }}>{st.name}</span></div>}
                              <div style={{ padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>#{idx + 1}</span>
                                <span style={{ fontSize: 11, fontWeight: 900, color: '#fff' }}>{st.usage}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Highlights */}
                    {profileStartggStats.highlights && profileStartggStats.highlights.length > 0 && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
                          <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#F97316,#EA580C)', flexShrink: 0 }} />
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Highlights</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                          {profileStartggStats.highlights.slice(0, 9).map((h, hi) => {
                            const isTop3 = h.placement <= 3;
                            const placementColor = h.placement === 1 ? '#F5C518' : h.placement === 2 ? '#C0C0C0' : h.placement === 3 ? '#CD7F32' : '#fff';
                            return (
                              <div key={hi} onClick={() => h.eventSlug && window.open(h.eventSlug, '_blank')} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isTop3 ? 'rgba(245,197,24,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '8px', cursor: h.eventSlug ? 'pointer' : 'default', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                                  {h.tournamentImage && <img src={h.tournamentImage} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />}
                                  <p style={{ margin: 0, fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{h.tournament}</p>
                                </div>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: placementColor }}>
                                  {h.placement}<sup style={{ fontSize: 8 }}>{h.placement === 1 ? 'ST' : h.placement === 2 ? 'ND' : h.placement === 3 ? 'RD' : 'TH'}</sup>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>/{h.entrants}</span>
                                </p>
                                <p style={{ margin: '2px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>
                                  {h.date ? new Date(h.date).toLocaleDateString('es', { month: 'short', day: 'numeric', year: '2-digit' }) : ''}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                  </div>
                )}

                {/* Ranked 1v1 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
                  <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#FF8C00,#E85D00)', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>⚔️ Ranked</p>
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  {['switch', 'parsec'].map(plat => {
                    const s = profileData.stats?.[plat] || {};
                    const wins = s.wins || 0; const losses = s.losses || 0; const total = wins + losses;
                    const rankName = s.rank || 'Plástico I';
                    const isUnranked = total === 0; const inPlacement = !s?.placementDone && !isUnranked;
                    const rankObj = RANKS.find(r => r.name === rankName) || RANKS[0];
                    const tierIcon = rankObj ? (TIER_ICONS[rankObj.tier] || '??') : '?';
                    const rankColor = rankObj?.color || '#9CA3AF';
                    const pColor = plat === 'switch' ? '#EF4444' : '#8B5CF6';
                    return (
                      <div key={plat} style={{ flex: 1, background: isUnranked ? 'rgba(255,255,255,0.03)' : inPlacement ? 'rgba(255,140,0,0.04)' : `linear-gradient(135deg, ${rankColor}14 0%, transparent 65%)`, border: `1px solid ${isUnranked ? 'rgba(255,255,255,0.07)' : inPlacement ? 'rgba(255,140,0,0.2)' : rankColor + '35'}`, borderRadius: 20, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: pColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{plat === 'switch' ? '🎮 Switch' : '🖥️ Parsec'}</p>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: (isUnranked || inPlacement) ? 'rgba(255,255,255,0.05)' : `${rankColor}18`, border: `2px solid ${(isUnranked || inPlacement) ? 'rgba(255,255,255,0.1)' : rankColor + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                          {(isUnranked || inPlacement) ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 20 }}>?</span> : tierIcon}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: isUnranked ? 'rgba(255,255,255,0.2)' : inPlacement ? '#FF8C00' : rankColor }}>
                          {isUnranked ? 'UNRANKED' : inPlacement ? 'POSICIONAMIENTO' : rankName}
                        </p>
                        {inPlacement && (
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: '80%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <div style={{ width: `${(total / PLACEMENT_TOTAL) * 100}%`, height: '100%', borderRadius: 2, background: '#FF8C00' }} />
                            </div>
                            <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: '#FF8C00' }}>{total}/{PLACEMENT_TOTAL}</p>
                          </div>
                        )}
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{wins}W · {losses}L</p>
                      </div>
                    );
                  })}
                </div>

                {/* Ranked 2v2 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
                  <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#A78BFA,#7C3AED)', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>👥 Ranked 2v2</p>
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  {['switch', 'parsec'].map(plat => {
                    const s = profileData.doublesStats?.[plat] || {};
                    const wins = s.wins || 0; const losses = s.losses || 0; const total = wins + losses;
                    const rankName = s.rank || 'Plástico I';
                    const isUnranked = total === 0; const inPlacement = !s?.placementDone && !isUnranked;
                    const rankObj = RANKS.find(r => r.name === rankName) || RANKS[0];
                    const tierIcon = rankObj ? (TIER_ICONS[rankObj.tier] || '??') : '?';
                    const rankColor = rankObj?.color || '#9CA3AF';
                    return (
                      <div key={plat} style={{ flex: 1, background: isUnranked ? 'rgba(255,255,255,0.03)' : inPlacement ? 'rgba(124,58,237,0.04)' : `linear-gradient(135deg, ${rankColor}14 0%, transparent 65%)`, border: `1px solid ${isUnranked ? 'rgba(255,255,255,0.07)' : inPlacement ? 'rgba(124,58,237,0.2)' : rankColor + '35'}`, borderRadius: 20, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: plat === 'switch' ? '#EF4444' : '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>2V2 {plat === 'switch' ? '🎮 Switch' : '🖥️ Parsec'}</p>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: (isUnranked || inPlacement) ? 'rgba(255,255,255,0.05)' : `${rankColor}18`, border: `2px solid ${(isUnranked || inPlacement) ? 'rgba(255,255,255,0.1)' : rankColor + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                          {(isUnranked || inPlacement) ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 20 }}>?</span> : tierIcon}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: isUnranked ? 'rgba(255,255,255,0.2)' : inPlacement ? '#A78BFA' : rankColor }}>
                          {isUnranked ? 'UNRANKED' : inPlacement ? 'POSICIONAMIENTO' : rankName}
                        </p>
                        {inPlacement && (
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: '80%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <div style={{ width: `${(total / PLACEMENT_TOTAL) * 100}%`, height: '100%', borderRadius: 2, background: '#7C3AED' }} />
                            </div>
                            <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: '#A78BFA' }}>{total}/{PLACEMENT_TOTAL}</p>
                          </div>
                        )}
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{wins}W · {losses}L</p>
                      </div>
                    );
                  })}
                </div>

                {/* Historial */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px' }}>
                  <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#FF8C00,#E85D00)', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>📋 Historial</p>
                </div>
                <ProfileHistorySection
                  history={profileData.history || []}
                  histFilter={profileHistFilter}
                  setHistFilter={setProfileHistFilter}
                  histExpanded={profileHistExpanded}
                  setHistExpanded={setProfileHistExpanded}
                  viewedUserId={viewProfile.userId}
                  setViewMatchDetail={setViewMatchDetail}
                  rankStats={profileData.stats}
                />
              </div>
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
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all' | 'ranked' | 'casual' | community-id
  const [histExpanded, setHistExpanded] = useState(false);
  const [showHistAllModal, setShowHistAllModal] = useState(false);
  const [profileHistFilter, setProfileHistFilter] = useState('all');
  const [profileHistExpanded, setProfileHistExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRanks, setShowRanks]       = useState(false);
  const [partyState, setPartyState]     = useState(null);
  const [doublesStats, setDoublesStats] = useState(null);
  const [recentChars, setRecentChars] = useState([]);
  const [startggStats, setStartggStats] = useState(null);
  const [showAllChars, setShowAllChars] = useState(false);
  const [showCharsModal, setShowCharsModal] = useState(false);
  const [selectedChar, setSelectedChar] = useState(null);
  const [charFromModal, setCharFromModal] = useState(false);
  const [viewProfile, setViewProfile]   = useState(null);
  const [profileData, setProfileData]   = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileStartggStats, setProfileStartggStats] = useState(null);
  const [viewMatchDetail, setViewMatchDetail] = useState(null);
  const [mainChar, setMainChar]         = useState(null);
  const [mainCharAlt, setMainCharAlt]   = useState(null);
  const [showMainPicker, setShowMainPicker] = useState(false);
  const [pickerStep, setPickerStep]     = useState('char');

  const uid   = user ? String(user?.id || user?.slug || '') : '';
  const uName = user ? String(user?.player?.gamerTag || user?.name || 'Jugador') : '';

  useEffect(() => {
    if (!user) return;
    const uidEnc = encodeURIComponent(String(user.id || user.slug || ''));
    const playerName = encodeURIComponent(String(user?.player?.gamerTag || user?.name || ''));
    Promise.all([
      fetch('/api/players/stats?userId=' + uidEnc).then(r => r.json()).catch(() => null),
      fetch('/api/players/history?userId=' + uidEnc + '&limit=30').then(r => r.json()).catch(() => []),
      fetch('/api/matchmaking/recent-chars?userId=' + uidEnc).then(r => r.json()).catch(() => []),
      playerName ? fetch('/api/tournament/player-history?name=' + playerName + '&limit=50').then(r => r.json()).catch(() => []) : Promise.resolve([]),
    ]).then(([s, h, chars, th]) => {
      const ranked = Array.isArray(h) ? h : [];
      const tournament = Array.isArray(th) ? th : [];
      // Merge y ordenar por fecha desc
      const merged = [...ranked, ...tournament].sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt));
      setStats(s); setHistory(merged); setRecentChars(Array.isArray(chars) ? chars : []); setLoading(false);
    });

    // Fetch Start.GG stats
    try {
      const stored = JSON.parse(localStorage.getItem('afk_user') || '{}');
      const token = stored.access_token;
      const slug = stored.user?.slug;
      if (token && slug) {
        fetch('/api/players/startgg-stats?slug=' + encodeURIComponent(slug), {
          headers: { 'Authorization': 'Bearer ' + token },
        }).then(r => {
          if (!r.ok) return r.json().catch(() => null).then(e => { console.warn('[StartGG]', r.status, e); return null; });
          return r.json();
        }).then(d => { if (d) {
          setStartggStats(d);
        } }).catch(() => {});
      }
    } catch (e) {}

    // Load mainChar from Redis profile (fuente de verdad)
    const uid2 = String(user?.id || user?.slug || '');
    if (uid2) {
      fetch('/api/players/profile?id=' + encodeURIComponent(uid2))
        .then(r => r.ok ? r.json() : null)
        .then(p => {
          if (p?.mainChar) { setMainChar(p.mainChar); try { localStorage.setItem('afk_main_char', p.mainChar); } catch {} }
          else { setMainChar(null); try { localStorage.removeItem('afk_main_char'); } catch {} }
          if (p?.mainCharAlt) { setMainCharAlt(p.mainCharAlt); try { localStorage.setItem('afk_main_alt', p.mainCharAlt); } catch {} }
          else { setMainCharAlt(null); try { localStorage.removeItem('afk_main_alt'); } catch {} }
          // Banner de actualización de ícono: solo iOS standalone que aún no lo cerró
          if (!p?.dismissedIconBanner && typeof window !== 'undefined') {
            const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
            const isStandalone = window.navigator.standalone === true
              || window.matchMedia('(display-mode: standalone)').matches;
            if (isIOS && isStandalone) setShowIconUpdateBanner(true);
          }
        }).catch(() => {});
    }
  }, [user?.id]);

  // Fetch friends
  useEffect(() => {
    if (!uid) return;
    // Fetch party state
    fetch('/api/party?userId=' + encodeURIComponent(uid))
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.status !== 'none') setPartyState(d); })
      .catch(() => {});
  }, [uid]);

  // Fetch 2v2 stats
  useEffect(() => {
    if (!user) return;
    const uidEnc = encodeURIComponent(String(user.id || user.slug || ''));
    Promise.all([
      fetch('/api/players/stats?userId=' + uidEnc + '&mode=doubles').then(r => r.json()).catch(() => null),
    ]).then(([dStats]) => { setDoublesStats(dStats); });
  }, [user?.id]);

  const openProfile = (playerId, playerName) => {
    setViewProfile({ userId: playerId, userName: playerName });
    setProfileData(null);
    setProfileLoading(true);
    setProfileStartggStats(null);
    setProfileHistFilter('all');
    setProfileHistExpanded(false);
    fetch('/api/players/profile?id=' + encodeURIComponent(playerId) + '&full=true')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setProfileData(d);
        setProfileLoading(false);
        // Fetch Start.GG stats for this profile player
        if (d?.profile?.slug) {
          fetch('/api/players/startgg-stats?slug=' + encodeURIComponent(d.profile.slug))
            .then(r => r.ok ? r.json() : null)
            .then(sg => { if (sg) setProfileStartggStats(sg); })
            .catch(() => {});
        }
      })
      .catch(() => setProfileLoading(false));
  };

  if (!user) return null;
  const displayName = user.name || user.slug || 'Jugador';
  const initial     = displayName.charAt(0).toUpperCase();
  const totalW = (stats?.switch?.wins || 0)   + (stats?.parsec?.wins || 0);
  const totalL = (stats?.switch?.losses || 0) + (stats?.parsec?.losses || 0);

  // Calcular personaje más usado del historial
  const mostUsedChar = (() => {
    if (!history.length) return null;
    const counts = {};
    for (const m of history) {
      const charId = m.winnerId === String(user.id || user.slug) ? m.winnerCharId : m.loserCharId;
      if (charId) counts[charId] = (counts[charId] || 0) + 1;
    }
    let best = null, max = 0;
    for (const [id, c] of Object.entries(counts)) { if (c > max) { max = c; best = id; } }
    return best;
  })();
  const heroSrc = (() => {
    if (mainCharAlt) return mainCharAlt;
    if (mainChar && CHARACTER_RENDERS[mainChar]) return charRenderPath(CHARACTER_RENDERS[mainChar]);
    if (mostUsedChar && CHARACTER_RENDERS[mostUsedChar]) return charRenderPath(CHARACTER_RENDERS[mostUsedChar]);
    return null;
  })();

  const selectMainChar = (charId, altPath) => {
    setMainChar(charId);
    setMainCharAlt(altPath || null);
    setShowMainPicker(false);
    setPickerStep('char');
    try { localStorage.setItem('afk_main_char', charId); } catch {}
    if (altPath) { try { localStorage.setItem('afk_main_alt', altPath); } catch {} }
    else { try { localStorage.removeItem('afk_main_alt'); } catch {} }
    const uid2 = user?.id || user?.slug;
    if (uid2) {
      fetch('/api/players/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uid2, mainChar: charId, mainCharAlt: altPath || null }),
      }).catch(() => {});
    }
  };

  const clearMainChar = () => {
    setMainChar(null); setMainCharAlt(null); setShowMainPicker(false); setPickerStep('char');
    try { localStorage.removeItem('afk_main_char'); localStorage.removeItem('afk_main_alt'); } catch {}
    const uid2 = user?.id || user?.slug;
    if (uid2) {
      fetch('/api/players/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: uid2, mainChar: null, mainCharAlt: null }),
      }).catch(() => {});
    }
  };

  return (
    <>
    <div style={{ paddingBottom: 32 }}>
      {/* -- Hero Banner -- */}
      <div style={{ position: 'relative', background: '#1a1a1a', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10 }}>
        {heroSrc ? (
          <div onClick={() => setShowMainPicker(true)} style={{ position: 'relative', zIndex: 4, cursor: 'pointer' }}>
            <img src={heroSrc} alt="" style={{ display: 'block', height: 180, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
          </div>
        ) : (
          <div style={{ height: 100 }} />
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, #1a1a1a, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <p style={{ margin: 0, padding: '8px 18px 4px', fontSize: 26, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', textAlign: 'center', lineHeight: 1, position: 'relative', zIndex: 3 }}>{displayName}</p>
        {startggStats?.profile?.location && (() => {
          const loc = startggStats.profile.location;
          const cc = countryFlag(loc.country);
          const parts = [loc.city, loc.state].filter(Boolean);
          return parts.length > 0 || cc ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '3px 0 12px', position: 'relative', zIndex: 3 }}>
              {cc && <FlagImg cc={cc} size={18} />}
              {parts.length > 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{parts.join(', ')}</span>}
            </div>
          ) : null;
        })()}
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

        {/* -- SUMMARY (Start.GG character usage) -- */}
        {startggStats && startggStats.charUsage && startggStats.charUsage.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#F5C518,#D4A017)', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Resumen</p>
              </div>
              <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>Start.GG · {startggStats.totalSets} sets</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
              {startggStats.charUsage.slice(0, 3).map((ch, i) => {
                const localId = ch.localCharId;
                const charObj = localId ? CHARACTERS.find(c => c.id === localId) : null;
                const renderFile = localId ? CHARACTER_RENDERS[localId] : null;
                const isTop = i === 0;
                const charWR = ch.games > 0 ? Math.round(ch.wins * 100 / ch.games) : 0;
                const barColors = ['#F5C518', '#818CF8', '#22C55E', '#F97316', '#EF4444'];
                const barColor = barColors[i % barColors.length] || '#F5C518';
                return (
                  <div key={ch.startggCharId} onClick={() => setSelectedChar(ch.startggCharId)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isTop ? '10px 14px 10px 6px' : '9px 14px', borderBottom: i < Math.min(startggStats.charUsage.length, 3) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', position: 'relative', overflow: 'hidden', background: isTop ? 'linear-gradient(90deg, rgba(245,197,24,0.10), transparent)' : 'transparent', cursor: 'pointer', transition: 'background 0.2s' }}>
                    {renderFile ? (
                      <img src={charRenderPath(renderFile)} alt="" style={{ width: isTop ? 52 : 36, height: isTop ? 52 : 36, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                    ) : charObj ? (
                      <img src={charImgPath(charObj.img)} alt="" style={{ width: isTop ? 44 : 32, height: isTop ? 44 : 32, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                    ) : (
                      <div style={{ width: isTop ? 44 : 32, height: isTop ? 44 : 32, flexShrink: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>?</span>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <p style={{ margin: 0, fontSize: isTop ? 13 : 11, fontWeight: 700, color: isTop ? '#fff' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {charObj?.name || ch.charName || `#${ch.startggCharId}`}
                        </p>
                        <p style={{ margin: 0, fontSize: isTop ? 15 : 12, fontWeight: 900, color: barColor, flexShrink: 0, marginLeft: 8 }}>{ch.usage}%</p>
                      </div>
                      <div style={{ height: isTop ? 6 : 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: ch.usage + '%', height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                        <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{ch.games} games</p>
                        <p style={{ margin: 0, fontSize: 9, color: charWR >= 50 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)', fontWeight: 700 }}>{charWR}% WR ({ch.wins}W-{ch.games - ch.wins}L)</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {selectedChar && (() => {
              const ch = startggStats.charUsage.find(c => c.startggCharId === selectedChar);
              return ch ? <CharacterDetail ch={ch} onClose={() => { setSelectedChar(null); setCharFromModal(false); }} onBack={charFromModal ? () => { setSelectedChar(null); setShowCharsModal(true); } : undefined} /> : null;
            })()}

            {startggStats.charUsage.length > 3 && (
              <button onClick={() => setShowCharsModal(true)} style={{ width: '100%', padding: '8px', marginTop: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Ver todos ({startggStats.charUsage.length})
              </button>
            )}

            {/* Modal ver todos chars */}
            {showCharsModal && (
              <div onClick={() => setShowCharsModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '80vh', background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'slideUp .25s ease-out' }}>
                  <div onClick={() => setShowCharsModal(false)} onTouchStart={e => { e.currentTarget.dataset.ty = e.touches[0].clientY; }} onTouchEnd={e => { if (e.changedTouches[0].clientY - Number(e.currentTarget.dataset.ty||0) > 30) setShowCharsModal(false); }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 0', cursor: 'pointer', userSelect: 'none' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.22)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>Todos los personajes</p>
                    <button onClick={() => setShowCharsModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                  <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {startggStats.charUsage.map((ch, i) => {
                      const localId = ch.localCharId;
                      const charObj = localId ? CHARACTERS.find(c => c.id === localId) : null;
                      const renderFile = localId ? CHARACTER_RENDERS[localId] : null;
                      const cWR = ch.games > 0 ? Math.round(ch.wins * 100 / ch.games) : 0;
                      const barColor = ['#F5C518','#818CF8','#22C55E','#F97316','#EF4444'][i % 5];
                      return (
                        <div key={ch.startggCharId} onClick={() => { setShowCharsModal(false); setCharFromModal(true); setSelectedChar(ch.startggCharId); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                          {renderFile ? <img src={charRenderPath(renderFile)} alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                            : charObj ? <img src={charImgPath(charObj.img)} alt="" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                            : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{charObj?.name || ch.charName}</p>
                              <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: barColor, flexShrink: 0, marginLeft: 8 }}>{ch.usage}%</p>
                            </div>
                            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: ch.usage + '%', height: '100%', background: barColor, borderRadius: 2 }} />
                            </div>
                                    <p style={{ margin: '2px 0 0', fontSize: 9, color: cWR >= 50 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)', fontWeight: 700 }}>{ch.games}g · {cWR}% WR</p>
                          </div>
                                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>›</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {/* Start.GG career stats */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#F5C518' }}>{startggStats.winRate}%</p>
                <p style={{ margin: '2px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700 }}>Win Rate</p>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#22C55E' }}>{startggStats.wins}</p>
                <p style={{ margin: '2px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700 }}>Wins</p>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#EF4444' }}>{startggStats.losses}</p>
                <p style={{ margin: '2px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700 }}>Losses</p>
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#818CF8' }}>{startggStats.tournaments}</p>
                <p style={{ margin: '2px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700 }}>Torneos</p>
              </div>
            </div>

            {/* Stages */}
            {startggStats.stageUsage && startggStats.stageUsage.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
                  <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#818CF8,#6366F1)', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Stages</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {startggStats.stageUsage.slice(0, 3).map((st, idx) => (
                    <div key={st.stageId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
                      {st.image && <img src={st.image} alt="" style={{ width: '100%', height: 55, objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />}
                      {!st.image && <div style={{ width: '100%', height: 55, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{st.name}</span></div>}
                      <div style={{ padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>#{idx + 1}</span>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#fff' }}>{st.usage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Highlights */}
            {startggStats.highlights && startggStats.highlights.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
                  <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#F97316,#EA580C)', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Highlights</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {startggStats.highlights.slice(0, 9).map((h, hi) => {
                    const isTop3 = h.placement <= 3;
                    const placementColor = h.placement === 1 ? '#F5C518' : h.placement === 2 ? '#C0C0C0' : h.placement === 3 ? '#CD7F32' : '#fff';
                    return (
                      <div key={hi} onClick={() => h.eventSlug && window.open(h.eventSlug, '_blank')} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isTop3 ? 'rgba(245,197,24,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '8px', cursor: h.eventSlug ? 'pointer' : 'default', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                          {h.tournamentImage && <img src={h.tournamentImage} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />}
                          <p style={{ margin: 0, fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{h.tournament}</p>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: placementColor }}>
                          {h.placement}<sup style={{ fontSize: 8 }}>{h.placement === 1 ? 'ST' : h.placement === 2 ? 'ND' : h.placement === 3 ? 'RD' : 'TH'}</sup>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>/{h.entrants}</span>
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>
                          {h.date ? new Date(h.date).toLocaleDateString('es', { month: 'short', day: 'numeric', year: '2-digit' }) : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

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
            const isSmasher = rankName === 'SMASHer';
            const rankObj   = RANKS.find(r => r.name === rankName) || (typeof st?.rankIndex === 'number' ? RANKS[st.rankIndex] : null) || null;
            const rankColor = rankObj ? rankObj.color : 'rgba(255,255,255,0.2)';
            const tierIcon  = rankObj ? (TIER_ICONS[rankObj.tier] || '??') : null;
            return (
              <div key={plat} onClick={() => setShowRanks(true)} style={{ flex: 1, background: unranked ? 'rgba(255,255,255,0.04)' : inPlace ? 'rgba(255,140,0,0.04)' : 'linear-gradient(160deg,' + rankColor + '15 0%,transparent 60%)', border: '1px solid ' + (unranked ? 'rgba(255,255,255,0.07)' : inPlace ? 'rgba(255,140,0,0.2)' : rankColor + '30'), borderRadius: 16, padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', transition: 'transform 0.15s', position: 'relative' }}>
                <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: platColor(plat), alignSelf: 'flex-start' }}>{platLabel(plat)}</p>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: (unranked || inPlace) ? 'rgba(255,255,255,0.05)' : rankColor + '18', border: '2px solid ' + ((unranked || inPlace) ? 'rgba(255,255,255,0.1)' : rankColor + '50'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  {(unranked || inPlace || !tierIcon) ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 20 }}>?</span> : tierIcon}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: unranked ? 'rgba(255,255,255,0.2)' : inPlace ? '#FF8C00' : rankColor, textAlign: 'center' }}>
                  {unranked ? 'UNRANKED' : inPlace ? 'POSICIONAMIENTO' : rankName}
                </p>
                {inPlace && (
                  <div style={{ width: '100%', marginTop: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Partidas</span>
                      <span style={{ fontSize: 8, fontWeight: 800, color: '#FF8C00' }}>{total}/{PLACEMENT_TOTAL}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 5, overflow: 'hidden' }}>
                      <div style={{ width: Math.round((total / PLACEMENT_TOTAL) * 100) + '%', height: '100%', background: '#FF8C00', borderRadius: 3 }} />
                    </div>
                  </div>
                )}
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

        {/* --- RANKED 2v2 --- */}
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
            const isSmasher = rankName === 'SMASHer';
            const rankObj = RANKS.find(r => r.name === rankName) || (typeof st?.rankIndex === 'number' ? RANKS[st.rankIndex] : null) || null;
            const rankColor = rankObj ? rankObj.color : 'rgba(255,255,255,0.2)';
            const tierIcon = rankObj ? (TIER_ICONS[rankObj.tier] || '??') : null;
            return (
              <div key={plat} onClick={() => setShowRanks(true)} style={{ flex: 1, background: unranked ? 'rgba(124,58,237,0.04)' : inPlace ? 'rgba(124,58,237,0.06)' : 'linear-gradient(160deg,' + rankColor + '15 0%,transparent 60%)', border: '1px solid ' + (unranked ? 'rgba(124,58,237,0.12)' : inPlace ? 'rgba(124,58,237,0.25)' : rankColor + '30'), borderRadius: 16, padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', position: 'relative' }}>
                <p style={{ margin: '0 0 4px', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: platColor(plat), alignSelf: 'flex-start' }}>2v2 {platLabel(plat)}</p>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: (unranked || inPlace) ? 'rgba(124,58,237,0.08)' : rankColor + '18', border: '2px solid ' + ((unranked || inPlace) ? 'rgba(124,58,237,0.2)' : rankColor + '50'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {(unranked || inPlace || !tierIcon) ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 16 }}>?</span> : tierIcon}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: unranked ? 'rgba(255,255,255,0.2)' : inPlace ? '#7C3AED' : rankColor, textAlign: 'center' }}>
                  {unranked ? 'UNRANKED' : inPlace ? 'POSICIONAMIENTO' : rankName}
                </p>
                {inPlace && (
                  <div style={{ width: '100%', marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Partidas</span>
                      <span style={{ fontSize: 8, fontWeight: 800, color: '#7C3AED' }}>{total}/{PLACEMENT_TOTAL}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 4, overflow: 'hidden' }}>
                      <div style={{ width: Math.round((total / PLACEMENT_TOTAL) * 100) + '%', height: '100%', background: '#7C3AED', borderRadius: 3 }} />
                    </div>
                  </div>
                )}
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
            <button onClick={() => { fetch('/api/party', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: uid }) }).catch(() => {}); setPartyState(null); }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Salir</button>
          </div>
        )}

        {viewMatchDetail && <MatchDetail match={viewMatchDetail.match} viewingId={viewMatchDetail.viewingId} onClose={() => setViewMatchDetail(null)} onBack={viewMatchDetail.onBack} onViewOpponent={(id, name) => { setViewMatchDetail(null); openProfile(id, name); }} />}

        {/* --- MODAL PERFIL JUGADOR --- */}
        {viewProfile && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0B0B12', zIndex: 9999, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* Sticky top bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'rgba(11,11,18,0.95)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <button onClick={() => setViewProfile(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={18} height={18}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
              </button>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 16, flex: 1 }}>{viewProfile.userName}</p>
            </div>

            {profileLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Cargando perfil…</p>
              </div>
            ) : profileData ? (
              <div style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
                {/* Hero banner */}
                {(() => {
                  const heroCharSrc = (() => {
                    if (profileData.profile?.mainCharAlt) return profileData.profile.mainCharAlt;
                    const mc = profileData.profile?.mainChar;
                    if (mc && CHARACTER_RENDERS[mc]) return charRenderPath(CHARACTER_RENDERS[mc]);
                    const hist = profileData.history || [];
                    if (hist.length) {
                      const counts = {};
                      for (const m of hist) {
                        const cid = String(m.winnerId) === String(viewProfile.userId) ? m.winnerCharId : m.loserCharId;
                        if (cid) counts[cid] = (counts[cid] || 0) + 1;
                      }
                      let best = null, max = 0;
                      for (const [id, c] of Object.entries(counts)) { if (c > max) { max = c; best = id; } }
                      if (best && CHARACTER_RENDERS[best]) return charRenderPath(CHARACTER_RENDERS[best]);
                    }
                    const rc = profileData.recentChars?.[0];
                    if (rc && CHARACTER_RENDERS[rc]) return charRenderPath(CHARACTER_RENDERS[rc]);
                    return null;
                  })();
                  return (
                    <div style={{ position: 'relative', background: '#1a1a1a', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10 }}>
                      {heroCharSrc ? (
                        <img src={heroCharSrc} alt="" style={{ display: 'block', height: 180, objectFit: 'contain', position: 'relative', zIndex: 1 }} onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <div style={{ height: 100 }} />
                      )}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, #1a1a1a, transparent)', zIndex: 2, pointerEvents: 'none' }} />
                      <p style={{ margin: 0, padding: '8px 18px 16px', fontSize: 26, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', textAlign: 'center', lineHeight: 1, position: 'relative', zIndex: 3 }}>{viewProfile.userName}</p>
                    </div>
                  );
                })()}

                <div style={{ padding: '0 18px 40px' }}>
                {/* Estadísticas */}
                  {(() => {
                    const sw1 = profileData.stats?.switch || {}; const pc1 = profileData.stats?.parsec || {};
                    const sw2 = profileData.doublesStats?.switch || {}; const pc2 = profileData.doublesStats?.parsec || {};
                    const tW = (sw1.wins||0)+(pc1.wins||0)+(sw2.wins||0)+(pc2.wins||0);
                    const tL = (sw1.losses||0)+(pc1.losses||0)+(sw2.losses||0)+(pc2.losses||0);
                    const tT = tW+tL; const wr = tT > 0 ? Math.round((tW/tT)*100) : 0;
                    return (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '22px 0 12px' }}>
                          <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#22C55E,#16A34A)', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Estadísticas</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                          {[
                            { label: 'Victorias', value: tW, color: '#22C55E' },
                            { label: 'Derrotas', value: tL, color: '#EF4444' },
                            { label: 'Partidas', value: tT, color: '#fff' },
                            { label: 'W/R', value: wr + '%', color: '#F59E0B' },
                          ].map(st => (
                            <div key={st.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                              <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: st.color }}>{st.value}</p>
                              <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{st.label}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}

                {/* Start.GG Summary */}
                {profileStartggStats && profileStartggStats.charUsage && profileStartggStats.charUsage.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#F5C518,#D4A017)', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Resumen</p>
                      </div>
                      <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>Start.GG · {profileStartggStats.totalSets} sets</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
                      {profileStartggStats.charUsage.slice(0, 3).map((ch, i) => {
                        const localId = ch.localCharId;
                        const charObj = localId ? CHARACTERS.find(c => c.id === localId) : null;
                        const renderFile = localId ? CHARACTER_RENDERS[localId] : null;
                        const isTop = i === 0;
                        const charWR = ch.games > 0 ? Math.round(ch.wins * 100 / ch.games) : 0;
                        const barColors = ['#F5C518', '#818CF8', '#22C55E', '#F97316', '#EF4444'];
                        const barColor = barColors[i % barColors.length];
                        return (
                          <div key={ch.startggCharId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isTop ? '10px 14px 10px 6px' : '9px 14px', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none', background: isTop ? 'linear-gradient(90deg,rgba(245,197,24,0.10),transparent)' : 'transparent' }}>
                            {renderFile ? (
                              <img src={charRenderPath(renderFile)} alt="" style={{ width: isTop ? 52 : 36, height: isTop ? 52 : 36, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                            ) : charObj ? (
                              <img src={charImgPath(charObj.img)} alt="" style={{ width: isTop ? 44 : 32, height: isTop ? 44 : 32, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                            ) : (
                              <div style={{ width: isTop ? 44 : 32, height: isTop ? 44 : 32, flexShrink: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>?</span>
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <p style={{ margin: 0, fontSize: isTop ? 13 : 11, fontWeight: 700, color: isTop ? '#fff' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {charObj?.name || ch.charName || `#${ch.startggCharId}`}
                                </p>
                                <p style={{ margin: 0, fontSize: isTop ? 15 : 12, fontWeight: 900, color: barColor, flexShrink: 0, marginLeft: 8 }}>{ch.usage}%</p>
                              </div>
                              <div style={{ height: isTop ? 6 : 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: ch.usage + '%', height: '100%', background: barColor, borderRadius: 3 }} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                                <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{ch.games} games</p>
                                <p style={{ margin: 0, fontSize: 9, color: charWR >= 50 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)', fontWeight: 700 }}>{charWR}% WR ({ch.wins}W-{ch.games - ch.wins}L)</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 20 }}>
                      {[
                        { label: 'Win Rate', value: profileStartggStats.winRate + '%', color: '#F5C518' },
                        { label: 'Wins',     value: profileStartggStats.wins,           color: '#22C55E' },
                        { label: 'Losses',   value: profileStartggStats.losses,         color: '#EF4444' },
                        { label: 'Torneos',  value: profileStartggStats.tournaments,    color: '#818CF8' },
                      ].map(st => (
                        <div key={st.label} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: st.color }}>{st.value}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700 }}>{st.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                  {/* Ranked 1v1 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
                    <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#FF8C00,#E85D00)', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>⚔️ Ranked</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    {['switch', 'parsec'].map(plat => {
                      const s = profileData.stats?.[plat] || {};
                      const wins = s.wins || 0; const losses = s.losses || 0; const total = wins + losses;
                      const rankName = s.rank || 'Plástico I'; const rp = s.rankedPoints || 0;
                      const isUnranked = total === 0; const inPlacement = !s?.placementDone && !isUnranked;
                      const rankObj = RANKS.find(r => r.name === rankName) || RANKS[0];
                      const tierIcon = rankObj ? (TIER_ICONS[rankObj.tier] || '??') : '?';
                      const rankColor = rankObj?.color || '#9CA3AF';
                      const pColor = plat === 'switch' ? '#EF4444' : '#8B5CF6';
                      return (
                        <div key={plat} style={{ flex: 1, background: isUnranked ? 'rgba(255,255,255,0.03)' : inPlacement ? 'rgba(255,140,0,0.04)' : `linear-gradient(135deg, ${rankColor}14 0%, transparent 65%)`, border: `1px solid ${isUnranked ? 'rgba(255,255,255,0.07)' : inPlacement ? 'rgba(255,140,0,0.2)' : rankColor + '35'}`, borderRadius: 20, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: pColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{plat === 'switch' ? '🎮 Switch' : '🖥️ Parsec'}</p>
                          <div style={{ width: 56, height: 56, borderRadius: '50%', background: (isUnranked || inPlacement) ? 'rgba(255,255,255,0.05)' : `${rankColor}18`, border: `2px solid ${(isUnranked || inPlacement) ? 'rgba(255,255,255,0.1)' : rankColor + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                            {(isUnranked || inPlacement) ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 20 }}>?</span> : tierIcon}
                          </div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: isUnranked ? 'rgba(255,255,255,0.2)' : inPlacement ? '#FF8C00' : rankColor }}>
                            {isUnranked ? 'UNRANKED' : inPlacement ? 'POSICIONAMIENTO' : rankName}
                          </p>
                          {inPlacement && (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <div style={{ width: '80%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                <div style={{ width: `${(total / PLACEMENT_TOTAL) * 100}%`, height: '100%', borderRadius: 2, background: '#FF8C00' }} />
                              </div>
                              <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: '#FF8C00' }}>{total}/{PLACEMENT_TOTAL}</p>
                            </div>
                          )}
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{wins}W · {losses}L</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ranked 2v2 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
                    <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#A78BFA,#7C3AED)', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>👥 Ranked 2v2</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    {['switch', 'parsec'].map(plat => {
                      const s = profileData.doublesStats?.[plat] || {};
                      const wins = s.wins || 0; const losses = s.losses || 0; const total = wins + losses;
                      const rankName = s.rank || 'Plástico I'; const rp = s.rankedPoints || 0;
                      const isUnranked = total === 0; const inPlacement = !s?.placementDone && !isUnranked;
                      const rankObj = RANKS.find(r => r.name === rankName) || RANKS[0];
                      const tierIcon = rankObj ? (TIER_ICONS[rankObj.tier] || '??') : '?';
                      const rankColor = rankObj?.color || '#9CA3AF';
                      return (
                        <div key={plat} style={{ flex: 1, background: isUnranked ? 'rgba(255,255,255,0.03)' : inPlacement ? 'rgba(124,58,237,0.04)' : `linear-gradient(135deg, ${rankColor}14 0%, transparent 65%)`, border: `1px solid ${isUnranked ? 'rgba(255,255,255,0.07)' : inPlacement ? 'rgba(124,58,237,0.2)' : rankColor + '35'}`, borderRadius: 20, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: plat === 'switch' ? '#EF4444' : '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>2V2 {plat === 'switch' ? '🎮 Switch' : '🖥️ Parsec'}</p>
                          <div style={{ width: 56, height: 56, borderRadius: '50%', background: (isUnranked || inPlacement) ? 'rgba(255,255,255,0.05)' : `${rankColor}18`, border: `2px solid ${(isUnranked || inPlacement) ? 'rgba(255,255,255,0.1)' : rankColor + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                            {(isUnranked || inPlacement) ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 20 }}>?</span> : tierIcon}
                          </div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: isUnranked ? 'rgba(255,255,255,0.2)' : inPlacement ? '#A78BFA' : rankColor }}>
                            {isUnranked ? 'UNRANKED' : inPlacement ? 'POSICIONAMIENTO' : rankName}
                          </p>
                          {inPlacement && (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                              <div style={{ width: '80%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                <div style={{ width: `${(total / PLACEMENT_TOTAL) * 100}%`, height: '100%', borderRadius: 2, background: '#7C3AED' }} />
                              </div>
                              <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: '#A78BFA' }}>{total}/{PLACEMENT_TOTAL}</p>
                            </div>
                          )}
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{wins}W · {losses}L</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Historial */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px' }}>
                    <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#FF8C00,#E85D00)', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>📋 Historial</p>
                  </div>
                <ProfileHistorySection
                  history={profileData.history || []}
                  histFilter={profileHistFilter}
                  setHistFilter={setProfileHistFilter}
                  histExpanded={profileHistExpanded}
                  setHistExpanded={setProfileHistExpanded}
                  viewedUserId={viewProfile.userId}
                  setViewMatchDetail={setViewMatchDetail}
                  rankStats={profileData.stats}
                />
              </div>
            </div>
          ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No se pudo cargar el perfil</p>
              </div>
            )}
          </div>
        )}

        {/* --- MODAL RANGOS --- */}
        {showRanks && (
          <div onClick={() => setShowRanks(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#12121E', border: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px 20px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}>
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
              </div>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🏅</span>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff' }}>Todos los rangos</p>
                </div>
                <button onClick={() => setShowRanks(false)} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>

              {/* Scrollable content */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '12px 14px 24px' }}>
                {(() => {
                  const tiers = [
                    { name: 'Plástico', subs: 4 },
                    { name: 'Madera',   subs: 4 },
                    { name: 'Hierro',   subs: 4 },
                    { name: 'Bronce',   subs: 4 },
                    { name: 'Plata',    subs: 3 },
                    { name: 'Oro',      subs: 3 },
                    { name: 'Platino',  subs: 3 },
                    { name: 'Diamante', subs: 3 },
                  ];
                  const subLabel = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' };
                  const smasher = RANKS.find(x => x.name === 'SMASHer');

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {/* SMASHer — fila destacada arriba */}
                      {smasher && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: smasher.bg, border: '1px solid ' + smasher.border, borderRadius: 14, marginBottom: 4 }}>
                          <span style={{ fontSize: 28, lineHeight: 1 }}>{TIER_ICONS['SMASHer']}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 1px', fontSize: 16, fontWeight: 900, color: smasher.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>SMASHer</p>
                            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>El rango más alto. Dinámico: se requiere estar entre los mejores MMR activos.</p>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 800, color: smasher.color, background: smasher.bg, border: '1px solid ' + smasher.border, borderRadius: 8, padding: '3px 8px', whiteSpace: 'nowrap' }}>MMR visible</span>
                        </div>
                      )}

                      {/* Tiers normales: Diamante ? Plástico (de mayor a menor) */}
                      {[...tiers].reverse().map(({ name, subs }) => {
                        const icon = TIER_ICONS[name] || '??';
                        const baseRank = RANKS.find(r => r.tier === name);
                        if (!baseRank) return null;
                        return (
                          <div key={name} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
                            {/* Tier row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid ' + baseRank.color }}>
                              <span style={{ fontSize: 18 }}>{icon}</span>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: baseRank.color, textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>{name}</p>
                              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{subs} subdivisiones</p>
                            </div>
                            {/* Subdivisions row */}
                            <div style={{ display: 'flex', padding: '8px 10px', gap: 6 }}>
                              {Array.from({ length: subs }, (_, i) => subs - i).map(sub => {
                                const r = RANKS.find(x => x.tier === name && x.subdivision === sub);
                                if (!r) return null;
                                return (
                                  <div key={sub} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', background: r.bg, border: '1px solid ' + r.border, borderRadius: 10 }}>
                                    <span style={{ fontSize: 20 }}>{icon}</span>
                                    <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: r.color }}>{subLabel[sub]}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* Unranked */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                        <span style={{ fontSize: 20 }}>—</span>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Unranked</p>
                          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Sin partidas clasificatorias</p>
                        </div>
                      </div>

                      {/* Explicación */}
                      <div style={{ marginTop: 6, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>¿Cómo funciona?</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {[
                            ['🎯', 'Jugá 5 partidas de clasificación para obtener tu rango inicial basado en MMR.'],
                            ['📈', 'Cada victoria suma RR (Rank Rating, 0–100). Al llegar a 100 ascendés de subdivisión.'],
                            ['⚡', 'Los upsets (ganar a alguien más fuerte) dan RR bonus. Perder contra más débiles penaliza más.'],
                            ['🛡️', 'Al ascender tenés 2 partidas de escudo que te protegen del descenso.'],
                            ['👑', 'SMASHer es dinámico: necesitás mantenerte entre los mejores MMR de la comunidad activa.'],
                          ].map(([emoji, text]) => (
                            <div key={emoji} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <span style={{ fontSize: 13, flexShrink: 0 }}>{emoji}</span>
                              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        <div style={{ position: 'sticky', top: 0, zIndex: 5, background: '#0B0B12', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
            <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#6366F1,#4F46E5)', flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>📋 Historial de partidas</p>
          </div>
          {/* Filtros dinámicos */}
          {(() => {
            const hasCasual = history.some(m => m.type === 'casual');
            const communityIds = [...new Set(history.filter(m => m.type === 'tournament' && m.community).map(m => m.community))];
            const COMMUNITY_LABELS_MAP = { 'santafe': 'Santa Fe', 'cordoba': 'Córdoba', 'mendoza': 'Mendoza', 'afk-multi': 'AFK', 'afk': 'AFK', 'warui': 'Warui', 'inc': 'INC', 'test': 'Test' };
            const filterTabs = [
              ['all', 'Todos'],
              ['ranked', 'Ranked'],
              ...(hasCasual ? [['casual', 'Normal']] : []),
              ...communityIds.map(c => [c, COMMUNITY_LABELS_MAP[c] || c]),
            ];
            return (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {filterTabs.map(([id, label]) => (
                  <button key={id} onClick={() => { setHistoryFilter(id); setHistExpanded(false); }} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: historyFilter === id ? 'rgba(255,140,0,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${historyFilter === id ? 'rgba(255,140,0,0.5)' : 'rgba(255,255,255,0.06)'}`, color: historyFilter === id ? '#FF8C00' : 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>{label}</button>
                ))}
              </div>
            );
          })()}
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Cargando...</div>
        ) : (() => {
          const filtered = history.filter(m => {
            if (historyFilter === 'all') return true;
            if (historyFilter === 'casual') return m.type === 'casual';
            if (historyFilter === 'ranked') return !m.type || m.type === 'ranked';
            // Community filter
            return m.type === 'tournament' && m.community === historyFilter;
          });
          if (filtered.length === 0) return (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 28, margin: '0 0 8px' }}>🏆</p>
      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Sin partidas aún</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Jugá partidas para ver tu historial</p>
            </div>
          );
          const toShow = filtered.slice(0, 5);
          const groups = groupHistByDate(toShow);
          const allGroupsSelf = groupHistByDate(filtered);
          return (
            <div>
              {groups.map(({ dateStr, matches: gm }, gi) => {
                const selfId = String(user.id || user.slug);
                const gW = gm.filter(m => (m.mode === '2v2' || m.type === 'tournament') ? !!m.isWin : String(m.winnerId) === selfId).length;
                return (
                  <div key={gi}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 2px 5px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', flex: 1 }}>{dateStr}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#22C55E' }}>{gW}W</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', margin: '0 3px' }}>//</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#EF4444' }}>{gm.length - gW}L</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
                      {gm.map((m, i) => {
                const isCasual = m.type === 'casual';
                const isTournament = m.type === 'tournament';
                const is2v2 = m.mode === '2v2';
                const COMMUNITY_SHORT = { 'santafe': 'SFE', 'cordoba': 'CBA', 'mendoza': 'MDZ', 'afk-multi': 'AFK', 'afk': 'AFK', 'warui': 'WAR', 'inc': 'INC', 'test': 'TST' };
                // Para 2v2 y torneo usamos el campo isWin guardado por servidor
                const isWin = (is2v2 || isTournament) ? !!m.isWin : String(m.winnerId) === String(user.id || user.slug);
                const opponent = is2v2
                  ? (isWin
                    ? `${m[m.winnerTeam === 'team1' ? 'team2' : 'team1']?.p1 || '?'} & ${m[m.winnerTeam === 'team1' ? 'team2' : 'team1']?.p2 || '?'}`
                    : `${m[m.winnerTeam]?.p1 || '?'} & ${m[m.winnerTeam]?.p2 || '?'}`)
                  : (isWin ? m.loserName : m.winnerName);
                const opponentId = is2v2 ? null : (isWin ? m.loserId : m.winnerId);
                const myCharId = is2v2 ? null : (isWin ? m.winnerCharId : m.loserCharId);
                const myRankName = is2v2 ? null : (isWin ? m.winnerRankAfter : m.loserRankAfter);
                const rankObj = myRankName ? RANKS.find(r => r.name === myRankName) : null;
                const tierIcon = rankObj ? TIER_ICONS[rankObj.tier] : null;
                const charObj = myCharId ? CHARACTERS.find(ch => ch.id === myCharId) : null;
                const mySkin = is2v2 ? null : (isWin ? (m.winnerAltId || 1) : (m.loserAltId || 1));
                const charSrcRaw = stockIconPath(charObj, mySkin);
                // Fallback al mainChar del perfil si la partida no tiene charId
                const mainCharObj = !charSrcRaw && mainChar ? CHARACTERS.find(ch => ch.id === mainChar) : null;
                const charSrc = charSrcRaw || stockIconPath(mainCharObj, 1);
                const oppCharId = is2v2 ? null : (isWin ? m.loserCharId : m.winnerCharId);
                const oppCharObj = oppCharId ? CHARACTERS.find(ch => ch.id === oppCharId) : null;
                const oppSkin = is2v2 ? null : (isWin ? (m.loserAltId || 1) : (m.winnerAltId || 1));
                const oppCharSrc = stockIconPath(oppCharObj, oppSkin);
                const isMyPlacement = !isCasual && !is2v2 && (isWin ? m.isPlacementWinner : m.isPlacementLoser);
                const rpDelta = isCasual || is2v2 ? null : (isMyPlacement ? null : (isWin ? m.rpDelta : (m.loserRpDelta || -10)));
                const myScore = m.winnerScore != null ? (isWin ? m.winnerScore : (m.loserScore ?? 0)) : null;
                const oppScore = m.winnerScore != null ? (isWin ? (m.loserScore ?? 0) : m.winnerScore) : null;
                // Escenarios únicos para el fondo
                const games = m.games || [];
                const playedStages = games.map(g => resolveGameStage(g)).filter(Boolean);
                const uniqueStages = [...new Set(playedStages)];
                return (

                  <div key={i} onClick={() => setViewMatchDetail({ match: m, viewingId: String(user.id || user.slug) })} style={{ position: 'relative', height: 72, borderRadius: 12, overflow: 'hidden', borderLeft: '3px solid ' + (isWin ? '#22C55E' : '#EF4444'), cursor: 'pointer' }}>
                    {/* Fondo: escenarios jugados */}
                    <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                      {uniqueStages.length > 0 ? uniqueStages.map((stage, si) => (
                        <div key={si} style={{ flex: 1, backgroundImage: `url(${STAGE_IMG[stage] || ''})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                      )) : (
                        <div style={{ flex: 1, background: isWin ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)' }} />
                      )}
                    </div>
                    {/* Overlay oscuro */}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 50%, rgba(0,0,0,0.52) 100%)' }} />
                    {isTournament && HIST_COMM_LOGOS[m.community] && (
                      <img src={HIST_COMM_LOGOS[m.community]} alt="" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 46, height: 46, objectFit: 'contain', opacity: 0.22, pointerEvents: 'none', filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.7))' }} />
                    )}
                    {/* Contenido */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}>
                      {/* Izquierda: personaje + badge */}
                      <div style={{ width: 100, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px 4px 8px 8px' }}>
                        {charSrc ? (
                          <img src={charSrc} alt="" style={{ width: 50, height: 50, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />
                        ) : (
                          <div style={{ width: 50, height: 50, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: is2v2 ? 24 : 20 }}>{is2v2 ? '👥' : '⚔️'}</div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          {isCasual ? (
                            <span style={{ fontSize: 8, fontWeight: 800, color: '#A78BFA', padding: '1px 3px', borderRadius: 3, background: 'rgba(139,92,246,0.15)' }}>NRM</span>
                          ) : isTournament ? (
                            HIST_COMM_LOGOS[m.community] ? (
                              <img src={HIST_COMM_LOGOS[m.community]} alt="" style={{ width: 30, height: 30, objectFit: 'contain', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }} onError={e => { e.target.style.display='none'; }} />
                            ) : (
                              <span style={{ fontSize: 8, fontWeight: 800, color: '#F59E0B', padding: '1px 3px', borderRadius: 3, background: 'rgba(245,158,11,0.15)' }}>&nbsp;</span>
                            )
                          ) : is2v2 ? (
                            <span style={{ fontSize: 8, fontWeight: 800, color: '#60A5FA', padding: '1px 3px', borderRadius: 3, background: 'rgba(96,165,250,0.15)' }}>2v2</span>
                          ) : rankObj ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                              <span style={{ fontSize: 20, lineHeight: 1.1 }}>{TIER_ICONS[rankObj.tier]}</span>
                              <span style={{ fontSize: 8, fontWeight: 900, color: rankObj.color, lineHeight: 1.2, letterSpacing: '0.04em' }}>{['I','II','III','IV'][(rankObj.subdivision||1)-1]}</span>
                            </div>
                          ) : isMyPlacement ? (
                            <span style={{ fontSize: 8, fontWeight: 800, color: '#FBBF24', padding: '1px 3px', borderRadius: 3, background: 'rgba(251,191,36,0.15)' }}>POS</span>
                          ) : (
                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>?</span></div>
                          )}
                        </div>
                      </div>
                      {/* Centro: info */}
                      <div style={{ flex: 1, padding: '9px 5px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, minWidth: 0, }}> 
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>vs {opponent}</p>
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                              {isTournament ? (m.communityLabel || m.community || 'Torneo') : platLabel(m.platform)} · {timeAgo(m.playedAt)}
                        </p>
                        {isTournament ? (
                          m.round ? <span style={{ fontSize: 10, fontWeight: 800, color: '#F59E0B' }}>{m.round}</span> : null
                        ) : !isCasual && !is2v2 && (
                          isMyPlacement ? (
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#FBBF24' }}>Posicionamiento</span>
                          ) : rpDelta != null ? (
                            <span style={{ fontSize: 10, fontWeight: 800, color: rpDelta >= 0 ? '#22C55E' : '#EF4444' }}>{rpDelta >= 0 ? '+' : ''}{rpDelta} RR</span>
                          ) : null
                        )}
                      </div>
                      {/* Derecha: oponente + VICTORIA / DERROTA */}
                      <div style={{ padding: '9px 10px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        {oppCharSrc && <img src={oppCharSrc} alt="" style={{ width: 28, height: 28, objectFit: 'contain', opacity: 0.7 }} onError={e => { e.target.style.display='none'; }} />}
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: isWin ? '#22C55E' : '#EF4444' }}>{isWin ? 'VICTORIA' : 'DERROTA'}</p>
                            {myScore != null && <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)' }}>{myScore}–{oppScore ?? 0}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
                    </div>
                  </div>
                );
              })}
              {filtered.length > 5 && (
                <button onClick={() => setShowHistAllModal(true)} style={{ width: '100%', marginTop: 8, padding: '11px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.08em' }}>
                  Ver todo ({filtered.length}) →
                </button>
              )}
            </div>
          );
        })()}
      </div>
    </div>

    {/* Bottom sheet: Historial completo (perfil personal) */}
    {showHistAllModal && (() => {
      const filtered = history.filter(m => {
        if (historyFilter === 'all') return true;
        if (historyFilter === 'casual') return m.type === 'casual';
        if (historyFilter === 'ranked') return !m.type || m.type === 'ranked';
        return m.type === 'tournament' && m.community === historyFilter;
      });
      const allGrp = groupHistByDate(filtered);
      const selfId = String(user.id || user.slug);
      return (
        <div onClick={() => setShowHistAllModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(5px)', zIndex: 10001, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '22px 22px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'slideUp .22s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0, cursor: 'pointer' }} onClick={() => setShowHistAllModal(false)}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>Historial completo ({filtered.length})</p>
              <button onClick={() => setShowHistAllModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '10px 16px 24px' }}>
              {allGrp.map(({ dateStr, matches: gm }, gi) => {
                const gW = gm.filter(mm => (mm.mode === '2v2' || mm.type === 'tournament') ? !!mm.isWin : String(mm.winnerId) === selfId).length;
                return (
                  <div key={gi}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 2px 5px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', flex: 1 }}>{dateStr}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#22C55E' }}>{gW}W</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', margin: '0 3px' }}>//</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#EF4444' }}>{gm.length - gW}L</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
                      {gm.map((m, i) => {
                        const isCasual = m.type === 'casual';
                        const isTournament = m.type === 'tournament';
                        const is2v2 = m.mode === '2v2';
                        const COMMUNITY_SHORT = { 'santafe': 'SFE', 'cordoba': 'CBA', 'mendoza': 'MDZ', 'afk-multi': 'AFK', 'afk': 'AFK', 'warui': 'WAR', 'inc': 'INC', 'test': 'TST' };
                        const isWin = (is2v2 || isTournament) ? !!m.isWin : String(m.winnerId) === selfId;
                        const opponent = is2v2 ? (isWin ? `${m[m.winnerTeam === 'team1' ? 'team2' : 'team1']?.p1 || '?'} & ${m[m.winnerTeam === 'team1' ? 'team2' : 'team1']?.p2 || '?'}` : `${m[m.winnerTeam]?.p1 || '?'} & ${m[m.winnerTeam]?.p2 || '?'}`) : (isWin ? m.loserName : m.winnerName);
                        const myCharId = is2v2 ? null : (isWin ? m.winnerCharId : m.loserCharId);
                        const myRankName = is2v2 ? null : (isWin ? m.winnerRankAfter : m.loserRankAfter);
                        const rankObj = myRankName ? RANKS.find(r => r.name === myRankName) : null;
                        const charObj = myCharId ? CHARACTERS.find(ch => ch.id === myCharId) : null;
                        const mySkin = is2v2 ? null : (isWin ? (m.winnerAltId || 1) : (m.loserAltId || 1));
                        const _ai = (o, s) => Math.min(Math.max(0,(s||1)-1),(o.alts?.length||1)-1);
                        const charSrcRaw = stockIconPath(charObj, mySkin);
                        const mainCharObj2 = !charSrcRaw && mainChar ? CHARACTERS.find(ch => ch.id === mainChar) : null;
                        const charSrc = charSrcRaw || stockIconPath(mainCharObj2, 1);
                        const oppCharId = is2v2 ? null : (isWin ? m.loserCharId : m.winnerCharId);
                        const oppCharObj = oppCharId ? CHARACTERS.find(ch => ch.id === oppCharId) : null;
                        const oppSkin = is2v2 ? null : (isWin ? (m.loserAltId || 1) : (m.winnerAltId || 1));
                        const oppCharSrc = stockIconPath(oppCharObj, oppSkin);
                        const isMyPlacement = !isCasual && !is2v2 && (isWin ? m.isPlacementWinner : m.isPlacementLoser);
                        const rpDelta = isCasual || is2v2 ? null : (isMyPlacement ? null : (isWin ? m.rpDelta : (m.loserRpDelta || -10)));
                        const myScore = m.winnerScore != null ? (isWin ? m.winnerScore : (m.loserScore ?? 0)) : null;
                        const oppScore = m.winnerScore != null ? (isWin ? (m.loserScore ?? 0) : m.winnerScore) : null;
                        const games = m.games || [];
                        const playedStages = games.map(g => resolveGameStage(g)).filter(Boolean);
                        const uniqueStages = [...new Set(playedStages)];
                        return (
                          <div key={i} onClick={() => { setShowHistAllModal(false); setTimeout(() => setViewMatchDetail({ match: m, viewingId: selfId, onBack: () => { setViewMatchDetail(null); setShowHistAllModal(true); } }), 180); }} style={{ position: 'relative', height: 72, borderRadius: 12, overflow: 'hidden', borderLeft: '3px solid ' + (isWin ? '#22C55E' : '#EF4444'), cursor: 'pointer' }}>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                              {uniqueStages.length > 0 ? uniqueStages.map((stage, si) => (
                                <div key={si} style={{ flex: 1, backgroundImage: `url(${STAGE_IMG[stage] || ''})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                              )) : (
                                <div style={{ flex: 1, background: isWin ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)' }} />
                              )}
                            </div>
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.78) 50%, rgba(0,0,0,0.52) 100%)' }} />
                            {isTournament && HIST_COMM_LOGOS[m.community] && (
                              <img src={HIST_COMM_LOGOS[m.community]} alt="" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 46, height: 46, objectFit: 'contain', opacity: 0.22, pointerEvents: 'none', filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.7))' }} />
                            )}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}>
                              <div style={{ width: 100, flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px 4px 8px 8px' }}>
                                {charSrc ? (
                                  <img src={charSrc} alt="" style={{ width: 50, height: 50, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />
                                ) : (
                                  <div style={{ width: 50, height: 50, borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: is2v2 ? 24 : 20 }}>{is2v2 ? '👥' : '⚔️'}</div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                  {isCasual ? (
                                    <span style={{ fontSize: 8, fontWeight: 800, color: '#A78BFA', padding: '1px 3px', borderRadius: 3, background: 'rgba(139,92,246,0.15)' }}>NRM</span>
                                  ) : isTournament ? (
                                    HIST_COMM_LOGOS[m.community] ? (
                                      <img src={HIST_COMM_LOGOS[m.community]} alt="" style={{ width: 30, height: 30, objectFit: 'contain', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }} onError={e => { e.target.style.display='none'; }} />
                                    ) : (
                                      <span style={{ fontSize: 8, fontWeight: 800, color: '#F59E0B', padding: '1px 3px', borderRadius: 3, background: 'rgba(245,158,11,0.15)' }}>&nbsp;</span>
                                    )
                                  ) : is2v2 ? (
                                    <span style={{ fontSize: 8, fontWeight: 800, color: '#60A5FA', padding: '1px 3px', borderRadius: 3, background: 'rgba(96,165,250,0.15)' }}>2v2</span>
                                  ) : rankObj ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                                      <span style={{ fontSize: 20, lineHeight: 1.1 }}>{TIER_ICONS[rankObj.tier]}</span>
                                      <span style={{ fontSize: 8, fontWeight: 900, color: rankObj.color, lineHeight: 1.2, letterSpacing: '0.04em' }}>{['I','II','III','IV'][(rankObj.subdivision||1)-1]}</span>
                                    </div>
                                  ) : isMyPlacement ? (
                                    <span style={{ fontSize: 8, fontWeight: 800, color: '#FBBF24', padding: '1px 3px', borderRadius: 3, background: 'rgba(251,191,36,0.15)' }}>POS</span>
                                  ) : (
                                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>?</span></div>
                                  )}
                                </div>
                              </div>
                              <div style={{ flex: 1, padding: '9px 5px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>vs {opponent}</p>
                                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                              {isTournament ? (m.communityLabel || m.community || 'Torneo') : platLabel(m.platform)} · {timeAgo(m.playedAt)}
                                </p>
                                {isTournament ? (
                                  m.round ? <span style={{ fontSize: 10, fontWeight: 800, color: '#F59E0B' }}>{m.round}</span> : null
                                ) : !isCasual && !is2v2 && (
                                  isMyPlacement ? (
                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#FBBF24' }}>Posicionamiento</span>
                                  ) : rpDelta != null ? (
                                    <span style={{ fontSize: 10, fontWeight: 800, color: rpDelta >= 0 ? '#22C55E' : '#EF4444' }}>{rpDelta >= 0 ? '+' : ''}{rpDelta} RR</span>
                                  ) : null
                                )}
                              </div>
                              <div style={{ padding: '9px 10px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                                {oppCharSrc && <img src={oppCharSrc} alt="" style={{ width: 28, height: 28, objectFit: 'contain', opacity: 0.7 }} onError={e => { e.target.style.display='none'; }} />}
                                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: isWin ? '#22C55E' : '#EF4444' }}>{isWin ? 'VICTORIA' : 'DERROTA'}</p>
                            {myScore != null && <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)' }}>{myScore}–{oppScore ?? 0}</p>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    })()}

    {/* Main character picker modal */}
    {showMainPicker && (
      <div onClick={() => { setShowMainPicker(false); setPickerStep('char'); }} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '80vh', background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {pickerStep === 'alt' && <button onClick={() => setPickerStep('char')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>}
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>{pickerStep === 'char' ? 'Elegir main' : 'Elegir skin'}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {mainChar && pickerStep === 'char' && <button onClick={clearMainChar} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#EF4444' }}>Quitar</button>}
              <button onClick={() => { setShowMainPicker(false); setPickerStep('char'); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
          </div>
          {pickerStep === 'char' ? (
            <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 12px 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {Object.entries(CHARACTER_RENDERS).map(([charId, renderFile]) => {
                const charObj = CHARACTERS.find(c => c.id === charId);
                const isSelected = mainChar === charId;
                return (
                  <button key={charId} onClick={() => { if (CHARACTERS.find(c => c.id === charId)?.alts?.length > 1) { setMainChar(charId); setPickerStep('alt'); } else { selectMainChar(charId, null); } }} style={{ background: isSelected ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.04)', border: `2px solid ${isSelected ? '#FF8C00' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '8px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <img src={charRenderPath(renderFile)} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                    <span style={{ fontSize: 8, fontWeight: 700, color: isSelected ? '#FF8C00' : 'rgba(255,255,255,0.4)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{charObj?.name || charId}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '8px 12px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {charDefaultAltPath(mainChar) && (
                  <button onClick={() => selectMainChar(mainChar, null)} style={{ background: !mainCharAlt ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.04)', border: `2px solid ${!mainCharAlt ? '#FF8C00' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '10px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <img src={charDefaultAltPath(mainChar)} alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: !mainCharAlt ? '#FF8C00' : 'rgba(255,255,255,0.4)' }}>Default</span>
                  </button>
                )}
                {charAltPaths(mainChar).map((altPath, i) => {
                  const isSelected = mainCharAlt === altPath;
                  return (
                    <button key={i} onClick={() => selectMainChar(mainChar, altPath)} style={{ background: isSelected ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.04)', border: `2px solid ${isSelected ? '#FF8C00' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '10px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <img src={altPath} alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: isSelected ? '#FF8C00' : 'rgba(255,255,255,0.4)' }}>Skin {i + 2}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}


/* ─── NOTIF CARD ─────────────────────────────────── */
function NotifCard({ notif, onDismiss, userId, userName, onNavigate }) {
  const isRead = !!notif.readAt;
  const t = new Date(notif.sentAt);
  const timeStr = t.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const [acting, setActing] = useState(false);

  const isFriendReq = notif.type === 'friend_request';
  const isPartyInvite = notif.type === 'party_invite';
  const isBroadcast = notif.type === 'broadcast' || notif.type === 'tournament_started' || notif.type === 'new_tournament';
  const hasActions = (isFriendReq || isPartyInvite) && !isRead;

  const icon = isFriendReq ? '📩' : isPartyInvite ? '👥' : isBroadcast ? '🏆' : '🎮';
  const accentColor = isFriendReq ? 'rgba(99,102,241,' : isPartyInvite ? 'rgba(124,58,237,' : isBroadcast ? 'rgba(255,140,0,' : 'rgba(232,142,0,';

  const handleClick = () => {
    if (hasActions) return; // don't navigate if there are pending actions
    if (!isRead) onDismiss(notif.id);
    if (onNavigate) onNavigate(getNotifRoute(notif));
  };

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
    <div onClick={handleClick} style={{
      background: isRead ? '#10101A' : accentColor + '0.06)',
      border: `1px solid ${isRead ? 'rgba(255,255,255,0.05)' : accentColor + '0.22)'}`,
      borderRadius: 16, padding: '14px 16px', marginBottom: 10,
      display: 'flex', gap: 14, alignItems: 'flex-start',
      cursor: hasActions ? 'default' : 'pointer',
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
        <div style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', background: '#FF8C00', marginTop: 6 }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB — RANKINGS
═══════════════════════════════════════════════════ */
function TabRankings({ user, setTab }) {
  const [mode,        setMode]       = useState('ba');
  const [rankPlat,    setRankPlat]   = useState('switch');
  const [rankBoard,   setRankBoard]  = useState([]);
  const [rankTotal,   setRankTotal]  = useState(0);
  const [rankLoading, setRankLoading] = useState(false);
  const [charPlat,    setCharPlat]   = useState('switch');
  const [charSearch,  setCharSearch] = useState('');
  const [charSel,     setCharSel]    = useState(null);
  const [charBoard,   setCharBoard]  = useState([]);
  const [charLoading, setCharLoading] = useState(false);

  // Secciones del ranked
  const [onlinePlayers, setOnlinePlayers] = useState([]);

  // Profile viewing
  const [viewProfile, setViewProfile]           = useState(null);
  const [profileData, setProfileData]           = useState(null);
  const [profileLoading, setProfileLoading]     = useState(false);
  const [profileStartggStats, setProfileStartggStats] = useState(null);
  const [viewMatchDetail, setViewMatchDetail] = useState(null);
  const [profileHistFilter, setProfileHistFilter] = useState('all');

  // Modal "sin perfil" para jugadores del ranking comunitario
  const [noProfileModal, setNoProfileModal] = useState(null); // null | playerName
  const [profileHistExpanded, setProfileHistExpanded] = useState(false);
  const [selectedCharRank, setSelectedCharRank]       = useState(null);
  const [showCharsModalRank, setShowCharsModalRank]   = useState(false);
  const [charFromModalRank, setCharFromModalRank]     = useState(false);

  // Community ranking (AFK, INC, etc.)
  const [commRanking, setCommRanking] = useState({ players: [], tournaments: [], loading: false, loaded: false });
  const [commYear, setCommYear]       = useState(String(new Date().getFullYear()));
  const [commPage, setCommPage]       = useState(1);
  const [enabledRankComms, setEnabledRankComms] = useState(['afk']);

  // Cargar config de comunidades visibles
  useEffect(() => {
    fetch('/api/community-ranking/config')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.communities?.length) setEnabledRankComms(d.communities);
      })
      .catch(() => {});
  }, []);

  const myUid = String(user?.id || user?.slug || '');
  const openProfile = (playerId, playerName) => {
    if (String(playerId) === myUid) { setTab('perfil'); return; }
    setViewProfile({ userId: playerId, userName: playerName });
    setProfileData(null);
    setProfileStartggStats(null);
    setSelectedCharRank(null);
    setShowCharsModalRank(false);
    setCharFromModalRank(false);
    setProfileHistFilter('all');
    setProfileHistExpanded(false);
    setProfileLoading(true);
    fetch('/api/players/profile?id=' + encodeURIComponent(playerId) + '&full=true')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setProfileData(d);
        setProfileLoading(false);
        const slug = d?.profile?.slug;
        if (slug) {
          try {
            const stored = JSON.parse(localStorage.getItem('afk_user') || '{}');
            const token = stored.access_token;
            if (token) {
              fetch('/api/players/startgg-stats?slug=' + encodeURIComponent(slug), { headers: { 'Authorization': 'Bearer ' + token } })
                .then(r => r.ok ? r.json() : null)
                .then(sg => { if (sg) setProfileStartggStats(sg); })
                .catch(() => {});
            }
          } catch {}
        }
      })
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

  const COMM_TAB_MAP = [
    { commId: 'afk',     modeId: 'ba',      label: 'AFK'      },
    { commId: 'inc',     modeId: 'inc',     label: 'INC'      },
    { commId: 'cordoba', modeId: 'cordoba', label: 'Córdoba'  },
    { commId: 'mendoza', modeId: 'mendoza', label: 'Mendoza'  },
    { commId: 'warui',   modeId: 'warui',   label: 'Warui'    },
    { commId: 'santafe', modeId: 'santafe', label: 'Santa Fe' },
  ];

  const MODES = [
    ...COMM_TAB_MAP.filter(t => enabledRankComms.includes(t.commId)).map(t => ({ id: t.modeId, label: t.label })),
    { id: 'char',      label: 'Personaje' },
    { id: 'ranked',    label: 'Ranked'    },
    { id: 'ranked2v2', label: '2v2'       },
  ];

  // Si el modo actual ya no es válido, saltar al primero disponible
  useEffect(() => {
    if (!MODES.find(m => m.id === mode)) {
      setMode(MODES[0]?.id || 'ranked');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledRankComms]);

  useEffect(() => {
    if (mode !== 'ranked' && mode !== 'ranked2v2') return;
    setRankLoading(true);
    const modeParam = mode === 'ranked2v2' ? '&mode=doubles' : '';
    fetch(`/api/ranked/leaderboard?platform=${rankPlat}${modeParam}`)
      .then(r => r.json())
      .then(d => {
        const players = Array.isArray(d?.players) ? d.players : (Array.isArray(d) ? d : []);
        setRankBoard(players);
        setRankTotal(d?.total || players.length);
        setRankLoading(false);
      })
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

  useEffect(() => {
    const commTab = COMM_TAB_MAP.find(t => t.modeId === mode);
    if (!commTab) return;
    const community = commTab.commId;
    setCommRanking(r => ({ ...r, loading: true }));
    setCommPage(1);
    fetch(`/api/community-ranking/get?community=${community}&year=${commYear}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setCommRanking({ players: d.players || [], tournaments: d.tournaments || [], loading: false, loaded: true });
        else   setCommRanking({ players: [], tournaments: [], loading: false, loaded: true });
      })
      .catch(() => setCommRanking({ players: [], tournaments: [], loading: false, loaded: true }));
  }, [mode, commYear]);

  return (
    <div>
      {/* --- MODAL SIN PERFIL --- */}
      {noProfileModal && (
        <div onClick={() => setNoProfileModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#15151F', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '28px 24px', maxWidth: 320, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>👤</div>
            <p style={{ margin: '0 0 6px', fontWeight: 900, fontSize: 16, color: '#fff' }}>{noProfileModal}</p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Este jugador no tiene perfil en La App sin H</p>
            <button onClick={() => setNoProfileModal(null)} style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 12, padding: '10px 28px', color: '#A78BFA', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Cerrar</button>
          </div>
        </div>
      )}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0D0D15', padding: '20px 18px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Rankings</h1>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Clasificaciones de la comunidad</p>

        {/* Pill switcher */}
        <div className="pill-switcher" style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, display: 'flex', gap: 4, marginBottom: 0, flexWrap: 'wrap' }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{
              flex: '1 1 auto', minWidth: 0, padding: '9px 6px', borderRadius: 10, fontWeight: 700, fontSize: 11,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: mode === m.id ? 'linear-gradient(135deg,#FF8C00,#E85D00)' : 'transparent',
              color: mode === m.id ? '#fff' : 'rgba(255,255,255,0.3)',
              boxShadow: mode === m.id ? '0 4px 12px rgba(232,142,0,0.3)' : 'none',
              whiteSpace: 'nowrap',
            }}>
            {m.label}
          </button>
        ))}
        </div>

        {/* Sub-selector de plataforma - sticky (ranked, 2v2 y personaje) */}
        {(mode === 'ranked' || mode === 'ranked2v2' || mode === 'char') && (
          <div style={{ display: 'flex', gap: 8, padding: '12px 0 0' }}>
            {[{ id: 'switch', label: '🎮 Switch Online' }, { id: 'parsec', label: '🖥️ Parsec' }].map(p => {
              const activeVal  = mode === 'char' ? charPlat  : rankPlat;
              const setActive  = mode === 'char'
                ? v => { setCharPlat(v); setCharSel(null); }
                : v => setRankPlat(v);
              return (
                <button key={p.id} onClick={() => setActive(p.id)} style={{
                  flex: 1, padding: '10px 4px', borderRadius: 12, fontWeight: 700, fontSize: 12,
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: activeVal === p.id ? 'rgba(232,142,0,0.1)' : '#10101A',
                  border: `1px solid ${activeVal === p.id ? 'rgba(232,142,0,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  color: activeVal === p.id ? '#FF8C00' : 'rgba(255,255,255,0.35)',
                }}>
                  {p.label}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ height: 25 }} />
      </div>

      <div style={{ padding: '0 18px' }}>
      {(mode === 'ranked' || mode === 'ranked2v2') ? (
        <>
          {mode === 'ranked2v2' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 18 }}>👥</span>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#A78BFA' }}>Ranked Dobles (2v2)</p>
            </div>
          )}

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
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', textAlign: 'center' }}>
                Mostrando 1 - {rankBoard.length} de {rankTotal}
              </p>
              {rankBoard.map((p, i) => (
                <RankedPlayerRow key={p.userId} position={i + 1} player={p} onPlayerClick={openProfile} />
              ))}
            </div>
          )}

        </>
      ) : mode !== 'char' ? (
        <>
          {/* Header con año y nombre de comunidad */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8, padding: '10px 18px' }}>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              {(() => { const t = COMM_TAB_MAP.find(x => x.modeId === mode); return t ? `📍 ${t.label}` : ''; })()}
            </p>
            {/* Selector de año */}
            <div style={{ display: 'flex', gap: 6 }}>
              {(() => {
                const cur = new Date().getFullYear();
                const years = [];
                for (let y = cur; y >= 2025; y--) years.push(String(y));
                return years.map(y => (
                  <button key={y} onClick={() => setCommYear(y)} style={{
                    padding: '6px 14px', borderRadius: 10, fontWeight: 700, fontSize: 12,
                    border: `1px solid ${commYear === y ? 'rgba(255,140,0,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: commYear === y ? 'rgba(255,140,0,0.18)' : 'rgba(255,255,255,0.04)',
                    color: commYear === y ? '#FF8C00' : 'rgba(255,255,255,0.25)',
                    boxShadow: commYear === y ? '0 2px 10px rgba(255,140,0,0.25)' : 'none',
                  }}>
                    {y}
                  </button>
                ));
              })()}
            </div>
          </div>

          {commRanking.loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Cargando ranking...</div>
          )}

          {!commRanking.loading && commRanking.loaded && commRanking.players.length === 0 && (
            <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '36px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🏆</div>
              <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 16, color: '#fff' }}>Ranking {(() => { const t = COMM_TAB_MAP.find(x => x.modeId === mode); return t ? t.label : ''; })()} {commYear}</p>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Los puntos se actualizarán después de cada torneo registrado en Start.GG</p>
              <div style={{ display: 'inline-flex', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)', borderRadius: 10, padding: '7px 16px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(234,179,8,0.6)', letterSpacing: '0.05em' }}>Próximamente</span>
              </div>
            </div>
          )}

          {!commRanking.loading && commRanking.players.length > 0 && (() => {
            const PAGE_SIZE = 100;
            const totalPages = Math.ceil(commRanking.players.length / PAGE_SIZE);
            const pageSlice  = commRanking.players.slice((commPage - 1) * PAGE_SIZE, commPage * PAGE_SIZE);
            return (
              <>
                {/* Contador */}
                <p style={{ margin: '0 0 10px', fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                  Mostrando {(commPage - 1) * PAGE_SIZE + 1} - {Math.min(commPage * PAGE_SIZE, commRanking.players.length)} de {commRanking.players.length}
                </p>

                {/* Lista estilo Ranked */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pageSlice.map(p => (
                    <CommPlayerRow
                      key={p.name}
                      position={p.position}
                      player={p}
                      onPlayerClick={openProfile}
                      onNoProfile={name => setNoProfileModal(name)}
                    />
                  ))}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
                      <button key={pg} onClick={() => setCommPage(pg)} style={{
                        padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer',
                        background: commPage === pg ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)',
                        color: commPage === pg ? '#A78BFA' : 'rgba(255,255,255,0.4)',
                      }}>
                        {(pg - 1) * PAGE_SIZE + 1}–{Math.min(pg * PAGE_SIZE, commRanking.players.length)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Info de torneos */}
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
                    {commRanking.tournaments.length} torneo{commRanking.tournaments.length !== 1 ? 's' : ''} registrado{commRanking.tournaments.length !== 1 ? 's' : ''}
                  </span>
                  {commRanking.tournaments.slice(-3).map(t => (
                    <span key={t.id} style={{
                      fontSize: 11, color: t.type === 'M' ? '#A78BFA' : '#60A5FA',
                      background: t.type === 'M' ? 'rgba(167,139,250,0.08)' : 'rgba(96,165,250,0.08)',
                      border: `1px solid ${t.type === 'M' ? 'rgba(167,139,250,0.2)' : 'rgba(96,165,250,0.2)'}`,
                      borderRadius: 6, padding: '2px 8px'
                    }}>{t.name}</span>
                  ))}
                </div>
              </>
            );
          })()}
        </>
      ) : (
        <>
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
              <div className="char-grid-5">
                {CHARACTERS.filter(c => c.name.toLowerCase().includes(charSearch.toLowerCase())).map(c => (
                  <button key={c.id} onClick={() => setCharSel(c.id)} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 12, padding: 4, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 4, boxSizing: 'border-box', width: '100%', minWidth: 0,
                  }}>
                    <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', borderRadius: 8, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                      <img src={charImgPath(c.img)} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    </div>
                    <p style={{ margin: 0, fontSize: 8, color: 'rgba(255,255,255,0.45)', fontWeight: 600, textAlign: 'center', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', minWidth: 0 }}>{c.name}</p>
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
                  {charBoard.map((p, i) => (
                    <RankedPlayerRow key={p.userId} position={i + 1} player={{ ...p, mainCharId: charSel }} onPlayerClick={openProfile} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {viewMatchDetail && <MatchDetail match={viewMatchDetail.match} viewingId={viewMatchDetail.viewingId} onClose={() => setViewMatchDetail(null)} />}

      {/* --- MODAL PERFIL JUGADOR (Rankings) --- */}
      {viewProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#0B0B12', zIndex: 9999, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          {/* Sticky top bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'rgba(11,11,18,0.95)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setViewProfile(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={18} height={18}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            </button>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 16, flex: 1 }}>{viewProfile.userName}</p>
          </div>

          {profileLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>Cargando perfil…</p>
            </div>
          ) : profileData ? (
            <div style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
              {/* Hero banner */}
              {(() => {
                const heroCharSrc = (() => {
                  if (profileData.profile?.mainCharAlt) return profileData.profile.mainCharAlt;
                  const mc = profileData.profile?.mainChar;
                  if (mc && CHARACTER_RENDERS[mc]) return charRenderPath(CHARACTER_RENDERS[mc]);
                  const hist = profileData.history || [];
                  if (hist.length) {
                    const counts = {};
                    for (const m of hist) {
                      const cid = String(m.winnerId) === String(viewProfile.userId) ? m.winnerCharId : m.loserCharId;
                      if (cid) counts[cid] = (counts[cid] || 0) + 1;
                    }
                    let best = null, max = 0;
                    for (const [id, c] of Object.entries(counts)) { if (c > max) { max = c; best = id; } }
                    if (best && CHARACTER_RENDERS[best]) return charRenderPath(CHARACTER_RENDERS[best]);
                  }
                  const rc = profileData.recentChars?.[0];
                  if (rc && CHARACTER_RENDERS[rc]) return charRenderPath(CHARACTER_RENDERS[rc]);
                  return null;
                })();
                return (
                  <div style={{ position: 'relative', background: '#1a1a1a', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10 }}>
                    {heroCharSrc ? (
                      <img src={heroCharSrc} alt="" style={{ display: 'block', height: 180, objectFit: 'contain', position: 'relative', zIndex: 1 }} onError={e => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div style={{ height: 100 }} />
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, #1a1a1a, transparent)', zIndex: 2, pointerEvents: 'none' }} />
                    <p style={{ margin: 0, padding: '8px 18px 16px', fontSize: 26, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', textAlign: 'center', lineHeight: 1, position: 'relative', zIndex: 3 }}>{viewProfile.userName}</p>
                  </div>
                );
              })()}

              <div style={{ padding: '0 18px 40px' }}>
                {/* Estadísticas */}
                {(() => {
                  const sw1 = profileData.stats?.switch || {}; const pc1 = profileData.stats?.parsec || {};
                  const sw2 = profileData.doublesStats?.switch || {}; const pc2 = profileData.doublesStats?.parsec || {};
                  const tW = (sw1.wins||0)+(pc1.wins||0)+(sw2.wins||0)+(pc2.wins||0);
                  const tL = (sw1.losses||0)+(pc1.losses||0)+(sw2.losses||0)+(pc2.losses||0);
                  const tT = tW+tL; const wr = tT > 0 ? Math.round((tW/tT)*100) : 0;
                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '22px 0 12px' }}>
                        <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#22C55E,#16A34A)', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Estadísticas</p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                        {[
                          { label: 'Victorias', value: tW, color: '#22C55E' },
                          { label: 'Derrotas', value: tL, color: '#EF4444' },
                          { label: 'Partidas', value: tT, color: '#fff' },
                          { label: 'W/R', value: wr + '%', color: '#F59E0B' },
                        ].map(st => (
                          <div key={st.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                            <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: st.color }}>{st.value}</p>
                            <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{st.label}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}

                {/* Resumen Start.GG */}
                {profileStartggStats && profileStartggStats.charUsage && profileStartggStats.charUsage.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#F5C518,#D4A017)', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>🏆 Resumen</p>
                      </div>
                      <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>Start.GG · {profileStartggStats.totalSets} sets</p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
                      {profileStartggStats.charUsage.slice(0, 3).map((ch, i) => {
                        const localId = ch.localCharId;
                        const charObj = localId ? CHARACTERS.find(c => c.id === localId) : null;
                        const renderFile = localId ? CHARACTER_RENDERS[localId] : null;
                        const isTop = i === 0;
                        const charWR = ch.games > 0 ? Math.round(ch.wins * 100 / ch.games) : 0;
                        const barColors = ['#F5C518', '#818CF8', '#22C55E', '#F97316', '#EF4444'];
                        const barColor = barColors[i % barColors.length];
                        return (
                          <div key={ch.startggCharId} onClick={() => setSelectedCharRank(ch.startggCharId)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isTop ? '10px 14px 10px 6px' : '9px 14px', borderBottom: i < Math.min(profileStartggStats.charUsage.length, 3) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', background: isTop ? 'linear-gradient(90deg,rgba(245,197,24,0.10),transparent)' : 'transparent', cursor: 'pointer', transition: 'background 0.2s' }}>
                            {renderFile ? (
                              <img src={charRenderPath(renderFile)} alt="" style={{ width: isTop ? 52 : 36, height: isTop ? 52 : 36, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                            ) : charObj ? (
                              <img src={charImgPath(charObj.img)} alt="" style={{ width: isTop ? 44 : 32, height: isTop ? 44 : 32, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                            ) : (
                              <div style={{ width: isTop ? 44 : 32, height: isTop ? 44 : 32, flexShrink: 0, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>?</span>
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <p style={{ margin: 0, fontSize: isTop ? 13 : 11, fontWeight: 700, color: isTop ? '#fff' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {charObj?.name || ch.charName || `#${ch.startggCharId}`}
                                </p>
                                <p style={{ margin: 0, fontSize: isTop ? 15 : 12, fontWeight: 900, color: barColor, flexShrink: 0, marginLeft: 8 }}>{ch.usage}%</p>
                              </div>
                              <div style={{ height: isTop ? 6 : 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: ch.usage + '%', height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                                <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{ch.games} games</p>
                                <p style={{ margin: 0, fontSize: 9, color: charWR >= 50 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)', fontWeight: 700 }}>{charWR}% WR ({ch.wins}W-{ch.games - ch.wins}L)</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedCharRank && (() => {
                      const ch = profileStartggStats.charUsage.find(c => c.startggCharId === selectedCharRank);
                      return ch ? <CharacterDetail ch={ch} onClose={() => { setSelectedCharRank(null); setCharFromModalRank(false); }} onBack={charFromModalRank ? () => { setSelectedCharRank(null); setShowCharsModalRank(true); } : undefined} /> : null;
                    })()}

                    {profileStartggStats.charUsage.length > 3 && (
                      <button onClick={() => setShowCharsModalRank(true)} style={{ width: '100%', padding: '8px', marginTop: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Ver todos ({profileStartggStats.charUsage.length})
                      </button>
                    )}

                    {showCharsModalRank && (
                      <div onClick={() => setShowCharsModalRank(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '80vh', background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'slideUp .25s ease-out' }}>
                          <div onClick={() => setShowCharsModalRank(false)} onTouchStart={e => { e.currentTarget.dataset.ty = e.touches[0].clientY; }} onTouchEnd={e => { if (e.changedTouches[0].clientY - Number(e.currentTarget.dataset.ty||0) > 30) setShowCharsModalRank(false); }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 0', cursor: 'pointer', userSelect: 'none' }}>
                            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.22)' }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#fff' }}>Todos los personajes</p>
                            <button onClick={() => setShowCharsModalRank(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
                          </div>
                          <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                            {profileStartggStats.charUsage.map((ch, i) => {
                              const localId = ch.localCharId;
                              const charObj = localId ? CHARACTERS.find(c => c.id === localId) : null;
                              const renderFile = localId ? CHARACTER_RENDERS[localId] : null;
                              const cWR = ch.games > 0 ? Math.round(ch.wins * 100 / ch.games) : 0;
                              const barColor = ['#F5C518','#818CF8','#22C55E','#F97316','#EF4444'][i % 5];
                              return (
                                <div key={ch.startggCharId} onClick={() => { setShowCharsModalRank(false); setCharFromModalRank(true); setSelectedCharRank(ch.startggCharId); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}>
                                  {renderFile ? <img src={charRenderPath(renderFile)} alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                                    : charObj ? <img src={charImgPath(charObj.img)} alt="" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} />
                                    : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{charObj?.name || ch.charName}</p>
                                      <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: barColor, flexShrink: 0, marginLeft: 8 }}>{ch.usage}%</p>
                                    </div>
                                    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                                      <div style={{ width: ch.usage + '%', height: '100%', background: barColor, borderRadius: 2 }} />
                                    </div>
                                    <p style={{ margin: '2px 0 0', fontSize: 9, color: cWR >= 50 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)', fontWeight: 700 }}>{ch.games}g · {cWR}% WR</p>
                                  </div>
                                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>›</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      {[
                        { label: 'Win Rate', value: profileStartggStats.winRate + '%', color: '#F5C518' },
                        { label: 'Ganados',  value: profileStartggStats.wins,          color: '#22C55E' },
                        { label: 'Perdidos', value: profileStartggStats.losses,        color: '#EF4444' },
                        { label: 'Torneos',  value: profileStartggStats.tournaments,   color: '#818CF8' },
                      ].map(st => (
                        <div key={st.label} style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: st.color }}>{st.value}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontWeight: 700 }}>{st.label}</p>
                        </div>
                      ))}
                    </div>

                    {profileStartggStats.stageUsage && profileStartggStats.stageUsage.length > 0 && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
                          <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#818CF8,#6366F1)', flexShrink: 0 }} />
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Stages</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                          {profileStartggStats.stageUsage.slice(0, 3).map((st, idx) => (
                            <div key={st.stageId} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
                              {st.image && <img src={st.image} alt="" style={{ width: '100%', height: 55, objectFit: 'cover', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />}
                              {!st.image && <div style={{ width: '100%', height: 55, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '0 4px' }}>{st.name}</span></div>}
                              <div style={{ padding: '5px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>#{idx + 1}</span>
                                <span style={{ fontSize: 11, fontWeight: 900, color: '#fff' }}>{st.usage}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {profileStartggStats.highlights && profileStartggStats.highlights.length > 0 && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
                          <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#F97316,#EA580C)', flexShrink: 0 }} />
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Highlights</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                          {profileStartggStats.highlights.slice(0, 9).map((h, hi) => {
                            const isTop3 = h.placement <= 3;
                            const placementColor = h.placement === 1 ? '#F5C518' : h.placement === 2 ? '#C0C0C0' : h.placement === 3 ? '#CD7F32' : '#fff';
                            return (
                              <div key={hi} onClick={() => h.eventSlug && window.open(h.eventSlug, '_blank')} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isTop3 ? 'rgba(245,197,24,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 12, padding: '8px', cursor: h.eventSlug ? 'pointer' : 'default', overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                                  {h.tournamentImage && <img src={h.tournamentImage} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />}
                                  <p style={{ margin: 0, fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{h.tournament}</p>
                                </div>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: placementColor }}>
                                  {h.placement}<sup style={{ fontSize: 8 }}>{h.placement === 1 ? 'ST' : h.placement === 2 ? 'ND' : h.placement === 3 ? 'RD' : 'TH'}</sup>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>/{h.entrants}</span>
                                </p>
                                <p style={{ margin: '2px 0 0', fontSize: 8, color: 'rgba(255,255,255,0.25)' }}>
                                  {h.date ? new Date(h.date).toLocaleDateString('es', { month: 'short', day: 'numeric', year: '2-digit' }) : ''}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Ranked 1v1 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
                  <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#FF8C00,#E85D00)', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>⚔️ Ranked</p>
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  {['switch', 'parsec'].map(plat => {
                    const s = profileData.stats?.[plat] || {};
                    const wins = s.wins || 0; const losses = s.losses || 0; const total = wins + losses;
                    const rankName = s.rank || 'Plástico 1'; const rp = s.rankedPoints || 0;
                    const isUnranked = total === 0; const inPlacement = !s?.placementDone && !isUnranked;
                    const rankObj = RANKS.find(r => r.name === rankName) || RANKS[0];
                    const tierIcon = rankObj ? (TIER_ICONS[rankObj.tier] || '??') : '?';
                    const rankColor = rankObj?.color || '#9CA3AF';
                    const pColor = plat === 'switch' ? '#EF4444' : '#8B5CF6';
                    return (
                      <div key={plat} style={{ flex: 1, background: isUnranked ? 'rgba(255,255,255,0.03)' : inPlacement ? 'rgba(255,140,0,0.04)' : `linear-gradient(135deg, ${rankColor}14 0%, transparent 65%)`, border: `1px solid ${isUnranked ? 'rgba(255,255,255,0.07)' : inPlacement ? 'rgba(255,140,0,0.2)' : rankColor + '35'}`, borderRadius: 20, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: pColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{plat === 'switch' ? '🎮 Switch' : '🖥️ Parsec'}</p>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: (isUnranked || inPlacement) ? 'rgba(255,255,255,0.05)' : `${rankColor}18`, border: `2px solid ${(isUnranked || inPlacement) ? 'rgba(255,255,255,0.1)' : rankColor + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                          {(isUnranked || inPlacement) ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 20 }}>?</span> : tierIcon}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: isUnranked ? 'rgba(255,255,255,0.2)' : inPlacement ? '#FF8C00' : rankColor }}>
                          {isUnranked ? 'UNRANKED' : inPlacement ? 'POSICIONAMIENTO' : rankName}
                        </p>
                        {inPlacement && (
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: '80%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <div style={{ width: `${(total / PLACEMENT_TOTAL) * 100}%`, height: '100%', borderRadius: 2, background: '#FF8C00' }} />
                            </div>
                            <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: '#FF8C00' }}>{total}/{PLACEMENT_TOTAL}</p>
                          </div>
                        )}
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{wins}W · {losses}L</p>
                      </div>
                    );
                  })}
                </div>

                {/* Ranked 2v2 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
                  <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#A78BFA,#7C3AED)', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>👥 Ranked 2v2</p>
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  {['switch', 'parsec'].map(plat => {
                    const s = profileData.doublesStats?.[plat] || {};
                    const wins = s.wins || 0; const losses = s.losses || 0; const total = wins + losses;
                    const rankName = s.rank || 'Plástico 1'; const rp = s.rankedPoints || 0;
                    const isUnranked = total === 0; const inPlacement = !s?.placementDone && !isUnranked;
                    const rankObj = RANKS.find(r => r.name === rankName) || RANKS[0];
                    const tierIcon = rankObj ? (TIER_ICONS[rankObj.tier] || '??') : '?';
                    const rankColor = rankObj?.color || '#9CA3AF';
                    return (
                      <div key={plat} style={{ flex: 1, background: isUnranked ? 'rgba(255,255,255,0.03)' : inPlacement ? 'rgba(124,58,237,0.04)' : `linear-gradient(135deg, ${rankColor}14 0%, transparent 65%)`, border: `1px solid ${isUnranked ? 'rgba(255,255,255,0.07)' : inPlacement ? 'rgba(124,58,237,0.2)' : rankColor + '35'}`, borderRadius: 20, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: plat === 'switch' ? '#EF4444' : '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>2V2 {plat === 'switch' ? '🎮 Switch' : '🖥️ Parsec'}</p>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: (isUnranked || inPlacement) ? 'rgba(255,255,255,0.05)' : `${rankColor}18`, border: `2px solid ${(isUnranked || inPlacement) ? 'rgba(255,255,255,0.1)' : rankColor + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                          {(isUnranked || inPlacement) ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 20 }}>?</span> : tierIcon}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: isUnranked ? 'rgba(255,255,255,0.2)' : inPlacement ? '#A78BFA' : rankColor }}>
                          {isUnranked ? 'UNRANKED' : inPlacement ? 'POSICIONAMIENTO' : rankName}
                        </p>
                        {inPlacement && (
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: '80%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <div style={{ width: `${(total / PLACEMENT_TOTAL) * 100}%`, height: '100%', borderRadius: 2, background: '#7C3AED' }} />
                            </div>
                            <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: '#A78BFA' }}>{total}/{PLACEMENT_TOTAL}</p>
                          </div>
                        )}
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{wins}W · {losses}L</p>
                      </div>
                    );
                  })}
                </div>

                {/* Historial */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px' }}>
                  <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#FF8C00,#E85D00)', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>📋 Historial</p>
                </div>
                <ProfileHistorySection
                  history={profileData.history || []}
                  histFilter={profileHistFilter}
                  setHistFilter={setProfileHistFilter}
                  histExpanded={profileHistExpanded}
                  setHistExpanded={setProfileHistExpanded}
                  viewedUserId={viewProfile.userId}
                  setViewMatchDetail={setViewMatchDetail}
                  rankStats={profileData.stats}
                />
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No se pudo cargar el perfil</p>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB — TORNEOS
═══════════════════════════════════════════════════ */
// Componente contador de tiempo transcurrido (para torneos iniciados)
function ElapsedTimer({ startAt }) {
  const [elapsed, setElapsed] = useState(() => Math.max(0, Math.floor((Date.now() - new Date(startAt).getTime()) / 1000)));
  useEffect(() => {
    const iv = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startAt).getTime()) / 1000)));
    }, 1000);
    return () => clearInterval(iv);
  }, [startAt]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return <>{h}h {String(m).padStart(2,'0')}m</>;
  return <>{m}m {String(s).padStart(2,'0')}s</>;
}

function TabTorneos({ user }) {
  const [startggTorneos, setStartggTorneos] = useState([]);
  const [startggLoading, setStartggLoading] = useState(true);
  const [enrolledEvents, setEnrolledEvents] = useState({}); // { eventId: true/false }

  // Carga y normaliza torneos
  const loadTorneos = (showLoading = false) => {
    if (showLoading) setStartggLoading(true);
    Promise.all([
      fetch('/api/tournaments/featured').then(r => r.json()).catch(() => ({ featured: [] })),
      fetch('/api/tournaments/sync-startgg').then(r => r.json()).catch(() => ({ tournaments: [] })),
    ]).then(([featuredData, syncData]) => {
      const featured = Array.isArray(featuredData.featured) ? featuredData.featured.map(t => ({ ...t, _featured: true })) : [];
      const synced   = Array.isArray(syncData.tournaments) ? syncData.tournaments : [];
      const featuredSlugs = new Set(featured.map(t => t.slug));
      const merged = [...featured, ...synced.filter(t => !featuredSlugs.has(t.slug))];
      const _now = new Date();
      const _4d = 4 * 24 * 60 * 60 * 1000;
      const filtered = merged.filter(t => {
        const fin = t.state === 3 || t.state === 4 || t.state === 'COMPLETED' || t.state === 'CANCELLED';
        if (!fin) return true;
        return (_now - new Date(t.endAt || t.startAt || 0)) < _4d;
      });
      filtered.sort((a, b) => {
        const aF = a.state === 3 || a.state === 4 || a.state === 'COMPLETED' || a.state === 'CANCELLED';
        const bF = b.state === 3 || b.state === 4 || b.state === 'COMPLETED' || b.state === 'CANCELLED';
        return aF === bF ? 0 : aF ? 1 : -1;
      });
      setStartggTorneos(filtered);
    }).finally(() => setStartggLoading(false));
  };

  useEffect(() => {
    loadTorneos(true);
    // Polling cada 30 segundos para reflejar cambios sin que el usuario recargue
    const iv = setInterval(() => loadTorneos(false), 30000);
    return () => clearInterval(iv);
  }, []);

  // Check enrollment for each event
  useEffect(() => {
    if (!user?.slug || startggTorneos.length === 0) return;
    const userSlug = user.slug;
    const allEvents = startggTorneos.flatMap(t => (t.events || []).map(e => e.id));
    allEvents.forEach(eventId => {
      if (enrolledEvents[eventId] !== undefined) return;
      fetch(`/api/tournaments/entrants?eventId=${eventId}`)
        .then(r => r.json())
        .then(d => {
          const isEnrolled = (d.entrants || []).some(e => e.slug === userSlug);
          setEnrolledEvents(prev => ({ ...prev, [eventId]: isEnrolled }));
        })
        .catch(() => {});
    });
  }, [user?.slug, startggTorneos]);

  const formatStartggDate = (iso) => {
    if (!iso) return 'Fecha por confirmar';
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ padding: '24px 18px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Torneos</h1>
      <p style={{ margin: '0 0 22px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Publicados en Start.GG</p>

      {startggLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2].map(i => (
            <div key={i} style={{ background: '#10101A', borderRadius: 18, padding: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="shimmer" style={{ height: 14, width: '70%', borderRadius: 7, marginBottom: 10 }} />
              <div className="shimmer" style={{ height: 10, width: '40%', borderRadius: 5 }} />
            </div>
          ))}
        </div>
      ) : startggTorneos.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {startggTorneos.map(t => {
            const _isActive = t.state === 2 || t.state === 'ACTIVE';
            const _isStarted = _isActive || (t.startAt && new Date(t.startAt) <= new Date());
            const _isFinished = t.state === 3 || t.state === 4 || t.state === 'COMPLETED' || t.state === 'CANCELLED';
            return (
            <div key={t.id || t.slug} style={{ background: '#10101A', border: t._featured ? '1px solid rgba(255,140,0,0.35)' : '1px solid rgba(232,142,0,0.15)', borderRadius: 18, overflow: 'hidden', opacity: _isFinished ? 0.65 : 1 }}>
              {t.image && (
                <div style={{ height: 100, background: `url(${t.image}) center/cover no-repeat`, borderBottom: '1px solid rgba(255,255,255,0.05)' }} />
              )}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,rgba(232,142,0,0.25),rgba(232,80,0,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏆</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                      {t._featured && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', background: 'rgba(255,140,0,0.2)', color: '#FF8C00', borderRadius: 5, flexShrink: 0 }}>DEST.</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>📅 {formatStartggDate(t.startAt)}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {(() => {
                    if (_isFinished) return (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', padding: '3px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>✔️ Finalizado</span>
                    );
                    if (_isStarted) return (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#FF8C00', padding: '3px 8px', background: 'rgba(232,142,0,0.12)', border: '1px solid rgba(232,142,0,0.25)', borderRadius: 8 }}>
                        🚀 En curso{t.startAt ? <> · <ElapsedTimer startAt={t.startAt} /></> : ''}
                      </span>
                    );
                    if (t.registrationOpen) return (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#34D399', padding: '3px 8px', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 8 }}>✅ Inscripciones abiertas</span>
                    );
                    return null;
                  })()}
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', padding: '3px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>👥 {t.attendees} inscriptos</span>
                </div>
                {(t.events || []).map(e => {
                  const eventUrl = e.slug ? `https://www.start.gg/${e.slug}` : t.url;
                  const registerUrl = e.slug ? `https://www.start.gg/${e.slug}/register` : `${t.url}/register`;
                  const enrolled = enrolledEvents[e.id];
                  const checked = enrolled !== undefined;
                  return (
                    <div key={e.id} style={{ marginTop: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '10px 12px' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{e.name}</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <a href={eventUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', fontSize: 12, fontWeight: 700, color: '#fff', padding: '6px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 }}>Ver evento ↗</a>
                        {checked && enrolled ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#818CF8', padding: '6px 14px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10 }}>🎟️ Inscrito</span>
                        ) : !_isStarted && !_isFinished && t.registrationOpen ? (
                          <a href={registerUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', fontSize: 12, fontWeight: 700, color: '#fff', padding: '6px 14px', background: 'linear-gradient(135deg,#E88E00,#E85000)', borderRadius: 10 }}>📝 Inscribirse</a>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '44px 24px', textAlign: 'center' }}>
          <span style={{ fontSize: 44 }}>📋</span>
          <p style={{ margin: '14px 0 6px', fontWeight: 800, fontSize: 16, color: '#fff' }}>Sin torneos activos</p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Los torneos de Start.GG van a aparecer acá automáticamente</p>
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
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '7px 10px', color: '#EF4444', fontSize: 11, cursor: 'pointer' }}>? Quitar media</button>
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sugCategory, setSugCategory] = useState('Mejora');
  const [sugMessage, setSugMessage]   = useState('');
  const [sugSending, setSugSending]   = useState(false);
  const [sugResult, setSugResult]     = useState(null);

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

  // Navegación nativa: pushState al entrar al detalle, popstate para volver
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (selected) {
      window.history.pushState({ tipsDetail: selected }, '', window.location.href);
    }
  }, [selected]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = (e) => {
      if (selected) {
        setSelected(null);
        setShowForm(false);
        setTips([]);
        setSubmitResult(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [selected]);

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
    <div style={{ padding: '0 18px 24px' }}>
      {/* Sticky header: título + buscador */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0B0B12', padding: '24px 0 12px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Tips</h1>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Elegí un personaje · {CHARS.length} disponibles</p>

        {/* Search */}
        <div style={{ position: 'relative' }}>
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
      </div>{/* /sticky header */}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <span style={{ fontSize: 32 }}>🔍</span>
          <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>Sin resultados para "{query}"</p>
        </div>
      ) : (
        <div className="tips-grid">
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

      {/* Botón sugerencias */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => { setShowSuggestions(true); setSugResult(null); }} style={{ width: '100%', padding: '13px', borderRadius: 16, border: '1px solid rgba(167,139,250,0.25)', background: 'rgba(167,139,250,0.07)', color: '#A78BFA', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          💬 Dejar una sugerencia
        </button>
      </div>

      {/* Modal sugerencias */}
      {showSuggestions && (
        <div onClick={() => setShowSuggestions(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#0F0F1A', borderRadius: '24px 24px 0 0', padding: '0 0 32px' }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff' }}>💬 Sugerencias</p>
              <button onClick={() => setShowSuggestions(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '20px 20px 0' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Tu nombre</p>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{currentUserName}</p>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Categoría</p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                {['Bug', 'Mejora', 'Nueva función', 'Otro'].map(cat => (
                  <button key={cat} onClick={() => setSugCategory(cat)} style={{ padding: '6px 12px', borderRadius: 10, border: `1px solid ${sugCategory === cat ? '#A78BFA' : 'rgba(255,255,255,0.1)'}`, background: sugCategory === cat ? 'rgba(167,139,250,0.15)' : 'transparent', color: sugCategory === cat ? '#A78BFA' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{cat}</button>
                ))}
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Mensaje</p>
              <textarea
                placeholder="Contanos tu sugerencia..."
                value={sugMessage}
                onChange={e => setSugMessage(e.target.value)}
                rows={4}
                style={{ width: '100%', background: '#10101A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#fff', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              {sugResult?.error && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#EF4444' }}>{sugResult.error}</p>}
              {sugResult?.ok && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#34D399' }}>¡Gracias por tu sugerencia! ?</p>}
              <button
                onClick={async () => {
                  if (!sugMessage.trim()) { setSugResult({ error: 'Escribí algo antes de enviar' }); return; }
                  setSugSending(true); setSugResult(null);
                  try {
                    const r = await fetch('/api/suggestions', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: currentUserId, userName: currentUserName, category: sugCategory, message: sugMessage.trim() }),
                    });
                    const data = await r.json();
                    if (!r.ok) { setSugResult({ error: data.error || 'Error al enviar' }); return; }
                    setSugResult({ ok: true }); setSugMessage('');
                    setTimeout(() => setShowSuggestions(false), 1500);
                  } catch { setSugResult({ error: 'Error de conexión' }); }
                  finally { setSugSending(false); }
                }}
                disabled={sugSending}
                style={{ marginTop: 14, width: '100%', padding: '13px', borderRadius: 16, border: 'none', background: sugSending ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg,#A78BFA,#7C3AED)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: sugSending ? 'not-allowed' : 'pointer' }}
              >
                {sugSending ? '⏳ Enviando…' : '📨 Enviar sugerencia'}
              </button>
            </div>
          </div>
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
  'Hollow Bastion': '🏰', 'Kalos Pokémon League': '⚡',
  'Yoshi\'s Story': '🥚', 'Lylat Cruise': '🚀', 'Fountain of Dreams': '⛲',
  'Northern Cave': '🌑',
};

function fmtElapsed(s) { return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; }

/* --- CharPicker ----------------------------------------------------------- */
function CharPicker({ selected, onSelect, platform, userId, prefKey }) {
  // - Estado persistido: personajes usados recientemente -
  const [recentIds, setRecentIds] = useState([]);

  // Personajes preferidos del usuario para este contexto (configuración)
  const prefChars = (() => {
    if (!prefKey) return [];
    try { return JSON.parse(localStorage.getItem(prefKey) || '[]'); } catch { return []; }
  })();

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

  // - Estado interno del picker -
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

  // -- Vista colapsada (personaje ya elegido) ------------------------------
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

  // -- Vista expandida (picker) --------------------------------------------
  const recents = recentIds.map(id => CHARACTERS.find(c => c.id === id)).filter(Boolean);
  // Preferidos: excluir los que ya están en recents para no duplicar
  const prefCharObjs = prefChars
    .map(id => CHARACTERS.find(c => c.id === id)).filter(Boolean);
  const filtered = CHARACTERS.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {/* Personajes preferidos (de Configuración) */}
      {prefCharObjs.length > 0 && !search && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,140,0,0.6)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>⚙️ Mis personajes</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {prefCharObjs.map(c => (
              <button
                key={c.id}
                onClick={() => selected === c.id ? setExpanded(false) : onSelect(c.id)}
                title={c.name}
                style={{
                  background: selected === c.id ? 'rgba(255,140,0,0.15)' : 'rgba(255,140,0,0.06)',
                  border: selected === c.id ? '2px solid #FF8C00' : '1px solid rgba(255,140,0,0.25)',
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
      {recents.length > 0 && !search && prefCharObjs.length === 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Últimos jugados</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {recents.map(c => (
              <button
                key={c.id}
                onClick={() => selected === c.id ? setExpanded(false) : onSelect(c.id)}
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
      <div className="char-grid-5" style={{ maxHeight: 220, overflowY: 'auto' }}>
        {filtered.map(c => (
          <button
            key={c.id}
            onClick={() => selected === c.id ? setExpanded(false) : onSelect(c.id)}
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

function TabMatch({ bgMM, setBgMM, userId, userName, user }) {
  const uid = userId || '';
  const uName = userName || 'Jugador';

  const p = bgMM?.plat ? PLATFORMS.find(x => x.id === bgMM.plat) : null;
  const matchData = bgMM?.room;
  const matchStatus = bgMM?.status;

  // Restaurar personaje de búsqueda al remontar (cambio de tab, F5)
  useEffect(() => {
    if (bgMM?.charId && !searchChar) {
      setSearchChar(bgMM.charId);
      setSearchSkin(bgMM.charAlt || 1);
    }
  }, [bgMM?.charId, bgMM?.charAlt]); // eslint-disable-line

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState('');
  const [chatSending, setChatSending]   = useState(false);
  const chatBottomRef = useRef(null);

  // Polling de chat
  useEffect(() => {
    if (!matchData?.matchId || !['active','pending_confirm','disputed'].includes(matchStatus)) return;
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

  // Reset inter-game char picker cuando cambia el game
  useEffect(() => {
    setInterGameCharConfirmed(false);
    setInterGameCharId(null);
    setInterGameCharAlt(1);
  }, [matchData?.matchId, matchData?.currentGame]);

  // Timers AFK / ban / confirm
  const [banTimeLeft, setBanTimeLeft]         = useState(null);
  const [confirmTimeLeft, setConfirmTimeLeft] = useState(null);
  const [chatAfkTimeLeft, setChatAfkTimeLeft] = useState(null);
  const autoConfirmFiredRef = useRef(false);
  const chatAfkFiredRef     = useRef(false);
  const banAutoFiredRef     = useRef(null);

  // Constantes de timers
  const BAN_TURN_SECONDS     = 25;
  const CONFIRM_TIMEOUT_SECS = 60;
  const CHAT_AFK_SECS        = 900; // 15 min

  // -- Timer de ban/pick (cuenta regresiva 25s) --------------
  useEffect(() => {
    if (matchStatus !== 'banning' || !matchData?.banTurnStartedAt) { setBanTimeLeft(null); return; }
    const update = () => {
      const left = Math.max(0, BAN_TURN_SECONDS - (Date.now() - new Date(matchData.banTurnStartedAt).getTime()) / 1000);
      setBanTimeLeft(Math.ceil(left));
    };
    update();
    const iv = setInterval(update, 500);
    return () => clearInterval(iv);
  }, [matchStatus, matchData?.banTurnStartedAt]); // eslint-disable-line

  // -- Auto-ban/pick cuando el timer llega a 0 (lado cliente) -
  useEffect(() => {
    if (banTimeLeft !== 0 || !matchData || banAutoFiredRef.current === matchData.banTurnStartedAt) return;
    const phase = matchData.banPhase;
    const j1 = matchData.j1; const j2 = matchData.j2;
    const prevWinnerId = matchData.games?.[matchData.games.length - 1]?.result?.winnerId;
    const isMyTurn =
      (phase === 'j1_ban'    && j1 === uid) ||
      (phase === 'j2_ban'    && j2 === uid) ||
      (phase === 'j1_pick'   && j1 === uid) ||
      (phase === 'winner_ban' && prevWinnerId === uid) ||
      (phase === 'loser_pick' && prevWinnerId !== uid);
    if (!isMyTurn) return;
    banAutoFiredRef.current = matchData.banTurnStartedAt;
    const isGame1 = (matchData.currentGame || 1) === 1;
    const STAGES  = isGame1 ? BAN_STAGES_G1 : BAN_STAGES_G2;
    const allBanned = Object.values(matchData.bans || {}).flat();
    const available = STAGES.filter(s => !allBanned.includes(s));
    if (phase === 'j1_pick' || phase === 'loser_pick') {
      const random = available[Math.floor(Math.random() * available.length)];
      if (random) pickStage(random);
    } else {
      const count = phase === 'j1_ban' ? 1 : phase === 'j2_ban' ? 2 : 3;
      const j1b = (matchData.bans || {})[j1] || [];
      const pool = phase === 'j2_ban' ? available.filter(s => !j1b.includes(s)) : available;
      const randomBans = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
      if (randomBans.length === count) submitBans(randomBans);
    }
  }, [banTimeLeft]); // eslint-disable-line

  // -- Timer de confirmación de resultado (1 min) ------------
  useEffect(() => {
    if (matchStatus !== 'pending_confirm' || !matchData?.pendingResult?.reportedAt) { setConfirmTimeLeft(null); return; }
    const update = () => setConfirmTimeLeft(Math.max(0, Math.ceil(CONFIRM_TIMEOUT_SECS - (Date.now() - new Date(matchData.pendingResult.reportedAt).getTime()) / 1000)));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [matchStatus, matchData?.pendingResult?.reportedAt]); // eslint-disable-line

  // -- Auto-confirmar cuando el servidor lo señala -----------
  useEffect(() => {
    if (!bgMM?.autoConfirmSignal || autoConfirmFiredRef.current) return;
    const pending = matchData?.pendingResult;
    if (!pending || pending.reporterId === uid) return;
    autoConfirmFiredRef.current = true;
    reportResult(pending.winnerId, pending.stocks, 'confirm');
  }, [bgMM?.autoConfirmSignal]); // eslint-disable-line

  // -- Timer AFK de chat (15 min) ----------------------------
  useEffect(() => {
    if (!['active','pending_confirm','disputed'].includes(matchStatus) || !matchData?.activeAt) { setChatAfkTimeLeft(null); return; }
    const opp = uid === matchData.host?.userId ? matchData.guest : matchData.host;
    const myPresent  = !!(matchData.chatPresence?.[uid]);
    const oppPresent = !!(matchData.chatPresence?.[opp?.userId]);
    if (myPresent && oppPresent) { setChatAfkTimeLeft(null); return; }
    const update = () => setChatAfkTimeLeft(Math.max(0, Math.ceil(CHAT_AFK_SECS - (Date.now() - new Date(matchData.activeAt).getTime()) / 1000)));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [matchStatus, matchData?.activeAt, matchData?.chatPresence, uid]); // eslint-disable-line

  // -- Reclamar victoria AFK cuando el servidor lo autoriza -
  useEffect(() => {
    if (bgMM?.chatAfkWinId !== uid || chatAfkFiredRef.current || !matchData?.matchId) return;
    chatAfkFiredRef.current = true;
    (async () => {
      try {
        const r = await fetch('/api/matchmaking/result', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: matchData.matchId, reportingUserId: uid, claimedWinnerId: uid, stocksWon: 1, action: 'afk_win' }),
        });
        const data = await r.json();
        if (r.ok) {
          if (typeof data.rpDelta === 'number') setMatchRpDelta(data.rpDelta);
          if (typeof data.loserRpDelta === 'number') setMatchLoserRpDelta(data.loserRpDelta);
          if (data.winnerRankChange) setMatchWinnerRankChange(data.winnerRankChange);
          if (data.loserRankChange) setMatchLoserRankChange(data.loserRankChange);
          setBgMM(prev => prev ? { ...prev, status: 'finished', room: { ...prev.room, status: 'finished', result: data.result } } : prev);
        }
      } catch {}
    })();
  }, [bgMM?.chatAfkWinId]); // eslint-disable-line

  // -- Reset refs cuando cambia el match --------------------
  useEffect(() => {
    autoConfirmFiredRef.current = false;
    chatAfkFiredRef.current = false;
    banAutoFiredRef.current = null;
  }, [matchData?.matchId]);

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
  const [matchLoserRpDelta, setMatchLoserRpDelta] = useState(null);
  const [matchWinnerRankChange, setMatchWinnerRankChange] = useState(null);
  const [matchLoserRankChange, setMatchLoserRankChange] = useState(null);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [forfeitLoading, setForfeitLoading]         = useState(false);
  // Inter-game char picker
  const [interGameCharId, setInterGameCharId]               = useState(null);
  const [interGameCharAlt, setInterGameCharAlt]             = useState(1);
  const [interGameCharConfirmed, setInterGameCharConfirmed] = useState(false);
  const [interGameCharLoading, setInterGameCharLoading]     = useState(false);

  // Estado de búsqueda
  const [searchPlat, setSearchPlat]   = useState(null);
  const [searchChar, setSearchChar]   = useState(null);
  const [searchSkin, setSearchSkin]   = useState(1);
  const [loading, setLoading]         = useState(false);
  const [formError, setFormError]     = useState(null);
  const [onlineCount, setOnlineCount] = useState(null);
  const [searchElapsed, setSearchElapsed] = useState(0);
  const [matchMode, setMatchMode]     = useState('1v1'); // '1v1' o '2v2'
  const [matchTypeMode, setMatchTypeMode] = useState('ranked'); // 'ranked' | 'casual'
  const [casualMode, setCasualMode]   = useState('1v1'); // '1v1' | '2v2' para casual
  const [casualParty, setCasualParty] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [rankedParty, setRankedParty] = useState(null);
  const [rankedJoinCodeInput, setRankedJoinCodeInput] = useState('');
  const [partyInfo, setPartyInfo]     = useState(null); // Para 2v2 ranked (legado)
  const [parsecRole, setParsecRole]   = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('afk_parsec_role') || null;
    return null;
  }); // 'host' | 'nohost' | null — modo de conexión para matchmaking Parsec

  // Sala Parsec Grupal
  const [parsecGroupView,    setParsecGroupView]    = useState(false);
  const [parsecGroup,        setParsecGroup]        = useState(null);
  const [pgJoinCode,         setPgJoinCode]         = useState('');
  const [pgLoading,          setPgLoading]          = useState(false);
  const [pgError,            setPgError]            = useState(null);
  const [pgReportStocks,     setPgReportStocks]     = useState(1);
  const [pgReported,         setPgReported]         = useState(false);
  const [pgDisputing,        setPgDisputing]        = useState(false);
  const pgLastGameRef = useRef(null); // tracks currentGame + pair to reset pgReported on advance

  // Ban state (Bo3)
  const [selectedBans, setSelectedBans] = useState([]);
  const [banLoading, setBanLoading]     = useState(false);

  // Modal Cómo jugar
  const [showHowToPlay, setShowHowToPlay] = useState(false);

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

  // Poll casual party para 2v2
  useEffect(() => {
    if (!uid || matchTypeMode !== 'casual' || casualMode !== '2v2') return;
    const poll = async () => {
      try {
        const r = await fetch('/api/matchmaking/casual-party?userId=' + encodeURIComponent(uid));
        const d = await r.json();
        setCasualParty(d.status === 'none' ? null : d.party);
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 4000);
    return () => clearInterval(iv);
  }, [uid, matchTypeMode, casualMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll ranked party para 2v2
  useEffect(() => {
    if (!uid || matchTypeMode !== 'ranked' || matchMode !== '2v2') return;
    const poll = async () => {
      try {
        const r = await fetch('/api/matchmaking/ranked-party?userId=' + encodeURIComponent(uid));
        const d = await r.json();
        setRankedParty(d.status === 'none' ? null : d.party);
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 4000);
    return () => clearInterval(iv);
  }, [uid, matchTypeMode, matchMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll sala Parsec grupal
  useEffect(() => {
    if (!uid || !parsecGroupView) return;
    const poll = async () => {
      try {
        const r = await fetch('/api/matchmaking/parsec-group?userId=' + encodeURIComponent(uid));
        const d = await r.json();
        // Si la sala desapareció (kickeado o sala cerrada), salir de la vista
        if (!d.room && parsecGroup) {
          setParsecGroup(null); setParsecGroupView(false);
          setPgReported(false); setPgReportStocks(1); setPgError(null);
          return;
        }
        setParsecGroup(d.room || null);
        // Reset "ya reporté" cuando cambia el game o el par
        if (d.room?.currentMatch && !d.room.currentMatch.done) {
          const cm = d.room.currentMatch;
          const gameKey = (cm.p1?.userId || '') + ':' + (cm.p2?.userId || '') + ':' + (cm.currentGame || 1);
          if (pgLastGameRef.current && pgLastGameRef.current !== gameKey) {
            setPgReported(false);
            setPgReportStocks(1);
            setPgDisputing(false);
          }
          pgLastGameRef.current = gameKey;
        }
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [uid, parsecGroupView]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer de búsqueda (basado en searchStartedAt para sobrevivir F5)
  useEffect(() => {
    if (matchStatus !== 'searching') { setSearchElapsed(0); return; }
    const startedAt = bgMM?.searchStartedAt || Date.now();
    setSearchElapsed(Math.floor((Date.now() - startedAt) / 1000));
    const iv = setInterval(() => setSearchElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [matchStatus, bgMM?.searchStartedAt]);

  const reportResult = async (winnerId, stocks, action) => {
    if (!matchData?.matchId) return;
    setReportLoading(true); setReportError(null);
    try {
      const is2v2 = matchData.mode === '2v2';
      const isCasual = matchData.type === 'casual';
      const apiUrl = isCasual ? '/api/matchmaking/casual-result'
        : is2v2 ? '/api/matchmaking/result-doubles'
        : '/api/matchmaking/result';
      const bodyPayload = !is2v2
        ? { matchId: matchData.matchId, reportingUserId: uid, claimedWinnerId: winnerId, stocksWon: stocks ?? 1, action }
        : { matchId: matchData.matchId, reportingUserId: uid, claimedWinnerTeam: winnerId, stocksWon: stocks ?? 1, action };
      const r = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const data = await r.json();
      if (!r.ok) { setReportError(data.error || 'Error al reportar'); return; }
      if (data.denied) {
        setReported(false);
        setReportStocks(1);
        setReportError(null);
      } else {
        setReported(true);
      }
      if (typeof data.rpDelta === 'number') setMatchRpDelta(data.rpDelta);
      if (typeof data.loserRpDelta === 'number') setMatchLoserRpDelta(data.loserRpDelta);
      if (data.winnerRankChange) setMatchWinnerRankChange(data.winnerRankChange);
      if (data.loserRankChange) setMatchLoserRankChange(data.loserRankChange);
      if (data.matchStatus === 'banning') {
        setReported(false);
        setReportStocks(1);
        setReportError(null);
        setSelectedBans([]);
      }
      setBgMM(prev => prev ? {
        ...prev,
        room: { ...prev.room, status: data.matchStatus, result: data.result, pendingResult: data.pendingResult || null },
        status: data.matchStatus === 'finished' ? 'finished' :
                data.matchStatus === 'banning' ? 'banning' :
                data.matchStatus === 'pending_confirm' ? 'pending_confirm' :
                data.matchStatus === 'active' ? 'active' : prev.status,
      } : prev);
    } catch { setReportError('Error de conexión'); }
    finally { setReportLoading(false); }
  };

  const forfeit = async () => {
    if (!matchData?.matchId) return;
    setForfeitLoading(true);
    try {
      const isCasual = matchData.type === 'casual';
      const apiUrl = isCasual ? '/api/matchmaking/casual-result' : '/api/matchmaking/result';
      const r = await fetch(apiUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: matchData.matchId, reportingUserId: uid, claimedWinnerId: uid, action: 'forfeit' }),
      });
      const data = await r.json();
      if (!r.ok) { setReportError(data.error || 'Error al rendirse'); setShowForfeitConfirm(false); return; }
      if (typeof data.rpDelta === 'number') setMatchRpDelta(data.rpDelta);
      if (typeof data.loserRpDelta === 'number') setMatchLoserRpDelta(data.loserRpDelta);
      if (data.winnerRankChange) setMatchWinnerRankChange(data.winnerRankChange);
      if (data.loserRankChange) setMatchLoserRankChange(data.loserRankChange);
      setBgMM(prev => prev ? {
        ...prev,
        room: { ...prev.room, status: 'finished', result: data.result },
        status: 'finished',
      } : prev);
      setShowForfeitConfirm(false);
    } catch { setReportError('Error de conexión'); }
    finally { setForfeitLoading(false); }
  };

  const resetAll = () => {
    setBgMM(null);
    setChatMessages([]); setChatInput('');
    setReported(false); setReportError(null);
    setReportStocks(1); setMatchRpDelta(null); setMatchLoserRpDelta(null);
    setMatchWinnerRankChange(null); setMatchLoserRankChange(null);
    setShowForfeitConfirm(false); setForfeitLoading(false);
    setInterGameCharId(null); setInterGameCharAlt(1);
    setInterGameCharConfirmed(false); setInterGameCharLoading(false);
    setSearchPlat(null); setSearchChar(null);
    setMatchTypeMode('ranked');
    setCasualMode('1v1'); setCasualParty(null); setJoinCodeInput('');
    setRankedParty(null); setRankedJoinCodeInput('');
  };

  // Descartar pantalla de resultado e ir a buscar nueva partida
  const dismissResult = async () => {
    try {
      await fetch('/api/matchmaking/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss_result', userId: uid, userName: uName }),
      });
    } catch {}
    resetAll();
  };

  // Volver a jugar: auto-busca con el mismo personaje y plataforma
  const replaySearch = async () => {
    const savedPlat = bgMM?.plat;
    const savedGameType = bgMM?.gameType;
    const myPData = matchData?.host?.userId === uid ? matchData?.host : matchData?.guest;
    const savedChar = myPData?.charId || searchChar;
    const savedSkin = myPData?.charAlt || searchSkin || 1;
    const savedRole = parsecRole;
    try {
      await fetch('/api/matchmaking/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss_result', userId: uid, userName: uName }),
      });
    } catch {}
    setChatMessages([]); setChatInput('');
    setReported(false); setReportError(null);
    setReportStocks(1); setMatchRpDelta(null); setMatchLoserRpDelta(null);
    setMatchWinnerRankChange(null); setMatchLoserRankChange(null);
    setShowForfeitConfirm(false); setForfeitLoading(false);
    setInterGameCharId(null); setInterGameCharAlt(1);
    setInterGameCharConfirmed(false); setInterGameCharLoading(false);
    const endpoint = savedGameType === 'casual' ? '/api/matchmaking/casual-queue' : '/api/matchmaking/queue';
    try {
      const r = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, userName: uName, platform: savedPlat, charId: savedChar, charAlt: savedSkin, parsecRole: savedRole }),
      });
      const data = await r.json();
      if (r.ok) {
        setBgMM({ status: 'searching', plat: savedPlat, gameType: savedGameType || undefined, polling: true, searchStartedAt: Date.now(), charId: savedChar, charAlt: savedSkin || 1 });
        setSearchChar(savedChar);
        setSearchSkin(savedSkin);
      } else {
        resetAll();
        setFormError(data.error || 'Error al buscar');
      }
    } catch {
      resetAll();
      setFormError('Error de conexión');
    }
  };

  const confirmNextGameChar = async () => {
    if (!interGameCharId || interGameCharLoading) return;
    setInterGameCharLoading(true);
    try {
      const r = await fetch('/api/matchmaking/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pick_inter_game_char', userId: uid, userName: uName, charId: interGameCharId, charAlt: interGameCharAlt }),
      });
      const data = await r.json();
      if (r.ok) {
        setInterGameCharConfirmed(true);
        if (data.room) setBgMM(prev => prev ? { ...prev, room: data.room } : prev);
      }
    } catch {}
    finally { setInterGameCharLoading(false); }
  };

  // ── Acciones de la Sala Parsec Grupal ─────────────────────────────────
  const pgCreate = async () => {
    setPgLoading(true); setPgError(null);
    try {
      const r = await fetch('/api/matchmaking/parsec-group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', userId: uid, userName: uName, charId: searchChar, charAlt: searchSkin || 1 }),
      });
      const d = await r.json();
      if (!r.ok) { setPgError(d.error || 'Error al crear sala'); return; }
      if (d.room) { setParsecGroup(d.room); setParsecGroupView(true); }
    } catch { setPgError('Error de conexión'); }
    finally { setPgLoading(false); }
  };

  const pgJoin = async (code) => {
    if (!code || code.length < 5) { setPgError('Ingresá un código de sala válido'); return; }
    setPgLoading(true); setPgError(null);
    try {
      const r = await fetch('/api/matchmaking/parsec-group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', code, userId: uid, userName: uName, charId: searchChar, charAlt: searchSkin || 1 }),
      });
      const d = await r.json();
      if (!r.ok) { setPgError(d.error || 'Error al unirse'); return; }
      if (d.room) { setParsecGroup(d.room); setParsecGroupView(true); setPgJoinCode(''); }
    } catch { setPgError('Error de conexión'); }
    finally { setPgLoading(false); }
  };

  const pgStart = async () => {
    setPgLoading(true); setPgError(null);
    try {
      const r = await fetch('/api/matchmaking/parsec-group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', userId: uid, userName: uName }),
      });
      const d = await r.json();
      if (!r.ok) { setPgError(d.error || 'Error al iniciar'); return; }
      if (d.room) setParsecGroup(d.room);
    } catch { setPgError('Error de conexión'); }
    finally { setPgLoading(false); }
  };

  const pgNext = async () => {
    setPgLoading(true); setPgError(null);
    try {
      const r = await fetch('/api/matchmaking/parsec-group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'next', userId: uid, userName: uName }),
      });
      const d = await r.json();
      if (!r.ok) { setPgError(d.error || 'Error'); return; }
      if (d.room) { setParsecGroup(d.room); setPgReported(false); setPgReportStocks(1); }
    } catch { setPgError('Error de conexión'); }
    finally { setPgLoading(false); }
  };

  const pgReport = async (winnerId, stocksOverride) => {
    setPgLoading(true); setPgError(null);
    try {
      const r = await fetch('/api/matchmaking/parsec-group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'report', userId: uid, userName: uName, winnerId, stocksWon: stocksOverride ?? pgReportStocks }),
      });
      const d = await r.json();
      if (!r.ok) { setPgError(d.error || 'Error al reportar'); return; }
      if (d.disagreement) { setPgError('Los jugadores no coinciden. Vuelvan a reportar.'); setPgReported(false); setPgDisputing(false); }
      else { setPgReported(true); setPgDisputing(false); }
      if (d.room) setParsecGroup(d.room);
    } catch { setPgError('Error de conexión'); }
    finally { setPgLoading(false); }
  };

  const pgClose = async () => {
    if (!confirm('\u00bfCerrás la sala? Todos los jugadores serán desconectados.')) return;
    setPgLoading(true);
    try {
      await fetch('/api/matchmaking/parsec-group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', userId: uid, userName: uName }),
      });
    } catch {}
    setParsecGroup(null); setParsecGroupView(false); setPgReported(false);
    setPgReportStocks(1); setPgError(null); setPgLoading(false);
  };

  const pgKick = async (targetId) => {
    setPgLoading(true); setPgError(null);
    try {
      const r = await fetch('/api/matchmaking/parsec-group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kick', userId: uid, userName: uName, targetId }),
      });
      const d = await r.json();
      if (!r.ok) { setPgError(d.error || 'Error al echar jugador'); return; }
      if (d.room) setParsecGroup(d.room);
    } catch { setPgError('Error de conexión'); }
    finally { setPgLoading(false); }
  };

  const pgLeave = async () => {
    setPgLoading(true);
    try {
      await fetch('/api/matchmaking/parsec-group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', userId: uid, userName: uName }),
      });
    } catch {}
    setParsecGroup(null); setParsecGroupView(false); setPgReported(false);
    setPgReportStocks(1); setPgError(null); setPgLoading(false);
  };

  const pgUpdateChar = async (newCharId, newCharAlt) => {
    setPgLoading(true); setPgError(null);
    try {
      const r = await fetch('/api/matchmaking/parsec-group', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_char', userId: uid, userName: uName, charId: newCharId, charAlt: newCharAlt || 1 }),
      });
      const d = await r.json();
      if (!r.ok) { setPgError(d.error || 'Error al cambiar personaje'); return; }
      if (d.room) setParsecGroup(d.room);
    } catch { setPgError('Error de conexión'); }
    finally { setPgLoading(false); }
  };

  const startSearch = async (platform) => {
    if (!searchChar) { setFormError('Elegí tu personaje primero'); return; }
    if (platform === 'parsec' && !parsecRole) { setFormError('Elegí si sos Host o No Host antes de buscar en Parsec'); return; }
    setLoading(true); setFormError(null);
    try {
      const r = await fetch('/api/matchmaking/queue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, userName: uName, platform, charId: searchChar, charAlt: searchSkin || 1, parsecRole }),
      });
      const data = await r.json();
      if (r.status === 409) {
        // Ya en cola o match activo
        setFormError(data.error);
        return;
      }
      if (!r.ok) { setFormError(data.error || 'Error al buscar'); return; }
      setBgMM({ status: 'searching', plat: platform, polling: true, searchStartedAt: Date.now(), charId: searchChar, charAlt: searchSkin || 1 });
    } catch { setFormError('Error de conexión'); }
    finally { setLoading(false); }
  };

  const startCasualSearch = async (platform) => {
    if (!searchChar) { setFormError('Elegí tu personaje primero'); return; }
    if (platform === 'parsec' && !parsecRole) { setFormError('Elegí si sos Host o No Host antes de buscar en Parsec'); return; }
    setLoading(true); setFormError(null);
    try {
      const r = await fetch('/api/matchmaking/casual-queue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, userName: uName, platform, charId: searchChar, charAlt: searchSkin || 1, parsecRole }),
      });
      const data = await r.json();
      if (r.status === 409) { setFormError(data.error); return; }
      if (!r.ok) { setFormError(data.error || 'Error al buscar'); return; }
      setBgMM({ status: 'searching', plat: platform, gameType: 'casual', polling: true, searchStartedAt: Date.now(), charId: searchChar, charAlt: searchSkin || 1 });
    } catch { setFormError('Error de conexión'); }
    finally { setLoading(false); }
  };

  const cancelSearch = async () => {
    const isCasual = bgMM?.gameType === 'casual';
    try {
      await fetch(isCasual ? '/api/matchmaking/casual-queue' : '/api/matchmaking/queue', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, platform: bgMM?.plat }),
      });
    } catch {}
    setBgMM(null);
  };

  const startSearch2v2 = async (platform) => {
    if (!rankedParty || rankedParty.status !== 'ready') {
      setFormError('El equipo no está completo todavía');
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
      setBgMM({ status: 'searching', plat: platform, mode: '2v2', polling: true, searchStartedAt: Date.now() });
    } catch { setFormError('Error de conexión'); }
    finally { setLoading(false); }
  };

  const createRankedParty = async (platform) => {
    setLoading(true); setFormError(null);
    try {
      const r = await fetch('/api/matchmaking/ranked-party', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', userId: uid, userName: uName, platform }),
      });
      const d = await r.json();
      if (!r.ok) { setFormError(d.error || 'Error al crear sala'); return; }
      setRankedParty(d.party);
    } catch { setFormError('Error de conexión'); }
    finally { setLoading(false); }
  };

  const joinRankedParty = async (code) => {
    if (!code || code.length < 4) { setFormError('Ingresá el código de sala (4 caracteres)'); return; }
    setLoading(true); setFormError(null);
    try {
      const r = await fetch('/api/matchmaking/ranked-party', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', userId: uid, userName: uName, code: code.toUpperCase() }),
      });
      const d = await r.json();
      if (!r.ok) { setFormError(d.error || 'Sala no encontrada'); return; }
      setRankedParty(d.party); setRankedJoinCodeInput('');
    } catch { setFormError('Error de conexión'); }
    finally { setLoading(false); }
  };

  const leaveRankedParty = async () => {
    try {
      await fetch('/api/matchmaking/ranked-party', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });
    } catch {}
    setRankedParty(null);
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

  const createCasualParty = async (platform) => {
    if (!searchChar) { setFormError('Elegí tu personaje primero'); return; }
    setLoading(true); setFormError(null);
    try {
      const r = await fetch('/api/matchmaking/casual-party', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', userId: uid, userName: uName, charId: searchChar, charAlt: searchSkin || 1, platform }),
      });
      const d = await r.json();
      if (!r.ok) { setFormError(d.error || 'Error al crear sala'); return; }
      setCasualParty(d.party);
    } catch { setFormError('Error de conexión'); }
    finally { setLoading(false); }
  };

  const joinCasualParty = async (code) => {
    if (!searchChar) { setFormError('Elegí tu personaje primero'); return; }
    if (!code || code.length < 4) { setFormError('Ingresá el código de sala (4 caracteres)'); return; }
    setLoading(true); setFormError(null);
    try {
      const r = await fetch('/api/matchmaking/casual-party', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', userId: uid, userName: uName, charId: searchChar, charAlt: searchSkin || 1, code: code.toUpperCase() }),
      });
      const d = await r.json();
      if (!r.ok) { setFormError(d.error || 'Sala no encontrada'); return; }
      setCasualParty(d.party); setJoinCodeInput('');
    } catch { setFormError('Error de conexión'); }
    finally { setLoading(false); }
  };

  const leaveCasualParty = async () => {
    try {
      await fetch('/api/matchmaking/casual-party', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });
    } catch {}
    setCasualParty(null);
  };

  const startCasual2v2Search = async (platform) => {
    if (!casualParty || casualParty.status !== 'ready') {
      setFormError('El equipo no está completo todavía');
      return;
    }
    setLoading(true); setFormError(null);
    try {
      const r = await fetch('/api/matchmaking/casual-queue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid, platform, mode: '2v2',
          team: [
            { userId: casualParty.leader.userId, userName: casualParty.leader.userName, charId: casualParty.leader.charId },
            { userId: casualParty.partner.userId, userName: casualParty.partner.userName, charId: casualParty.partner.charId },
          ],
        }),
      });
      const data = await r.json();
      if (r.status === 409) { setFormError(data.error); return; }
      if (!r.ok) { setFormError(data.error || 'Error al buscar'); return; }
      setBgMM({ status: 'searching', plat: platform, gameType: 'casual', mode: '2v2', polling: true });
    } catch { setFormError('Error de conexión'); }
    finally { setLoading(false); }
  };

  // STAGE_IMG is now at module scope

  const BAN_STAGES_G1 = [
    'Battlefield', 'Small Battlefield', 'Town and City',
    'Smashville', 'Pokémon Stadium 2',
  ];

  const BAN_STAGES_G2 = [
    'Battlefield', 'Small Battlefield', 'Town and City',
    'Smashville', 'Pokémon Stadium 2',
    'Final Destination', 'Hollow Bastion', 'Kalos',
  ];

  const submitBans = async (bansOverride) => {
    const bans = Array.isArray(bansOverride) ? bansOverride : selectedBans;
    if (bans.length < 1 || banLoading) return;
    setBanLoading(true);
    try {
      const r = await fetch('/api/matchmaking/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ban', userId: uid, userName: uName, bannedStages: bans }),
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

  // --- RENDER: RESULTADO FINAL -------------------------------------------
  if (matchStatus === 'finished' && matchData?.result) {
    const is2v2Finished = matchData.mode === '2v2';
    const myTeamFinished = is2v2Finished ? (matchData.team1?.some(p => p.userId === uid) ? 'team1' : 'team2') : null;
    const iWon = is2v2Finished
      ? matchData.result.winnerTeam === myTeamFinished
      : matchData.result.winnerId === uid;
    const stocks = matchData.result.stocksWon;
    const isCasualFinished = matchData.type === 'casual';
    const finalRpDelta          = matchRpDelta          ?? matchData?.result?.rpDelta          ?? null;
    const finalLoserRpDelta     = matchLoserRpDelta     ?? matchData?.result?.loserRpDelta     ?? null;
    const finalWinnerRankChange = matchWinnerRankChange ?? matchData?.result?.winnerRankChange ?? null;
    const finalLoserRankChange  = matchLoserRankChange  ?? matchData?.result?.loserRankChange  ?? null;
    const myRpDelta    = iWon ? finalRpDelta : finalLoserRpDelta;
    const myRankChange = iWon ? finalWinnerRankChange : finalLoserRankChange;
    // Player data (perspectiva propia)
    const myPlayerData  = matchData.host?.userId === uid ? matchData.host  : matchData.guest;
    const oppPlayerData = matchData.host?.userId === uid ? matchData.guest : matchData.host;
    // Imagen de personaje con skin seleccionada
    const getCharSkin = (pData) => {
      const cObj = CHARACTERS.find(c => c.id === pData?.charId);
      if (!cObj?.alts?.length) return cObj ? charImgPath(cObj.img) : null;
      const idx = Math.max(0, Math.min((parseInt(pData?.charAlt) || 1) - 1, cObj.alts.length - 1));
      return `/images/characters/${cObj.alts[idx]}`;
    };
    const myCharImg  = getCharSkin(myPlayerData);
    const oppCharImg = getCharSkin(oppPlayerData);
    // Stage background (último escenario jugado)
    const finishedGames = matchData.result?.games || [];
    const lastStageName = finishedGames.length
      ? (finishedGames[finishedGames.length - 1]?.result?.stage || finishedGames[finishedGames.length - 1]?.stage)
      : matchData.stage;
    const stageBgUrl = lastStageName ? `/images/stages/${encodeURIComponent(String(lastStageName))}.png` : null;
    // Score BO3
    const myFinScore  = matchData.result?.score?.[uid] ?? 0;
    const oppFinId    = oppPlayerData?.userId;
    const oppFinScore = oppFinId ? (matchData.result?.score?.[String(oppFinId)] ?? matchData.result?.score?.[oppFinId] ?? 0) : 0;
    return (
      <div style={{ paddingBottom: 32 }}>
        {/* Botón volver */}
        <div style={{ padding: '16px 18px 4px' }}>
          <button onClick={dismissResult} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FF8C00', fontSize: 14, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
            <Svg size={18} sw={2}>{ICO.back}</Svg> Nueva partida
          </button>
        </div>
        {/* Hero: escenario de fondo + personajes */}
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 240 }}>
          {stageBgUrl && (
            <img src={stageBgUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(4px) brightness(0.28)', transform: 'scale(1.1)' }} onError={e => { e.target.style.display = 'none'; }} />
          )}
          <div style={{ position: 'absolute', inset: 0, background: iWon ? 'linear-gradient(180deg,rgba(52,211,153,0.18) 0%,rgba(0,0,0,0.65) 100%)' : 'linear-gradient(180deg,rgba(239,68,68,0.22) 0%,rgba(0,0,0,0.7) 100%)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: iWon ? 'linear-gradient(90deg,transparent,#34D399,transparent)' : 'linear-gradient(90deg,transparent,#EF4444,transparent)' }} />
          <div style={{ position: 'relative', zIndex: 1, padding: '20px 16px 18px', textAlign: 'center' }}>
            {isCasualFinished && <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#A78BFA', letterSpacing: '0.1em', textTransform: 'uppercase' }}>⚔️ Partida Normal</p>}
            <p style={{ margin: '0 0 2px', fontSize: 30, fontWeight: 900, color: iWon ? '#34D399' : '#EF4444', textShadow: `0 0 28px ${iWon ? 'rgba(52,211,153,0.6)' : 'rgba(239,68,68,0.6)'}` }}>
              {iWon ? (is2v2Finished ? '¡Ganaron! 🏆' : '¡Ganaste! 🏆') : (is2v2Finished ? 'Perdieron 💀' : 'Perdiste 💀')}
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{iWon ? '¡Bien jugado! 💪' : 'La próxima será'}</p>
            {/* Personajes con skins (grandes) */}
            {!is2v2Finished && (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginTop: 4 }}>
                {/* Mi personaje */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  {myCharImg
                    ? <img src={myCharImg} alt="" style={{ width: 140, height: 140, objectFit: 'contain', filter: iWon ? 'drop-shadow(0 0 24px rgba(52,211,153,0.8)) drop-shadow(0 0 48px rgba(52,211,153,0.3))' : 'grayscale(40%) brightness(0.7) drop-shadow(0 0 12px rgba(0,0,0,0.5))', transform: iWon ? 'scale(1.1)' : 'scale(0.88)', transition: 'all 0.4s ease' }} onError={e => { e.target.style.display = 'none'; }} />
                    : <div style={{ width: 140, height: 140 }} />}
                  <span style={{ fontSize: 12, fontWeight: 800, color: iWon ? '#34D399' : 'rgba(255,255,255,0.45)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{myPlayerData?.userName || 'Yo'}</span>
                </div>
                {/* Centro: score / VS + RP */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingBottom: 28, minWidth: 72 }}>
                  {matchData.format === 'bo3' ? (
                    <span style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, textShadow: '0 2px 14px rgba(0,0,0,0.9)' }}>
                      <span style={{ color: iWon ? '#34D399' : '#EF4444' }}>{iWon ? myFinScore : oppFinScore}</span>
                      <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 6px', fontSize: 20 }}>-</span>
                      <span style={{ color: !iWon ? '#34D399' : '#EF4444' }}>{iWon ? oppFinScore : myFinScore}</span>
                    </span>
                  ) : (
                    <span style={{ fontSize: 16, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>VS</span>
                  )}
                  {!isCasualFinished && myRpDelta != null && (
                    <span style={{ fontSize: 15, fontWeight: 900, color: iWon ? '#34D399' : '#EF4444', padding: '5px 14px', borderRadius: 24, background: iWon ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)', border: `1px solid ${iWon ? 'rgba(52,211,153,0.4)' : 'rgba(239,68,68,0.4)'}`, whiteSpace: 'nowrap', backdropFilter: 'blur(4px)', boxShadow: `0 4px 16px ${iWon ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                      {iWon ? '+' : ''}{myRpDelta} RP
                    </span>
                  )}
                </div>
                {/* Personaje rival */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  {oppCharImg
                    ? <img src={oppCharImg} alt="" style={{ width: 140, height: 140, objectFit: 'contain', filter: !iWon ? 'drop-shadow(0 0 24px rgba(52,211,153,0.8)) drop-shadow(0 0 48px rgba(52,211,153,0.3))' : 'grayscale(40%) brightness(0.7) drop-shadow(0 0 12px rgba(0,0,0,0.5))', transform: !iWon ? 'scale(1.1)' : 'scale(0.88)', transition: 'all 0.4s ease' }} onError={e => { e.target.style.display = 'none'; }} />
                    : <div style={{ width: 140, height: 140 }} />}
                  <span style={{ fontSize: 12, fontWeight: 800, color: !iWon ? '#34D399' : 'rgba(255,255,255,0.45)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{oppPlayerData?.userName || 'Rival'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: '12px 18px 0' }}>
          {/* Resumen BO3 con imágenes de escenarios */}
          {matchData.format === 'bo3' && finishedGames.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {finishedGames.map((g, gi) => {
                const gWon = g.result?.winnerId === uid;
                const gStage = g.stage || g.result?.stage;
                const gStageImg = gStage ? STAGE_IMG[gStage] || `/images/stages/${encodeURIComponent(String(gStage))}.png` : null;
                return (
                  <div key={g.gameNum} style={{ flex: 1, position: 'relative', borderRadius: 14, overflow: 'hidden', border: `2px solid ${gWon ? 'rgba(52,211,153,0.4)' : 'rgba(239,68,68,0.35)'}`, height: 80 }}>
                    {gStageImg && (
                      <img src={gStageImg} alt={gStage} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: gWon ? 'linear-gradient(180deg,rgba(52,211,153,0.1) 0%,rgba(0,0,0,0.75) 100%)' : 'linear-gradient(180deg,rgba(239,68,68,0.15) 0%,rgba(0,0,0,0.8) 100%)' }} />
                    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: '6px 4px' }}>
                      <span style={{ fontSize: 20 }}>{gWon ? '🏆' : '💀'}</span>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Game {g.gameNum}</span>
                      {gStage && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.9)', textAlign: 'center', lineHeight: 1.2 }}>{gStage}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Resumen de puntos */}
          {!isCasualFinished && !is2v2Finished && (
            <div style={{ background: iWon ? 'linear-gradient(135deg,rgba(52,211,153,0.06),rgba(52,211,153,0.02))' : 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(239,68,68,0.02))', border: `1px solid ${iWon ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.12)'}`, borderRadius: 18, padding: '16px 18px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: iWon ? 'linear-gradient(90deg,transparent,#34D399,transparent)' : 'linear-gradient(90deg,transparent,#EF4444,transparent)', opacity: 0.6 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: iWon ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {iWon ? '📈' : '📉'}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{iWon ? 'Puntos ganados' : 'Puntos perdidos'}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 900, color: iWon ? '#34D399' : '#EF4444', lineHeight: 1 }}>
                    {iWon ? '+' : ''}{myRpDelta != null ? myRpDelta : (iWon ? '?' : -10)} <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>RP</span>
                  </p>
                </div>
              </div>
              {stocks && iWon && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>❤️</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flex: 1 }}>Stocks de ventaja</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.8)' }}>{stocks}</span>
                </div>
              )}
              {myRankChange?.promoted && (
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(52,211,153,0.15),rgba(52,211,153,0.08))', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, animation: 'fadeUp 0.4s ease' }}>
                  <span style={{ fontSize: 22 }}>🎉</span>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#34D399' }}>¡Ascendiste de rango!</span>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(52,211,153,0.6)' }}>Seguí así, crack 🔥</p>
                  </div>
                </div>
              )}
              {myRankChange?.demoted && (
                <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <span style={{ fontSize: 22 }}>📉</span>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#EF4444' }}>Descendiste de rango</span>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(239,68,68,0.5)' }}>La próxima será 💪</p>
                  </div>
                </div>
              )}
            </div>
          )}
          {isCasualFinished ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={replaySearch} style={{ flex: 2, padding: '14px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#FF8C00,#E85D00)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,140,0,0.3)' }}>
                🎮 Volver a jugar
              </button>
              <button onClick={dismissResult} style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                👤 Cambiar PJ
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={replaySearch} style={{ flex: 2, padding: '14px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#FF8C00,#E85D00)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(255,140,0,0.3)' }}>
                🎮 Volver a jugar
              </button>
              <button onClick={dismissResult} style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                👤 Cambiar PJ
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER: MATCH ACTIVO (active / pending_confirm / disputed) ----------
  if (matchData && ['active','pending_confirm','disputed'].includes(matchStatus)) {
    const is2v2 = matchData.mode === '2v2';
    const opponent = is2v2 ? null : (uid === matchData.host?.userId ? matchData.guest : matchData.host);
    const myTeam = is2v2 ? (matchData.team1?.some(p => p.userId === uid) ? 'team1' : 'team2') : null;
    const enemyTeam = is2v2 ? (myTeam === 'team1' ? matchData.team2 : matchData.team1) : null;
    const stage    = matchData.stage || '—';
    const STAGE_EMOJI = { 'Battlefield': '⚔️', 'Final Destination': '🌌', 'Small Battlefield': '⚔️', 'Pokémon Stadium 2': '⚡', 'Town and City': '🏙️', 'Smashville': '🏘️', 'Hollow Bastion': '🏯', 'Kalos': '❄️' };
    const isBo3 = matchData.format === 'bo3';
    const gameNum = matchData.currentGame || 1;
    const myScore = isBo3 ? (matchData.score?.[uid] || 0) : 0;
    const oppScore = isBo3 ? (matchData.score?.[opponent?.userId] || 0) : 0;
    const myData = uid === matchData.host?.userId ? matchData.host : matchData.guest;
    const myChar = CHARACTERS.find(c => c.id === myData?.charId);
    const oppChar = CHARACTERS.find(c => c.id === opponent?.charId);
    return (
      <div style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: p ? 'linear-gradient(135deg,' + p.from + ',' + p.to + ')' : '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{p?.icon || '??'}</div>
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

        {/* Personajes: yo vs rival */}
        {!is2v2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '12px 16px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
              {myChar && <img src={stockIconPath(myChar, myData?.charAlt || 1)} alt={myChar.name} style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 10, background: 'rgba(52,211,153,0.08)' }} onError={e => { e.target.style.display='none'; }} />}
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Vos</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#34D399' }}>{myChar?.name || myData?.charId || '—'}</p>
              </div>
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,0.15)' }}>VS</span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', textAlign: 'right' }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Rival</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#EF4444' }}>{oppChar?.name || opponent?.charId || '—'}</p>
              </div>
              {oppChar && <img src={stockIconPath(oppChar, opponent?.charAlt || 1)} alt={oppChar.name} style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 10, background: 'rgba(239,68,68,0.08)' }} onError={e => { e.target.style.display='none'; }} />}
            </div>
          </div>
        )}

        {is2v2 && (
          <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Equipo rival</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(enemyTeam || []).map(p => (
                <p key={p.userId} style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#fff' }}>{p.userName}</p>
              ))}
            </div>
          </div>
        )}

        {/* Nombre rival (1v1) */}
        {!is2v2 && (
          <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Tu rival</p>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff' }}>{opponent?.userName || '—'}</p>
          </div>
        )}

        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(232,142,0,0.2)', height: 88 }}>
          {STAGE_IMG[stage] && (
            <img src={STAGE_IMG[stage]} alt={stage} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          <div style={{ position: 'relative', background: STAGE_IMG[stage] ? 'linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 65%, transparent 100%)' : 'linear-gradient(135deg,rgba(232,142,0,0.1),rgba(232,142,0,0.04))', padding: '14px 16px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: 'rgba(255,165,0,0.8)', textTransform: 'uppercase', letterSpacing: 1 }}>Escenario</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#FF8C00' }}>{stage}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Stock 3 · 7 min · Sin objetos</p>
          </div>
        </div>

        <div style={{ background: 'rgba(232,142,0,0.05)', border: '1px solid rgba(232,142,0,0.12)', borderRadius: 14, padding: '10px 14px' }}>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
            {bgMM?.plat === 'switch' ? '🎮 Coordiná con tu rival quién crea la Arena en Nintendo Switch Online.' : '🖥️ Coordiná con tu rival quién hostea la sesión en Parsec.'}
          </p>
        </div>

        {/* Scroll hint */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.15)', animation: 'bounce 1.4s ease-in-out infinite' }}>▼</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', fontWeight: 600, letterSpacing: '0.03em' }}>Chat y reporte de resultado abajo</span>
          <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.15)', animation: 'bounce 1.4s ease-in-out infinite' }}>▼</span>
        </div>

        {/* AFK Timer: aviso de presencia en el chat */}
        {chatAfkTimeLeft !== null && (() => {
          const opp = uid === matchData.host?.userId ? matchData.guest : matchData.host;
          const myPresent  = !!(matchData.chatPresence?.[uid]);
          const oppPresent = !!(matchData.chatPresence?.[opp?.userId]);
          const mins = Math.floor(chatAfkTimeLeft / 60);
          const secs = chatAfkTimeLeft % 60;
          const timeStr = mins > 0 ? `${mins}:${String(secs).padStart(2,'0')}` : `${secs}s`;
          return (
            <div style={{ background: chatAfkTimeLeft <= 60 ? 'rgba(239,68,68,0.08)' : 'rgba(251,191,36,0.07)', border: `1px solid ${chatAfkTimeLeft <= 60 ? 'rgba(239,68,68,0.25)' : 'rgba(251,191,36,0.22)'}`, borderRadius: 14, padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{chatAfkTimeLeft <= 60 ? '🔴' : '⏳'}</span>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: chatAfkTimeLeft <= 60 ? '#EF4444' : '#FBBF24' }}>
                  {chatAfkTimeLeft > 0 ? `${timeStr} para confirmar presencia` : '¡Tiempo agotado!'}
                </p>
              </div>
              {!myPresent && <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>👇 Enviá un mensaje para avisar que estás aquí</p>}
              {myPresent && !oppPresent && <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Tu rival aún no dio señales de estar conectado</p>}
              {myPresent && oppPresent && <p style={{ margin: 0, fontSize: 11, color: '#22C55E' }}>✅ Ambos confirmaron presencia</p>}
            </div>
          );
        })()}

        {/* Chat */}
        <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Chat</p>
            {chatAfkTimeLeft !== null && !matchData?.chatPresence?.[uid] && (
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#FBBF24', fontWeight: 700, background: 'rgba(251,191,36,0.1)', padding: '2px 7px', borderRadius: 6 }}>👆 Enviá un mensaje</span>
            )}
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
            <button onClick={sendChat} disabled={!chatInput.trim() || chatSending} style={{ background: 'rgba(232,142,0,0.15)', border: '1px solid rgba(232,142,0,0.3)', borderRadius: 10, padding: '0 14px', color: '#FF8C00', fontWeight: 700, cursor: 'pointer', fontSize: 18 }}>➤</button>
          </div>
        </div>

        {/* Reporte resultado */}
        {matchStatus === 'disputed' ? (
          <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 16, padding: '14px 16px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#FBBF24' }}>⚠️ Resultado en disputa</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Reportaron resultados distintos. Contactá a un admin.</p>
          </div>
        ) : matchStatus === 'pending_confirm' && matchData.pendingResult ? (
          matchData.pendingResult.reporterId === uid ? (
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '16px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: 20 }}>⏳</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#818CF8' }}>Esperando que tu rival confirme el resultado…</p>
              {confirmTimeLeft !== null && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: confirmTimeLeft <= 10 ? '#22C55E' : 'rgba(255,255,255,0.3)' }}>
                  {confirmTimeLeft > 0 ? `Se acepta automáticamente en ${confirmTimeLeft}s` : '✅ Auto-confirmando…'}
                </p>
              )}
            </div>
          ) : (
            <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: '#fff' }}>
                Tu rival dice que {matchData.pendingResult.winnerId === uid ? 'vos ganaste' : 'él ganó'}
              </p>
              {confirmTimeLeft !== null && confirmTimeLeft <= 30 && (
                <p style={{ margin: '-4px 0 8px', fontSize: 11, color: '#EF4444', fontWeight: 700 }}>
                  ⚠️ Si no respondés en {confirmTimeLeft}s, se confirma automáticamente
                </p>
              )}
              {matchData.pendingResult.winnerId === uid && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 }}>¿Con cuántos stocks quedaste?</p>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    {[1,2,3].map(n => (
                      <button key={n} onClick={() => setReportStocks(n)} style={{ flex: 1, maxWidth: 100, padding: '8px 4px', borderRadius: 10, border: '1px solid ' + (reportStocks === n ? 'rgba(255,140,0,0.6)' : 'rgba(255,255,255,0.1)'), background: reportStocks === n ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                        {Array.from({ length: n }, (_, i) => myChar ? <img key={i} src={stockIconPath(myChar, myData?.charAlt || 1)} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} /> : <span key={i}>❤️</span>)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {matchData.pendingResult.winnerId !== uid && (
                <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                  Según tu rival: {matchData.pendingResult.stocks} stock{matchData.pendingResult.stocks > 1 ? 's' : ''}
                </p>
              )}
              {reportError && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#EF4444' }}>{reportError}</p>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => !reportLoading && reportResult(matchData.pendingResult.winnerId, matchData.pendingResult.winnerId === uid ? reportStocks : matchData.pendingResult.stocks, 'confirm')} disabled={reportLoading} style={{ padding: '12px 28px', borderRadius: 13, border: `1px solid ${reportLoading ? 'rgba(52,211,153,0.15)' : 'rgba(52,211,153,0.3)'}`, background: reportLoading ? 'rgba(52,211,153,0.04)' : 'rgba(52,211,153,0.08)', color: reportLoading ? 'rgba(52,211,153,0.45)' : '#34D399', fontWeight: 800, fontSize: 14, cursor: reportLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, minWidth: 130, transition: 'all 0.2s' }}>
                  {reportLoading
                    ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(52,211,153,0.25)', borderTopColor: '#34D399', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />Enviando…</>
                    : '✅ Confirmar'}
                </button>
                <button onClick={() => !reportLoading && reportResult(matchData.pendingResult.winnerId, matchData.pendingResult.stocks, 'deny')} disabled={reportLoading} style={{ padding: '12px 28px', borderRadius: 13, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: reportLoading ? 'rgba(239,68,68,0.35)' : '#EF4444', fontWeight: 800, fontSize: 14, cursor: reportLoading ? 'not-allowed' : 'pointer', opacity: reportLoading ? 0.55 : 1, transition: 'all 0.2s' }}>❌ Negar</button>
              </div>
            </div>
          )
        ) : matchStatus !== 'pending_confirm' ? (
          <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800, color: '#fff' }}>¿Quién ganó?</p>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Stocks que te quedaban</p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[1,2,3].map(n => (
                <button key={n} onClick={() => setReportStocks(n)} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: '1px solid ' + (reportStocks === n ? 'rgba(255,140,0,0.6)' : 'rgba(255,255,255,0.1)'), background: reportStocks === n ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  {Array.from({ length: n }, (_, i) => myChar ? <img key={i} src={stockIconPath(myChar, myData?.charAlt || 1)} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} /> : <span key={i}>❤️</span>)}
                </button>
              ))}
            </div>
            {reportError && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#EF4444' }}>{reportError}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => reportResult(is2v2 ? myTeam : uid, reportStocks)} disabled={reportLoading} style={{ padding: '13px', borderRadius: 13, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)', color: '#34D399', fontWeight: 800, fontSize: 14, cursor: reportLoading ? 'not-allowed' : 'pointer' }}>🏆 {is2v2 ? 'Ganamos' : 'Yo gané'}</button>
              <button onClick={() => reportResult(is2v2 ? (myTeam === 'team1' ? 'team2' : 'team1') : (uid === matchData.host?.userId ? matchData.guest?.userId : matchData.host?.userId), 1)} disabled={reportLoading} style={{ padding: '13px', borderRadius: 13, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', fontWeight: 800, fontSize: 14, cursor: reportLoading ? 'not-allowed' : 'pointer' }}>💀 {is2v2 ? 'Perdimos' : 'Perdí'}</button>
            </div>
          </div>
        ) : null}

        {/* Rendirse */}
        {!is2v2 && matchStatus !== 'disputed' && (
          showForfeitConfirm ? (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#EF4444' }}>🏳️ ¿Confirmás que querés rendirte?</p>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Tu rival ganará automáticamente y perderás puntos.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowForfeitConfirm(false)} disabled={forfeitLoading} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={forfeit} disabled={forfeitLoading} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontWeight: 800, fontSize: 13, cursor: forfeitLoading ? 'not-allowed' : 'pointer' }}>{forfeitLoading ? '⏳ Procesando…' : '🏳️ Sí, rendirme'}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowForfeitConfirm(true)} style={{ width: '100%', padding: '10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: 'rgba(255,255,255,0.2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>🏳️ Rendirse</button>
          )
        )}
      </div>
    );
  }

  // --- RENDER: BANNING (Bo3 stage bans) ----------------------------------
  if (matchStatus === 'banning' && matchData) {
    const is2v2 = matchData.mode === '2v2';
    const opponent = is2v2 ? null : (uid === matchData.host?.userId ? matchData.guest : matchData.host);
    const myData = is2v2 ? null : (uid === matchData.host?.userId ? matchData.host : matchData.guest);
    const myTeam2v2 = is2v2 ? (matchData.team1?.player1?.userId === uid || matchData.team1?.player2?.userId === uid ? 'team1' : 'team2') : null;
    const enemyTeam2v2 = is2v2 ? (myTeam2v2 === 'team1' ? matchData.team2 : matchData.team1) : null;
    const myChar = CHARACTERS.find(c => c.id === myData?.charId);
    const oppChar = CHARACTERS.find(c => c.id === opponent?.charId);
    const gameNum = matchData.currentGame || 1;
    const myScore = is2v2 ? (matchData.score?.[myTeam2v2] || 0) : (matchData.score?.[uid] || 0);
    const oppScore = is2v2 ? (matchData.score?.[myTeam2v2 === 'team1' ? 'team2' : 'team1'] || 0) : (matchData.score?.[opponent?.userId] || 0);
    const opponentLabel = is2v2
      ? `${enemyTeam2v2?.player1?.userName || '?'} & ${enemyTeam2v2?.player2?.userName || '?'}`
      : (opponent?.userName || '—');
    const banPhase = matchData.banPhase;
    const prevGame = matchData.games?.length ? matchData.games[matchData.games.length - 1] : null;
    const prevWinnerId = prevGame?.result?.winnerId || null;
    const iAmPrevWinner = prevWinnerId === uid;
    const myBansSent = matchData.bans?.[uid];
    const isGame1 = gameNum === 1;

    const winnerBans = banPhase === 'loser_pick' && prevWinnerId ? (matchData.bans?.[prevWinnerId] || []) : [];
    const j1Bans = (banPhase === 'j2_ban' || banPhase === 'j1_pick') ? (matchData.bans?.[matchData.j1] || []) : [];
    const j2Bans = banPhase === 'j1_pick' ? (matchData.bans?.[matchData.j2] || []) : [];
    const allCurrentBans = [...winnerBans, ...j1Bans, ...j2Bans];

    const CURRENT_STAGES = isGame1 ? BAN_STAGES_G1 : BAN_STAGES_G2;
    const availableForPick = CURRENT_STAGES.filter(s => !allCurrentBans.includes(s));

    const iAmJ1 = matchData.j1 === uid;
    const iAmJ2 = matchData.j2 === uid;
    const isCapitan = iAmJ1 || iAmJ2;

    let subtitle, showStages = false, canSelect = false, maxSelect = 0, isPickMode = false;
    if (banPhase === 'j1_ban') {
      if (iAmJ1) {
        subtitle = 'Baneá 1 escenario';
        showStages = true; canSelect = true; maxSelect = 1;
      } else {
        subtitle = is2v2 && !isCapitan ? 'Tu capitán está baneando…' : 'Tu rival está baneando…';
      }
    } else if (banPhase === 'j2_ban') {
      if (iAmJ2) {
        subtitle = 'Baneá 2 escenarios';
        showStages = true; canSelect = true; maxSelect = 2;
      } else {
        subtitle = is2v2 && !isCapitan ? 'Tu capitán está baneando…' : 'Tu rival está baneando…';
      }
    } else if (banPhase === 'j1_pick') {
      if (iAmJ1) {
        subtitle = 'Elegí un escenario';
        showStages = true; canSelect = true; maxSelect = 1; isPickMode = true;
      } else {
        subtitle = 'Tu rival está eligiendo escenario…';
      }
    } else if (banPhase === 'winner_ban') {
      if (iAmPrevWinner) {
        subtitle = 'Baneá 3 escenarios';
        showStages = true; canSelect = true; maxSelect = 3;
      } else {
        subtitle = is2v2 && !isCapitan ? 'Tu capitán está baneando…' : 'Tu rival está baneando…';
      }
    } else if (banPhase === 'loser_pick') {
      if (!iAmPrevWinner) {
        subtitle = 'Elegí un escenario';
        showStages = true; canSelect = true; maxSelect = 1; isPickMode = true;
      } else {
        subtitle = is2v2 && !isCapitan ? 'Tu capitán está eligiendo escenario…' : 'Tu rival está eligiendo escenario…';
      }
    }

    const stagesToShow = isPickMode ? availableForPick : CURRENT_STAGES.filter(s => !allCurrentBans.includes(s));

    const toggleBan = (stage) => {
      if (!canSelect) return;
      if (allCurrentBans.includes(stage) && !isPickMode) return;
      if (isPickMode) { setSelectedBans([stage]); return; }
      setSelectedBans(prev => {
        if (prev.includes(stage)) return prev.filter(s => s !== stage);
        if (prev.length >= maxSelect) return prev;
        return [...prev, stage];
      });
    };

    // ── Inter-game char picker (ranked Bo3, game 2+) ──────────────────────
    const needsInterGamePick = !is2v2 && gameNum > 1 && matchData.type !== 'casual' && matchData.format === 'bo3' && matchData.interGameCharReady === false;
    if (needsInterGamePick) {
      const effectiveCharId  = interGameCharId  ?? myData?.charId;
      const effectiveCharAlt = interGameCharId  ? interGameCharAlt : (myData?.charAlt || 1);
      const effectiveChar    = CHARACTERS.find(c => c.id === effectiveCharId);
      return (
        <div style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: p ? 'linear-gradient(135deg,' + p.from + ',' + p.to + ')' : '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{p?.icon || '??'}</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontWeight: 900, fontSize: 17, color: '#fff' }}>⚔️ Game {gameNum} de 3</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>vs {opponentLabel}</p>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '6px 12px' }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff' }}>
                <span style={{ color: '#22C55E' }}>{myScore}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>—</span>
                <span style={{ color: '#EF4444' }}>{oppScore}</span>
              </p>
            </div>
          </div>

          {interGameCharConfirmed ? (
            /* Esperando a rival */
            <div style={{ textAlign: 'center', padding: '40px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              {effectiveChar && <img src={stockIconPath(effectiveChar, effectiveCharAlt)} alt={effectiveChar.name} style={{ width: 48, height: 48, objectFit: 'contain', display: 'block', margin: '0 auto 10px' }} />}
              <p style={{ margin: '0 0 4px', fontWeight: 900, fontSize: 16, color: '#fff' }}>¡Personaje confirmado!</p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Esperando que tu rival elija su personaje…</p>
            </div>
          ) : (
            /* Picker */
            <>
              <div style={{ background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.2)', borderRadius: 14, padding: '10px 14px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#FF8C00' }}>Elegí tu personaje para el Game {gameNum}</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Tu elección es secreta hasta que ambos confirmen</p>
              </div>

              {/* Grilla de personajes */}
              <div style={{ maxHeight: 260, overflowY: 'auto', borderRadius: 14, background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', padding: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4 }}>
                  {CHARACTERS.map(c => {
                    const alt = effectiveCharId === c.id ? effectiveCharAlt : 1;
                    const selected = effectiveCharId === c.id;
                    return (
                      <button key={c.id} onClick={() => { setInterGameCharId(c.id); if (!interGameCharId) setInterGameCharAlt(1); }}
                        style={{ padding: 4, borderRadius: 8, border: '1px solid ' + (selected ? 'rgba(255,140,0,0.6)' : 'rgba(255,255,255,0.06)'), background: selected ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <img src={stockIconPath(c, alt)} alt={c.name} style={{ width: 32, height: 32, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />
                        <span style={{ fontSize: 8, color: selected ? '#FF8C00' : 'rgba(255,255,255,0.4)', fontWeight: selected ? 800 : 400, lineHeight: 1.2, textAlign: 'center', maxWidth: 40, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de skin */}
              {effectiveChar && (
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Skin ({effectiveChar.name})</p>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {Array.from({ length: 8 }, (_, i) => i + 1).map(n => (
                      <button key={n} onClick={() => setInterGameCharAlt(n)}
                        style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid ' + (effectiveCharAlt === n ? 'rgba(255,140,0,0.6)' : 'rgba(255,255,255,0.1)'), background: effectiveCharAlt === n ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={stockIconPath(effectiveChar, n)} alt={n} style={{ width: 26, height: 26, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={confirmNextGameChar} disabled={!effectiveCharId || interGameCharLoading}
                style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: effectiveCharId ? 'linear-gradient(135deg,#FF8C00,#E85D00)' : 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: effectiveCharId ? 'pointer' : 'not-allowed', opacity: !effectiveCharId || interGameCharLoading ? 0.6 : 1 }}>
                {interGameCharLoading ? 'Confirmando...' : '✅ Confirmar personaje'}
              </button>
            </>
          )}
        </div>
      );
    }

    return (
      <div style={{ padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: p ? 'linear-gradient(135deg,' + p.from + ',' + p.to + ')' : '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{p?.icon || '??'}</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px', fontWeight: 900, fontSize: 17, color: '#fff' }}>⚔️ Game {gameNum} de 3</p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>vs {opponentLabel}</p>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '6px 12px' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff' }}>
              <span style={{ color: '#22C55E' }}>{myScore}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>—</span>
              <span style={{ color: '#EF4444' }}>{oppScore}</span>
            </p>
          </div>
        </div>

        {/* Personajes */}
        {(myChar || oppChar) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '10px 14px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              {myChar && <img src={stockIconPath(myChar, myData?.charAlt || 1)} alt={myChar.name} style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8, background: 'rgba(34,197,94,0.08)' }} onError={e => { e.target.style.display='none'; }} />}
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#34D399' }}>{myChar?.name || '—'}</p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 900, color: 'rgba(255,255,255,0.15)' }}>VS</span>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#EF4444' }}>{oppChar?.name || opponent?.charId || '—'}</p>
              {oppChar && <img src={stockIconPath(oppChar, opponent?.charAlt || 1)} alt={oppChar.name} style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8, background: 'rgba(239,68,68,0.08)' }} onError={e => { e.target.style.display='none'; }} />}
            </div>
          </div>
        )}

        {/* Subtitle / Phase */}
        <div style={{ textAlign: 'center', padding: '10px 16px', background: 'rgba(232,142,0,0.08)', border: '1px solid rgba(232,142,0,0.2)', borderRadius: 14 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#FF8C00' }}>{subtitle}</p>
          {showStages && !isPickMode && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Seleccioná {maxSelect} escenarios para banear</p>}
          {showStages && isPickMode && <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Elegí en qué escenario jugar</p>}
          {/* Cuenta regresiva del turno */}
          {banTimeLeft !== null && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', border: `3px solid ${banTimeLeft <= 5 ? '#EF4444' : banTimeLeft <= 15 ? '#FBBF24' : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.3s' }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: banTimeLeft <= 5 ? '#EF4444' : banTimeLeft <= 15 ? '#FBBF24' : 'rgba(255,255,255,0.5)' }}>{banTimeLeft}</span>
              </div>
              <span style={{ fontSize: 11, color: banTimeLeft <= 5 ? '#EF4444' : 'rgba(255,255,255,0.35)', fontWeight: canSelect ? 700 : 400 }}>
                {canSelect ? (banTimeLeft <= 5 ? '¡Auto-ban en instantes!' : `${banTimeLeft}s para ${isPickMode ? 'elegir' : 'banear'}`) : `Rival tiene ${banTimeLeft}s`}
              </span>
            </div>
          )}
        </div>

        {/* Banned stages indicator */}
        {allCurrentBans.length > 0 && showStages && !isPickMode && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {allCurrentBans.map(s => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '3px 8px' }}>
                <span style={{ fontSize: 10 }}>🚫</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(239,68,68,0.7)' }}>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stages grid or waiting spinner */}
        {showStages ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {stagesToShow.map(stage => {
                const isSel = selectedBans.includes(stage);
                const isBanned = allCurrentBans.includes(stage);
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
              <button onClick={() => submitBans()} disabled={selectedBans.length !== maxSelect || banLoading} style={{ width: '100%', padding: '14px', borderRadius: 16, border: 'none', background: selectedBans.length === maxSelect ? 'linear-gradient(135deg,#EF4444,#DC2626)' : 'rgba(255,255,255,0.08)', color: selectedBans.length === maxSelect ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: 800, fontSize: 15, cursor: selectedBans.length === maxSelect ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
                {banLoading ? '⏳ Enviando…' : `🚫 Confirmar baneos (${selectedBans.length}/${maxSelect})`}
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

        {/* Rendirse en fase de baneo */}
        {!is2v2 && (
          showForfeitConfirm ? (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#EF4444' }}>🏳️ ¿Confirmás que querés rendirte?</p>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Tu rival ganará el set y perderás puntos.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowForfeitConfirm(false)} disabled={forfeitLoading} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={forfeit} disabled={forfeitLoading} style={{ flex: 1, padding: '10px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontWeight: 800, fontSize: 13, cursor: forfeitLoading ? 'not-allowed' : 'pointer' }}>{forfeitLoading ? '⏳ Procesando…' : '🏳️ Sí, rendirme'}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowForfeitConfirm(true)} style={{ width: '100%', padding: '10px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: 'rgba(255,255,255,0.2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>🏳️ Rendirse</button>
          )
        )}

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

  // --- RENDER: BUSCANDO RANKED -------------------------------------------
  if (matchStatus === 'searching') {
    const sp = bgMM?.plat ? PLATFORMS.find(x => x.id === bgMM.plat) : null;
    const mins = Math.floor(searchElapsed / 60);
    const secs = searchElapsed % 60;
    const mySearchChar = CHARACTERS.find(c => c.id === searchChar);
    return (
      <div style={{ padding: '24px 18px' }}>
        <div style={{ background: sp ? `linear-gradient(160deg,${sp.from}12,${sp.to}08)` : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '28px 24px', textAlign: 'center', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
          {/* Animated glow ring */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: 200, height: 200, transform: 'translate(-50%, -65%)', borderRadius: '50%', background: `radial-gradient(circle, ${sp?.from || '#FF8C00'}15 0%, transparent 70%)`, animation: 'pulse 2s ease-in-out infinite' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Spinner + character icon */}
            <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 18px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.06)' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: sp?.from || '#FF8C00', borderRightColor: sp?.from || '#FF8C00', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderBottomColor: sp?.to || '#E85D00', animation: 'spin 1.6s linear infinite reverse', opacity: 0.5 }} />
              <div style={{ position: 'absolute', inset: '12px', borderRadius: '50%', background: sp ? `linear-gradient(135deg,${sp.from},${sp.to})` : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: `0 0 24px ${sp?.from || '#FF8C00'}40` }}>
                {mySearchChar
                  ? <img src={stockIconPath(mySearchChar, searchSkin || 1)} alt="" style={{ width: 38, height: 38, objectFit: 'contain' }} onError={e => { e.target.textContent = sp?.icon || '?'; }} />
                  : (sp?.icon || '?')}
              </div>
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{bgMM?.mode === '2v2' ? 'Buscando rivales 2v2…' : 'Buscando rival…'}</p>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: sp?.from || '#FF8C00' }}>{sp?.label || ''}{bgMM?.gameType === 'casual' ? ' · Normal' : ' · Ranked'}</p>
            <p style={{ margin: '0 0 18px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Podés navegar la app sin cancelar</p>
            {/* Timer */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '6px 16px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: sp?.from || '#FF8C00', animation: 'pulse 1.5s ease-in-out infinite', boxShadow: `0 0 8px ${sp?.from || '#FF8C00'}` }} />
              <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
                {mins}:{String(secs).padStart(2, '0')}
              </p>
            </div>
          </div>
        </div>

        <button onClick={bgMM?.mode === '2v2' ? cancelSearch2v2 : cancelSearch} style={{ width: '100%', padding: '13px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontWeight: 800, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s' }}>
          ✕ Cancelar búsqueda
        </button>
      </div>
    );
  }

  // --- RENDER: SALA WAITING (reconexión a sala anterior) ------------------
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
            <div style={{ position: 'absolute', inset: '16px', background: p ? 'linear-gradient(135deg,' + p.from + ',' + p.to + ')' : '#333', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{p?.icon || '?'}</div>
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

  // --- RENDER: PANTALLA PRINCIPAL — Buscar Ranked ------------------------
  return (
    <div style={{ padding: '24px 18px' }}>
      {/* Modal Cómo jugar */}
      {showHowToPlay && (
        <div onClick={() => setShowHowToPlay(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#0F0F1A', borderRadius: '24px 24px 0 0', padding: '0 0 32px', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ position: 'sticky', top: 0, background: '#0F0F1A', padding: '16px 20px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff' }}>📖 Cómo jugar</p>
              <button onClick={() => setShowHowToPlay(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: '20px 20px 0' }}>
              {[
                { icon: '⚔️', title: 'Formato Bo3', desc: 'Las partidas ranked son al mejor de 3 juegos (Bo3). Ganás el set cuando ganás 2 juegos.' },
                { icon: '🚫', title: 'Fase de baneo — Game 1', desc: 'Se sortea quién es J1 y J2.\n• J1 banea 1 escenario.\n• J2 banea 2 escenarios.\n• J1 elige el escenario donde se juega.' },
                { icon: '🔄', title: 'Fase de baneo — Games 2 y 3', desc: 'El ganador del game anterior banea 3 escenarios. El perdedor elige dónde jugar el siguiente game.' },
                { icon: '👥', title: '2v2 — Capitanes', desc: 'En partidas 2v2, el creador de la sala es el capitán del equipo. Solo los capitanes pueden banear y elegir escenarios.' },
                { icon: '📊', title: 'Reportar resultado', desc: 'Al terminar cada game, ambos jugadores reportan quién ganó y con cuántos stocks de ventaja. Si hay discrepancia, se abre una disputa.' },
                { icon: '⏱️', title: 'AFK / Tiempo límite', desc: 'Tenés 25 segundos por turno en la fase de baneo. Si no actuás, el sistema elige automáticamente. Si tu rival no aparece al chat en 15 minutos, podés reclamar victoria.' },
                { icon: '📈', title: 'Ranking y RP', desc: 'Cada victoria suma RP y cada derrota resta 10 RP. Los primeros 5 juegos son de posicionamiento y definen tu rango inicial.' },
                { icon: '🎯', title: 'Modos', desc: '• Ranked: afecta tu rango y RP.\n• Normal: partidas casuales sin efecto en el rango.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ marginBottom: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 800, color: '#fff' }}>{icon} {title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(() => {
        // Mostrar rango del usuario segun modo/plataforma
        const plat = searchPlat || 'switch';
        const is2v2mode = matchMode === '2v2' && matchTypeMode !== 'casual';
        const statsObj = is2v2mode
          ? (user?.doublesStats?.[plat] || {})
          : (user?.stats?.[plat] || {});
        const rankName = statsObj.rank;
        const rankRR   = statsObj.rankPoints;
        const rankObj  = !statsObj.placementDone ? null : (rankName ? RANKS.find(r => r.name === rankName) : null);
        const inPlacement = statsObj.wins > 0 && !statsObj.placementDone;
        if (!rankObj && !inPlacement) return null;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: rankObj ? `${rankObj.color}12` : 'rgba(255,140,0,0.07)', border: `1px solid ${rankObj ? rankObj.color + '35' : 'rgba(255,140,0,0.25)'}`, borderRadius: 12, padding: '8px 14px', marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>{rankObj ? TIER_ICONS[rankObj.tier] : '⚡'}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tu rango — {plat === 'switch' ? 'Switch' : 'Parsec'}{is2v2mode ? ' 2v2' : ''}</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: rankObj ? rankObj.color : '#FF8C00' }}>
                {inPlacement ? 'Posicionamiento' : rankObj?.name}
                {rankObj && typeof rankRR === 'number' ? <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>{rankRR} RP</span> : null}
              </p>
            </div>
          </div>
        );
      })()}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff' }}>{matchTypeMode === 'casual' ? 'Normal' : 'Ranked'}</h1>
        <button onClick={() => setShowHowToPlay(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '6px 10px', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>❓ Cómo jugar</button>
      </div>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{matchTypeMode === 'casual' ? 'Partidas casuales sin efecto en el rango' : 'Elegí tu personaje y buscá rival'}</p>

      {/* Tipo: Ranked / Normal */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        {[{ id: 'ranked', label: '⚔️ Ranked', accent: '#FF8C00' }, { id: 'casual', label: '🎮 Normal', accent: '#A78BFA' }].map(t => (
          <button key={t.id} onClick={() => setMatchTypeMode(t.id)} style={{ flex: 1, padding: '10px 0', background: matchTypeMode === t.id ? (t.id === 'casual' ? 'rgba(167,139,250,0.15)' : 'rgba(255,140,0,0.15)') : 'transparent', border: 'none', borderBottom: matchTypeMode === t.id ? `2px solid ${t.accent}` : '2px solid transparent', color: matchTypeMode === t.id ? t.accent : 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>{t.label}</button>
        ))}
      </div>

      {/* Mode selector: 1v1 / 2v2 - solo para ranked */}
      {matchTypeMode !== 'casual' && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          {[{ id: '1v1', label: '⚔️ Solo (1v1)' }, { id: '2v2', label: '👥 Dobles (2v2)' }].map(m => (
            <button key={m.id} onClick={() => setMatchMode(m.id)} style={{ flex: 1, padding: '10px 0', background: matchMode === m.id ? 'rgba(255,140,0,0.15)' : 'transparent', border: 'none', borderBottom: matchMode === m.id ? '2px solid #FF8C00' : '2px solid transparent', color: matchMode === m.id ? '#FF8C00' : 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>{m.label}</button>
          ))}
        </div>
      )}

      {/* Banner de sala activa */}
      {bgMM && ['waiting','active','pending_confirm','disputed','pending_accept'].includes(bgMM.status) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg,rgba(124,58,237,0.14),rgba(255,140,0,0.08))', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 18, padding: '14px 16px', marginBottom: 20, cursor: 'default' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: bgMM.status === 'active' ? '#34D399' : bgMM.status === 'waiting' ? '#FF8C00' : '#FBBF24', flexShrink: 0, boxShadow: '0 0 8px ' + (bgMM.status === 'active' ? '#34D399' : '#FF8C00'), animation: 'pulse-ring 1.2s ease-in-out infinite' }} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 14, color: '#fff' }}>
              {bgMM.status === 'waiting'        ? 'Sala activa — esperando rival' :
               bgMM.status === 'pending_accept' ? '¡Match encontrado!' :
               bgMM.status === 'active'         ? '¡Partida en juego!' :
               bgMM.status === 'pending_confirm' ? 'Confirmá el resultado' :
                                                   'Resultado en disputa'}
            </p>
          </div>
        </div>
      )}

      {/* Personaje */}
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Tu personaje</p>
      <div style={{ marginBottom: 8 }}>
        <CharPicker selected={searchChar} onSelect={c => { setSearchChar(c); setSearchSkin(1); }} platform={searchPlat} userId={uid} prefKey={matchTypeMode === 'casual' ? 'afk_chars_casual' : 'afk_chars_ranked'} />
      </div>
      {searchChar && (() => {
        const sc = CHARACTERS.find(c => c.id === searchChar);
        if (!sc?.alts?.length) return null;
        return (
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Color</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {sc.alts.map((alt, idx) => (
                <button key={idx} onClick={() => setSearchSkin(idx + 1)}
                  style={{ width: 36, height: 36, borderRadius: 8, padding: 2, cursor: 'pointer',
                    border: searchSkin === idx + 1 ? '2px solid #FF8C00' : '1px solid rgba(255,255,255,0.1)',
                    background: searchSkin === idx + 1 ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.04)' }}>
                  <img src={stockIconPath(sc, idx + 1)} alt={'Skin ' + (idx+1)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {formError && <p style={{ margin: '0 0 12px', fontSize: 13, color: '#EF4444', textAlign: 'center' }}>{formError}</p>}

      {matchTypeMode === 'casual' ? (
        <>
          {/* Mode selector casual: 1v1 / 2v2 */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            {[{ id: '1v1', label: '⚔️ Solo (1v1)' }, { id: '2v2', label: '👥 Dobles (2v2)' }].map(m => (
              <button key={m.id} onClick={() => setCasualMode(m.id)} style={{ flex: 1, padding: '10px 0', background: casualMode === m.id ? 'rgba(167,139,250,0.15)' : 'transparent', border: 'none', borderBottom: casualMode === m.id ? '2px solid #A78BFA' : '2px solid transparent', color: casualMode === m.id ? '#A78BFA' : 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>{m.label}</button>
            ))}
          </div>

          {casualMode === '1v1' ? (
            /* Botones de búsqueda casual 1v1 */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PLATFORMS.map(px => (
                <button
                  key={px.id}
                  onClick={() => { setSearchPlat(px.id); startCasualSearch(px.id); }}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg,' + px.from + '18,' + px.to + '0a)', border: `1px solid ${px.id === 'parsec' && !parsecRole ? 'rgba(251,191,36,0.4)' : px.from + '40'}`, borderRadius: 20, padding: '18px 16px', cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: loading ? 0.6 : 1, transition: 'all 0.15s' }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,' + px.from + ',' + px.to + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, boxShadow: '0 4px 16px ' + px.from + '40' }}>{px.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 900, fontSize: 16, color: '#fff' }}>Buscar Normal en {px.label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
                      {px.id === 'parsec' && !parsecRole
                        ? <span style={{ color: '#FBBF24' }}>⚠ Elegí Host/No Host primero</span>
                        : 'Sin efecto en el rango'}
                    </p>
                  </div>
                  <Svg size={18} sw={2.5} style={{ color: 'rgba(255,255,255,0.3)' }}>{ICO.chevron}</Svg>
                </button>
              ))}
              {/* Modo Parsec inline (casual) */}
              <div style={{ marginTop: 10, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 14, padding: '10px 14px' }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Modo Parsec <span style={{ color: '#EF4444', marginLeft: 4 }}>*obligatorio</span></p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['host', 'nohost'].map(role => (
                    <button key={role} onClick={() => {
                      const nr = parsecRole === role ? null : role;
                      setParsecRole(nr);
                      if (nr) localStorage.setItem('afk_parsec_role', nr); else localStorage.removeItem('afk_parsec_role');
                      fetch('/api/players/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: uid, parsecRole: nr }) }).catch(() => {});
                    }} style={{ flex: 1, padding: '8px 6px', borderRadius: 10, border: `1px solid ${parsecRole === role ? (role === 'host' ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)') : 'rgba(255,255,255,0.1)'}`, background: parsecRole === role ? (role === 'host' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)') : 'rgba(255,255,255,0.04)', color: parsecRole === role ? (role === 'host' ? '#22C55E' : '#EF4444') : 'rgba(255,255,255,0.45)', fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {parsecRole === role ? '✅ ' : ''}{role === 'host' ? 'Host' : 'No Host'}
                    </button>
                  ))}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.4 }}>Indicá si podés hostear Parsec. Es obligatorio para buscar Normal en Parsec.</p>
              </div>
            </div>
          ) : (
            /* Casual 2v2: Party UI */
            <div>
              {!casualParty ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>Formá un equipo antes de buscar rivales 2v2</p>
                  {PLATFORMS.map(px => (
                    <button key={'cp-' + px.id} onClick={() => createCasualParty(px.id)} disabled={loading}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 18, padding: '14px 16px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.15s' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,' + px.from + ',' + px.to + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{px.icon}</div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#A78BFA' }}>Crear sala en {px.label}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Generás un código para invitar a tu compañero</p>
                      </div>
                    </button>
                  ))}
                  <div style={{ marginTop: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 16px' }}>
                    <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unirse a sala existente</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={joinCodeInput} onChange={e => setJoinCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4))} placeholder="Ej: AB3Z" maxLength={4}
                        style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 22, fontWeight: 900, letterSpacing: 6, padding: '8px 14px', outline: 'none', textAlign: 'center' }} />
                      <button onClick={() => joinCasualParty(joinCodeInput)} disabled={loading || joinCodeInput.length < 4}
                        style={{ padding: '8px 18px', background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.4)', borderRadius: 10, color: '#A78BFA', fontWeight: 800, fontSize: 13, cursor: joinCodeInput.length < 4 || loading ? 'not-allowed' : 'pointer', opacity: joinCodeInput.length < 4 ? 0.5 : 1, transition: 'all 0.15s' }}>Unirse</button>
                    </div>
                  </div>
                </div>
              ) : casualParty.status === 'waiting' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0' }}>
                  {casualParty.leader?.userId === uid ? (
                    <>
                      <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>Compartí este código con tu compañero</p>
                      <div style={{ background: 'rgba(167,139,250,0.1)', border: '2px solid rgba(167,139,250,0.4)', borderRadius: 20, padding: '18px 32px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'rgba(167,139,250,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Código de sala</p>
                        <p style={{ margin: 0, fontSize: 44, fontWeight: 900, color: '#fff', letterSpacing: 10 }}>{casualParty.code}</p>
                        <button onClick={() => { try { navigator.clipboard.writeText(casualParty.code); } catch {} }} style={{ marginTop: 10, background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8, color: '#A78BFA', fontWeight: 700, fontSize: 11, padding: '5px 14px', cursor: 'pointer' }}>📋 Copiar código</button>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>Plataforma: <strong style={{ color: '#fff' }}>{casualParty.platform === 'switch' ? '🎮 Switch' : '🖥️ Parsec'}</strong></p>
                    </>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Esperando que el líder comience la búsqueda...</p>
                  )}
                  <div style={{ width: 28, height: 28, border: '3px solid rgba(167,139,250,0.3)', borderTop: '3px solid #A78BFA', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <button onClick={leaveCasualParty} style={{ padding: '7px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#EF4444', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Cancelar sala</button>
                </div>
              ) : casualParty.status === 'ready' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 16, padding: '14px 16px' }}>
                    <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'rgba(167,139,250,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tu equipo ?</p>
                    {[casualParty.leader, casualParty.partner].map((p, i) => {
                      if (!p) return null;
                      const rf = p.charId ? CHARACTER_RENDERS[p.charId] : null;
                      const cs = rf ? charRenderPath(rf) : null;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                          {cs ? <img src={cs} alt="" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} /> : <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>⚔️</div>}
                          <div>
                            <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#fff' }}>{p.userName}</p>
                            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{p.userId === uid ? '(vos)' : 'compañero'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {PLATFORMS.map(px => (
                    <button key={px.id} onClick={() => { setSearchPlat(px.id); startCasual2v2Search(px.id); }} disabled={loading}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(135deg,' + px.from + '18,' + px.to + '0a)', border: '1px solid ' + px.from + '40', borderRadius: 18, padding: '14px 16px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.15s' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,' + px.from + ',' + px.to + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{px.icon}</div>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#fff' }}>Buscar 2v2 Normal en {px.label}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Sin efecto en el rango</p>
                      </div>
                      <Svg size={18} sw={2.5} style={{ color: 'rgba(255,255,255,0.3)' }}>{ICO.chevron}</Svg>
                    </button>
                  ))}
                  <button onClick={leaveCasualParty} style={{ padding: '7px 0', background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.6)', fontWeight: 700, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Abandonar equipo</button>
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : matchMode === '1v1' ? (
        parsecGroupView ? (
          /* ── SALA PARSEC GRUPAL ────────────────────────────────────── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <button onClick={pgLeave} style={{ background: 'none', border: 'none', color: '#06B6D4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, fontSize: 13, padding: 0 }}>
                <Svg size={16} sw={2.5}>{ICO.back}</Svg> Salir
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>🖥️ Sala Parsec Grupal</span>
              </div>
              {parsecGroup?.hostId === uid && (
                <button onClick={pgClose} disabled={pgLoading} title="Cerrar sala"
                  style={{ background: 'none', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, color: 'rgba(239,68,68,0.7)', cursor: pgLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 11, padding: '4px 9px', whiteSpace: 'nowrap' }}>
                  🚪 Cerrar sala
                </button>
              )}
            </div>

            {pgError && <p style={{ margin: 0, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: 12, color: '#EF4444', fontWeight: 700 }}>{pgError}</p>}

            {!parsecGroup ? (
              /* No estoy en ninguna sala: crear o unirse */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>Rankeo por turnos en la misma sesión Parsec. Los puntos van al ranking Parsec habitual.</p>
                {/* Crear sala */}
                <button onClick={pgCreate} disabled={pgLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 18, padding: '14px 16px', cursor: pgLoading ? 'not-allowed' : 'pointer', opacity: pgLoading ? 0.6 : 1, transition: 'all 0.15s' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#06B6D4,#0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🖥️</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#06B6D4' }}>Crear sala</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Generás un código para que se unan</p>
                  </div>
                  <Svg size={18} sw={2.5} style={{ color: 'rgba(255,255,255,0.3)' }}>{ICO.chevron}</Svg>
                </button>
                {/* Unirse */}
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 16px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unirse a sala existente</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={pgJoinCode} onChange={e => setPgJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))} placeholder="AB3Z1" maxLength={5}
                      style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 900, letterSpacing: 4, padding: '10px 12px', outline: 'none', textAlign: 'center' }} />
                    <button onClick={() => pgJoin(pgJoinCode)} disabled={pgLoading || pgJoinCode.length < 5}
                      style={{ flexShrink: 0, padding: '10px 16px', background: 'rgba(6,182,212,0.18)', border: '1px solid rgba(6,182,212,0.4)', borderRadius: 10, color: '#06B6D4', fontWeight: 800, fontSize: 13, cursor: pgJoinCode.length < 5 || pgLoading ? 'not-allowed' : 'pointer', opacity: pgJoinCode.length < 5 ? 0.5 : 1, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>Unirse</button>
                  </div>
                </div>
              </div>
            ) : parsecGroup.status === 'waiting' ? (
              /* Sala abierta, esperando jugadores */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Código */}
                <div style={{ background: 'rgba(6,182,212,0.07)', border: '2px solid rgba(6,182,212,0.35)', borderRadius: 20, padding: '16px 20px', textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'rgba(6,182,212,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Código de sala</p>
                  <p style={{ margin: 0, fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: 8 }}>{parsecGroup.code}</p>
                  <button onClick={() => { try { navigator.clipboard.writeText(parsecGroup.code); } catch {} }} style={{ marginTop: 8, background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8, color: '#06B6D4', fontWeight: 700, fontSize: 11, padding: '5px 14px', cursor: 'pointer' }}>📋 Copiar código</button>
                </div>
                {/* Jugadores */}
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Jugadores ({parsecGroup.players.length})</p>
                  {parsecGroup.players.map((p, i) => {
                    const isMe = p.userId === uid;
                    const isPHost = p.userId === parsecGroup.hostId;
                    const amHost = parsecGroup.hostId === uid;
                    const rc = p.charId ? CHARACTER_RENDERS[p.charId] : null;
                    const cs = rc ? charRenderPath(rc) : null;
                    return (
                      <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        {cs ? <img src={cs} alt="" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} onError={e => { e.target.style.display='none'; }} /> : <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>}
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: 13, color: '#fff' }}>
                            {p.userName}
                            {isMe && <span style={{ marginLeft: 5, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>(vos)</span>}
                            {isPHost && <span style={{ marginLeft: 5, fontSize: 10, color: '#06B6D4', fontWeight: 900 }}>HOST</span>}
                          </p>
                          {!p.charId && <p style={{ margin: 0, fontSize: 10, color: '#FBBF24' }}>Sin personaje elegido</p>}
                        </div>
                        {amHost && !isMe && (
                          <button onClick={() => pgKick(p.userId)} disabled={pgLoading} title="Echar jugador"
                            style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: 'rgba(239,68,68,0.6)', fontSize: 11, padding: '2px 7px', cursor: pgLoading ? 'not-allowed' : 'pointer' }}>✕</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Picker de personaje en el lobby */}
                {(() => {
                  const myPlayer = parsecGroup.players.find(p => p.userId === uid);
                  const myCurrentChar = myPlayer?.charId;
                  const myCharObj = myCurrentChar ? CHARACTERS.find(c => c.id === myCurrentChar) : null;
                  return (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px' }}>
                      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        🎮 Tu personaje{myCharObj ? ` · ${myCharObj.name}` : ' · Sin elegir'}
                      </p>
                      <div style={{ maxHeight: 130, overflowY: 'auto', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', padding: 4 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 2 }}>
                          {CHARACTERS.map(c => {
                            const sel = c.id === myCurrentChar;
                            return (
                              <button key={c.id} title={c.name} onClick={() => { if (!sel) pgUpdateChar(c.id, 1); }}
                                style={{ padding: 2, borderRadius: 5, border: `1px solid ${sel ? 'rgba(6,182,212,0.55)' : 'rgba(255,255,255,0.04)'}`, background: sel ? 'rgba(6,182,212,0.15)' : 'transparent', cursor: sel ? 'default' : 'pointer', transition: 'border 0.1s, background 0.1s' }}>
                                <img src={stockIconPath(c, 1)} alt={c.name} style={{ width: 22, height: 22, objectFit: 'contain', display: 'block' }} onError={e => { e.target.style.display='none'; }} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {parsecGroup.hostId === uid ? (
                  <button onClick={pgStart} disabled={pgLoading || parsecGroup.players.length < 2}
                    style={{ width: '100%', padding: '13px', borderRadius: 16, border: '1px solid rgba(6,182,212,0.4)', background: parsecGroup.players.length < 2 ? 'rgba(255,255,255,0.04)' : 'rgba(6,182,212,0.15)', color: parsecGroup.players.length < 2 ? 'rgba(255,255,255,0.3)' : '#06B6D4', fontWeight: 900, fontSize: 15, cursor: parsecGroup.players.length < 2 || pgLoading ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                    {parsecGroup.players.length < 2 ? 'Esperá más jugadores…' : '⚡ Empezar matchmaking'}
                  </button>
                ) : (
                  <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Esperando que el host inicie…</p>
                )}
              </div>
            ) : parsecGroup.status === 'playing' ? (
              /* Sesión activa — BO3 */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Partida actual (BO3) */}
                {parsecGroup.currentMatch && (() => {
                  const m = parsecGroup.currentMatch;
                  const isP1 = uid === m.p1.userId;
                  const isP2 = uid === m.p2.userId;
                  const isPlaying = isP1 || isP2;
                  const isHost = parsecGroup.hostId === uid;
                  const p1Render = m.p1.charId && CHARACTER_RENDERS[m.p1.charId] ? charRenderPath(CHARACTER_RENDERS[m.p1.charId]) : null;
                  const p2Render = m.p2.charId && CHARACTER_RENDERS[m.p2.charId] ? charRenderPath(CHARACTER_RENDERS[m.p2.charId]) : null;
                  const p1Score = m.score?.[m.p1.userId] || 0;
                  const p2Score = m.score?.[m.p2.userId] || 0;
                  const gameNum = m.currentGame || (m.games?.length || 0) + 1;
                  const currentStage = !m.done && m.gameStages ? m.gameStages[gameNum - 1] : null;
                  const currentStageImg = currentStage ? STAGE_IMG[currentStage] : null;
                  // Reportes: quién ya reportó y qué dijo
                  const myReport    = m.reports?.[uid];
                  const otherUid    = isP1 ? m.p2.userId : (isP2 ? m.p1.userId : null);
                  const otherReport = otherUid ? m.reports?.[otherUid] : null;
                  const otherName   = otherUid === m.p1.userId ? m.p1.userName : m.p2.userName;
                  const reportedWinnerName = otherReport ? (otherReport.winnerId === m.p1.userId ? m.p1.userName : m.p2.userName) : null;

                  return (
                    <div style={{ background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 18, padding: '16px' }}>
                      {/* Header con Game y Score */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(6,182,212,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {m.done ? '✅ Set terminado' : `⚔️ Game ${gameNum}/3`}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '3px 10px' }}>
                          <span style={{ fontSize: 14, fontWeight: 900, color: (m.done && m.setWinnerId === m.p1.userId) || p1Score > p2Score ? '#22C55E' : '#fff' }}>{p1Score}</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: '0 2px' }}>—</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: (m.done && m.setWinnerId === m.p2.userId) || p2Score > p1Score ? '#22C55E' : '#fff' }}>{p2Score}</span>
                        </div>
                      </div>

                      {/* Stage banner para el game actual */}
                      {currentStage && (
                        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: 10, height: 38, display: 'flex', alignItems: 'center' }}>
                          {currentStageImg && <img src={currentStageImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.3)' }} />}
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,182,212,0.15)' }} />
                          <p style={{ position: 'relative', margin: 0, padding: '0 12px', fontSize: 11, fontWeight: 800, color: '#06B6D4' }}>🗺️ {currentStage}</p>
                        </div>
                      )}

                      {/* VS */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          {p1Render ? <img src={p1Render} alt="" style={{ width: 54, height: 54, objectFit: 'contain', margin: '0 auto 4px', display: 'block' }} onError={e => { e.target.style.display='none'; }} /> : <div style={{ width: 54, height: 54, borderRadius: 12, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 4px' }}>👤</div>}
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: m.done && m.setWinnerId === m.p1.userId ? '#22C55E' : '#fff' }}>{m.p1.userName}{m.done && m.setWinnerId === m.p1.userId ? ' 🏆' : ''}</p>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 900, color: 'rgba(255,255,255,0.4)' }}>VS</span>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          {p2Render ? <img src={p2Render} alt="" style={{ width: 54, height: 54, objectFit: 'contain', margin: '0 auto 4px', display: 'block' }} onError={e => { e.target.style.display='none'; }} /> : <div style={{ width: 54, height: 54, borderRadius: 12, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 4px' }}>👤</div>}
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: m.done && m.setWinnerId === m.p2.userId ? '#22C55E' : '#fff' }}>{m.p2.userName}{m.done && m.setWinnerId === m.p2.userId ? ' 🏆' : ''}</p>
                        </div>
                      </div>

                      {/* Picker de personaje — solo cuando el set terminó */}
                      {isPlaying && m.done && (() => {
                        const myPlayer = parsecGroup.players.find(p => p.userId === uid);
                        const myCurrentChar = myPlayer?.charId;
                        const myCharObj = myCurrentChar ? CHARACTERS.find(c => c.id === myCurrentChar) : null;
                        return (
                          <div style={{ marginBottom: 10 }}>
                            <p style={{ margin: '0 0 5px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              🎮 Tu personaje{myCharObj ? ` · ${myCharObj.name}` : ' · Sin elegir'}
                            </p>
                            <div style={{ maxHeight: 112, overflowY: 'auto', borderRadius: 8, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', padding: 4 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 2 }}>
                                {CHARACTERS.map(c => {
                                  const sel = c.id === myCurrentChar;
                                  return (
                                    <button key={c.id} title={c.name} onClick={() => { if (!sel) pgUpdateChar(c.id, 1); }}
                                      style={{ padding: 2, borderRadius: 5, border: `1px solid ${sel ? 'rgba(6,182,212,0.55)' : 'rgba(255,255,255,0.04)'}`, background: sel ? 'rgba(6,182,212,0.15)' : 'transparent', cursor: sel ? 'default' : 'pointer', transition: 'border 0.1s, background 0.1s' }}>
                                      <img src={stockIconPath(c, 1)} alt={c.name} style={{ width: 22, height: 22, objectFit: 'contain', display: 'block' }} onError={e => { e.target.style.display='none'; }} />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Games jugados dentro del BO3 */}
                      {m.games && m.games.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 12 }}>
                          {m.games.map(g => {
                            const gWon = g.winnerId === m.p1.userId;
                            const gStageImg = g.stage ? STAGE_IMG[g.stage] : null;
                            return (
                              <div key={g.gameNum} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', minWidth: 0 }}>
                                {gStageImg && <img src={gStageImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.25)', pointerEvents: 'none' }} />}
                                <span style={{ position: 'relative', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)' }}>G{g.gameNum}</span>
                                <span style={{ position: 'relative', fontSize: 12 }}>{gWon ? '🏆' : '💀'}</span>
                                <span style={{ position: 'relative', fontSize: 10, fontWeight: 700, color: gWon ? '#22C55E' : '#EF4444' }}>{gWon ? m.p1.userName.split(' ')[0] : m.p2.userName.split(' ')[0]}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Set terminado: resultado final */}
                      {m.done ? (
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 900, color: '#22C55E' }}>
                            🏆 Ganó el set: {m.setWinnerId === m.p1.userId ? m.p1.userName : m.p2.userName}
                          </p>
                          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>
                            {p1Score} — {p2Score}
                          </p>
                          {typeof m.rpDelta === 'number' && <p style={{ margin: '0 0 12px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>+{m.rpDelta} RP ganador · {m.loserRpDelta} RP perdedor</p>}
                          {isHost && (
                            <button onClick={pgNext} disabled={pgLoading}
                              style={{ marginTop: 4, padding: '10px 28px', borderRadius: 14, border: '1px solid rgba(6,182,212,0.4)', background: 'rgba(6,182,212,0.15)', color: '#06B6D4', fontWeight: 900, fontSize: 14, cursor: pgLoading ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                              ⚡ Siguiente set
                            </button>
                          )}
                          {!isHost && <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Esperando que el host avance…</p>}
                        </div>

                      ) : isPlaying ? (
                        /* Zona de reporte — SOLO los jugadores del match */
                        myReport && !otherReport ? (
                          /* Ya reporté, esperando confirmación */
                          <p style={{ textAlign: 'center', margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                            ✅ Resultado enviado. Esperando confirmación de {otherName}…
                          </p>
                        ) : otherReport && !myReport && !pgDisputing ? (
                          /* El otro jugador ya reportó — mostrar para confirmar o disputar */
                          <div style={{ textAlign: 'center' }}>
                            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
                              <strong style={{ color: '#FBBF24' }}>{otherName}</strong> dice que ganó <strong style={{ color: '#fff' }}>{reportedWinnerName}</strong>
                            </p>
                            <p style={{ margin: '0 0 10px', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>con {otherReport.stocksWon} stock{otherReport.stocksWon !== 1 ? 's' : ''}</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => pgReport(otherReport.winnerId, otherReport.stocksWon)} disabled={pgLoading}
                                style={{ flex: 1, padding: '10px 6px', borderRadius: 12, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.1)', color: '#22C55E', fontWeight: 800, fontSize: 13, cursor: pgLoading ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                                ✅ Confirmar
                              </button>
                              <button onClick={() => setPgDisputing(true)} disabled={pgLoading}
                                style={{ flex: 1, padding: '10px 6px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontWeight: 800, fontSize: 13, cursor: pgLoading ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                                ❌ Disputar
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Formulario de reporte (normal o en modo disputa) */
                          <div>
                            {pgDisputing && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '5px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>⚠️ Disputando resultado</span>
                                <button onClick={() => setPgDisputing(false)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.6)', fontSize: 11, cursor: 'pointer', padding: 0 }}>✕ Cancelar</button>
                              </div>
                            )}
                            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              Reportá el Game {gameNum}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Stocks del ganador:</span>
                              {[1, 2, 3].map(s => (
                                <button key={s} onClick={() => setPgReportStocks(s)}
                                  style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${pgReportStocks === s ? 'rgba(6,182,212,0.6)' : 'rgba(255,255,255,0.1)'}`, background: pgReportStocks === s ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.04)', color: pgReportStocks === s ? '#06B6D4' : 'rgba(255,255,255,0.5)', fontWeight: 900, fontSize: 14, cursor: 'pointer', transition: 'all 0.1s' }}>{s}</button>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => pgReport(m.p1.userId)} disabled={pgLoading}
                                style={{ flex: 1, padding: '10px 6px', borderRadius: 12, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.1)', color: '#22C55E', fontWeight: 800, fontSize: 12, cursor: pgLoading ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                                🏆 Ganó {m.p1.userName}
                              </button>
                              <button onClick={() => pgReport(m.p2.userId)} disabled={pgLoading}
                                style={{ flex: 1, padding: '10px 6px', borderRadius: 12, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.1)', color: '#22C55E', fontWeight: 800, fontSize: 12, cursor: pgLoading ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                                🏆 Ganó {m.p2.userName}
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        /* Espectador / Host */
                        <p style={{ textAlign: 'center', margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                          {isHost ? '🎮 Host — Game ' : 'Observador — Game '}{gameNum} en curso…
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Cambio de personaje — para los que NO están en el match activo */}
                {(() => {
                  const cm = parsecGroup.currentMatch;
                  const isInCurrentMatch = cm && !cm.done && (cm.p1.userId === uid || cm.p2.userId === uid);
                  if (isInCurrentMatch) return null;
                  const myPlayer = parsecGroup.players.find(p => p.userId === uid);
                  const myCurrentChar = myPlayer?.charId;
                  const myCurrentAlt = myPlayer?.charAlt || 1;
                  const myCharObj = myCurrentChar ? CHARACTERS.find(c => c.id === myCurrentChar) : null;
                  return (
                    <div style={{ background: 'rgba(255,140,0,0.06)', border: '1px solid rgba(255,140,0,0.18)', borderRadius: 14, padding: '12px 14px' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,140,0,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🎮 Tu personaje</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        {myCharObj && <img src={stockIconPath(myCharObj, myCurrentAlt)} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />}
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Actual: <strong style={{ color: '#fff' }}>{myCharObj?.name || 'Sin elegir'}</strong></span>
                      </div>
                      <div style={{ maxHeight: 160, overflowY: 'auto', borderRadius: 10, background: '#10101A', border: '1px solid rgba(255,255,255,0.06)', padding: 6 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 3 }}>
                          {CHARACTERS.map(c => {
                            const sel = c.id === myCurrentChar;
                            return (
                              <button key={c.id} title={c.name} onClick={() => { if (!sel) pgUpdateChar(c.id, 1); }}
                                style={{ padding: 3, borderRadius: 6, border: `1px solid ${sel ? 'rgba(255,140,0,0.5)' : 'rgba(255,255,255,0.05)'}`, background: sel ? 'rgba(255,140,0,0.12)' : 'transparent', cursor: sel ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src={stockIconPath(c, 1)} alt={c.name} style={{ width: 26, height: 26, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Marcador de sesión */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '12px 14px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Marcador de sesión</p>
                  {[...parsecGroup.players].sort((a, b) => (b.wins || 0) - (a.wins || 0)).map((p, i) => {
                    const rc = p.charId && CHARACTER_RENDERS[p.charId] ? charRenderPath(CHARACTER_RENDERS[p.charId]) : null;
                    const isMe = p.userId === uid;
                    const amHost = parsecGroup.hostId === uid;
                    return (
                      <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(255,255,255,0.25)', width: 16, textAlign: 'center' }}>{i + 1}</span>
                        {rc ? <img src={rc} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} /> : <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />}
                        <span style={{ flex: 1, fontSize: 13, fontWeight: isMe ? 900 : 700, color: isMe ? '#06B6D4' : '#fff' }}>{p.userName}</span>
                        <span style={{ fontSize: 12, color: '#22C55E', fontWeight: 800 }}>{p.wins || 0}W</span>
                        <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 800, marginLeft: 6 }}>{p.losses || 0}L</span>
                        {amHost && !isMe && (
                          <button onClick={() => pgKick(p.userId)} disabled={pgLoading} title="Echar jugador"
                            style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: 'rgba(239,68,68,0.6)', fontSize: 11, padding: '2px 7px', marginLeft: 4, cursor: pgLoading ? 'not-allowed' : 'pointer' }}>✕</button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Historial de la sesión */}
                {parsecGroup.matchHistory && parsecGroup.matchHistory.length > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 14px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Historial ({parsecGroup.matchHistory.length})</p>
                    {[...parsecGroup.matchHistory].reverse().slice(0, 6).map((h, i) => {
                      const wName = parsecGroup.players.find(p => p.userId === h.winnerId)?.userName || h.winnerId;
                      const lName = parsecGroup.players.find(p => p.userId === (h.p1Id === h.winnerId ? h.p2Id : h.p1Id))?.userName || '';
                      const wScore = h.score?.[h.winnerId] || 2;
                      const lScore = h.score?.[h.p1Id === h.winnerId ? h.p2Id : h.p1Id] || 0;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#22C55E', flex: 1 }}>{wName}</span>
                          <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.35)' }}>{wScore}–{lScore}</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', flex: 1, textAlign: 'right' }}>{lName}</span>
                          {typeof h.rpDelta === 'number' && <span style={{ fontSize: 10, color: '#22C55E', marginLeft: 6 }}>+{h.rpDelta}RP</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {/* Cómo funciona */}
            {!parsecGroup && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 1 }}>¿Cómo funciona?</p>
                {[['🖥️','Todos en Parsec','Varios jugadores en la misma sesión Parsec'],['📋','Creá o unite','Una persona crea la sala y comparte el código'],['⚡','El host inicia','Con 2 o más jugadores, el host arranca el matchmaking'],['🎲','Emparejamiento aleatorio','El sistema hace los pares evitando repetir el mismo consecutivamente'],['🏆','Puntos al ranking','Cada resultado suma al ranking Parsec de todos']].map(([icon, t, d]) => (
                  <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '3px 0' }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                    <div>
                      <p style={{ margin: '0 0 1px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{t}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── BÚSQUEDA 1v1 NORMAL ────────────────────────────────────── */
          <>
            {/* Botones de búsqueda por plataforma */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PLATFORMS.map(px => (
                <button
                  key={px.id}
                  onClick={() => { setSearchPlat(px.id); startSearch(px.id); }}
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg,' + px.from + '18,' + px.to + '0a)', border: `1px solid ${px.id === 'parsec' && !parsecRole ? 'rgba(251,191,36,0.4)' : px.from + '40'}`, borderRadius: 20, padding: '18px 16px', cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: loading ? 0.6 : 1, transition: 'all 0.15s' }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg,' + px.from + ',' + px.to + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, boxShadow: '0 4px 16px ' + px.from + '40' }}>{px.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 900, fontSize: 16, color: '#fff' }}>Buscar en {px.label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
                      {px.id === 'switch' ? 'Ranked en Nintendo Switch Online' : (
                        <>Ranked en Parsec (PC){' '}
                          {parsecRole
                            ? <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 5, fontSize: 10, fontWeight: 800, background: parsecRole === 'host' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', color: parsecRole === 'host' ? '#22C55E' : '#EF4444' }}>{parsecRole === 'host' ? 'HOST' : 'NO HOST'}</span>
                            : <span style={{ marginLeft: 4, padding: '1px 6px', borderRadius: 5, fontSize: 10, fontWeight: 800, background: 'rgba(251,191,36,0.15)', color: '#FBBF24' }}>⚠ Elegí Host/No Host</span>}
                        </>
                      )}
                    </p>
                  </div>
                  <Svg size={18} sw={2.5} style={{ color: 'rgba(255,255,255,0.3)' }}>{ICO.chevron}</Svg>
                </button>
              ))}
            </div>

            {/* Modo de conexión Parsec */}
            <div style={{ marginTop: 10, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 14, padding: '10px 14px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Modo Parsec <span style={{ color: '#EF4444', marginLeft: 4 }}>*obligatorio</span></p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    const nr = parsecRole === 'host' ? null : 'host';
                    setParsecRole(nr);
                    if (nr) localStorage.setItem('afk_parsec_role', nr); else localStorage.removeItem('afk_parsec_role');
                    fetch('/api/players/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: uid, parsecRole: nr }) }).catch(() => {});
                  }}
                  style={{ flex: 1, padding: '8px 6px', borderRadius: 10, border: `1px solid ${parsecRole === 'host' ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)'}`, background: parsecRole === 'host' ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)', color: parsecRole === 'host' ? '#22C55E' : 'rgba(255,255,255,0.45)', fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                >{parsecRole === 'host' ? '✅ ' : ''}Host</button>
                <button
                  onClick={() => {
                    const nr = parsecRole === 'nohost' ? null : 'nohost';
                    setParsecRole(nr);
                    if (nr) localStorage.setItem('afk_parsec_role', nr); else localStorage.removeItem('afk_parsec_role');
                    fetch('/api/players/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: uid, parsecRole: nr }) }).catch(() => {});
                  }}
                  style={{ flex: 1, padding: '8px 6px', borderRadius: 10, border: `1px solid ${parsecRole === 'nohost' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, background: parsecRole === 'nohost' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)', color: parsecRole === 'nohost' ? '#EF4444' : 'rgba(255,255,255,0.45)', fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                >{parsecRole === 'nohost' ? '✅ ' : ''}No Host</button>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.25)', lineHeight: 1.4 }}>Indicá si podés hostear Parsec. Es obligatorio para buscar partida.</p>
            </div>

            {/* Entrada a Sala Parsec Grupal */}
            <button onClick={() => { setParsecGroupView(true); setPgError(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 18, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', marginTop: 6 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#06B6D4,#0891B2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🖥️</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 14, color: '#06B6D4' }}>Sala Parsec Grupal</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Varios en un mismo Parsec — turnos aleatorios</p>
              </div>
              <Svg size={18} sw={2.5} style={{ color: 'rgba(255,255,255,0.3)' }}>{ICO.chevron}</Svg>
            </button>
          </>
        )
      ) : (
        <>
          {/* 2v2 Ranked - Room code party system */}
          {!rankedParty ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>Formá un equipo antes de buscar rivales Ranked 2v2</p>
              {PLATFORMS.map(px => (
                <button key={'rp-' + px.id} onClick={() => createRankedParty(px.id)} disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,140,0,0.06)', border: '1px solid rgba(255,140,0,0.22)', borderRadius: 18, padding: '14px 16px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.15s' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,' + px.from + ',' + px.to + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{px.icon}</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#FF8C00' }}>Crear sala en {px.label}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Generás un código para invitar a tu compañero</p>
                  </div>
                </button>
              ))}
              <div style={{ marginTop: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 16px' }}>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Unirse a sala existente</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={rankedJoinCodeInput} onChange={e => setRankedJoinCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4))} placeholder="Ej: AB3Z" maxLength={4}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: '#fff', fontSize: 22, fontWeight: 900, letterSpacing: 6, padding: '8px 14px', outline: 'none', textAlign: 'center' }} />
                  <button onClick={() => joinRankedParty(rankedJoinCodeInput)} disabled={loading || rankedJoinCodeInput.length < 4}
                    style={{ padding: '8px 18px', background: 'rgba(255,140,0,0.18)', border: '1px solid rgba(255,140,0,0.4)', borderRadius: 10, color: '#FF8C00', fontWeight: 800, fontSize: 13, cursor: rankedJoinCodeInput.length < 4 || loading ? 'not-allowed' : 'pointer', opacity: rankedJoinCodeInput.length < 4 ? 0.5 : 1, transition: 'all 0.15s' }}>Unirse</button>
                </div>
              </div>
            </div>
          ) : rankedParty.status === 'waiting' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '8px 0' }}>
              {rankedParty.leader?.userId === uid ? (
                <>
                      <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>Compartí este código con tu compañero</p>
                  <div style={{ background: 'rgba(255,140,0,0.08)', border: '2px solid rgba(255,140,0,0.4)', borderRadius: 20, padding: '18px 32px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'rgba(255,140,0,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Código de sala</p>
                    <p style={{ margin: 0, fontSize: 44, fontWeight: 900, color: '#fff', letterSpacing: 10 }}>{rankedParty.code}</p>
                    <button onClick={() => { try { navigator.clipboard.writeText(rankedParty.code); } catch {} }} style={{ marginTop: 10, background: 'rgba(255,140,0,0.18)', border: '1px solid rgba(255,140,0,0.3)', borderRadius: 8, color: '#FF8C00', fontWeight: 700, fontSize: 11, padding: '5px 14px', cursor: 'pointer' }}>📋 Copiar código</button>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>Plataforma: <strong style={{ color: '#fff' }}>{rankedParty.platform === 'switch' ? '🎮 Switch' : '🖥️ Parsec'}</strong></p>
                </>
              ) : (
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>Esperando que el líder comience la búsqueda...</p>
              )}
              <div style={{ width: 28, height: 28, border: '3px solid rgba(255,140,0,0.3)', borderTop: '3px solid #FF8C00', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <button onClick={leaveRankedParty} style={{ padding: '7px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#EF4444', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Cancelar sala</button>
            </div>
          ) : rankedParty.status === 'ready' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: 'rgba(255,140,0,0.05)', border: '1px solid rgba(255,140,0,0.18)', borderRadius: 16, padding: '14px 16px' }}>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'rgba(255,140,0,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tu equipo ?</p>
                {[rankedParty.leader, rankedParty.invited].map((p, idx) => p ? (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#fff' }}>{p.userName}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{p.userId === uid ? '(vos)' : 'compañero'}</p>
                    </div>
                  </div>
                ) : null)}
              </div>
              {PLATFORMS.filter(px => px.id === rankedParty.platform).map(px => (
                <button key={px.id} onClick={() => { setSearchPlat(px.id); startSearch2v2(px.id); }} disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(135deg,' + px.from + '18,' + px.to + '0a)', border: '1px solid ' + px.from + '40', borderRadius: 18, padding: '14px 16px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all 0.15s' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,' + px.from + ',' + px.to + ')', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{px.icon}</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#fff' }}>Buscar 2v2 Ranked en {px.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Ranked dobles</p>
                  </div>
                  <Svg size={18} sw={2.5} style={{ color: 'rgba(255,255,255,0.3)' }}>{ICO.chevron}</Svg>
                </button>
              ))}
              <button onClick={leaveRankedParty} style={{ padding: '7px 0', background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.6)', fontWeight: 700, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>Abandonar equipo</button>
            </div>
          ) : null}
        </>
      )}

      {/* Cómo funciona */}
      <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1 }}>¿Cómo funciona?</p>
        {matchTypeMode === 'casual' ? (
          [['🎮','Elegí personaje','Seleccioná con quién querés jugar'],['🔍','Buscá rival','Elegí Switch o Parsec y entrá a la cola Normal'],['✅','Ambos aceptan (15s)','Cuando se encuentre rival, los dos confirman'],['🎮','A jugar','Partida casual, sin efecto en el rango']].map(([icon,t,d])=>(
            <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '4px 0' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
              <div>
                <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{t}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{d}</p>
              </div>
            </div>
          ))
        ) : matchMode === '1v1' ? (
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
