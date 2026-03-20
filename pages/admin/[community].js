import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdminPanel from '../../src/components/AdminPanel';
import Link from 'next/link';
import { getStoredUser, logout, verifySession } from '../../src/utils/auth';

export default function CommunityAdmin() {
  const router = useRouter();
  const { community } = router.query;
  const [authUser, setAuthUser] = useState(null);
  const [checking, setChecking] = useState(true);

  const validCommunities = ['cordoba', 'afk', 'mendoza'];

  // Auth guard — isAdmin se verifica en el servidor, no en localStorage
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.access_token) { router.replace('/login'); return; }

    verifySession().then(data => {
      if (!data) { router.replace('/login'); return; }
      if (!data.isAdmin) { router.replace('/home'); return; }
      setAuthUser(data.user);
      setChecking(false);
    });
  }, []);

  // Redirigir rutas especiales que tienen su propia página
  useEffect(() => {
    if (community === 'afk-multi') {
      router.replace('/admin/afk-multi');
    }
  }, [community]);

  // Loading mientras el router resuelve o chequea auth
  if (checking || !community) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
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
