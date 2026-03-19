import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getStoredUser, logout } from '../src/utils/auth';
import { RANKS, TIER_ICONS } from '../lib/ranks';
import { CHARACTERS, charImgPath, CHARACTER_RENDERS, charRenderPath } from '../lib/characters';

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

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser]           = useState(null);
  const [stats, setStats]         = useState(null);
  const [history, setHistory]     = useState([]);
  const [recentChars, setRecentChars] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [startggStats, setStartggStats] = useState(null);
  const [showAllChars, setShowAllChars] = useState(false);

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
      fetch(`/api/matchmaking/recent-chars?userId=${uid}`).then(r => r.json()).catch(() => []),
    ]).then(([s, h, chars]) => {
      setStats(s);
      setHistory(Array.isArray(h) ? h : []);
      setRecentChars(Array.isArray(chars) ? chars : []);
      setLoading(false);
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
          console.log('[StartGG] Full response:', d);
          if (d.charUsage) {
            console.log('[StartGG] Character Usage:');
            d.charUsage.forEach((ch, i) => {
              console.log(`  ${i+1}. ${ch.charName} (ID: ${ch.startggCharId}) — ${ch.games} games, ${ch.usage}%, WR: ${ch.games > 0 ? Math.round(ch.wins*100/ch.games) : 0}%`);
              if (ch.evidence && ch.evidence.length > 0) {
                ch.evidence.forEach(ev => {
                  const myInfo = ev.myEntrant ? `Mi entrant: ${ev.myEntrant.id} (${ev.myEntrant.name})` : '';
                  const selInfo = ev.selectionEntrantId ? `Sel entrant: ${ev.selectionEntrantId}` : '';
                  const oppInfo = ev.opponentEntrant ? `Oponente: ${ev.opponentEntrant.id} (${ev.opponentEntrant.name})` : '';
                  const oppChar = ev.opponentCharName ? `Oponente usó: ${ev.opponentCharName}` : '';
                  const method = ev.matchMethod ? `[${ev.matchMethod}]` : '';
                  console.log(`     ↳ ${ev.tournament} ${method}`);
                  console.log(`       ${myInfo} | ${selInfo} | ${oppInfo} | ${oppChar}`);
                  if (ev.setLink) console.log(`       → ${ev.setLink}`);
                });
              }
            });
          }
          setStartggStats(d);
        } }).catch(() => {});
      }
    } catch (e) {}
  }, []);

  if (!user) return null;

  const displayName = user.name || user.slug || 'Jugador';
  const initial     = displayName.charAt(0).toUpperCase();
  const swW  = stats?.switch?.wins   || 0;
  const swL  = stats?.switch?.losses || 0;
  const pcW  = stats?.parsec?.wins   || 0;
  const pcL  = stats?.parsec?.losses || 0;
  const totalW   = swW + pcW;
  const totalL   = swL + pcL;
  const total    = totalW + totalL;
  const winRate  = total > 0 ? Math.round(totalW * 100 / total) : 0;
  const swTotal  = swW + swL;
  const pcTotal  = pcW + pcL;
  const swWR     = swTotal > 0 ? Math.round(swW * 100 / swTotal) : null;
  const pcWR     = pcTotal > 0 ? Math.round(pcW * 100 / pcTotal) : null;

  const TABS = [
    { id: 'overview',  label: 'Overview'  },
    { id: 'ranked',    label: 'Ranked'    },
    { id: 'historial', label: 'Historial' },
  ];

  const heroRender = (() => {
    if (!history.length) return null;
    const counts = {};
    for (const m of history) {
      const charId = m.winnerId === String(user.id || user.slug) ? m.winnerCharId : m.loserCharId;
      if (charId) counts[charId] = (counts[charId] || 0) + 1;
    }
    let best = null, max = 0;
    for (const [id, c] of Object.entries(counts)) { if (c > max) { max = c; best = id; } }
    return best ? CHARACTER_RENDERS[best] : null;
  })();

  return (
    <>
      <Head>
        <title>{displayName} â€” AFK Smash</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>{`
          * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
          body { background: #0B0B12; margin: 0; }
          ::-webkit-scrollbar { display: none; }
        `}</style>
      </Head>
      <div style={{ minHeight: '100vh', background: '#0B0B12', color: '#fff', fontFamily: "'Outfit', -apple-system, sans-serif", maxWidth: 480, margin: '0 auto' }}>

        {/* â”€â”€ Top bar â”€â”€ */}
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(11,11,18,0.95)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={18} height={18}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>Mi Perfil</p>
        </div>

        {/* â”€â”€ Banner / Hero â”€â”€ */}
        <div style={{ position: 'relative', background: '#1a1a1a', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10 }}>
          {heroRender ? (
            <img
              src={charRenderPath(heroRender)}
              alt=""
              style={{ display: 'block', height: 180, objectFit: 'contain', position: 'relative', zIndex: 1 }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div style={{ height: 120 }} />
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to top, #1a1a1a, transparent)', zIndex: 2, pointerEvents: 'none' }} />
          <p style={{ margin: 0, padding: '8px 18px 16px', fontSize: 26, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#fff', textAlign: 'center', lineHeight: 1, position: 'relative', zIndex: 3 }}>{displayName}</p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginTop: 16 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex: 1, padding: '13px 0', background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === t.id ? '#FF8C00' : 'transparent'}`, cursor: 'pointer', color: activeTab === t.id ? '#fff' : 'rgba(255,255,255,0.35)', fontWeight: activeTab === t.id ? 800 : 500, fontSize: 13, position: 'relative', bottom: -1, transition: 'all 0.15s', fontFamily: "'Outfit', sans-serif" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* â”€â”€ Content â”€â”€ */}
        <div style={{ padding: '0 18px 40px' }}>

          {/* â•â•â•â• OVERVIEW â•â•â•â• */}
          {activeTab === 'overview' && (
            <div>
              <p style={{ margin: '22px 0 12px', fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Winrates</p>

              {/* ALL TIME card */}
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>ALL TIME</p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: '#22C55E', lineHeight: 1 }}>{loading ? 'â€”' : totalW}</span>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>W</span>
                        <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.15)', margin: '0 2px' }}>â€“</span>
                        <span style={{ fontSize: 28, fontWeight: 900, color: '#EF4444', lineHeight: 1 }}>{loading ? 'â€”' : totalL}</span>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>L</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: 40, fontWeight: 900, lineHeight: 1, color: loading ? 'rgba(255,255,255,0.2)' : winRate >= 50 ? '#22C55E' : winRate >= 40 ? '#F59E0B' : 'rgba(255,255,255,0.45)' }}>
                        {loading ? 'â€”' : `${winRate}%`}
                      </p>
                    </div>
                  </div>
                  {!loading && total > 0 && (
                    <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.07)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                      <div style={{ width: `${winRate}%`, height: '100%', background: `linear-gradient(90deg, ${winRate >= 50 ? '#22C55E, #16A34A' : '#F59E0B, #D97706'})`, borderRadius: 4, transition: 'width 0.8s ease' }} />
                    </div>
                  )}
                </div>

                {/* Platform breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  {[
                    { label: 'ðŸŽ® Switch',  w: swW, l: swL, wr: swWR, total: swTotal, color: '#EF4444' },
                    { label: 'ðŸ–¥ï¸ Parsec',  w: pcW, l: pcL, wr: pcWR, total: pcTotal, color: '#8B5CF6' },
                  ].map((p, i) => (
                    <div key={i} style={{ padding: '14px 20px', borderRight: i === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.label}</p>
                      {loading || p.wr === null
                        ? <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Sin datos</p>
                        : <>
                          <p style={{ margin: '0 0 3px', fontSize: 24, fontWeight: 900, lineHeight: 1, color: p.wr >= 50 ? '#22C55E' : 'rgba(255,255,255,0.45)' }}>{p.wr}%</p>
                          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{p.w}W Â· {p.l}L</p>
                        </>
                      }
                    </div>
                  ))}
                </div>
              </div>

              {/* ── SUMMARY (Start.GG character usage) ── */}
              {startggStats && startggStats.charUsage && startggStats.charUsage.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#F5C518,#D4A017)', flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Summary</p>
                    </div>
                    <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>Start.GG · {startggStats.totalSets} sets</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
                    {startggStats.charUsage.slice(0, showAllChars ? startggStats.charUsage.length : 5).map((ch, i) => {
                      const localId = ch.localCharId;
                      const charObj = localId ? CHARACTERS.find(c => c.id === localId) : null;
                      const renderFile = localId ? CHARACTER_RENDERS[localId] : null;
                      const isTop = i === 0;
                      const charWR = ch.games > 0 ? Math.round(ch.wins * 100 / ch.games) : 0;
                      const barColors = ['#F5C518', '#818CF8', '#22C55E', '#F97316', '#EF4444'];
                      const barColor = barColors[i % barColors.length] || '#F5C518';
                      return (
                        <div key={ch.startggCharId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: isTop ? '10px 14px 10px 6px' : '9px 14px', borderBottom: i < Math.min(startggStats.charUsage.length, showAllChars ? startggStats.charUsage.length : 5) - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', position: 'relative', overflow: 'hidden', background: isTop ? 'linear-gradient(90deg, rgba(245,197,24,0.10), transparent)' : 'transparent' }}>
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
                  {startggStats.charUsage.length > 5 && (
                    <button onClick={() => setShowAllChars(!showAllChars)} style={{ width: '100%', padding: '8px', marginTop: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {showAllChars ? 'Ver menos' : `Ver todos (${startggStats.charUsage.length})`}
                    </button>
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
                </div>
              )}

              {/* Recent characters */}
              {recentChars.length > 0 && (
                <>
                  <p style={{ margin: '22px 0 12px', fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Personajes recientes</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {recentChars.slice(0, 6).map((charId, idx) => {
                      const char = CHARACTERS.find(c => c.id === charId);
                      if (!char) return null;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 8px', minWidth: 68 }}>
                          <img src={charImgPath(char.img)} alt={char.name} style={{ width: 46, height: 46, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em', maxWidth: 62, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{char.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* â•â•â•â• RANKED â•â•â•â• */}
          {activeTab === 'ranked' && (
            <div style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(['switch', 'parsec']).map(plat => {
                const s        = stats?.[plat];
                const tot      = (s?.wins || 0) + (s?.losses || 0);
                const unranked = !s?.placementDone && tot === 0;
                const inPlac   = !s?.placementDone && tot > 0;
                const rankName = s?.rank || '';
                const pts      = s?.rankPoints || 0;
                const isSmasher= rankName === 'Smasher';
                const rankObj  = RANKS.find(r => r.name === rankName);
                const rankColor= rankObj ? rankObj.color : 'rgba(255,255,255,0.2)';
                const tierIcon = rankObj ? (TIER_ICONS[rankObj.tier] || 'ðŸŽ®') : '?';
                const pColor   = plat === 'switch' ? '#EF4444' : '#8B5CF6';
                const pLabel   = plat === 'switch' ? 'ðŸŽ® Switch Online' : 'ðŸ–¥ï¸ Parsec';
                const platWR   = tot > 0 ? Math.round((s?.wins || 0) * 100 / tot) : null;
                return (
                  <div key={plat} style={{ background: unranked ? 'rgba(255,255,255,0.03)' : `linear-gradient(135deg, ${rankColor}14 0%, transparent 65%)`, border: `1px solid ${unranked ? 'rgba(255,255,255,0.07)' : rankColor + '35'}`, borderRadius: 20, padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: pColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{pLabel}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{tot} partidas</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                      <div style={{ width: 72, height: 72, borderRadius: '50%', flexShrink: 0, background: (unranked || inPlac) ? 'rgba(255,255,255,0.05)' : `${rankColor}18`, border: `2px solid ${(unranked || inPlac) ? 'rgba(255,255,255,0.1)' : rankColor + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>
                        {(unranked || inPlac) ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 24 }}>?</span> : tierIcon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, textTransform: 'uppercase', color: unranked ? 'rgba(255,255,255,0.2)' : inPlac ? '#FF8C00' : rankColor }}>
                          {unranked ? 'UNRANKED' : inPlac ? `CLAS. ${tot}/5` : rankName}
                        </p>
                        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                          <span style={{ color: '#22C55E', fontWeight: 700 }}>{s?.wins || 0}W</span>
                          {' Â· '}
                          <span style={{ color: '#EF4444', fontWeight: 700 }}>{s?.losses || 0}L</span>
                          {platWR !== null && <span style={{ color: 'rgba(255,255,255,0.3)' }}> Â· {platWR}%</span>}
                        </p>
                        {!unranked && !inPlac && !isSmasher && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Rank Points</span>
                              <span style={{ fontSize: 10, fontWeight: 800, color: rankColor }}>{pts}/100</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, pts)}%`, height: '100%', background: rankColor, borderRadius: 4, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        )}
                        {isSmasher && <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#FF8C00' }}>{pts} RP</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* â•â•â•â• HISTORIAL â•â•â•â• */}
          {activeTab === 'historial' && (
            <div style={{ paddingTop: 20 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Cargando...</div>
              ) : history.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 32, margin: '0 0 8px' }}>âš”ï¸</p>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Sin partidas aÃºn</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>JugÃ¡ ranked para ver tu historial</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {history.map((m, i) => {
                    const isWin    = String(m.winnerId) === String(user.id || user.slug);
                    const opponent = isWin ? m.loserName : m.winnerName;
                    const pLabel   = m.platform === 'switch' ? 'ðŸŽ® Switch' : 'ðŸ–¥ï¸ Parsec';
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isWin ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${isWin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)'}`, borderLeft: `3px solid ${isWin ? '#22C55E' : '#EF4444'}`, borderRadius: 12, padding: '10px 14px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: isWin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: isWin ? '#22C55E' : '#EF4444' }}>
                          {isWin ? 'W' : 'L'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>vs {opponent}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{pLabel} Â· {timeAgo(m.playedAt)}</p>
                        </div>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: isWin ? '#22C55E' : '#EF4444' }}>{isWin ? 'VICTORIA' : 'DERROTA'}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Logout */}
          <button onClick={() => { logout(); window.location.href = '/login'; }} style={{ marginTop: 32, width: '100%', padding: '14px', borderRadius: 16, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            Cerrar sesiÃ³n
          </button>
        </div>
      </div>
    </>
  );
}
