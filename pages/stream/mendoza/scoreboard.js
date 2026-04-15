import Head from 'next/head';
import { useState, useEffect } from 'react';
import { getStockIconPath } from '../../../src/utils/constants';

export default function MendozaScoreboardOverlay() {
  const [state, setState] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const r = await fetch('/api/mendoza/scoreboard-state');
        if (r.ok) {
          const data = await r.json();
          if (!cancelled) setState(data);
        }
      } catch {}
      if (!cancelled) setTimeout(poll, 1500);
    }
    poll();
    return () => { cancelled = true; };
  }, []);

  const p1 = state?.player1 || { tag: '', name: 'Jugador 1', score: 0, character: 'mario', skin: 1 };
  const p2 = state?.player2 || { tag: '', name: 'Jugador 2', score: 0, character: 'mario', skin: 1 };
  const roundText = [state?.round, state?.format].filter(Boolean).join(' · ');

  const p1CharImg = getStockIconPath(p1.character, p1.skin) || getStockIconPath('mario', 1);
  const p2CharImg = getStockIconPath(p2.character, p2.skin) || getStockIconPath('mario', 1);

  const p1Winning = Number(p1.score) > Number(p2.score);
  const p2Winning = Number(p2.score) > Number(p1.score);

  const scoreStyle = (winning) => ({
    position: 'absolute',
    bottom: '45%',
    fontSize: 'clamp(50px, 9vw, 100px)',
    fontWeight: 900,
    fontFamily: "'Impact', 'Arial Black', sans-serif",
    color: winning ? '#ffd700' : '#fff',
    lineHeight: 1,
    textShadow: winning
      ? '0 2px 6px rgba(0,0,0,.9), 0 0 10px rgba(255,215,0,.5)'
      : '0 2px 6px rgba(0,0,0,.9), 0 0 8px rgba(255,255,255,.25)',
    transition: 'color .3s, text-shadow .3s',
  });

  const nameStyle = (align) => ({
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 'clamp(15px, 6.2vw, 25px)',
    fontWeight: 800,
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textShadow: '1px 1px 4px rgba(0,0,0,.9)',
    maxWidth: '20%',
    ...(align === 'left' ? { left: '27%' } : { right: '27%', textAlign: 'right' }),
  });

  return (
    <>
      <Head>
        <title>Mendoza Scoreboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { background: transparent; overflow: hidden; }
        `}</style>
      </Head>

      <div style={{ position: 'relative', width: '100vw', aspectRatio: '1920 / 1080', maxWidth: 1920 }}>
        {/* Capas de imagen */}
        <img
          src="/overlays/mendoza/image.png"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
        />
        <img
          src="/overlays/mendoza/image copy 3.png"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
        />
        <img
          src="/overlays/mendoza/logo.png"
          alt=""
          style={{
            position: 'absolute', zIndex: 2, left: '49%', top: '48%',
            transform: 'translate(-50%, -50%)', height: '14%', opacity: 0.14, pointerEvents: 'none',
          }}
        />

        {/* Contenido */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 3 }}>

          {/* Ronda */}
          <span style={{
            position: 'absolute', left: '49.5%', top: '39.8%',
            transform: 'translateX(-50%)',
            color: '#fff', fontSize: 'clamp(11px, 1.15vw, 22px)', fontWeight: 800,
            whiteSpace: 'nowrap', textShadow: '1px 1px 3px rgba(0,0,0,.9)',
          }}>
            {roundText}
          </span>

          {/* P1 ── char icon */}
          <div style={{
            position: 'absolute', width: '5%', aspectRatio: '1',
            overflow: 'hidden', top: '46.8%', left: '13%',
          }}>
            <img src={p1CharImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* P1 ── score */}
          <span style={{ ...scoreStyle(p1Winning), left: '21.4%', transform: 'translateX(-50%)' }}>
            {p1.score}
          </span>

          {/* P1 ── nombre */}
          <span style={nameStyle('left')}>
            {p1.tag && <span style={{ color: '#ffd700' }}>{p1.tag}|</span>}
            {p1.name}
          </span>

          {/* P2 ── nombre */}
          <span style={nameStyle('right')}>
            {p2.tag && <span style={{ color: '#ffd700' }}>{p2.tag}|</span>}
            {p2.name}
          </span>

          {/* P2 ── score */}
          <span style={{ ...scoreStyle(p2Winning), right: '23.5%', transform: 'translateX(50%)' }}>
            {p2.score}
          </span>

          {/* P2 ── char icon */}
          <div style={{
            position: 'absolute', width: '5%', aspectRatio: '1',
            overflow: 'hidden', top: '46.8%', right: '15%',
          }}>
            <img src={p2CharImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

        </div>
      </div>
    </>
  );
}
