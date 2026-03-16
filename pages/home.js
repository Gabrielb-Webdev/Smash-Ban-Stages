import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getStoredUser } from '../src/utils/auth';

const PLATFORMS = [
  { id: 'parsec', label: 'Parsec', icon: '🖥️', grad: 'from-violet-900/70 to-indigo-950', border: 'border-violet-700/40' },
  { id: 'switch', label: 'Switch Online', icon: '🎮', grad: 'from-red-900/70 to-rose-950', border: 'border-red-700/40' },
];

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState('inicio');

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.replace('/login'); return; }
    setUser(stored.user);
    setIsAdmin(!!stored.isAdmin);
  }, []);

  if (!user) return <div className="min-h-screen bg-[#080808]" />;

  const displayName = user.name || (user.slug || '').replace(/^user\//, '') || 'Usuario';
  const initial = displayName[0]?.toUpperCase() || '?';

  return (
    <>
      <Head>
        <title>AFK Smash</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <div className="min-h-screen bg-[#080808] text-white flex flex-col" style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* ── Top bar ── */}
        <div className="sticky top-0 z-40 px-4 pt-4 pb-3 bg-[#080808]/95 backdrop-blur-sm border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#E88E00] flex items-center justify-center">
              <span className="text-sm">🎮</span>
            </div>
            <span className="font-black text-base tracking-tight">AFK Smash</span>
          </div>
          <div id="app-profile-header" className="flex items-center gap-2.5">
            <span className="text-gray-400 text-sm">{displayName}</span>
            {user.avatar
              ? <img src={user.avatar} className="w-8 h-8 rounded-full ring-2 ring-white/10" />
              : <div className="w-8 h-8 rounded-full bg-[#E88E00]/20 ring-2 ring-[#E88E00]/30 flex items-center justify-center text-[#E88E00] text-sm font-black">{initial}</div>
            }
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto pb-20">
          {tab === 'inicio'   && <TabInicio user={user} isAdmin={isAdmin} router={router} displayName={displayName} />}
          {tab === 'rankings' && <TabRankings />}
          {tab === 'torneos'  && <TabTorneos />}
          {tab === 'tips'     && <TabTips />}
          {tab === 'match'    && <TabMatch />}
        </div>

        {/* ── Bottom nav ── */}
        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab }) {
  const items = [
    { id: 'inicio',   svg: <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />,   label: 'Inicio' },
    { id: 'rankings', svg: <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />, label: 'Rankings' },
    { id: 'torneos',  svg: <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />, label: 'Torneos' },
    { id: 'tips',     svg: <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />, label: 'Tips' },
    { id: 'match',    svg: <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />, label: 'Match' },
  ];
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[#0c0c0c]/95 backdrop-blur-sm border-t border-white/[0.06] flex z-50 safe-bottom">
      {items.map(item => (
        <button key={item.id} onClick={() => setTab(item.id)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all ${tab === item.id ? 'text-[#E88E00]' : 'text-gray-600 hover:text-gray-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={tab === item.id ? 2.5 : 1.8}
            stroke="currentColor" className="w-5 h-5">
            {item.svg}
          </svg>
          <span className={`text-[10px] font-semibold tracking-wide`}>{item.label}</span>
          {tab === item.id && <span className="absolute bottom-0 block w-8 h-0.5 rounded-t-full bg-[#E88E00]" style={{ position: 'relative' }} />}
        </button>
      ))}
    </div>
  );
}

// ─── Tab Inicio ───────────────────────────────────────────────────────────────
function TabInicio({ user, isAdmin, router, displayName }) {
  return (
    <div>
      {/* Hero */}
      <div className="relative px-4 pt-6 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#E88E00]/8 via-transparent to-transparent pointer-events-none" />
        <p className="text-gray-500 text-sm mb-1">Hola, <span className="text-gray-300 font-semibold">{displayName}</span> 👋</p>
        <h1 className="text-2xl font-black leading-tight">Bienvenido a<br /><span className="text-[#E88E00]">AFK Smash</span></h1>
        <p className="text-gray-600 text-sm mt-2 leading-relaxed">Comunidad de Super Smash Bros. Ultimate en Argentina</p>
      </div>

      <div className="px-4 space-y-5 pb-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: '⭐', label: 'Puntos', val: '—', sub: 'BA Local' },
            { icon: '🏆', label: 'Ranking', val: '—', sub: 'posición' },
            { icon: '⚡', label: 'W / L', val: '—', sub: 'matchmaking' },
          ].map(s => (
            <div key={s.label} className="bg-[#111] border border-white/[0.07] rounded-2xl p-3 text-center">
              <span className="text-xl leading-none">{s.icon}</span>
              <p className="text-xl font-black text-white mt-2 leading-none">{s.val}</p>
              <p className="text-[10px] text-gray-500 mt-1.5 font-medium">{s.label}</p>
              <p className="text-[9px] text-gray-700">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Admin */}
        {isAdmin && (
          <button onClick={() => router.push('/')}
            className="w-full flex items-center gap-3.5 bg-[#E88E00]/10 border border-[#E88E00]/25 rounded-2xl p-4 text-left group hover:bg-[#E88E00]/15 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#E88E00]/20 flex items-center justify-center shrink-0">
              <span className="text-lg">🎮</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#E88E00] text-sm">Panel de Administración</p>
              <p className="text-gray-500 text-xs mt-0.5">Gestionar torneos y setups</p>
            </div>
            <svg className="w-4 h-4 text-gray-600 shrink-0 group-hover:text-[#E88E00] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}

        {/* Comunidades */}
        <div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] mb-3">Comunidades</p>
          <div className="space-y-2.5">
            <CommunityCard
              name="Smash AFK" region="Buenos Aires" tag="Local"
              desc="Comunidad de SSBU en Buenos Aires. Torneos semanales y ranking local."
              grad="from-sky-950 to-blue-950" border="border-sky-800/25" accent="text-sky-400" tagBg="bg-sky-500/15 text-sky-300"
              icon={<span className="text-2xl">🗺️</span>}
            />
            <CommunityCard
              name="Smash INC" region="Nacional · Argentina" tag="Nacional"
              desc="Circuito nacional de SSBU. Ranking nacional y torneos interregionales."
              grad="from-orange-950 to-red-950" border="border-orange-800/25" accent="text-orange-400" tagBg="bg-orange-500/15 text-orange-300"
              icon={<span className="text-2xl">🏅</span>}
            />
          </div>
        </div>

        {/* Próximamente */}
        <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#E88E00]/15 flex items-center justify-center shrink-0">
              <span className="text-base">🚀</span>
            </div>
            <p className="font-bold text-sm text-white">Próximamente</p>
          </div>
          <div className="space-y-2">
            {['Sistema de puntos y ranking en vivo', 'Matchmaking con rivales de tu nivel', 'Tips y guías por personaje'].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E88E00]/50 shrink-0" />
                <p className="text-gray-500 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunityCard({ name, region, tag, desc, grad, border, accent, tagBg, icon }) {
  return (
    <div className={`bg-gradient-to-br ${grad} border ${border} rounded-2xl p-4`}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-bold text-white text-sm">{name}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tagBg}`}>{tag}</span>
          </div>
          <p className={`text-xs font-medium ${accent} mb-2`}>{region}</p>
          <p className="text-gray-400 text-xs leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Tab Rankings ─────────────────────────────────────────────────────────────
function TabRankings() {
  const [mode, setMode] = useState('ba');
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-black mb-1">Rankings</h1>
      <p className="text-gray-600 text-sm mb-5">Clasificaciones de la comunidad</p>
      <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-1 flex gap-1 mb-5">
        {[{ id: 'ba', label: 'BA Local' }, { id: 'inc', label: 'INC' }, { id: 'char', label: 'Personaje' }].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${mode === m.id ? 'bg-[#E88E00] text-white shadow-lg shadow-[#E88E00]/20' : 'text-gray-500'}`}>
            {m.label}
          </button>
        ))}
      </div>
      {mode !== 'char' ? <RankingList region={mode} /> : <CharRanking />}
    </div>
  );
}

function RankingList({ region }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-600">{region === 'ba' ? '📍 Buenos Aires' : '🇦🇷 Nacional'}</p>
        <span className="text-[10px] font-bold bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-full">Próximamente</span>
      </div>
      <div className="space-y-2">
        {[1,2,3,4,5].map(pos => (
          <div key={pos} className="flex items-center gap-3 bg-[#111] border border-white/[0.07] rounded-xl px-4 py-3.5">
            <span className={`text-sm font-black w-6 text-center ${pos <= 3 ? 'text-lg' : 'text-gray-700'}`}>
              {pos <= 3 ? medals[pos-1] : pos}
            </span>
            <div className="flex-1">
              <div className="h-3 w-24 bg-white/5 rounded-full" />
              <div className="h-2 w-14 bg-white/[0.03] rounded-full mt-1.5" />
            </div>
            <div className="w-8 h-8 rounded-full bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CharRanking() {
  const tiers = [
    { tier: 'S', color: 'from-yellow-500 to-orange-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { tier: 'A', color: 'from-green-500 to-emerald-500', bg: 'bg-green-500/10 border-green-500/20' },
    { tier: 'B', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10 border-blue-500/20' },
    { tier: 'C', color: 'from-gray-500 to-gray-600', bg: 'bg-gray-500/10 border-gray-500/20' },
  ];
  return (
    <div>
      <p className="text-xs text-gray-600 mb-3">Tu rendimiento por personaje</p>
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {tiers.map(t => (
          <div key={t.tier} className={`border rounded-2xl p-4 text-center ${t.bg} opacity-40`}>
            <p className={`text-3xl font-black bg-gradient-to-br ${t.color} bg-clip-text text-transparent`}>{t.tier}</p>
            <p className="text-xs text-gray-600 mt-1.5">Clase {t.tier}</p>
            <p className="text-[10px] text-gray-700 mt-0.5">0 personajes</p>
          </div>
        ))}
      </div>
      <div className="bg-[#111] border border-dashed border-white/10 rounded-2xl p-5 text-center">
        <span className="text-3xl">🎭</span>
        <p className="text-gray-400 text-sm font-semibold mt-2">Jugá partidas para generar tu ranking por personaje</p>
      </div>
    </div>
  );
}

// ─── Tab Torneos ──────────────────────────────────────────────────────────────
function TabTorneos() {
  const [loading, setLoading] = useState(true);
  const [torneos, setTorneos] = useState([]);
  useEffect(() => {
    fetch('/api/tournaments').then(r => r.json()).then(d => { setTorneos(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-black mb-1">Torneos</h1>
      <p className="text-gray-600 text-sm mb-5">Publicados en Start.GG</p>
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-[#E88E00] border-t-transparent rounded-full animate-spin" /></div>
      ) : torneos.length === 0 ? (
        <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-8 text-center">
          <span className="text-4xl">📋</span>
          <p className="text-white font-bold mt-3">Sin torneos activos</p>
          <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">Los torneos publicados en Start.GG van a aparecer acá automáticamente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {torneos.map((t, i) => (
            <div key={i} className="bg-[#111] border border-white/[0.07] rounded-2xl p-4">
              <p className="font-bold text-white">{t.name || t.tournamentName || 'Torneo'}</p>
              <p className="text-xs text-gray-500 mt-1">{t.date || t.startAt || 'Fecha por confirmar'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab Tips ─────────────────────────────────────────────────────────────────
function TabTips() {
  const [selected, setSelected] = useState(null);
  const chars = ['Mario', 'Pikachu', 'Fox', 'Marth', 'Samus', 'Link', 'Kirby', 'Donkey Kong', 'Sheik', 'Falco', 'Mewtwo', 'Zelda', 'Young Link', 'Ice Climbers', 'Jigglypuff', 'Pichu', 'Ness', 'Captain Falcon', 'Roy', 'Game & Watch'];
  if (selected) return (
    <div className="px-4 py-6">
      <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-[#E88E00] text-sm font-bold mb-5">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
        Volver
      </button>
      <h2 className="text-xl font-black mb-1">{selected}</h2>
      <p className="text-gray-600 text-sm mb-5">Tips de la comunidad</p>
      <div className="bg-[#111] border border-dashed border-white/10 rounded-2xl p-8 text-center">
        <span className="text-4xl">💡</span>
        <p className="text-gray-400 text-sm mt-3">Sin tips todavía para <span className="text-white font-semibold">{selected}</span></p>
        <div className="mt-4 bg-[#E88E00]/5 border border-[#E88E00]/15 rounded-xl px-4 py-2.5 inline-block">
          <p className="text-[#E88E00]/50 text-xs font-bold">+ Subir tip — Próximamente</p>
        </div>
      </div>
    </div>
  );
  return (
    <div className="px-4 py-6">
      <h1 className="text-2xl font-black mb-1">Tips</h1>
      <p className="text-gray-600 text-sm mb-5">Elegí un personaje</p>
      <div className="grid grid-cols-2 gap-2.5">
        {chars.map(c => (
          <button key={c} onClick={() => setSelected(c)}
            className="bg-[#111] border border-white/[0.07] rounded-xl p-3.5 text-left hover:border-[#E88E00]/30 hover:bg-[#E88E00]/5 transition-all duration-150 group">
            <p className="font-semibold text-sm text-white group-hover:text-[#E88E00] transition-colors">{c}</p>
            <p className="text-[10px] text-gray-700 mt-1">0 tips</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Tab Match ────────────────────────────────────────────────────────────────
function TabMatch() {
  const [plat, setPlat] = useState(null);
  const p = PLATFORMS.find(p => p.id === plat);
  return (
    <div className="px-4 py-6">
      {plat && (
        <button onClick={() => setPlat(null)} className="flex items-center gap-1.5 text-[#E88E00] text-sm font-bold mb-5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          Volver
        </button>
      )}
      {!plat ? (
        <>
          <h1 className="text-2xl font-black mb-1">Matchmaking</h1>
          <p className="text-gray-600 text-sm mb-6">Elegí tu plataforma</p>
          <div className="space-y-2.5 mb-7">
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => setPlat(p.id)}
                className={`w-full bg-gradient-to-r ${p.grad} border ${p.border} rounded-2xl p-4 text-left hover:brightness-110 transition-all`}>
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-white/8 flex items-center justify-center text-2xl shrink-0">{p.icon}</div>
                  <div className="flex-1">
                    <p className="font-bold text-white">{p.label}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{p.id === 'parsec' ? 'Emulador · Rollback netcode' : 'Nintendo Switch Online'}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-yellow-500/15 text-yellow-400 px-2.5 py-1 rounded-full shrink-0">Pronto</span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] mb-3">¿Cómo funciona?</p>
          <div className="space-y-2">
            {[['🔍','Buscás partida','Te emparejamos con jugadores de nivel similar'],['🗺️','Escenario aleatorio','Uno de los mapas competitivos elegido al azar'],['📜','Reglas estándar','Reglas competitivas preestablecidas'],['📤','Reportás el resultado','Ambos suben quién ganó y diferencia de stocks'],['📈','Puntos','Ganás/perdés según resultado y nivel del rival']].map(([icon,t,d]) => (
              <div key={t} className="flex gap-3.5 bg-[#111] border border-white/[0.07] rounded-xl p-3.5">
                <span className="text-lg mt-0.5 shrink-0">{icon}</span>
                <div><p className="font-semibold text-sm text-white">{t}</p><p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{d}</p></div>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] mt-6 mb-3">Rankings separados</p>
          <div className="grid grid-cols-2 gap-2.5">
            {PLATFORMS.map(p => (
              <div key={p.id} className={`bg-gradient-to-br ${p.grad} border ${p.border} rounded-2xl p-4 text-center`}>
                <span className="text-2xl">{p.icon}</span>
                <p className="font-bold text-sm mt-2">{p.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Ranking independiente</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3.5 mb-6">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.grad} border ${p.border} flex items-center justify-center text-2xl`}>{p.icon}</div>
            <div>
              <h1 className="text-xl font-black">{p.label}</h1>
              <p className="text-gray-600 text-xs mt-0.5">Ranking propio · {p.id === 'parsec' ? 'Emulador' : 'Switch'}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5 mb-6">
            {[['⭐','Puntos','—'],['🏆','Ranking','—'],['⚡','W / L','—']].map(([icon,label,val]) => (
              <div key={label} className="bg-[#111] border border-white/[0.07] rounded-2xl p-3 text-center">
                <span className="text-xl">{icon}</span>
                <p className="text-xl font-black mt-2 leading-none">{val}</p>
                <p className="text-[10px] text-gray-500 mt-1.5">{label}</p>
              </div>
            ))}
          </div>
          <div className={`bg-gradient-to-br ${p.grad} border ${p.border} rounded-2xl p-8 text-center`}>
            <span className="text-4xl">{p.icon}</span>
            <p className="text-white font-bold mt-3">Matchmaking en desarrollo</p>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">Pronto podés buscar rivales y acumular puntos en el ranking de {p.label}</p>
          </div>
        </>
      )}
    </div>
  );
}


export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState('inicio');

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) { router.replace('/login'); return; }
    setUser(stored.user);
    setIsAdmin(!!stored.isAdmin);
  }, []);

  if (!user) return <div className="min-h-screen bg-[#0a0a0a]" />;

  const displayName = user.name || user.slug || 'Usuario';

  return (
    <>
      <Head>
        <title>AFK Smash</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col" style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-white/5 sticky top-0 bg-[#0a0a0a] z-40">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎮</span>
            <span className="font-black text-lg tracking-tight">AFK Smash</span>
          </div>
          <div id="app-profile-header" className="flex items-center gap-3">
            <span className="text-gray-400 text-sm font-medium">{displayName}</span>
            {user.avatar
              ? <img src={user.avatar} alt={displayName} className="w-8 h-8 rounded-full border border-white/10" />
              : <div className="w-8 h-8 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center text-sm font-bold text-white">
                  {displayName[0]?.toUpperCase()}
                </div>
            }
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto pb-24">
          {tab === 'inicio'    && <TabInicio user={user} isAdmin={isAdmin} router={router} />}
          {tab === 'rankings'  && <TabRankings />}
          {tab === 'torneos'   && <TabTorneos />}
          {tab === 'tips'      && <TabTips />}
          {tab === 'match'     && <TabMatch user={user} />}
        </div>

        {/* ── Bottom nav ── */}
        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab }) {
  const items = [
    { id: 'inicio',   icon: '🏠', label: 'Inicio' },
    { id: 'rankings', icon: '🏆', label: 'Rankings' },
    { id: 'torneos',  icon: '📋', label: 'Torneos' },
    { id: 'tips',     icon: '💡', label: 'Tips' },
    { id: 'match',    icon: '⚔️', label: 'Match' },
  ];
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[#0f0f0f] border-t border-white/5 flex z-40">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => setTab(item.id)}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${tab === item.id ? 'text-[#E88E00]' : 'text-gray-600'}`}
        >
          <span className="text-lg leading-none">{item.icon}</span>
          <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
          {tab === item.id && <span className="block w-4 h-0.5 rounded-full bg-[#E88E00] mt-0.5" />}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB: INICIO
// ─────────────────────────────────────────────────────────────────
function TabInicio({ user, isAdmin, router }) {
  const displayName = user.name || user.slug || 'Usuario';
  return (
    <div className="px-4 py-5 space-y-6">

      {/* Bienvenida */}
      <div>
        <p className="text-gray-400 text-sm">Hola, <span className="text-white font-semibold">{displayName}</span> 👋</p>
        <h1 className="text-2xl font-black mt-0.5">Bienvenido a la comunidad</h1>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="⭐" label="Puntos" value="—" sub="BA Local" />
        <StatCard icon="📊" label="Ranking" value="—" sub="tu posición" />
        <StatCard icon="🎯" label="W / L" value="—" sub="matchmaking" />
      </div>

      {/* Admin shortcut */}
      {isAdmin && (
        <button
          onClick={() => router.push('/')}
          className="w-full flex items-center gap-3 bg-[#E88E00]/10 border border-[#E88E00]/30 rounded-2xl p-4 text-left"
        >
          <span className="text-2xl">🎮</span>
          <div>
            <p className="font-bold text-[#E88E00] text-sm">Panel de Administración</p>
            <p className="text-gray-500 text-xs">Gestionar torneos y setups</p>
          </div>
          <span className="ml-auto text-gray-500">→</span>
        </button>
      )}

      {/* Comunidades */}
      <section>
        <SectionTitle>Comunidades</SectionTitle>
        <div className="space-y-3">
          <CommunityCard
            name="Smash AFK"
            region="Buenos Aires"
            desc="Comunidad de SSBU en Buenos Aires. Torneos semanales, ranking local y más."
            gradient="from-cyan-900/50 to-blue-950/60"
            border="border-cyan-800/30"
            emoji="🗺️"
            tag="Local"
            tagColor="bg-cyan-500/20 text-cyan-300"
          />
          <CommunityCard
            name="Smash INC"
            region="Nacional · Argentina"
            desc="Circuito nacional de SSBU Argentina. Ranking nacional y torneos interregionales."
            gradient="from-orange-900/50 to-red-950/60"
            border="border-orange-800/30"
            emoji="🏅"
            tag="Nacional"
            tagColor="bg-orange-500/20 text-orange-300"
          />
        </div>
      </section>

      {/* Banner coming soon */}
      <div className="bg-[#161616] border border-white/5 rounded-2xl p-4 flex gap-3 items-start">
        <span className="text-2xl mt-0.5">🚀</span>
        <div>
          <p className="text-white font-bold text-sm">Más funciones en camino</p>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">
            Rankings, matchmaking, tips por personaje y más están en desarrollo. ¡Seguí pendiente!
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="bg-[#161616] border border-white/5 rounded-xl p-3 text-center">
      <span className="text-lg">{icon}</span>
      <p className="text-lg font-black text-white mt-1">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
      <p className="text-[9px] text-gray-600">{sub}</p>
    </div>
  );
}

function CommunityCard({ name, region, desc, gradient, border, emoji, tag, tagColor }) {
  return (
    <div className={`bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-4`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{emoji}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-white">{name}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tagColor}`}>{tag}</span>
          </div>
          <p className="text-xs text-gray-400">{region}</p>
        </div>
      </div>
      <p className="text-gray-300 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB: RANKINGS
// ─────────────────────────────────────────────────────────────────
function TabRankings() {
  const [mode, setMode] = useState('ba');
  const modes = [
    { id: 'ba',   label: '📍 BA Local' },
    { id: 'inc',  label: '🇦🇷 INC' },
    { id: 'char', label: '🎭 Personaje' },
  ];
  return (
    <div className="px-4 py-5">
      <h1 className="text-2xl font-black mb-4">Rankings</h1>
      <div className="flex gap-2 mb-5">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${mode === m.id ? 'bg-[#E88E00] text-white' : 'bg-[#161616] text-gray-400 border border-white/5'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {(mode === 'ba' || mode === 'inc') && <RankingList region={mode} />}
      {mode === 'char' && <CharacterRanking />}
    </div>
  );
}

function RankingList({ region }) {
  const mock = [
    { pos: 1, name: '—', pts: '—', trend: null },
    { pos: 2, name: '—', pts: '—', trend: null },
    { pos: 3, name: '—', pts: '—', trend: null },
    { pos: 4, name: '—', pts: '—', trend: null },
    { pos: 5, name: '—', pts: '—', trend: null },
  ];
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600 mb-3 flex items-center gap-1">
        <span>{region === 'ba' ? '📍 Buenos Aires' : '🇦🇷 Nacional'}</span>
        <span className="ml-auto bg-yellow-500/10 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full">Próximamente</span>
      </p>
      {mock.map(p => (
        <div key={p.pos} className="flex items-center gap-3 bg-[#161616] border border-white/5 rounded-xl px-4 py-3">
          <span className={`text-sm font-black w-6 text-center ${p.pos <= 3 ? 'text-[#E88E00]' : 'text-gray-600'}`}>
            {p.pos <= 3 ? medals[p.pos - 1] : p.pos}
          </span>
          <div className="flex-1">
            <p className="font-semibold text-sm text-gray-400">{p.name}</p>
            <p className="text-xs text-gray-600">{p.pts} pts</p>
          </div>
          <div className="w-6 h-6 rounded-lg bg-[#111] border border-white/5" />
        </div>
      ))}
      <ComingSoonCard text="Los datos reales del ranking se integrarán cuando el sistema de puntos esté activo." />
    </div>
  );
}

function CharacterRanking() {
  return (
    <div>
      <p className="text-xs text-gray-600 mb-3">Tu rendimiento por personaje</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {['Clase S', 'Clase A', 'Clase B', 'Clase C'].map(c => (
          <div key={c} className="bg-[#161616] border border-white/5 rounded-xl p-4 text-center opacity-40">
            <p className="text-xl font-black text-gray-500">{c[7]}</p>
            <p className="text-xs text-gray-600 mt-1">{c}</p>
          </div>
        ))}
      </div>
      <ComingSoonCard text="El ranking por personaje se habilitará cuando juegues partidas de matchmaking." />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB: TORNEOS
// ─────────────────────────────────────────────────────────────────
function TabTorneos() {
  const [loading, setLoading] = useState(true);
  const [torneos, setTorneos] = useState([]);

  useEffect(() => {
    fetch('/api/tournaments')
      .then(r => r.json())
      .then(data => { setTorneos(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 py-5">
      <h1 className="text-2xl font-black mb-4">Torneos</h1>
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[#E88E00] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : torneos.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-4xl">📋</p>
          <p className="text-gray-300 font-semibold">Sin torneos activos</p>
          <p className="text-gray-600 text-sm">Los torneos publicados en Start.GG van a aparecer acá</p>
        </div>
      ) : (
        <div className="space-y-3">
          {torneos.map((t, i) => (
            <div key={i} className="bg-[#161616] border border-white/5 rounded-2xl p-4">
              <p className="font-bold text-white">{t.name || t.tournamentName || 'Torneo'}</p>
              <p className="text-xs text-gray-500 mt-1">{t.date || t.startAt || 'Fecha por confirmar'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB: TIPS
// ─────────────────────────────────────────────────────────────────
function TabTips() {
  const [selected, setSelected] = useState(null);
  const characters = [
    'Mario', 'Pikachu', 'Fox', 'Marth', 'Samus', 'Link',
    'Kirby', 'Donkey Kong', 'Sheik', 'Falco', 'Mewtwo', 'Zelda',
    'Young Link', 'Ice Climbers', 'Jigglypuff', 'Pichu',
    'Ness', 'Captain Falcon', 'Roy', 'Mr. Game & Watch',
  ];

  if (selected) {
    return (
      <div className="px-4 py-5">
        <button onClick={() => setSelected(null)} className="text-[#E88E00] text-sm font-bold mb-4">← Volver</button>
        <h2 className="text-xl font-black mb-1">{selected}</h2>
        <p className="text-gray-500 text-sm mb-5">Tips de la comunidad</p>
        <div className="bg-[#161616] border border-dashed border-white/10 rounded-2xl p-8 text-center">
          <p className="text-3xl mb-3">💡</p>
          <p className="text-gray-400 text-sm">No hay tips todavía para <span className="text-white font-semibold">{selected}</span></p>
          <button className="mt-4 bg-[#161616] border border-[#E88E00]/30 text-[#E88E00] text-sm font-bold px-4 py-2 rounded-xl opacity-60 cursor-not-allowed">
            + Subir tip (próximamente)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-2xl font-black mb-1">Tips por Personaje</h1>
      <p className="text-gray-500 text-sm mb-5">Seleccioná un personaje para ver o subir tips de la comunidad</p>
      <div className="grid grid-cols-2 gap-3">
        {characters.map(c => (
          <button
            key={c}
            onClick={() => setSelected(c)}
            className="bg-[#161616] border border-white/5 rounded-xl p-4 text-left hover:border-[#E88E00]/30 transition-colors"
          >
            <p className="font-semibold text-sm text-white">{c}</p>
            <p className="text-xs text-gray-600 mt-1">0 tips</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// TAB: MATCHMAKING
// ─────────────────────────────────────────────────────────────────
function TabMatch({ user }) {
  const [platform, setPlatform] = useState(null);

  if (!platform) {
    return (
      <div className="px-4 py-5">
        <h1 className="text-2xl font-black mb-1">Matchmaking</h1>
        <p className="text-gray-500 text-sm mb-6">Elegí tu plataforma y buscá un rival de tu nivel</p>

        <div className="space-y-3 mb-6">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`w-full bg-gradient-to-r ${p.gradient} border ${p.border} rounded-2xl p-5 text-left`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{p.icon}</span>
                <div>
                  <p className="font-bold text-white text-base">{p.label}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {p.id === 'parsec' ? 'Emulador con rollback netcode' : 'Nintendo Switch Online'}
                  </p>
                </div>
                <span className="ml-auto bg-yellow-500/10 text-yellow-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Pronto
                </span>
              </div>
            </button>
          ))}
        </div>

        <SectionTitle>¿Cómo funciona?</SectionTitle>
        <div className="space-y-3 mt-3">
          {[
            ['🔍', 'Buscás partida', 'Te emparejamos con jugadores de nivel similar al tuyo'],
            ['🗺️', 'Escenario aleatorio', 'El sistema elige uno de los escenarios competitivos al azar'],
            ['📜', 'Reglas fijas', 'Se juega con las reglas competitivas estándar preestablecidas'],
            ['📤', 'Subís el resultado', 'Ambos reportan quién ganó y la diferencia de stocks'],
            ['📈', 'Puntos', 'Ganás o perdés puntos según el resultado y el nivel del rival'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex items-start gap-3 bg-[#161616] border border-white/5 rounded-xl p-4">
              <span className="text-xl mt-0.5">{icon}</span>
              <div>
                <p className="font-semibold text-sm text-white">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <SectionTitle className="mt-6">Rankings separados</SectionTitle>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {PLATFORMS.map(p => (
            <div key={p.id} className={`bg-gradient-to-br ${p.gradient} border ${p.border} rounded-xl p-4 text-center`}>
              <span className="text-2xl">{p.icon}</span>
              <p className="font-bold text-sm mt-2">{p.label}</p>
              <p className="text-[10px] text-gray-500 mt-1">Ranking propio</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const plat = PLATFORMS.find(p => p.id === platform);
  return (
    <div className="px-4 py-5">
      <button onClick={() => setPlatform(null)} className="text-[#E88E00] text-sm font-bold mb-4">← Volver</button>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{plat.icon}</span>
        <div>
          <h1 className="text-xl font-black">{plat.label}</h1>
          <p className="text-gray-500 text-xs">Ranking separado · {platform === 'parsec' ? 'Emulador' : 'Switch'}</p>
        </div>
      </div>

      {/* Mis stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard icon="⭐" label="Puntos" value="—" sub={plat.label} />
        <StatCard icon="🏆" label="Rank" value="—" sub="posición" />
        <StatCard icon="📊" label="W/L" value="—" sub="partidas" />
      </div>

      <div className={`bg-gradient-to-br ${plat.gradient} border ${plat.border} rounded-2xl p-8 text-center`}>
        <span className="text-4xl">{plat.icon}</span>
        <p className="text-white font-bold mt-3">Matchmaking en desarrollo</p>
        <p className="text-gray-400 text-sm mt-2 leading-relaxed">
          Pronto podés buscar rivales automáticamente y<br />acumular puntos en el ranking de {plat.label}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function SectionTitle({ children, className = '' }) {
  return <p className={`text-xs font-bold text-gray-500 uppercase tracking-widest ${className}`}>{children}</p>;
}

function ComingSoonCard({ text }) {
  return (
    <div className="bg-[#161616] border border-dashed border-white/10 rounded-xl p-4 text-center mt-3">
      <p className="text-gray-500 text-sm">{text}</p>
    </div>
  );
}

