import { useState } from 'react';
import { CHARACTERS, charImgPath, CHARACTER_RENDERS, charRenderPath } from '../../lib/characters';

function CharImg({ localCharId, size = 32 }) {
  const renderFile = localCharId ? CHARACTER_RENDERS[localCharId] : null;
  const charObj = localCharId ? CHARACTERS.find(c => c.id === localCharId) : null;
  if (renderFile) return <img src={charRenderPath(renderFile)} alt="" style={{ width: size, height: size, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />;
  if (charObj) return <img src={charImgPath(charObj.img)} alt="" style={{ width: size, height: size, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />;
  return <div style={{ width: size, height: size, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>?</span></div>;
}

function WinRateBar({ label, wins, total, color = '#F5C518' }) {
  const pct = total > 0 ? Math.round(wins * 100 / total) : 0;
  const losses = total - wins;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{pct}%</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{label}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{100 - pct}%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 40, textAlign: 'center' }}>{wins}-{losses}</span>
        <div style={{ flex: 1, height: 6, background: '#EF4444', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ ch }) {
  const gameWR = ch.games > 0 ? Math.round(ch.wins * 100 / ch.games) : 0;
  const setWR = ch.sets > 0 ? Math.round(ch.setWins * 100 / ch.sets) : 0;
  const topVsChars = (ch.vsChars || []).slice(0, 5);
  const topVsPlayers = (ch.vsPlayers || []).sort((a, b) => b.sets - a.sets).slice(0, 10);

  return (
    <div>
      <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>Winrates</p>
      <WinRateBar label={`Set Count — ${ch.setWins}-${ch.sets - ch.setWins}`} wins={ch.setWins} total={ch.sets} />
      <WinRateBar label={`Game Count — ${ch.wins}-${ch.games - ch.wins}`} wins={ch.wins} total={ch.games} color="#818CF8" />

      {topVsChars.length > 0 && (
        <>
          <p style={{ margin: '16px 0 8px', fontSize: 11, fontWeight: 800, color: '#F5C518', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Most Played by # Games</p>
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, overflow: 'hidden' }}>
            {topVsChars.map((vc, i) => {
              const gPct = vc.games > 0 ? Math.round(vc.wins * 100 / vc.games) : 0;
              const sPct = vc.sets > 0 ? Math.round(vc.setWins * 100 / vc.sets) : 0;
              return (
                <div key={vc.charId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: i < topVsChars.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 28, textAlign: 'right' }}>{gPct}%</span>
                  <CharImg localCharId={vc.localCharId} size={24} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', flex: 1, textAlign: 'center' }}>{vc.wins}-{vc.games - vc.wins}</span>
                  <CharImg localCharId={vc.localCharId} size={24} />
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 28 }}>{sPct}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {topVsPlayers.length > 0 && (
        <>
          <p style={{ margin: '16px 0 8px', fontSize: 11, fontWeight: 800, color: '#F5C518', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>Notable H2Hs</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {topVsPlayers.map(vp => {
              const sPct = vp.sets > 0 ? Math.round(vp.setWins * 100 / vp.sets) : 0;
              return (
                <div key={vp.name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 10px' }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vp.name}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: sPct >= 50 ? '#22C55E' : '#EF4444' }}>{sPct}%</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', alignSelf: 'flex-end' }}>{vp.setWins}-{vp.sets - vp.setWins}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function MatchesTab({ ch }) {
  const matches = ch.matches || [];
  // Group by tournament
  const grouped = {};
  matches.forEach(m => {
    const key = m.tournament || '?';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });

  return (
    <div>
      {Object.entries(grouped).map(([tName, tMatches]) => (
        <div key={tName} style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{tName}</p>
          {tMatches.map((setData, si) => {
            const gamesWon = setData.games.filter(g => g.win).length;
            const gamesLost = setData.games.filter(g => !g.win).length;
            return (
              <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 4, background: setData.setWin ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${setData.setWin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 10, cursor: setData.setLink ? 'pointer' : 'default' }} onClick={() => setData.setLink && window.open(setData.setLink, '_blank')}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>{setData.round}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: setData.setWin ? '#22C55E' : '#EF4444' }}>{gamesWon}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>-</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: !setData.setWin ? '#22C55E' : '#EF4444' }}>{gamesLost}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{setData.opponent}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {setData.games.map((g, gi) => (
                    <CharImg key={gi} localCharId={g.oppLocalCharId} size={20} />
                  ))}
                  </div>
                </div>
              );
            })}
        </div>
      ))}
      {matches.length === 0 && <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Sin datos de partidas</p>}
    </div>
  );
}

function CharactersTab({ ch }) {
  const vsChars = ch.vsChars || [];
  return (
    <div>
      {vsChars.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', width: 50, textAlign: 'center' }}>Games</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', width: 50, textAlign: 'center' }}>Sets</span>
          </div>
          {vsChars.map((vc, i) => {
            const gPct = vc.games > 0 ? Math.round(vc.wins * 100 / vc.games) : 0;
            const sPct = vc.sets > 0 ? Math.round(vc.setWins * 100 / vc.sets) : 0;
            return (
              <div key={vc.charId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: i < vsChars.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', width: 16, textAlign: 'right' }}>vs</span>
                <CharImg localCharId={vc.localCharId} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vc.charName}</p>
                  <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{vc.wins}-{vc.games - vc.wins}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: gPct >= 50 ? '#22C55E' : '#EF4444', width: 50, textAlign: 'center' }}>{gPct}%</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: sPct >= 50 ? '#22C55E' : '#EF4444', width: 50, textAlign: 'center' }}>{sPct}%</span>
              </div>
            );
          })}
        </div>
      )}
      {vsChars.length === 0 && <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Sin datos</p>}
    </div>
  );
}

function OpponentsTab({ ch }) {
  const vsPlayers = ch.vsPlayers || [];
  return (
    <div>
      {vsPlayers.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', width: 50, textAlign: 'center' }}>Games</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', width: 50, textAlign: 'center' }}>Sets</span>
          </div>
          {vsPlayers.map((vp, i) => {
            const gPct = vp.games > 0 ? Math.round(vp.wins * 100 / vp.games) : 0;
            const sPct = vp.sets > 0 ? Math.round(vp.setWins * 100 / vp.sets) : 0;
            return (
              <div key={vp.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: i < vsPlayers.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vp.name}</p>
                  <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>{vp.setWins}-{vp.sets - vp.setWins}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: gPct >= 50 ? '#22C55E' : '#EF4444', width: 50, textAlign: 'center' }}>{gPct}%</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: sPct >= 50 ? '#22C55E' : '#EF4444', width: 50, textAlign: 'center' }}>{sPct}%</span>
              </div>
            );
          })}
        </div>
      )}
      {vsPlayers.length === 0 && <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Sin datos</p>}
    </div>
  );
}

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'matches', label: 'Matches' },
  { key: 'characters', label: 'Characters' },
  { key: 'opponents', label: 'Opponents' },
];

export default function CharacterDetail({ ch, onClose, onBack }) {
  const [tab, setTab] = useState('overview');
  const localId = ch.localCharId;
  const charObj = localId ? CHARACTERS.find(c => c.id === localId) : null;
  const renderFile = localId ? CHARACTER_RENDERS[localId] : null;
  const displayName = charObj?.name || ch.charName || `#${ch.startggCharId}`;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '85vh', background: '#111', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px 20px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'slideUp .25s ease-out' }}>
        {/* Drag handle */}
        <div onClick={onClose} onTouchStart={e => { e.currentTarget.dataset.ty = e.touches[0].clientY; }} onTouchEnd={e => { if (e.changedTouches[0].clientY - Number(e.currentTarget.dataset.ty||0) > 30) onClose(); }} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 0', cursor: 'pointer', userSelect: 'none' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.22)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px 14px', background: 'linear-gradient(90deg, rgba(245,197,24,0.12), transparent)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 18, cursor: 'pointer', padding: '4px 8px 4px 0', lineHeight: 1, flexShrink: 0 }}>←</button>
          )}
          {renderFile ? (
            <img src={charRenderPath(renderFile)} alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <CharImg localCharId={localId} size={48} />
          )}
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff' }}>{displayName}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{ch.games} games · {ch.sets || 0} sets · {ch.usage}% usage</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: '10px 0', background: 'none', border: 'none', borderBottom: tab === t.key ? '2px solid #F5C518' : '2px solid transparent', color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content — scrollable */}
        <div style={{ padding: '14px 16px', flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {tab === 'overview' && <OverviewTab ch={ch} />}
          {tab === 'matches' && <MatchesTab ch={ch} />}
          {tab === 'characters' && <CharactersTab ch={ch} />}
          {tab === 'opponents' && <OpponentsTab ch={ch} />}
        </div>
      </div>

      <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
    </div>
  );
}
