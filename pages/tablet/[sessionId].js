import { useRouter } from 'next/router';
import TabletControl from '../../src/components/TabletControl';
import TabletControlAfk from '../../src/components/TabletControlAfk';
import TabletControlCordoba from '../../src/components/TabletControlCordoba';
import TabletControlMendoza from '../../src/components/TabletControlMendoza';

export default function Tablet() {
  const router = useRouter();
  const { sessionId } = router.query;

  const s = (sessionId || '').toLowerCase();
  if (s === 'afk' || s.startsWith('afk-'))       return <TabletControlAfk     sessionId={sessionId} />;
  if (s === 'cordoba' || s.startsWith('cordoba-')) return <TabletControlCordoba  sessionId={sessionId} />;
  if (s === 'mendoza' || s.startsWith('mendoza-')) return <TabletControlMendoza  sessionId={sessionId} />;
  return <TabletControl sessionId={sessionId} />;
}
