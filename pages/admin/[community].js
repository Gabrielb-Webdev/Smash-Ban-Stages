import { useRouter } from 'next/router';
import { useEffect } from 'react';
import AdminPanel from '../../src/components/AdminPanel';
import Link from 'next/link';

export default function CommunityAdmin() {
  const router = useRouter();
  const { community } = router.query;

  const validCommunities = ['cordoba', 'afk', 'mendoza'];

  // Redirigir rutas especiales que tienen su propia página
  useEffect(() => {
    if (community === 'afk-multi') {
      router.replace('/admin/afk-multi');
    }
  }, [community]);

  // Loading mientras el router resuelve
  if (!community) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  // Redirigiendo afk-multi
  if (community === 'afk-multi') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Redirigiendo...</div>
      </div>
    );
  }

  // Comunidad no válida
  if (!validCommunities.includes(community)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">❌ Comunidad no encontrada</h1>
          <p className="text-xl text-gray-300 mb-8">
            La comunidad "{community}" no existe.
          </p>
          <Link href="/">
            <span className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-all cursor-pointer">
              ← Volver a la lista de comunidades
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return <AdminPanel defaultCommunity={community} />;
}
