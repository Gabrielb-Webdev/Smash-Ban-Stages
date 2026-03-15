import { useRouter } from 'next/router';
import StreamOverlayCordoba from '../../../src/components/StreamOverlayCordoba';

export default function StreamCordoba() {
  const router = useRouter();
  const { sessionId } = router.query;

  return <StreamOverlayCordoba sessionId={sessionId} />;
}
