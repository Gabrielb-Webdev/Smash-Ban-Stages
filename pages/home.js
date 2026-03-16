import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getStoredUser, logout } from '../src/utils/auth';

// ─── Parsec / Switch Online rankings separados ────────────────────────────────
const PLATFORMS = [
  { id: 'parsec', label: 'Parsec', icon: '🖥️', color: 'from-violet-900/60 to-indigo-900/60', border: 'border-violet-700/40' },
  { id: 'switch', label: 'Switch Online', icon: '🎮', color: 'from-red-900/60 to-rose-900/60', border: 'border-red-700/40' },
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
          <div className="flex items-center gap-3">
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

