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
          window.location.href = 'https://smash-ban-stages.vercel.app';
          return;
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>{`
          body { background: #0B0B12; }
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
          @keyframes glow  { 0%,100%{opacity:.5} 50%{opacity:1} }
        `}</style>
      </Head>

      <div style={{
        minHeight: '100dvh', background: '#0B0B12', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px', position: 'relative', overflow: 'hidden',
        fontFamily: "'Outfit', sans-serif",
      }}>
        {/* Orbs de fondo */}
        <div style={{ position:'absolute', top:'-15%', left:'-10%', width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.13) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'-10%', right:'-10%', width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle, rgba(232,142,0,0.1) 0%, transparent 70%)', pointerEvents:'none' }} />

        <div style={{ width:'100%', maxWidth:400, position:'relative', zIndex:1 }}>

          {/* Logo */}
          <div style={{ textAlign:'center', marginBottom:40 }}>
            <div style={{
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              width:72, height:72, borderRadius:22,
              background:'linear-gradient(135deg,#FF8C00,#E85D00)',
              fontSize:36, marginBottom:20,
              boxShadow:'0 0 40px rgba(232,142,0,0.4), 0 12px 28px rgba(0,0,0,0.5)',
              animation:'float 4s ease-in-out infinite',
            }}>🎮</div>
            <h1 style={{ margin:'0 0 6px', fontSize:38, fontWeight:900, color:'#fff', letterSpacing:'-1px' }}>AFK Smash</h1>
            <p style={{ margin:0, fontSize:12, fontWeight:700, letterSpacing:'0.22em', color:'rgba(255,255,255,0.3)', textTransform:'uppercase' }}>Comunidad Competitiva</p>
          </div>

          {/* Card principal */}
          <div style={{
            background:'rgba(255,255,255,0.04)', backdropFilter:'blur(20px)',
            border:'1px solid rgba(255,255,255,0.08)', borderRadius:24,
            padding:'28px 24px', marginBottom:20,
          }}>
            <p style={{ margin:'0 0 20px', fontSize:14, color:'rgba(255,255,255,0.45)', textAlign:'center', lineHeight:1.6 }}>
              Iniciá sesión con tu cuenta de <span style={{ color:'#FF8C00', fontWeight:700 }}>Start.gg</span> para acceder a rankings, matchmaking y torneos.
            </p>

            {error === 'no_access' && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:14, padding:'12px 16px', marginBottom:16 }}>
                <p style={{ margin:0, fontSize:13, color:'#FCA5A5' }}>Tu cuenta de Start.gg no tiene acceso. Contactá a un admin.</p>
              </div>
            )}
            {error === 'auth_failed' && (
              <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:14, padding:'12px 16px', marginBottom:16 }}>
                <p style={{ margin:0, fontSize:13, color:'#FCA5A5' }}>Error al autenticar. Intentá de nuevo.</p>
              </div>
            )}
            {error && error !== 'auth_failed' && error !== 'no_access' && (
              <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:14, padding:'12px 16px', marginBottom:16 }}>
                <p style={{ margin:'0 0 4px', fontSize:12, fontWeight:700, color:'#FCA5A5' }}>Error de diagnóstico:</p>
                <p style={{ margin:0, fontSize:11, color:'rgba(252,165,165,0.7)', wordBreak:'break-all' }}>{decodeURIComponent(error)}</p>
                {detail && <p style={{ margin:'6px 0 0', fontSize:11, color:'rgba(252,165,165,0.5)' }}>{decodeURIComponent(detail)}</p>}
              </div>
            )}

            <button onClick={handleLogin} style={{
              width:'100%', padding:'16px', borderRadius:16, border:'none',
              background:'linear-gradient(135deg,#FF8C00,#E85D00)',
              color:'#fff', fontSize:16, fontWeight:800, cursor:'pointer',
              boxShadow:'0 8px 28px rgba(232,142,0,0.45)',
              transition:'transform .15s, box-shadow .15s',
              letterSpacing:'0.02em',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 12px 36px rgba(232,142,0,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 8px 28px rgba(232,142,0,0.45)'; }}
            >
              Ingresar con Start.gg
            </button>
          </div>

          {/* Features row */}
          <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
            {[['⚔️','Ranked'],['🏆','Torneos'],['📊','Rankings']].map(([ic, lb]) => (
              <div key={lb} style={{ flex:1, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, padding:'10px 8px', textAlign:'center' }}>
                <p style={{ margin:'0 0 4px', fontSize:18 }}>{ic}</p>
                <p style={{ margin:0, fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>{lb}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
