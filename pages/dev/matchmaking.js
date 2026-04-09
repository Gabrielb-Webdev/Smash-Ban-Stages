/**
 * /dev/matchmaking — Preview de todas las pantallas del flujo 1v1
 * Datos mockeados, sin conexión a APIs.
 */
import { useState } from 'react';
import { CHARACTERS, CHARACTER_RENDERS, charRenderPath, stockIconPath } from '../../lib/characters';
import { RANKS, TIER_ICONS } from '../../lib/ranks';

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
const STAGES = Object.keys(STAGE_IMG);

// Personajes mock — usamos índices fijos
const MARIO   = CHARACTERS.find(c => c.name === 'Mario')  || CHARACTERS[0];
const LINK    = CHARACTERS.find(c => c.name === 'Link')   || CHARACTERS[3];
const PIKACHU = CHARACTERS.find(c => c.name === 'Pikachu')|| CHARACTERS[7];

const base = { background: '#0D0D17', minHeight: '100vh', padding: '20px 16px', fontFamily: 'system-ui,sans-serif', color: '#fff' };
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: '16px', marginBottom: 14 };
const label = { margin: '0 0 12px', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em' };
const sectionTitle = { fontSize: 13, fontWeight: 900, color: '#06B6D4', margin: '28px 0 12px', paddingBottom: 6, borderBottom: '1px solid rgba(6,182,212,0.2)' };

// ── Pantalla: Buscando ────────────────────────────────────────────────────────
function ScreenSearching({ elapsed, char, charAlt }) {
  const sp = { from: '#FF8C00', to: '#E85D00', icon: '🎮', label: 'Parsec' };
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <div style={card}>
      <p style={label}>🔍 Buscando rival</p>
      <div style={{ background: `linear-gradient(160deg,${sp.from}12,${sp.to}08)`, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '28px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 200, height: 200, transform: 'translate(-50%, -65%)', borderRadius: '50%', background: `radial-gradient(circle, ${sp.from}15 0%, transparent 70%)` }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 18px' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: sp.from, borderRightColor: sp.from }} />
            <div style={{ position: 'absolute', inset: '12px', borderRadius: '50%', background: `linear-gradient(135deg,${sp.from},${sp.to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 24px ${sp.from}40` }}>
              {char && <img src={stockIconPath(char, charAlt)} alt="" style={{ width: 38, height: 38, objectFit: 'contain' }} onError={e => { e.target.style.display='none'; }} />}
            </div>
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: '#fff' }}>Buscando rival…</p>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: sp.from }}>{sp.label} · Ranked</p>
          <p style={{ margin: '0 0 18px', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Podés navegar la app sin cancelar</p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '6px 16px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: sp.from, boxShadow: `0 0 8px ${sp.from}` }} />
            <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>
              {mins}:{String(secs).padStart(2, '0')}
            </p>
          </div>
        </div>
      </div>
      <button style={{ marginTop: 10, width: '100%', padding: '13px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
        ✕ Cancelar búsqueda
      </button>
    </div>
  );
}

// ── Pantalla: Rival encontrado ────────────────────────────────────────────────
function ScreenFound({ myChar, myAlt, oppChar, oppAlt, oppName, stage, isBo3, myScore, oppScore, gameNum }) {
  const stageImg = STAGE_IMG[stage];
  return (
    <div style={card}>
      <p style={label}>⚔️ Rival encontrado</p>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎮</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 2px', fontWeight: 900, fontSize: 17, color: '#fff' }}>¡Rival encontrado!</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Parsec</p>
        </div>
        {isBo3 && (
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '6px 12px' }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>Game {gameNum}/3</p>
            <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900 }}>
              <span style={{ color: '#22C55E' }}>{myScore}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>—</span>
              <span style={{ color: '#EF4444' }}>{oppScore}</span>
            </p>
          </div>
        )}
      </div>
      {/* Chars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '12px 16px', marginBottom: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={stockIconPath(myChar, myAlt)} alt="" style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 10, background: 'rgba(52,211,153,0.08)' }} onError={e => { e.target.style.display='none'; }} />
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Vos</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#34D399' }}>{myChar?.name}</p>
          </div>
        </div>
        <span style={{ fontSize: 18, fontWeight: 900, color: 'rgba(255,255,255,0.15)' }}>VS</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end', textAlign: 'right' }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>Rival</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#EF4444' }}>{oppChar?.name}</p>
          </div>
          <img src={stockIconPath(oppChar, oppAlt)} alt="" style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 10, background: 'rgba(239,68,68,0.08)' }} onError={e => { e.target.style.display='none'; }} />
        </div>
      </div>
      {/* Nombre rival */}
      <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '14px 16px', marginBottom: 10 }}>
        <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Tu rival</p>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{oppName}</p>
      </div>
      {/* Stage */}
      <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(232,142,0,0.2)', height: 88, marginBottom: 10 }}>
        {stageImg && <img src={stageImg} alt={stage} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'relative', background: stageImg ? 'linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 65%, transparent 100%)' : 'rgba(0,0,0,0.5)', padding: '14px 16px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: 'rgba(255,165,0,0.8)', textTransform: 'uppercase', letterSpacing: 1 }}>Escenario</p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#FF8C00' }}>{stage}</p>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Stock 3 · 7 min · Sin objetos</p>
        </div>
      </div>
      {/* Chat mock */}
      <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Chat</p>
        </div>
        <div style={{ height: 80, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ maxWidth: '80%', background: 'rgba(232,142,0,0.18)', border: '1px solid rgba(232,142,0,0.25)', borderRadius: 10, padding: '6px 10px' }}>
              <p style={{ margin: 0, fontSize: 13 }}>gg!</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>{oppName}</span>
            <div style={{ maxWidth: '80%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 10px' }}>
              <p style={{ margin: 0, fontSize: 13 }}>gl hf!</p>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '8px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <input readOnly placeholder="Escribí un mensaje…" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
          <button style={{ background: 'rgba(232,142,0,0.15)', border: '1px solid rgba(232,142,0,0.3)', borderRadius: 10, padding: '0 14px', color: '#FF8C00', fontWeight: 700, cursor: 'pointer', fontSize: 18 }}>➤</button>
        </div>
      </div>
    </div>
  );
}

// ── Pantalla: Reportar resultado ──────────────────────────────────────────────
function ScreenReport({ myChar, myAlt, stocks, setStocks, flow }) {
  return (
    <div style={card}>
      <p style={label}>📋 Reportar resultado — {flow}</p>
      {flow === 'normal' && (
        <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '14px 16px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800 }}>¿Quién ganó?</p>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Stocks que te quedaban</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[1,2,3].map(n => (
              <button key={n} onClick={() => setStocks(n)} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1px solid ${stocks===n ? 'rgba(255,140,0,0.6)' : 'rgba(255,255,255,0.1)'}`, background: stocks===n ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                {Array.from({length:n},(_,i)=><img key={i} src={stockIconPath(myChar, myAlt)} alt="" style={{width:22,height:22,objectFit:'contain'}} onError={e=>{e.target.style.display='none';}} />)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button style={{ padding: '13px', borderRadius: 13, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)', color: '#34D399', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>🏆 Yo gané</button>
            <button style={{ padding: '13px', borderRadius: 13, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>💀 Perdí</button>
          </div>
        </div>
      )}
      {flow === 'esperando' && (
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '16px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 6px', fontSize: 20 }}>⏳</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#818CF8' }}>Esperando que tu rival confirme el resultado…</p>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Se acepta automáticamente en 28s</p>
        </div>
      )}
      {flow === 'confirmar' && (
        <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800 }}>Tu rival dice que él ganó</p>
          <p style={{ margin: '-4px 0 8px', fontSize: 11, color: '#EF4444', fontWeight: 700 }}>⚠️ Si no respondés en 22s, se confirma automáticamente</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button style={{ padding: '12px 28px', borderRadius: 13, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)', color: '#34D399', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>✅ Confirmar</button>
            <button style={{ padding: '12px 28px', borderRadius: 13, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>❌ Negar</button>
          </div>
        </div>
      )}
      {flow === 'disputa' && (
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 16, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#FBBF24' }}>⚠️ Resultado en disputa</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Reportaron resultados distintos. Contactá a un admin.</p>
        </div>
      )}
    </div>
  );
}

// ── Pantalla: Resultado final ─────────────────────────────────────────────────
function ScreenResult({ iWon, myChar, myAlt, oppChar, oppAlt, myName, oppName, stage, rpDelta, isBo3, games, rankName, rpBefore, rpAfter }) {
  const rankObj = RANKS.find(r => r.name === rankName) || RANKS[0];
  const rkColor = rankObj?.color || 'rgba(255,255,255,0.3)';
  const rkIcon  = TIER_ICONS[rankObj?.tier] || '';
  const isSmasher = rankName === 'SMASHer';
  const stageImg = STAGE_IMG[stage];
  const myRender = myChar && CHARACTER_RENDERS[myChar.id] ? charRenderPath(CHARACTER_RENDERS[myChar.id]) : null;
  const oppRender = oppChar && CHARACTER_RENDERS[oppChar.id] ? charRenderPath(CHARACTER_RENDERS[oppChar.id]) : null;
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <p style={{ ...label, padding: '12px 16px 0' }}>{iWon ? '🏆 Victoria' : '💀 Derrota'}</p>
      <div style={{ position: 'relative', overflow: 'hidden', minHeight: 220 }}>
        {stageImg && <img src={stageImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(4px) brightness(0.28)', transform: 'scale(1.1)' }} onError={e => { e.target.style.display='none'; }} />}
        <div style={{ position: 'absolute', inset: 0, background: iWon ? 'linear-gradient(180deg,rgba(52,211,153,0.18),rgba(0,0,0,0.65))' : 'linear-gradient(180deg,rgba(239,68,68,0.22),rgba(0,0,0,0.7))' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: iWon ? 'linear-gradient(90deg,transparent,#34D399,transparent)' : 'linear-gradient(90deg,transparent,#EF4444,transparent)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '16px 16px 14px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 2px', fontSize: 30, fontWeight: 900, color: iWon ? '#34D399' : '#EF4444', textShadow: `0 0 28px ${iWon ? 'rgba(52,211,153,0.6)' : 'rgba(239,68,68,0.6)'}` }}>
            {iWon ? '¡Victoria! 🏆' : 'Derrota 💀'}
          </p>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{iWon ? '¡Bien jugado! 💪' : 'La próxima será'}</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {myRender ? <img src={myRender} alt="" style={{ width: 120, height: 120, objectFit: 'contain', filter: iWon ? 'drop-shadow(0 0 24px rgba(52,211,153,0.8))' : 'grayscale(40%) brightness(0.7)', transform: iWon ? 'scale(1.1)' : 'scale(0.88)' }} onError={e=>{e.target.style.display='none';}} /> : <div style={{width:120,height:120}}/>}
              <span style={{ fontSize: 12, fontWeight: 800, color: iWon ? '#34D399' : 'rgba(255,255,255,0.45)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{myName}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingBottom: 24, minWidth: 72 }}>
              {isBo3 ? (
                <span style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, textShadow: '0 2px 14px rgba(0,0,0,0.9)' }}>
                  <span style={{ color: iWon ? '#34D399' : '#EF4444' }}>{iWon ? 2 : 0}</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 6px', fontSize: 20 }}>-</span>
                  <span style={{ color: !iWon ? '#34D399' : '#EF4444' }}>{iWon ? 0 : 2}</span>
                </span>
              ) : (
                <span style={{ fontSize: 16, fontWeight: 900, color: 'rgba(255,255,255,0.3)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>VS</span>
              )}
              <span style={{ fontSize: 15, fontWeight: 900, color: iWon ? '#34D399' : '#EF4444', padding: '5px 14px', borderRadius: 24, background: iWon ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)', border: `1px solid ${iWon ? 'rgba(52,211,153,0.4)' : 'rgba(239,68,68,0.4)'}`, whiteSpace: 'nowrap' }}>
                {iWon ? `+${rpDelta}` : `${rpDelta}`} RP
              </span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {oppRender ? <img src={oppRender} alt="" style={{ width: 120, height: 120, objectFit: 'contain', filter: !iWon ? 'drop-shadow(0 0 24px rgba(52,211,153,0.8))' : 'grayscale(40%) brightness(0.7)', transform: !iWon ? 'scale(1.1)' : 'scale(0.88)' }} onError={e=>{e.target.style.display='none';}} /> : <div style={{width:120,height:120}}/>}
              <span style={{ fontSize: 12, fontWeight: 800, color: !iWon ? '#34D399' : 'rgba(255,255,255,0.45)', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{oppName}</span>
            </div>
          </div>
        </div>
      </div>
      {/* BO3 Games */}
      {isBo3 && games && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
          {games.map((g, i) => (
            <div key={i} style={{ flex: 1, position: 'relative', borderRadius: 14, overflow: 'hidden', border: `2px solid ${g.won ? 'rgba(52,211,153,0.4)' : 'rgba(239,68,68,0.35)'}`, height: 72 }}>
              {STAGE_IMG[g.stage] && <img src={STAGE_IMG[g.stage]} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e=>{e.target.style.display='none';}} />}
              <div style={{ position: 'absolute', inset: 0, background: g.won ? 'linear-gradient(180deg,rgba(52,211,153,0.1),rgba(0,0,0,0.75))' : 'linear-gradient(180deg,rgba(239,68,68,0.15),rgba(0,0,0,0.8))' }} />
              <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: 6 }}>
                <span style={{ fontSize: 18 }}>{g.won ? '🏆' : '💀'}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9)', textTransform: 'uppercase' }}>Game {i+1}</span>
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.9)', textAlign: 'center' }}>{g.stage}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Resumen de puntos */}
      <div style={{ background: iWon ? 'linear-gradient(135deg,rgba(52,211,153,0.06),rgba(52,211,153,0.02))' : 'linear-gradient(135deg,rgba(239,68,68,0.06),rgba(239,68,68,0.02))', border: `1px solid ${iWon ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.12)'}`, borderRadius: 18, padding: '16px 18px', margin: '0 16px 12px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: iWon ? 'linear-gradient(90deg,transparent,#34D399,transparent)' : 'linear-gradient(90deg,transparent,#EF4444,transparent)', opacity: 0.6 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: iWon ? 'rgba(52,211,153,0.12)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            {iWon ? '📈' : '📉'}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{iWon ? 'Puntos ganados' : 'Puntos perdidos'}</p>
            <p style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 900, color: iWon ? '#34D399' : '#EF4444', lineHeight: 1 }}>
              {iWon ? '+' : ''}{rpDelta} <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>RP</span>
            </p>
          </div>
        </div>
        {rankObj && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 22 }}>{rkIcon}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: rkColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{rankName}</span>
            </div>
            {!isSmasher && typeof rpAfter === 'number' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Rank Points</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: rkColor }}>{rpAfter}/100</span>
                </div>
                <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  {typeof rpBefore === 'number' && (
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(100, Math.max(0, rpBefore))}%`, borderRadius: 4, background: `${rkColor}40` }} />
                  )}
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(100, Math.max(0, rpAfter))}%`, borderRadius: 4, background: rkColor, transition: 'width 0.6s ease' }} />
                </div>
                {typeof rpBefore === 'number' && (
                  <p style={{ margin: '4px 0 0', fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>{rpBefore} → {rpAfter}</p>
                )}
              </div>
            )}
            {isSmasher && typeof rpAfter === 'number' && (
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#FF8C00' }}>{rpAfter} RP</p>
            )}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px' }}>
        <button style={{ flex: 2, padding: '14px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#FF8C00,#E85D00)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>🎮 Volver a jugar</button>
        <button style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>👤 Cambiar PJ</button>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DevMatchmaking() {
  const [elapsed, setElapsed] = useState(94);
  const [stocks, setStocks] = useState(2);
  const [stage, setStage] = useState('Smashville');
  const [isBo3, setIsBo3] = useState(true);
  const [myScore, setMyScore] = useState(1);
  const [oppScore] = useState(0);
  const [iWon, setIWon] = useState(true);

  return (
    <div style={base}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: '#fff' }}>🧪 Dev Preview — Matchmaking 1v1</p>
        <p style={{ margin: '0 0 24px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Datos mockeados · sin APIs</p>

        {/* Controles */}
        <div style={{ ...card, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}>
          <p style={label}>⚙️ Controles</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Tiempo:
              <input type="range" min={0} max={600} value={elapsed} onChange={e=>setElapsed(Number(e.target.value))} style={{ marginLeft: 8 }} />
              <span style={{ marginLeft: 6, color: '#fff' }}>{elapsed}s</span>
            </label>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Stage:
              <select value={stage} onChange={e=>setStage(e.target.value)} style={{ marginLeft: 8, background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 6px' }}>
                {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              <input type="checkbox" checked={isBo3} onChange={e=>setIsBo3(e.target.checked)} style={{ marginRight: 6 }} />BO3
            </label>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              <input type="checkbox" checked={iWon} onChange={e=>setIWon(e.target.checked)} style={{ marginRight: 6 }} />Gané
            </label>
            {isBo3 && (
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Score mío:
                <select value={myScore} onChange={e=>setMyScore(Number(e.target.value))} style={{ marginLeft: 8, background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 6px' }}>
                  {[0,1,2].map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>

        <p style={sectionTitle}>1 · Buscando rival</p>
        <ScreenSearching elapsed={elapsed} char={MARIO} charAlt={1} />

        <p style={sectionTitle}>2 · Rival encontrado (Game {isBo3 ? `${myScore+1}/3` : '1/1'})</p>
        <ScreenFound
          myChar={MARIO} myAlt={1} oppChar={LINK} oppAlt={1}
          oppName="RivalX" stage={stage}
          isBo3={isBo3} myScore={myScore} oppScore={oppScore} gameNum={myScore+1}
        />

        <p style={sectionTitle}>3a · Reportar — Normal</p>
        <ScreenReport myChar={MARIO} myAlt={1} stocks={stocks} setStocks={setStocks} flow="normal" />

        <p style={sectionTitle}>3b · Reportar — Esperando confirmación</p>
        <ScreenReport myChar={MARIO} myAlt={1} stocks={stocks} setStocks={setStocks} flow="esperando" />

        <p style={sectionTitle}>3c · Reportar — Rival pide confirmar</p>
        <ScreenReport myChar={MARIO} myAlt={1} stocks={stocks} setStocks={setStocks} flow="confirmar" />

        <p style={sectionTitle}>3d · Reportar — Disputa</p>
        <ScreenReport myChar={MARIO} myAlt={1} stocks={stocks} setStocks={setStocks} flow="disputa" />

        <p style={sectionTitle}>4a · Resultado — {iWon ? 'Victoria' : 'Derrota'} (1v1)</p>
        <ScreenResult iWon={iWon} myChar={MARIO} myAlt={1} oppChar={LINK} oppAlt={1} myName="GabrielBW" oppName="RivalX" stage={stage} rpDelta={iWon ? 12 : -8} isBo3={false} rankName="Hierro II" rpBefore={iWon ? 53 : 65} rpAfter={iWon ? 65 : 57} />

        <p style={sectionTitle}>4b · Resultado — {iWon ? 'Victoria' : 'Derrota'} (BO3)</p>
        <ScreenResult iWon={iWon} myChar={MARIO} myAlt={1} oppChar={LINK} oppAlt={1} myName="GabrielBW" oppName="RivalX" stage={stage} rpDelta={iWon ? 18 : -12} isBo3={true} rankName="Bronce I" rpBefore={iWon ? 65 : 83} rpAfter={iWon ? 83 : 71} games={[
          { won: iWon, stage: 'Smashville' },
          { won: !iWon, stage: 'Hollow Bastion' },
          { won: iWon, stage: 'Battlefield' },
        ]} />

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
          <a href="/dev/parsec-group" style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, color: '#06B6D4', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>🖥️ Sala Parsec Grupal →</a>
          <a href="/home" style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>← App</a>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #0D0D17; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{ opacity:.6; transform:scale(1); } 50%{ opacity:1; transform:scale(1.08); } }
      `}</style>
    </div>
  );
}
