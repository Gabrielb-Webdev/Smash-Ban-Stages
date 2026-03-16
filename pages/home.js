import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getStoredUser } from '../src/utils/auth';

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
  }, []);

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #E88E00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const displayName = user.name || (user.slug || '').replace(/^user\//, '') || 'Usuario';
  const initial = displayName[0]?.toUpperCase() || '?';

  return (
    <>
      <Head>
        <title>AFK Smash</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>{`
          * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
          body { background: #080808; margin: 0; }
          ::-webkit-scrollbar { display: none; }
          .tab-content { animation: fadeUp 0.18s ease; }
          @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
          @keyframes spin   { to { transform: rotate(360deg) } }
          .shimmer { background: linear-gradient(90deg,#1a1a1a 25%,#242424 50%,#1a1a1a 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
          @keyframes shimmer { to { background-position: -200% 0 } }
        `}</style>
      </Head>

      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100dvh', background: '#080808', display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* ── TOP BAR ── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 40,
          padding: '14px 18px 12px',
          background: 'rgba(8,8,8,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 4px 12px rgba(232,142,0,0.4)' }}>
              🎮
            </div>
            <div>
              <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.5px', color: '#fff' }}>AFK</span>
              <span style={{ fontWeight: 400, fontSize: 16, color: 'rgba(255,255,255,0.5)', marginLeft: 2 }}>Smash</span>
            </div>
          </div>

          {/* Right side */}
          <div id="app-profile-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              <Svg size={18} sw={1.8}>{ICO.bell}</Svg>
            </button>
            {user.avatar
              ? <img src={user.avatar} alt={displayName} style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(232,142,0,0.4)', objectFit: 'cover' }} />
              : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(232,142,0,0.3),rgba(232,142,0,0.1))', border: '2px solid rgba(232,142,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#E88E00' }}>
                  {initial}
                </div>
            }
          </div>
        </header>

        {/* ── CONTENT ── */}
        <main key={tab} className="tab-content" style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
          {tab === 'inicio'   && <TabInicio   user={user} isAdmin={isAdmin} router={router} displayName={displayName} initial={initial} />}
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
  const items = [
    { id: 'inicio',   label: 'Inicio',    icon: ICO.home },
    { id: 'rankings', label: 'Rankings',  icon: ICO.trophy },
    { id: 'torneos',  label: 'Torneos',   icon: ICO.calendar },
    { id: 'tips',     label: 'Tips',      icon: ICO.bulb },
    { id: 'match',    label: 'Match',     icon: ICO.bolt },
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 50,
      background: 'rgba(10,10,10,0.97)',
      backdropFilter: 'blur(24px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
    }}>
      {items.map(item => {
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4, paddingTop: 10, paddingBottom: 14,
              border: 'none', background: 'transparent', cursor: 'pointer',
              position: 'relative', transition: 'color 0.15s ease',
              color: active ? '#FF8C00' : 'rgba(255,255,255,0.22)',
            }}
          >
            {/* Active indicator bar at top */}
            <span style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: active ? 28 : 0, height: 2,
              background: 'linear-gradient(90deg,#FF8C00,#E85D00)',
              borderRadius: '0 0 4px 4px',
              transition: 'width 0.2s ease',
              boxShadow: active ? '0 0 8px rgba(255,140,0,0.6)' : 'none',
            }} />

            <Svg size={22} sw={active ? 2.2 : 1.6}>{item.icon}</Svg>

            <span style={{
              fontSize: 9, fontWeight: active ? 700 : 500,
              letterSpacing: '0.04em',
              opacity: active ? 1 : 0.5,
              transition: 'opacity 0.15s',
            }}>
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
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', margin: 0 }}>{children}</p>
      {action && <button onClick={onAction} style={{ fontSize: 11, color: '#FF8C00', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{action}</button>}
    </div>
  );
}

/* ─── STAT CARD ─────────────────────────────────── */
function StatCard({ icon, label, value, sub }) {
  return (
    <div style={{
      flex: 1, background: '#141414', border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: 16, padding: '14px 10px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>{label}</span>
      {sub && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{sub}</span>}
    </div>
  );
}

/* ─── TAG ────────────────────────────────────────── */
function Tag({ children, color = '#FF8C00' }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20,
      background: `${color}18`, color, border: `1px solid ${color}28`,
      letterSpacing: '0.06em',
    }}>
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════════
   TAB — INICIO
═══════════════════════════════════════════════════ */
function TabInicio({ user, isAdmin, router, displayName, initial }) {
  return (
    <div>
      {/* Hero Banner */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: '28px 20px 32px',
        background: 'linear-gradient(160deg, rgba(232,142,0,0.12) 0%, rgba(232,80,0,0.06) 40%, transparent 70%)',
      }}>
        {/* Decorative circle */}
        <div style={{
          position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,142,0,0.08) 0%, transparent 70%)', pointerEvents: 'none',
        }} />

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <div style={{ position: 'relative' }}>
            {user.avatar
              ? <img src={user.avatar} alt={displayName} style={{ width: 56, height: 56, borderRadius: 18, border: '2px solid rgba(232,142,0,0.5)', objectFit: 'cover' }} />
              : <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, color: '#fff', boxShadow: '0 8px 20px rgba(232,142,0,0.3)' }}>
                  {initial}
                </div>
            }
            <div style={{ position: 'absolute', bottom: -3, right: -3, width: 14, height: 14, borderRadius: '50%', background: '#22C55E', border: '2px solid #080808' }} />
          </div>

          <div>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginBottom: 2 }}>Hola,</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.4px', lineHeight: 1.1 }}>{displayName}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
              <Tag color="#FF8C00">AFK Smash</Tag>
              <Tag color="#6366F1">Buenos Aires</Tag>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <StatCard icon="⭐" label="Puntos" value="—" sub="BA Local" />
          <StatCard icon="🏆" label="Ranking" value="—" sub="posición" />
          <StatCard icon="⚡" label="W / L" value="—" sub="online" />
        </div>
      </div>

      <div style={{ padding: '0 18px 24px' }}>

        {/* Admin button */}
        {isAdmin && (
          <button onClick={() => router.push('/')} style={{
            width: '100%', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 14,
            background: 'linear-gradient(135deg,rgba(232,142,0,0.12),rgba(232,80,0,0.06))',
            border: '1px solid rgba(232,142,0,0.2)', borderRadius: 18, padding: '14px 16px',
            cursor: 'pointer', textAlign: 'left',
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 12px rgba(232,142,0,0.35)', flexShrink: 0 }}>
              🎛️
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 800, color: '#FF8C00', fontSize: 14 }}>Panel de Administración</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Gestionar torneos y setups</p>
            </div>
            <Svg size={18} sw={2}>{ICO.chevron}</Svg>
          </button>
        )}

        {/* Comunidades */}
        <SectionTitle>Comunidades</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {[
            {
              name: 'Smash AFK', region: 'Buenos Aires', tag: 'LOCAL', tagColor: '#38BDF8',
              desc: 'Torneos semanales, ranking local y espacio de práctica competitiva.',
              icon: '🗺️', from: '#0C4A6E', to: '#0f172a', border: '1px solid rgba(56,189,248,0.15)',
            },
            {
              name: 'Smash INC', region: 'Nacional · Argentina', tag: 'NACIONAL', tagColor: '#FB923C',
              desc: 'Circuito nacional con ranking y torneos interregionales.',
              icon: '🏅', from: '#431407', to: '#1c0a00', border: '1px solid rgba(251,146,60,0.15)',
            },
          ].map(c => (
            <div key={c.name} style={{
              background: `linear-gradient(135deg,${c.from},${c.to})`,
              border: c.border, borderRadius: 20, padding: '16px',
              display: 'flex', gap: 14, alignItems: 'flex-start',
            }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {c.icon}
              </div>
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

        {/* Próximamente */}
        <SectionTitle>Próximamente</SectionTitle>
        <div style={{
          background: '#141414', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {[
            { icon: '📊', title: 'Sistema de puntos en vivo', sub: 'Ranking actualizado después de cada torneo' },
            { icon: '⚡', title: 'Matchmaking online', sub: 'Encontrá rivales de tu nivel en segundos' },
            { icon: '📚', title: 'Guías por personaje', sub: 'Combos, neutrales y matchups' },
          ].map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{f.title}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB — RANKINGS
═══════════════════════════════════════════════════ */
function TabRankings() {
  const [mode, setMode] = useState('ba');
  const MODES = [{ id: 'ba', label: 'BA Local' }, { id: 'inc', label: 'Nacional' }, { id: 'char', label: 'Personaje' }];

  return (
    <div style={{ padding: '24px 18px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Rankings</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Clasificaciones de la comunidad</p>

      {/* Pill switcher */}
      <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, display: 'flex', gap: 4, marginBottom: 22 }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{
              flex: 1, padding: '9px 4px', borderRadius: 10, fontWeight: 700, fontSize: 12,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: mode === m.id ? 'linear-gradient(135deg,#FF8C00,#E85D00)' : 'transparent',
              color: mode === m.id ? '#fff' : 'rgba(255,255,255,0.3)',
              boxShadow: mode === m.id ? '0 4px 12px rgba(232,142,0,0.3)' : 'none',
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {mode !== 'char' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{mode === 'ba' ? '📍 Buenos Aires' : '🇦🇷 Argentina'}</p>
            <Tag color="#EAB308">Próximamente</Tag>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4, 5].map(pos => {
              const medals = ['🥇', '🥈', '🥉'];
              return (
                <div key={pos} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: pos === 1 ? 'linear-gradient(135deg,rgba(234,179,8,0.08),rgba(234,179,8,0.02))' : '#141414',
                  border: `1px solid ${pos === 1 ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.05)'}`,
                  borderRadius: 14, padding: '12px 16px',
                }}>
                  <span style={{ fontSize: pos <= 3 ? 22 : 14, fontWeight: 900, color: 'rgba(255,255,255,0.2)', width: 26, textAlign: 'center', flexShrink: 0 }}>
                    {pos <= 3 ? medals[pos - 1] : pos}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="shimmer" style={{ height: 12, width: 100, borderRadius: 6, marginBottom: 6 }} />
                    <div className="shimmer" style={{ height: 9, width: 60, borderRadius: 5 }} />
                  </div>
                  <div className="shimmer" style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0 }} />
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Tu rendimiento por personaje</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { t: 'S', a: '#FBBF24', b: '#F59E0B' },
              { t: 'A', a: '#34D399', b: '#10B981' },
              { t: 'B', a: '#60A5FA', b: '#3B82F6' },
              { t: 'C', a: '#9CA3AF', b: '#6B7280' },
            ].map(({ t, a, b }) => (
              <div key={t} style={{
                background: '#141414', border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: 16, padding: '20px 12px', textAlign: 'center', opacity: 0.4,
              }}>
                <p style={{ margin: '0 0 6px', fontSize: 36, fontWeight: 900, background: `linear-gradient(135deg,${a},${b})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Clase {t}</p>
              </div>
            ))}
          </div>
          <div style={{ background: '#141414', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 18, padding: '28px 20px', textAlign: 'center' }}>
            <span style={{ fontSize: 32 }}>🎭</span>
            <p style={{ margin: '10px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Jugá partidas para ver tu ranking por personaje</p>
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
            <div key={i} style={{ background: '#141414', borderRadius: 18, padding: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="shimmer" style={{ height: 14, width: '70%', borderRadius: 7, marginBottom: 10 }} />
              <div className="shimmer" style={{ height: 10, width: '40%', borderRadius: 5 }} />
            </div>
          ))}
        </div>
      ) : torneos.length === 0 ? (
        <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '44px 24px', textAlign: 'center' }}>
          <span style={{ fontSize: 44 }}>📋</span>
          <p style={{ margin: '14px 0 6px', fontWeight: 800, fontSize: 16, color: '#fff' }}>Sin torneos activos</p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Los torneos de Start.GG van a aparecer acá automáticamente</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {torneos.map((t, i) => (
            <div key={i} style={{
              background: '#141414', border: '1px solid rgba(255,255,255,0.05)',
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

function TabTips() {
  const [selected, setSelected] = useState(null);

  if (selected) return (
    <div style={{ padding: '24px 18px' }}>
      <button onClick={() => setSelected(null)} style={{
        display: 'flex', alignItems: 'center', gap: 8, color: '#FF8C00',
        fontSize: 14, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px 0', marginBottom: 20,
      }}>
        <Svg size={18} sw={2}>{ICO.back}</Svg> Volver
      </button>
      <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900, color: '#fff' }}>{selected}</h2>
      <p style={{ margin: '0 0 22px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Tips de la comunidad</p>
      <div style={{ background: '#141414', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 20, padding: '40px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: 40 }}>💡</span>
        <p style={{ margin: '14px 0 4px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Sin tips todavía para <span style={{ color: '#fff' }}>{selected}</span></p>
        <p style={{ margin: '0 0 18px', fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Sé el primero en colaborar</p>
        <div style={{ display: 'inline-flex', background: 'rgba(232,142,0,0.08)', border: '1px solid rgba(232,142,0,0.15)', borderRadius: 10, padding: '8px 16px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,140,0,0.5)' }}>+ Subir tip — Próximamente</span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '24px 18px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Tips</h1>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Elegí un personaje</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {CHARS.map((c) => (
          <button key={c} onClick={() => setSelected(c)} style={{
            background: '#141414', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 16, padding: '10px 12px', textAlign: 'left',
            cursor: 'pointer', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
            onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(232,142,0,0.3)'; e.currentTarget.style.background = 'rgba(232,142,0,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.05)'; e.currentTarget.style.background = '#141414'; }}
          >
            <img
              src={`/images/characters/${encodeURIComponent(c.replace(/\.$/, ''))}.png`}
              alt={c}
              style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}
            />
            <div style={{ overflow: 'hidden' }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</p>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>0 tips</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   TAB — MATCH
═══════════════════════════════════════════════════ */
function TabMatch() {
  const [plat, setPlat] = useState(null);
  const p = PLATFORMS.find(x => x.id === plat);

  return (
    <div style={{ padding: '24px 18px' }}>
      {plat && (
        <button onClick={() => setPlat(null)} style={{
          display: 'flex', alignItems: 'center', gap: 8, color: '#FF8C00',
          fontSize: 14, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer',
          padding: '4px 0', marginBottom: 20,
        }}>
          <Svg size={18} sw={2}>{ICO.back}</Svg> Volver
        </button>
      )}

      {!plat ? (
        <>
          <h1 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Matchmaking</h1>
          <p style={{ margin: '0 0 22px', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Elegí tu plataforma para jugar</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {PLATFORMS.map(px => (
              <button key={px.id} onClick={() => setPlat(px.id)} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: `linear-gradient(135deg,${px.from}1a,${px.to}0d)`,
                border: `1px solid ${px.from}30`, borderRadius: 20, padding: '16px', cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s',
              }}>
                <div style={{ width: 50, height: 50, borderRadius: 16, background: `linear-gradient(135deg,${px.from},${px.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, boxShadow: `0 6px 16px ${px.from}35` }}>
                  {px.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 3px', fontWeight: 800, fontSize: 15, color: '#fff' }}>{px.label}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{px.id === 'parsec' ? 'Emulador · Rollback netcode' : 'Nintendo Switch Online'}</p>
                </div>
                <Tag color="#EAB308">Pronto</Tag>
              </button>
            ))}
          </div>

          <SectionTitle>¿Cómo funciona?</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
            {[
              ['🔍', 'Buscás partida', 'Te emparejamos con jugadores de nivel similar'],
              ['🗺️', 'Escenario aleatorio', 'Mapa competitivo elegido al azar'],
              ['📜', 'Reglas estándar', 'Stock 3, tiempo 7 min, sin objetos'],
              ['📤', 'Reportás el resultado', 'Ambos suben quién ganó'],
              ['📈', 'Puntos', 'Ganás o perdés según tu nivel y el del rival'],
            ].map(([icon, t, d], idx) => (
              <div key={t} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 11, background: '#141414', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {icon}
                  </div>
                  {idx < 4 && <div style={{ width: 1, flex: 1, minHeight: 12, background: 'rgba(255,255,255,0.05)', marginTop: 4 }} />}
                </div>
                <div style={{ paddingBottom: 12 }}>
                  <p style={{ margin: '4px 0 2px', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{t}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.45 }}>{d}</p>
                </div>
              </div>
            ))}
          </div>

          <SectionTitle>Rankings separados por plataforma</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {PLATFORMS.map(px => (
              <div key={px.id} style={{
                background: `linear-gradient(135deg,${px.from}1a,${px.to}0d)`,
                border: `1px solid ${px.from}25`, borderRadius: 18, padding: '18px 12px', textAlign: 'center',
              }}>
                <span style={{ fontSize: 28 }}>{px.icon}</span>
                <p style={{ margin: '8px 0 2px', fontWeight: 800, fontSize: 13, color: '#fff' }}>{px.label}</p>
                <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Ranking independiente</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg,${p.from},${p.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: `0 6px 18px ${p.from}40` }}>
              {p.icon}
            </div>
            <div>
              <h1 style={{ margin: '0 0 3px', fontSize: 22, fontWeight: 900, color: '#fff' }}>{p.label}</h1>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Ranking propio · {p.id === 'parsec' ? 'Emulador PC' : 'Nintendo Switch'}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {[['⭐', 'Puntos', '—'], ['🏆', 'Ranking', '—'], ['⚡', 'W / L', '—']].map(([icon, label, val]) => (
              <StatCard key={label} icon={icon} label={label} value={val} />
            ))}
          </div>

          <div style={{
            background: `linear-gradient(135deg,${p.from}1a,${p.to}0a)`,
            border: `1px solid ${p.from}30`, borderRadius: 20, padding: '36px 24px', textAlign: 'center',
          }}>
            <span style={{ fontSize: 44 }}>{p.icon}</span>
            <p style={{ margin: '14px 0 6px', fontWeight: 800, fontSize: 16, color: '#fff' }}>Matchmaking en desarrollo</p>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Pronto podés buscar rivales y acumular puntos en el ranking de {p.label}</p>
          </div>
        </>
      )}
    </div>
  );
}
