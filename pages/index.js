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
  const [featuredTours, setFeaturedTours]         = useState([]);
  const [syncedTours, setSyncedTours]             = useState([]);
  const [hiddenSlugs, setHiddenSlugs]             = useState([]);
  const [featuredLoading, setFeaturedLoading]     = useState(false);
  const [featuredInput, setFeaturedInput]         = useState('');
  const [featuredAdding, setFeaturedAdding]       = useState(false);
  const [featuredOpen, setFeaturedOpen]           = useState(false);
  const [featuredPreview, setFeaturedPreview]     = useState(null);
  const [featuredPreviewLoading, setFeaturedPreviewLoading] = useState(false);

  useEffect(() => {
    verifySession().then(data => {
      if (!data) { router.replace('/login'); return; }
      const fromPanel = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('panel') === '1';
      const hasAccess = data.isAdmin || (data.adminCommunities && data.adminCommunities.length > 0);
      // Solo quedarse en / si viene desde el botón Panel (?panel=1), si no → /home
      if (hasAccess && fromPanel) {
        setSession(data);
        setChecking(false);
      } else {
        router.replace('/home');
      }
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

  // Cargar torneos destacados (modo admin: incluye ocultos) + auto-sincronizados
  useEffect(() => {
    setFeaturedLoading(true);
    Promise.all([
      fetch('/api/tournaments/featured?admin=1').then(r => r.json()),
      fetch('/api/tournaments/sync-startgg').then(r => r.json()).catch(() => ({ tournaments: [] })),
    ]).then(([fd, sd]) => {
      if (Array.isArray(fd.featured)) setFeaturedTours(fd.featured);
      if (Array.isArray(fd.hiddenSlugs)) setHiddenSlugs(fd.hiddenSlugs);
      if (Array.isArray(sd.tournaments)) {
        // Solo mostrar los que NO sean ya featured (dedup por slug)
        const featSlugs = new Set((fd.featured || []).map(t => t.slug));
        setSyncedTours(sd.tournaments.filter(t => !featSlugs.has(t.slug)));
      }
    }).catch(() => {})
    .finally(() => setFeaturedLoading(false));
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
    },
    {
      id: 'inc',
      name: 'INC',
      logo: '/images/inc.png',
      description: 'Panel de administración de INC',
      color: 'from-red-950 via-red-900 to-orange-950',
      borderColor: 'border-red-500',
      hoverColor: 'hover:border-orange-400'
    },
    {
      id: 'warui',
      name: 'Warui Team',
      logo: '/images/warui/logo.png',
      description: 'Panel de administración de Warui Team',
      color: 'from-violet-950 via-purple-900 to-violet-950',
      borderColor: 'border-violet-500',
      hoverColor: 'hover:border-violet-400'
    },
    {
      id: 'santafe',
      name: 'Smash Santa Fe',
      logo: '/images/Smash_Santa_Fe.png',
      description: 'Panel de administración de Smash Santa Fe',
      color: 'from-blue-950 via-blue-900 to-cyan-950',
      borderColor: 'border-cyan-600',
      hoverColor: 'hover:border-cyan-400'
    }
  ];

  // Filtrar según acceso: admin global ve todo, community admin ve solo las suyas
  const visibleCommunities = isAdmin
    ? communities
    : communities.filter(c => {
        const cId = c.id === 'afk-multi' ? 'afk' : c.id;
        return session?.adminCommunities?.includes(cId);
      });

  async function previewFeaturedFromIndex(url) {
    if (!url.trim()) return;
    setFeaturedPreviewLoading(true);
    setFeaturedPreview(null);
    try {
      const r = await fetch('/api/tournaments/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
        body: JSON.stringify({ url: url.trim(), notify: false }),
      });
      const d = await r.json();
      if (d.tournament) setFeaturedPreview(d.tournament);
      else setFeaturedPreview({ _error: d.error || 'No se encontró el torneo' });
    } catch {
      setFeaturedPreview({ _error: 'Error de conexión' });
    }
    setFeaturedPreviewLoading(false);
  }

  async function addFeaturedFromIndex() {
    if (!featuredInput.trim() || featuredAdding) return;
    if (!featuredPreview || featuredPreview._error) {
      await previewFeaturedFromIndex(featuredInput);
      return;
    }
    await confirmFeaturedFromIndex();
  }

  async function confirmFeaturedFromIndex() {
    if (!featuredInput.trim() || featuredAdding) return;
    setFeaturedAdding(true);
    try {
      const r = await fetch('/api/tournaments/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
        body: JSON.stringify({ url: featuredInput.trim(), notify: true }),
      });
      const d = await r.json();
      if (d.success && d.tournament) {
        setFeaturedTours(prev => [d.tournament, ...prev.filter(t => t.slug !== d.tournament.slug)]);
        setFeaturedInput('');
        setFeaturedPreview(null);
      } else {
        alert(d.error || 'Error al agregar torneo');
      }
    } catch { alert('Error de conexión'); }
    setFeaturedAdding(false);
  }

  async function removeFeaturedFromIndex(slug) {
    const r = await fetch(`/api/tournaments/featured?slug=${encodeURIComponent(slug)}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer afk-admin-2025' },
    }).catch(() => null);
    if (r?.ok) setFeaturedTours(prev => prev.filter(t => t.slug !== slug));
  }

  async function toggleHidden(slug, currentlyHidden) {
    const action = currentlyHidden ? 'unhide' : 'hide';
    const r = await fetch('/api/tournaments/featured', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
      body: JSON.stringify({ slug, action }),
    }).catch(() => null);
    if (!r?.ok) return;
    const d = await r.json();
    if (Array.isArray(d.hiddenSlugs)) {
      setHiddenSlugs(d.hiddenSlugs);
      // Actualizar marca _hidden en featured
      setFeaturedTours(prev => prev.map(t => ({ ...t, _hidden: d.hiddenSlugs.includes(t.slug) })));
    }
  }

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
            </div>
          )}
        </div>

        {/* ── TORNEOS EN LA APP ── */}
        {(() => {
          const totalCount = featuredTours.length + syncedTours.length;
          return (
          <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', maxWidth: 640, margin: '32px auto 0' }}>
            <button
              onClick={() => setFeaturedOpen(p => !p)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <span style={{ fontWeight: 900, fontSize: 15, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                📌 Torneos en la app
                {totalCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,140,0,0.2)', color: '#FF8C00', padding: '2px 8px', borderRadius: 6 }}>{totalCount}</span>}
                {hiddenSlugs.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(100,100,100,0.2)', color: 'rgba(255,255,255,0.35)', padding: '2px 7px', borderRadius: 6 }}>{hiddenSlugs.length} oculto{hiddenSlugs.length !== 1 ? 's' : ''}</span>}
              </span>
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.35)' }}>{featuredOpen ? '▾' : '▸'}</span>
            </button>

            {featuredOpen && (
              <div style={{ padding: '0 22px 22px' }}>
                <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  Agregá torneos manualmente o gestioná los que se sincronizan automáticamente. Podés ocultarlos para que no aparezcan en la app sin eliminarlos.
                </p>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    value={featuredInput}
                    onChange={e => { setFeaturedInput(e.target.value); setFeaturedPreview(null); }}
                    onKeyDown={e => { if (e.key === 'Enter' && featuredInput.trim()) addFeaturedFromIndex(); }}
                    placeholder="star.gg/tournament/mi-torneo"
                    style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  />
                  <button
                    onClick={addFeaturedFromIndex}
                    disabled={featuredAdding || !featuredInput.trim()}
                    style={{ background: '#FF8C00', border: 'none', borderRadius: 12, padding: '10px 18px', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', flexShrink: 0, opacity: featuredAdding || !featuredInput.trim() ? 0.5 : 1 }}
                  >
                    {featuredAdding ? '...' : '+ Agregar'}
                  </button>
                </div>

                {featuredPreviewLoading && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', padding: '8px 0' }}>Buscando torneo...</div>
                )}
                {featuredPreview && !featuredPreview._error && !featuredAdding && (
                  <div style={{ background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.3)', borderRadius: 12, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    {featuredPreview.image && <img src={featuredPreview.image} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />}
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#fff' }}>{featuredPreview.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                        {featuredPreview.registrationOpen ? '✅ Inscripciones abiertas' : featuredPreview.stateLabel}
                        {featuredPreview.attendees > 0 ? ` · 👥 ${featuredPreview.attendees}` : ''}
                      </p>
                    </div>
                    <button onClick={confirmFeaturedFromIndex} style={{ background: '#FF8C00', border: 'none', borderRadius: 9, padding: '7px 14px', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✔️ Agregar y notificar</button>
                  </div>
                )}
                {featuredPreview?._error && (
                  <div style={{ fontSize: 12, color: '#f87171', padding: '6px 0', marginBottom: 10 }}>⚠️ {featuredPreview._error}</div>
                )}

                {featuredLoading ? (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '12px 0' }}>Cargando...</p>
                ) : totalCount === 0 ? (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '12px 0' }}>No hay torneos todavía.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Torneos manuales (featured) */}
                    {featuredTours.map(t => {
                      const isHidden = t._hidden || hiddenSlugs.includes(t.slug);
                      return (
                        <div key={t.slug} style={{ display: 'flex', alignItems: 'center', gap: 10, background: isHidden ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isHidden ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 13, padding: '11px 13px', opacity: isHidden ? 0.55 : 1 }}>
                          {t.image && <img src={t.image} alt="" style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', background: 'rgba(255,140,0,0.15)', color: '#FF8C00', borderRadius: 4, flexShrink: 0 }}>Manual</span>
                              {isHidden && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', background: 'rgba(100,100,100,0.2)', color: 'rgba(255,255,255,0.4)', borderRadius: 4, flexShrink: 0 }}>Oculto</span>}
                            </div>
                            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                              {t.startAt ? new Date(t.startAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha'}
                              {t.attendees > 0 ? ` · 👥 ${t.attendees}` : ''}
                              {t.registrationOpen ? ' · ✅ Inscripciones abiertas' : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleHidden(t.slug, isHidden)}
                            title={isHidden ? 'Mostrar en la app' : 'Ocultar de la app'}
                            style={{ background: isHidden ? 'rgba(34,197,94,0.1)' : 'rgba(100,100,100,0.1)', border: `1px solid ${isHidden ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '5px 9px', color: isHidden ? '#4ade80' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}
                          >{isHidden ? '👁' : '🙈'}</button>
                          <button
                            onClick={() => removeFeaturedFromIndex(t.slug)}
                            title="Eliminar"
                            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '5px 10px', color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
                          >✕</button>
                        </div>
                      );
                    })}
                    {/* Torneos auto-sincronizados */}
                    {syncedTours.map(t => {
                      const isHidden = hiddenSlugs.includes(t.slug);
                      return (
                        <div key={t.slug} style={{ display: 'flex', alignItems: 'center', gap: 10, background: isHidden ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isHidden ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 13, padding: '11px 13px', opacity: isHidden ? 0.55 : 1 }}>
                          {t.image && <img src={t.image} alt="" style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', background: 'rgba(99,102,241,0.15)', color: '#818CF8', borderRadius: 4, flexShrink: 0 }}>Auto</span>
                              {isHidden && <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', background: 'rgba(100,100,100,0.2)', color: 'rgba(255,255,255,0.4)', borderRadius: 4, flexShrink: 0 }}>Oculto</span>}
                            </div>
                            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                              {t.startAt ? new Date(t.startAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha'}
                              {t.attendees > 0 ? ` · 👥 ${t.attendees}` : ''}
                              {t.registrationOpen ? ' · ✅ Inscripciones abiertas' : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleHidden(t.slug, isHidden)}
                            title={isHidden ? 'Mostrar en la app' : 'Ocultar de la app'}
                            style={{ background: isHidden ? 'rgba(34,197,94,0.1)' : 'rgba(100,100,100,0.1)', border: `1px solid ${isHidden ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '5px 9px', color: isHidden ? '#4ade80' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}
                          >{isHidden ? '👁' : '🙈'}</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })()}
      </div>
    </div>
    </>
  );
}
