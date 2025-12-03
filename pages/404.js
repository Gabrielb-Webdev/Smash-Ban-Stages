export default function Custom404() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-9xl mb-6">🎮</div>
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-white/70 text-2xl mb-8">
          Página no encontrada
        </p>
        <p className="text-white/50 text-lg mb-8">
          La página que buscas no existe o la sesión ha expirado
        </p>
        <a
          href="/"
          className="inline-block px-8 py-4 bg-smash-blue text-white font-bold text-lg rounded-lg hover:bg-blue-600 transition-all hover:scale-105"
        >
          Ir al Panel de Administración
        </a>
      </div>
    </div>
  );
}
