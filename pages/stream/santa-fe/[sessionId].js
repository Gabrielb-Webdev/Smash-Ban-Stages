import { useRouter } from 'next/router';
import StreamOverlaySantaFe from '../../../src/components/StreamOverlaySantaFe';

export default function StreamSantaFe() {
  const router = useRouter();
  const { sessionId } = router.query;

  return <StreamOverlaySantaFe sessionId={sessionId} />;
}
