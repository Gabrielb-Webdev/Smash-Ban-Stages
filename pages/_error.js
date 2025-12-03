function Error({ statusCode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-smash-darker via-smash-dark to-smash-purple flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-8xl mb-6">😕</div>
        <h1 className="text-6xl font-bold text-white mb-4">
          {statusCode ? statusCode : 'Error'}
        </h1>
        <p className="text-white/70 text-xl mb-8">
          {statusCode
            ? `Ocurrió un error ${statusCode} en el servidor`
            : 'Ocurrió un error en el cliente'}
        </p>
        <a
          href="/"
          className="inline-block px-8 py-4 bg-smash-blue text-white font-bold text-lg rounded-lg hover:bg-blue-600 transition-all"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
