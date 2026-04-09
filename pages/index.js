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
  const [showPanel, setShowPanel] = useState(false);
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
  const [markCompleting, setMarkCompleting]       = useState({});

  useEffect(() => {
    verifySession().then(data => {
      if (!data) {
        // Sin sesión → mostrar landing page
        setChecking(false);
        return;
      }
      const fromPanel = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('panel') === '1';
      const hasAccess = data.isAdmin || (data.adminCommunities && data.adminCommunities.length > 0);
      if (hasAccess && fromPanel) {
        setSession(data);
        setShowPanel(true);
        setChecking(false);
      } else {
        router.replace('/home');
      }
    });
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!showPanel) return;
    setFeaturedLoading(true);
    Promise.all([
      fetch('/api/tournaments/featured?admin=1').then(r => r.json()),
      fetch('/api/tournaments/sync-startgg').then(r => r.json()).catch(() => ({ tournaments: [] })),
    ]).then(([fd, sd]) => {
      if (Array.isArray(fd.featured)) setFeaturedTours(fd.featured);
      if (Array.isArray(fd.hiddenSlugs)) setHiddenSlugs(fd.hiddenSlugs);
      if (Array.isArray(sd.tournaments)) {
        const featSlugs = new Set((fd.featured || []).map(t => t.slug));
        setSyncedTours(sd.tournaments.filter(t => !featSlugs.has(t.slug)));
      }
    }).catch(() => {})
    .finally(() => setFeaturedLoading(false));
  }, [showPanel]);

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#090910', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #E88E00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── LANDING PAGE (sin sesión) ──────────────────────────────────────────────
  if (!session) {
    const features = [
      { icon: '⚔️', title: 'Matchmaking Ranked', desc: 'Encontrá rivales de tu nivel en segundos. Sistema ELO con Switch y Parsec.' },
      { icon: '🏆', title: 'Rankings', desc: 'Escalá posiciones en el ranking competitivo de tu región y comunidad.' },
      { icon: '📅', title: 'Torneos', desc: 'Participá en torneos organizados por las comunidades. Integración con Start.gg.' },
      { icon: '👥', title: 'Comunidades', desc: 'AFK, Córdoba, Santa Fe, Mendoza, INC, Warui. Una sola app para todas.' },
    ];
    const comms = [
      { name: 'Smash AFK',      logo: '/images/AFK.webp' },
      { name: 'Smash Córdoba',  logo: '/images/SCC.webp' },
      { name: 'Smash Santa Fe', logo: '/images/Smash_Santa_Fe.png' },
      { name: 'INC',            logo: '/images/inc.png' },
      { name: 'Smash Mendoza',  logo: '/images/Team_Anexo/team_anexo_logo_nwe.png' },
      { name: 'Warui Team',     logo: '/images/warui/logo.png' },
    ];
    return (
      <>
        <Head>
          <title>La app sin H — Smash Bros Competitivo Argentina</title>
          <meta name="description" content="Matchmaking ranked, rankings, torneos y comunidades de Super Smash Bros Ultimate en Argentina." />
          <style>{`
            @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
            @keyframes spin { to { transform:rotate(360deg) } }
            .lp-feature-card:hover { transform: translateY(-4px); background: rgba(255,255,255,0.05) !important; }
            .lp-comm-card:hover { transform: scale(1.05); border-color: rgba(232,142,0,0.4) !important; }
            .lp-btn-primary:hover { background: #e07a00 !important; transform: scale(1.03); }
            .lp-btn-secondary:hover { background: rgba(255,255,255,0.08) !important; }
          `}</style>
        </Head>
        <div style={{ minHeight: '100vh', background: '#090910', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
          {/* ── NAVBAR ── */}
          <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(9,9,16,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(20px,5vw,80px)', height: 64 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/images/logo.app.png" alt="Logo" style={{ width: 36, height: 28, objectFit: 'contain' }} />
              <span style={{ fontWeight: 900, fontSize: 18, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.03em' }}>la app <span style={{ fontWeight: 300, color: 'rgba(232,142,0,0.8)' }}>sin H</span></span>
            </div>
            <Link href="/login">
              <button className="lp-btn-primary" style={{ background: '#FF8C00', border: 'none', borderRadius: 12, padding: '10px 24px', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', transition: 'background 0.15s, transform 0.15s' }}>
                Iniciar sesión
              </button>
            </Link>
          </nav>
          {/* ── HERO ── */}
          <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(60px,10vh,120px) clamp(20px,5vw,80px)', textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(232,142,0,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto', animation: 'fadeUp 0.6s ease both' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,142,0,0.1)', border: '1px solid rgba(232,142,0,0.25)', borderRadius: 99, padding: '6px 16px', marginBottom: 28, fontSize: 13, fontWeight: 700, color: '#FF8C00' }}>
                ⚡ Matchmaking competitivo de Smash Bros Ultimate
              </div>
              <h1 style={{ margin: '0 0 20px', fontSize: 'clamp(36px,6vw,72px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                La plataforma de{' '}
                <span style={{ background: 'linear-gradient(90deg,#FF8C00,#E85D00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Smash Bros</span>
                {' '}competitivo
              </h1>
              <p style={{ margin: '0 auto 40px', fontSize: 'clamp(16px,2.5vw,20px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 560 }}>
                Matchmaking ranked, rankings por región, torneos y comunidades de toda Argentina en una sola app.
              </p>
              <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/login">
                  <button className="lp-btn-primary" style={{ background: '#FF8C00', border: 'none', borderRadius: 14, padding: '16px 36px', color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer', transition: 'background 0.15s, transform 0.15s', boxShadow: '0 8px 32px rgba(232,142,0,0.35)' }}>
                    Unirse ahora →
                  </button>
                </Link>
                <a href="#comunidades" style={{ textDecoration: 'none' }}>
                  <button className="lp-btn-secondary" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '16px 32px', color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 16, cursor: 'pointer', transition: 'background 0.15s' }}>
                    Ver comunidades
                  </button>
                </a>
              </div>
            </div>
            <div style={{ marginTop: 64, display: 'flex', justifyContent: 'center' }}>
              <img src="/images/logo.png" alt="" style={{ width: 'min(260px,55vw)', opacity: 0.1 }} />
            </div>
          </section>
          {/* ── FEATURES ── */}
          <section style={{ padding: 'clamp(60px,8vh,100px) clamp(20px,5vw,80px)' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <h2 style={{ textAlign: 'center', margin: '0 0 12px', fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900 }}>Todo en un solo lugar</h2>
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', margin: '0 0 48px', fontSize: 16 }}>Diseñado para la escena competitiva argentina</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                {features.map(f => (
                  <div key={f.title} className="lp-feature-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: '28px 24px', transition: 'transform 0.2s, background 0.2s' }}>
                    <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
                    <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800 }}>{f.title}</h3>
                    <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
          {/* ── COMUNIDADES ── */}
          <section id="comunidades" style={{ padding: 'clamp(60px,8vh,100px) clamp(20px,5vw,80px)', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>
              <h2 style={{ textAlign: 'center', margin: '0 0 12px', fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900 }}>Nuestras comunidades</h2>
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', margin: '0 0 48px', fontSize: 16 }}>Una sola plataforma. Múltiples comunidades.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                {comms.map(c => (
                  <div key={c.name} className="lp-comm-card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '28px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, transition: 'transform 0.2s, border-color 0.2s' }}>
                    <img src={c.logo} alt={c.name} style={{ width: 72, height: 72, objectFit: 'contain' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
          {/* ── CTA ── */}
          <section style={{ padding: 'clamp(80px,10vh,120px) clamp(20px,5vw,80px)', textAlign: 'center' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>🎮</div>
              <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, lineHeight: 1.15 }}>
                Unite a la escena{' '}
                <span style={{ background: 'linear-gradient(90deg,#FF8C00,#E85D00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>competitiva</span>
              </h2>
              <p style={{ margin: '0 0 36px', color: 'rgba(255,255,255,0.45)', fontSize: 17, lineHeight: 1.6 }}>
                Creá tu cuenta con tu perfil de Start.gg y empezá a jugar ranked hoy mismo.
              </p>
              <Link href="/login">
                <button className="lp-btn-primary" style={{ background: '#FF8C00', border: 'none', borderRadius: 14, padding: '18px 48px', color: '#fff', fontWeight: 900, fontSize: 17, cursor: 'pointer', transition: 'background 0.15s, transform 0.15s', boxShadow: '0 8px 40px rgba(232,142,0,0.4)' }}>
                  Iniciar sesión con Start.gg →
                </button>
              </Link>
            </div>
          </section>
          {/* ── FOOTER ── */}
          <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '28px clamp(20px,5vw,80px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/images/logo.app.png" alt="" style={{ width: 24, height: 18, opacity: 0.5 }} />
              <span>la app sin H © {new Date().getFullYear()}</span>
            </div>
            <span>Super Smash Bros Ultimate — Argentina</span>
          </footer>
        </div>
      </>
    );
  }

  // ── PANEL ADMIN (con sesión + ?panel=1) ──────────────────────────────────
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

  async function markTournamentComplete(slug) {
    if (markCompleting[slug]) return;
    setMarkCompleting(prev => ({ ...prev, [slug]: true }));
    try {
      const r = await fetch('/api/tournaments/mark-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const d = await r.json();
      if (d.success) {
        setFeaturedTours(prev => prev.map(t => t.slug === slug ? { ...t, state: 3, stateLabel: 'COMPLETED' } : t));
        setSyncedTours(prev => prev.map(t => t.slug === slug ? { ...t, state: 3, stateLabel: 'COMPLETED' } : t));
      } else {
        alert(d.error || 'Error al terminar el torneo');
      }
    } catch { alert('Error de conexión'); }
    setMarkCompleting(prev => ({ ...prev, [slug]: false }));
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

  async function notifyFeaturedFromIndex(slug) {
    const allTours = [...featuredTours, ...syncedTours];
    const t = allTours.find(x => x.slug === slug);
    if (!t) return;
    if (!window.confirm(`¿Enviar notificación push a todos sobre "${t.name}"?`)) return;
    try {
      const r = await fetch('/api/tournaments/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer afk-admin-2025' },
        body: JSON.stringify({ url: slug, notify: true }),
      });
      const d = await r.json();
      if (d.success) alert('✅ Notificación enviada');
      else alert(d.error || 'Error al enviar notificación');
    } catch { alert('Error de conexión'); }
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
          const sortByDate = (a, b) => { const aD = a.state===3||a.state===4||a.state==='COMPLETED'||a.state==='CANCELLED'; const bD = b.state===3||b.state===4||b.state==='COMPLETED'||b.state==='CANCELLED'; if (aD!==bD) return aD?1:-1; return (a.startAt?new Date(a.startAt).getTime():Infinity)-(b.startAt?new Date(b.startAt).getTime():Infinity); };
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
                    {[
                      ...featuredTours.map(t => ({ ...t, _isManual: true })),
                      ...syncedTours.map(t => ({ ...t, _isManual: false })),
                    ].sort(sortByDate).map(t => {
                      const isHidden = t._hidden || hiddenSlugs.includes(t.slug);
                      return (
                        <div key={t.slug} style={{ display: 'flex', alignItems: 'center', gap: 10, background: isHidden ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isHidden ? 'rgba(255,255,255,0.04)' : (t._isManual ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.07)')}`, borderRadius: 13, padding: '11px 13px', opacity: isHidden ? 0.55 : 1 }}>
                          {t.image && <img src={t.image} alt="" style={{ width: 38, height: 38, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                              {t._isManual
                                ? <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', background: 'rgba(255,140,0,0.15)', color: '#FF8C00', borderRadius: 4, flexShrink: 0 }}>Manual</span>
                                : <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', background: 'rgba(99,102,241,0.15)', color: '#818CF8', borderRadius: 4, flexShrink: 0 }}>Auto</span>
                              }
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
                          {t.state !== 3 && t.state !== 4 && (
                            <button
                              onClick={() => markTournamentComplete(t.slug)}
                              disabled={!!markCompleting[t.slug]}
                              title="Marcar como terminado"
                              style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, padding: '5px 9px', color: '#FBBF24', cursor: 'pointer', fontSize: 13, flexShrink: 0, opacity: markCompleting[t.slug] ? 0.5 : 1 }}
                            >{markCompleting[t.slug] ? '...' : '🏁'}</button>
                          )}
                          <button
                            onClick={() => notifyFeaturedFromIndex(t.slug)}
                            title="Enviar notificación push"
                            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '5px 9px', color: '#a5b4fc', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}
                          >🔔</button>
                          {t._isManual && (
                            <button
                              onClick={() => removeFeaturedFromIndex(t.slug)}
                              title="Eliminar"
                              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '5px 10px', color: '#f87171', cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}
                            >✕</button>
                          )}
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
