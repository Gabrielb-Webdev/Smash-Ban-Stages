import { useRouter } from 'next/router';
import StreamOverlay from '../../src/components/StreamOverlay';
import StreamOverlayAfk from '../../src/components/StreamOverlayAfk';
import StreamOverlayCordoba from '../../src/components/StreamOverlayCordoba';
import StreamOverlayMendoza from '../../src/components/StreamOverlayMendoza';
import StreamOverlayInc from '../../src/components/StreamOverlayInc';

export default function Stream() {
  const router = useRouter();
  const { sessionId } = router.query;

  const s = (sessionId || '').toLowerCase();
  if (s === 'afk' || s.startsWith('afk-'))        return <StreamOverlayAfk     sessionId={sessionId} />;
  if (s === 'cordoba' || s.startsWith('cordoba-')) return <StreamOverlayCordoba  sessionId={sessionId} />;
  if (s === 'mendoza' || s.startsWith('mendoza-')) return <StreamOverlayMendoza  sessionId={sessionId} />;
  if (s === 'inc' || s.startsWith('inc-'))         return <StreamOverlayInc      sessionId={sessionId} />;
  return <StreamOverlay sessionId={sessionId} />;
}

