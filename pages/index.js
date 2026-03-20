import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Head from 'next/head';
import { verifySession, logout } from '../src/utils/auth';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [session, setSession]   = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    verifySession().then(data => {
      if (!data) { router.replace('/login'); return; }
      if (!data.isAdmin && !data.adminCommunities?.length) { router.replace('/login'); return; }
      setSession(data);
      setChecking(false);
    });
  }, []);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session?.user;
  const displayName = user?.name || user?.slug || 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();
  const isAdmin = session?.isAdmin;

  const communities = [
    {
      id: 'cordoba',
      name: 'Smash Córdoba',
      logo: '/images/SCC.webp',
      description: 'Panel de administración de Smash Córdoba',
      color: 'from-pink-900 via-purple-700 to-pink-800',
      borderColor: 'border-pink-400',
      hoverColor: 'hover:border-pink-300'
    },
    {
      id: 'afk-multi',
      name: 'Smash AFK',
      logo: '/images/AFK.webp',
      description: 'Panel de administración de Smash AFK (Buenos Aires)',
      color: 'from-sky-900 via-cyan-700 to-blue-800',
      borderColor: 'border-cyan-400',
      hoverColor: 'hover:border-cyan-300'
    },
    {
      id: 'mendoza',
      name: 'Smash Mendoza',
      logo: '/images/Team_Anexo/team_anexo_logo_nwe.png',
      description: 'Panel de administración de Smash Mendoza',
      color: 'from-gray-900 via-slate-700 to-gray-800',
      borderColor: 'border-gray-400',
      hoverColor: 'hover:border-gray-300'
    }
  ];

  // Filtrar según acceso: admin global ve todo, community admin ve solo las suyas
  const visibleCommunities = isAdmin
    ? communities
    : communities.filter(c => {
        const cId = c.id === 'afk-multi' ? 'afk' : c.id;
        return session?.adminCommunities?.includes(cId);
      });

  return (
    <>
      <Head>
        <title>la App sin H - Gestión de Torneos de Smash</title>
        <meta name="description" content="Panel de administración para comunidades de Smash Bros" />
        <style>{`
          @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
          .menu-item:hover { background: var(--hover-bg) !important; }
        `}</style>
      </Head>

      {/* Avatar / trigger menú — esquina superior derecha */}
      <div ref={menuRef} style={{ position: 'fixed', top: 16, right: 20, zIndex: 100 }}>
        <button
          onClick={() => setShowMenu(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {user?.avatar
            ? <img src={user.avatar} alt={displayName} style={{ width: 40, height: 40, borderRadius: '50%', border: showMenu ? '2px solid #FF8C00' : '2px solid rgba(232,142,0,0.45)', objectFit: 'cover', transition: 'border 0.15s', boxShadow: showMenu ? '0 0 14px rgba(232,142,0,0.6)' : 'none' }} />
            : <div style={{ width: 40, height: 40, borderRadius: '50%', background: showMenu ? 'linear-gradient(135deg,#FF8C00,#E85D00)' : 'linear-gradient(135deg,rgba(232,142,0,0.3),rgba(232,142,0,0.1))', border: `2px solid ${showMenu ? '#FF8C00' : 'rgba(232,142,0,0.45)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16, color: '#fff', transition: 'all 0.15s', boxShadow: showMenu ? '0 0 14px rgba(232,142,0,0.6)' : 'none' }}>
                {initial}
              </div>
          }
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600 }}>{displayName}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>▾</span>
        </button>

        {/* Dropdown */}
        {showMenu && (
          <div style={{
            position: 'absolute', top: 52, right: 0,
            background: 'rgba(14,14,22,0.97)',
            backdropFilter: 'blur(40px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 24, overflow: 'hidden',
            minWidth: 260,
            boxShadow: '0 24px 64px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)',
            animation: 'fadeUp 0.16s ease',
          }}>
            {/* Accent bar */}
            <div style={{ height: 3, background: 'linear-gradient(90deg,#FF8C00,#7C3AED,#FF8C00)' }} />

            {/* User info */}
            <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 13 }}>
              {user?.avatar
                ? <img src={user.avatar} alt={displayName} style={{ width: 50, height: 50, borderRadius: 18, objectFit: 'cover', border: '2px solid rgba(232,142,0,0.5)', boxShadow: '0 0 18px rgba(232,142,0,0.25)' }} />
                : <div style={{ width: 50, height: 50, borderRadius: 18, background: 'linear-gradient(135deg,#FF8C00,#E85D00)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff', boxShadow: '0 0 18px rgba(232,142,0,0.3)' }}>{initial}</div>
              }
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                {user?.slug && <p style={{ margin: '3px 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'sans-serif' }}>@{user.slug}</p>}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 99, padding: '2px 9px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 5px #22C55E' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', fontFamily: 'sans-serif' }}>En línea</span>
                </div>
              </div>
            </div>

            {/* Ir a Home */}
            <div style={{ padding: '8px 10px 4px' }}>
              <button
                onClick={() => { setShowMenu(false); router.push('/home'); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 16, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'sans-serif' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 38, height: 38, borderRadius: 13, background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🏠</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#22C55E' }}>Inicio</p>
                  <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(34,197,94,0.45)' }}>Rankings, torneos y perfil</p>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>›</span>
              </button>
            </div>

            {/* Panel de Admin */}
            {isAdmin && (
              <div style={{ padding: '4px 10px 0' }}>
                <button
                  onClick={() => setShowMenu(false)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 16, border: 'none', background: 'rgba(232,142,0,0.06)', cursor: 'default', textAlign: 'left', fontFamily: 'sans-serif' }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 13, background: 'rgba(232,142,0,0.14)', border: '1px solid rgba(232,142,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🎛️</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#FF8C00' }}>Panel de Admin</p>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(232,142,0,0.45)' }}>Estás aquí ahora</p>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#FF8C00', background: 'rgba(232,142,0,0.15)', border: '1px solid rgba(232,142,0,0.3)', borderRadius: 99, padding: '2px 8px' }}>Activo</span>
                </button>
              </div>
            )}

            {/* Cerrar sesión */}
            <div style={{ padding: '4px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={() => { logout(); setShowMenu(false); router.replace('/login'); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 16, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'sans-serif' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.09)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 38, height: 38, borderRadius: 13, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🚪</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#EF4444' }}>Cerrar sesión</p>
                  <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(239,68,68,0.45)' }}>Salir de la cuenta</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overlay para cerrar menú */}
      {showMenu && <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }} />}

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            🎮 la App sin H
          </h1>
          <p className="text-xl text-gray-300">
            Selecciona tu comunidad para acceder al panel de administración
          </p>
        </div>

        {/* Community Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {visibleCommunities.map((community) => (
            <Link 
              key={community.id} 
              href={`/admin/${community.id}`}
              className="group"
            >
              <div className={`
                bg-gradient-to-br ${community.color} 
                rounded-2xl p-8 
                border-4 ${community.borderColor} 
                ${community.hoverColor}
                shadow-2xl 
                transform transition-all duration-300 
                hover:scale-105 hover:shadow-3xl
                cursor-pointer
                h-full
              `}>
                {/* Logo/Icon */}
                <div className="mb-6 text-center transform group-hover:scale-110 transition-transform duration-300">
                  {community.logo ? (
                    <div className="flex justify-center">
                      <Image 
                        src={community.logo} 
                        alt={community.name}
                        width={120}
                        height={120}
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-7xl">
                      {community.emoji}
                    </div>
                  )}
                </div>

                {/* Community Name */}
                <h2 className="text-3xl font-bold text-white text-center mb-3">
                  {community.name}
                </h2>

                {/* Description */}
                <p className="text-gray-200 text-center mb-6">
                  {community.description}
                </p>

                {/* Button */}
                <div className="text-center">
                  <span className="inline-block bg-white bg-opacity-20 text-white px-6 py-3 rounded-lg font-semibold group-hover:bg-opacity-30 transition-all">
                    Acceder al Panel →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer Info */}
        <div className="text-center text-gray-400 text-sm mt-8">
          <p>Selecciona una comunidad para gestionar sesiones, jugadores y configuraciones</p>
          {isAdmin && (
            <div className="mt-4 flex justify-center gap-4 flex-wrap">
              <Link href="/admin/manage-admins" className="inline-flex items-center gap-2 bg-white bg-opacity-5 hover:bg-opacity-10 border border-white border-opacity-10 hover:border-opacity-20 text-gray-300 hover:text-white px-5 py-2 rounded-lg font-semibold transition-all text-sm">
                🛡️ Gestionar Admins de comunidad
              </Link>
              <Link href="/admin/test" className="inline-flex items-center gap-2 bg-white bg-opacity-5 hover:bg-opacity-10 border border-white border-opacity-10 hover:border-opacity-20 text-gray-300 hover:text-white px-5 py-2 rounded-lg font-semibold transition-all text-sm">
                🏆 Panel de Torneo
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
