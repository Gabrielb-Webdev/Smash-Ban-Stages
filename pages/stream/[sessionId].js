import { useRouter } from 'next/router';
import StreamOverlay from '../../src/components/StreamOverlay';
import StreamOverlayAfk from '../../src/components/StreamOverlayAfk';
import StreamOverlayCordoba from '../../src/components/StreamOverlayCordoba';
import StreamOverlayMendoza from '../../src/components/StreamOverlayMendoza';
import StreamOverlayInc from '../../src/components/StreamOverlayInc';
import StreamOverlaySantaFe from '../../src/components/StreamOverlaySantaFe';
import StreamOverlayWarui from '../../src/components/StreamOverlayWarui';

export default function Stream() {
  const router = useRouter();
  const { sessionId } = router.query;

  const s = (sessionId || '').toLowerCase();
  // Remapear comunidad → setup stream real (warui → warui-stream, inc → inc-stream)
  const resolvedId = s === 'warui' ? 'warui-stream' : s === 'inc' ? 'inc-stream' : s === 'santafe' ? 'santafe-stream' : sessionId;
  if (s === 'afk' || s.startsWith('afk-'))        return <StreamOverlayAfk     sessionId={resolvedId} />;
  if (s === 'cordoba' || s.startsWith('cordoba-')) return <StreamOverlayCordoba  sessionId={resolvedId} />;
  if (s === 'mendoza' || s.startsWith('mendoza-')) return <StreamOverlayMendoza  sessionId={resolvedId} />;
  if (s === 'inc' || s.startsWith('inc-'))              return <StreamOverlayInc      sessionId={resolvedId} />;
  if (s === 'santafe' || s.startsWith('santafe-'))   return <StreamOverlaySantaFe  sessionId={resolvedId} />;
  if (s === 'warui' || s.startsWith('warui-'))       return <StreamOverlay          sessionId={resolvedId} />;
  return <StreamOverlay sessionId={resolvedId} />;
}