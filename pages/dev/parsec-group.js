/**
 * /dev/parsec-group — Preview de todas las pantallas de Sala Grupal
 * Datos mockeados, sin conexión a APIs.
 */
import { useState } from 'react';
import { CHARACTERS, CHARACTER_RENDERS, charRenderPath, stockIconPath } from '../../lib/characters';

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

const MARIO   = CHARACTERS.find(c => c.name === 'Mario')   || CHARACTERS[0];
const LINK    = CHARACTERS.find(c => c.name === 'Link')    || CHARACTERS[3];
const PIKACHU = CHARACTERS.find(c => c.name === 'Pikachu') || CHARACTERS[7];
const SAMUS   = CHARACTERS.find(c => c.name === 'Samus')   || CHARACTERS[4];

const base = { background: '#0D0D17', minHeight: '100vh', padding: '20px 16px', fontFamily: 'system-ui,sans-serif', color: '#fff' };
const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: '16px', marginBottom: 14 };
const label = { margin: '0 0 12px', fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em' };
const sectionTitle = { fontSize: 13, fontWeight: 900, color: '#06B6D4', margin: '28px 0 12px', paddingBottom: 6, borderBottom: '1px solid rgba(6,182,212,0.2)' };

const MOCK_PLAYERS = [
  { userId: 'u1', userName: 'GabrielBW', charId: MARIO.id,   charAlt: 1  },
  { userId: 'u2', userName: 'RivalX',    charId: LINK.id,    charAlt: 1  },
  { userId: 'u3', userName: 'Pikarosu',  charId: PIKACHU.id, charAlt: 2  },
  { userId: 'u4', userName: 'SamusMax',  charId: SAMUS?.id || MARIO.id, charAlt: 1 },
];

const ROOM_CODE = 'SMSH-7K3Q';
const ROOM_HOST = 'u1';

// ── Helpers ────────────────────────────────────────────────────────────────────
function PlayerRow({ player, isHost, isMe, showKick, charObj }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: isMe ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.025)', border: `1px solid ${isMe ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`, marginBottom: 6 }}>
      {charObj
        ? <img src={stockIconPath(charObj, player.charAlt)} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }} onError={e => { e.target.style.display = 'none'; }} />
        : <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>?</div>
      }
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 15 }}>{player.userName}</p>
          {isHost && <span style={{ fontSize: 9, fontWeight: 900, background: 'rgba(255,140,0,0.15)', color: '#FF8C00', border: '1px solid rgba(255,140,0,0.3)', borderRadius: 6, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: .5 }}>Host</span>}
          {isMe && <span style={{ fontSize: 9, fontWeight: 900, background: 'rgba(52,211,153,0.12)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 6, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: .5 }}>Vos</span>}
        </div>
        {charObj && <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{charObj.name}</p>}
      </div>
      {showKick && !isMe && !isHost && (
        <button style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '4px 8px', color: '#EF4444', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>✕</button>
      )}
    </div>
  );
}

// ── 1. Sin sala ────────────────────────────────────────────────────────────────
function ScreenNoRoom() {
  return (
    <div style={card}>
      <p style={label}>🏠 Sin sala activa</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button style={{ padding: '16px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#FF8C00,#E85D00)', color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 24px rgba(255,140,0,0.3)', letterSpacing: .3 }}>
          🖥️ Crear sala
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <input readOnly placeholder="Código de sala…" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '14px 16px', color: '#fff', fontSize: 16, outline: 'none' }} />
          <button style={{ padding: '14px 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Unirse →</button>
        </div>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>Jugá con amigos mediante Parsec</p>
      </div>
    </div>
  );
}

// ── 2. Lobby de espera ─────────────────────────────────────────────────────────
function ScreenLobby({ isHost, charPicked, selectedChar, setSelectedChar }) {
  const me = MOCK_PLAYERS[0];
  const charObj = CHARACTERS.find(c => c.id === me.charId);
  return (
    <div style={card}>
      <p style={label}>🎯 Sala en espera · {isHost ? 'vista de host' : 'vista de jugador'}</p>
      {/* Header sala */}
      <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '14px 16px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Código de sala</p>
          <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer' }}>📋 Copiar</button>
        </div>
        <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: '#FF8C00', letterSpacing: '0.06em', fontVariantNumeric: 'tabular-nums', textShadow: '0 0 32px rgba(255,140,0,0.4)' }}>{ROOM_CODE}</p>
      </div>
      {/* Jugadores */}
      <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '12px', marginBottom: 10 }}>
        <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 }}>Jugadores ({MOCK_PLAYERS.length}/4)</p>
        {MOCK_PLAYERS.map(p => {
          const ch = CHARACTERS.find(c => c.id === p.charId);
          return <PlayerRow key={p.userId} player={p} isHost={p.userId === ROOM_HOST} isMe={p.userId === me.userId} showKick={isHost} charObj={ch} />;
        })}
      </div>
      {/* Picker personaje (si no eligió aún) */}
      {!charPicked && (
        <div style={{ background: '#10101A', border: '1px solid rgba(255,140,0,0.15)', borderRadius: 16, padding: '12px', marginBottom: 10 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,140,0,0.8)' }}>Elegí tu personaje antes de empezar</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
            {CHARACTERS.slice(0, 18).map(c => (
              <button key={c.id} onClick={() => setSelectedChar(c.id)} style={{ padding: 4, borderRadius: 8, border: `1px solid ${selectedChar === c.id ? 'rgba(255,140,0,0.6)' : 'rgba(255,255,255,0.08)'}`, background: selectedChar === c.id ? 'rgba(255,140,0,0.12)' : 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
                <img src={stockIconPath(c, 1)} alt={c.name} style={{ width: 28, height: 28, objectFit: 'contain', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
              </button>
            ))}
          </div>
          {selectedChar && (
            <button style={{ marginTop: 8, width: '100%', padding: '10px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#FF8C00,#E85D00)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              ✓ Confirmar {CHARACTERS.find(c => c.id === selectedChar)?.name}
            </button>
          )}
        </div>
      )}
      {/* Botón iniciar (host only) */}
      {isHost && (
        <button style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: charPicked ? 'linear-gradient(135deg,#22C55E,#16A34A)' : 'rgba(255,255,255,0.05)', color: charPicked ? '#fff' : 'rgba(255,255,255,0.3)', fontWeight: 900, fontSize: 16, cursor: charPicked ? 'pointer' : 'not-allowed', boxShadow: charPicked ? '0 4px 24px rgba(34,197,94,0.3)' : 'none', letterSpacing: .3 }}>
          {charPicked ? '▶ Iniciar set' : 'Esperando que todos elijan personaje…'}
        </button>
      )}
      {!isHost && (
        <div style={{ padding: '12px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#818CF8' }}>⏳ Esperando que el host inicie el set…</p>
        </div>
      )}
      {/* Botón salir */}
      <button style={{ marginTop: 10, width: '100%', padding: '12px', borderRadius: 14, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        🚪 Salir de la sala
      </button>
    </div>
  );
}

// ── 3. Jugando — Game en curso ─────────────────────────────────────────────────
function ScreenPlaying({ stage, gameNum, score, iAmHost, isMyTurn, myChar, oppChar, stocks, setStocks }) {
  const stageImg = STAGE_IMG[stage];
  const p1 = MOCK_PLAYERS[0]; // me
  const p2 = MOCK_PLAYERS[1]; // rival
  const p1ch = CHARACTERS.find(c => c.id === p1.charId);
  const p2ch = CHARACTERS.find(c => c.id === p2.charId);
  return (
    <div style={card}>
      <p style={label}>⚔️ Jugando · Game {gameNum}/3 · {iAmHost ? 'host' : isMyTurn ? 'mi turno' : 'otro turno'}</p>
      {/* Stage banner */}
      <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', height: 90, marginBottom: 10 }}>
        {stageImg && <img src={stageImg} alt={stage} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 65%, transparent 100%)' }} />
        <div style={{ position: 'relative', height: '100%', padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <p style={{ margin: '0 0 2px', fontSize: 9, fontWeight: 700, color: 'rgba(255,165,0,0.8)', textTransform: 'uppercase', letterSpacing: 1 }}>Escenario · Game {gameNum}</p>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#FF8C00' }}>{stage}</p>
        </div>
      </div>
      {/* Score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '10px 16px', marginBottom: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          {p1ch && <img src={stockIconPath(p1ch, p1.charAlt)} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />}
          <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#34D399' }}>{p1.userName}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '4px 14px' }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#22C55E' }}>{score[0]}</span>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>—</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#EF4444' }}>{score[1]}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: '#EF4444' }}>{p2.userName}</p>
          {p2ch && <img src={stockIconPath(p2ch, p2.charAlt)} alt="" style={{ width: 34, height: 34, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />}
        </div>
      </div>

      {/* Sección según rol */}
      {iAmHost && (
        <div style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 14, padding: '12px 16px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: '#FB923C' }}>🎮 Host — Game {gameNum} en curso</p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Esperá que los jugadores reporten el resultado</p>
          {/* Kick desde scoreboard */}
          <p style={{ margin: '12px 0 6px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Jugadores</p>
          {MOCK_PLAYERS.map(p => {
            const ch = CHARACTERS.find(c => c.id === p.charId);
            return <PlayerRow key={p.userId} player={p} isHost={p.userId === ROOM_HOST} isMe={p.userId === p1.userId} showKick charObj={ch} />;
          })}
          <button style={{ display: 'block', width: '100%', marginTop: 8, padding: '10px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🚪 Cerrar sala</button>
        </div>
      )}

      {isMyTurn && !iAmHost && (
        <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '14px 16px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 800 }}>¿Quién ganó el game {gameNum}?</p>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: .5 }}>Stocks que te quedaban</p>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[1,2,3].map(n => (
              <button key={n} onClick={() => setStocks(n)} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: `1px solid ${stocks===n ? 'rgba(255,140,0,0.6)' : 'rgba(255,255,255,0.1)'}`, background: stocks===n ? 'rgba(255,140,0,0.15)' : 'rgba(255,255,255,0.04)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                {Array.from({length:n},(_,i)=><img key={i} src={stockIconPath(p1ch, p1.charAlt)} alt="" style={{width:22,height:22,objectFit:'contain'}} onError={e=>{e.target.style.display='none';}} />)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button style={{ padding: '13px', borderRadius: 13, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)', color: '#34D399', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>🏆 Yo gané</button>
            <button style={{ padding: '13px', borderRadius: 13, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>💀 Perdí</button>
          </div>
        </div>
      )}

      {!isMyTurn && !iAmHost && (
        <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#818CF8' }}>⏳ Esperando que los jugadores reporten el resultado…</p>
        </div>
      )}
    </div>
  );
}

// ── 4. Confirmar resultado ─────────────────────────────────────────────────────
function ScreenConfirm({ flow, gameNum }) {
  return (
    <div style={card}>
      <p style={label}>✅ Confirmar resultado · Game {gameNum}</p>
      {flow === 'esperando' && (
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '16px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 6px', fontSize: 20 }}>⏳</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#818CF8' }}>Esperando que tu rival confirme…</p>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Se acepta automáticamente en 28s</p>
        </div>
      )}
      {flow === 'confirmar' && (
        <div style={{ background: '#10101A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800 }}>RivalX dice que él ganó el game {gameNum}</p>
          <p style={{ margin: '0 0 12px', fontSize: 11, color: '#EF4444', fontWeight: 700 }}>⚠️ Se confirma solo en 22s si no respondés</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button style={{ padding: '12px 28px', borderRadius: 13, border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.08)', color: '#34D399', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>✅ Confirmar</button>
            <button style={{ padding: '12px 28px', borderRadius: 13, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#EF4444', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>❌ Negar</button>
          </div>
        </div>
      )}
      {flow === 'disputa' && (
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 16, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 800, color: '#FBBF24' }}>⚠️ Resultado en disputa — Game {gameNum}</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Reportaron resultados distintos. El host puede resolverlo o contactá a un admin.</p>
        </div>
      )}
    </div>
  );
}

// ── 5. Set terminado / Siguiente set ──────────────────────────────────────────
function ScreenSetDone({ iAmHost, winner, setScore }) {
  const stageGames = ['Smashville', 'Hollow Bastion', 'Battlefield'];
  const isWinner = winner === 'me';
  return (
    <div style={card}>
      <p style={label}>🏁 Set terminado · score {setScore}</p>
      <div style={{ background: isWinner ? 'rgba(52,211,153,0.07)' : 'rgba(239,68,68,0.07)', border: `1px solid ${isWinner ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 18, padding: '16px', marginBottom: 10, textAlign: 'center' }}>
        <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 900, color: isWinner ? '#34D399' : '#EF4444' }}>
          {isWinner ? 'GabrielBW ganó el set 🏆' : 'RivalX ganó el set'}
        </p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.5)' }}>{setScore}</p>
      </div>
      {/* Games breakdown */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {[1,2,3].map((g, i) => {
          const won = (isWinner && i < 2) || (!isWinner && i === 2);
          const stg = stageGames[i];
          return (
            <div key={g} style={{ flex: 1, position: 'relative', borderRadius: 14, overflow: 'hidden', border: `2px solid ${won ? 'rgba(52,211,153,0.4)' : 'rgba(239,68,68,0.35)'}`, height: 70 }}>
              {STAGE_IMG[stg] && <img src={STAGE_IMG[stg]} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e=>{e.target.style.display='none';}} />}
              <div style={{ position: 'absolute', inset: 0, background: won ? 'linear-gradient(180deg,rgba(52,211,153,0.12),rgba(0,0,0,0.75))' : 'linear-gradient(180deg,rgba(239,68,68,0.15),rgba(0,0,0,0.8))' }} />
              <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, padding: 5 }}>
                <span style={{ fontSize: 16 }}>{won ? '🏆' : '💀'}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9)', textTransform: 'uppercase' }}>Game {g}</span>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.9)', textAlign: 'center' }}>{stg}</span>
              </div>
            </div>
          );
        })}
      </div>
      {iAmHost && (
        <>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1 }}>Siguiente set</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ flex: 2, padding: '14px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg,#FF8C00,#E85D00)', color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>▶ Iniciar siguiente set</button>
            <button style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#EF4444', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>🚪 Cerrar</button>
          </div>
        </>
      )}
      {!iAmHost && (
        <div style={{ padding: '12px', background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#818CF8' }}>⏳ Esperando que el host inicie el siguiente set…</p>
        </div>
      )}
    </div>
  );
}

// ── 6. Picker de personaje (en lobby y mid-match) ──────────────────────────────
function ScreenCharPicker({ context }) {
  const [sel, setSel] = useState(null);
  const p1ch = CHARACTERS.find(c => c.id === MOCK_PLAYERS[0].charId);
  return (
    <div style={card}>
      <p style={label}>🎭 Picker personaje · {context}</p>
      {context === 'mid-match' && (
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#FBBF24' }}>⚔️ ¡Set terminado! Elegí tu personaje para el siguiente game</p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {CHARACTERS.slice(0, 24).map(c => (
          <button key={c.id} onClick={() => setSel(c.id)} style={{ padding: 6, borderRadius: 10, border: `1px solid ${sel === c.id ? 'rgba(255,140,0,0.6)' : 'rgba(255,255,255,0.08)'}`, background: sel === c.id ? 'rgba(255,140,0,0.12)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <img src={stockIconPath(c, 1)} alt={c.name} style={{ width: 34, height: 34, objectFit: 'contain', display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>{c.name}</span>
          </button>
        ))}
      </div>
      {sel && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
          <img src={stockIconPath(CHARACTERS.find(c => c.id === sel), 1)} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} onError={e=>{e.target.style.display='none';}} />
          <button style={{ flex: 1, padding: '12px', borderRadius: 13, border: 'none', background: 'linear-gradient(135deg,#FF8C00,#E85D00)', color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
            ✓ Confirmar {CHARACTERS.find(c => c.id === sel)?.name}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DevParsecGroup() {
  const [isHost, setIsHost] = useState(true);
  const [charPicked, setCharPicked] = useState(false);
  const [selectedChar, setSelectedChar] = useState(null);
  const [stage, setStage] = useState('Smashville');
  const [gameNum, setGameNum] = useState(2);
  const [score, setScore] = useState([1, 0]);
  const [stocks, setStocks] = useState(2);
  const [isWinner, setIsWinner] = useState(true);

  return (
    <div style={base}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <p style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: '#fff' }}>🧪 Dev Preview — Sala Grupal (Parsec)</p>
        <p style={{ margin: '0 0 24px', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Datos mockeados · sin APIs</p>

        {/* Controles */}
        <div style={{ ...card, background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}>
          <p style={label}>⚙️ Controles</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              <input type="checkbox" checked={isHost} onChange={e => setIsHost(e.target.checked)} style={{ marginRight: 6 }} />Soy host
            </label>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              <input type="checkbox" checked={charPicked} onChange={e => setCharPicked(e.target.checked)} style={{ marginRight: 6 }} />Personaje elegido
            </label>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              <input type="checkbox" checked={isWinner} onChange={e => setIsWinner(e.target.checked)} style={{ marginRight: 6 }} />Yo gané el set
            </label>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Stage:
              <select value={stage} onChange={e => setStage(e.target.value)} style={{ marginLeft: 8, background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 6px' }}>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Game N°:
              <select value={gameNum} onChange={e => setGameNum(Number(e.target.value))} style={{ marginLeft: 8, background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '3px 6px' }}>
                {[1,2,3].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
        </div>

        <p style={sectionTitle}>1 · Sin sala activa</p>
        <ScreenNoRoom />

        <p style={sectionTitle}>2 · Lobby en espera ({isHost ? 'host' : 'jugador'}, {charPicked ? 'PJ elegido' : 'sin PJ'})</p>
        <ScreenLobby isHost={isHost} charPicked={charPicked} selectedChar={selectedChar} setSelectedChar={setSelectedChar} />

        <p style={sectionTitle}>3a · Game {gameNum} en curso — {isHost ? 'host' : 'mi turno reportar'}</p>
        <ScreenPlaying stage={stage} gameNum={gameNum} score={score} iAmHost={isHost} isMyTurn={!isHost} myChar={MOCK_PLAYERS[0].charId} oppChar={MOCK_PLAYERS[1].charId} stocks={stocks} setStocks={setStocks} />

        <p style={sectionTitle}>3b · Game {gameNum} en curso — espectador/no toca reportar</p>
        <ScreenPlaying stage={stage} gameNum={gameNum} score={score} iAmHost={false} isMyTurn={false} myChar={MOCK_PLAYERS[0].charId} oppChar={MOCK_PLAYERS[1].charId} stocks={stocks} setStocks={setStocks} />

        <p style={sectionTitle}>4a · Confirmar — esperando que rival confirme</p>
        <ScreenConfirm flow="esperando" gameNum={gameNum} />

        <p style={sectionTitle}>4b · Confirmar — rival pide confirmar</p>
        <ScreenConfirm flow="confirmar" gameNum={gameNum} />

        <p style={sectionTitle}>4c · Confirmar — resultado en disputa</p>
        <ScreenConfirm flow="disputa" gameNum={gameNum} />

        <p style={sectionTitle}>5 · Set terminado — {isWinner ? 'Yo gané' : 'Rival ganó'} ({isHost ? 'host' : 'jugador'})</p>
        <ScreenSetDone iAmHost={isHost} winner={isWinner ? 'me' : 'opp'} setScore="2 — 1" />

        <p style={sectionTitle}>6a · Picker de personaje — lobby</p>
        <ScreenCharPicker context="lobby" />

        <p style={sectionTitle}>6b · Picker de personaje — mid-match (set terminado)</p>
        <ScreenCharPicker context="mid-match" />

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 10 }}>
          <a href="/dev/matchmaking" style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, color: '#06B6D4', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>← Matchmaking 1v1</a>
          <a href="/home" style={{ flex: 1, textAlign: 'center', padding: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>← App</a>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #0D0D17; }
      `}</style>
    </div>
  );
}
