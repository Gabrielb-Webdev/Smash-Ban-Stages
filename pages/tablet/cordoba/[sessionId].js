import { useState } from 'react';
import { useRouter } from 'next/router';
import TabletControlCordoba from '../../../src/components/TabletControlCordoba';

export default function TabletCordoba() {
  const router = useRouter();
  const { sessionId } = router.query;
  const [playerName] = useState(() => {
    if (typeof window === 'undefined') return null;
    try { const u = localStorage.getItem('afk_user'); return u ? JSON.parse(u).name || null : null; } catch { return null; }
  });

  return <TabletControlCordoba sessionId={sessionId} playerName={playerName} />;
}
