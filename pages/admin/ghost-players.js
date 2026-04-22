import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getStoredUser, verifySession } from '../../src/utils/auth';

const CATEGORIES = [
  { key: 'ranked1v1', label: 'Ranked 1v1', icon: '⚔️', accent: '#FF8C00' },
  { key: 'ranked2v2', label: 'Ranked 2v2', icon: '🤝', accent: '#F97316' },
  { key: 'casual1v1', label: 'Normal 1v1', icon: '🎮', accent: '#A78BFA' },
  { key: 'casual2v2', label: 'Normal 2v2', icon: '🎲', accent: '#8B5CF6' },
];

const PLATFORMS = [
  { key: 'switch', label: 'Switch Online', icon: '🎮', color: '#EF4444' },
  { key: 'parsec', label: 'Parsec',        icon: '🖥️', color: '#8B5CF6' },
];

const PRESETS = [
  { label: 'Vacío',     values: { ranked1v1: { switch: 0, parsec: 0 }, ranked2v2: { switch: 0, parsec: 0 }, casual1v1: { switch: 0, parsec: 0 }, casual2v2: { switch: 0, parsec: 0 } } },
  { label: 'Poco',      values: { ranked1v1: { switch: 2, parsec: 1 }, ranked2v2: { switch: 0, parsec: 0 }, casual1v1: { switch: 1, parsec: 0 }, casual2v2: { switch: 0, parsec: 0 } } },
  { label: 'Moderado',  values: { ranked1v1: { switch: 5, parsec: 3 }, ranked2v2: { switch: 1, parsec: 1 }, casual1v1: { switch: 3, parsec: 2 }, casual2v2: { switch: 1, parsec: 0 } } },
  { label: 'Activo',    values: { ranked1v1: { switch: 10, parsec: 7 }, ranked2v2: { switch: 3, parsec: 2 }, casual1v1: { switch: 6, parsec: 4 }, casual2v2: { switch: 2, parsec: 1 } } },
];

const stored = typeof window !== 'undefined' ? getStoredUser() : null;
const AUTH   = stored?.access_token || 'afk-admin-2025';

export default function GhostPlayersAdmin() {
  const router   = useRouter();
  const [checking, setChecking] = useState(true);
  const [config, setConfig]     = useState(null);
  const [draft, setDraft]       = useState(null);
  const [online, setOnline]     = useState(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  // Auth check
  useEffect(() => {
    const s = getStoredUser();
    if (!s?.access_token) { router.replace('/login'); return; }
    verifySession().then(d => {
      if (!d) { router.replace('/login'); return; }
      if (!d.isAdmin) { router.replace('/'); return; }
      setChecking(false);
    });
  }, []);

  // Cargar config y online count
  useEffect(() => {
    if (checking) return;
    load();
    const iv = setInterval(loadOnline, 8000);
    return () => clearInterval(iv);
  }, [checking]);

  async function load() {
    try {
      const [cfgRes, onlineRes] = await Promise.all([
        fetch('/api/admin/ghost-players', { headers: { Authorization: 'Bearer afk-admin-2025' } }),
        fetch('/api/matchmaking/online'),
      ]);
      const cfgData    = await cfgRes.json();
      const onlineData = await onlineRes.json();
      setConfig(cfgData.config);
      setDraft(JSON.parse(JSON.stringify(cfgData.config))); // deep clone
      setOnline(onlineData);
    } catch (e) {
      setError('Error cargando configuración');
    }
  }

  async function loadOnline() {
    try {
      const r = await fetch('/api/matchmaking/online');
      if (r.ok) setOnline(await r.json());
    } catch {}
  }

  function setDraftValue(cat, plat, val) {
    const n = Math.max(0, Math.min(999, parseInt(val, 10) || 0));
    setDraft(prev => ({ ...prev, [cat]: { ...prev[cat], [plat]: n } }));
  }

  function applyPreset(preset) {
    setDraft(JSON.parse(JSON.stringify(preset.values)));
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/admin/ghost-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer afk-admin-2025' },
        body: JSON.stringify(draft),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Error al guardar');
      setConfig(d.config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      loadOnline();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/admin/ghost-players', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer afk-admin-2025' },
      });
      const d = await r.json();
      setConfig(d.config);
      setDraft(JSON.parse(JSON.stringify(d.config)));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      loadOnline();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function totalDraft() {
    if (!draft) return 0;
    return CATEGORIES.reduce((sum, c) => sum + (draft[c.key]?.switch || 0) + (draft[c.key]?.parsec || 0), 0);
  }

  function isDirty() {
    if (!config || !draft) return false;
    return JSON.stringify(config) !== JSON.stringify(draft);
  }

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Verificando acceso...</div>
    </div>
  );

  return (
    <>
      <Head><title>Ghost Players — Admin</title></Head>
      <div style={{ minHeight: '100vh', background: '#0f0f0f', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px 16px 60px' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <button
              onClick={() => router.back()}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ← Volver
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#7C3AED,#4C1D95)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👻</div>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff' }}>Ghost Players</h1>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Jugadores fantasma en el contador — no pueden matchear con nadie real</p>
              </div>
            </div>
          </div>

          {/* Contador en vivo */}
          {online && (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '14px 18px', marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E88', display: 'inline-block' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Online ahora</span>
              </div>
              {CATEGORIES.map(c => {
                const q = online[c.key] || { switch: 0, parsec: 0, total: 0 };
                if (q.total === 0) return null;
                return (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: c.accent, fontWeight: 700 }}>{c.label}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>🎮{q.switch} 🖥️{q.parsec}</span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: '#22C55E' }}>{online.total}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>total</span>
                {online.inMatch > 0 && (
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 4 }}>({online.inMatch} en partida)</span>
                )}
              </div>
            </div>
          )}

          {/* Presets */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Presets rápidos</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  style={{
                    padding: '7px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grilla de inputs */}
          {draft && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {CATEGORIES.map(cat => (
                <div key={cat.key} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 18 }}>{cat.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: cat.accent }}>{cat.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
                      Total: {(draft[cat.key]?.switch || 0) + (draft[cat.key]?.parsec || 0)}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {PLATFORMS.map(plat => (
                      <div key={plat.key}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: plat.color, marginBottom: 6, letterSpacing: '0.04em' }}>
                          {plat.icon} {plat.label}
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => setDraftValue(cat.key, plat.key, (draft[cat.key]?.[plat.key] || 0) - 1)}
                            style={{ width: 32, height: 40, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >−</button>
                          <input
                            type="number"
                            min={0}
                            max={999}
                            value={draft[cat.key]?.[plat.key] ?? 0}
                            onChange={e => setDraftValue(cat.key, plat.key, e.target.value)}
                            style={{
                              flex: 1, height: 40, borderRadius: 8, border: `1px solid ${plat.color}44`,
                              background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 20, fontWeight: 900,
                              textAlign: 'center', outline: 'none', padding: 0,
                            }}
                          />
                          <button
                            onClick={() => setDraftValue(cat.key, plat.key, (draft[cat.key]?.[plat.key] || 0) + 1)}
                            style={{ width: 32, height: 40, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                          >+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resumen del draft */}
          {draft && (
            <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 14, padding: '12px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>👻</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#A78BFA' }}>
                  {totalDraft()} ghost players configurados
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  Aparecen en el contador pero no pueden matchear con jugadores reales
                </p>
              </div>
              {isDirty() && (
                <span style={{ fontSize: 11, color: '#FBBF24', fontWeight: 700, background: 'rgba(251,191,36,0.1)', borderRadius: 8, padding: '3px 8px' }}>Sin guardar</span>
              )}
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#F87171' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Botones de acción */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={save}
              disabled={saving || !isDirty()}
              style={{
                flex: 1, padding: '14px', borderRadius: 14, border: 'none',
                background: isDirty() && !saving
                  ? 'linear-gradient(135deg,#7C3AED,#4C1D95)'
                  : 'rgba(255,255,255,0.06)',
                color: isDirty() && !saving ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: 15, fontWeight: 800, cursor: isDirty() && !saving ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
            >
              {saved ? '✅ Guardado' : saving ? '⏳ Guardando...' : '💾 Guardar'}
            </button>
            <button
              onClick={reset}
              disabled={saving}
              style={{
                padding: '14px 20px', borderRadius: 14,
                border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)',
                color: '#F87171', fontSize: 14, fontWeight: 800, cursor: 'pointer',
              }}
            >
              🗑️ Resetear
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
