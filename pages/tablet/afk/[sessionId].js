import { useRouter } from 'next/router';
import TabletControlAfk from '../../../src/components/TabletControlAfk';

export default function TabletAfk() {
  const router = useRouter();
  const { sessionId, p, mt } = router.query;

  // Identidad vía query param ?p=player1|player2 (acceso público, sin login requerido)
  const playerIndex = p === 'player1' || p === 'player2' ? p : null;

  return <TabletControlAfk sessionId={sessionId} playerIndex={playerIndex} matchToken={mt || null} />;
}
