import { useRouter } from 'next/router';
import StreamOverlayMendoza from '../../../src/components/StreamOverlayMendoza';

export default function StreamMendoza() {
  const router = useRouter();
  const { sessionId } = router.query;

  return <StreamOverlayMendoza sessionId={sessionId} />;
}
