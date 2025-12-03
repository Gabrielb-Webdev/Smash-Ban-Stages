import { useRouter } from 'next/router';
import StreamOverlay from '../../src/components/StreamOverlay';

export default function Stream() {
  const router = useRouter();
  const { sessionId } = router.query;

  return <StreamOverlay sessionId={sessionId} />;
}
