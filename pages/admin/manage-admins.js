import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getStoredUser, verifySession } from '../../src/utils/auth';

const COMMUNITIES = [
  { id: 'afk',      label: 'Smash AFK',      color: '#06B6D4', icon: '🎮' },
  { id: 'cordoba',  label: 'Smash Córdoba',   color: '#EC4899', icon: '🎮' },
  { id: 'mendoza',  label: 'Smash Mendoza',   color: '#9CA3AF', icon: '🎮' },
  { id: 'test',     label: 'Panel Torneo',    color: '#FF8C00', icon: '🏆' },
];

export default function ManageAdmins() {
  const router = useRouter();
  const [checking, setChecking]     = useState(true);
  const [user, setUser]             = useState(null);
  const [data, setData]             = useState(null);   // { communities: {afk: [...], ...} }
  const [loading, setLoading]       = useState(false);
  const [activeCom, setActiveCom]   = useState('afk');
  const [slugInput, setSlugInput]   = useState('');
  const [nameInput, setNameInput]   = useState('');
  const [addState, setAddState]     = useState(null);  // null | 'loading' | 'ok' | 'error'
  const [addError, setAddError]     = useState('');
  const [removeState, setRemoveState] = useState({}); // {slug: 'loading'|'done'}
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]   = useState(false);
  const searchTimeout               = useRef(null);
  const stored = typeof window !== 'undefined' ? getStoredUser() : null;
  const token  = stored?.access_token || '';

  useEffect(() => {
    const s = getStoredUser();
    if (!s?.access_token) { router.replace('/login'); return; }
    verifySession().then(d => {
      if (!d) { router.replace('/login'); return; }
      if (!d.isAdmin) { router.replace('/'); return; }
      setUser(d.user);
      setChecking(false);
    });
  }, []);

  useEffect(() => {
    if (!checking) loadAll();
  }, [checking]);

  async function loadAll() {
    setLoading(true);
    const res = await fetch('/api/admin/community-admins', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  function onSlugChange(val) {
    setSlugInput(val);
    clearTimeout(searchTimeout.current);
    if (val.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(val.trim())}`);
      const list = await res.json();
      setSearchResults(list);
      setSearching(false);
    }, 300);
  }

  async function addAdmin(e) {
    e.preventDefault();
    const slug = slugInput.trim().replace(/^user\//, '');
    const name = nameInput.trim() || slug;
    if (!slug) return;
    setAddState('loading');
    setAddError('');
    const res = await fetch('/api/admin/community-admins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ community: activeCom, slug, name }),
    });
    const json = await res.json();
    if (!res.ok) { setAddState('error'); setAddError(json.error || 'Error'); }
    else { setAddState('ok'); setSlugInput(''); setNameInput(''); setSearchResults([]); await loadAll(); }
    setTimeout(() => setAddState(null), 3000);
  }

  async function removeAdmin(community, slug) {
    setRemoveState(prev => ({ ...prev, [`${community}:${slug}`]: 'loading' }));
    await fetch('/api/admin/community-admins', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ community, slug }),
    });
    setRemoveState(prev => ({ ...prev, [`${community}:${slug}`]: 'done' }));
    await loadAll();
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#0B0B12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const activeData = (data?.communities?.[activeCom] || []);

  return (
    <>
      <Head><title>Gestionar Admins — Panel</title></Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0B0B12;font-family:'Outfit',sans-serif;color:#fff}
        @keyframes spin{to{transform:rotate(360deg)}}
        input:focus{outline:none}
        .tab-btn:hover{border-color:rgba(255,255,255,0.25)!important;background:rgba(255,255,255,0.07)!important}
        .admin-row:hover .remove-btn{opacity:1!important}
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0B0B12', fontFamily: "'Outfit',sans-serif" }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(11,11,18,0.97)', backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>←</button>
            <div>
              <p style={{ fontWeight: 900, fontSize: 16, color: '#fff' }}>🛡️ Gestionar Admins</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>Solo vos podés hacer esto, {user?.name}</p>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 20px 60px' }}>

          {/* Tabs de comunidades */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {COMMUNITIES.map(c => (
              <button
                key={c.id}
                className="tab-btn"
                onClick={() => setActiveCom(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: activeCom === c.id ? c.color + '18' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${activeCom === c.id ? c.color + '66' : 'rgba(255,255,255,0.09)'}`,
                  borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
                  fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 13,
                  color: activeCom === c.id ? c.color : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.14s',
                }}
              >
                {c.icon} {c.label}
                <span style={{ fontSize: 10, fontWeight: 800, background: activeCom === c.id ? c.color + '30' : 'rgba(255,255,255,0.06)', color: activeCom === c.id ? c.color : 'rgba(255,255,255,0.3)', borderRadius: 99, padding: '1px 7px', minWidth: 22, textAlign: 'center' }}>
                  {data?.communities?.[c.id]?.length ?? '…'}
                </span>
              </button>
            ))}
          </div>

          {/* Card principal */}
          <div style={{ background: '#0F0F1A', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, overflow: 'hidden' }}>
            {/* Accent bar */}
            <div style={{ height: 3, background: `linear-gradient(90deg,${COMMUNITIES.find(c => c.id === activeCom)?.color},${COMMUNITIES.find(c => c.id === activeCom)?.color}44)` }} />

            <div style={{ padding: '20px 22px' }}>
              <h2 style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>
                {COMMUNITIES.find(c => c.id === activeCom)?.label}
              </h2>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>
                Estos usuarios pueden ingresar al panel de <strong style={{ color: 'rgba(255,255,255,0.5)' }}>/admin/{activeCom}</strong>
              </p>

              {/* Formulario para agregar */}
              <form onSubmit={addAdmin} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24, position: 'relative' }}>
                <div style={{ flex: '1 1 200px', position: 'relative' }}>
                  <input
                    value={slugInput}
                    onChange={e => onSlugChange(e.target.value)}
                    placeholder="Slug de start.gg (ej: gabriel-sin-h)"
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10, padding: '10px 13px', color: '#fff', fontSize: 13,
                      fontFamily: "'Outfit',sans-serif",
                    }}
                  />
                  {/* Sugerencias de búsqueda */}
                  {searchResults.length > 0 && !searching && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, marginTop: 4, zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                      {searchResults.slice(0, 6).map(r => (
                        <button
                          key={r.userId}
                          type="button"
                          onClick={() => { setSlugInput(String(r.userId)); setNameInput(r.userName); setSearchResults([]); }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: "'Outfit',sans-serif" }}
                        >
                          <span style={{ fontSize: 13, color: '#E5E7EB', fontWeight: 700 }}>{r.userName}</span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>ID: {r.userId}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ flex: '1 1 160px' }}>
                  <input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    placeholder="Nombre visible (opcional)"
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10, padding: '10px 13px', color: '#fff', fontSize: 13,
                      fontFamily: "'Outfit',sans-serif",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={addState === 'loading' || !slugInput.trim()}
                  style={{
                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                    background: addState === 'ok' ? 'rgba(34,197,94,0.14)' : addState === 'error' ? 'rgba(239,68,68,0.14)' : 'rgba(34,197,94,0.14)',
                    border: `1px solid ${addState === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.35)'}`,
                    color: addState === 'error' ? '#F87171' : '#22C55E',
                    borderRadius: 10, padding: '10px 18px', fontWeight: 800, fontSize: 13,
                    fontFamily: "'Outfit',sans-serif", cursor: addState === 'loading' ? 'wait' : 'pointer',
                  }}
                >
                  {addState === 'loading' ? <><span style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />Agregando...</>
                  : addState === 'ok' ? '✅ Agregado'
                  : addState === 'error' ? `❌ ${addError}`
                  : '+ Agregar admin'}
                </button>
              </form>

              {/* Lista de admins */}
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '20px 0' }}>
                  <div style={{ width: 18, height: 18, border: '2px solid #FF8C00', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0 }} />
                  Cargando...
                </div>
              ) : activeData.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 13, padding: '28px 20px', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>Sin admins de comunidad</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)', marginTop: 4 }}>Usá el formulario de arriba para agregar</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {activeData.map(admin => {
                    const key = `${activeCom}:${admin.slug}`;
                    const isRemoving = removeState[key] === 'loading';
                    return (
                      <div key={admin.slug} className="admin-row" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 13, padding: '12px 16px' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: COMMUNITIES.find(c => c.id === activeCom)?.color + '18', border: `1px solid ${COMMUNITIES.find(c => c.id === activeCom)?.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                          👤
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 800, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{admin.name}</p>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                            slug: {admin.slug} · agregado {new Date(admin.addedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, background: COMMUNITIES.find(c => c.id === activeCom)?.color + '18', border: `1px solid ${COMMUNITIES.find(c => c.id === activeCom)?.color}33`, color: COMMUNITIES.find(c => c.id === activeCom)?.color, borderRadius: 99, padding: '2px 9px', flexShrink: 0 }}>
                          ADMIN {activeCom.toUpperCase()}
                        </span>
                        <button
                          className="remove-btn"
                          onClick={() => removeAdmin(activeCom, admin.slug)}
                          disabled={isRemoving}
                          style={{ opacity: 0, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: "'Outfit',sans-serif", transition: 'opacity 0.14s' }}
                        >
                          {isRemoving ? '...' : 'Quitar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Info box */}
          <div style={{ marginTop: 20, background: 'rgba(255,140,0,0.05)', border: '1px solid rgba(255,140,0,0.15)', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>💡</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>¿Cómo funciona?</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                Los admins de comunidad pueden ingresar solo a <strong style={{ color: 'rgba(255,255,255,0.5)' }}>/admin/[su_comunidad]</strong>. No pueden ver otras comunidades ni el panel global.
                El slug es el ID numérico del jugador o el slug de start.gg (sin &#34;user/&#34;). El cambio toma efecto en la próxima vez que el usuario inicie sesión.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
