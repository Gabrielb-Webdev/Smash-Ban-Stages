import { useRouter } from 'next/router';
import TabletControl from '../../src/components/TabletControl';

export default function Tablet() {
  const router = useRouter();
  const { sessionId } = router.query;

  return <TabletControl sessionId={sessionId} />;
}
