import Link from 'next/link';

export default function CommunitySelector() {
  // Configuración de comunidades/torneos
  const communities = {
    'cordoba': { 
      name: 'Smash Córdoba', 
      emoji: '🔵',
      color: 'blue',
      bgGradient: 'from-blue-900 via-blue-700 to-blue-800',
      description: 'Comunidad de Smash Bros en Córdoba'
    },
    'mendoza': { 
      name: 'Smash Mendoza', 
      emoji: '🟢',
      color: 'green',
      bgGradient: 'from-green-900 via-green-700 to-emerald-800',
      description: 'Comunidad de Smash Bros en Mendoza'
    },
    'afk': { 
      name: 'Smash AFK (Buenos Aires)', 
      emoji: '🟡',
      color: 'yellow',
      bgGradient: 'from-red-900 via-red-700 to-orange-800',
      description: 'Comunidad AFK de Smash Bros'
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">
            🎮 Smash Ban Stages
          </h1>
          <p className="text-smash-light text-xl mb-2">
            Sistema de Baneos - Super Smash Bros Ultimate
          </p>
          <p className="text-white/70 text-lg">
            Selecciona una comunidad para acceder a su panel de administración
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Object.entries(communities).map(([key, community]) => (
            <Link
              key={key}
              href={`/admin/${key}`}
              className="group"
            >
              <div className={`bg-gradient-to-br ${community.bgGradient} rounded-2xl p-8 shadow-2xl border-2 border-white/20 hover:border-white/50 transition-all hover:scale-105 hover:shadow-3xl cursor-pointer`}>
                <div className="text-center">
                  <div className="text-8xl mb-4 group-hover:scale-110 transition-transform">
                    {community.emoji}
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3">
                    {community.name}
                  </h2>
                  <p className="text-white/80 text-sm mb-6">
                    {community.description}
                  </p>
                  <div className="inline-flex items-center gap-2 bg-white/20 rounded-lg px-6 py-3 group-hover:bg-white/30 transition-all">
                    <span className="text-white font-semibold">Acceder al Panel</span>
                    <svg className="w-5 h-5 text-white group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 shadow-xl border border-white/20 text-center">
          <h3 className="text-white font-bold text-xl mb-3">
            ℹ️ Información del Sistema
          </h3>
          <p className="text-white/70 text-sm mb-2">
            Este sistema permite gestionar torneos de Super Smash Bros Ultimate con baneos de stages.
          </p>
          <p className="text-white/70 text-sm">
            Cada comunidad tiene su propio panel independiente con sesiones separadas.
          </p>
        </div>
      </div>
    </div>
  );
}
