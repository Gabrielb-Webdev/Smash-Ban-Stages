import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getStoredUser, logout } from '../src/utils/auth';
import { RANKS, TIER_ICONS } from '../lib/ranks';

/* ─── SVG ─────────────────────────────────────── */
function Svg({ children, size = 24, sw = 1.7 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={sw} stroke="currentColor" width={size} height={size}>
      {children}
    </svg>
  );
}
const ICO_BACK  = <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />;
const ICO_SWORD = <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />;

/* ─── Helpers ─────────────────────────────────── */
function platLabel(p) { return p === 'switch' ? '🎮 Switch' : '🖥️ Parsec'; }
function platColor(p) { return p === 'switch' ? '#EF4444' : '#8B5CF6'; }

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'hace un momento';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

/* ─── Rank mini badge ─────────────────────────── */
function RankMini({ rankName }) {
  const obj  = RANKS.find(r => r.name === rankName);
  const icon = obj ? (TIER_ICONS[obj.tier] || '🎮') : '?';
  const col  = obj ? obj.color : 'rgba(255,255,255,0.2)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, fontWeight: 800, color: col,
    }}>
      {icon} {rankName || 'Unranked'}
    </span>
  );
}

export default function ProfilePage() {
  const router   = useRouter();
  const [user, setUser]           = useState(null);
  const [stats, setStats]         = useState(null);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.replace('/login'); return; }
    const u = stored.user;
    const nameIsStale = !u?.name || u.name === u?.slug || /^[0-9a-f]{6,16}$/i.test(u.name);
    if (nameIsStale) {
      localStorage.removeItem('afk_user');
      router.replace('/login');
      return;
    }
    setUser(u);

    const uid = encodeURIComponent(String(u.id || u.slug || ''));
    Promise.all([
      fetch(`/api/players/stats?userId=${uid}`).then(r => r.json()).catch(() => null),
      fetch(`/api/players/history?userId=${uid}&limit=30`).then(r => r.json()).catch(() => []),
    ]).then(([s, h]) => {
      setStats(s);
      setHistory(Array.isArray(h) ? h : []);
      setLoading(false);
    });
  }, []);

  if (!user) return null;

  const displayName = user.name || user.slug || 'Jugador';
  const initial     = displayName.charAt(0).toUpperCase();
  const totalW      = (stats?.switch?.wins || 0)   + (stats?.parsec?.wins || 0);
  const totalL      = (stats?.switch?.losses || 0) + (stats?.parsec?.losses || 0);

  return (
    <>
      <Head>
        <title>{displayName} — AFK Smash</title>
      </Head>
      <div style={{
        minHeight: '100vh', background: '#050508', color: '#fff',
        fontFamily: "'Inter', -apple-system, sans-serif",
        maxWidth: 480, margin: '0 auto',
        paddingBottom: 32,
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 18px 0',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <button onClick={() => router.back()} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', flexShrink: 0,
          }}>
            <Svg size={18} sw={2}>{ICO_BACK}</Svg>
          </button>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>Mi Perfil</p>
        </div>

        {/* Hero */}
        <div style={{
          padding: '24px 18px 28px',
          background: 'linear-gradient(160deg, rgba(232,142,0,0.08) 0%, transparent 60%)',
          display: 'flex', gap: 16, alignItems: 'center',
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {user.avatar
              ? <img src={user.avatar} alt={displayName} style={{ width: 72, height: 72, borderRadius: 22, objectFit: 'cover', border: '2px solid rgba(232,142,0,0.5)' }} />
              : <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900, color: '#fff', boxShadow: '0 8px 20px rgba(232,142,0,0.3)' }}>{initial}</div>
            }
            <div style={{ position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: '#22C55E', border: '2px solid #050508', boxShadow: '0 0 8px rgba(34,197,94,0.7)' }} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.4px' }}>{displayName}</p>
            {user.slug && <p style={{ margin: '3px 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>@{user.slug}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,140,0,0.15)', border: '1px solid rgba(255,140,0,0.3)', color: '#FF8C00' }}>AFK SMASH</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818CF8' }}>START.GG</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 18px' }}>

          {/* Stats globales */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Victorias', value: totalW, color: '#22C55E' },
              { label: 'Derrotas',  value: totalL, color: '#EF4444' },
              { label: 'Partidas',  value: totalW + totalL, color: '#FF8C00' },
              { label: 'W/R',       value: (totalW + totalL) > 0 ? Math.round(totalW * 100 / (totalW + totalL)) + '%' : '—', color: '#F59E0B' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, padding: '12px 8px', textAlign: 'center',
              }}>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: s.color }}>{loading ? '—' : s.value}</p>
                <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Rangos por plataforma */}
          <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>⚔️ RANKED</p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            {(['switch', 'parsec']).map(plat => {
              const s        = stats?.[plat];
              const total    = (s?.wins || 0) + (s?.losses || 0);
              const unranked = !s?.placementDone && total === 0;
              const inPlacement = !s?.placementDone && total > 0;
              const rankName = s?.rank || '';
              const pts      = s?.rankPoints || 0;
              const isSmasher = rankName === 'Smasher';
              const rankObj  = RANKS.find(r => r.name === rankName);
              const rankColor = rankObj ? rankObj.color : 'rgba(255,255,255,0.2)';
              const tierIcon  = rankObj ? (TIER_ICONS[rankObj.tier] || '🎮') : '?';
              return (
                <div key={plat} style={{
                  flex: 1,
                  background: unranked ? 'rgba(255,255,255,0.03)' : inPlacement ? 'rgba(255,140,0,0.04)' : `linear-gradient(160deg, ${rankColor}15 0%, transparent 60%)`,
                  border: `1px solid ${unranked ? 'rgba(255,255,255,0.07)' : inPlacement ? 'rgba(255,140,0,0.2)' : rankColor + '30'}`,
                  borderRadius: 16, padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: platColor(plat), alignSelf: 'flex-start' }}>
                    {platLabel(plat)}
                  </p>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: unranked ? 'rgba(255,255,255,0.05)' : inPlacement ? 'rgba(255,140,0,0.1)' : `${rankColor}18`,
                    border: `2px solid ${unranked ? 'rgba(255,255,255,0.1)' : inPlacement ? 'rgba(255,140,0,0.3)' : rankColor + '50'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24,
                  }}>
                    {unranked ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 20 }}>?</span> : inPlacement ? '⚔️' : tierIcon}
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: unranked ? 'rgba(255,255,255,0.2)' : inPlacement ? '#FF8C00' : rankColor, textAlign: 'center' }}>
                    {unranked ? 'UNRANKED' : inPlacement ? `CLAS. ${total}/5` : rankName}
                  </p>
                  {!unranked && !inPlacement && !isSmasher && (
                    <div style={{ width: '100%', marginTop: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>RR</span>
                        <span style={{ fontSize: 8, fontWeight: 800, color: rankColor }}>{pts}/100</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 3, height: 5, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100,pts)}%`, height: '100%', background: rankColor, borderRadius: 3 }} />
                      </div>
                    </div>
                  )}
                  {isSmasher && <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 800, color: '#FF8C00' }}>{pts} RP</p>}
                  <p style={{ margin: '6px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                    <span style={{ color: '#22C55E', fontWeight: 700 }}>{s?.wins || 0}W</span>
                    {' · '}
                    <span style={{ color: '#EF4444', fontWeight: 700 }}>{s?.losses || 0}L</span>
                  </p>
                </div>
              );
            })}
          </div>

          {/* Historial */}
          <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>📋 HISTORIAL DE PARTIDAS</p>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Cargando...</div>
          ) : history.length === 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 28, margin: '0 0 8px' }}>⚔️</p>
              <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Sin partidas aún</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>Jugá partidas ranked para ver tu historial</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((m, i) => {
                const isWin   = String(m.winnerId) === String(user.id || user.slug);
                const opponent = isWin ? m.loserName : m.winnerName;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: isWin ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                    border: `1px solid ${isWin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)'}`,
                    borderLeft: `3px solid ${isWin ? '#22C55E' : '#EF4444'}`,
                    borderRadius: 12, padding: '10px 14px',
                  }}>
                    {/* Resultado */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: isWin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 900,
                      color: isWin ? '#22C55E' : '#EF4444',
                    }}>
                      {isWin ? 'W' : 'L'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        vs {opponent}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                        {platLabel(m.platform)} · {timeAgo(m.playedAt)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: isWin ? '#22C55E' : '#EF4444' }}>
                        {isWin ? 'VICTORIA' : 'DERROTA'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Logout */}
          <button onClick={() => { logout(); window.location.href = '/login'; }} style={{
            marginTop: 28, width: '100%', padding: '13px', borderRadius: 14,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)',
            color: '#EF4444', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
}
