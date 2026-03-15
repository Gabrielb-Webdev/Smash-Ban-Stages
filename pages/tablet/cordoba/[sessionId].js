import { useRouter } from 'next/router';
import TabletControlCordoba from '../../../src/components/TabletControlCordoba';

export default function TabletCordoba() {
  const router = useRouter();
  const { sessionId } = router.query;

  return <TabletControlCordoba sessionId={sessionId} />;
}
