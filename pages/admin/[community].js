import { useRouter } from 'next/router';
import AdminPanel from '../../src/components/AdminPanel';

export default function CommunityAdminPage() {
  const router = useRouter();
  const { community } = router.query;

  // Wait for router to be ready
  if (!router.isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple flex items-center justify-center">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  // Validate community
  const validCommunities = ['cordoba', 'mendoza', 'afk'];
  if (!validCommunities.includes(community)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-4xl font-bold mb-4">❌ Comunidad no encontrada</h1>
          <p className="text-white/70 mb-6">La comunidad "{community}" no existe.</p>
          <a href="/" className="px-6 py-3 bg-smash-blue text-white font-bold rounded-lg hover:bg-smash-blue/80 transition-all inline-block">
            ← Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return <AdminPanel initialCommunity={community} />;
}
