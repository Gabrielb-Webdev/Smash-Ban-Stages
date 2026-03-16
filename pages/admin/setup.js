import { useState } from 'react';
import Head from 'next/head';

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function handleSeed() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al inicializar');
      setResult(data.results);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head><title>Setup DB — Smash Ban Stages</title></Head>
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ background: '#12121a', border: '1px solid #2a2a3f', borderRadius: 12, padding: 40, maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <h1 style={{ color: '#c084fc', marginBottom: 8, fontSize: 24 }}>⚙️ Inicializar Base de Datos</h1>
          <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>
            Crea las estructuras vacías en Redis si no existen.<br />
            Si ya existen, no se sobreescriben.
          </p>

          <button
            onClick={handleSeed}
            disabled={loading}
            style={{
              background: loading ? '#2a2a3f' : 'linear-gradient(135deg, #7c3aed, #c084fc)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 32px',
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Inicializando...' : 'Inicializar Base de Datos'}
          </button>

          {result && (
            <div style={{ marginTop: 24, textAlign: 'left', background: '#0d0d18', borderRadius: 8, padding: 16 }}>
              <p style={{ color: '#4ade80', fontWeight: 700, marginBottom: 8 }}>✅ Completado</p>
              {Object.entries(result).map(([key, val]) => (
                <div key={key} style={{ color: '#ccc', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: '#a78bfa' }}>{key}:</span> {val}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 24, background: '#1a0a0a', borderRadius: 8, padding: 16, color: '#f87171', fontSize: 14 }}>
              ❌ {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
