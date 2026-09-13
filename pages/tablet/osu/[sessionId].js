import { useRouter } from 'next/router';
import TabletControlOsu from '../../../src/components/TabletControlOsu';

export default function TabletOsu() {
  const router = useRouter();
  const { sessionId, p, mt } = router.query;

  // Identidad vía query param ?p=player1|player2 (acceso público, sin login requerido)
  const playerIndex = p === 'player1' || p === 'player2' ? p : null;

  return <TabletControlOsu sessionId={sessionId} playerIndex={playerIndex} matchToken={mt || null} />;
}
