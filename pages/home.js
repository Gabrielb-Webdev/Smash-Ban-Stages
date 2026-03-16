import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>AFK Smash</title>
      </Head>
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black text-white mb-2">AFK Smash</h1>
          <p className="text-gray-500 text-sm">Próximamente</p>
        </div>
      </div>
    </>
  );
}
