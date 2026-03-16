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

        {/* Top bar */}
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
              ? <img src={user.avatar} alt={displayName} className="w-8 h-8 rounded-full ring-2 ring-white/10" />
              : <div className="w-8 h-8 rounded-full bg-[#E88E00]/20 ring-2 ring-[#E88E00]/30 flex items-center justify-center text-[#E88E00] text-sm font-black">{initial}</div>
            }
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-20">
          {tab === 'inicio'   && <TabInicio user={user} isAdmin={isAdmin} router={router} displayName={displayName} />}
          {tab === 'rankings' && <TabRankings />}
          {tab === 'torneos'  && <TabTorneos />}
          {tab === 'tips'     && <TabTips />}
          {tab === 'match'    && <TabMatch />}
        </div>

        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    { id: 'inicio',   label: 'Inicio',    icon: '🏠' },
    { id: 'rankings', label: 'Rankings',  icon: '🏆' },
    { id: 'torneos',  label: 'Torneos',   icon: '📋' },
    { id: 'tips',     label: 'Tips',      icon: '💡' },
    { id: 'match',    label: 'Match',     icon: '⚡' },
  ];
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-[#0c0c0c]/95 backdrop-blur-sm border-t border-white/[0.06] flex z-50">
      {items.map(item => (
        <button key={item.id} onClick={() => setTab(item.id)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all ${tab === item.id ? 'text-[#E88E00]' : 'text-gray-600'}`}
        >
          <span className="text-lg leading-none">{item.icon}</span>
          <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
          {tab === item.id && <span className="block w-6 h-0.5 rounded-t-full bg-[#E88E00] -mb-0.5" />}
        </button>
      ))}
    </div>
  );
}

function TabInicio({ user, isAdmin, router, displayName }) {
  return (
    <div>
      <div className="relative px-4 pt-6 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#E88E00]/8 via-transparent to-transparent pointer-events-none" />
        <p className="text-gray-500 text-sm mb-1">Hola, <span className="text-gray-300 font-semibold">{displayName}</span> 👋</p>
        <h1 className="text-2xl font-black leading-tight">Bienvenido a<br /><span className="text-[#E88E00]">AFK Smash</span></h1>
        <p className="text-gray-600 text-sm mt-2">Comunidad de SSBU en Argentina</p>
      </div>

      <div className="px-4 space-y-5 pb-6">
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

        {isAdmin && (
          <button onClick={() => router.push('/')}
            className="w-full flex items-center gap-3.5 bg-[#E88E00]/10 border border-[#E88E00]/25 rounded-2xl p-4 text-left hover:bg-[#E88E00]/15 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#E88E00]/20 flex items-center justify-center shrink-0">
              <span className="text-lg">🎮</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#E88E00] text-sm">Panel de Administración</p>
              <p className="text-gray-500 text-xs mt-0.5">Gestionar torneos y setups</p>
            </div>
            <span className="text-gray-600 text-lg shrink-0">›</span>
          </button>
        )}

        <div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] mb-3">Comunidades</p>
          <div className="space-y-2.5">
            <div className="bg-gradient-to-br from-sky-950 to-blue-950 border border-sky-800/25 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-2xl">🗺️</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-white text-sm">Smash AFK</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300">Local</span>
                  </div>
                  <p className="text-xs font-medium text-sky-400 mb-1.5">Buenos Aires</p>
                  <p className="text-gray-400 text-xs leading-relaxed">Torneos semanales, ranking local y espacio de práctica.</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-950 to-red-950 border border-orange-800/25 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center shrink-0 text-2xl">🏅</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-white text-sm">Smash INC</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300">Nacional</span>
                  </div>
                  <p className="text-xs font-medium text-orange-400 mb-1.5">Nacional · Argentina</p>
                  <p className="text-gray-400 text-xs leading-relaxed">Circuito nacional. Ranking y torneos interregionales.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#E88E00]/15 flex items-center justify-center shrink-0 text-base">🚀</div>
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

function TabRankings() {
  const [mode, setMode] = useState('ba');
  const medals = ['🥇', '🥈', '🥉'];
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
      {mode !== 'char' ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-600">{mode === 'ba' ? '📍 Buenos Aires' : '🇦🇷 Nacional'}</p>
            <span className="text-[10px] font-bold bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-full">Próximamente</span>
          </div>
          <div className="space-y-2">
            {[1,2,3,4,5].map(pos => (
              <div key={pos} className="flex items-center gap-3 bg-[#111] border border-white/[0.07] rounded-xl px-4 py-3.5">
                <span className={`text-sm font-black w-6 text-center ${pos <= 3 ? 'text-xl' : 'text-gray-700'}`}>
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
      ) : (
        <div>
          <p className="text-xs text-gray-600 mb-3">Tu rendimiento por personaje</p>
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {[
              { t: 'S', from: 'from-yellow-500', to: 'to-orange-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
              { t: 'A', from: 'from-green-500', to: 'to-emerald-500', bg: 'bg-green-500/10 border-green-500/20' },
              { t: 'B', from: 'from-blue-500', to: 'to-cyan-500', bg: 'bg-blue-500/10 border-blue-500/20' },
              { t: 'C', from: 'from-gray-500', to: 'to-gray-600', bg: 'bg-gray-500/10 border-gray-500/20' },
            ].map(({ t, from, to, bg }) => (
              <div key={t} className={`border rounded-2xl p-4 text-center ${bg} opacity-40`}>
                <p className={`text-3xl font-black bg-gradient-to-br ${from} ${to} bg-clip-text text-transparent`}>{t}</p>
                <p className="text-xs text-gray-600 mt-1.5">Clase {t}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#111] border border-dashed border-white/10 rounded-2xl p-5 text-center">
            <span className="text-3xl">🎭</span>
            <p className="text-gray-400 text-sm font-semibold mt-2">Jugá partidas para ver tu ranking por personaje</p>
          </div>
        </div>
      )}
    </div>
  );
}

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
          <p className="text-gray-600 text-sm mt-1.5 leading-relaxed">Los torneos de Start.GG van a aparecer acá automáticamente</p>
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

function TabTips() {
  const [selected, setSelected] = useState(null);
  const chars = ['Mario', 'Pikachu', 'Fox', 'Marth', 'Samus', 'Link', 'Kirby', 'Donkey Kong', 'Sheik', 'Falco', 'Mewtwo', 'Zelda', 'Young Link', 'Ice Climbers', 'Jigglypuff', 'Pichu', 'Ness', 'Captain Falcon', 'Roy', 'Game & Watch'];
  if (selected) return (
    <div className="px-4 py-6">
      <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-[#E88E00] text-sm font-bold mb-5">← Volver</button>
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

function TabMatch() {
  const [plat, setPlat] = useState(null);
  const p = PLATFORMS.find(x => x.id === plat);
  return (
    <div className="px-4 py-6">
      {plat && (
        <button onClick={() => setPlat(null)} className="flex items-center gap-1.5 text-[#E88E00] text-sm font-bold mb-5">← Volver</button>
      )}
      {!plat ? (
        <>
          <h1 className="text-2xl font-black mb-1">Matchmaking</h1>
          <p className="text-gray-600 text-sm mb-6">Elegí tu plataforma</p>
          <div className="space-y-2.5 mb-7">
            {PLATFORMS.map(px => (
              <button key={px.id} onClick={() => setPlat(px.id)}
                className={`w-full bg-gradient-to-r ${px.grad} border ${px.border} rounded-2xl p-4 text-left hover:brightness-110 transition-all`}>
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center text-2xl shrink-0">{px.icon}</div>
                  <div className="flex-1">
                    <p className="font-bold text-white">{px.label}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{px.id === 'parsec' ? 'Emulador · Rollback netcode' : 'Nintendo Switch Online'}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-yellow-500/15 text-yellow-400 px-2.5 py-1 rounded-full shrink-0">Pronto</span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] mb-3">¿Cómo funciona?</p>
          <div className="space-y-2 mb-7">
            {[['🔍','Buscás partida','Te emparejamos con jugadores de nivel similar'],['🗺️','Escenario aleatorio','Mapa competitivo elegido al azar'],['📜','Reglas estándar','Reglas competitivas preestablecidas'],['📤','Reportás el resultado','Ambos suben quien ganó y diferencia de stocks'],['📈','Puntos','Ganás o perdés puntos según resultado y nivel del rival']].map(([icon,t,d]) => (
              <div key={t} className="flex gap-3.5 bg-[#111] border border-white/[0.07] rounded-xl p-3.5">
                <span className="text-lg mt-0.5 shrink-0">{icon}</span>
                <div><p className="font-semibold text-sm text-white">{t}</p><p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{d}</p></div>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] mb-3">Rankings separados</p>
          <div className="grid grid-cols-2 gap-2.5">
            {PLATFORMS.map(px => (
              <div key={px.id} className={`bg-gradient-to-br ${px.grad} border ${px.border} rounded-2xl p-4 text-center`}>
                <span className="text-2xl">{px.icon}</span>
                <p className="font-bold text-sm mt-2">{px.label}</p>
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
