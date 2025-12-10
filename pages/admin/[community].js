import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdminPanel from '../../src/components/AdminPanel';
import Link from 'next/link';

export default function CommunityAdmin() {
  const router = useRouter();
  const { community } = router.query;
  const [isValidCommunity, setIsValidCommunity] = useState(true);

  const validCommunities = ['cordoba', 'afk', 'mendoza'];

  useEffect(() => {
    if (community && !validCommunities.includes(community)) {
      setIsValidCommunity(false);
    } else if (community) {
      setIsValidCommunity(true);
    }
  }, [community]);

  // Mostrar loading mientras se carga el router
  if (!community) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  // Mostrar error si la comunidad no es válida
  if (!isValidCommunity) {
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

  // Renderizar el panel de administración con la comunidad seleccionada
  return <AdminPanel defaultCommunity={community} />;
}
