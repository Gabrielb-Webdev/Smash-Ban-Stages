import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import TabletControl from '../../src/components/TabletControl';
import TabletControlAfk from '../../src/components/TabletControlAfk';
import TabletControlCordoba from '../../src/components/TabletControlCordoba';
import TabletControlMendoza from '../../src/components/TabletControlMendoza';
import TabletControlInc from '../../src/components/TabletControlInc';
import TabletControlSantaFe from '../../src/components/TabletControlSantaFe';

export default function Tablet() {
  const router = useRouter();
  const { sessionId } = router.query;

  // Leer el nombre del jugador logueado en este dispositivo (del localStorage)
  const [playerName] = useState(() => {
    if (typeof window === 'undefined') return null;
    try { const u = localStorage.getItem('afk_user'); if (!u) return null; const d = JSON.parse(u); return d.user?.name || d.name || null; } catch { return null; }
  });

  // ?p=player1 o ?p=player2 en la URL identifica al jugador directamente (sin necesitar login)
  // ?mt=TOKEN identifica el match específico (evita que jugadores de matches anteriores hagan check-in)
  // Se lee con useEffect para evitar problemas de hidratación en Next.js (router.query está vacío
  // en el primer render en páginas dinámicas)
  const [playerIndex, setPlayerIndex] = useState(null);
  const [matchToken, setMatchToken] = useState(null);
  useEffect(() => {
    if (!router.isReady) return;
    const p = router.query.p;
    if (p === 'player1' || p === 'player2') setPlayerIndex(p);
    if (router.query.mt) setMatchToken(router.query.mt);
  }, [router.isReady, router.query.p, router.query.mt]);

  // No renderizar hasta que el router esté listo para evitar flash de estilos incorrectos
  if (!router.isReady || !sessionId) return null;

  const s = (sessionId || '').toLowerCase();
  const props = { sessionId, playerName, playerIndex, matchToken };
  if (s === 'afk' || s.startsWith('afk-'))        return <TabletControlAfk     {...props} />;
  if (s === 'cordoba' || s.startsWith('cordoba-')) return <TabletControlCordoba  {...props} />;
  if (s === 'mendoza' || s.startsWith('mendoza-')) return <TabletControlMendoza  {...props} />;
  if (s === 'inc' || s.startsWith('inc-'))              return <TabletControlInc      {...props} />;
  if (s === 'santafe' || s.startsWith('santafe-'))   return <TabletControlSantaFe  {...props} />;
  return <TabletControl {...props} />;
}
