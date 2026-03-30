import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const CATEGORY_COLORS = {
  Bug: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', text: '#EF4444' },
  Mejora: { bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.4)', text: '#8B5CF6' },
  'Nueva función': { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', text: '#22C55E' },
  Otro: { bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.4)', text: '#9CA3AF' },
};

export default function SuggestionsAdmin() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/suggestions')
      .then(r => r.json())
      .then(d => setSuggestions(d.suggestions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? suggestions : suggestions.filter(s => s.category === filter);

  return (
    <>
      <Head><title>Sugerencias · Admin</title></Head>
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: "'Outfit', sans-serif", padding: '24px 16px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 20, cursor: 'pointer' }}>←</button>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>💬 Sugerencias ({suggestions.length})</h1>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {['all', 'Bug', 'Mejora', 'Nueva función', 'Otro'].map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                background: filter === cat ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${filter === cat ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.06)'}`,
                color: filter === cat ? '#8B5CF6' : 'rgba(255,255,255,0.4)',
              }}>{cat === 'all' ? 'Todas' : cat}</button>
            ))}
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>Cargando...</p>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>Sin sugerencias</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(s => {
                const cat = CATEGORY_COLORS[s.category] || CATEGORY_COLORS.Otro;
                const date = s.createdAt ? new Date(s.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <div key={s.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: cat.text, background: cat.bg, border: `1px solid ${cat.border}`, padding: '2px 8px', borderRadius: 6 }}>{s.category}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{s.userName}</span>
                      </div>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{date}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{s.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
