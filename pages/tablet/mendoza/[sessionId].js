import { useState } from 'react';
import { useRouter } from 'next/router';
import TabletControlMendoza from '../../../src/components/TabletControlMendoza';

export default function TabletMendoza() {
  const router = useRouter();
  const { sessionId } = router.query;
  const [playerName] = useState(() => {
    if (typeof window === 'undefined') return null;
    try { const u = localStorage.getItem('afk_user'); return u ? JSON.parse(u).name || null : null; } catch { return null; }
  });

  return <TabletControlMendoza sessionId={sessionId} playerName={playerName} />;
}
