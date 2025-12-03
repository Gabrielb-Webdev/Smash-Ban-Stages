export default function Custom500() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-9xl mb-6">⚠️</div>
        <h1 className="text-6xl font-bold text-white mb-4">500</h1>
        <p className="text-white/70 text-2xl mb-8">
          Error del servidor
        </p>
        <p className="text-white/50 text-lg mb-8">
          Algo salió mal. Por favor, intenta de nuevo.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-block px-8 py-4 bg-smash-red text-white font-bold text-lg rounded-lg hover:bg-red-700 transition-all hover:scale-105"
          >
            Recargar página
          </button>
          <a
            href="/"
            className="inline-block px-8 py-4 bg-smash-blue text-white font-bold text-lg rounded-lg hover:bg-blue-600 transition-all hover:scale-105"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
