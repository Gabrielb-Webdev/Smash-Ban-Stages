import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { getStoredUser, verifySession } from '../../src/utils/auth';

const ADMIN_SECRET = 'afk-admin-2025';
const COMMUNITIES = [
  { id: 'afk',     label: 'AFK (Buenos Aires)' },
  { id: 'inc',     label: 'Smash INC'           },
  { id: 'cordoba', label: 'Smash Córdoba'        },
  { id: 'mendoza', label: 'Smash Mendoza'        },
];
const YEARS = ['2025', '2026'];

const TYPE_LABELS = { M: 'Mensual', S: 'Semanal' };

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function posLabel(n) {
  if (n === 1) return '🥇 1°';
  if (n === 2) return '🥈 2°';
  if (n === 3) return '🥉 3°';
  return `${n}°`;
}

// ── estilos en objeto para simplicidad ───────────────────────────────────────

const S = {
  page: { minHeight: '100vh', background: '#0D0D18', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '0 0 80px' },
  header: { background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 20, fontWeight: 800 },
  body: { maxWidth: 900, margin: '0 auto', padding: '24px 16px' },
  section: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px', marginBottom: 20 },
  label: { display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em' },
  input: { width: '100%', background: '#14141F', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  select: { background: '#14141F', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnRed: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(220,38,38,0.15)', color: '#F87171', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  btnOutline: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  tag: (color) => ({ display: 'inline-flex', alignItems: 'center', background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, color }),
  error: { background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: '10px 14px', color: '#FCA5A5', fontSize: 13, marginTop: 10 },
  success: { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '10px 14px', color: '#86EFAC', fontSize: 13, marginTop: 10 },
};

// ── TournamentCard ────────────────────────────────────────────────────────────

function TournamentCard({ t, community, year, onRemove, onBonusUpdate }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bonusEdits, setBonusEdits] = useState({});

  const topStandings = (t.standings || []).filter(s => s.placement >= 1 && s.placement <= 8);
  const hasBonus = topStandings.length > 0;

  async function saveBonuses() {
    setSaving(true);
    for (const [playerName, bonus] of Object.entries(bonusEdits)) {
      await fetch('/api/community-ranking/update-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_SECRET}` },
        body: JSON.stringify({ tournamentId: t.id, playerName, bonusPoints: bonus, community, year }),
      });
    }
    setBonusEdits({});
    setSaving(false);
    onBonusUpdate();
  }

  return (
    <div style={{ background: '#0F0F1C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', flexWrap: 'wrap' }}>
        <span style={S.tag(t.type === 'M' ? '#A78BFA' : '#60A5FA')}>{TYPE_LABELS[t.type]}</span>
        <div style={{ flex: 1, minWidth: 160 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{t.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{fmtDate(t.startAt)} · {t.numAttendees} jugadores · {t.standings?.length || 0} posiciones</p>
        </div>
        <button style={S.btnOutline} onClick={() => setOpen(o => !o)}>
          {open ? '▲ Cerrar' : '▼ Ver standings'}
        </button>
        <button style={S.btnRed} onClick={() => onRemove(t.id)}>✕ Eliminar</button>
      </div>

      {open && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px 16px' }}>
          {hasBonus && (
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Top 8: editá los bonos manualmente (por vencer a Top 8 ajenos al evento). Los Top 8 no reciben bono entre sí.
            </p>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>Pos</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Jugador</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Base</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'center' }}>Bono</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(t.standings || []).map(s => {
                  const currentBonus = bonusEdits[s.playerName] !== undefined ? bonusEdits[s.playerName] : s.bonusPoints;
                  const isTop8 = s.placement <= 8;
                  return (
                    <tr key={s.playerName} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{posLabel(s.placement)}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{s.playerName}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', color: '#A78BFA' }}>{s.basePoints}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        {isTop8 ? (
                          <input
                            type="number"
                            min="0"
                            value={currentBonus}
                            onChange={e => setBonusEdits(b => ({ ...b, [s.playerName]: parseInt(e.target.value, 10) || 0 }))}
                            style={{ ...S.input, width: 70, padding: '4px 8px', textAlign: 'center' }}
                          />
                        ) : (
                          <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#60A5FA' }}>
                        {s.basePoints + (typeof currentBonus === 'number' ? currentBonus : s.bonusPoints)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {Object.keys(bonusEdits).length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button style={S.btn} onClick={saveBonuses} disabled={saving}>
                {saving ? 'Guardando...' : '💾 Guardar bonos'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── RankingPreview ────────────────────────────────────────────────────────────

function RankingPreview({ players }) {
  if (!players || players.length === 0) return (
    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', padding: 20 }}>Aún no hay torneos cargados</p>
  );
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'left' }}>
            <th style={{ padding: '6px 10px', fontWeight: 600, width: 40 }}>#</th>
            <th style={{ padding: '6px 10px', fontWeight: 600 }}>Jugador</th>
            <th style={{ padding: '6px 10px', fontWeight: 600, textAlign: 'right' }}>Puntos</th>
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr key={p.name} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '8px 10px', color: p.position <= 3 ? '#EAB308' : 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                {p.position}
              </td>
              <td style={{ padding: '8px 10px', fontWeight: 600 }}>{p.name}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#A78BFA' }}>{p.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AfkRankingAdmin() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Filtros
  const [community, setCommunity] = useState('afk');
  const [year, setYear] = useState('2025');

  // Datos
  const [data, setData] = useState({ players: [], tournaments: [] });
  const [loadingData, setLoadingData] = useState(false);

  // Formulario agregar
  const [formUrl, setFormUrl] = useState('');
  const [formType, setFormType] = useState('S');
  const [formName, setFormName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState(null);

  // ── auth ──
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored?.access_token) { router.replace('/login'); return; }
    verifySession().then(d => {
      if (!d || !d.isAdmin) { router.replace('/'); return; }
      setChecking(false);
    });
  }, []);

  // ── cargar datos ──
  async function loadData(c, y) {
    setLoadingData(true);
    try {
      const r = await fetch(`/api/community-ranking/get?community=${c}&year=${y}`);
      const json = r.ok ? await r.json() : null;
      setData(json || { players: [], tournaments: [] });
    } catch {
      setData({ players: [], tournaments: [] });
    }
    setLoadingData(false);
  }

  useEffect(() => {
    if (!checking) loadData(community, year);
  }, [community, year, checking]);

  // ── agregar torneo ──
  async function handleAdd(e) {
    e.preventDefault();
    if (!formUrl.trim()) return;
    setAdding(true);
    setAddMsg(null);
    try {
      const r = await fetch('/api/community-ranking/add-tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_SECRET}` },
        body: JSON.stringify({ url: formUrl.trim(), type: formType, community, year, nameOverride: formName.trim() || undefined }),
      });
      const json = await r.json();
      if (r.ok) {
        setAddMsg({ ok: true, text: `✅ Torneo "${json.tournament?.name}" agregado (${json.tournament?.standings?.length} posiciones)` });
        setFormUrl('');
        setFormName('');
        loadData(community, year);
      } else {
        setAddMsg({ ok: false, text: json.error || 'Error desconocido' });
      }
    } catch (err) {
      setAddMsg({ ok: false, text: err.message });
    }
    setAdding(false);
  }

  // ── eliminar torneo ──
  async function handleRemove(id) {
    if (!confirm('¿Eliminar este torneo del ranking?')) return;
    await fetch(`/api/community-ranking/remove-tournament?id=${encodeURIComponent(id)}&community=${community}&year=${year}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    });
    loadData(community, year);
  }

  if (checking) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Verificando sesión...</p>
      </div>
    );
  }

  return (
    <>
      <Head><title>Ranking Comunitario — Admin</title></Head>
      <div style={S.page}>
        {/* Header */}
        <div style={S.header}>
          <span style={{ fontSize: 24 }}>🏆</span>
          <h1 style={S.title}>Ranking Comunitario</h1>

          {/* Comunidad */}
          <select value={community} onChange={e => setCommunity(e.target.value)} style={S.select}>
            {COMMUNITIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          {/* Año */}
          <select value={year} onChange={e => setYear(e.target.value)} style={S.select}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div style={S.body}>

          {/* ── Agregar torneo ── */}
          <div style={S.section}>
            <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Agregar torneo</h2>
            <form onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'end', flexWrap: 'wrap' }}>
                <div>
                  <label style={S.label}>URL de start.gg *</label>
                  <input
                    style={S.input}
                    placeholder="https://www.start.gg/tournament/..."
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={S.label}>Tipo</label>
                  <select value={formType} onChange={e => setFormType(e.target.value)} style={S.select}>
                    <option value="S">Semanal</option>
                    <option value="M">Mensual</option>
                  </select>
                </div>
                <button type="submit" style={S.btn} disabled={adding}>
                  {adding ? '⏳ Importando...' : '＋ Agregar'}
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={S.label}>Nombre override (opcional)</label>
                <input
                  style={{ ...S.input, maxWidth: 360 }}
                  placeholder="Ej: AFK Semanal #12"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>
              {addMsg && <div style={addMsg.ok ? S.success : S.error}>{addMsg.text}</div>}
            </form>

            {/* Tabla de puntos referencia */}
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, color: 'rgba(255,255,255,0.4)', userSelect: 'none' }}>
                📋 Ver tabla de puntos
              </summary>
              <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { label: 'Mensual', rows: [['1°', 1000], ['2°', 600], ['3°', 450], ['4°', 360], ['5°-6°', 270], ['7°-8°', 180], ['9°-12°', 90], ['13°-32°', 45], ['33°-64°', 25]] },
                  { label: 'Semanal', rows: [['1°', 350], ['2°', 200], ['3°', 150], ['4°', 120], ['5°-6°', 90], ['7°-8°', 60], ['9°-12°', 30], ['13°-32°', 15], ['33°-64°', 10]] },
                ].map(({ label, rows }) => (
                  <div key={label} style={{ background: '#0A0A14', borderRadius: 10, padding: '10px 14px', minWidth: 160 }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: label === 'Mensual' ? '#A78BFA' : '#60A5FA' }}>{label}</p>
                    {rows.map(([pos, pts]) => (
                      <div key={pos} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.5)', padding: '2px 0' }}>
                        <span>{pos}</span><span style={{ fontWeight: 700, color: '#fff' }}>{pts}</span>
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{ background: '#0A0A14', borderRadius: 10, padding: '10px 14px', minWidth: 200 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#EAB308' }}>Bonificación</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                    +60 pts (M) / +45 pts (S) por vencer a un Top 8.<br />
                    Los Top 8 no reciben bono entre sí.
                  </p>
                </div>
              </div>
            </details>
          </div>

          {/* ── Torneos cargados ── */}
          <div style={S.section}>
            <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>
              Torneos cargados {loadingData && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>cargando...</span>}
              <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>
                ({data.tournaments.length})
              </span>
            </h2>
            {data.tournaments.length === 0 && !loadingData && (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No hay torneos para esta comunidad y año.</p>
            )}
            {[...data.tournaments].reverse().map(t => (
              <TournamentCard
                key={t.id}
                t={t}
                community={community}
                year={year}
                onRemove={handleRemove}
                onBonusUpdate={() => loadData(community, year)}
              />
            ))}
          </div>

          {/* ── Preview del ranking ── */}
          <div style={S.section}>
            <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 800 }}>
              Preview del ranking actual
            </h2>
            <RankingPreview players={data.players} />
          </div>

        </div>
      </div>
    </>
  );
}
