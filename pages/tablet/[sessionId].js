import { useRouter } from 'next/router';
import { useState } from 'react';
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
    try { const u = localStorage.getItem('afk_user'); return u ? JSON.parse(u).name || null : null; } catch { return null; }
  });

  const s = (sessionId || '').toLowerCase();
  const props = { sessionId, playerName };
  if (s === 'afk' || s.startsWith('afk-'))        return <TabletControlAfk     {...props} />;
  if (s === 'cordoba' || s.startsWith('cordoba-')) return <TabletControlCordoba  {...props} />;
  if (s === 'mendoza' || s.startsWith('mendoza-')) return <TabletControlMendoza  {...props} />;
  return <TabletControl {...props} />;
}
