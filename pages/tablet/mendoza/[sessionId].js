import { useState } from 'react';
import { useRouter } from 'next/router';
import TabletControlMendoza from '../../../src/components/TabletControlMendoza';

export default function TabletMendoza() {
  const router = useRouter();
  const { sessionId } = router.query;
  const [playerName] = useState(() => {
    if (typeof window === 'undefined') return null;
    try { const u = localStorage.getItem('afk_user'); if (!u) return null; const d = JSON.parse(u); return d.user?.name || d.name || null; } catch { return null; }
  });

  return <TabletControlMendoza sessionId={sessionId} playerName={playerName} />;
}
