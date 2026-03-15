import { useRouter } from 'next/router';
import TabletControlMendoza from '../../../src/components/TabletControlMendoza';

export default function TabletMendoza() {
  const router = useRouter();
  const { sessionId } = router.query;

  return <TabletControlMendoza sessionId={sessionId} />;
}
