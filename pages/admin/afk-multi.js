import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AfkMultiSetupManager from '../../src/components/AfkMultiSetupManager';
import { getStoredUser, logout } from '../../src/utils/auth';

export default function AfkMultiPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || !stored.isAdmin) {
      router.replace('/login');
      return;
    }
    setUser(stored.user);
    setChecking(false);
  }, []);

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="fixed top-0 right-0 z-50 flex items-center gap-3 p-3 bg-gray-900/80 backdrop-blur rounded-bl-xl border-l border-b border-gray-700">
        {user?.avatar && (
          <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full" />
        )}
        <span className="text-gray-300 text-sm hidden sm:block">{user?.name}</span>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-lg transition-colors"
        >
          Salir
        </button>
      </div>
      <AfkMultiSetupManager />
    </div>
  );
}
