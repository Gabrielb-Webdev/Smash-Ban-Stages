import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL
  ? process.env.NEXT_PUBLIC_BASE_URL + '/auth/callback'
  : 'https://smash-ban-stages.vercel.app/auth/callback';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Autenticando...');

  useEffect(() => {
    if (!router.isReady) return;

    const { code, error } = router.query;

    if (error) {
      router.replace('/login?error=auth_failed');
      return;
    }

    if (!code) {
      router.replace('/login?error=auth_failed');
      return;
    }

    setStatus('Verificando cuenta...');

    fetch('/api/auth/startgg/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri: REDIRECT_URI }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          const detail = data.detail ? encodeURIComponent(data.detail) : '';
          router.replace('/login?error=' + encodeURIComponent(data.error) + (detail ? '&detail=' + detail : ''));
          return;
        }

        // Guardar sesión para TODOS los usuarios (admin y no-admin)
        localStorage.setItem('afk_user', JSON.stringify(data));

        if (data.isAdmin) {
          window.location.href = 'https://smash-ban-stages.vercel.app';
          return;
        } else {
          router.replace('/home');
        }
      })
      .catch((e) => {
        router.replace('/login?error=' + encodeURIComponent(e.message || 'auth_failed'));
      });
  }, [router.isReady, router.query]);

  return (
    <>
      <Head>
        <title>AFK Smash — Autenticando</title>
      </Head>
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{status}</p>
        </div>
      </div>
    </>
  );
}
