import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const CLIENT_ID = process.env.NEXT_PUBLIC_START_GG_CLIENT_ID || '435';
const REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL
  ? process.env.NEXT_PUBLIC_BASE_URL + '/auth/callback'
  : 'https://smash-ban-stages.vercel.app/auth/callback';

export default function Login() {
  const router = useRouter();
  const { error, detail } = router.query;

  useEffect(() => {
    try {
      const stored = localStorage.getItem('afk_user');
      if (stored) {
        const data = JSON.parse(stored);
        if (data?.isAdmin) {
          router.replace('/admin/afk-multi');
        } else if (data?.user) {
          router.replace('/home');
        }
      }
    } catch {}
  }, []);

  function handleLogin() {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: 'user.identity',
    });
    window.location.href = 'https://start.gg/oauth/authorize?' + params.toString();
  }

  return (
    <>
      <Head>
        <title>AFK Smash — Iniciar sesión</title>
      </Head>
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          <div className="mb-8">
            <h1 className="text-5xl font-black text-white mb-2 tracking-tight">AFK Smash</h1>
            <p className="text-gray-400 text-sm tracking-widest uppercase">Comunidad competitiva</p>
          </div>

          {error === 'no_access' && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-6 text-red-300 text-sm">
              Tu cuenta de Start.gg no tiene permisos de administrador.
            </div>
          )}
          {error === 'auth_failed' && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-6 text-red-300 text-sm">
              Error al autenticar. Intentá de nuevo.
            </div>
          )}
          {error && error !== 'auth_failed' && error !== 'no_access' && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-6 text-red-300 text-xs text-left break-all">
              <div className="font-bold mb-1">Error de diagnóstico:</div>
              <div>{decodeURIComponent(error)}</div>
              {detail && <div className="mt-2 opacity-70">{decodeURIComponent(detail)}</div>}
            </div>
          )}

          <button
            onClick={handleLogin}
            className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold py-4 px-8 rounded-xl text-lg transition-colors"
          >
            Ingresar con Start.gg
          </button>

          <p className="text-gray-600 text-xs mt-6">
            Iniciá sesión con tu cuenta de Start.gg para acceder a la plataforma.
          </p>
        </div>
      </div>
    </>
  );
}
