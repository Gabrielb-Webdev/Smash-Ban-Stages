"""
Patch home.js to make friend profiles look like own profile.
Changes:
1. HOME component: add profileStartggStats state
2. HOME component: update openProfile to fetch startgg stats
3. HOME component: replace simple modal content with rich rendering
4. TabPerfil component: add profileStartggStats state
5. TabPerfil component: update openProfile to fetch startgg stats
6. TabPerfil component: add Summary section to modal
"""
import re

with open(r'e:\Users\gabri\Documents\Clientes\Smash-Ban-Stages\pages\home.js', 'r', encoding='utf-8') as f:
    src = f.read()

# ────────────────────────────────────────────────
# 1. HOME profileStartggStats state
# ────────────────────────────────────────────────
OLD1 = (
    '  const [viewProfile, setViewProfile]   = useState(null);\n'
    '  const [profileData, setProfileData]   = useState(null);\n'
    '  const [profileLoading, setProfileLoading] = useState(false);\n'
    '  const [history, setHistory]           = useState([]);\n'
)
NEW1 = (
    '  const [viewProfile, setViewProfile]   = useState(null);\n'
    '  const [profileData, setProfileData]   = useState(null);\n'
    '  const [profileLoading, setProfileLoading] = useState(false);\n'
    '  const [profileStartggStats, setProfileStartggStats] = useState(null);\n'
    '  const [history, setHistory]           = useState([]);\n'
)
assert src.count(OLD1) == 1, f"HOME state match count: {src.count(OLD1)}"
src = src.replace(OLD1, NEW1, 1)
print("✓ 1. HOME state")

# ────────────────────────────────────────────────
# 2. HOME openProfile (one-liner at line ~1284)
# ────────────────────────────────────────────────
OLD2 = "  const openProfile = (playerId, playerName) => { setViewProfile({ userId: playerId, userName: playerName }); setProfileData(null); setProfileLoading(true); fetch('/api/players/profile?id=' + encodeURIComponent(playerId) + '&full=true').then(r => r.ok ? r.json() : null).then(d => { setProfileData(d); setProfileLoading(false); }).catch(() => setProfileLoading(false)); };\n\n  if (!user || !uid) return null;"
NEW2 = """  const openProfile = (playerId, playerName) => {
    setViewProfile({ userId: playerId, userName: playerName });
    setProfileData(null);
    setProfileStartggStats(null);
    setProfileLoading(true);
    fetch('/api/players/profile?id=' + encodeURIComponent(playerId) + '&full=true')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setProfileData(d);
        setProfileLoading(false);
        if (d?.profile?.slug) {
          try {
            const sc = JSON.parse(localStorage.getItem('afk_user') || '{}');
            const tok = sc.access_token;
            if (tok) fetch('/api/players/startgg-stats?slug=' + encodeURIComponent(d.profile.slug), { headers: { 'Authorization': 'Bearer ' + tok } })
              .then(r => r.ok ? r.json() : null).then(sg => { if (sg) setProfileStartggStats(sg); }).catch(() => {});
          } catch {}
        }
      })
      .catch(() => setProfileLoading(false));
  };

  if (!user || !uid) return null;"""

assert src.count(OLD2) == 1, f"HOME openProfile match count: {src.count(OLD2)}"
src = src.replace(OLD2, NEW2, 1)
print("✓ 2. HOME openProfile")

# ────────────────────────────────────────────────
# 3. HOME modal: replace simple profileData content
# ────────────────────────────────────────────────
OLD3 = """          ) : profileData ? (
            <div style={{ maxWidth: 480, margin: '0 auto', width: '100%', padding: '0 18px 40px' }}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#fff' }}>{viewProfile.userName}</p>
              </div>
              {(() => {
                const sw1 = profileData.stats?.switch || {}; const pc1 = profileData.stats?.parsec || {};
                const tW = (sw1.wins||0)+(pc1.wins||0); const tL = (sw1.losses||0)+(pc1.losses||0);
                const tT = tW+tL; const wr = tT > 0 ? Math.round((tW/tT)*100) : 0;
                return (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {[{ label: 'Victorias', value: tW, color: '#22C55E' }, { label: 'Derrotas', value: tL, color: '#EF4444' }, { label: 'Partidas', value: tT, color: '#fff' }, { label: 'W/R', value: wr + '%', color: '#F59E0B' }].map(st => (
                      <div key={st.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: st.color }}>{st.value}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{st.label}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {(!profileData.history || profileData.history.length === 0) ? (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 32, margin: '0 0 8px' }}>⚔️</p>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Sin partidas aún</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {profileData.history.slice(0, 20).map((m, i) => {
                    const isWin = String(m.winnerId) === String(viewProfile.userId);
                    const opponent = isWin ? m.loserName : m.winnerName;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isWin ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${isWin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)'}`, borderLeft: `3px solid ${isWin ? '#22C55E' : '#EF4444'}`, borderRadius: 12, padding: '10px 14px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: isWin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: isWin ? '#22C55E' : '#EF4444' }}>{isWin ? 'W' : 'L'}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>vs {opponent}</p>
                        </div>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: isWin ? '#22C55E' : '#EF4444' }}>{isWin ? 'WIN' : 'LOSS'}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No se pudo cargar el perfil</p></div>
          )}"""

NEW3 = """          ) : profileData ? (
            <div style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
              {/* Hero banner */}
              {(() => {
                const heroCharId = (() => {
                  const hist = profileData.history || [];
                  if (hist.length) {
                    const counts = {};
                    for (const m of hist) {
                      const cid = String(m.winnerId) === String(viewProfile.userId) ? m.winnerCharId : m.loserCharId;
                      if (cid) counts[cid] = (counts[cid] || 0) + 1;
                    }
                    let best = null, max = 0;
                    for (const [id, c] of Object.entries(counts)) { if (c > max) { max = c; best = id; } }
                    return best;
                  }
                  return profileData.recentChars?.[0] || null;
                })();
                const heroRenderFile = heroCharId ? CHARACTER_RENDERS[heroCharId] : null;
                return (
                  <div style={{ position: 'relative', background: '#1a1a1a', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10 }}>
                    {heroRenderFile ? (
                      <img src={charRenderPath(heroRenderFile)} alt="" style={{ display: 'block', height: 180, objectFit: 'contain', position: 'relative', zIndex: 1 }} onError={e => { e.target.style.display = 'none'; }} />
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
                          { label: 'Derrotas',  value: tL, color: '#EF4444' },
                          { label: 'Partidas',  value: tT, color: '#fff' },
                          { label: 'W/R',       value: wr + '%', color: '#F59E0B' },
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
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Summary</p>
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
                    const rankName = s.rank || 'Plástico 1';
                    const isUnranked = total === 0; const inPlacement = !isUnranked && total < 5;
                    const rankObj = RANKS.find(r => r.name === rankName) || RANKS[0];
                    const tierIcon = rankObj ? (TIER_ICONS[rankObj.tier] || '🎮') : '?';
                    const rankColor = rankObj?.color || '#9CA3AF';
                    const pColor = plat === 'switch' ? '#EF4444' : '#8B5CF6';
                    return (
                      <div key={plat} style={{ flex: 1, background: isUnranked ? 'rgba(255,255,255,0.03)' : inPlacement ? 'rgba(255,140,0,0.04)' : `linear-gradient(135deg, ${rankColor}14 0%, transparent 65%)`, border: `1px solid ${isUnranked ? 'rgba(255,255,255,0.07)' : inPlacement ? 'rgba(255,140,0,0.2)' : rankColor + '35'}`, borderRadius: 20, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: pColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{plat === 'switch' ? '🎮 Switch' : '🖥️ Parsec'}</p>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: (isUnranked || inPlacement) ? 'rgba(255,255,255,0.05)' : `${rankColor}18`, border: `2px solid ${(isUnranked || inPlacement) ? 'rgba(255,255,255,0.1)' : rankColor + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                          {(isUnranked || inPlacement) ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 20 }}>?</span> : tierIcon}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: isUnranked ? 'rgba(255,255,255,0.2)' : inPlacement ? '#FF8C00' : rankColor }}>
                          {isUnranked ? 'UNRANKED' : inPlacement ? `CLAS. ${total}/5` : rankName}
                        </p>
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
                    const rankName = s.rank || 'Plástico 1';
                    const isUnranked = total === 0; const inPlacement = !isUnranked && total < 5;
                    const rankObj = RANKS.find(r => r.name === rankName) || RANKS[0];
                    const tierIcon = rankObj ? (TIER_ICONS[rankObj.tier] || '🎮') : '?';
                    const rankColor = rankObj?.color || '#9CA3AF';
                    return (
                      <div key={plat} style={{ flex: 1, background: isUnranked ? 'rgba(255,255,255,0.03)' : inPlacement ? 'rgba(124,58,237,0.04)' : `linear-gradient(135deg, ${rankColor}14 0%, transparent 65%)`, border: `1px solid ${isUnranked ? 'rgba(255,255,255,0.07)' : inPlacement ? 'rgba(124,58,237,0.2)' : rankColor + '35'}`, borderRadius: 20, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: plat === 'switch' ? '#EF4444' : '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>2V2 {plat === 'switch' ? '🎮 Switch' : '🖥️ Parsec'}</p>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: (isUnranked || inPlacement) ? 'rgba(255,255,255,0.05)' : `${rankColor}18`, border: `2px solid ${(isUnranked || inPlacement) ? 'rgba(255,255,255,0.1)' : rankColor + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                          {(isUnranked || inPlacement) ? <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 900, fontSize: 20 }}>?</span> : tierIcon}
                        </div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: isUnranked ? 'rgba(255,255,255,0.2)' : inPlacement ? '#A78BFA' : rankColor }}>
                          {isUnranked ? 'UNRANKED' : inPlacement ? `CLAS. ${total}/5` : rankName}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{wins}W · {losses}L</p>
                      </div>
                    );
                  })}
                </div>

                {/* Historial */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
                  <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#FF8C00,#E85D00)', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>📋 Historial</p>
                </div>
                {(!profileData.history || profileData.history.length === 0) ? (
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '36px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: 32, margin: '0 0 8px' }}>⚔️</p>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Sin partidas aún</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {profileData.history.slice(0, 20).map((m, i) => {
                      const isWin = String(m.winnerId) === String(viewProfile.userId);
                      const opponent = isWin ? m.loserName : m.winnerName;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: isWin ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${isWin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)'}`, borderLeft: `3px solid ${isWin ? '#22C55E' : '#EF4444'}`, borderRadius: 12, padding: '10px 14px' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: isWin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: isWin ? '#22C55E' : '#EF4444' }}>{isWin ? 'W' : 'L'}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>vs {opponent}</p>
                            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{m.platform === 'switch' ? '🎮 Switch' : m.platform === 'parsec' ? '🖥️ Parsec' : ''}{m.playedAt ? ` · ${timeAgo(m.playedAt)}` : ''}</p>
                          </div>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: isWin ? '#22C55E' : '#EF4444' }}>{isWin ? 'WIN' : 'LOSS'}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No se pudo cargar el perfil</p></div>
          )}"""

assert src.count(OLD3) == 1, f"HOME modal match count: {src.count(OLD3)}"
src = src.replace(OLD3, NEW3, 1)
print("✓ 3. HOME modal content")

# ────────────────────────────────────────────────
# 4. TabPerfil profileStartggStats state
# ────────────────────────────────────────────────
OLD4 = (
    '  const [viewProfile, setViewProfile]   = useState(null); // { userId, userName }\n'
    '  const [profileData, setProfileData]   = useState(null);\n'
    '  const [profileLoading, setProfileLoading] = useState(false);\n'
)
NEW4 = (
    '  const [viewProfile, setViewProfile]   = useState(null); // { userId, userName }\n'
    '  const [profileData, setProfileData]   = useState(null);\n'
    '  const [profileLoading, setProfileLoading] = useState(false);\n'
    '  const [profileStartggStats, setProfileStartggStats] = useState(null);\n'
)
assert src.count(OLD4) == 1, f"TabPerfil state match count: {src.count(OLD4)}"
src = src.replace(OLD4, NEW4, 1)
print("✓ 4. TabPerfil state")

# ────────────────────────────────────────────────
# 5. TabPerfil openProfile
# ────────────────────────────────────────────────
OLD5 = """  const openProfile = (playerId, playerName) => {
    setViewProfile({ userId: playerId, userName: playerName });
    setProfileData(null);
    setProfileLoading(true);
    fetch('/api/players/profile?id=' + encodeURIComponent(playerId) + '&full=true')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setProfileData(d); setProfileLoading(false); })
      .catch(() => setProfileLoading(false));
  };"""
NEW5 = """  const openProfile = (playerId, playerName) => {
    setViewProfile({ userId: playerId, userName: playerName });
    setProfileData(null);
    setProfileStartggStats(null);
    setProfileLoading(true);
    fetch('/api/players/profile?id=' + encodeURIComponent(playerId) + '&full=true')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setProfileData(d);
        setProfileLoading(false);
        if (d?.profile?.slug) {
          try {
            const sc = JSON.parse(localStorage.getItem('afk_user') || '{}');
            const tok = sc.access_token;
            if (tok) fetch('/api/players/startgg-stats?slug=' + encodeURIComponent(d.profile.slug), { headers: { 'Authorization': 'Bearer ' + tok } })
              .then(r => r.ok ? r.json() : null).then(sg => { if (sg) setProfileStartggStats(sg); }).catch(() => {});
          } catch {}
        }
      })
      .catch(() => setProfileLoading(false));
  };"""
assert src.count(OLD5) == 1, f"TabPerfil openProfile match count: {src.count(OLD5)}"
src = src.replace(OLD5, NEW5, 1)
print("✓ 5. TabPerfil openProfile")

# ────────────────────────────────────────────────
# 6. TabPerfil modal: add Summary after stats section
# The stats section ends with "</div>\n                </>", then Ranked 1v1 title starts
# ────────────────────────────────────────────────
OLD6 = """                    );
                  })()}

                  {/* Ranked 1v1 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
                    <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#FF8C00,#E85D00)', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>⚔️ Ranked</p>
                  </div>"""
NEW6 = """                    );
                  })()}

                {/* Start.GG Summary */}
                {profileStartggStats && profileStartggStats.charUsage && profileStartggStats.charUsage.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ height: 14, width: 3, borderRadius: 2, background: 'linear-gradient(180deg,#F5C518,#D4A017)', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Summary</p>
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
                  </div>"""
assert src.count(OLD6) == 1, f"TabPerfil summary section match count: {src.count(OLD6)}"
src = src.replace(OLD6, NEW6, 1)
print("✓ 6. TabPerfil summary section")

with open(r'e:\Users\gabri\Documents\Clientes\Smash-Ban-Stages\pages\home.js', 'w', encoding='utf-8') as f:
    f.write(src)
print("\n✅ All patches applied successfully!")
