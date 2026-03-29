import { useEffect, useState, useRef } from 'react';

const COLORS = {
  purpleBright: '#7b2fff',
  magenta: '#e91e8c',
  cyan: '#00e5ff',
  gold: '#f5a623',
  white: '#f0eaff',
  black: '#07020f',
  purpleDeep: '#1a0d2e',
};

export default function StreamOverlayWarui() {
  const [state, setState] = useState(null);
  const lastUpdatedAtRef = useRef(null);

  useEffect(() => {
    const API = '/api/warui/stream-state';

    const load = async () => {
      try {
        const r = await fetch(API);
        const d = await r.json();
        if (!d.empty) {
          setState(d);
          lastUpdatedAtRef.current = d.updatedAt;
        }
      } catch {}
    };

    load();

    const interval = setInterval(async () => {
      try {
        const r = await fetch(API);
        const d = await r.json();
        if (!d.empty && d.updatedAt !== lastUpdatedAtRef.current) {
          lastUpdatedAtRef.current = d.updatedAt;
          setState(d);
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const p1 = (state?.player1?.tag || 'JUGADOR 1').toUpperCase();
  const p2 = (state?.player2?.tag || 'JUGADOR 2').toUpperCase();
  const sp1 = (state?.player1?.sponsor || '').toUpperCase();
  const sp2 = (state?.player2?.sponsor || '').toUpperCase();
  const score1 = state?.score1 ?? 0;
  const score2 = state?.score2 ?? 0;
  const format = state?.format || 'BEST OF 3';
  const round = (state?.round || 'WINNERS QUARTERS').toUpperCase();

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: `linear-gradient(135deg, ${COLORS.black} 0%, ${COLORS.purpleDeep} 50%, ${COLORS.black} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Exo 2', sans-serif",
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Grid de fondo */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(123,47,255,0.05) 40px, rgba(123,47,255,0.05) 41px), ' +
          'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(123,47,255,0.05) 40px, rgba(123,47,255,0.05) 41px)',
        pointerEvents: 'none',
      }} />

      {/* Vigneta */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(7,2,15,0.6) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Scoreboard principal */}
      <div style={{ width: '90%', maxWidth: '1300px', position: 'relative', zIndex: 1 }}>

        {/* Top bar */}
        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          height: '160px',
          filter: 'drop-shadow(0 0 20px rgba(0,229,255,0.2))',
        }}>

          {/* Jugador 1 */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '18px',
            padding: '0 30px',
            background: `linear-gradient(135deg, ${COLORS.black} 0%, ${COLORS.purpleDeep} 60%, #2a0d50 100%)`,
            clipPath: 'polygon(0 0, calc(100% - 30px) 0, 100% 100%, 0 100%)',
            position: 'relative',
            overflow: 'hidden',
            borderTop: `2px solid rgba(123,47,255,0.5)`,
            borderLeft: `2px solid ${COLORS.magenta}`,
          }}>
            {/* Línea de scan animada */}
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Orbitron:wght@700;900&family=Exo+2:wght@400;600;800&display=swap');
              @keyframes scan { to { left: 200%; } }
              @keyframes glow-pulse {
                0%, 100% { box-shadow: 0 0 20px rgba(233,30,140,0.3); }
                50% { box-shadow: 0 0 40px rgba(233,30,140,0.7), 0 0 60px rgba(123,47,255,0.4); }
              }
              @keyframes logo-glow {
                0%, 100% { box-shadow: 0 0 18px #7b2fff, 0 0 36px rgba(123,47,255,0.4); border-color: #7b2fff; }
                50%      { box-shadow: 0 0 24px #e91e8c, 0 0 48px rgba(233,30,140,0.5); border-color: #e91e8c; }
              }
              .warui-topbar { animation: glow-pulse 4s ease-in-out infinite; }
              .warui-logo-circle { animation: logo-glow 3s ease-in-out infinite; }
            `}</style>
            <div>
              <div style={{
                fontFamily: "'Orbitron', monospace",
                fontWeight: 900,
                fontSize: 'clamp(20px, 2.5vw, 40px)',
                color: COLORS.white,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                textShadow: `0 0 20px rgba(233,30,140,0.6), 0 0 40px rgba(123,47,255,0.4)`,
              }}>{p1}</div>
              {sp1 && (
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 'clamp(11px, 1vw, 16px)',
                  fontWeight: 600,
                  color: COLORS.gold,
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                  opacity: 0.85,
                }}>{sp1}</div>
              )}
            </div>
            <div style={{
              fontFamily: "'Orbitron', monospace",
              fontWeight: 900,
              fontSize: 'clamp(48px, 5vw, 72px)',
              color: COLORS.white,
              lineHeight: 1,
              textShadow: `0 0 20px ${COLORS.cyan}, 0 0 40px rgba(0,229,255,0.4)`,
              minWidth: '72px',
              textAlign: 'center',
              flexShrink: 0,
            }}>{score1}</div>
          </div>

          {/* Centro con logo */}
          <div className="warui-topbar" style={{
            width: '180px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(180deg, #0d0820 0%, ${COLORS.purpleDeep} 100%)`,
            borderLeft: `2px solid ${COLORS.purpleBright}`,
            borderRight: `2px solid ${COLORS.purpleBright}`,
            boxShadow: `inset 0 0 30px rgba(123,47,255,0.3)`,
          }}>
            <div className="warui-logo-circle" style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: `3px solid ${COLORS.purpleBright}`,
            }}>
              <img
                src="/overlays/warui/img/logo.png"
                alt="Arena Warui"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          </div>

          {/* Jugador 2 */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexDirection: 'row-reverse',
            gap: '18px',
            padding: '0 30px',
            background: `linear-gradient(225deg, ${COLORS.black} 0%, ${COLORS.purpleDeep} 60%, #2a0d50 100%)`,
            clipPath: 'polygon(30px 0, 100% 0, 100% 100%, 0 100%)',
            position: 'relative',
            overflow: 'hidden',
            borderTop: `2px solid rgba(123,47,255,0.5)`,
            borderRight: `2px solid ${COLORS.cyan}`,
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: "'Orbitron', monospace",
                fontWeight: 900,
                fontSize: 'clamp(20px, 2.5vw, 40px)',
                color: COLORS.white,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                textShadow: `0 0 20px rgba(0,229,255,0.6), 0 0 40px rgba(123,47,255,0.4)`,
              }}>{p2}</div>
              {sp2 && (
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 'clamp(11px, 1vw, 16px)',
                  fontWeight: 600,
                  color: COLORS.gold,
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                  opacity: 0.85,
                  textAlign: 'right',
                }}>{sp2}</div>
              )}
            </div>
            <div style={{
              fontFamily: "'Orbitron', monospace",
              fontWeight: 900,
              fontSize: 'clamp(48px, 5vw, 72px)',
              color: COLORS.white,
              lineHeight: 1,
              textShadow: `0 0 20px ${COLORS.cyan}, 0 0 40px rgba(0,229,255,0.4)`,
              minWidth: '72px',
              textAlign: 'center',
              flexShrink: 0,
            }}>{score2}</div>
          </div>
        </div>

        {/* Info strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '52px',
          marginTop: '4px',
          background: 'linear-gradient(90deg, rgba(233,30,140,0.15) 0%, rgba(13,8,32,0.95) 30%, rgba(13,8,32,0.95) 70%, rgba(0,229,255,0.12) 100%)',
          border: `1px solid rgba(123,47,255,0.4)`,
          borderTop: `2px solid ${COLORS.purpleBright}`,
          padding: '0 30px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <span style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(13px, 1.2vw, 22px)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: COLORS.gold,
          }}>{format}</span>
          <span style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(13px, 1.2vw, 22px)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: COLORS.white,
            opacity: 0.9,
          }}>⚔ ARENA WARUI</span>
          <span style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(13px, 1.2vw, 22px)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: COLORS.cyan,
            textShadow: `0 0 8px ${COLORS.cyan}`,
          }}>{round}</span>
        </div>
      </div>

      {/* Banner inferior */}
      <img
        src="/overlays/warui/img/Warui Banner.png"
        alt="Arena Warui"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '120px',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    </div>
  );
}
