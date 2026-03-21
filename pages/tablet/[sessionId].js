import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import TabletControl from '../../src/components/TabletControl';
import TabletControlAfk from '../../src/components/TabletControlAfk';
import TabletControlCordoba from '../../src/components/TabletControlCordoba';
import TabletControlMendoza from '../../src/components/TabletControlMendoza';

export default function Tablet() {
  const router = useRouter();
  const { sessionId } = router.query;

  // Leer el nombre del jugador logueado en este dispositivo (del localStorage)
  const [playerName] = useState(() => {
    if (typeof window === 'undefined') return null;
    try { const u = localStorage.getItem('afk_user'); if (!u) return null; const d = JSON.parse(u); return d.user?.name || d.name || null; } catch { return null; }
  });

  // ?p=player1 o ?p=player2 en la URL identifica al jugador directamente (sin necesitar login)
  // Se lee con useEffect para evitar problemas de hidratación en Next.js (router.query está vacío
  // en el primer render en páginas dinámicas)
  const [playerIndex, setPlayerIndex] = useState(null);
  useEffect(() => {
    if (!router.isReady) return;
    const p = router.query.p;
    if (p === 'player1' || p === 'player2') setPlayerIndex(p);
  }, [router.isReady, router.query.p]);

  const s = (sessionId || '').toLowerCase();
  const props = { sessionId, playerName, playerIndex };
  if (s === 'afk' || s.startsWith('afk-'))        return <TabletControlAfk     {...props} />;
  if (s === 'cordoba' || s.startsWith('cordoba-')) return <TabletControlCordoba  {...props} />;
  if (s === 'mendoza' || s.startsWith('mendoza-')) return <TabletControlMendoza  {...props} />;
  return <TabletControl {...props} />;
}
