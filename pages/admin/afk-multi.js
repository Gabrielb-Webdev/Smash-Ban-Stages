import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AfkMultiSetupManager from '../../src/components/AfkMultiSetupManager';
import { getStoredUser, logout } from '../../src/utils/auth';

export default function AfkMultiPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored || !stored.isAdmin) {
      router.replace('/home');
      return;
    }
    setUser(stored.user);
    setChecking(false);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
      <div className="fixed top-0 right-0 z-50 p-3" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="flex items-center gap-2 bg-gray-900/80 backdrop-blur rounded-xl border border-gray-700 px-3 py-2 hover:bg-gray-800 transition-colors"
        >
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full" />
            : <div className="w-7 h-7 rounded-full bg-gray-700" />}
          <span className="text-gray-300 text-sm hidden sm:block">{user?.name}</span>
          <svg className="w-3 h-3 text-gray-400 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute right-3 top-full mt-1 w-44 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
            <Link
              href="/"
              className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors border-b border-gray-700/50"
              onClick={() => setDropdownOpen(false)}
            >
              🎮 Panel Admin
            </Link>
            <Link
              href="/home"
              className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors border-b border-gray-700/50"
              onClick={() => setDropdownOpen(false)}
            >
              🏠 Home
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-gray-800 transition-colors text-left"
            >
              🚪 Salir
            </button>
          </div>
        )}
      </div>
      <AfkMultiSetupManager />
    </div>
  );
}
